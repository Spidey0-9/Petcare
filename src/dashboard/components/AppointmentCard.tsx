import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, gradients, radii, shadows } from '../../core/theme/colors';

interface AppointmentCardProps {
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  clinic?: string;
  status?: string;
  onPress: () => void;
}

export function AppointmentCard({
  doctorName,
  specialty,
  date,
  time,
  clinic,
  status,
  onPress,
}: AppointmentCardProps) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        <LinearGradient colors={gradients.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.doctorAvatar}>
          <MaterialCommunityIcons name="stethoscope" size={28} color="#fff" />
        </LinearGradient>

        <View style={styles.info}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          <View style={styles.clinicRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={12} color={colors.muted} />
            <Text style={styles.clinic}>{clinic || 'Clinic not assigned'}</Text>
          </View>
          {!!status && (
            <View style={styles.statusPill}>
              <Text style={styles.status}>{status}</Text>
            </View>
          )}
        </View>

        <View style={styles.dateTime}>
          <Text style={styles.date}>{date}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radii.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.16)',
    ...shadows.soft,
  },
  doctorAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 3,
  },
  specialty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 5,
  },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinic: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  status: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  dateTime: {
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    paddingLeft: 12,
  },
  date: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 3,
  },
  time: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.accent,
  },
});
