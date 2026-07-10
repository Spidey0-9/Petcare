import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface Reminder {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  time: string;
  bgColor: string;
}

interface ReminderCardsProps {
  reminders: Reminder[];
  onPress: (reminderId: string) => void;
}

/**
 * Today's Reminders - Two cards side by side
 * Medicine and Vaccination with bounce animation
 */
export function ReminderCards({ reminders, onPress }: ReminderCardsProps) {
  return (
    <View style={styles.container}>
      {reminders.map((reminder, index) => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          index={index}
          onPress={() => onPress(reminder.id)}
        />
      ))}
    </View>
  );
}

function ReminderCard({
  reminder,
  index,
  onPress,
}: {
  reminder: Reminder;
  index: number;
  onPress: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: reminder.bgColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: bounceAnim }],
        },
      ]}
    >
      <Pressable onPress={onPress} style={styles.pressable}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: reminder.iconColor + '25' }]}>
          <MaterialCommunityIcons
            name={reminder.icon}
            size={28}
            color={reminder.iconColor}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{reminder.title}</Text>

        {/* Time */}
        <Text style={styles.time}>{reminder.time}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  pressable: {
    padding: 16,
    gap: 10,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
});
