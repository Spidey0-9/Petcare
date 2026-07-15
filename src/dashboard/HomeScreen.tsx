import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { RecentActivity } from './components/RecentActivity';
import { RecommendedServices } from './components/RecommendedServices';
import { ReminderCards } from './components/ReminderCards';
import { SearchBar } from './components/SearchBar';
import { SectionHeader } from './components/SectionHeader';
import { WeatherCard } from './components/WeatherCard';
import { WeeklyHealthSummary } from './components/WeeklyHealthSummary';
import { colors, gradients, radii, shadows } from '../core/theme/colors';
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
    { id: 'pets', icon: 'paw' as const, label: 'Add Pet', color: colors.primary, bgColor: colors.primarySoft, onPress: () => nav.navigate('Pets') },
    { id: 'ai', icon: 'robot' as const, label: 'AI Assistant', color: '#6C63FF', bgColor: '#F0EEFF', onPress: () => nav.navigate('AiAssistant') },
    { id: 'appt', icon: 'calendar-plus' as const, label: 'Book Appt', color: '#0EA5E9', bgColor: '#E0F2FE', onPress: () => nav.getParent()?.navigate('Appointments' as never) },
    { id: 'pharmacy', icon: 'pill' as const, label: 'Pharmacy', color: '#EF4444', bgColor: '#FEE2E2', onPress: () => nav.navigate('Pharmacy') },
    { id: 'shop', icon: 'shopping' as const, label: 'Pet Store', color: '#EC4899', bgColor: '#FDF2F8', onPress: () => nav.getParent()?.navigate('Shop' as never) },
    { id: 'nutrition', icon: 'food-apple' as const, label: 'Nutrition', color: '#8BC34A', bgColor: '#F1F8E9', onPress: () => nav.navigate('Nutrition') },
    { id: 'grooming', icon: 'content-cut' as const, label: 'Grooming', color: '#F472B6', bgColor: '#FDF2F8', onPress: () => nav.navigate('Grooming') },
    { id: 'records', icon: 'file-document' as const, label: 'Medical Records', color: '#8B5CF6', bgColor: '#F3E8FF', onPress: () => nav.navigate('Reports') },
    { id: 'community', icon: 'account-group' as const, label: 'Community', color: '#14B8A6', bgColor: '#F0FDFA', onPress: () => nav.navigate('Community') },
    { id: 'emergency', icon: 'ambulance' as const, label: 'Emergency', color: colors.danger, bgColor: colors.dangerSoft, onPress: () => nav.navigate('Emergency') },
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

function greetingLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function currentDateLabel() {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());
}

