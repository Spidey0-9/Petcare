import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients, radii, shadows } from '../../core/theme/colors';

export interface AIInsightItem {
  id: string;
  icon: string;
  color: string;
  text: string;
}

interface AIInsightCardProps {
  insights?: AIInsightItem[];
  onPress?: () => void;
}

export function AIInsightCard({ insights, onPress }: AIInsightCardProps) {
  const safeInsights = Array.isArray(insights) ? insights : [];
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0.4)).current;
  const dotAnim2 = useRef(new Animated.Value(0.4)).current;
  const dotAnim3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 150, useNativeDriver: true }),
    ]).start();

    const animateDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    animateDot(dotAnim1, 0);
    animateDot(dotAnim2, 200);
    animateDot(dotAnim3, 400);
  }, [dotAnim1, dotAnim2, dotAnim3, fadeAnim, slideAnim]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
      <Pressable onPress={onPress} style={styles.pressable}>
        <View style={styles.header}>
          <LinearGradient colors={gradients.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrapper}>
            <MaterialCommunityIcons name="robot-happy" size={24} color="#fff" />
          </LinearGradient>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Health Assistant</Text>
            <View style={styles.thinkingRow}>
              <Text style={styles.thinking}>Analysing </Text>
              {[dotAnim1, dotAnim2, dotAnim3].map((d, i) => (
                <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
              ))}
            </View>
          </View>
          <View style={styles.chevronBubble}>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
          </View>
        </View>

        <View style={styles.divider} />

        {safeInsights.map(ins => (
          <View key={ins.id} style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: ins.color + '18' }]}> 
              <MaterialCommunityIcons name={ins.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={14} color={ins.color} />
            </View>
            <Text style={styles.insightText}>{ins.text}</Text>
          </View>
        ))}

        <LinearGradient colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
          <Text style={styles.ctaText}>View AI Dashboard</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.18)',
    ...shadows.premium,
  },
  pressable: { padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: '900', color: colors.text },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  thinking: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary, marginHorizontal: 1 },
  chevronBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  divider: { height: 1, backgroundColor: colors.line },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  insightText: { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1, lineHeight: 19 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(16,185,129,0.16)' },
  ctaText: { fontSize: 13, fontWeight: '900', color: colors.primary },
});
