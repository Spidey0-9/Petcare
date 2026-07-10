import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { AIInsightCard, type AIInsightItem } from './components/AIInsightCard';
import { AchievementsCard } from './components/AchievementsCard';
import { AppointmentCard } from './components/AppointmentCard';
import { CommunityPreview } from './components/CommunityPreview';
import { EmergencyBanner } from './components/EmergencyBanner';
import { HealthAnalytics } from './components/HealthAnalytics';
import { NearbyClinicCard } from './components/NearbyClinicCard';
import { OffersSlider } from './components/OffersSlider';
import { PetCarousel } from './components/PetCarousel';
import { ProfileCard } from './components/ProfileCard';
import { QuickActions } from './components/QuickActions';
import { RecentActivity } from './components/RecentActivity';
import { RecommendedServices } from './components/RecommendedServices';
import { ReminderCards } from './components/ReminderCards';
import { SearchBar } from './components/SearchBar';
import { SectionHeader } from './components/SectionHeader';
import { WeatherCard } from './components/WeatherCard';
import { WeeklyHealthSummary } from './components/WeeklyHealthSummary';
import { colors } from '../core/theme/colors';
import { TABLES } from '../constants';
import type { HomeStackParamList } from '../routes/types';
import { clinicService } from '../services/clinics';
import { useRealtimeTables } from '../services/realtime';
import {
  homeDashboardService,
  type HomeDashboardData,
  type HomeLocationStatus,
  type HomeReminderSummary,
} from './services/homeDashboardService';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;
type HomeCoords = { latitude: number; longitude: number } | null;

type SectionStateProps = {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyTitle: string;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
};

const TABLE_TO_SECTIONS: Record<string, ReadonlyArray<keyof HomeDashboardData>> = {
  [TABLES.profiles]: ['profile'],
  [TABLES.doctors]: ['nextAppointment', 'activities'],
  [TABLES.pets]: ['pets', 'selectedPet', 'healthMetrics', 'weeklyStats', 'activities', 'recommendedServices', 'careTips', 'achievements'],
  [TABLES.appointments]: ['nextAppointment', 'activities', 'weeklyStats', 'weeklyOverall', 'recommendedServices'],
  [TABLES.reminders]: ['reminders', 'activities', 'recommendedServices', 'weeklyStats', 'weeklyOverall'],
  [TABLES.medicalRecords]: ['healthMetrics', 'activities', 'weeklyStats', 'weeklyOverall', 'recommendedServices', 'careTips'],
  [TABLES.vaccinations]: ['healthMetrics', 'activities', 'weeklyStats', 'weeklyOverall', 'recommendedServices', 'careTips', 'achievements'],
  [TABLES.petHealthLogs]: ['pets', 'selectedPet', 'healthMetrics', 'weeklyStats', 'weeklyOverall', 'careTips', 'achievements'],
  [TABLES.aiPredictions]: ['latestPrediction'],
  [TABLES.notifications]: ['activities'],
  [TABLES.posts]: ['communityPosts', 'activities'],
  [TABLES.comments]: ['communityPosts'],
  [TABLES.likes]: ['communityPosts'],
  [TABLES.clinics]: ['nearbyClinics', 'recommendedServices'],
  [TABLES.products]: ['offers', 'recommendedServices'],
  [TABLES.categories]: ['offers'],
  [TABLES.orders]: ['activities', 'membership', 'offers'],
  [TABLES.payments]: ['membership', 'activities'],
  [TABLES.memberships]: ['membership', 'offers'],
  [TABLES.reviews]: ['recommendedServices'],
  [TABLES.messages]: ['activities'],
};

const REALTIME_TABLES = Object.keys(TABLE_TO_SECTIONS);

function buildQuickActions(nav: Nav) {
  return [
    { id: 'ai', icon: 'robot' as const, label: 'AI Assistant', color: '#6C63FF', bgColor: '#F0EEFF', onPress: () => nav.navigate('AiAssistant') },
    { id: 'appt', icon: 'calendar-plus' as const, label: 'Book Appt', color: '#0EA5E9', bgColor: '#E0F2FE', onPress: () => nav.getParent()?.navigate('Appointments' as never) },
    { id: 'pharmacy', icon: 'pill' as const, label: 'Pharmacy', color: '#EF4444', bgColor: '#FEE2E2', onPress: () => nav.navigate('Pharmacy') },
    { id: 'shop', icon: 'shopping' as const, label: 'Pet Store', color: '#EC4899', bgColor: '#FDF2F8', onPress: () => nav.getParent()?.navigate('Shop' as never) },
    { id: 'nutrition', icon: 'food-apple' as const, label: 'Nutrition', color: '#8BC34A', bgColor: '#F1F8E9', onPress: () => nav.navigate('Nutrition') },
    { id: 'grooming', icon: 'content-cut' as const, label: 'Grooming', color: '#F472B6', bgColor: '#FDF2F8', onPress: () => nav.navigate('Grooming') },
    { id: 'records', icon: 'file-document' as const, label: 'Medical Records', color: '#8B5CF6', bgColor: '#F3E8FF', onPress: () => nav.navigate('Reports') },
    { id: 'community', icon: 'account-group' as const, label: 'Community', color: '#14B8A6', bgColor: '#F0FDFA', onPress: () => nav.navigate('Community') },
  ];
}

