import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface QuickAction {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

/**
 * Quick Actions Grid
 * 5-per-row icon grid with staggered bounce-in animation
 * Scale animation on press + ripple feedback
 */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <View style={styles.grid}>
      {actions.map((action, index) => (
        <QuickActionItem key={action.id} action={action} index={index} />
      ))}
    </View>
  );
}

function QuickActionItem({
  action,
  index,
}: {
  action: QuickAction;
  index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered bounce-in on mount
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      delay: 400 + index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.88,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.itemWrapper,
        {
          transform: [{ scale: scaleAnim }],
          opacity: scaleAnim,
        },
      ]}
    >
      <Pressable
        onPress={action.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        android_ripple={{ color: action.color + '30', borderless: true, radius: 32 }}
      >
        <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
          {/* Icon Circle */}
          <View style={[styles.iconCircle, { backgroundColor: action.bgColor }]}>
            <MaterialCommunityIcons
              name={action.icon}
              size={26}
              color={action.color}
            />
          </View>
          {/* Label */}
          <Text style={styles.label} numberOfLines={1}>
            {action.label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 20,
  },
  itemWrapper: {
    width: '20%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
});
