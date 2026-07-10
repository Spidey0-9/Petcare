import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

/**
 * Onboarding Illustration 3 — "Everything your pet needs"
 * Shows all app features: AI, Emergency, Pharmacy, Grooming, Store, Community
 */
export function OnboardingIllustration3() {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Slow continuous rotation for outer ring
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const services = [
    { icon: 'robot', label: 'AI Health', color: '#7C3AED', bg: '#F3E8FF' },
    { icon: 'ambulance', label: 'Emergency', color: '#EF4444', bg: '#FEE2E2' },
    { icon: 'pill', label: 'Pharmacy', color: '#0EA5E9', bg: '#E0F2FE' },
    { icon: 'content-cut', label: 'Grooming', color: '#FF8F00', bg: '#FFF3E0' },
    { icon: 'shopping', label: 'Pet Store', color: '#16A34A', bg: '#DCFCE7' },
    { icon: 'account-group', label: 'Community', color: '#6C63FF', bg: '#EEF2FF' },
  ];

  return (
    <View style={styles.container}>
      {/* Rotating outer dashed ring */}
      <Animated.View style={[styles.rotatingRing, { transform: [{ rotate }] }]}>
        {[...Array(8)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.ringDot,
              {
                transform: [
                  { rotate: `${i * 45}deg` },
                  { translateY: -122 },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Center circle */}
      <Animated.View
        style={[
          styles.centerCircle,
          { transform: [{ scale: scaleAnim }], opacity: fadeAnim },
        ]}
      >
        <MaterialCommunityIcons name="paw" size={50} color="#fff" />
        <Text style={styles.centerText}>All-in-One</Text>
      </Animated.View>

      {/* Service cards in two rows */}
      <Animated.View style={[styles.servicesGrid, { opacity: fadeAnim }]}>
        {services.map((s, i) => (
          <View key={i} style={[styles.serviceCard, { backgroundColor: s.bg }]}>
            <MaterialCommunityIcons name={s.icon as any} size={22} color={s.color} />
            <Text style={[styles.serviceLabel, { color: s.color }]}>{s.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* "100+ Features" badge */}
      <View style={styles.badge}>
        <MaterialCommunityIcons name="star-circle" size={14} color="#FF8F00" />
        <Text style={styles.badgeText}>100+ Features</Text>
      </View>
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
  rotatingRing: {
    position: 'absolute',
    width: 244,
    height: 244,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary + '40',
  },
  centerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 16,
    gap: 4,
  },
  centerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    opacity: 0.9,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: 264,
    justifyContent: 'center',
  },
  serviceCard: {
    width: 80,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  serviceLabel: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFF8E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#FF8F00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF8F00',
  },
});