function displayName(data: HomeDashboardData | null) {
  const value = (data?.profile?.full_name || data?.profile?.email || '').trim();
  return value || 'Pet Parent';
}

function roleLabel(role?: string | null) {
  if (role === 'doctor') return 'Doctor';
  if (role === 'admin' || role === 'super_admin') return 'Admin';
  return 'Pet Owner';
}

function formatAppointmentDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatAppointmentTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function reminderIcon(reminder: HomeReminderSummary) {
  if (reminder.type === 'vaccination') return { icon: 'needle' as const, color: '#16A34A', bg: '#E8F5E9' };
  if (reminder.type === 'medicine') return { icon: 'pill' as const, color: '#FF8F00', bg: '#FFF8E1' };
  if (reminder.type === 'grooming') return { icon: 'content-cut' as const, color: '#EC4899', bg: '#FDF2F8' };
  return { icon: 'bell-ring' as const, color: '#0EA5E9', bg: '#E0F2FE' };
}

function toReminderCards(reminders: HomeReminderSummary[]) {
  return reminders.slice(0, 2).map(reminder => {
    const meta = reminderIcon(reminder);
    return {
      id: reminder.id,
      icon: meta.icon,
      iconColor: meta.color,
      title: reminder.title,
      time: reminder.displayTime,
      bgColor: meta.bg,
    };
  });
}

function DashboardSectionState({ loading, error, empty, emptyTitle, emptyText, onRetry, children }: SectionStateProps) {
  if (loading) return <SkeletonSection />;
  if (error) return <StateCard icon="alert-circle-outline" title="Unable to load" text={error} action="Retry" onPress={onRetry} />;
  if (empty) return <StateCard icon="database-outline" title={emptyTitle} text={emptyText} action="Refresh" onPress={onRetry} />;
  return <>{children}</>;
}

function SkeletonSection() {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
      <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonChip} />
        <View style={styles.skeletonChip} />
        <View style={styles.skeletonChip} />
      </View>
    </View>
  );
}

