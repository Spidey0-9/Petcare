import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

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
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const dotAnim1  = useRef(new Animated.Value(0.4)).current;
  const dotAnim2  = useRef(new Animated.Value(0.4)).current;
  const dotAnim3  = useRef(new Animated.Value(0.4)).current;

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
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons name="robot" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Health Assistant</Text>
            <View style={styles.thinkingRow}>
              <Text style={styles.thinking}>Analysing </Text>
              {[dotAnim1, dotAnim2, dotAnim3].map((d, i) => (
                <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
              ))}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </View>

        <View style={styles.divider} />

        {safeInsights.map(ins => (
          <View key={ins.id} style={styles.insightRow}>
            <View style={[styles.insightDot, { backgroundColor: ins.color + '20' }]}> 
              <MaterialCommunityIcons name={ins.icon as any} size={14} color={ins.color} />
            </View>
            <Text style={styles.insightText}>{ins.text}</Text>
          </View>
        ))}

        <View style={styles.cta}>
          <Text style={styles.ctaText}>View AI Dashboard</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary + '30', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  pressable: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '900', color: colors.text },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  thinking: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary, marginHorizontal: 1 },
  divider: { height: 1, backgroundColor: colors.line },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insightText: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary + '12', borderRadius: 12, paddingVertical: 10 },
  ctaText: { fontSize: 13, fontWeight: '800', color: colors.primary },
});

