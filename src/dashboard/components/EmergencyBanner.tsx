import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmergencyBannerProps {
  onFindHospital?: () => void;
  onCallVet?: () => void;
}

export function EmergencyBanner({ onFindHospital, onCallVet }: EmergencyBannerProps) {
  // Pulsing SOS animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0.6)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in on mount
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Continuous pulse on SOS button
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const actions = [
    { icon: 'hospital-building' as const, label: 'Find Hospital', onPress: onFindHospital },
    { icon: 'phone'             as const, label: 'Call Vet',      onPress: onCallVet },
    { icon: 'map-marker'        as const, label: 'Share Location', onPress: () => {} },
    { icon: 'headset'           as const, label: '24/7 Support',   onPress: () => {} },
  ];

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      {/* Left: SOS pulse */}
      <View style={styles.sosSection}>
        <Animated.View style={[styles.sosGlow, { opacity: glowAnim }]} />
        <Animated.View style={[styles.sosBtn, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.sosText}>SOS</Text>
          <MaterialCommunityIcons name="alert" size={16} color="#fff" />
        </Animated.View>
        <Text style={styles.emergencyLabel}>Emergency?</Text>
      </View>

      {/* Right: Action buttons */}
      <View style={styles.actionsGrid}>
        {actions.map(a => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={a.onPress}
          >
            <MaterialCommunityIcons name={a.icon} size={16} color="#fff" />
            <Text style={styles.actionLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  sosSection: { alignItems: 'center', gap: 6 },
  sosGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  sosBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  sosText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  emergencyLabel: { fontSize: 10, fontWeight: '700', color: '#fff', opacity: 0.9 },
  actionsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    width: '46%',
  },
  actionBtnPressed: { backgroundColor: 'rgba(255,255,255,0.35)' },
  actionLabel: { fontSize: 10, fontWeight: '700', color: '#fff', flexShrink: 1 },
});
