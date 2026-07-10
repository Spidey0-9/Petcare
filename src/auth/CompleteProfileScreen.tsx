import React, { useEffect, useRef, useState } from 'react';
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

type Props = NativeStackScreenProps<AuthStackParamList, 'CompleteProfile'>;
type ProfileRole = Extract<UserRole, 'pet_owner' | 'doctor'>;

// ── Small helpers ─────────────────────────────────────────────────────────────

function routeForRole(role: UserRole | null | undefined): keyof AuthStackParamList {
  if (role === 'doctor')      return 'Tutorial';
  if (role === 'super_admin') return 'Tutorial';
  return 'Tutorial'; // all roles go through Tutorial first
}

function SectionTitle({ icon, label, color = colors.primary }: { icon: string; label: string; color?: string }) {
  return (
    <View style={sec.row}>
      <View style={[sec.iconWrap, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      </View>
      <Text style={[sec.label, { color }]}>{label}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12 },
  iconWrap:{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label:   { fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
});

function Field({
  label, value, onChange, placeholder, keyboardType, required, error, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; required?: boolean;
  error?: string; multiline?: boolean;
}) {
  return (
    <View style={fld.wrap}>
      <Text style={fld.label}>
        {label}{required && <Text style={{ color: colors.danger }}> *</Text>}
      </Text>
      <TextInput
        style={[fld.input, error ? fld.inputErr : null, multiline ? fld.multiline : null]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {!!error && (
        <View style={fld.errRow}>
          <MaterialCommunityIcons name="alert-circle" size={13} color={colors.danger} />
          <Text style={fld.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}
const fld = StyleSheet.create({
  wrap:     { marginBottom: 4 },
  label:    { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 6 },
  input:    { height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 16, fontSize: 14, color: colors.text },
  inputErr: { borderColor: colors.danger },
  multiline:{ height: 80, paddingTop: 12 },
  errRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: 8 },
  errText:  { color: colors.danger, fontSize: 12, fontWeight: '700' },
});

// ── Component ─────────────────────────────────────────────────────────────────

export function CompleteProfileScreen({ navigation, route }: Props) {
  const routeRole = route.params?.role;
  const initialRole: ProfileRole | null = routeRole === 'doctor' || routeRole === 'pet_owner' ? routeRole : null;
  const [role, setRole] = useState<ProfileRole | null>(initialRole);

  // Common fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone]             = useState('');

  // Pet owner fields
  const [address,   setAddress]   = useState('');
  const [city,      setCity]      = useState('');
  const [state,     setState]     = useState('');
  const [pincode,   setPincode]   = useState('');
  const [emergency, setEmergency] = useState('');

  // Doctor fields
  const [hospitalName,    setHospitalName]    = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [qualification,   setQualification]   = useState('');
  const [specialization,  setSpecialization]  = useState('');
  const [licenseNumber,   setLicenseNumber]   = useState('');
  const [experience,      setExperience]      = useState('');
  const [registrationNo,  setRegistrationNo]  = useState('');

  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dialog, showDialog] = useAuthDialog();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadProfile();
  }, []);

  async function loadProfile() {
    const profile = await authService.getCurrentProfile();
    if (!profile?.role) {
      console.warn('[CompleteProfileScreen] Profile role missing while loading profile.');
      showDialog({
        type: 'error',
        title: 'Profile Error',
        message: 'Unable to load your account profile.\nPlease try again.',
        onDismiss: () => showDialog(null),
      });
      return;
    }
    if (profile.role === 'doctor' || profile.role === 'pet_owner') {
      setRole(profile.role);
    } else {
      console.warn('[CompleteProfileScreen] Unsupported profile completion role:', profile.role);
    }
    setDisplayName(profile.full_name ?? '');
    setPhone((profile.phone ?? '').replace(/\D/g, '').slice(0, 10));
  }

  function handlePhone(v: string) {
    setPhone(v.replace(/\D/g, '').slice(0, 10));
  }

  function validateAll(): boolean {
    const errs: Record<string, string> = {};

    if (!role) errs.role = 'Unable to load your account profile. Please try again.';
    if (!displayName.trim()) errs.displayName = 'Display name is required.';

    if (role === 'pet_owner') {
      if (!address.trim())   errs.address   = 'Address is required.';
      if (!city.trim())      errs.city      = 'City is required.';
      if (!state.trim())     errs.state     = 'State is required.';
      if (!pincode.trim())   errs.pincode   = 'Pincode is required.';
      else if (!/^\d{6}$/.test(pincode.trim())) errs.pincode = 'Pincode must be exactly 6 digits.';
      if (!emergency.trim()) errs.emergency = 'Emergency contact is required.';
      else if (emergency.replace(/\D/g, '').length < 10) errs.emergency = 'Enter a valid 10-digit emergency contact.';
    }

    if (role === 'doctor') {
      if (!hospitalName.trim())    errs.hospitalName    = 'Hospital name is required.';
      if (!hospitalAddress.trim()) errs.hospitalAddress = 'Hospital address is required.';
      if (!qualification.trim())   errs.qualification   = 'Qualification is required.';
      if (!specialization.trim())  errs.specialization  = 'Specialization is required.';
      if (!registrationNo.trim())  errs.registrationNo  = 'Medical registration number is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validateAll()) return;
    if (!role) {
      showDialog({
        type: 'error',
        title: 'Profile Error',
        message: 'Unable to load your account profile.\nPlease try again.',
        onDismiss: () => showDialog(null),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const profilePayload: any = {
        full_name: displayName.trim(),
        phone:     phone || null,
        role,
      };

      // Pet owner address fields stored in profile metadata via upsert
      if (role === 'pet_owner') {
        profilePayload.address  = address.trim();
        profilePayload.city     = city.trim();
        profilePayload.state    = state.trim();
        profilePayload.pincode  = pincode.trim();
        profilePayload.emergency_contact = emergency.trim();
      }

      const profile = await authService.updateCurrentProfile(profilePayload);

      if (role === 'doctor') {
        await authService.upsertDoctorProfile(profile.id, {
          clinic_name:    hospitalName.trim(),
          clinic_address: hospitalAddress.trim(),
          qualification:  qualification.trim(),
          specialization: specialization.trim(),
          license_number: licenseNumber.trim() || registrationNo.trim(),
          experience_years: experience ? Number(experience) : 0,
          is_available: true,
          availability: {},
        });
      }

      showDialog({
        type: 'success',
        title: 'Profile Saved Successfully',
        message: 'Your profile has been set up. Let\'s show you around PetCare+!',
        autoDismissMs: 2000,
        onDismiss: () => {
          showDialog(null);
          navigation.reset({
            index: 0,
            routes: [{ name: routeForRole(profile.role), params: { role: profile.role } }],
          });
        },
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'Profile Setup Failed',
        message: err?.message ?? 'Unable to save your profile. Please try again.',
        onDismiss: () => showDialog(null),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>Complete Profile</Text>
          <Text style={styles.subtitle}>
            {role === 'doctor'
              ? 'Set up your doctor profile to start accepting appointments.'
              : role === 'pet_owner'
                ? 'Add your details to personalise your PetCare+ experience.'
                : 'Loading your account profile.'}
          </Text>

          {/* Progress indicator */}
          <View style={styles.progressRow}>
            {['Account', 'Phone', 'Email', 'Profile', 'Tutorial'].map((step, i) => (
              <View key={step} style={styles.progressStep}>
                <View style={[styles.progressDot, i <= 3 ? styles.progressDotDone : styles.progressDotActive]}>
                  {i < 3
                    ? <MaterialCommunityIcons name="check" size={12} color="#fff" />
                    : <Text style={styles.progressDotText}>{i + 1}</Text>
                  }
                </View>
                <Text style={[styles.progressLabel, i === 3 && { color: colors.primary, fontWeight: '900' }]}>{step}</Text>
              </View>
            ))}
          </View>

          {/* ── Common ── */}
          <SectionTitle icon="account" label="Basic Information" />
          {errors.role ? <Text style={styles.formError}>{errors.role}</Text> : null}
          <Field label="Display Name" value={displayName} onChange={setDisplayName} required error={errors.displayName} placeholder="Your full name" />
          <Field label="Phone Number" value={phone} onChange={handlePhone} placeholder="10-digit number" keyboardType="number-pad" error={errors.phone} />

          {/* ── Pet owner ── */}
          {role === 'pet_owner' && (
            <>
              <SectionTitle icon="home-map-marker" label="Address Details" color="#0EA5E9" />
              <Field label="Address" value={address} onChange={setAddress} required error={errors.address} placeholder="Street address, apartment" />
              <Field label="City" value={city} onChange={setCity} required error={errors.city} placeholder="e.g. Mumbai" />
              <Field label="State" value={state} onChange={setState} required error={errors.state} placeholder="e.g. Maharashtra" />
              <Field label="Pincode" value={pincode} onChange={v => setPincode(v.replace(/\D/g, '').slice(0, 6))} required error={errors.pincode} keyboardType="number-pad" placeholder="6-digit pincode" />
              <SectionTitle icon="phone-alert" label="Emergency Contact" color={colors.danger} />
              <Field label="Emergency Contact Number" value={emergency} onChange={v => setEmergency(v.replace(/\D/g, '').slice(0, 10))} required error={errors.emergency} keyboardType="number-pad" placeholder="10-digit number" />
            </>
          )}

          {/* ── Doctor ── */}
          {role === 'doctor' && (
            <>
              <SectionTitle icon="hospital-building" label="Practice Details" color="#0EA5E9" />
              <Field label="Hospital / Clinic Name" value={hospitalName} onChange={setHospitalName} required error={errors.hospitalName} placeholder="e.g. PawCare Veterinary Hospital" />
              <Field label="Hospital / Clinic Address" value={hospitalAddress} onChange={setHospitalAddress} required error={errors.hospitalAddress} placeholder="Full address" />

              <SectionTitle icon="school" label="Credentials" color="#8B5CF6" />
              <Field label="Qualification" value={qualification} onChange={setQualification} required error={errors.qualification} placeholder="e.g. BVSc, MVSc" />
              <Field label="Specialization" value={specialization} onChange={setSpecialization} required error={errors.specialization} placeholder="e.g. Small Animal Surgery" />
              <Field label="Medical Registration Number" value={registrationNo} onChange={setRegistrationNo} required error={errors.registrationNo} placeholder="Registration / license number" />
              <Field label="License Number (optional)" value={licenseNumber} onChange={setLicenseNumber} placeholder="Veterinary council license" />
              <Field label="Experience (years)" value={experience} onChange={v => setExperience(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="e.g. 5" />
            </>
          )}

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? 'Saving Profile…' : 'Save & Continue'}
            </Text>
            {!isSubmitting && <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />}
          </Pressable>

          <View style={{ height: 32 }} />
        </Animated.View>
      </KeyboardAvoidingView>

      <AuthDialog {...dialog} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title:            { marginTop: 32, fontSize: 26, fontWeight: '900', color: colors.text },
  subtitle:         { marginTop: 6, marginBottom: 20, color: colors.muted, lineHeight: 21 },
  progressRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  progressStep:     { alignItems: 'center', gap: 4, flex: 1 },
  progressDot:      { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressDotDone:  { backgroundColor: colors.success },
  progressDotActive:{ backgroundColor: colors.primary },
  progressDotText:  { fontSize: 11, fontWeight: '900', color: '#fff' },
  progressLabel:    { fontSize: 9, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, marginTop: 24,
    shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.58 },
  formError:         { color: colors.danger, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  submitText:        { color: '#fff', fontSize: 15, fontWeight: '900' },
});
