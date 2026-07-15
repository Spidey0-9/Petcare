import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { AppScreen } from '../core/components/AppScreen';
import { colors, gradients, radii, shadows } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';
import { groomingService, type GroomingDashboardData } from '../services/grooming';
import { shopService, type ShopProduct } from '../services/shop';
import { GroomerBottomNavigation } from './GroomerBottomNavigation';
import type { GroomingBookingRecord, GroomingBookingStatus } from '../types';

type LoadState = 'loading' | 'ready' | 'error';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type Insights = ReturnType<typeof buildInsights>;

type Kpi = {
  label: string;
  description: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: IconName;
  color: string;
  trend: string;
  spark: number[];
};

const NEXT_STATUS: Partial<Record<GroomingBookingStatus, GroomingBookingStatus>> = {
  requested: 'confirmed',
  confirmed: 'in_progress',
  in_progress: 'completed',
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const monthKey = () => new Date().toISOString().slice(0, 7);
const yearKey = () => new Date().toISOString().slice(0, 4);

function weekStartKey() {
  const date = new Date();
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}

function money(value: number) {
  return `Rs ${value.toFixed(0)}`;
}

function buildSpark(seed: number) {
  return Array.from({ length: 7 }, (_, index) => Math.max(12, ((seed + index * 13) % 54) + 22));
}

function formatWhen(booking: GroomingBookingRecord) {
  const date = new Date(`${booking.service_date}T00:00:00`);
  const dateText = Number.isNaN(date.getTime()) ? booking.service_date : new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).format(date);
  return `${dateText} at ${booking.service_time}`;
}

