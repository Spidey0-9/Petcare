import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'onboarding_completed';

/**
 * Onboarding Service
 * Centralises all AsyncStorage reads/writes for onboarding state
 * so every screen uses the same key and error handling.
 */
export const onboardingService = {
  /** Returns true if the user has already completed onboarding */
  isCompleted: async (): Promise<boolean> => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch {
      return false; // Fail-safe: show onboarding if storage errors
    }
  },

  /** Mark onboarding as completed */
  markCompleted: async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('[OnboardingService] Failed to save completion status:', error);
    }
  },

  /** Reset onboarding (useful for testing / logout) */
  reset: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (error) {
      console.error('[OnboardingService] Failed to reset onboarding:', error);
    }
  },
};
