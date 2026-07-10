import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { OnboardingCard } from '../components/OnboardingCard';
import { PaginationDots } from '../components/PaginationDots';
import { OnboardingIllustration1 } from '../components/illustrations/OnboardingIllustration1';
import { OnboardingIllustration2 } from '../components/illustrations/OnboardingIllustration2';
import { OnboardingIllustration3 } from '../components/illustrations/OnboardingIllustration3';
import { colors } from '../core/theme/colors';
import { onboardingService } from '../core/services/onboardingService';
import type { AuthStackParamList } from '../routes/types';

const { width } = Dimensions.get('window');

// Onboarding data configuration
// Currently using animated illustrations
// To use real images: Save photos as onboarding1.jpg and onboarding2.jpg in assets/images/
const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'We care like you do',
    subtitle: 'All in one app for your pet\'s health and happiness.',
    // Using animated illustration (swap with: image: require('../../assets/images/onboarding1.jpg'))
    illustration: <OnboardingIllustration1 />,
  },
  {
    id: '2',
    title: 'Smart healthcare for your pets',
    subtitle: 'Book appointments, track vaccinations, monitor health, and receive reminders.',
    // Using animated illustration (swap with: image: require('../../assets/images/onboarding2.jpg'))
    illustration: <OnboardingIllustration2 />,
  },
  {
    id: '3',
    title: 'Everything your pet needs',
    subtitle: 'AI Health Assistant, Emergency Care, Pharmacy, Grooming, Pet Store and Community.',
    // Animated illustration
    illustration: <OnboardingIllustration3 />,
  },
];

type Nav = NativeStackNavigationProp<AuthStackParamList>;

/**
 * OnboardingScreen Component
 * 
 * Features:
 * - 3-screen swipeable onboarding flow
 * - Smooth FlatList with pagingEnabled
 * - Animated pagination dots
 * - Skip button on all screens
 * - Next button with auto-scroll animation
 * - Get Started button on last screen
 * - AsyncStorage to track completion
 */
export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  /**
   * Handle scroll completion to update current index
   */
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  /**
   * Navigate to next screen with smooth animation
   */
  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      // Scroll to next page
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Last screen - complete onboarding
      handleGetStarted();
    }
  };

  /**
   * Complete onboarding and navigate to Login
   * Save completion status to AsyncStorage
   */
  const handleGetStarted = async () => {
    try {
      // Mark onboarding as completed
      await onboardingService.markCompleted();
      // Navigate to Login screen
      navigation.replace('Permissions');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      // Navigate anyway even if storage fails
      navigation.replace('Permissions');
    }
  };

  /**
   * Skip onboarding and go directly to Login
   */
  const handleSkip = async () => {
    try {
      // Mark onboarding as completed
      await onboardingService.markCompleted();
      // Navigate to Login screen
      navigation.replace('Permissions');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.replace('Permissions');
    }
  };

  /**
   * Render individual onboarding card
   */
  const renderItem = ({ item }: any) => (
    <OnboardingCard
      image={item.image}
      illustration={item.illustration}
      title={item.title}
      subtitle={item.subtitle}
    />
  );

  const isLastScreen = currentIndex === ONBOARDING_DATA.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [
            styles.skipButton,
            pressed && styles.skipButtonPressed,
          ]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Horizontal Scrollable Onboarding Cards */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {/* Bottom Section: Pagination + Button */}
      <View style={styles.bottomSection}>
        {/* Animated Pagination Dots */}
        <PaginationDots
          data={ONBOARDING_DATA}
          scrollX={scrollX}
          activeIndex={currentIndex}
        />

        {/* Next / Get Started Button */}
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastScreen ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.background,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 20,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

