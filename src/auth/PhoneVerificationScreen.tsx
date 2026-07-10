import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppScreen } from '../core/components/AppScreen';
import { AuthDialog, useAuthDialog } from '../components/AuthDialog';
import { authService } from '../services/auth';
import { colors } from '../core/theme/colors';
import type { AuthStackParamList } from '../routes/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneVerification'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECS = 60;
const MAX_RESEND_ATTEMPTS = 5;

export function PhoneVerificationScreen({ navigation, route }: Props) {
  const { phone, email, role } = route.params;

  // OTP digit refs for focus management
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));

  const [submitting, setSubmitting]       = useState(false);
  const [sending, setSending]             = useState(false);
  const [countdown, setCountdown]         = useState(RESEND_COOLDOWN_SECS);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [otpSent, setOtpSent]             = useState(false);
  const [inlineError, setInlineError]     = useState('');

  const [dialog, showDialog] = useAuthDialog();

  // Animated feedback
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    sendOtp(true);
  }, []);

  // Countdown timer after OTP is sent
  useEffect(() => {
    if (!otpSent) return;
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [otpSent, countdown]);

  function shake() {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 40,  useNativeDriver: true }),
    ]).start();
  }

  async function sendOtp(isInitial = false) {
    if (!isInitial && resendAttempts >= MAX_RESEND_ATTEMPTS) {
      showDialog({
        type: 'error',
        title: 'Too Many Attempts',
        message: `You have reached the maximum of ${MAX_RESEND_ATTEMPTS} resend attempts. Please restart registration.`,
        onDismiss: () => showDialog(null),
      });
      return;
    }
    setSending(true);
    setInlineError('');
    try {
      await authService.sendPhoneOtp(phone);
      setOtpSent(true);
      setCountdown(RESEND_COOLDOWN_SECS);
      if (!isInitial) {
        setResendAttempts(a => a + 1);
        showDialog({
          type: 'info',
          title: 'OTP Sent',
          message: `A new OTP has been sent to +91 ${phone}`,
          autoDismissMs: 2500,
          onDismiss: () => showDialog(null),
        });
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Unable to send OTP. Please try again.';
      setInlineError(msg);
    } finally {
      setSending(false);
    }
  }

  function handleDigitChange(index: number, value: string) {
    // Only accept digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned && value !== '') return; // ignore non-digit but allow backspace

    setInlineError('');

    if (cleaned.length > 1) {
      // Handle paste: spread digits across all boxes
      const pasted = cleaned.slice(0, OTP_LENGTH).split('');
      const next = [...digits];
      pasted.forEach((d, i) => { if (index + i < OTP_LENGTH) next[index + i] = d; });
      setDigits(next);
      const lastFilled = Math.min(index + pasted.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastFilled]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);

    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  const otp = digits.join('');
  const isOtpComplete = otp.length === OTP_LENGTH;

  const verifyOtp = useCallback(async () => {
    if (!isOtpComplete) {
      setInlineError('Please enter all 6 digits of the OTP.');
      shake();
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);
    setInlineError('');
    try {
      await authService.verifyPhoneOtp(phone, otp);
      showDialog({
        type: 'success',
        title: 'Phone Verified Successfully',
        message: `+91 ${phone} has been verified. Continuing to email verification.`,
        autoDismissMs: 2000,
        onDismiss: () => {
          showDialog(null);
          navigation.replace('EmailVerification', { email, role });
        },
      });
    } catch (err: any) {
      const raw: string = err?.message ?? '';
      const isExpired  = raw.toLowerCase().includes('expired') || raw.toLowerCase().includes('otp has expired');
      const isInvalid  = raw.toLowerCase().includes('invalid') || raw.toLowerCase().includes('token');

      if (isExpired) {
        setInlineError('OTP Expired. Please request a new OTP.');
      } else if (isInvalid) {
        setInlineError('Invalid OTP. Please check and try again.');
      } else {
        setInlineError(raw || 'Verification failed. Please try again.');
      }
      shake();
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }, [otp, phone, email, role, isOtpComplete]);

  // Auto-submit when all digits filled
  useEffect(() => {
    if (isOtpComplete && !submitting) {
      verifyOtp();
    }
  }, [isOtpComplete]);

  const canResend = countdown <= 0 && !sending && resendAttempts < MAX_RESEND_ATTEMPTS;
  const maskedPhone = `+91 ${'*'.repeat(6)}${phone.slice(-4)}`;

  return (
    <AppScreen contentStyle={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="cellphone-message" size={48} color={colors.primary} />
          </View>

          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            {otpSent
              ? `Enter the 6-digit OTP sent to ${maskedPhone}`
              : `Sending OTP to ${maskedPhone}…`}
          </Text>

          {/* OTP Boxes */}
          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
            {digits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpBox,
                  digit ? styles.otpBoxFilled : null,
                  inlineError ? styles.otpBoxError : null,
                ]}
                value={digit}
                onChangeText={(val) => handleDigitChange(index, val)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH} // allow paste detection
                textContentType="oneTimeCode" // iOS OTP autofill
                autoComplete={index === 0 ? 'sms-otp' : 'off'} // Android autofill on first box
                selectTextOnFocus
                editable={!submitting}
                caretHidden
              />
            ))}
          </Animated.View>

          {/* Inline error */}
          {!!inlineError && (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle" size={14} color={colors.danger} />
              <Text style={styles.errorText}>{inlineError}</Text>
            </View>
          )}

          {/* Verify button */}
          <Pressable
            style={[styles.verifyBtn, (!isOtpComplete || submitting) && styles.verifyBtnDisabled]}
            onPress={verifyOtp}
            disabled={!isOtpComplete || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.verifyBtnText}>Verify OTP</Text>
            }
          </Pressable>

          {/* Resend row */}
          <View style={styles.resendRow}>
            {countdown > 0 && otpSent ? (
              <Text style={styles.resendTimer}>
                Resend OTP in <Text style={{ color: colors.primary, fontWeight: '900' }}>{countdown}s</Text>
              </Text>
            ) : (
              <Pressable onPress={() => sendOtp(false)} disabled={!canResend || sending}>
                <Text style={[styles.resendLink, (!canResend || sending) && { opacity: 0.45 }]}>
                  {sending ? 'Sending…' : `Resend OTP${resendAttempts > 0 ? ` (${MAX_RESEND_ATTEMPTS - resendAttempts} left)` : ''}`}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Attempt counter */}
          {resendAttempts > 0 && (
            <Text style={styles.attemptNote}>
              Resend attempts: {resendAttempts} / {MAX_RESEND_ATTEMPTS}
            </Text>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      <AuthDialog {...dialog} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingTop: 12 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#F0EEFF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { marginTop: 8, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  otpBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: '#F0EEFF',
  },
  otpBoxError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 16 },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  verifyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  verifyBtnDisabled: { opacity: 0.55 },
  verifyBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  resendRow: { marginTop: 20, alignItems: 'center' },
  resendTimer: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  resendLink: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  attemptNote: { marginTop: 8, color: colors.muted, fontSize: 12, textAlign: 'center' },
});
