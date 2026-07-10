import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { authService } from './auth';
import type { UserRole } from '../types';

const BIOMETRIC_ENABLED_KEY = 'biometric_login_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_login_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_login_password';
const BIOMETRIC_ROLE_KEY = 'biometric_login_role';

type BiometricLoginRole = Extract<UserRole, 'pet_owner' | 'doctor'>;

type SavedLogin = {
  email: string;
  password: string;
  role: BiometricLoginRole;
};

function keyForRole(baseKey: string, role: BiometricLoginRole) {
  return `${baseKey}_${role}`;
}

async function getSavedLogin(role: BiometricLoginRole): Promise<SavedLogin | null> {
  const [email, password] = await Promise.all([
    SecureStore.getItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, role)),
    SecureStore.getItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, role)),
  ]);

  if (email && password) return { email, password, role };

  const [legacyEmail, legacyPassword, legacyRole] = await Promise.all([
    SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
    SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY),
    SecureStore.getItemAsync(BIOMETRIC_ROLE_KEY),
  ]);

  if (legacyEmail && legacyPassword && legacyRole === role) {
    return { email: legacyEmail, password: legacyPassword, role };
  }

  return null;
}

export const biometricService = {
  isAvailable: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  isEnabled: async () => {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  },

  setEnabled: async (enabled: boolean) => {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  },

  hasSavedLogin: async (role: BiometricLoginRole) => {
    const [available, enabled, savedLogin] = await Promise.all([
      biometricService.isAvailable(),
      biometricService.isEnabled(),
      getSavedLogin(role),
    ]);
    return available && enabled && !!savedLogin;
  },

  saveLogin: async (email: string, password: string, role: BiometricLoginRole) => {
    if (!await biometricService.isAvailable()) return false;

    await Promise.all([
      SecureStore.setItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, role), email),
      SecureStore.setItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, role), password),
      SecureStore.setItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, role), role),
      SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email),
      SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password),
      SecureStore.setItemAsync(BIOMETRIC_ROLE_KEY, role),
      biometricService.setEnabled(true),
    ]);

    return true;
  },

  // Clears saved biometric credentials. Use only when disabling biometrics or when credentials become invalid.
  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_ROLE_KEY),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, 'pet_owner')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'pet_owner')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, 'pet_owner')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, 'doctor')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'doctor')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, 'doctor')),
    ]);
  },

  hasActiveSession: async () => {
    const session = await authService.getSession();
    return !!session?.user;
  },

  canUseLogin: async (role: BiometricLoginRole) => {
    return biometricService.hasSavedLogin(role);
  },

  enableAfterLogin: async (email: string | undefined, password: string | undefined, role: BiometricLoginRole) => {
    if (email && password) return biometricService.saveLogin(email, password, role);

    const session = await authService.getSession();
    if (session?.user && await biometricService.isAvailable()) {
      await biometricService.setEnabled(true);
      return true;
    }

    return false;
  },

  authenticate: async (role: BiometricLoginRole) => {
    const savedLogin = await getSavedLogin(role);
    const hasSession = await biometricService.hasActiveSession();

    if (!savedLogin && !hasSession) {
      return { status: 'missing-login' as const, session: null, role: null };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: role === 'doctor' ? 'Unlock Doctor Login' : 'Unlock Pet Owner Login',
      cancelLabel: 'Use password',
      disableDeviceFallback: false,
    });

    if (!result.success) return { status: 'cancelled' as const, session: null, role: null };

    if (hasSession) {
      const session = await authService.getSession();
      if (session?.user) return { status: 'success' as const, session, role };
    }

    if (!savedLogin) {
      return { status: 'missing-login' as const, session: null, role: null };
    }

    try {
      await authService.signInWithEmail(savedLogin.email, savedLogin.password);
      const session = await authService.getSession();
      if (!session?.user) return { status: 'missing-session' as const, session: null, role: savedLogin.role };
      return { status: 'success' as const, session, role: savedLogin.role };
    } catch (error) {
      await biometricService.clear();
      throw error;
    }
  },
};