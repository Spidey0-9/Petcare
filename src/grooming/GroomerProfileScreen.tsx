import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppScreen } from '../core/components/AppScreen';
import { colors, gradients, radii, shadows } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';
import { groomingService, type GroomingDashboardData } from '../services/grooming';
import { GroomerBottomNavigation } from './GroomerBottomNavigation';
import { useAuth } from '../contexts/AuthContext';

type LoadState = 'loading' | 'ready' | 'error';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

function money(value: number) {
  return `Rs ${value.toFixed(0)}`;
}

export function GroomerProfileScreen() {
  const { signOut } = useAuth();
  const [state, setState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GroomingDashboardData>({ groomer: null, profile: null, clinic: null, bookings: [], services: [] });

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading');
    setError('');
    try {
      const next = await groomingService.getCurrentGroomerDashboard();
      setData(next);
      setState('ready');
    } catch (loadError) {
      console.error('[GroomerProfile] load failed:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load groomer profile.');
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useRealtimeTables(
    'groomer-profile-screen',
    [TABLES.profiles, TABLES.groomers, TABLES.groomingClinics, TABLES.groomingServices, TABLES.groomingBookings],
    () => { void load(true); },
  );

  const summary = useMemo(() => {
    const completed = data.bookings.filter(booking => booking.status === 'completed');
    const active = data.bookings.filter(booking => !['completed', 'cancelled', 'rejected'].includes(booking.status));
    const revenue = completed.reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
    const completionRate = data.bookings.length ? Math.round((completed.length / data.bookings.length) * 100) : 0;
    return { completed: completed.length, active: active.length, revenue, completionRate };
  }, [data.bookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  if (state === 'loading') {
    return <AppScreen contentStyle={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading profile...</Text></AppScreen>;
  }

  if (state === 'error') {
    return (
      <AppScreen contentStyle={styles.center}>
        <MaterialCommunityIcons name="alert-circle" size={40} color={colors.danger} />
        <Text style={styles.title}>Unable to load profile</Text>
        <Text style={styles.muted}>{error}</Text>
      </AppScreen>
    );
  }

  if (!data.groomer) {
    return (
      <AppScreen contentStyle={styles.center}>
        <MaterialCommunityIcons name="account-clock" size={42} color="#EC4899" />
        <Text style={styles.title}>Groomer profile pending</Text>
        <Text style={styles.muted}>Your dedicated groomer profile will appear here after approval.</Text>
      </AppScreen>
    );
  }

  const workingHours = data.clinic?.opening_time && data.clinic.closing_time ? `${data.clinic.opening_time} - ${data.clinic.closing_time}` : 'Hours pending';
  const certificates = data.groomer.specializations ?? [];

  return (
    <AppScreen scroll={false}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <LinearGradient colors={gradients.dark} style={styles.cover}>
          <View style={styles.profilePhoto}><MaterialCommunityIcons name="content-cut" size={34} color="#fff" /></View>
          <View style={styles.coverCopy}>
            <Text style={styles.kicker}>Professional Groomer</Text>
            <Text style={styles.coverTitle}>{data.groomer.full_name}</Text>
            <Text style={styles.coverMeta}>{data.clinic?.name ?? 'Clinic pending'} - {data.groomer.approval_status}</Text>
          </View>
        </LinearGradient>

        <View style={styles.metricRow}>
          <Metric icon="star" label="Rating" value={Number(data.groomer.rating ?? 0).toFixed(1)} color="#F59E0B" />
          <Metric icon="briefcase-outline" label="Experience" value={`${data.groomer.experience_years ?? 0} yrs`} color="#0EA5E9" />
          <Metric icon="cash" label="Revenue" value={money(summary.revenue)} color={colors.primary} />
        </View>

        <Section title="Bio">
          <Text style={styles.paragraph}>{data.groomer.bio ?? 'Professional grooming profile connected to live PetCare+ bookings.'}</Text>
        </Section>

        <Section title="Certificates">
          {certificates.length === 0 ? <Text style={styles.mutedLeft}>No certificates or specializations uploaded.</Text> : (
            <View style={styles.chipRow}>{certificates.map(item => <Text key={item} style={styles.chip}>{item}</Text>)}</View>
          )}
        </Section>

        <Section title="Working Hours">
          <Info icon="clock-outline" label="Hours" value={workingHours} />
          <Info icon="calendar-week" label="Working Days" value={(data.clinic?.working_days ?? []).join(', ') || 'Not configured'} />
          <Info icon="map-marker-outline" label="Clinic" value={data.clinic?.address ?? 'Clinic address pending'} />
        </Section>

        <Section title="Gallery">
          <View style={styles.galleryRow}>
            {(data.clinic?.gallery_images ?? []).slice(0, 6).map((image, index) => <View key={`${image}-${index}`} style={styles.galleryTile}><MaterialCommunityIcons name="image" size={22} color={colors.muted} /></View>)}
            {(data.clinic?.gallery_images ?? []).length === 0 && <Text style={styles.mutedLeft}>Gallery images will appear after upload.</Text>}
          </View>
        </Section>

        <Section title="Reviews">
          <Info icon="message-star-outline" label="Reviews" value={`${data.groomer.review_count ?? 0} reviews`} />
          <Info icon="star-half-full" label="Average" value={`${Number(data.groomer.rating ?? 0).toFixed(1)} / 5.0`} />
        </Section>

        <Section title="Revenue Summary">
          <Info icon="cash-multiple" label="Completed" value={`${summary.completed} bookings`} />
          <Info icon="chart-line" label="Earned" value={money(summary.revenue)} />
        </Section>

        <Section title="Performance">
          <Info icon="calendar-clock" label="Active" value={`${summary.active} active bookings`} />
          <Info icon="check-decagram" label="Completion" value={`${summary.completionRate}%`} />
        </Section>

        <Section title="Availability">
          <Info icon={data.groomer.is_available ? 'check-circle-outline' : 'pause-circle-outline'} label="Status" value={data.groomer.is_available ? 'Available for bookings' : 'Offline'} />
        </Section>

        <Section title="Security">
          <Pressable style={styles.securityBtn} onPress={() => Alert.alert('Security', 'Use Settings to manage password, biometrics, and privacy options.')}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.primaryDark} />
            <Text style={styles.securityText}>Security settings</Text>
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={() => { void signOut(); }}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </Section>
      </ScrollView>
      <GroomerBottomNavigation activeRoute="Profile" />
    </AppScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.card}>{children}</View></View>;
}

function Metric({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Info({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 112 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  muted: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center', lineHeight: 20 },
  mutedLeft: { fontSize: 13, fontWeight: '700', color: colors.muted, lineHeight: 20 },
  cover: { borderRadius: radii.xxl, minHeight: 210, padding: 18, justifyContent: 'flex-end', ...shadows.soft },
  profilePhoto: { width: 76, height: 76, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  coverCopy: { gap: 3 },
  kicker: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  coverTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  coverMeta: { color: 'rgba(255,255,255,0.76)', fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  metricRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  metricCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  metricValue: { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 6 },
  metricLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 2 },
  section: { marginTop: 20, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  card: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  paragraph: { fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.primarySoft, color: colors.primaryDark, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, fontSize: 12, fontWeight: '900' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 10 },
  infoLabel: { width: 92, fontSize: 11, fontWeight: '900', color: colors.muted },
  infoValue: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'capitalize' },
  galleryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryTile: { width: '30.9%', height: 92, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  securityBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, backgroundColor: colors.primarySoft },
  securityText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, backgroundColor: colors.dangerSoft },
  logoutText: { color: colors.danger, fontSize: 13, fontWeight: '900' },
});
