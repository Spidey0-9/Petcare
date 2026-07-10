import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppScreen } from '../core/components/AppScreen';
import { AuthDialog, useAuthDialog } from '../components/AuthDialog';
import { authService } from '../services/auth';
import { colors } from '../core/theme/colors';
import type { AuthStackParamList } from '../routes/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailVerification'>;

const POLL_INTERVAL_MS   = 4000;
const RESEND_COOLDOWN_SEC = 60;

export function EmailVerificationScreen({ navigation, route }: Props) {
  const { email, role } = route.params;

  const [checking, setChecking]       = useState(false);
  const [resending, setResending]     = useState(false);
  const [countdown, setCountdown]     = useState(RESEND_COOLDOWN_SEC);
  const [dialog, showDialog]          = useAuthDialog();

  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    startPulse();
    startPolling();
    startCountdown();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }

  function startCountdown() {
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const verified = await authService.checkEmailVerified();
        if (verified) {
          if (pollRef.current) clearInterval(pollRef.current);
          handleVerified();
        }
      } catch {
        // silent — keep polling
      }
    }, POLL_INTERVAL_MS);
  }

  function handleVerified() {
    showDialog({
      type: 'success',
      title: 'Email Verified Successfully',
      message: 'Your email has been verified. Setting up your profile…',
      autoDismissMs: 2000,
      onDismiss: () => {
        showDialog(null);
        navigation.replace('CompleteProfile', { role });
      },
    });
  }

  const manualCheck = useCallback(async () => {
    setChecking(true);
    try {
      const verified = await authService.checkEmailVerified();
      if (verified) {
        if (pollRef.current) clearInterval(pollRef.current);
        handleVerified();
      } else {
        showDialog({
          type: 'warning',
          title: 'Not Verified Yet',
          message: 'We could not confirm your email. Please check your inbox and click the verification link.',
          onDismiss: () => showDialog(null),
        });
      }
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'Check Failed',
        message: err?.message ?? 'Unable to check verification status.',
        onDismiss: () => showDialog(null),
      });
    } finally {
      setChecking(false);
    }
  }, []);

  const resendEmail = useCallback(async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await authService.resendVerificationEmail(email);
      setCountdown(RESEND_COOLDOWN_SEC);
      startCountdown();
      showDialog({
        type: 'info',
        title: 'Email Sent',
        message: `Verification email resent to ${email}`,
        autoDismissMs: 2500,
        onDismiss: () => showDialog(null),
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'Could Not Resend',
        message: err?.message ?? 'Unable to resend verification email.',
        onDismiss: () => showDialog(null),
      });
    } finally {
      setResending(false);
    }
  }, [countdown, email]);

  const maskedEmail = email.replace(/(.{2})(.*)(@)/, (_, a, b, at) => a + '*'.repeat(Math.max(b.length - 2, 2)) + b.slice(-2) + at);

  return (
    <AppScreen contentStyle={styles.screen}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        {/* Animated envelope */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <MaterialCommunityIcons name="email-check-outline" size={56} color={colors.primary} />
        </Animated.View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={styles.emailHighlight}>{maskedEmail}</Text>
        </Text>

        <View style={styles.stepList}>
          {[
            'Open the email from PetCare+',
            'Click the "Verify Email" button',
            'Return here — this page updates automatically',
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Auto-polling indicator */}
        <View style={styles.pollingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.pollingText}>Checking verification status automatically…</Text>
        </View>

        {/* Manual check */}
        <Pressable
          style={[styles.primaryBtn, checking && styles.btnDisabled]}
          onPress={manualCheck}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator color="#fff" />
            : <>
                <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>I've Verified My Email</Text>
              </>
          }
        </Pressable>

        {/* Resend */}
        <Pressable
          style={[styles.ghostBtn, (countdown > 0 || resending) && styles.btnDisabled]}
          onPress={resendEmail}
          disabled={countdown > 0 || resending}
        >
          <Text style={styles.ghostBtnText}>
            {resending
              ? 'Sending…'
              : countdown > 0
                ? `Resend Email in ${countdown}s`
                : 'Resend Verification Email'}
          </Text>
        </Pressable>

        <Text style={styles.spamNote}>
          Don't see the email? Check your spam / junk folder.
        </Text>
      </Animated.View>

      <AuthDialog {...dialog} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32 },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title:         { fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle:      { marginTop: 10, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emailHighlight:{ color: colors.primary, fontWeight: '800' },
  stepList:      { width: '100%', gap: 12, marginBottom: 28 },
  step:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  stepNumText:   { fontSize: 12, fontWeight: '900', color: colors.primary },
  stepText:      { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21 },
  pollingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  pollingText:   { fontSize: 12, color: colors.muted, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryBtnText:{ color: '#fff', fontSize: 15, fontWeight: '900' },
  ghostBtn: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary + '55',
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  ghostBtnText:  { color: colors.primary, fontSize: 14, fontWeight: '800' },
  btnDisabled:   { opacity: 0.5 },
  spamNote:      { marginTop: 18, color: colors.muted, fontSize: 12, textAlign: 'center' },
});
