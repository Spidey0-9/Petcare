import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface AppointmentCardProps {
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  clinic?: string;
  status?: string;
  onPress: () => void;
}

/**
 * Upcoming Appointment Card
 * Shows doctor info with scale animation on press
 */
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
  }, []);

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
        {/* Doctor Avatar */}
        <View style={styles.doctorAvatar}>
          <MaterialCommunityIcons name="doctor" size={28} color={colors.primary} />
        </View>

        {/* Doctor Info */}
        <View style={styles.info}>
          <Text style={styles.doctorName}>{doctorName}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          <View style={styles.clinicRow}>
            <MaterialCommunityIcons name="map-marker" size={12} color={colors.muted} />
            <Text style={styles.clinic}>{clinic || 'Clinic not assigned'}</Text>
          </View>
          {!!status && <Text style={styles.status}>{status}</Text>}
        </View>

        {/* Date & Time */}
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
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
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 4,
  },
  clinicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clinic: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  status: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'capitalize',
  },
  dateTime: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  time: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});





