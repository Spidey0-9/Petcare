import React, { useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppScreen } from '../core/components/AppScreen';
import { AuthDialog, useAuthDialog } from '../components/AuthDialog';
import { authService } from '../services/auth';
import { biometricService } from '../services/biometric';
import { colors } from '../core/theme/colors';
import type { AuthStackParamList } from '../routes/types';
import type { UserRole } from '../types';

WebBrowser.maybeCompleteAuthSession();

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type LoginMode = Extract<UserRole, 'pet_owner' | 'doctor' | 'groomer'>;
type BiometricRole = Extract<UserRole, 'pet_owner' | 'doctor' | 'groomer' | 'admin' | 'super_admin'>;

// Map role Ã¢â€ â€™ destination screen name
function destForRole(role: UserRole): keyof AuthStackParamList {
  if (role === 'doctor')      return 'DoctorDashboard';
  if (role === 'groomer')     return 'GroomerDashboard';
  if (role === 'super_admin') return 'SuperAdminDashboard';
  if (role === 'admin')       return 'SuperAdminDashboard';
  if (role === 'pet_owner')   return 'MainTabs';
  throw new Error('Unsupported account role.');
}

// Inline field error
function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <View style={styles.errorRow}>
      <MaterialCommunityIcons name="alert-circle" size={13} color={colors.danger} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

// Human-readable Supabase / network error mapping
function mapAuthError(raw: string): { title: string; message: string } {
  const msg = raw.toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid email or password') || msg.includes('wrong') || msg.includes('credentials'))
    return { title: 'Incorrect Password', message: 'The email or password you entered is incorrect.' };
  if (msg.includes('email not confirmed') || msg.includes('not confirmed'))
    return { title: 'Email Not Verified', message: 'Please verify your email before logging in.' };
  if (msg.includes('user not found') || msg.includes('no user'))
    return { title: 'Account Not Found', message: 'No account found with this email. Please sign up.' };
  if (msg.includes('too many') || msg.includes('rate limit') || msg.includes('429'))
    return { title: 'Too Many Attempts', message: 'Too many login attempts. Please wait a few minutes and try again.' };
  if (msg.includes('disabled') || msg.includes('banned'))
    return { title: 'Account Disabled', message: 'This account has been disabled. Contact support.' };
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout'))
    return { title: 'Network Error', message: 'Check your internet connection and try again.' };
  if (msg.includes('session') && msg.includes('expired'))
    return { title: 'Session Expired', message: 'Your session has expired. Please log in again.' };
  return { title: 'Login Failed', message: raw || 'Unable to log in. Please try again.' };
}

