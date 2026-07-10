import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface ProfileCardProps {
  petName: string;
  petBreed: string;
  petImage?: string;
  healthScore: number;
  onPress: () => void;
}

/**
 * Animated Profile Card (Green Card)
 * Shows pet image, name, breed, and health score with animated progress circle
 */
export function ProfileCard({ petName, petBreed, petImage, healthScore, onPress }: ProfileCardProps) {
  // Animations
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animated progress circle
    Animated.timing(progressAnim, {
      toValue: healthScore,
      duration: 1200,
      delay: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  const healthStatus = healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Poor';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable onPress={onPress} style={styles.pressable}>
        {/* Pet Info Row */}
        <View style={styles.petRow}>
          <View style={styles.petAvatar}>
            {petImage ? <Image source={{ uri: petImage }} style={styles.petImage} /> : <MaterialCommunityIcons name="dog" size={40} color="#FFFFFF" />}
          </View>
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{petName}</Text>
            <Text style={styles.petBreed}>{petBreed}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color="#FFFFFF" />
        </View>

        {/* Health Score Panel */}
        <View style={styles.healthPanel}>
          {/* Animated Progress Circle */}
          <View style={styles.scoreCircleWrapper}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{healthScore}</Text>
            </View>
          </View>

          {/* Health Info */}
          <View style={styles.healthInfo}>
            <Text style={styles.healthTitle}>Health Score</Text>
            <Text style={styles.healthStatus}>{healthScore} {healthStatus}</Text>
          </View>

          {/* Chart Icon */}
          <MaterialCommunityIcons
            name="chart-line"
            size={48}
            color={colors.success}
            style={styles.chartIcon}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.success,
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  pressable: {
    gap: 16,
  },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  petAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  petImage: { width: '100%', height: '100%', borderRadius: 35 },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  petBreed: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  healthPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scoreCircleWrapper: {
    position: 'relative',
  },
  scoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 7,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
  },
  healthInfo: {
    flex: 1,
  },
  healthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  healthStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  chartIcon: {
    marginLeft: 'auto',
  },
});

