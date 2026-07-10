import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

/**
 * Onboarding Illustration 1 — "We care like you do"
 * Shows a pet owner with a dog and cat, heart, and care icons
 * Built entirely with React Native views + MaterialCommunityIcons
 */
export function OnboardingIllustration1() {
  // Floating animation for the heart
  const floatAnim = useRef(new Animated.Value(0)).current;
  // Scale pulse for the main circle
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Infinite floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle pulse on main circle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background decorative circles */}
      <View style={[styles.bgCircle, styles.bgCircleLarge]} />
      <View style={[styles.bgCircle, styles.bgCircleSmall]} />

      {/* Main illustration circle */}
      <Animated.View style={[styles.mainCircle, { transform: [{ scale: pulseAnim }] }]}>
        {/* Big paw icon */}
        <MaterialCommunityIcons name="paw" size={90} color="#fff" />
      </Animated.View>

      {/* Dog card — bottom left */}
      <View style={[styles.petCard, styles.petCardLeft]}>
        <View style={[styles.petCardIcon, { backgroundColor: '#FFF3E0' }]}>
          <MaterialCommunityIcons name="dog" size={28} color="#FF8F00" />
        </View>
        <Text style={styles.petCardText}>Buddy</Text>
        <Text style={styles.petCardSub}>Golden Retriever</Text>
      </View>

      {/* Cat card — bottom right */}
      <View style={[styles.petCard, styles.petCardRight]}>
        <View style={[styles.petCardIcon, { backgroundColor: '#F3E8FF' }]}>
          <MaterialCommunityIcons name="cat" size={28} color="#7C3AED" />
        </View>
        <Text style={styles.petCardText}>Luna</Text>
        <Text style={styles.petCardSub}>Persian Cat</Text>
      </View>

      {/* Floating heart */}
      <Animated.View
        style={[styles.floatingHeart, { transform: [{ translateY: floatAnim }] }]}
      >
        <MaterialCommunityIcons name="heart" size={32} color="#FF6B6B" />
      </Animated.View>

      {/* Top-right sparkle badge */}
      <View style={styles.sparkle}>
        <MaterialCommunityIcons name="star-four-points" size={18} color={colors.primary} />
      </View>

      {/* Health badge */}
      <View style={styles.healthBadge}>
        <MaterialCommunityIcons name="shield-check" size={16} color={colors.success} />
        <Text style={styles.healthBadgeText}>Trusted Care</Text>
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
  bgCircleLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.primary + '10',
  },
  bgCircleSmall: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary + '18',
  },
  bgCircle: {},
  mainCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  petCard: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    width: 100,
  },
  petCardLeft: {
    bottom: 10,
    left: 0,
  },
  petCardRight: {
    bottom: 10,
    right: 0,
  },
  petCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  petCardText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  petCardSub: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  floatingHeart: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: '#FFF0F0',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sparkle: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: colors.primary + '20',
    padding: 8,
    borderRadius: 14,
  },
  healthBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#DCFCE7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
});