export function LoginScreen({ navigation }: Props) {
  const [loginMode, setLoginMode]               = useState<LoginMode>('pet_owner');
  const [email, setEmail]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [emailError, setEmailError]             = useState('');
  const [passwordError, setPasswordError]       = useState('');
  const [canShowBiometric, setCanShowBiometric] = useState(false);
  const [hasBiometricSession, setHasBiometricSession] = useState(false);

  const [dialog, showDialog] = useAuthDialog();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      async function checkBiometric() {
        const [avail, hasSession] = await Promise.all([
          biometricService.isAvailable(),
          biometricService.hasSavedLogin(loginMode),
        ]);
        if (active) { setCanShowBiometric(avail); setHasBiometricSession(hasSession); }
      }
      checkBiometric();
      return () => { active = false; };
    }, [loginMode]),
  );

  function validateFields(): boolean {
    let ok = true;
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setEmailError('Email is required.'); ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError('Enter a valid email address.'); ok = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError('Password is required.'); ok = false;
    } else {
      setPasswordError('');
    }
    return ok;
  }

  function navigateToRole(role: UserRole) {
    navigation.reset({ index: 0, routes: [{ name: destForRole(role) }] });
  }

  async function promptEnableBiometric(emailAddress: string, role: BiometricRole) {
    const [available, alreadyEnabled] = await Promise.all([
      biometricService.isAvailable(),
      biometricService.hasSavedLogin(role),
    ]);
    if (!available || alreadyEnabled) return;

    Alert.alert(
      'Enable Biometric Login?',
      'Use your device fingerprint, Face ID, Touch ID, or passcode to unlock PetCare+ on this device. Your password will never be stored.',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: () => { void biometricService.enableAfterLogin(emailAddress, role); },
        },
      ],
    );
  }

  async function validatePortalRole(accountRole: UserRole): Promise<boolean> {
    if (loginMode === 'doctor' && accountRole !== 'doctor') {
      await authService.signOut();
      showDialog({
        type: 'error',
        title: 'Wrong Login Portal',
        message: 'This account is not registered as a doctor. Please use the Pet Owner login.',
        onDismiss: () => showDialog(null),
      });
      return false;
    }
    if (loginMode === 'groomer' && accountRole !== 'groomer') {
      await authService.signOut();
      showDialog({
        type: 'error',
        title: 'Wrong Login Portal',
        message: 'This account is not registered as a groomer. Please use the correct login portal.',
        onDismiss: () => showDialog(null),
      });
      return false;
    }
    if (loginMode === 'pet_owner' && (accountRole === 'doctor' || accountRole === 'groomer')) {
      await authService.signOut();
      showDialog({
        type: 'error',
        title: 'Wrong Login Portal',
        message: accountRole === 'doctor' ? 'This is a doctor account. Please switch to Doctor Login.' : 'This is a groomer account. Please switch to Groomer Login.',
        onDismiss: () => showDialog(null),
      });
      return false;
    }
    return true;
  }
  async function handleLogin() {
    if (!validateFields()) return;
    setIsSubmitting(true);
    try {
      await authService.signInWithEmail(email.trim().toLowerCase(), password);
      const profile = await authService.getCurrentProfile();
      if (!profile?.role) {
        console.warn('[LoginScreen] Profile role missing after login; aborting navigation.');
        showDialog({
          type: 'error',
          title: 'Profile Error',
          message: 'Unable to load your account profile.\nPlease try again.',
          onDismiss: () => showDialog(null),
        });
        return;
      }
      const accountRole = profile.role;

      // Role-mismatch guard
      if (loginMode === 'doctor' && accountRole !== 'doctor') {
        await authService.signOut();
        showDialog({
          type: 'error',
          title: 'Wrong Login Portal',
          message: 'This account is not registered as a doctor. Please use the Pet Owner login.',
          onDismiss: () => showDialog(null),
        });
        return;
      }
      if (loginMode === 'groomer' && accountRole !== 'groomer') {
        await authService.signOut();
        showDialog({
          type: 'error',
          title: 'Wrong Login Portal',
          message: 'This account is not registered as a groomer. Please use the correct login portal.',
          onDismiss: () => showDialog(null),
        });
        return;
      }
      if (loginMode === 'pet_owner' && (accountRole === 'doctor' || accountRole === 'groomer')) {
        await authService.signOut();
        showDialog({
          type: 'error',
          title: 'Wrong Login Portal',
          message: accountRole === 'doctor' ? 'This is a doctor account. Please switch to Doctor Login.' : 'This is a groomer account. Please switch to Groomer Login.',
          onDismiss: () => showDialog(null),
        });
        return;
      }

      const bRole = accountRole === 'doctor' ? 'doctor' : accountRole === 'groomer' ? 'groomer' : accountRole === 'admin' || accountRole === 'super_admin' ? accountRole : 'pet_owner';
      await promptEnableBiometric(email.trim().toLowerCase(), bRole);

      const displayName = profile?.full_name?.split(' ')[0] || 'there';
      showDialog({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${displayName}!`,
        autoDismissMs: 1800,
        onDismiss: () => {
          showDialog(null);
          navigateToRole(accountRole);
        },
      });
    } catch (err: any) {
      const { title, message } = mapAuthError(err?.message ?? '');
      showDialog({ type: 'error', title, message, onDismiss: () => showDialog(null) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setIsSubmitting(true);
    try {
      const redirectTo = Linking.createURL('auth/callback');
      const oauth = await authService.signInWithGoogle(redirectTo);
      if (!oauth.url) {
        throw new Error('Google login could not be started. Please try again.');
      }

      const result = await WebBrowser.openAuthSessionAsync(oauth.url, redirectTo);
      if (result.type !== 'success') return;

      await authService.setSessionFromOAuthUrl(result.url);
      const profile = await authService.getCurrentProfile();
      if (!profile?.role) {
        console.warn('[LoginScreen] Profile role missing after Google login; aborting navigation.');
        showDialog({
          type: 'error',
          title: 'Profile Error',
          message: 'Unable to load your account profile.\nPlease try again.',
          onDismiss: () => showDialog(null),
        });
        return;
      }

      const accountRole = profile.role;
      const allowed = await validatePortalRole(accountRole);
      if (!allowed) return;

      const displayName = profile.full_name?.split(' ')[0] || 'there';
      showDialog({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${displayName}!`,
        autoDismissMs: 1600,
        onDismiss: () => {
          showDialog(null);
          navigateToRole(accountRole);
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to complete Google login.';
      const mapped = mapAuthError(message);
      showDialog({ type: 'error', title: mapped.title, message: mapped.message, onDismiss: () => showDialog(null) });
    } finally {
      setIsSubmitting(false);
    }
  }
  async function handleBiometricLogin() {
    setIsSubmitting(true);
    try {
      const result = await biometricService.authenticate(loginMode);
      if (result.status === 'cancelled') return;
      if (result.status === 'missing-session') {
        setHasBiometricSession(false);
        showDialog({
          type: 'info',
          title: 'Login Required',
          message: 'Please login with email and password once, then enable biometric login when prompted.',
          onDismiss: () => showDialog(null),
        });
        return;
      }
      const profile = await authService.getCurrentProfile();
      if (!profile?.role) {
        console.warn('[LoginScreen] Profile role missing after biometric login; aborting navigation.');
        showDialog({
          type: 'error',
          title: 'Profile Error',
          message: 'Unable to load your account profile.\nPlease try again.',
          onDismiss: () => showDialog(null),
        });
        return;
      }
      const role    = profile.role;

      if (loginMode === 'doctor' && role !== 'doctor') {
        await authService.signOut();
        showDialog({
          type: 'error',
          title: 'Wrong Login Portal',
          message: 'This account is not registered as a doctor. Please use the Pet Owner login.',
          onDismiss: () => showDialog(null),
        });
        return;
      }
      if (loginMode === 'groomer' && role !== 'groomer') {
        await authService.signOut();
        showDialog({
          type: 'error',
          title: 'Wrong Login Portal',
          message: 'This account is not registered as a groomer. Please use the correct login portal.',
          onDismiss: () => showDialog(null),
        });
        return;
      }
      if (loginMode === 'pet_owner' && (role === 'doctor' || role === 'groomer')) {
        await authService.signOut();
        showDialog({
          type: 'error',
          title: 'Wrong Login Portal',
          message: role === 'doctor' ? 'This is a doctor account. Please switch to Doctor Login.' : 'This is a groomer account. Please switch to Groomer Login.',
          onDismiss: () => showDialog(null),
        });
        return;
      }

      const name    = profile?.full_name?.split(' ')[0] || 'there';
      showDialog({
        type: 'success',
        title: 'Login Successful',
        message: `Welcome back, ${name}!`,
        autoDismissMs: 1600,
        onDismiss: () => {
          showDialog(null);
          navigateToRole(role as UserRole);
        },
      });
    } catch (err: any) {
      setHasBiometricSession(false);
      await biometricService.clear();
      showDialog({
        type: 'error',
        title: 'Biometric Login Failed',
        message: err?.message ?? 'Use your email and password to login.',
        onDismiss: () => showDialog(null),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const modeCopy = loginMode === 'doctor'
    ? { title: 'Doctor Login', subtitle: 'Access your appointments & patient care', icon: 'doctor' as const }
    : loginMode === 'groomer'
      ? { title: 'Groomer Login', subtitle: 'Manage grooming bookings and services', icon: 'content-cut' as const }
      : { title: 'Welcome Back!', subtitle: 'Login to manage your pet\'s health', icon: 'paw' as const };

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Icon + heading */}
          <View style={styles.mark}>
            <MaterialCommunityIcons name={modeCopy.icon} size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>{modeCopy.title}</Text>
          <Text style={styles.subtitle}>{modeCopy.subtitle}</Text>

          {/* Mode switch */}
          <View style={styles.modeSwitch}>
            {([
              { value: 'pet_owner', label: 'Pet Owner', icon: 'paw' },
              { value: 'doctor',    label: 'Doctor',    icon: 'doctor' },
              { value: 'groomer',   label: 'Groomer',   icon: 'content-cut' },
            ] as const).map(m => (
              <Pressable
                key={m.value}
                style={[styles.modeBtn, loginMode === m.value && styles.modeBtnActive]}
                onPress={() => setLoginMode(m.value)}
              >
                <MaterialCommunityIcons name={m.icon} size={17} color={loginMode === m.value ? '#fff' : colors.primary} />
                <Text style={[styles.modeText, loginMode === m.value && styles.modeTextActive]}>{m.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder={loginMode === 'doctor' ? 'Enter doctor email' : loginMode === 'groomer' ? 'Enter groomer email' : 'Enter your email'}
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={v => { setEmail(v); if (emailError) setEmailError(''); }}
            editable={!isSubmitting}
          />
          <FieldError msg={emailError} />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.passRow, passwordError ? styles.inputError : null]}>
            <TextInput
              style={styles.passInput}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={v => { setPassword(v); if (passwordError) setPasswordError(''); }}
              editable={!isSubmitting}
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(s => !s)}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
            </Pressable>
          </View>
          <FieldError msg={passwordError} />

          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgot}>Forgot Password?</Text>
          </Pressable>

          {/* Login button */}
          <Pressable
            style={[styles.loginBtn, isSubmitting && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            <Text style={styles.loginBtnText}>
              {isSubmitting ? 'Logging in...' : loginMode === 'doctor' ? 'Doctor Login' : loginMode === 'groomer' ? 'Groomer Login' : 'Login'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.googleBtn, isSubmitting && { opacity: 0.5 }]}
            onPress={handleGoogleLogin}
            disabled={isSubmitting}
          >
            <MaterialCommunityIcons name="google" size={20} color={colors.text} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>
          {/* Biometric */}
          {canShowBiometric && (
            <Pressable
              style={[styles.biometricBtn, isSubmitting && { opacity: 0.5 }]}
              onPress={handleBiometricLogin}
              disabled={isSubmitting}
            >
              <MaterialCommunityIcons name="fingerprint" size={22} color={colors.primary} />
              <Text style={styles.biometricText}>                {hasBiometricSession
                  ? `Login with ${loginMode === 'doctor' ? 'doctor' : loginMode === 'groomer' ? 'groomer' : 'pet owner'} biometrics`
                  : `Login once to enable ${loginMode === 'doctor' ? 'doctor' : loginMode === 'groomer' ? 'groomer' : 'pet owner'} biometrics`}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footer}>Don't have an account? <Text style={styles.link}>Sign up</Text></Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>

      <AuthDialog {...dialog} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  mark:            { width: 76, height: 76, borderRadius: 24, backgroundColor: '#F0EEFF', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  title:           { marginTop: 20, textAlign: 'center', color: colors.primary, fontSize: 28, fontWeight: '900' },
  subtitle:        { marginTop: 6, marginBottom: 22, textAlign: 'center', color: colors.muted, fontWeight: '700' },
  modeSwitch:      { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: 22 },
  modeBtn:         { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  modeBtnActive:   { backgroundColor: colors.primary },
  modeText:        { color: colors.primary, fontSize: 13, fontWeight: '900' },
  modeTextActive:  { color: '#fff' },
  label:           { color: colors.text, fontWeight: '800', marginBottom: 8, fontSize: 13 },
  input:           { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, fontSize: 14, color: colors.text, marginBottom: 4 },
  inputError:      { borderColor: colors.danger },
  passRow:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, marginBottom: 4 },
  passInput:       { flex: 1, height: 54, paddingHorizontal: 16, fontSize: 14, color: colors.text },
  eyeBtn:          { paddingHorizontal: 14, height: 54, alignItems: 'center', justifyContent: 'center' },
  errorRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  errorText:       { color: colors.danger, fontSize: 12, fontWeight: '700' },
  forgot:          { color: colors.primary, textAlign: 'right', fontWeight: '800', marginBottom: 18 },
  loginBtn:        { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  loginBtnDisabled:{ opacity: 0.58 },
  loginBtnText:    { color: '#fff', fontSize: 15, fontWeight: '900' },
  googleBtn:       { marginTop: 12, height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  googleText:      { color: colors.text, fontWeight: '900', fontSize: 14 },
  biometricBtn:    { marginTop: 14, height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary + '55', backgroundColor: colors.primary + '10', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  biometricText:   { color: colors.primary, fontWeight: '900', fontSize: 14 },
  footer:          { marginTop: 18, textAlign: 'center', color: colors.muted },
  link:            { color: colors.primary, fontWeight: '800' },
});
