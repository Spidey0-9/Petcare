import React, { ReactNode } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../core/theme/colors';

const { width, height } = Dimensions.get('window');

interface OnboardingCardProps {
  image?: any; // Image source (require or uri) - optional
  illustration?: ReactNode; // Illustration component - optional
  title: string;
  subtitle: string;
}

/**
 * Reusable OnboardingCard component
 * Displays image OR illustration component, plus title and subtitle
 */
export function OnboardingCard({ image, illustration, title, subtitle }: OnboardingCardProps) {
  return (
    <View style={styles.container}>
      {/* Hero Image or Illustration Container */}
      <View style={styles.imageContainer}>
        {illustration ? (
          illustration
        ) : image ? (
          <Image 
            source={image} 
            style={styles.image} 
            resizeMode="contain"
          />
        ) : null}
      </View>

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Title */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: width * 0.85,
    height: height * 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
});
