import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';
import { authService } from '../services/auth';
import { biometricService } from '../services/biometric';
import { authSecurityService } from '../services/security';
import { paymentService } from '../services/payments';
import { profileService, type ProfileOrder, type ProfilePayment } from '../services/profile';

type SettingItem = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
};

function limitPhoneNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', city: '', emergencyContact: '' });

  useEffect(() => {
    let active = true;
    async function load() {
      const user = await authService.getCurrentUser();
      const profile = await authService.getCurrentProfile();
      if (!active || !user) return;
      setUserId(user.id);
      setForm({
        fullName: profile?.full_name ?? '',
        email: profile?.email ?? user.email ?? '',
        phone: limitPhoneNumber(profile?.phone ?? ''),
        address: String(profile?.address ?? ''),
        city: String(profile?.city ?? ''),
        emergencyContact: limitPhoneNumber(String(profile?.emergency_contact ?? '')),
      });
    }
    load().catch(error => {
      console.error('Unable to load edit profile:', error);
      Alert.alert('Profile unavailable', 'Please try again.');
    });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      await profileService.updateProfile(userId, {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        emergency_contact: form.emergencyContact || null,
      });
      Alert.alert('Profile saved', 'Your profile has been updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('Unable to save profile:', error);
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please check your details and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileShell title="Edit Profile">
      <Field label="Full Name" value={form.fullName} onChangeText={fullName => setForm(prev => ({ ...prev, fullName }))} />
      <Field label="Email" value={form.email} onChangeText={email => setForm(prev => ({ ...prev, email }))} keyboardType="email-address" />
      <Field label="Phone" value={form.phone} onChangeText={phone => setForm(prev => ({ ...prev, phone: limitPhoneNumber(phone) }))} keyboardType="phone-pad" maxLength={10} />
      <Field label="Address" value={form.address} onChangeText={address => setForm(prev => ({ ...prev, address }))} />
      <Field label="City" value={form.city} onChangeText={city => setForm(prev => ({ ...prev, city }))} />
      <Field label="Emergency Contact" value={form.emergencyContact} onChangeText={emergencyContact => setForm(prev => ({ ...prev, emergencyContact: limitPhoneNumber(emergencyContact) }))} keyboardType="phone-pad" maxLength={10} />
      <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={save} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
      </Pressable>
    </ProfileShell>
  );
}

export function PremiumMembershipScreen() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [paying, setPaying] = useState(false);

  const plans = {
    monthly: { title: 'Monthly', price: 199 },
    yearly: { title: 'Yearly', price: 1999 },
  } as const;

  const startMembershipPayment = async () => {
    try {
      setPaying(true);
      const user = await authService.getCurrentUser();
      const profile = await authService.getCurrentProfile();
      if (!user) {
        Alert.alert('Login required', 'Please sign in before upgrading.');
        return;
      }

      const plan = plans[selectedPlan];
      const result = await paymentService.startCheckout({
        amount: plan.price,
        membershipPlan: selectedPlan,
        description: `PetCare+ Premium ${plan.title}`,
        customer: {
          name: profile?.full_name ?? undefined,
          email: user.email ?? undefined,
          contact: profile?.phone ?? undefined,
        },
        metadata: { source: 'membership', plan: selectedPlan },
      });

      if (result.status === 'paid') {
        Alert.alert('Premium activated', 'Your membership payment was successful.');
      } else {
        Alert.alert('Payment pending', 'We will activate Premium after gateway confirmation.');
      }
    } catch (error) {
      console.error('Premium payment failed:', error);
      Alert.alert('Payment failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <ProfileShell title="Premium Membership">
      <View style={styles.planRow}>
        <Pressable style={styles.planPressable} onPress={() => setSelectedPlan('monthly')}>
          <PlanCard title="Monthly" price="INR 199" highlight={selectedPlan === 'monthly'} />
        </Pressable>
        <Pressable style={styles.planPressable} onPress={() => setSelectedPlan('yearly')}>
          <PlanCard title="Yearly" price="INR 1,999" highlight={selectedPlan === 'yearly'} />
        </Pressable>
      </View>
      {['Priority appointments', 'Exclusive shop discounts', 'Digital health reports', 'Emergency support access'].map(item => (
        <InfoRow key={item} icon="check-circle" title={item} subtitle="Included in Premium Care" />
      ))}
      <Pressable style={[styles.primaryButton, paying && styles.disabledButton]} onPress={startMembershipPayment} disabled={paying}>
        <Text style={styles.primaryButtonText}>{paying ? 'Opening gateway...' : 'Continue to Payment'}</Text>
      </Pressable>
    </ProfileShell>
  );
}
export function OrderHistoryScreen() {
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const user = await authService.getCurrentUser();
    if (!user) return;
    setOrders(await profileService.listOrders(user.id));
  }, []);

  useEffect(() => {
    load().catch(error => console.error('Unable to load orders:', error)).finally(() => setLoading(false));
  }, [load]);

  return (
    <ProfileShell title="Order History">
      {loading ? <Text style={styles.mutedText}>Loading orders...</Text> : orders.length === 0 ? <EmptyState title="No orders yet" subtitle="Your pet shop purchases will appear here." /> : orders.map(order => (
        <InfoRow key={order.id} icon="package-variant" title={`Order ${order.id.slice(0, 8)}`} subtitle={`${order.status ?? 'pending'} • ?${Number(order.total ?? 0).toFixed(0)}`} />
      ))}
    </ProfileShell>
  );
}