function petAgeLabel(pet?: HomeDashboardData['selectedPet']) {
  if (!pet) return 'Age not set';
  if (typeof pet.age === 'number') return `${pet.age} ${pet.age === 1 ? 'year' : 'years'}`;
  if (!pet.date_of_birth) return 'Age not set';
  const dob = new Date(pet.date_of_birth);
  if (Number.isNaN(dob.getTime())) return 'Age not set';
  const now = new Date();
  const months = Math.max(0, (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth());
  if (months < 12) return `${Math.max(1, months)} mo`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

function petGenderLabel(value?: string | null) {
  if (!value) return 'Gender not set';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function healthStatus(score?: number | null) {
  const value = score ?? 0;
  if (value >= 85) return 'Excellent';
  if (value >= 70) return 'Healthy';
  if (value >= 50) return 'Watch';
  return 'Needs care';
}

function metricValue(metrics: HomeDashboardData['healthMetrics'], id: string, fallback: string) {
  const metric = metrics.find(item => item.id === id);
  if (!metric) return fallback;
  return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`;
}

function metricProgress(metrics: HomeDashboardData['healthMetrics'], id: string, fallback = 0) {
  return Math.max(0, Math.min(1, metrics.find(item => item.id === id)?.progress ?? fallback));
}

function upcomingVaccination(reminders: HomeReminderSummary[]) {
  return reminders.find(item => item.type === 'vaccination')?.displayTime ?? 'No due vaccine';
}

const HEADER_EXPANDED_HEIGHT = 334;
const HEADER_COLLAPSED_HEIGHT = 88;
const HEADER_COLLAPSE_DISTANCE = 190;

function vaccinationLabel(value?: string | null) {
  if (!value) return 'Vaccines pending';
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function petIconName(pet?: HomeDashboardData['selectedPet']): keyof typeof MaterialCommunityIcons.glyphMap {
  const species = (pet?.species ?? '').toLowerCase();
  if (species.includes('cat')) return 'cat';
  if (species.includes('bird')) return 'bird';
  return 'dog';
}

function PremiumHeader({
  dashboard,
  loading,
  error,
  selectedPet,
  scrollY,
  onMenu,
  onNotifications,
  onRetry,
  onPetSelect,
  onAddPet,
}: {
  dashboard: HomeDashboardData | null;
  loading: boolean;
  error: string | null;
  selectedPet: HomeDashboardData['selectedPet'];
  scrollY: Animated.Value;
  onMenu: () => void;
  onNotifications: () => void;
  onRetry: () => void;
  onPetSelect: (petId: string) => void;
  onAddPet: () => void;
}) {
  const name = displayName(dashboard);
  const initial = name.trim().charAt(0).toUpperCase() || 'P';
  const score = selectedPet?.healthScore ?? 0;
  const compactTitle = selectedPet?.name ?? 'My Pets';
  const compactStatus = selectedPet ? healthStatus(score) : 'Add pet';

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [HEADER_EXPANDED_HEIGHT, HEADER_COLLAPSED_HEIGHT],
    extrapolate: 'clamp',
  });
  const expandedOpacity = scrollY.interpolate({
    inputRange: [0, 80, HEADER_COLLAPSE_DISTANCE],
    outputRange: [1, 0.38, 0],
    extrapolate: 'clamp',
  });
  const expandedTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_COLLAPSE_DISTANCE],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });
  const compactOpacity = scrollY.interpolate({
    inputRange: [68, HEADER_COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const compactTranslate = scrollY.interpolate({
    inputRange: [68, HEADER_COLLAPSE_DISTANCE],
    outputRange: [16, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.collapsibleHeader, { height: headerHeight }]}> 
      <LinearGradient colors={gradients.app} style={styles.heroGradient}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <Animated.View style={[styles.expandedHeaderContent, { opacity: expandedOpacity, transform: [{ translateY: expandedTranslate }] }]}> 
          <View style={styles.heroTopRow}>
            <Pressable style={styles.headerIconBtn} onPress={onMenu} android_ripple={{ color: colors.primarySoft, borderless: true, radius: 24 }}>
              <MaterialCommunityIcons name="menu" size={26} color={colors.text} />
            </Pressable>

            <View style={styles.heroCopy}>
              <Text style={styles.heroGreeting}>{greetingLabel()} <Text style={styles.heroWave}>Hi</Text></Text>
              <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
              <Text style={styles.heroDate}>{currentDateLabel()}</Text>
            </View>

            <Pressable style={styles.headerIconBtn} onPress={onNotifications} android_ripple={{ color: colors.primarySoft, borderless: true, radius: 24 }}>
              <MaterialCommunityIcons name="bell-outline" size={23} color={colors.text} />
              {!!dashboard?.reminders.length && <View style={styles.badge} />}
            </Pressable>

            <ProfileAvatar avatarUrl={dashboard?.profile?.avatar_url} initial={initial} />
          </View>

          <View style={styles.petRailHeader}>
            <View>
              <Text style={styles.petPanelEyebrow}>Your pet family</Text>
              <Text style={styles.petPanelTitle}>{selectedPet ? selectedPet.name : 'My Pets'}</Text>
            </View>
            {selectedPet ? (
              <View style={styles.petStatusPill}>
                <MaterialCommunityIcons name="heart-pulse" size={13} color={colors.primaryDark} />
                <Text style={styles.petStatusText}>{healthStatus(selectedPet.healthScore)}</Text>
              </View>
            ) : null}
          </View>

          <DashboardSectionState loading={loading} error={error} empty={!dashboard?.pets.length} emptyTitle="No pets yet" emptyText="Add your first pet to personalize the dashboard." onRetry={onRetry}>
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={190}
              decelerationRate="fast"
              contentContainerStyle={styles.premiumPetRail}
            >
              {(dashboard?.pets ?? []).map((pet, index) => (
                <PremiumPetCard key={pet.id} pet={pet} index={index} selected={pet.id === selectedPet?.id} onPress={() => onPetSelect(pet.id)} />
              ))}
              <Pressable style={styles.addPetCard} onPress={onAddPet}>
                <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
                <Text style={styles.addPetText}>Add Pet</Text>
              </Pressable>
            </Animated.ScrollView>
          </DashboardSectionState>
        </Animated.View>

        <Animated.View style={[styles.compactHeaderContent, { opacity: compactOpacity, transform: [{ translateY: compactTranslate }] }]}> 
          <Pressable style={styles.compactPetSelector} onPress={() => selectedPet && onPetSelect(selectedPet.id)}>
            <View style={styles.compactPetAvatar}>
              {selectedPet?.image_url ? <Image source={{ uri: selectedPet.image_url }} style={styles.compactPetImage} /> : <MaterialCommunityIcons name={petIconName(selectedPet)} size={24} color={colors.primary} />}
            </View>
            <View style={styles.compactPetCopy}>
              <View style={styles.compactNameRow}>
                <Text style={styles.compactPetName} numberOfLines={1}>{compactTitle}</Text>
                <MaterialCommunityIcons name="chevron-down" size={16} color={colors.muted} />
              </View>
              <Text style={styles.compactPetStatus} numberOfLines={1}>{compactStatus}</Text>
            </View>
            <View style={styles.compactScorePill}>
              <MaterialCommunityIcons name="heart-pulse" size={14} color={colors.primaryDark} />
              <Text style={styles.compactScoreText}>{score}%</Text>
            </View>
          </Pressable>

          <Pressable style={styles.compactIconBtn} onPress={onNotifications} android_ripple={{ color: colors.primarySoft, borderless: true, radius: 22 }}>
            <MaterialCommunityIcons name="bell-outline" size={21} color={colors.text} />
            {!!dashboard?.reminders.length && <View style={styles.compactBadge} />}
          </Pressable>
          <ProfileAvatar avatarUrl={dashboard?.profile?.avatar_url} initial={initial} compact />
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

function ProfileAvatar({ avatarUrl, initial, compact = false }: { avatarUrl?: string | null; initial: string; compact?: boolean }) {
  return (
    <View style={compact ? styles.compactAvatarBubble : styles.avatarBubble}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <Text style={compact ? styles.compactAvatarInitial : styles.avatarInitial}>{initial}</Text>
      )}
    </View>
  );
}

function PremiumPetCard({ pet, index, selected, onPress }: { pet: NonNullable<HomeDashboardData['pets']>[number]; index: number; selected: boolean; onPress: () => void }) {
  const palette = [
    { color: colors.primary, bg: colors.primarySoft },
    { color: colors.accent, bg: colors.accentSoft },
    { color: '#EC4899', bg: '#FDF2F8' },
    { color: colors.secondary, bg: colors.secondarySoft },
  ][index % 4];

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.premiumPetCard, selected ? styles.premiumPetCardSelected : styles.premiumPetCardIdle, { transform: [{ scale: selected ? 1 : 0.94 }] }]}> 
        <View style={[styles.premiumPetImageWrap, { backgroundColor: palette.bg }]}> 
          {pet.image_url ? <Image source={{ uri: pet.image_url }} style={styles.premiumPetImage} /> : <MaterialCommunityIcons name={petIconName(pet)} size={42} color={palette.color} />}
          <View style={[styles.petCardScore, { backgroundColor: palette.bg }]}> 
            <Text style={[styles.petCardScoreText, { color: palette.color }]}>{pet.healthScore}%</Text>
          </View>
        </View>
        <Text style={[styles.premiumPetName, selected && { color: palette.color }]} numberOfLines={1}>{pet.name}</Text>
        <Text style={styles.premiumPetBreed} numberOfLines={1}>{pet.breed || pet.species || 'Pet profile'}</Text>
        <View style={styles.premiumPetMetaRow}>
          <Text style={styles.premiumPetMeta}>{petAgeLabel(pet)}</Text>
          <Text style={styles.premiumPetMeta}>{petGenderLabel(pet.gender)}</Text>
        </View>
        <View style={styles.premiumPetStatusRow}>
          <View style={[styles.petHealthDot, { backgroundColor: palette.color }]} />
          <Text style={styles.premiumPetStatus} numberOfLines={1}>{healthStatus(pet.healthScore)}</Text>
        </View>
        <Text style={styles.premiumPetVaccine} numberOfLines={1}>{vaccinationLabel(pet.vaccination_status)}</Text>
      </Animated.View>
    </Pressable>
  );
}
function HomeKpiGrid({ dashboard, selectedPet, reminders }: { dashboard: HomeDashboardData | null; selectedPet: HomeDashboardData['selectedPet']; reminders: HomeReminderSummary[] }) {
  const nextAppointment = dashboard?.nextAppointment;
  const groomingReminder = reminders.find(reminder => reminder.type === 'grooming');
  const medicineReminder = reminders.find(reminder => reminder.type === 'medicine');
  const vaccineReminder = reminders.find(reminder => reminder.type === 'vaccination');
  const nutritionMetric = dashboard?.healthMetrics.find(metric => metric.id === 'health');
  const aiReady = Boolean(dashboard?.latestPrediction?.result || dashboard?.latestPrediction?.prompt);
  const cards = [
    { id: 'health', icon: 'heart-pulse' as const, label: 'Health Score', value: selectedPet ? `${selectedPet.healthScore}%` : '--', helper: selectedPet ? healthStatus(selectedPet.healthScore) : 'Add pet', color: colors.primary },
    { id: 'appointment', icon: 'calendar-heart' as const, label: 'Upcoming Appointment', value: nextAppointment ? formatAppointmentTime(nextAppointment.scheduledAt) : 'None', helper: nextAppointment ? formatAppointmentDate(nextAppointment.scheduledAt) : 'Book visit', color: '#0EA5E9' },
    { id: 'grooming', icon: 'content-cut' as const, label: 'Upcoming Grooming', value: groomingReminder?.displayTime ?? 'None', helper: groomingReminder?.title ?? 'No grooming due', color: '#EC4899' },
    { id: 'medicine', icon: 'pill' as const, label: 'Medicines Today', value: medicineReminder ? 'Due' : 'Clear', helper: medicineReminder?.displayTime ?? 'No medicine reminders', color: '#EF4444' },
    { id: 'vaccines', icon: 'needle' as const, label: 'Vaccinations Due', value: vaccineReminder ? 'Due' : 'Clear', helper: vaccineReminder?.displayTime ?? 'No due vaccine', color: '#22C55E' },
    { id: 'nutrition', icon: 'food-apple' as const, label: "Today's Nutrition", value: nutritionMetric ? `${nutritionMetric.value}${nutritionMetric.unit ?? ''}` : 'Track', helper: nutritionMetric?.trend ?? 'No nutrition log', color: colors.accent },
    { id: 'ai', icon: 'robot' as const, label: 'AI Health Status', value: aiReady ? 'Ready' : 'Empty', helper: aiReady ? 'Latest insight available' : 'Ask AI assistant', color: '#8B5CF6' },
  ];

  return (
    <View style={styles.kpiGrid}>
      {cards.map((card, index) => <HomeKpiCard key={card.id} card={card} index={index} />)}
    </View>
  );
}

function HomeKpiCard({ card, index }: { card: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; helper: string; color: string }; index: number }) {
  const scale = useRef(new Animated.Value(0.96)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 8, delay: index * 35, useNativeDriver: true }).start();
  }, [index, scale]);

  return (
    <Animated.View style={[styles.kpiCard, { transform: [{ scale }] }]}>
      <View style={[styles.kpiIcon, { backgroundColor: card.color + '18' }]}>
        <MaterialCommunityIcons name={card.icon} size={18} color={card.color} />
      </View>
      <Text style={styles.kpiLabel} numberOfLines={1}>{card.label}</Text>
      <Text style={styles.kpiValue} numberOfLines={1}>{card.value}</Text>
      <Text style={styles.kpiHelper} numberOfLines={1}>{card.helper}</Text>
    </Animated.View>
  );
}
function HealthOverviewCard({
  pet,
  metrics,
  reminders,
  onPress,
}: {
  pet: HomeDashboardData['selectedPet'];
  metrics: HomeDashboardData['healthMetrics'];
  reminders: HomeReminderSummary[];
  onPress: () => void;
}) {
  const score = pet?.healthScore ?? 0;
  const ringSize = 132;
  const progressSize = Math.max(42, Math.min(ringSize, 42 + score * 0.9));
  const weightValue = pet?.weight ? `${pet.weight} kg` : metricValue(metrics, 'weight', 'Not tracked');
  const vaccination = metricValue(metrics, 'vaccines', '0 %');
  const medical = metricValue(metrics, 'medical', '0 %');
  const activity = metricValue(metrics, 'reminders', '0 active');

  return (
    <Pressable style={styles.healthCard} onPress={onPress}>
      <View style={styles.healthCardTop}>
        <View>
          <Text style={styles.healthEyebrow}>Health Overview</Text>
          <Text style={styles.healthTitle}>{pet ? `${pet.name}'s wellness` : 'Pet wellness'}</Text>
          <Text style={styles.healthSubtitle}>{pet ? `${petAgeLabel(pet)} - ${petGenderLabel(pet.gender)}` : 'Complete a pet profile to unlock insights'}</Text>
        </View>
        <View style={styles.healthBadge}>
          <MaterialCommunityIcons name="shield-check" size={15} color={colors.primaryDark} />
          <Text style={styles.healthBadgeText}>{healthStatus(score)}</Text>
        </View>
      </View>

      <View style={styles.healthMainRow}>
        <View style={[styles.scoreRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}> 
          <View style={[styles.scoreRingProgress, { width: progressSize, height: progressSize, borderRadius: progressSize / 2 }]} />
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>
        <View style={styles.healthStatsGrid}>
          <HealthMiniStat icon="scale-bathroom" label="Weight" value={weightValue} color={colors.secondary} />
          <HealthMiniStat icon="needle" label="Vaccines" value={vaccination} color={colors.success} />
          <HealthMiniStat icon="calendar-clock" label="Next Vaccine" value={upcomingVaccination(reminders)} color={colors.accent} />
          <HealthMiniStat icon="file-document" label="Medical" value={medical} color="#8B5CF6" />
        </View>
      </View>

      <View style={styles.wellnessStrip}>
        <WellnessPill label="Activity" value={activity} percent={metricProgress(metrics, 'reminders', 0.35)} />
        <WellnessPill label="Nutrition" value="Live" percent={metricProgress(metrics, 'health', score / 100)} />
        <WellnessPill label="Hydration" value="Track" percent={metricProgress(metrics, 'weight', 0.25)} />
      </View>
    </Pressable>
  );
}

function HealthMiniStat({ icon, label, value, color }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={styles.healthMiniStat}>
      <View style={[styles.healthMiniIcon, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.healthMiniLabel}>{label}</Text>
      <Text style={styles.healthMiniValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function WellnessPill({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <View style={styles.wellnessPill}>
      <View style={styles.wellnessBar}>
        <View style={[styles.wellnessFill, { width: `${Math.round(Math.max(0.08, Math.min(1, percent)) * 100)}%` }]} />
      </View>
      <Text style={styles.wellnessLabel}>{label}</Text>
      <Text style={styles.wellnessValue}>{value}</Text>
    </View>
  );
}

function PremiumFeatureGrid({ actions }: { actions: ReturnType<typeof buildQuickActions> }) {
  const wanted = ['nutrition', 'pharmacy', 'grooming', 'records'];
  const cards = wanted.map(id => actions.find(action => action.id === id)).filter((item): item is ReturnType<typeof buildQuickActions>[number] => Boolean(item));

  return (
    <View style={styles.featureGrid}>
      {cards.map((action, index) => (
        <Pressable key={action.id} style={styles.featureCard} onPress={action.onPress} android_ripple={{ color: action.color + '24' }}>
          <LinearGradient colors={index % 2 === 0 ? gradients.glass : gradients.premium} style={styles.featureGradient}>
            <View style={[styles.featureIcon, { backgroundColor: index % 2 === 0 ? action.bgColor : 'rgba(255,255,255,0.22)' }]}>
              <MaterialCommunityIcons name={action.icon} size={25} color={index % 2 === 0 ? action.color : '#fff'} />
            </View>
            <Text style={[styles.featureTitle, index % 2 !== 0 && styles.featureTitleLight]}>{action.label}</Text>
            <Text style={[styles.featureSubtitle, index % 2 !== 0 && styles.featureSubtitleLight]}>{featureSubtitle(action.id)}</Text>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}

function featureSubtitle(id: string) {
  if (id === 'nutrition') return 'Meal plans and diet score';
  if (id === 'pharmacy') return 'Medicines and pet care';
  if (id === 'grooming') return 'Book grooming services';
  return 'Reports and prescriptions';
}

function FloatingActionSheet({ actions }: { actions: ReturnType<typeof buildQuickActions> }) {
  const [open, setOpen] = useState(false);
  const actionMap = new Map(actions.map(action => [action.id, action]));
  const sheetActions = [
    { id: 'add-pet', label: 'Add Pet', icon: 'paw' as const, action: actionMap.get('pets') },
    { id: 'book-appt', label: 'Book Appointment', icon: 'calendar-plus' as const, action: actionMap.get('appt') },
    { id: 'book-grooming', label: 'Book Grooming', icon: 'content-cut' as const, action: actionMap.get('grooming') },
    { id: 'scan-report', label: 'Scan Medical Report', icon: 'file-document' as const, action: actionMap.get('records') },
    { id: 'emergency', label: 'Emergency', icon: 'ambulance' as const, action: actionMap.get('emergency') },
  ];

  return (
    <View style={styles.fabCluster} pointerEvents="box-none">
      {open ? (
        <View style={styles.fabSheet}>
          {sheetActions.map(item => (
            <Pressable
              key={item.id}
              style={styles.fabSheetItem}
              onPress={() => {
                setOpen(false);
                item.action?.onPress();
              }}
            >
              <MaterialCommunityIcons name={item.icon} size={18} color={colors.primaryDark} />
              <Text style={styles.fabSheetText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable style={styles.centerFab} onPress={() => setOpen(value => !value)}>
        <LinearGradient colors={gradients.warm} style={styles.centerFabGradient}>
          <MaterialCommunityIcons name={open ? 'close' : 'plus'} size={30} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
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
  const scrollY = useRef(new Animated.Value(0)).current;
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
  const handlePetSelect = useCallback((petId: string) => {
    setDashboard(previous => {
      if (!previous) return previous;
      const nextPet = previous.pets.find(pet => pet.id === petId) ?? previous.selectedPet;
      if (!nextPet || nextPet.id === previous.selectedPet?.id) return previous;
      return { ...previous, selectedPet: nextPet };
    });
  }, []);
  const aiInsights = useMemo<AIInsightItem[]>(() => {
    const prediction = dashboard?.latestPrediction;
    if (!prediction?.result && !prediction?.prompt) return [];
    return [{ id: prediction.id ?? 'latest-ai', icon: 'robot', color: '#6C63FF', text: prediction.result || prediction.prompt }];
  }, [dashboard?.latestPrediction]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}> 
      <PremiumHeader
        dashboard={dashboard}
        loading={loading}
        error={error}
        selectedPet={selectedPet}
        scrollY={scrollY}
        onMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
        onNotifications={() => goto('Notifications')}
        onRetry={() => loadDashboard()}
        onPetSelect={handlePetSelect}
        onAddPet={() => goto('Pets')}
      />

      <Animated.ScrollView
        style={[styles.scroll, { opacity: pageFade }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        <HomeKpiGrid dashboard={dashboard} selectedPet={selectedPet} reminders={dashboard?.reminders ?? []} />
        <SearchBar onSearch={query => { if (query.trim()) navigation.getParent()?.navigate('Shop' as never); }} />
        <EmergencyBanner onFindHospital={() => goto('Gps')} onCallVet={() => goto('Emergency')} />


        <SectionHeader title="Pet Health Overview" rightLabel="Report" onRightPress={() => goto('HealthReport')} />
        <DashboardSectionState loading={loading} error={error} empty={!selectedPet} emptyTitle="No health summary" emptyText="Complete a pet profile to calculate health status." onRetry={() => loadDashboard()}>
          <HealthOverviewCard pet={selectedPet} metrics={dashboard?.healthMetrics ?? []} reminders={dashboard?.reminders ?? []} onPress={() => goto('Pets')} />
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

        <SectionHeader title="Explore Care" />
        <PremiumFeatureGrid actions={quickActions} />

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

      <Animated.View style={[styles.fabCenterWrapper, { transform: [{ scale: aiFabPulse }] }]}> 
        <FloatingActionSheet actions={quickActions} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  collapsibleHeader: {
    zIndex: 3,
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: colors.background,
    ...shadows.soft,
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    overflow: 'hidden',
  },
  expandedHeaderContent: { flex: 1 },
  compactHeaderContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    minHeight: 62,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...shadows.soft,
  },
  compactPetSelector: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactPetAvatar: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  compactPetImage: { width: '100%', height: '100%' },
  compactPetCopy: { flex: 1, minWidth: 0 },
  compactNameRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  compactPetName: { flexShrink: 1, fontSize: 15, fontWeight: '900', color: colors.text },
  compactPetStatus: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 2 },
  compactScorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 7 },
  compactScoreText: { fontSize: 12, fontWeight: '900', color: colors.primaryDark },
  compactIconBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.05)', alignItems: 'center', justifyContent: 'center' },
  compactBadge: { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface },
  compactAvatarBubble: { width: 42, height: 42, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  compactAvatarInitial: { fontSize: 15, fontWeight: '900', color: '#fff' },
  petRailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10, gap: 12 },
  premiumPetRail: { gap: 12, paddingRight: 20, paddingBottom: 10, paddingTop: 2 },
  premiumPetCard: {
    width: 178,
    minHeight: 196,
    borderRadius: 24,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 22,
    elevation: 5,
  },
  premiumPetCardSelected: { borderColor: colors.primary + '77', backgroundColor: 'rgba(255,255,255,0.86)' },
  premiumPetCardIdle: { opacity: 0.82 },
  premiumPetImageWrap: { height: 82, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 9 },
  premiumPetImage: { width: '100%', height: '100%' },
  petCardScore: { position: 'absolute', right: 8, bottom: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  petCardScoreText: { fontSize: 11, fontWeight: '900' },
  premiumPetName: { fontSize: 16, fontWeight: '900', color: colors.text },
  premiumPetBreed: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 2 },
  premiumPetMetaRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  premiumPetMeta: { flex: 1, fontSize: 10, fontWeight: '900', color: colors.muted, backgroundColor: 'rgba(15,23,42,0.04)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, textAlign: 'center' },
  premiumPetStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  petHealthDot: { width: 8, height: 8, borderRadius: 4 },
  premiumPetStatus: { flex: 1, fontSize: 12, fontWeight: '900', color: colors.primaryDark },
  premiumPetVaccine: { fontSize: 10, fontWeight: '800', color: colors.muted, marginTop: 3 },
  addPetCard: { width: 120, minHeight: 196, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary + '66', backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addPetText: { fontSize: 12, fontWeight: '900', color: colors.primary },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  kpiCard: { width: '48%', minHeight: 116, borderRadius: 22, padding: 14, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', ...shadows.soft },
  kpiIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiLabel: { fontSize: 11, fontWeight: '900', color: colors.muted },
  kpiValue: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 3 },
  kpiHelper: { fontSize: 11, fontWeight: '800', color: colors.muted, marginTop: 3 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroGlowOne: {
    position: 'absolute',
    top: -70,
    right: -52,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(20,184,166,0.18)',
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -95,
    left: -70,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(249,115,22,0.12)',
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  heroCopy: { flex: 1, minWidth: 0, paddingLeft: 2 },
  heroGreeting: { fontSize: 13, fontWeight: '800', color: colors.muted },
  heroWave: { color: colors.accent },
  heroName: { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 1 },
  heroDate: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 2 },
  avatarBubble: {
    width: 46,
    height: 46,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: 18, fontWeight: '900', color: '#fff' },
  badge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  petCarouselPanel: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: radii.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.84)',
  },
  petPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 },
  petPanelEyebrow: { fontSize: 11, fontWeight: '900', color: colors.primaryDark, textTransform: 'uppercase' },
  petPanelTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 2 },
  petStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  petStatusText: { fontSize: 11, fontWeight: '900', color: colors.primaryDark },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  tipStack: { gap: 10 },
  bottomSpacer: { height: 120 },
  skeletonCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radii.xl,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  skeletonLine: { height: 14, borderRadius: 7, backgroundColor: colors.line },
  skeletonLineWide: { width: '76%' },
  skeletonLineMedium: { width: '52%' },
  skeletonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  skeletonChip: { flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.background },
  stateCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radii.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  stateCopy: { flex: 1 },
  stateTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  stateText: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 2, lineHeight: 17 },
  stateButton: { backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  stateButtonText: { fontSize: 12, fontWeight: '900', color: colors.primaryDark },
  healthCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.16)',
    ...shadows.premium,
  },
  healthCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  healthEyebrow: { fontSize: 11, fontWeight: '900', color: colors.primaryDark, textTransform: 'uppercase' },
  healthTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4 },
  healthSubtitle: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 3 },
  healthBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  healthBadgeText: { fontSize: 11, fontWeight: '900', color: colors.primaryDark },
  healthMainRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
  scoreRing: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderWidth: 10, borderColor: 'rgba(16,185,129,0.18)' },
  scoreRingProgress: { position: 'absolute', backgroundColor: 'rgba(16,185,129,0.14)' },
  scoreValue: { fontSize: 32, fontWeight: '900', color: colors.primaryDark },
  scoreLabel: { fontSize: 11, fontWeight: '900', color: colors.muted, marginTop: -2 },
  healthStatsGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthMiniStat: { width: '47%', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: 'rgba(15,23,42,0.05)' },
  healthMiniIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  healthMiniLabel: { fontSize: 10, fontWeight: '800', color: colors.muted },
  healthMiniValue: { fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 2 },
  wellnessStrip: { flexDirection: 'row', gap: 8, marginTop: 16 },
  wellnessPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.68)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(15,23,42,0.05)' },
  wellnessBar: { height: 5, borderRadius: 999, backgroundColor: colors.line, overflow: 'hidden', marginBottom: 8 },
  wellnessFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  wellnessLabel: { fontSize: 10, fontWeight: '900', color: colors.muted },
  wellnessValue: { fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 2 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { width: '48%', minHeight: 146, borderRadius: radii.xl, overflow: 'hidden', ...shadows.soft },
  featureGradient: { flex: 1, padding: 16, justifyContent: 'space-between', borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  featureIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  featureTitleLight: { color: '#fff' },
  featureSubtitle: { fontSize: 12, fontWeight: '700', color: colors.muted, lineHeight: 17 },
  featureSubtitleLight: { color: 'rgba(255,255,255,0.86)' },
  fabCenterWrapper: { position: 'absolute', bottom: 84, left: 0, right: 0, alignItems: 'center' },
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
  fabGlow: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 38, backgroundColor: colors.primary + '25' },
  fabLabel: { fontSize: 14, fontWeight: '900', color: '#fff' },
  fabCluster: { alignItems: 'center' },
  fabSheet: { marginBottom: 12, backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 10, gap: 6, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  fabSheetItem: { minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.68)' },
  fabSheetText: { fontSize: 13, fontWeight: '900', color: colors.text },
  centerFab: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', ...shadows.premium },
  centerFabGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
