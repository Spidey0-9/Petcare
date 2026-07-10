/**
 * SuperAdminDashboardScreen
 *
 * Placeholder for the super-admin portal. Provides session-aware logout
 * and role display. Expand with full admin controls in a dedicated sprint.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthDialog, useAuthDialog } from '../components/AuthDialog';
import { authService } from '../services/auth';
import { colors } from '../core/theme/colors';
import type { AuthStackParamList } from '../routes/types';
import type { ProfileRecord } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SuperAdminDashboard'>;

const STAT_CARDS = [
  { icon: 'account-group',   label: 'Total Users',    value: '—', color: '#6C63FF', bg: '#F0EEFF' },
  { icon: 'doctor',          label: 'Doctors',        value: '—', color: '#0EA5E9', bg: '#E0F2FE' },
  { icon: 'paw',             label: 'Pet Owners',     value: '—', color: '#FF8F00', bg: '#FFF3E0' },
  { icon: 'calendar-month',  label: 'Appointments',   value: '—', color: '#22C55E', bg: '#DCFCE7' },
];

export function SuperAdminDashboardScreen({ navigation }: Props) {
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [dialog, showDialog]  = useAuthDialog();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    authService.getCurrentProfile().then(setProfile).catch(() => {});
  }, []);

  async function handleLogout() {
    await authService.signOut();
    showDialog({
      type: 'success',
      title: 'Logged Out Successfully',
      message: 'You have been securely signed out.',
      autoDismissMs: 1800,
      onDismiss: () => {
        showDialog(null);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      },
    });
  }

  const displayName = profile?.full_name ?? 'Super Admin';

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="shield-crown" size={28} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerName}>{displayName}</Text>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="shield-check" size={11} color="#fff" />
              <Text style={styles.roleBadgeText}>Super Admin</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Welcome */}
        <View style={styles.welcomeCard}>
          <MaterialCommunityIcons name="shield-crown" size={40} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>Super Admin Portal</Text>
            <Text style={styles.welcomeSub}>Full access to PetCare+ administration.</Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        <View style={styles.statsGrid}>
          {STAT_CARDS.map(card => (
            <View key={card.label} style={[styles.statCard, { backgroundColor: card.bg }]}>
              <MaterialCommunityIcons name={card.icon as any} size={26} color={card.color} />
              <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              <Text style={[styles.statLabel, { color: card.color }]}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick links */}
        <Text style={styles.sectionTitle}>Admin Actions</Text>
        {[
          { icon: 'account-cog',      label: 'Manage Users',         color: colors.primary },
          { icon: 'stethoscope',      label: 'Manage Doctors',       color: '#0EA5E9' },
          { icon: 'hospital-building',label: 'Manage Clinics',       color: '#22C55E' },
          { icon: 'chart-bar',        label: 'Analytics & Reports',  color: '#8B5CF6' },
          { icon: 'cog',              label: 'System Settings',      color: '#FF8F00' },
        ].map(item => (
          <Pressable
            key={item.label}
            style={styles.actionRow}
            android_ripple={{ color: colors.line }}
          >
            <View style={[styles.actionIcon, { backgroundColor: item.color + '15' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.actionLabel}>{item.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>

      <AuthDialog {...dialog} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.primary },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:        { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerName:    { fontSize: 16, fontWeight: '900', color: '#fff' },
  roleBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText:    { fontSize: 13, fontWeight: '800', color: colors.danger },
  body:          { padding: 20, gap: 0 },
  welcomeCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 18, padding: 18, marginBottom: 22, borderWidth: 1, borderColor: colors.line },
  welcomeTitle:  { fontSize: 16, fontWeight: '900', color: colors.text },
  welcomeSub:    { fontSize: 13, color: colors.muted, marginTop: 2 },
  sectionTitle:  { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 12 },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard:      { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  statValue:     { fontSize: 22, fontWeight: '900' },
  statLabel:     { fontSize: 11, fontWeight: '700' },
  actionRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  actionIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel:   { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
});
