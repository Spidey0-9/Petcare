import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  color: string;
  bgColor: string;
  isNew?: boolean;
}

interface AchievementsCardProps {
  achievements: Achievement[];
}

export function AchievementsCard({ achievements }: AchievementsCardProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {achievements.map((a, i) => (
        <AchievementBadge key={a.id} item={a} index={i} />
      ))}
    </ScrollView>
  );
}

function AchievementBadge({ item, index }: { item: Achievement; index: number }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();

    // Shine loop for new badges
    if (item.isNew) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shineAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(shineAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  const shineOpacity = shineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: item.bgColor, borderColor: item.color + '40' },
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Shine overlay for new achievements */}
      {item.isNew && (
        <Animated.View style={[styles.shine, { opacity: shineOpacity, backgroundColor: item.color }]} />
      )}

      {/* New label */}
      {item.isNew && (
        <View style={[styles.newBadge, { backgroundColor: item.color }]}>
          <Text style={styles.newText}>NEW</Text>
        </View>
      )}

      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
      <Text style={styles.desc}>{item.desc}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingBottom: 4, paddingTop: 4 },
  badge: {
    width: 120,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newText: { fontSize: 7, fontWeight: '900', color: '#fff' },
  emoji: { fontSize: 30 },
  title: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
  desc:  { fontSize: 9,  fontWeight: '600', color: '#6B7280', textAlign: 'center' },
});
