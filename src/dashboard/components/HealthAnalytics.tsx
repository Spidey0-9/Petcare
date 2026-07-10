import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface HealthMetricItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  unit: string;
  trend: string;
  trendUp: boolean;
  color: string;
  bgColor: string;
  progress: number;
}

interface HealthAnalyticsProps {
  metrics: HealthMetricItem[];
  onPress?: (metricId: string) => void;
}

export function HealthAnalytics({ metrics, onPress }: HealthAnalyticsProps) {
  return (
    <View style={styles.grid}>
      {metrics.map((m, i) => (
        <MetricCard key={m.id} metric={m} index={i} onPress={() => onPress?.(m.id)} />
      ))}
    </View>
  );
}

function MetricCard({
  metric,
  index,
  onPress,
}: {
  metric: HealthMetricItem;
  index: number;
  onPress: () => void;
}) {
  const slideAnim    = useRef(new Animated.Value(20)).current;
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pressAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = 100 + index * 80;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: Math.max(0, Math.min(1, metric.progress)),
      duration: 1000,
      delay: delay + 200,
      useNativeDriver: false,
    }).start();
  }, [index, metric.progress, fadeAnim, progressAnim, slideAnim]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handlePressIn  = () => Animated.spring(pressAnim, { toValue: 0.95, useNativeDriver: true, friction: 8 }).start();
  const handlePressOut = () => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true, friction: 6 }).start();

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: pressAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={[styles.iconWrap, { backgroundColor: metric.bgColor }]}> 
          <MaterialCommunityIcons name={metric.icon as any} size={22} color={metric.color} />
        </View>

        <Text style={styles.value}>
          {metric.value}
          <Text style={styles.unit}> {metric.unit}</Text>
        </Text>

        <Text style={styles.label}>{metric.label}</Text>

        <View style={styles.trendRow}>
          <MaterialCommunityIcons
            name={metric.trendUp ? 'trending-up' : 'information-outline'}
            size={12}
            color={metric.trendUp ? colors.success : colors.muted}
          />
          <Text style={[styles.trend, { color: metric.trendUp ? colors.success : colors.muted }]}>
            {metric.trend}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: barWidth, backgroundColor: metric.color }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  pressable: { padding: 14, gap: 8 },
  iconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '900', color: colors.text },
  unit: { fontSize: 11, fontWeight: '700', color: colors.muted },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trend: { fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  progressBar: { height: 5, borderRadius: 3 },
});
