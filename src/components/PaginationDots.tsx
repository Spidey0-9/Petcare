import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { colors } from '../core/theme/colors';

const { width } = Dimensions.get('window');

interface PaginationDotsProps {
  data: any[]; // Array of onboarding data
  scrollX: Animated.Value; // Animated scroll value from FlatList
  activeIndex: number; // Current active page index
}

/**
 * Animated Pagination Dots Component
 * Shows animated dots indicating current page position
 * Dots scale and change color based on active state
 */
export function PaginationDots({ data, scrollX, activeIndex }: PaginationDotsProps) {
  return (
    <View style={styles.container}>
      {data.map((_, index) => {
        // Calculate input range for smooth animations
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        // Animate dot width based on scroll position
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8], // Expand active dot
          extrapolate: 'clamp',
        });

        // Animate dot opacity
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3], // Full opacity for active
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: colors.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