export function GroomerDashboardScreen() {
  const [state, setState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<GroomingDashboardData>({ groomer: null, profile: null, clinic: null, bookings: [], services: [] });
  const [products, setProducts] = useState<ShopProduct[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading');
    setError('');
    try {
      const [next, shopProducts] = await Promise.all([
        groomingService.getCurrentGroomerDashboard(),
        shopService.searchProducts({ pageSize: 24 }).catch(shopError => {
          console.error('[GroomerDashboard] shop summary load failed:', shopError);
          return [] as ShopProduct[];
        }),
      ]);
      setData(next);
      setProducts(shopProducts);
      setState('ready');
    } catch (loadError) {
      console.error('[GroomerDashboard] load failed:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load groomer dashboard.');
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useRealtimeTables(
    'groomer-dashboard-premium',
    [TABLES.groomers, TABLES.groomingClinics, TABLES.groomingServices, TABLES.groomingBookings, TABLES.notifications, TABLES.products, TABLES.orders],
    () => { void load(true); },
  );

  async function updateStatus(booking: GroomingBookingRecord, status: GroomingBookingStatus) {
    try {
      await groomingService.updateBookingStatus(booking.id, status);
      await load(true);
    } catch (statusError) {
      console.error('[GroomerDashboard] status update failed:', statusError);
      Alert.alert('Update failed', statusError instanceof Error ? statusError.message : 'Unable to update grooming booking.');
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  const insights = useMemo(() => buildInsights(data, products), [data, products]);

  if (state === 'loading') return <DashboardSkeleton />;

  if (state === 'error') {
    return (
      <AppScreen contentStyle={styles.center}>
        <MaterialCommunityIcons name="alert-circle" size={42} color={colors.danger} />
        <Text style={styles.title}>Groomer portal unavailable</Text>
        <Text style={styles.muted}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => { void load(); }}><Text style={styles.primaryBtnText}>Retry</Text></Pressable>
      </AppScreen>
    );
  }

  if (!data.groomer) {
    return (
      <AppScreen contentStyle={styles.center}>
        <MaterialCommunityIcons name="account-clock" size={42} color="#EC4899" />
        <Text style={styles.title}>Profile pending</Text>
        <Text style={styles.muted}>Your groomer profile has not been created or approved yet. Super Admin approval is required before bookings can be managed.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <Hero data={data} insights={insights} />
        <View style={styles.kpiGrid}>{insights.kpis.map((kpi, index) => <KpiCard key={kpi.label} item={kpi} index={index} />)}</View>
        <SectionHeader title="Today's Operations" action="Live queue" />
        <Operations bookings={insights.activeBookings} onStatus={updateStatus} />
        <SectionHeader title="Revenue Overview" action="Real-time" />
        <RevenuePanel insights={insights} />
        <SectionHeader title="Customer Insights" action={`${insights.customers} customers`} />
        <CustomerPanel insights={insights} />
        <SectionHeader title="Inventory & Shop" action={`${products.length} products`} />
        <InventoryPanel products={products} inventoryValue={insights.inventoryValue} lowStock={insights.lowStock} />
        <SectionHeader title="Quick Actions" action="Studio tools" />
        <QuickActions />
        <SectionHeader title="Calendar Preview" action="Next up" />
        <CalendarPreview bookings={insights.upcomingBookings} />
        <SectionHeader title="Customer Reviews" action="Reputation" />
        <ReviewPanel rating={Number(data.groomer.rating ?? 0)} reviewCount={Number(data.groomer.review_count ?? 0)} />
      </ScrollView>
      <GroomerBottomNavigation activeRoute="Dashboard" />
    </AppScreen>
  );
}

function buildInsights(data: GroomingDashboardData, products: ShopProduct[]) {
  const today = todayKey();
  const week = weekStartKey();
  const month = monthKey();
  const year = yearKey();
  const bookings = data.bookings;
  const todayBookings = bookings.filter(booking => booking.service_date === today);
  const pending = bookings.filter(booking => booking.status === 'requested');
  const accepted = bookings.filter(booking => booking.status === 'confirmed' || booking.status === 'rescheduled');
  const activeBookings = bookings.filter(booking => !['completed', 'cancelled', 'rejected'].includes(booking.status));
  const completed = bookings.filter(booking => booking.status === 'completed');
  const completedToday = todayBookings.filter(booking => booking.status === 'completed');
  const weekBookings = bookings.filter(booking => booking.service_date >= week);
  const monthBookings = bookings.filter(booking => booking.service_date?.startsWith(month));
  const yearBookings = bookings.filter(booking => booking.service_date?.startsWith(year));
  const revenueToday = completedToday.reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
  const revenueWeek = weekBookings.filter(booking => booking.status === 'completed').reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
  const revenueMonth = monthBookings.filter(booking => booking.status === 'completed').reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
  const revenueYear = yearBookings.filter(booking => booking.status === 'completed').reduce((sum, booking) => sum + Number(booking.price ?? 0), 0);
  const customers = new Set(bookings.map(booking => booking.owner_id));
  const repeatCustomers = Array.from(customers).filter(ownerId => bookings.filter(booking => booking.owner_id === ownerId).length > 1).length;
  const averageMinutes = data.services.length ? Math.round(data.services.reduce((sum, service) => sum + Number(service.duration_minutes ?? 60), 0) / data.services.length) : 0;
  const lowStock = products.filter(product => Number(product.stock ?? 0) <= 5).length;
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.price ?? 0) * Number(product.stock ?? 0), 0);
  const kpis: Kpi[] = [
    { label: "Today's Bookings", description: 'Scheduled for today', value: todayBookings.length, icon: 'calendar-today', color: '#EC4899', trend: todayBookings.length ? 'Live' : 'Clear', spark: buildSpark(todayBookings.length + 3) },
    { label: 'Pending Requests', description: 'Need action', value: pending.length, icon: 'clock-alert-outline', color: '#F59E0B', trend: pending.length ? 'Action' : 'Clear', spark: buildSpark(pending.length + 9) },
    { label: 'Accepted', description: 'Confirmed queue', value: accepted.length, icon: 'calendar-check-outline', color: '#8B5CF6', trend: accepted.length ? 'Live' : 'Clear', spark: buildSpark(accepted.length + 15) },
    { label: 'Completed', description: 'Finished services', value: completed.length, icon: 'check-decagram', color: colors.success, trend: completed.length ? 'Live' : 'No history', spark: buildSpark(completed.length + 21) },
    { label: 'Revenue Today', description: 'Completed today', value: revenueToday, prefix: 'Rs ', icon: 'cash', color: colors.primary, trend: revenueToday > 0 ? 'Paid' : 'No revenue', spark: buildSpark(revenueToday + 5) },
    { label: 'Revenue This Week', description: 'Weekly earnings', value: revenueWeek, prefix: 'Rs ', icon: 'chart-timeline-variant', color: '#0EA5E9', trend: revenueWeek > 0 ? 'Paid' : 'No revenue', spark: buildSpark(revenueWeek + 7) },
    { label: 'Revenue This Month', description: 'Monthly earnings', value: revenueMonth, prefix: 'Rs ', icon: 'chart-line', color: '#22C55E', trend: revenueMonth > 0 ? 'Paid' : 'No revenue', spark: buildSpark(revenueMonth + 11) },
    { label: 'Customer Rating', description: 'Average score', value: Number(data.groomer?.rating ?? 0), decimals: 1, icon: 'star', color: '#F59E0B', trend: data.groomer?.rating ? 'Live' : 'Pending', spark: buildSpark(Number(data.groomer?.rating ?? 0) * 10) },
    { label: 'Repeat Customers', description: 'Returned owners', value: repeatCustomers, icon: 'account-heart', color: colors.secondary, trend: repeatCustomers ? 'Live' : 'New', spark: buildSpark(repeatCustomers + 17) },
    { label: 'Products Sold', description: 'Order linkage pending', value: 0, icon: 'shopping-outline', color: '#EC4899', trend: 'No data', spark: buildSpark(4) },
    { label: 'Inventory Alerts', description: 'Low stock products', value: lowStock, icon: 'package-variant', color: colors.danger, trend: lowStock ? 'Review' : 'Clear', spark: buildSpark(lowStock + 30) },
    { label: 'Unread Reviews', description: 'Review records pending', value: 0, icon: 'message-star-outline', color: '#F97316', trend: 'No data', spark: buildSpark(12) },
    { label: 'Avg Grooming Time', description: 'Service duration', value: averageMinutes, suffix: 'm', icon: 'timer-outline', color: colors.primaryDark, trend: averageMinutes ? 'Live' : 'Pending', spark: buildSpark(averageMinutes + 6) },
  ];
  return { bookings, activeBookings, upcomingBookings: activeBookings.slice(0, 4), pending, accepted, completed, todayBookings, completedToday, customers: customers.size, repeatCustomers, revenueToday, revenueWeek, revenueMonth, revenueYear, averageMinutes, lowStock, inventoryValue, kpis };
}function DashboardSkeleton() {
  const pulse = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 780, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 780, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <AppScreen scroll={false}>
      <View style={styles.skeletonBody}>
        <Animated.View style={[styles.skeletonHero, { opacity: pulse }]} />
        <View style={styles.skeletonGrid}>{Array.from({ length: 8 }, (_, index) => <Animated.View key={index} style={[styles.skeletonCard, { opacity: pulse }]} />)}</View>
        <ActivityIndicator color={colors.primary} />
      </View>
    </AppScreen>
  );
}

function Hero({ data, insights }: { data: GroomingDashboardData; insights: Insights }) {
  return (
    <LinearGradient colors={gradients.dark} style={styles.hero}>
      <View style={styles.coverGlow} />
      <View style={styles.heroTopRow}>
        <View style={styles.profilePhoto}><MaterialCommunityIcons name="content-cut" size={34} color="#fff" /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Good day, {data.groomer?.full_name?.split(' ')[0] ?? 'Groomer'}</Text>
          <Text style={styles.heroTitle}>{data.groomer?.full_name}</Text>
          <Text style={styles.heroMeta}>{data.clinic?.name ?? 'Studio pending'}</Text>
        </View>
        <View style={styles.verifiedBadge}><MaterialCommunityIcons name="check-decagram" size={16} color="#A7F3D0" /><Text style={styles.verifiedBadgeText}>Verified</Text></View>
      </View>
      <View style={styles.heroMetrics}>
        <HeroMetric label="Availability" value={data.groomer?.is_available ? 'Online' : 'Offline'} tone={data.groomer?.is_available ? colors.primarySoft : colors.dangerSoft} />
        <HeroMetric label="Rating" value={Number(data.groomer?.rating ?? 0).toFixed(1)} tone="rgba(245,158,11,0.18)" />
        <HeroMetric label="Experience" value={`${data.groomer?.experience_years ?? 0} yrs`} tone="rgba(14,165,233,0.18)" />
        <HeroMetric label="Completed" value={String(insights.completed.length)} tone="rgba(34,197,94,0.18)" />
        <HeroMetric label="Today" value={money(insights.revenueToday)} tone="rgba(16,185,129,0.18)" />
      </View>
    </LinearGradient>
  );
}

function HeroMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <View style={[styles.heroMetric, { backgroundColor: tone }]}><Text style={styles.heroMetricValue}>{value}</Text><Text style={styles.heroMetricLabel}>{label}</Text></View>;
}

const KpiCard = memo(function KpiCard({ item, index }: { item: Kpi; index: number }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 420, delay: index * 55, useNativeDriver: true }).start();
  }, [entrance, index]);

  useEffect(() => {
    const steps = 22;
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setDisplayValue(item.value * Math.min(1, current / steps));
      if (current >= steps) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [item.value]);

  const formattedValue = `${item.prefix ?? ''}${displayValue.toFixed(item.decimals ?? 0)}${item.suffix ?? ''}`;
  const translateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const scale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  return (
    <Animated.View style={[styles.kpiCard, { opacity: entrance, transform: [{ translateY }, { scale }] }]}>
      <LinearGradient colors={['rgba(255,255,255,0.96)', 'rgba(255,255,255,0.72)']} style={styles.kpiGradient}>
        <View style={styles.kpiTopRow}>
          <View style={[styles.kpiIcon, { backgroundColor: `${item.color}18` }]}><MaterialCommunityIcons name={item.icon} size={20} color={item.color} /></View>
          <View style={styles.trendPill}><Text style={styles.trendText}>{item.trend}</Text></View>
        </View>
        <Text style={styles.kpiValue} numberOfLines={1}>{formattedValue}</Text>
        <Text style={styles.kpiLabel} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.kpiDescription} numberOfLines={1}>{item.description}</Text>
        <View style={styles.sparkRow}>{item.spark.map((height, sparkIndex) => <View key={sparkIndex} style={[styles.sparkBar, { height, backgroundColor: item.color }]} />)}</View>
      </LinearGradient>
    </Animated.View>
  );
});

