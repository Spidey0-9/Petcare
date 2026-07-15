import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../core/theme/colors';

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
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 80,
      delay: 400 + index * 60,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.9,
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
        android_ripple={{ color: action.color + '24', borderless: true, radius: 32 }}
      >
        <Animated.View style={[styles.actionShell, { transform: [{ scale: pressAnim }] }]}>
          <View style={[styles.iconCircle, { backgroundColor: action.bgColor, borderColor: action.color + '24' }]}>
            <MaterialCommunityIcons
              name={action.icon}
              size={25}
              color={action.color}
            />
          </View>
          <Text style={styles.label} numberOfLines={2}>
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
    rowGap: 18,
  },
  itemWrapper: {
    width: '20%',
    alignItems: 'center',
  },
  actionShell: {
    alignItems: 'center',
    minHeight: 92,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    ...shadows.soft,
  },
  label: {
    marginTop: 9,
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 13,
  },
});
