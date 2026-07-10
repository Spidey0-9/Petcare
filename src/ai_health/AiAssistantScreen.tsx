import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

const QUICK_ACTIONS = [
  { icon: 'stethoscope',  label: 'Symptom Check', prompt: 'My dog has been scratching a lot lately. What could cause this?' },
  { icon: 'food-apple',   label: 'Nutrition',     prompt: 'What is the best diet for a Golden Retriever?' },
  { icon: 'needle',       label: 'Vaccination',   prompt: 'What vaccines does my 3-year-old dog need?' },
  { icon: 'pill',         label: 'Medication',    prompt: 'Is it safe to give my cat Ibuprofen for pain?' },
  { icon: 'run-fast',     label: 'Exercise',      prompt: 'How much exercise does a puppy need daily?' },
  { icon: 'alert-circle', label: 'Emergency',     prompt: 'My dog ate chocolate. What should I do immediately?' },
];

const AI_RESPONSES: Record<string, string> = {
  scratch:     '🐾 Excessive scratching can indicate:\n\n• **Flea infestation** — Check for tiny dark specks in fur\n• **Food allergy** — Common triggers: chicken, beef, dairy\n• **Atopic dermatitis** — Environmental allergens like pollen\n• **Yeast or bacterial infection** — Often smells unpleasant\n\n**Recommended:** Schedule a dermatology appointment. Your vet may suggest a hypoallergenic diet trial or allergy testing.\n\n⚕️ Book an appointment now?',
  diet:        '🥗 Golden Retriever Nutrition Guide:\n\n**Daily Feeding:**\n• Adult (2-7yr): 2-3 cups quality kibble/day\n• Split into 2 meals\n• Protein >25%, Fat 12-16%\n\n**Best Brands:** Royal Canin, Hills Science Diet, Purina Pro Plan\n\n**Avoid:** Onions, grapes, chocolate, xylitol\n\n**Supplements:** Omega-3 (joint health), glucosamine, fish oil\n\n💡 Consult your vet for personalized portions based on weight.',
  vaccine:     '💉 Core Vaccines for a 3-Year-Old Dog:\n\n**Required (Core):**\n• Rabies — Annual or 3-year\n• DHPP (Distemper, Hepatitis, Parvo, Para) — Every 3 years\n\n**Recommended (Non-Core):**\n• Bordetella — If dog visits kennels/parks\n• Leptospirosis — If exposed to wildlife/water\n• Canine Influenza — If in high-contact areas\n\n📅 Book a vaccination appointment to stay up to date.',
  ibuprofen:   '⚠️ **NEVER give Ibuprofen to cats or dogs!**\n\nIbuprofen is TOXIC to pets and can cause:\n• Severe kidney failure\n• GI ulcers and bleeding\n• Liver damage\n• Seizures and death\n\n**Safe pain alternatives (vet-prescribed only):**\n• Meloxicam\n• Carprofen\n• Gabapentin\n\n🚨 If your pet has already ingested it — call your vet or emergency clinic IMMEDIATELY.',
  exercise:    '🏃 Puppy Exercise Guidelines by Age:\n\n• **8-12 weeks:** 5 min sessions, 2x daily (play only)\n• **3-6 months:** 15-20 min gentle walks\n• **6-12 months:** 20-30 min walks, avoid high impact\n• **12+ months:** 30-60 min depending on breed\n\n**The 5-minute rule:** 5 min of exercise per month of age, twice daily\n\n⚠️ Over-exercising puppies damages developing joints. No jumping, stairs, or rough play until 12-18 months.',
  chocolate:   '🚨 **EMERGENCY — Chocolate is Toxic to Dogs!**\n\n**Immediately:**\n1. Note how much and what type was eaten\n2. Call your vet or poison control: 1-888-426-4435\n3. Do NOT induce vomiting without vet guidance\n\n**Toxic thresholds (per kg body weight):**\n• Dark chocolate: 1oz/kg is dangerous\n• Milk chocolate: 3.5oz/kg\n• Baking chocolate: 0.3oz/kg\n\n**Symptoms to watch:** Vomiting, diarrhea, hyperactivity, seizures\n\n⏰ Time is critical — symptoms appear within 6-12 hours.',
  default:     '🤖 I can help with:\n\n• **Symptoms** — Describe what you\'re seeing\n• **Nutrition** — Diet recommendations by breed/age\n• **Medications** — Safety and dosage guidance\n• **Vaccinations** — Schedules and requirements\n• **Emergency** — First aid and urgent care\n• **General Care** — Grooming, exercise, behavior\n\nPlease describe your pet\'s issue in detail for the best advice.',
};

function findResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('scratch') || q.includes('itch') || q.includes('skin')) return AI_RESPONSES.scratch;
  if (q.includes('diet') || q.includes('food') || q.includes('nutrition') || q.includes('eat')) return AI_RESPONSES.diet;
  if (q.includes('vaccine') || q.includes('vaccination') || q.includes('shot')) return AI_RESPONSES.vaccine;
  if (q.includes('ibuprofen') || q.includes('pain') || q.includes('medication')) return AI_RESPONSES.ibuprofen;
  if (q.includes('exercise') || q.includes('walk') || q.includes('puppy')) return AI_RESPONSES.exercise;
  if (q.includes('chocolate') || q.includes('toxic') || q.includes('poison') || q.includes('ate')) return AI_RESPONSES.chocolate;
  return AI_RESPONSES.default;
}

export function AiAssistantScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      text: '🐾 Hi! I\'m your **AI Pet Health Assistant**.\n\nI can help with symptoms, nutrition, medications, vaccinations, and emergencies.\n\nHow can I help your pet today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput]         = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Typing indicator pulse
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [isTyping]);

  const send = (text: string = input.trim()) => {
    if (!text) return;
    setInput('');
    setShowQuickActions(false);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: findResponse(text),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1200);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderText = (text: string) => {
    // Bold text between **
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
      <Text style={styles.msgText}>
        {parts.map((part, i) =>
          i % 2 === 1
            ? <Text key={i} style={styles.msgTextBold}>{part}</Text>
            : <Text key={i}>{part}</Text>
        )}
      </Text>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.aiAvatar}>
          <MaterialCommunityIcons name="robot" size={24} color="#fff" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>AI Pet Assistant</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online • Powered by PetCare AI</Text>
          </View>
        </View>
        <Pressable style={styles.headerBtn} onPress={() => Alert.alert('Upload', 'Image upload for AI disease prediction would open here')}>
          <MaterialCommunityIcons name="image-plus" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[styles.msgRow, msg.role === 'user' ? styles.msgRowUser : styles.msgRowAi]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.aiBubbleAvatar}>
                  <MaterialCommunityIcons name="robot" size={16} color={colors.primary} />
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                {renderText(msg.text)}
                <Text style={styles.msgTime}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={[styles.msgRow, styles.msgRowAi]}>
              <View style={styles.aiBubbleAvatar}>
                <MaterialCommunityIcons name="robot" size={16} color={colors.primary} />
              </View>
              <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
                {[0, 1, 2].map(i => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.typingDot,
                      { opacity: typingAnim, transform: [{ translateY: typingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Quick actions */}
          {showQuickActions && (
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Quick Questions</Text>
              <View style={styles.quickGrid}>
                {QUICK_ACTIONS.map(qa => (
                  <Pressable key={qa.label} style={styles.quickBtn} onPress={() => send(qa.prompt)}>
                    <MaterialCommunityIcons name={qa.icon as any} size={18} color={colors.primary} />
                    <Text style={styles.quickBtnText}>{qa.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <Pressable style={styles.inputAction} onPress={() => Alert.alert('Image', 'Camera/gallery for AI disease prediction')}>
            <MaterialCommunityIcons name="camera" size={20} color={colors.muted} />
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your pet's health..."
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => send()}
          />
          <Pressable
            style={[styles.sendBtn, input.trim() ? styles.sendBtnActive : null]}
            onPress={() => send()}
            disabled={!input.trim() || isTyping}
          >
            <MaterialCommunityIcons name="send" size={18} color={input.trim() ? '#fff' : colors.muted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: colors.background },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  aiAvatar:       { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerInfo:     { flex: 1 },
  headerTitle:    { fontSize: 17, fontWeight: '900', color: colors.text },
  onlineRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.success },
  onlineText:     { fontSize: 11, color: colors.muted, fontWeight: '600' },
  headerBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  msgList:        { padding: 16, gap: 12 },
  msgRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser:     { justifyContent: 'flex-end' },
  msgRowAi:       { justifyContent: 'flex-start' },
  aiBubbleAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble:         { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  bubbleAi:       { backgroundColor: colors.surface, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  bubbleUser:     { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  msgText:        { fontSize: 14, color: colors.text, lineHeight: 21 },
  msgTextBold:    { fontWeight: '900', color: colors.text },
  msgTime:        { fontSize: 10, color: colors.muted, alignSelf: 'flex-end' },
  typingBubble:   { flexDirection: 'row', gap: 4, paddingVertical: 14 },
  typingDot:      { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary + '60' },
  quickSection:   { marginTop: 8 },
  quickLabel:     { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 10, textAlign: 'center' },
  quickGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  quickBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.primary + '40' },
  quickBtnText:   { fontSize: 12, fontWeight: '700', color: colors.primary },
  inputBar:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  inputAction:    { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  input:          { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 120 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive:  { backgroundColor: colors.primary },
});