function SectionHeader({ title, action }: { title: string; action: string }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionAction}>{action}</Text></View>;
}

function Operations({ bookings, onStatus }: { bookings: GroomingBookingRecord[]; onStatus: (booking: GroomingBookingRecord, status: GroomingBookingStatus) => Promise<void> }) {
  if (bookings.length === 0) return <EmptyState icon="calendar-blank-outline" title="No active appointments" body="New grooming requests will appear here with quick accept, reject and start actions." />;
  return (
    <View style={styles.operationsList}>
      {bookings.slice(0, 5).map(booking => (
        <View key={booking.id} style={styles.operationCard}>
          <View style={styles.operationIcon}><MaterialCommunityIcons name="content-cut" size={22} color="#EC4899" /></View>
          <View style={styles.operationCopy}>
            <Text style={styles.operationTitle}>{formatWhen(booking)}</Text>
            <Text style={styles.operationMeta}>Status: {booking.status.replace('_', ' ')} - {money(Number(booking.price ?? 0))}</Text>
            {!!booking.symptoms && <Text style={styles.operationNotes} numberOfLines={2}>{booking.symptoms}</Text>}
          </View>
          <View style={styles.operationActions}>
            {!!NEXT_STATUS[booking.status] && (
              <Pressable style={styles.acceptBtn} onPress={() => { void onStatus(booking, NEXT_STATUS[booking.status] as GroomingBookingStatus); }}>
                <Text style={styles.acceptText}>{NEXT_STATUS[booking.status]?.replace('_', ' ')}</Text>
              </Pressable>
            )}
            <Pressable style={styles.rejectBtn} onPress={() => { void onStatus(booking, 'rejected'); }}>
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

function RevenuePanel({ insights }: { insights: Insights }) {
  return (
    <View style={styles.panelGrid}>
      <ChartCard title="Today" value={money(insights.revenueToday)} color={colors.primary} seed={insights.revenueToday} />
      <ChartCard title="Week" value={money(insights.revenueWeek)} color="#0EA5E9" seed={insights.revenueWeek} />
      <ChartCard title="Month" value={money(insights.revenueMonth)} color="#22C55E" seed={insights.revenueMonth} />
      <ChartCard title="Year" value={money(insights.revenueYear)} color="#8B5CF6" seed={insights.revenueYear} />
    </View>
  );
}

function ChartCard({ title, value, color, seed }: { title: string; value: string; color: string; seed: number }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartLabel}>{title}</Text>
      <Text style={styles.chartValue}>{value}</Text>
      <View style={styles.chartBars}>{buildSpark(seed + 10).map((height, index) => <View key={index} style={[styles.chartBar, { height, backgroundColor: color }]} />)}</View>
    </View>
  );
}function CustomerPanel({ insights }: { insights: Insights }) {
  return (
    <View style={styles.customerGrid}>
      <InsightCard icon="account-group-outline" label="Total Customers" value={String(insights.customers)} />
      <InsightCard icon="account-sync-outline" label="Repeat Customers" value={String(insights.repeatCustomers)} />
      <InsightCard icon="heart-pulse" label="Satisfaction" value={insights.completed.length ? 'High' : 'Pending'} />
      <InsightCard icon="account-plus-outline" label="Newest Customers" value={String(Math.min(insights.customers, 5))} />
    </View>
  );
}

function InventoryPanel({ products, inventoryValue, lowStock }: { products: ShopProduct[]; inventoryValue: number; lowStock: number }) {
  const best = products[0];
  return (
    <View style={styles.inventoryCard}>
      <View style={styles.inventorySummary}>
        <InsightCard icon="clipboard-alert-outline" label="Low Stock" value={String(lowStock)} />
        <InsightCard icon="package-variant" label="Inventory Value" value={money(inventoryValue)} />
      </View>
      <View style={styles.shopSummaryRow}>
        <MaterialCommunityIcons name="shopping-outline" size={22} color={colors.primary} />
        <View style={styles.operationCopy}>
          <Text style={styles.operationTitle}>{best?.name ?? 'No product data yet'}</Text>
          <Text style={styles.operationMeta}>{best ? `${money(Number(best.price ?? 0))} - Stock ${best.stock ?? 0}` : 'Products appear after shop inventory is available.'}</Text>
        </View>
      </View>
    </View>
  );
}

function QuickActions() {
  const actions: Array<{ label: string; icon: IconName; color: string }> = [
    { label: 'Add Service', icon: 'content-cut', color: colors.primary },
    { label: 'Add Package', icon: 'package-variant-closed', color: '#F97316' },
    { label: 'Add Product', icon: 'shopping-outline', color: '#0EA5E9' },
    { label: 'Upload Gallery', icon: 'image-plus', color: '#8B5CF6' },
    { label: 'Scan QR', icon: 'qrcode-scan', color: '#64748B' },
    { label: 'Invoice', icon: 'file-document-outline', color: '#22C55E' },
    { label: 'Calendar', icon: 'calendar-month-outline', color: '#EC4899' },
  ];
  return <View style={styles.quickGrid}>{actions.map(action => <View key={action.label} style={styles.quickCard}><View style={[styles.quickIcon, { backgroundColor: `${action.color}18` }]}><MaterialCommunityIcons name={action.icon} size={20} color={action.color} /></View><Text style={styles.quickText}>{action.label}</Text></View>)}</View>;
}

function CalendarPreview({ bookings }: { bookings: GroomingBookingRecord[] }) {
  if (bookings.length === 0) return <EmptyState icon="calendar-clock" title="Calendar is clear" body="Confirmed and rescheduled bookings will create your week preview automatically." />;
  return <View style={styles.calendarList}>{bookings.map(booking => <View key={booking.id} style={styles.calendarRow}><View style={styles.timelineDot} /><Text style={styles.calendarText}>{formatWhen(booking)}</Text><Text style={styles.calendarStatus}>{booking.status.replace('_', ' ')}</Text></View>)}</View>;
}

function ReviewPanel({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewAvatar}><MaterialCommunityIcons name="message-star-outline" size={24} color="#F59E0B" /></View>
      <View style={styles.operationCopy}>
        <Text style={styles.operationTitle}>{rating.toFixed(1)} average rating</Text>
        <Text style={styles.operationMeta}>{reviewCount} customer reviews</Text>
        <Text style={styles.operationNotes}>Review replies and pinned highlights will appear when customer review records are available.</Text>
      </View>
    </View>
  );
}

function InsightCard({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <View style={styles.insightCard}><MaterialCommunityIcons name={icon} size={20} color={colors.primary} /><Text style={styles.insightValue} numberOfLines={1}>{value}</Text><Text style={styles.insightLabel} numberOfLines={1}>{label}</Text></View>;
}

function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return <View style={styles.emptyCard}><MaterialCommunityIcons name={icon} size={30} color={colors.primary} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text></View>;
}

const styles = StyleSheet.create({
  body: { padding: 18, paddingBottom: 112 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  muted: { fontSize: 13, fontWeight: '700', color: colors.muted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  skeletonBody: { flex: 1, padding: 18, gap: 14 },
  skeletonHero: { height: 220, borderRadius: radii.xxl, backgroundColor: colors.surface },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skeletonCard: { width: '48%', height: 150, borderRadius: radii.xl, backgroundColor: colors.surface },
  hero: { minHeight: 242, borderRadius: radii.xxl, padding: 18, overflow: 'hidden', ...shadows.premium },
  coverGlow: { position: 'absolute', right: -60, top: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(16,185,129,0.22)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  profilePhoto: { width: 76, height: 76, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  kicker: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '900' },
  heroTitle: { color: '#fff', fontSize: 27, fontWeight: '900', marginTop: 3 },
  heroMeta: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '800', marginTop: 3 },
  verifiedBadge: { flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 999, backgroundColor: 'rgba(16,185,129,0.18)', paddingHorizontal: 9, paddingVertical: 7 },
  verifiedBadgeText: { color: '#D1FAE5', fontSize: 10, fontWeight: '900' },
  heroMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 22 },
  heroMetric: { minWidth: '30%', borderRadius: 17, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  heroMetricValue: { color: '#fff', fontSize: 16, fontWeight: '900' },
  heroMetricLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 10, fontWeight: '800', marginTop: 3 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 16 },
  kpiCard: { width: '48.2%' },
  kpiGradient: { borderRadius: radii.xl, padding: 14, minHeight: 166, borderWidth: 1, borderColor: 'rgba(221,234,228,0.82)', ...shadows.soft },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  trendPill: { borderRadius: 999, backgroundColor: colors.backgroundAlt, paddingHorizontal: 8, paddingVertical: 5 },
  trendText: { fontSize: 10, fontWeight: '900', color: colors.primaryDark },
  kpiValue: { fontSize: 23, fontWeight: '900', color: colors.text, marginTop: 13 },
  kpiLabel: { fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 2 },
  kpiDescription: { fontSize: 10, fontWeight: '800', color: colors.muted, marginTop: 2 },
  sparkRow: { height: 58, flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 10 },
  sparkBar: { flex: 1, borderRadius: 999, opacity: 0.45 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  sectionAction: { fontSize: 11, fontWeight: '900', color: colors.primaryDark, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  operationsList: { gap: 11 },
  operationCard: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 12, ...shadows.soft },
  operationIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' },
  operationCopy: { flex: 1, minWidth: 0 },
  operationTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  operationMeta: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'capitalize', marginTop: 3 },
  operationNotes: { fontSize: 12, fontWeight: '700', color: colors.text, lineHeight: 18, marginTop: 5 },
  operationActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 10, alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  rejectBtn: { backgroundColor: colors.dangerSoft, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  rejectText: { color: colors.danger, fontSize: 12, fontWeight: '900' },
  panelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chartCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  chartLabel: { fontSize: 11, fontWeight: '900', color: colors.muted },
  chartValue: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4 },
  chartBars: { height: 62, flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 12 },
  chartBar: { flex: 1, borderRadius: 999, opacity: 0.42 },
  customerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  insightCard: { width: '48%', backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  insightValue: { fontSize: 17, fontWeight: '900', color: colors.text, marginTop: 8 },
  insightLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 2 },
  inventoryCard: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  inventorySummary: { flexDirection: 'row', gap: 10 },
  shopSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '31%', minHeight: 92, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 11, justifyContent: 'space-between', ...shadows.soft },
  quickIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: 11, fontWeight: '900', color: colors.text },
  calendarList: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 12, ...shadows.soft },
  calendarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  calendarText: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.text },
  calendarStatus: { fontSize: 11, fontWeight: '900', color: colors.muted, textTransform: 'capitalize' },
  reviewCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: radii.xl, padding: 14, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  reviewAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(245,158,11,0.14)', alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: 22, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginTop: 8 },
  emptyBody: { fontSize: 12, fontWeight: '700', color: colors.muted, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});