function StateCard({ icon, title, text, action, onPress }: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      <View style={styles.stateCopy}>
        <Text style={styles.stateTitle}>{title}</Text>
        <Text style={styles.stateText}>{text}</Text>
      </View>
      {action && onPress ? (
        <Pressable style={styles.stateButton} onPress={onPress}>
          <Text style={styles.stateButtonText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const aiFabPulse = useRef(new Animated.Value(1)).current;
  const pageFade = useRef(new Animated.Value(0)).current;
  const sectionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<HomeDashboardData | null>(null);
  const [coords, setCoords] = useState<HomeCoords>(null);
  const [locationStatus, setLocationStatus] = useState<HomeLocationStatus>('unavailable');

  const loadDashboard = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      let nextCoords: HomeCoords = null;
      let nextLocationStatus: HomeLocationStatus = 'unavailable';

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          nextCoords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          nextLocationStatus = 'granted';
        } else {
          nextLocationStatus = 'denied';
        }
      } catch (locationError) {
        nextLocationStatus = 'unavailable';
        console.warn('[HomeScreen] Location fetch failed:', locationError);
      }

      setCoords(nextCoords);
      setLocationStatus(nextLocationStatus);

      const data = await homeDashboardService.getDashboardData(nextCoords, nextLocationStatus);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Home dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(pageFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(aiFabPulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(aiFabPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [aiFabPulse, pageFade]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard(!dashboard);
    }, [dashboard, loadDashboard]),
  );

  const refreshSections = useCallback((sections: ReadonlyArray<keyof HomeDashboardData>) => {
    const key = sections.slice().sort().join(',');
    if (sectionTimers.current[key]) clearTimeout(sectionTimers.current[key]);

    sectionTimers.current[key] = setTimeout(async () => {
      try {
        const fresh = await homeDashboardService.getDashboardData(coords, locationStatus);
        setDashboard(previous => {
          if (!previous) return fresh;
          const patch: Partial<HomeDashboardData> = {};
          sections.forEach(section => {
            (patch as Record<string, unknown>)[String(section)] = fresh[section];
          });
          return { ...previous, ...patch };
        });
      } catch (err) {
        console.warn('[HomeScreen] Section refresh failed:', sections, err);
      }
    }, 500);
  }, [coords, locationStatus]);

  const handleRealtimeChange = useCallback((table: string) => {
    const sections = TABLE_TO_SECTIONS[table];
    if (sections?.length) refreshSections(sections);
  }, [refreshSections]);

  useRealtimeTables('home', REALTIME_TABLES, handleRealtimeChange);

  useEffect(() => {
    return () => {
      Object.values(sectionTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard(false);
  }, [loadDashboard]);

  const goto = useCallback((screen: keyof HomeStackParamList) => navigation.navigate(screen), [navigation]);
  const quickActions = useMemo(() => buildQuickActions(navigation), [navigation]);
  const selectedPet = dashboard?.selectedPet ?? null;
  const reminderCards = useMemo(() => toReminderCards(dashboard?.reminders ?? []), [dashboard?.reminders]);
  const subtitle = dashboard ? `${roleLabel(dashboard.profile?.role)} - ${dashboard.membership.label}` : 'Loading care dashboard';
  const aiInsights = useMemo<AIInsightItem[]>(() => {
    const prediction = dashboard?.latestPrediction;
    if (!prediction?.result && !prediction?.prompt) return [];
    return [{ id: prediction.id ?? 'latest-ai', icon: 'robot', color: '#6C63FF', text: prediction.result || prediction.prompt }];
  }, [dashboard?.latestPrediction]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}> 
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          android_ripple={{ color: colors.line, borderless: true, radius: 22 }}
        >
          <MaterialCommunityIcons name="menu" size={28} color={colors.text} />
        </Pressable>

        <View style={styles.greeting}>
          <Text style={styles.greetEmoji}>Hi</Text>
          <View style={styles.greetCopy}>
            <Text style={styles.greetName} numberOfLines={1}>{displayName(dashboard)}</Text>
            <Text style={styles.greetSub} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>

        <Pressable
          style={styles.iconBtn}
          onPress={() => goto('Notifications')}
          android_ripple={{ color: colors.line, borderless: true, radius: 22 }}
        >
          <MaterialCommunityIcons name="bell" size={26} color={colors.text} />
          {!!dashboard?.reminders.length && <View style={styles.badge} />}
        </Pressable>
      </View>

      <Animated.ScrollView
        style={[styles.scroll, { opacity: pageFade }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <SearchBar onSearch={query => { if (query.trim()) navigation.getParent()?.navigate('Shop' as never); }} />
        <EmergencyBanner onFindHospital={() => goto('Gps')} onCallVet={() => goto('Emergency')} />

        <SectionHeader title="My Pets" rightLabel="Manage" onRightPress={() => goto('Pets')} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.pets.length} emptyTitle="No pets yet" emptyText="Add your first pet to personalize the dashboard." onRetry={() => loadDashboard()}>
          <PetCarousel pets={dashboard?.pets ?? []} selectedId={selectedPet?.id} onPetPress={() => goto('Pets')} onAddPet={() => goto('Pets')} />
        </DashboardSectionState>

        <SectionHeader title="Pet Health Overview" rightLabel="Report" onRightPress={() => goto('HealthReport')} />
        <DashboardSectionState loading={loading} error={error} empty={!selectedPet} emptyTitle="No health summary" emptyText="Complete a pet profile to calculate health status." onRetry={() => loadDashboard()}>
          {selectedPet ? (
            <ProfileCard
              petName={selectedPet.name}
              petImage={selectedPet.image_url ?? undefined}
              petBreed={[
                selectedPet.breed || selectedPet.species,
                selectedPet.date_of_birth ? new Intl.DateTimeFormat('en-IN', { year: 'numeric' }).format(new Date(selectedPet.date_of_birth)) : null,
              ].filter(Boolean).join(' - ') || 'Pet profile'}
              healthScore={selectedPet.healthScore}
              onPress={() => goto('Pets')}
            />
          ) : null}
        </DashboardSectionState>

        <SectionHeader title="AI Health Insights" rightLabel="View All" onRightPress={() => goto('AiAssistant')} />
        <DashboardSectionState loading={loading} error={error} empty={!aiInsights.length} emptyTitle="No AI insights yet" emptyText="Add pet profile details and reminders to generate real insights." onRetry={() => loadDashboard()}>
          <AIInsightCard insights={aiInsights} onPress={() => goto('AiAssistant')} />
        </DashboardSectionState>

        <SectionHeader title="Today's Conditions" />
        <DashboardSectionState loading={loading} error={error} empty={false} emptyTitle="Weather unavailable" emptyText="Location is required to load weather." onRetry={() => loadDashboard()}>
          <WeatherCard coords={coords} locationStatus={locationStatus} onRetry={() => loadDashboard()} />
        </DashboardSectionState>

        <SectionHeader title="Upcoming Appointment" rightLabel="See All" onRightPress={() => navigation.getParent()?.navigate('Appointments' as never)} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.nextAppointment} emptyTitle="No upcoming appointment" emptyText="Book a visit to see the next appointment here." onRetry={() => loadDashboard()}>
          {dashboard?.nextAppointment ? (
            <AppointmentCard
              doctorName={dashboard.nextAppointment.doctorName}
              specialty={dashboard.nextAppointment.specialty}
              date={formatAppointmentDate(dashboard.nextAppointment.scheduledAt)}
              time={formatAppointmentTime(dashboard.nextAppointment.scheduledAt)}
              clinic={dashboard.nextAppointment.clinic}
              status={dashboard.nextAppointment.status}
              onPress={() => navigation.getParent()?.navigate('Appointments' as never)}
            />
          ) : null}
        </DashboardSectionState>

        <SectionHeader title="Today's Reminders" rightLabel="Add" onRightPress={() => goto('Reminders')} />
        <DashboardSectionState loading={loading} error={error} empty={!reminderCards.length} emptyTitle="No active reminders" emptyText="Create reminders for medicines, vaccines, feeding or grooming." onRetry={() => loadDashboard()}>
          <ReminderCards reminders={reminderCards} onPress={id => {
            const reminder = dashboard?.reminders.find(item => item.id === id);
            if (reminder?.type === 'vaccination') goto('Vaccination');
            else goto('Reminders');
          }} />
        </DashboardSectionState>

        <SectionHeader title="Quick Actions" />
        <QuickActions actions={quickActions} />

        <SectionHeader title="Health Analytics" rightLabel="Details" onRightPress={() => goto('Reports')} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.healthMetrics.length} emptyTitle="No health analytics" emptyText="Health analytics are calculated after pets are added." onRetry={() => loadDashboard()}>
          <HealthAnalytics metrics={dashboard?.healthMetrics ?? []} onPress={() => goto('Reports')} />
        </DashboardSectionState>

        <SectionHeader title="Weekly Summary" rightLabel="History" onRightPress={() => goto('HealthReport')} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.weeklyStats.length} emptyTitle="No weekly summary" emptyText="Add pets and reminders to build a weekly summary." onRetry={() => loadDashboard()}>
          <WeeklyHealthSummary stats={dashboard?.weeklyStats ?? []} overall={dashboard?.weeklyOverall ?? 0} />
        </DashboardSectionState>

        <SectionHeader title="Recent Activity" rightLabel="All" onRightPress={() => goto('Reports')} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.activities.length} emptyTitle="No recent activity" emptyText="Pet updates, reminders and appointments will appear here." onRetry={() => loadDashboard()}>
          <RecentActivity activities={dashboard?.activities ?? []} />
        </DashboardSectionState>

        <SectionHeader title="Recommended Services" rightLabel="All Services" onRightPress={() => goto('Gps')} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.recommendedServices.length} emptyTitle="No recommended services" emptyText="Recommended services will appear from pet age, vaccinations, appointments and medical history." onRetry={() => loadDashboard()}>
          <RecommendedServices services={dashboard?.recommendedServices ?? []} onPress={id => {
            const service = dashboard?.recommendedServices.find(item => item.id === id);
            if (service?.badge === 'vaccination') goto('Vaccination');
            else if (service?.badge === 'medical') goto('Reports');
            else if (service?.badge === 'appointment') navigation.getParent()?.navigate('Appointments' as never);
            else goto('Pets');
          }} />
        </DashboardSectionState>

        <SectionHeader title="Nearby Veterinary Clinics" rightLabel="Map View" onRightPress={() => goto('Gps')} />
        {dashboard?.locationStatus === 'denied' && !loading && !error ? (
          <StateCard icon="map-marker-off" title="Location permission denied" text="Enable location permission to load nearby veterinary clinics." action="Retry" onPress={() => loadDashboard()} />
        ) : (
          <DashboardSectionState loading={loading} error={error} empty={!dashboard?.nearbyClinics.length} emptyTitle="No nearby clinics" emptyText="No clinic records were returned for your current location." onRetry={() => loadDashboard()}>
            <NearbyClinicCard
              clinics={dashboard?.nearbyClinics ?? []}
              onCall={id => {
                const clinic = dashboard?.nearbyClinics.find(item => item.id === id);
                if (clinic?.phone) clinicService.callClinic(clinic.phone).catch(() => Alert.alert('Error', 'Unable to call clinic.'));
                else goto('Emergency');
              }}
              onNavigate={id => {
                const clinic = dashboard?.nearbyClinics.find(item => item.id === id);
                if (clinic?.latitude && clinic?.longitude) clinicService.openMaps(clinic.latitude, clinic.longitude, clinic.name).catch(() => goto('Gps'));
                else goto('Gps');
              }}
              onBook={() => navigation.getParent()?.navigate('Appointments' as never)}
            />
          </DashboardSectionState>
        )}

        <SectionHeader title="Offers & Promotions" rightLabel="See All" onRightPress={() => navigation.getParent()?.navigate('Shop' as never)} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.offers.length} emptyTitle="No offers available" emptyText="Shop offers will appear when products are available." onRetry={() => loadDashboard()}>
          <OffersSlider offers={dashboard?.offers ?? []} onPress={offer => {
            if (offer.targetType === 'shop') navigation.getParent()?.navigate('Shop' as never);
            else if (offer.targetType === 'appointment') navigation.getParent()?.navigate('Appointments' as never);
            else if (offer.targetType === 'ai') goto('AiAssistant');
            else if (offer.targetType === 'vaccination') goto('Vaccination');
          }} />
        </DashboardSectionState>

        <SectionHeader title="Achievements" rightLabel="All Badges" onRightPress={() => navigation.getParent()?.navigate('Profile' as never)} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.achievements.length} emptyTitle="No achievements yet" emptyText="Achievements will appear after real pet care activity is saved." onRetry={() => loadDashboard()}>
          <AchievementsCard achievements={dashboard?.achievements ?? []} />
        </DashboardSectionState>

        <SectionHeader title="Community Feed" rightLabel="Join" onRightPress={() => goto('Community')} />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.communityPosts.length} emptyTitle="No community posts" emptyText="Community activity will appear when posts are available." onRetry={() => loadDashboard()}>
          <CommunityPreview posts={dashboard?.communityPosts ?? []} onPost={() => goto('Community')} onViewAll={() => goto('Community')} />
        </DashboardSectionState>

        <SectionHeader title="Pet Care Tips" />
        <DashboardSectionState loading={loading} error={error} empty={!dashboard?.careTips.length} emptyTitle="No personalized tips" emptyText="Personalized care tips will appear when pet health data is available." onRetry={() => loadDashboard()}>
          <View style={styles.tipStack}>
            {(dashboard?.careTips ?? []).map(tip => (
              <StateCard key={tip.id} icon={tip.icon as keyof typeof MaterialCommunityIcons.glyphMap} title={tip.title} text={tip.text} />
            ))}
          </View>
        </DashboardSectionState>

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      <Animated.View style={[styles.fabWrapper, { transform: [{ scale: aiFabPulse }] }]}> 
        <Pressable style={styles.fab} onPress={() => goto('AiAssistant')} android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true, radius: 36 }}>
          <View style={styles.fabGlow} />
          <MaterialCommunityIcons name="robot" size={28} color="#fff" />
          <Text style={styles.fabLabel}>Ask AI</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 6,
    minWidth: 0,
  },
  greetCopy: { flex: 1, minWidth: 0 },
  greetEmoji: { fontSize: 18, fontWeight: '900', color: colors.text },
  greetName: { fontSize: 18, fontWeight: '900', color: colors.text },
  greetSub: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 1 },
  badge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  tipStack: { gap: 10 },
  bottomSpacer: { height: 100 },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: colors.line },
  skeletonLineWide: { width: '76%' },
  skeletonLineMedium: { width: '52%' },
  skeletonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  skeletonChip: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.background },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stateCopy: { flex: 1 },
  stateTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  stateText: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 2 },
  stateButton: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stateButtonText: { fontSize: 12, fontWeight: '900', color: colors.primary },
  fabWrapper: { position: 'absolute', bottom: 28, right: 20 },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  fabGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 38,
    backgroundColor: colors.primary + '25',
  },
  fabLabel: { fontSize: 14, fontWeight: '900', color: '#fff' },
});