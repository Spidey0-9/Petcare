import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppScreen } from '../core/components/AppScreen';
import { colors, gradients, radii, shadows } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';
import { groomingService, type GroomingDashboardData } from '../services/grooming';
import { GroomerBottomNavigation } from './GroomerBottomNavigation';
import type { GroomingBookingRecord, GroomingServiceRecord } from '../types';

type RouteLike = { name: string };
type LoadState = 'loading' | 'ready' | 'error';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type ModuleMeta = {
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
};

const MODULE_META: Record<string, ModuleMeta> = {
  Bookings: { title: 'Bookings', subtitle: 'Live grooming requests and active appointments.', icon: 'calendar-check-outline', color: '#EC4899' },
  Calendar: { title: 'Calendar', subtitle: 'Upcoming work grouped from real booking dates.', icon: 'calendar-month-outline', color: '#8B5CF6' },
  Customers: { title: 'Customers', subtitle: 'Pet owners connected through grooming bookings.', icon: 'account-heart-outline', color: '#0EA5E9' },
  Services: { title: 'Services', subtitle: 'Active services assigned to your clinic.', icon: 'content-cut', color: colors.primary },
  Packages: { title: 'Packages', subtitle: 'Service bundles can be reviewed from active service data.', icon: 'package-variant-closed', color: '#F97316' },
  Gallery: { title: 'Gallery', subtitle: 'Clinic gallery images from the live grooming profile.', icon: 'image-multiple-outline', color: '#14B8A6' },
  Inventory: { title: 'Inventory', subtitle: 'Shop and grooming product readiness overview.', icon: 'clipboard-list-outline', color: '#64748B' },
  Revenue: { title: 'Revenue', subtitle: 'Completed bookings and payment status summary.', icon: 'cash-multiple', color: '#22C55E' },
  Analytics: { title: 'Analytics', subtitle: 'Performance calculated from bookings and services.', icon: 'chart-line', color: '#6366F1' },
  Notifications: { title: 'Notifications', subtitle: 'Realtime booking events appear in the portal.', icon: 'bell-outline', color: '#F59E0B' },
  About: { title: 'About', subtitle: 'PetCare+ grooming portal information.', icon: 'information-outline', color: '#64748B' },
};

function money(value: number) {
  return `Rs ${value.toFixed(0)}`;
}

function formatBooking(booking: GroomingBookingRecord) {
  const date = new Date(`${booking.service_date}T00:00:00`);
  const dateText = Number.isNaN(date.getTime()) ? booking.service_date : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', weekday: 'short' }).format(date);
  return `${dateText} - ${booking.service_time}`;
}

export function GroomerModuleScreen({ route }: { route: RouteLike }) {
  const meta = MODULE_META[route.name] ?? MODULE_META.About;
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
      console.error(`[Groomer${route.name}] load failed:`, loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this groomer module.');
      setState('error');
    }
  }, [route.name]);

  useEffect(() => { void load(); }, [load]);

  useRealtimeTables(
    `groomer-${route.name.toLowerCase()}`,
    [TABLES.groomers, TABLES.groomingClinics, TABLES.groomingServices, TABLES.groomingBookings, TABLES.notifications],
    () => { void load(true); },
  );

  const stats = useMemo(() => {
    const completed = data.bookings.filter(booking => booking.status === 'completed');
    const active = data.bookings.filter(booking => !['completed', 'cancelled', 'rejected'].includes(booking.status));
    const revenue = completed.reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
    const customers = new Set(data.bookings.map(booking => booking.owner_id)).size;
    return { completed: completed.length, active: active.length, revenue, customers };
  }, [data.bookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  if (state === 'loading') {
    return <AppScreen contentStyle={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>Loading {meta.title.toLowerCase()}...</Text></AppScreen>;
  }

  if (state === 'error') {
    return (
      <AppScreen contentStyle={styles.center}>
        <MaterialCommunityIcons name="alert-circle" size={40} color={colors.danger} />
        <Text style={styles.title}>Unable to load {meta.title}</Text>
        <Text style={styles.muted}>{error}</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <LinearGradient colors={gradients.glass} style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: `${meta.color}18` }]}>
            <MaterialCommunityIcons name={meta.icon} size={26} color={meta.color} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{meta.title}</Text>
            <Text style={styles.heroSubtitle}>{meta.subtitle}</Text>
          </View>
        </LinearGradient>

        <View style={styles.statGrid}>
          <Stat label="Active" value={String(stats.active)} icon="calendar-clock" color="#EC4899" />
          <Stat label="Completed" value={String(stats.completed)} icon="check-decagram" color={colors.success} />
          <Stat label="Customers" value={String(stats.customers)} icon="account-heart" color="#0EA5E9" />
          <Stat label="Revenue" value={money(stats.revenue)} icon="cash" color={colors.primary} />
        </View>

        {route.name === 'Services' || route.name === 'Packages' ? <ServicesSection services={data.services} /> : null}
        {route.name === 'Gallery' ? <GallerySection images={data.clinic?.gallery_images ?? []} /> : null}
        {route.name === 'About' ? <AboutSection /> : null}
        {route.name !== 'Services' && route.name !== 'Packages' && route.name !== 'Gallery' && route.name !== 'About' ? <BookingsSection bookings={data.bookings} routeName={route.name} /> : null}
      </ScrollView>
      <GroomerBottomNavigation activeRoute={route.name} />
    </AppScreen>
  );
}

