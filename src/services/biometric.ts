import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { authService } from './auth';
import { authSecurityService } from './security';
import type { UserRole } from '../types';

const BIOMETRIC_ENABLED_KEY = 'biometric_login_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_login_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_login_password';
const BIOMETRIC_ROLE_KEY = 'biometric_login_role';
const BIOMETRIC_LAST_ENABLED_AT_KEY = 'biometric_last_enabled_at';

type BiometricLoginRole = Extract<UserRole, 'pet_owner' | 'doctor' | 'groomer' | 'admin' | 'super_admin'>;

type SavedBiometricPreference = {
  email: string | null;
  role: BiometricLoginRole;
};

function keyForRole(baseKey: string, role: BiometricLoginRole) {
  return `${baseKey}_${role}`;
}

function promptForRole(role: BiometricLoginRole) {
  if (role === 'doctor') return 'Unlock Doctor Login';
  if (role === 'groomer') return 'Unlock Groomer Login';
  if (role === 'admin' || role === 'super_admin') return 'Unlock Super Admin Login';
  return 'Unlock Pet Owner Login';
}

async function getSavedPreference(role: BiometricLoginRole): Promise<SavedBiometricPreference | null> {
  const [email, savedRole] = await Promise.all([
    SecureStore.getItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, role)),
    SecureStore.getItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, role)),
  ]);

  if (savedRole === role) return { email, role };

  const [legacyEmail, legacyRole] = await Promise.all([
    SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
    SecureStore.getItemAsync(BIOMETRIC_ROLE_KEY),
  ]);

  if (legacyRole === role) return { email: legacyEmail, role };
  return null;
}

async function deleteLegacyPasswords() {
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY),
    SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'pet_owner')),
    SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'doctor')),
    SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'groomer')),
    SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'admin')),
    SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'super_admin')),
  ]);
}

export const biometricService = {
  isAvailable: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  getSupportedTypes: async () => {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  },

  isEnabled: async () => {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  },

  setEnabled: async (enabled: boolean) => {
    if (!enabled) {
      await biometricService.clear();
      return;
    }
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  },

  hasSavedLogin: async (role: BiometricLoginRole) => {
    await deleteLegacyPasswords();
    const [available, enabled, preference] = await Promise.all([
      biometricService.isAvailable(),
      biometricService.isEnabled(),
      getSavedPreference(role),
    ]);
    const session = await authService.getSession();
    return available && enabled && !!preference && !!session?.user;
  },

  saveLogin: async (email: string | undefined, _password: string | undefined, role: BiometricLoginRole) => {
    return biometricService.enableAfterLogin(email, role);
  },

  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_ROLE_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_LAST_ENABLED_AT_KEY),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, 'pet_owner')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'pet_owner')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, 'pet_owner')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, 'doctor')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'doctor')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, 'doctor')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, 'groomer')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'groomer')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, 'groomer')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, 'admin')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'admin')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, 'admin')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, 'super_admin')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_PASSWORD_KEY, 'super_admin')),
      SecureStore.deleteItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, 'super_admin')),
    ]);
  },

  hasActiveSession: async () => {
    const session = await authService.getSession();
    return !!session?.user;
  },

  canUseLogin: async (role: BiometricLoginRole) => {
    return biometricService.hasSavedLogin(role);
  },

  enableAfterLogin: async (email: string | undefined, role: BiometricLoginRole) => {
    if (!await biometricService.isAvailable()) return false;
    const session = await authService.getSession();
    if (!session?.user) return false;

    await deleteLegacyPasswords();
    await Promise.all([
      authSecurityService.updateBiometricSetting(session.user.id, true),
      SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true'),
      SecureStore.setItemAsync(BIOMETRIC_LAST_ENABLED_AT_KEY, new Date().toISOString()),
      SecureStore.setItemAsync(keyForRole(BIOMETRIC_ROLE_KEY, role), role),
      SecureStore.setItemAsync(BIOMETRIC_ROLE_KEY, role),
      email ? SecureStore.setItemAsync(keyForRole(BIOMETRIC_EMAIL_KEY, role), email) : Promise.resolve(),
      email ? SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email) : Promise.resolve(),
    ]);

    return true;
  },

  disable: async () => {
    const session = await authService.getSession();
    if (session?.user?.id) await authSecurityService.updateBiometricSetting(session.user.id, false);
    await biometricService.clear();
  },

  authenticate: async (role: BiometricLoginRole) => {
    await deleteLegacyPasswords();
    const preference = await getSavedPreference(role);
    const hasSession = await biometricService.hasActiveSession();

    if (!preference || !hasSession) {
      return { status: 'missing-session' as const, session: null, role: null };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptForRole(role),
      cancelLabel: 'Use password',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });

    if (!result.success) return { status: 'cancelled' as const, session: null, role: null };

    const session = await authService.getSession();
    if (!session?.user) return { status: 'missing-session' as const, session: null, role: null };
    return { status: 'success' as const, session, role };
  },
};

