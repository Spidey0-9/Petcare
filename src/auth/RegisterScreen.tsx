import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import type { UserRole } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
type SignupRole = Extract<UserRole, 'pet_owner' | 'doctor'>;

// ── Validation helpers ────────────────────────────────────────────────────────

function validateEmail(v: string) {
  if (!v.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address.';
  return '';
}

function validatePhone(v: string) {
  if (!v) return 'Mobile number is required.';
  if (v.length !== 10) return 'Enter exactly 10 digits.';
  return '';
}

function validatePassword(v: string) {
  if (!v) return 'Password is required.';
  if (v.length < 8) return 'Minimum 8 characters required.';
  if (!/[A-Z]/.test(v)) return 'Must include at least one uppercase letter.';
  if (!/[a-z]/.test(v)) return 'Must include at least one lowercase letter.';
  if (!/[0-9]/.test(v)) return 'Must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Must include at least one special character.';
  return '';
}

function passwordStrength(v: string): { score: number; label: string; color: string } {
  if (!v) return { score: 0, label: '', color: colors.line };
  let score = 0;
  if (v.length >= 8)          score++;
  if (/[A-Z]/.test(v))        score++;
  if (/[a-z]/.test(v))        score++;
  if (/[0-9]/.test(v))        score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;

  if (score <= 2) return { score, label: 'Weak',   color: colors.danger };
  if (score === 3) return { score, label: 'Fair',   color: '#FF8F00' };
  if (score === 4) return { score, label: 'Good',   color: colors.primary };
  return               { score, label: 'Strong', color: colors.success };
}

// ── Inline field error ────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <View style={styles.fieldErrorRow}>
      <MaterialCommunityIcons name="alert-circle" size={13} color={colors.danger} />
      <Text style={styles.fieldErrorText}>{msg}</Text>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegisterScreen({ navigation }: Props) {
  const [role, setRole]                 = useState<SignupRole>('pet_owner');
  const [fullName, setFullName]         = useState('');
  const [phone, setPhone]               = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed]             = useState(false);

  // per-field errors (only shown after first submit attempt or on blur)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [dialog, showDialog] = useAuthDialog();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  // Phone: digits only, max 10
  function handlePhone(v: string) {
    const cleaned = v.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (touched.phone) setErrors(e => ({ ...e, phone: validatePhone(cleaned) }));
  }

  function handleBlur(field: string, value: string) {
    setTouched(t => ({ ...t, [field]: true }));
    let err = '';
    if (field === 'fullName') err = value.trim() ? '' : 'Full name is required.';
    if (field === 'email')    err = validateEmail(value);
    if (field === 'phone')    err = validatePhone(value);
    if (field === 'password') err = validatePassword(value);
    if (field === 'confirm')  err = value !== password ? 'Passwords do not match.' : '';
    setErrors(e => ({ ...e, [field]: err }));
  }

  function validateAll() {
    const errs: Record<string, string> = {
      fullName: fullName.trim() ? '' : 'Full name is required.',
      email:    validateEmail(email),
      phone:    validatePhone(phone),
      password: validatePassword(password),
      confirm:  confirmPassword !== password ? 'Passwords do not match.' : '',
    };
    setErrors(errs);
    setTouched({ fullName: true, email: true, phone: true, password: true, confirm: true });
    return !Object.values(errs).some(Boolean);
  }

  async function handleRegister() {
    if (!validateAll()) return;

    if (!agreed) {
      showDialog({
        type: 'warning',
        title: 'Terms Required',
        message: 'Please accept the Terms & Conditions and Privacy Policy to continue.',
        onDismiss: () => showDialog(null),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await authService.registerWithEmail({
        email:    email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        phone,
        role,
      });

      showDialog({
        type: 'success',
        title: 'Account Created Successfully',
        message: 'Welcome to PetCare+! Verify your phone number to continue.',
        autoDismissMs: 2200,
        onDismiss: () => {
          showDialog(null);
          navigation.replace('PhoneVerification', {
            phone,
            email: email.trim().toLowerCase(),
            role,
          });
        },
      });
    } catch (err: any) {
      const raw: string = err?.message ?? '';
      let title   = 'Registration Failed';
      let message = raw || 'Unable to create your account. Please try again.';

      if (raw.toLowerCase().includes('already registered') || raw.toLowerCase().includes('already been registered')) {
        title   = 'Account Already Exists';
        message = 'An account with this email already exists. Please login or use a different email.';
      } else if (raw.toLowerCase().includes('phone') && raw.toLowerCase().includes('unique')) {
        title   = 'Phone Already Registered';
        message = 'This phone number is already linked to another account.';
      } else if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('fetch')) {
        title   = 'Network Error';
        message = 'Check your internet connection and try again.';
      }

      showDialog({ type: 'error', title, message, onDismiss: () => showDialog(null) });
    } finally {
      setIsSubmitting(false);
    }
  }

  const strength = passwordStrength(password);
  const strengthBars = [1, 2, 3, 4, 5];

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Title */}
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join PetCare+ — your pet's best companion app.</Text>

          {/* Role toggle */}
          <View style={styles.roleSwitch}>
            {([
              { value: 'pet_owner', label: 'Pet Owner', icon: 'paw' },
              { value: 'doctor',    label: 'Doctor',    icon: 'doctor' },
            ] as const).map(r => (
              <Pressable
                key={r.value}
                style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                onPress={() => setRole(r.value)}
              >
                <MaterialCommunityIcons
                  name={r.icon}
                  size={18}
                  color={role === r.value ? '#fff' : colors.primary}
                />
                <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Full name */}
          <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.fullName && touched.fullName ? styles.inputError : null]}
            placeholder="Enter your full name"
            placeholderTextColor={colors.muted}
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => handleBlur('fullName', fullName)}
            autoCapitalize="words"
          />
          {touched.fullName && <FieldError msg={errors.fullName} />}

          {/* Email */}
          <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.email && touched.email ? styles.inputError : null]}
            placeholder="Enter your email"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            onBlur={() => handleBlur('email', email)}
          />
          {touched.email && <FieldError msg={errors.email} />}

          {/* Phone */}
          <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
          <View style={[styles.phoneRow, errors.phone && touched.phone ? styles.inputError : null]}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              value={phone}
              onChangeText={handlePhone}
              onBlur={() => handleBlur('phone', phone)}
              maxLength={10}
            />
            {phone.length === 10 && (
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} style={{ marginRight: 12 }} />
            )}
          </View>
          {touched.phone && <FieldError msg={errors.phone} />}

          {/* Password */}
          <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
          <View style={[styles.passRow, errors.password && touched.password ? styles.inputError : null]}>
            <TextInput
              style={styles.passInput}
              placeholder="Create a strong password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={p => {
                setPassword(p);
                if (touched.password) setErrors(e => ({ ...e, password: validatePassword(p) }));
              }}
              onBlur={() => handleBlur('password', password)}
              autoCapitalize="none"
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(s => !s)}>
              <MaterialCommunityIcons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
            </Pressable>
          </View>

          {/* Strength meter */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {strengthBars.map(n => (
                <View
                  key={n}
                  style={[styles.strengthBar, { backgroundColor: n <= strength.score ? strength.color : colors.line }]}
                />
              ))}
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}
          {touched.password && <FieldError msg={errors.password} />}

          {/* Confirm password */}
          <Text style={styles.label}>Confirm Password <Text style={styles.required}>*</Text></Text>
          <View style={[styles.passRow, errors.confirm && touched.confirm ? styles.inputError : null]}>
            <TextInput
              style={styles.passInput}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={v => {
                setConfirmPassword(v);
                if (touched.confirm) setErrors(e => ({ ...e, confirm: v !== password ? 'Passwords do not match.' : '' }));
              }}
              onBlur={() => handleBlur('confirm', confirmPassword)}
              autoCapitalize="none"
            />
            <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm(s => !s)}>
              <MaterialCommunityIcons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={colors.muted} />
            </Pressable>
            {confirmPassword && confirmPassword === password && (
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} style={{ marginRight: 12 }} />
            )}
          </View>
          {touched.confirm && <FieldError msg={errors.confirm} />}

          {/* Terms */}
          <Pressable style={styles.termsRow} onPress={() => setAgreed(a => !a)}>
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Terms')}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.link} onPress={() => navigation.navigate('Privacy')}>Privacy Policy</Text>
            </Text>
          </Pressable>

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <Text style={styles.submitText}>Creating Account…</Text>
              : <Text style={styles.submitText}>Create Account</Text>
            }
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footer}>Already have an account? <Text style={styles.link}>Login</Text></Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>

      <AuthDialog {...dialog} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title:           { marginTop: 32, fontSize: 28, fontWeight: '900', color: colors.text },
  subtitle:        { marginTop: 6, marginBottom: 22, color: colors.muted, lineHeight: 21 },
  roleSwitch:      { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, marginBottom: 20 },
  roleBtn:         { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  roleBtnActive:   { backgroundColor: colors.primary },
  roleText:        { color: colors.primary, fontSize: 13, fontWeight: '900' },
  roleTextActive:  { color: '#fff' },
  label:           { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 6 },
  required:        { color: colors.danger },
  input: {
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line,
    backgroundColor: colors.surface, paddingHorizontal: 16, fontSize: 14,
    color: colors.text, marginBottom: 4,
  },
  inputError:      { borderColor: colors.danger },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line,
    borderRadius: 14, backgroundColor: colors.surface, marginBottom: 4, overflow: 'hidden',
  },
  countryCode:     { paddingHorizontal: 12, paddingVertical: 14, borderRightWidth: 1, borderRightColor: colors.line, backgroundColor: colors.background },
  countryCodeText: { fontSize: 14, fontWeight: '700', color: colors.text },
  phoneInput:      { flex: 1, height: 54, paddingHorizontal: 12, fontSize: 14, color: colors.text },
  passRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.line,
    borderRadius: 14, backgroundColor: colors.surface, marginBottom: 4,
  },
  passInput:       { flex: 1, height: 54, paddingHorizontal: 16, fontSize: 14, color: colors.text },
  eyeBtn:          { paddingHorizontal: 14, height: 54, alignItems: 'center', justifyContent: 'center' },
  strengthRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4, marginTop: 2 },
  strengthBar:     { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:   { fontSize: 11, fontWeight: '900', width: 44, textAlign: 'right' },
  fieldErrorRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, marginTop: 2 },
  fieldErrorText:  { color: colors.danger, fontSize: 12, fontWeight: '700', flex: 1 },
  termsRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 16 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  termsText:       { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 20 },
  link:            { color: colors.primary, fontWeight: '800' },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.58 },
  submitText:      { color: '#fff', fontSize: 15, fontWeight: '900' },
  footer:          { marginTop: 18, textAlign: 'center', color: colors.muted, paddingBottom: 8 },
});
