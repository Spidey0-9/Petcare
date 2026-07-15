import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radii, shadows } from '../core/theme/colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

type QuickAction = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  subtitle: string;
  prompt: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'stethoscope', label: 'Analyze Symptoms', subtitle: 'Triage signs and next steps', prompt: 'My dog has been scratching a lot lately. What could cause this?' },
  { icon: 'file-document-outline', label: 'Scan Medical Report', subtitle: 'Understand report notes', prompt: 'Help me understand a pet medical report and what I should ask the vet.' },
  { icon: 'food-apple', label: 'Food Safety Check', subtitle: 'Diet and toxic foods', prompt: 'What foods are unsafe for dogs and cats?' },
  { icon: 'dog-side', label: 'Breed Information', subtitle: 'Risks, exercise and care', prompt: 'What should I know about caring for a Golden Retriever?' },
  { icon: 'needle', label: 'Vaccination Advice', subtitle: 'Schedules and reminders', prompt: 'What vaccines does my 3-year-old dog need?' },
  { icon: 'alert-circle', label: 'Emergency Help', subtitle: 'Urgent first-aid guidance', prompt: 'My dog ate chocolate. What should I do immediately?' },
];

const AI_RESPONSES: Record<string, string> = {
  scratch: 'Excessive scratching can indicate:\n\n- Flea infestation: check for tiny dark specks in fur\n- Food allergy: common triggers include chicken, beef, dairy\n- Atopic dermatitis: environmental allergens like pollen\n- Yeast or bacterial infection: often smells unpleasant\n\nRecommended: schedule a dermatology appointment. Your vet may suggest a hypoallergenic diet trial or allergy testing.\n\nBook an appointment now?',
  diet: 'Golden Retriever nutrition guide:\n\nDaily feeding:\n- Adult, 2-7 years: 2-3 cups quality kibble/day\n- Split into 2 meals\n- Protein above 25%, fat 12-16%\n\nAvoid: onions, grapes, chocolate, xylitol.\n\nSupplements often discussed with vets: omega-3, glucosamine, fish oil. Consult your vet for portions based on weight.',
  vaccine: 'Core vaccines for a 3-year-old dog:\n\nRequired core vaccines:\n- Rabies: annual or 3-year schedule\n- DHPP: every 3 years after primary series\n\nRecommended non-core vaccines may include Bordetella, Leptospirosis, and Canine Influenza depending on exposure.\n\nBook a vaccination appointment to stay up to date.',
  ibuprofen: 'Important: never give Ibuprofen to cats or dogs unless explicitly directed by a veterinarian.\n\nIt can cause kidney failure, GI ulcers, liver damage, seizures, and can be life-threatening.\n\nIf your pet already ingested it, contact your vet or an emergency clinic immediately.',
  exercise: 'Puppy exercise guidelines by age:\n\n- 8-12 weeks: short play sessions only\n- 3-6 months: 15-20 minute gentle walks\n- 6-12 months: 20-30 minute walks, avoid high impact\n- 12+ months: 30-60 minutes depending on breed\n\nAvoid over-exercising growing puppies because developing joints are sensitive.',
  chocolate: 'Emergency: chocolate is toxic to dogs.\n\nImmediately:\n1. Note how much and what type was eaten\n2. Call your vet or poison control\n3. Do not induce vomiting without vet guidance\n\nWatch for vomiting, diarrhea, hyperactivity, tremors, or seizures. Time matters.',
  default: 'I can help with symptoms, nutrition, medications, vaccinations, emergencies, grooming, behavior, and general care.\n\nDescribe your pet, age, breed, symptoms, and how long it has been happening for the best guidance.',
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
  const inputRef = useRef<TextInput>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [fadeAnim]);

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
  }, [isTyping, typingAnim]);

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

  const renderText = (text: string, role: Message['role']) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
      <Text style={[styles.msgText, role === 'user' && styles.msgTextUser]}>
        {parts.map((part, i) =>
          i % 2 === 1
            ? <Text key={i} style={[styles.msgTextBold, role === 'user' && styles.msgTextUser]}>{part}</Text>
            : <Text key={i}>{part}</Text>
        )}
      </Text>
    );
  };

  const hasMessages = messages.length > 0;

  return (
    <LinearGradient colors={gradients.app} style={[styles.root, { paddingTop: insets.top }]}> 
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />

      <View style={styles.header}>
        <LinearGradient colors={gradients.premium} style={styles.aiAvatar}>
          <MaterialCommunityIcons name="robot-happy" size={25} color="#fff" />
        </LinearGradient>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>PetCare AI</Text>
          <Text style={styles.conversationTitle}>Pet health conversation</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online - ready to help</Text>
          </View>
        </View>
        <Pressable style={styles.headerBtn} onPress={() => Alert.alert('Upload', 'Image upload for AI disease prediction would open here')}>
          <MaterialCommunityIcons name="image-plus" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <Animated.ScrollView
          ref={scrollRef}
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {!hasMessages && (
            <View style={styles.welcomeCard}>
              <LinearGradient colors={gradients.premium} style={styles.welcomeOrb}>
                <MaterialCommunityIcons name="brain" size={44} color="#fff" />
              </LinearGradient>
              <Text style={styles.welcomeTitle}>How can I help your pet today?</Text>
              <Text style={styles.welcomeText}>Ask about symptoms, food safety, vaccination, breed care, reports, or emergencies.</Text>
            </View>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} renderText={renderText} />
          ))}

          {isTyping && (
            <View style={[styles.msgRow, styles.msgRowAi]}>
              <View style={styles.aiBubbleAvatar}>
                <MaterialCommunityIcons name="robot" size={16} color={colors.primary} />
              </View>
              <View style={[styles.bubble, styles.bubbleAi, styles.typingBubble]}>
                <Text style={styles.thinkingText}>Thinking</Text>
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

          {showQuickActions && (
            <View style={styles.quickSection}>
              <Text style={styles.quickLabel}>Try a smart prompt</Text>
              <View style={styles.quickGrid}>
                {QUICK_ACTIONS.map(qa => (
                  <Pressable key={qa.label} style={styles.quickBtn} onPress={() => send(qa.prompt)}>
                    <View style={styles.quickIconWrap}>
                      <MaterialCommunityIcons name={qa.icon} size={19} color={colors.primaryDark} />
                    </View>
                    <View style={styles.quickCopy}>
                      <Text style={styles.quickBtnText}>{qa.label}</Text>
                      <Text style={styles.quickSubtitle}>{qa.subtitle}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </Animated.ScrollView>

        <View style={styles.inputPanel}>
          <View style={styles.toolRow}>
            <ToolButton icon="paperclip" label="Attach" onPress={() => Alert.alert('Attachment', 'Attachment picker would open here')} />
            <ToolButton icon="camera" label="Camera" onPress={() => Alert.alert('Camera', 'Camera for AI disease prediction')} />
            <ToolButton icon="image" label="Gallery" onPress={() => Alert.alert('Gallery', 'Gallery for AI disease prediction')} />
            <ToolButton icon="microphone" label="Voice" onPress={() => Alert.alert('Voice', 'Voice input would start here')} />
          </View>
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Message PetCare AI..."
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
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function MessageBubble({ message, renderText }: { message: Message; renderText: (text: string, role: Message['role']) => React.ReactNode }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
      {!isUser && (
        <View style={styles.aiBubbleAvatar}>
          <MaterialCommunityIcons name="robot" size={16} color={colors.primary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        {renderText(message.text, message.role)}
        {!isUser && (
          <View style={styles.responseMetaRow}>
            <View style={styles.confidencePill}>
              <MaterialCommunityIcons name="check-decagram" size={12} color={colors.primaryDark} />
              <Text style={styles.confidenceText}>Guidance</Text>
            </View>
            <Pressable onPress={() => Alert.alert('Copied', 'Response copied to clipboard')}>
              <MaterialCommunityIcons name="content-copy" size={15} color={colors.muted} />
            </Pressable>
            <Pressable onPress={() => Alert.alert('Share', 'Sharing would open here')}>
              <MaterialCommunityIcons name="share-variant" size={15} color={colors.muted} />
            </Pressable>
          </View>
        )}
        <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function ToolButton({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.toolButton} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={17} color={colors.primaryDark} />
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  backgroundGlowOne: { position: 'absolute', top: -90, right: -70, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(20,184,166,0.18)' },
  backgroundGlowTwo: { position: 'absolute', bottom: -120, left: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(249,115,22,0.12)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  aiAvatar: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...shadows.premium },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  conversationTitle: { fontSize: 12, color: colors.muted, fontWeight: '800', marginTop: 1 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { fontSize: 11, color: colors.primaryDark, fontWeight: '800' },
  headerBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  keyboard: { flex: 1 },
  msgList: { padding: 16, gap: 14, paddingBottom: 20 },
  welcomeCard: { alignItems: 'center', backgroundColor: colors.surfaceGlass, borderRadius: radii.xxl, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', ...shadows.soft },
  welcomeOrb: { width: 92, height: 92, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  welcomeTitle: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' },
  welcomeText: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  aiBubbleAvatar: { width: 30, height: 30, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble: { maxWidth: '82%', borderRadius: 22, paddingHorizontal: 15, paddingVertical: 12, gap: 6 },
  bubbleAi: { backgroundColor: colors.surfaceGlass, borderBottomLeftRadius: 7, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)', ...shadows.soft },
  bubbleUser: { backgroundColor: colors.primary, borderBottomRightRadius: 7 },
  msgText: { fontSize: 14, color: colors.text, lineHeight: 21, fontWeight: '600' },
  msgTextUser: { color: '#fff' },
  msgTextBold: { fontWeight: '900', color: colors.text },
  msgTime: { fontSize: 10, color: colors.muted, alignSelf: 'flex-end', marginTop: 3, fontWeight: '700' },
  msgTimeUser: { color: 'rgba(255,255,255,0.75)' },
  responseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  confidencePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  confidenceText: { fontSize: 10, fontWeight: '900', color: colors.primaryDark },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 14 },
  thinkingText: { fontSize: 12, color: colors.muted, fontWeight: '800', marginRight: 3 },
  typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary },
  quickSection: { marginTop: 4 },
  quickLabel: { fontSize: 12, fontWeight: '900', color: colors.muted, marginBottom: 10, textTransform: 'uppercase' },
  quickGrid: { gap: 10 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)', ...shadows.soft },
  quickIconWrap: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  quickCopy: { flex: 1 },
  quickBtnText: { fontSize: 14, fontWeight: '900', color: colors.text },
  quickSubtitle: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 2 },
  inputPanel: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, backgroundColor: 'rgba(255,255,255,0.86)', borderTopWidth: 1, borderTopColor: colors.line },
  toolRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  toolButton: { flex: 1, minHeight: 36, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  toolText: { fontSize: 10, fontWeight: '900', color: colors.primaryDark },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  input: { flex: 1, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, color: colors.text, maxHeight: 120, fontWeight: '600' },
  sendBtn: { width: 40, height: 40, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: colors.primary },
});