export function PaymentMethodsScreen() {
  const [payments, setPayments] = useState<ProfilePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await authService.getCurrentUser();
      if (!user) return;
      setPayments(await profileService.listPayments(user.id));
    }
    load().catch(error => console.error('Unable to load payments:', error)).finally(() => setLoading(false));
  }, []);

  return (
    <ProfileShell title="Payment Methods">
      <Pressable style={styles.primaryButton} onPress={() => Alert.alert('Add payment method', 'Add your payment provider SDK before storing cards, UPI or wallet tokens.')}>
        <Text style={styles.primaryButtonText}>Add Payment Method</Text>
      </Pressable>
      {loading ? <Text style={styles.mutedText}>Loading payments...</Text> : payments.length === 0 ? <EmptyState title="No saved payments" subtitle="Secure payment methods will appear here." /> : payments.map(payment => (
        <InfoRow key={payment.id} icon="credit-card-outline" title={payment.method ?? 'Payment'} subtitle={`${payment.status ?? 'pending'} • ?${Number(payment.amount ?? 0).toFixed(0)}`} />
      ))}
    </ProfileShell>
  );
}

export function ProfileSettingsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('pet_owner');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [devices, setDevices] = useState<Array<Record<string, any>>>([]);
  const [history, setHistory] = useState<Array<Record<string, any>>>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadSecurity = useCallback(async () => {
    const user = await authService.getCurrentUser();
    const profile = await authService.getCurrentProfile();
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email ?? '');
    setRole(profile?.role ?? 'pet_owner');
    const [enabled, available, nextDevices, nextHistory] = await Promise.all([
      biometricService.isEnabled(),
      biometricService.isAvailable(),
      authSecurityService.listDevices(user.id),
      authSecurityService.listLoginHistory(user.id),
    ]);
    setBiometricEnabled(enabled);
    setBiometricAvailable(available);
    setDevices(nextDevices as Array<Record<string, any>>);
    setHistory(nextHistory as Array<Record<string, any>>);
  }, []);

  useEffect(() => {
    loadSecurity().catch(error => {
      console.error('Unable to load security settings:', error);
      Alert.alert('Security unavailable', error instanceof Error ? error.message : 'Please try again.');
    }).finally(() => setLoading(false));
  }, [loadSecurity]);

  async function toggleBiometric() {
    if (!userId) return;
    try {
      setSaving(true);
      if (biometricEnabled) {
        await biometricService.disable();
        setBiometricEnabled(false);
        Alert.alert('Biometric disabled', 'Biometric login has been disabled on this device.');
        return;
      }

      if (!biometricAvailable) {
        Alert.alert('Biometric unavailable', 'Set up Face ID, fingerprint, Touch ID, or passcode on this device first.');
        return;
      }

      const enabled = await biometricService.enableAfterLogin(email, role as any);
      setBiometricEnabled(enabled);
      Alert.alert(enabled ? 'Biometric enabled' : 'Biometric not enabled', enabled ? 'You can now unlock PetCare+ with your device biometrics.' : 'A valid session is required before enabling biometric login.');
    } catch (error) {
      console.error('Unable to update biometric setting:', error);
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (password.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Confirm password must match.');
      return;
    }
    try {
      setSaving(true);
      await authService.updatePassword(password);
      await authSecurityService.recordAudit({ actorId: userId, actorRole: role, action: 'auth.password_change', entityType: 'profile', entityId: userId, severity: 'warning' });
      setPassword('');
      setConfirmPassword('');
      Alert.alert('Password changed', 'Your password has been updated.');
    } catch (error) {
      console.error('Unable to change password:', error);
      Alert.alert('Password update failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function logoutOtherDevices() {
    try {
      setSaving(true);
      await authService.signOutOtherDevices();
      await loadSecurity();
      Alert.alert('Other devices logged out', 'All other active sessions were revoked.');
    } catch (error) {
      Alert.alert('Logout failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function logoutAllDevices() {
    Alert.alert('Logout all devices?', 'This will sign this account out everywhere, including this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout All',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await authService.signOutAllDevices();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          })();
        },
      },
    ]);
  }

  return (
    <ProfileShell title="Security Settings">
      {loading ? <Text style={styles.mutedText}>Loading security settings...</Text> : (
        <>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><MaterialCommunityIcons name="fingerprint" size={22} color={colors.primary} /></View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Biometric Login</Text>
              <Text style={styles.infoSubtitle}>{biometricEnabled ? 'Enabled on this device' : biometricAvailable ? 'Available on this device' : 'Not configured on this device'}</Text>
            </View>
            <Pressable style={[styles.smallButton, biometricEnabled && styles.smallButtonDanger, saving && styles.disabledButton]} onPress={toggleBiometric} disabled={saving}>
              <Text style={[styles.smallButtonText, biometricEnabled && styles.smallButtonDangerText]}>{biometricEnabled ? 'Disable' : 'Enable'}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Change Password</Text>
          <Field label="New Password" value={password} onChangeText={setPassword} />
          <Field label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} />
          <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={changePassword} disabled={saving}>
            <Text style={styles.primaryButtonText}>Change Password</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>Active Sessions</Text>
          {devices.length === 0 ? <EmptyState title="No device records" subtitle="Your trusted devices will appear here after the security migration is applied." /> : devices.map(device => (
            <InfoRow key={String(device.id)} icon="cellphone-lock" title={String(device.device_name ?? 'Device')} subtitle={`${device.platform ?? 'unknown'} - Last seen ${String(device.last_seen_at ?? '')}`} />
          ))}
          <Pressable style={[styles.primaryButton, saving && styles.disabledButton]} onPress={logoutOtherDevices} disabled={saving}>
            <Text style={styles.primaryButtonText}>Logout from Other Devices</Text>
          </Pressable>
          <Pressable style={[styles.primaryButton, styles.dangerButton]} onPress={logoutAllDevices}>
            <Text style={styles.primaryButtonText}>Logout All Devices</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>Login History</Text>
          {history.length === 0 ? <Text style={styles.mutedText}>No login history yet.</Text> : history.slice(0, 8).map(item => (
            <InfoRow key={String(item.id)} icon={item.success ? 'login' : 'alert-circle-outline'} title={`${item.login_method ?? 'login'} ${item.success ? 'success' : 'failed'}`} subtitle={String(item.created_at ?? '')} />
          ))}
        </>
      )}
    </ProfileShell>
  );
}
export function HelpSupportScreen() {
  const items: SettingItem[] = [
    { icon: 'frequently-asked-questions', title: 'FAQ', subtitle: 'Common questions and answers' },
    { icon: 'chat-processing-outline', title: 'Live Chat', subtitle: 'Message the support team' },
    { icon: 'whatsapp', title: 'WhatsApp Support', subtitle: 'Continue support on WhatsApp' },
    { icon: 'email-outline', title: 'Email Support', subtitle: 'Send details to support' },
    { icon: 'phone-outline', title: 'Call Support', subtitle: 'Speak with PetCare+ support' },
    { icon: 'ticket-confirmation-outline', title: 'Raise Ticket', subtitle: 'Track a support request' },
    { icon: 'bug-outline', title: 'Report Bug', subtitle: 'Tell us what went wrong' },
  ];

  return (
    <ProfileShell title="Help & Support">
      {items.map(item => <InfoRow key={item.title} icon={item.icon} title={item.title} subtitle={item.subtitle} />)}
    </ProfileShell>
  );
}

function ProfileShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigation = useNavigation<any>();
  return (
    <AppScreen scroll={false}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    </AppScreen>
  );
}

function Field({ label, value, onChangeText, keyboardType = 'default', maxLength }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'email-address' | 'phone-pad'; maxLength?: number }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType} maxLength={maxLength} placeholderTextColor={colors.muted} />
    </View>
  );
}

function PlanCard({ title, price, highlight }: { title: string; price: string; highlight?: boolean }) {
  return (
    <View style={[styles.planCard, highlight && styles.planCardHighlight]}>
      <Text style={[styles.planTitle, highlight && styles.planTextHighlight]}>{title}</Text>
      <Text style={[styles.planPrice, highlight && styles.planTextHighlight]}>{price}</Text>
    </View>
  );
}

function InfoRow({ icon, title, subtitle }: SettingItem) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><MaterialCommunityIcons name={icon} size={22} color={colors.primary} /></View>
      <View style={styles.infoText}>
        <Text style={styles.infoTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.infoSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
    </View>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="archive-outline" size={36} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 96,
    gap: 12,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
  },
  planPressable: {
    flex: 1,
  },
  planCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    gap: 8,
  },
  planCardHighlight: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  planTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },
  planPrice: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  planTextHighlight: {
    color: '#FFFFFF',
  },
  infoRow: {
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    minWidth: 0,
  },
  infoTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 14,
  },
  infoSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 13,
  },
  sectionLabel: {
    marginTop: 10,
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },
  smallButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  smallButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  smallButtonDangerText: {
    color: colors.danger,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  emptyState: {
    minHeight: 180,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    marginTop: 10,
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  emptySubtitle: {
    marginTop: 4,
    color: colors.muted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});



