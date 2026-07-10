import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

/**
 * Onboarding Illustration 2 — "Smart healthcare for your pets"
 * Shows a healthcare dashboard with appointment, vaccination,
 * health monitor, and reminder cards.
 */
export function OnboardingIllustration2() {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide in cards from below
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse the center icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const features = [
    { icon: 'calendar-check', label: 'Appointments', color: '#6C63FF', bg: '#EEF2FF' },
    { icon: 'needle', label: 'Vaccinations', color: '#0EA5E9', bg: '#E0F2FE' },
    { icon: 'heart-pulse', label: 'Health Monitor', color: '#EF4444', bg: '#FEE2E2' },
    { icon: 'bell-ring', label: 'Reminders', color: '#FF8F00', bg: '#FFF3E0' },
  ];

  return (
    <View style={styles.container}>
      {/* Background circle */}
      <View style={styles.bgCircle} />

      {/* Central icon */}
      <Animated.View
        style={[styles.centerCircle, { transform: [{ scale: pulseAnim }] }]}
      >
        <MaterialCommunityIcons name="hospital-box" size={60} color="#fff" />
      </Animated.View>

      {/* Feature cards arranged in a 2x2 grid around center */}
      <Animated.View
        style={[
          styles.grid,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        {features.map((f, i) => (
          <View key={i} style={[styles.featureCard, { backgroundColor: f.bg }]}>
            <View style={[styles.featureIcon, { backgroundColor: f.color + '25' }]}>
              <MaterialCommunityIcons name={f.icon as any} size={24} color={f.color} />
            </View>
            <Text style={[styles.featureLabel, { color: f.color }]}>{f.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Floating AI badge */}
      <View style={styles.aiBadge}>
        <MaterialCommunityIcons name="robot" size={14} color="#7C3AED" />
        <Text style={styles.aiBadgeText}>AI Powered</Text>
      </View>

      {/* Online status dot */}
      <View style={styles.onlineDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bgCircle: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#EEF2FF',
  },
  centerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: 240,
    justifyContent: 'center',
  },
  featureCard: {
    width: 108,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    right: 8,
    backgroundColor: '#F3E8FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  onlineDot: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
