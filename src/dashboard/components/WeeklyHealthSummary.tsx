import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface WeeklyHealthStatItem {
  id: string;
  icon: string;
  label: string;
  percent: number;
  change: string;
  color: string;
  bgColor: string;
}

export function WeeklyHealthSummary({ stats, overall }: { stats: WeeklyHealthStatItem[]; overall: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="chart-bar" size={22} color={colors.primary} />
          <Text style={styles.title}>Weekly Summary</Text>
        </View>
        <View style={styles.overallBadge}>
          <Text style={styles.overallText}>{overall}%</Text>
          <Text style={styles.overallLabel}>Overall</Text>
        </View>
      </View>

      {stats.map((stat, i) => (
        <StatRow key={stat.id} stat={stat} index={i} />
      ))}
    </View>
  );
}

function StatRow({ stat, index }: { stat: WeeklyHealthStatItem; index: number }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = 200 + index * 100;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(progressAnim, {
        toValue: Math.max(0, Math.min(100, stat.percent)) / 100,
        duration: 900,
        delay,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, index, progressAnim, stat.percent]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.row, { opacity: fadeAnim }]}> 
      <View style={[styles.iconCircle, { backgroundColor: stat.bgColor }]}> 
        <MaterialCommunityIcons name={stat.icon as any} size={16} color={stat.color} />
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.label}>{stat.label}</Text>
          <View style={styles.rightRow}>
            <Text style={[styles.change, { color: stat.percent > 0 ? colors.success : colors.muted }]}>{stat.change}</Text>
            <Text style={[styles.percent, { color: stat.color }]}>{stat.percent}%</Text>
          </View>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: stat.color }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '900', color: colors.text },
  overallBadge: { alignItems: 'center', backgroundColor: colors.primary + '15', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  overallText:  { fontSize: 20, fontWeight: '900', color: colors.primary },
  overallLabel: { fontSize: 9,  fontWeight: '700', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label:   { fontSize: 13, fontWeight: '800', color: colors.text },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  change:  { fontSize: 11, fontWeight: '700' },
  percent: { fontSize: 13, fontWeight: '900' },
  track:   { height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  bar:     { height: 6, borderRadius: 3 },
});