function BookingsSection({ bookings, routeName }: { bookings: GroomingBookingRecord[]; routeName: string }) {
  if (bookings.length === 0) return <EmptyCard text="No live grooming records are available for this module yet." />;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{routeName === 'Calendar' ? 'Schedule' : 'Live Records'}</Text>
      {bookings.slice(0, 12).map(booking => (
        <View key={booking.id} style={styles.listCard}>
          <View style={styles.listIcon}><MaterialCommunityIcons name="content-cut" size={20} color="#EC4899" /></View>
          <View style={styles.listCopy}>
            <Text style={styles.listTitle}>{formatBooking(booking)}</Text>
            <Text style={styles.listMeta}>Status: {booking.status.replace('_', ' ')} - {money(Number(booking.price ?? 0))}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ServicesSection({ services }: { services: GroomingServiceRecord[] }) {
  if (services.length === 0) return <EmptyCard text="No grooming services are assigned yet." />;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Services</Text>
      {services.map(service => (
        <View key={service.id} style={styles.listCard}>
          <View style={styles.listIcon}><MaterialCommunityIcons name="content-cut" size={20} color={colors.primary} /></View>
          <View style={styles.listCopy}>
            <Text style={styles.listTitle}>{service.name}</Text>
            <Text style={styles.listMeta}>{money(Number(service.price ?? 0))} - {service.duration_minutes ?? 60} min</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function GallerySection({ images }: { images: string[] }) {
  if (images.length === 0) return <EmptyCard text="No gallery images have been uploaded yet." />;
  return (
    <View style={styles.galleryGrid}>
      {images.slice(0, 9).map((image, index) => (
        <View key={`${image}-${index}`} style={styles.galleryTile}><MaterialCommunityIcons name="image" size={24} color={colors.muted} /></View>
      ))}
    </View>
  );
}

function AboutSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PetCare+ Grooming</Text>
      <Text style={styles.paragraph}>Manage grooming appointments, services, performance, customer requests, and shop activity from one connected portal.</Text>
    </View>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: string; icon: IconName; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}><MaterialCommunityIcons name={icon} size={18} color={color} /></View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return <View style={styles.emptyCard}><Text style={styles.muted}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 112 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  muted: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center', lineHeight: 20 },
  hero: { borderRadius: radii.xl, padding: 16, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', gap: 14, alignItems: 'center', ...shadows.soft },
  heroIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: colors.text },
  heroSubtitle: { fontSize: 13, fontWeight: '700', color: colors.muted, lineHeight: 19, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  statCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  statIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 2 },
  section: { marginTop: 22, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  listCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 13, ...shadows.soft },
  listIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  listCopy: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  listMeta: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 3, textTransform: 'capitalize' },
  emptyCard: { marginTop: 20, backgroundColor: colors.surface, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  galleryTile: { width: '30.9%', height: 104, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', ...shadows.soft },
  paragraph: { fontSize: 13, fontWeight: '700', color: colors.muted, lineHeight: 21 },
});
