import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { authService } from '../services/auth';
import { colors } from '../core/theme/colors';
import type { AuthStackParamList } from '../routes/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Tutorial'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Tutorial page data ────────────────────────────────────────────────────────

type TutorialPage = {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  features: Array<{ icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }>;
};

const PAGES: TutorialPage[] = [
  {
    id: '1',
    icon: 'home-heart',
    iconColor: colors.primary,
    iconBg: '#F0EEFF',
    title: 'Welcome to PetCare+',
    description: 'Your all-in-one app for managing your pet\'s health, appointments, and happiness.',
    features: [
      { icon: 'view-dashboard',      label: 'Dashboard Overview' },
      { icon: 'gesture-swipe',       label: 'Easy Navigation' },
      { icon: 'bell-ring',           label: 'Smart Notifications' },
      { icon: 'account-circle',      label: 'Your Profile' },
    ],
  },
  {
    id: '2',
    icon: 'paw',
    iconColor: '#FF8F00',
    iconBg: '#FFF3E0',
    title: 'Pet Management',
    description: 'Create detailed profiles for every pet, track their health journey from day one.',
    features: [
      { icon: 'plus-circle',         label: 'Add Pet Profiles' },
      { icon: 'passport',            label: 'Digital Pet Passport' },
      { icon: 'needle',              label: 'Vaccination Records' },
      { icon: 'file-document',       label: 'Medical Records' },
      { icon: 'chart-line',          label: 'Growth Chart' },
      { icon: 'scale-bathroom',      label: 'Weight Tracking' },
      { icon: 'chip',                label: 'Microchip Registry' },
    ],
  },
  {
    id: '3',
    icon: 'calendar-month',
    iconColor: '#0EA5E9',
    iconBg: '#E0F2FE',
    title: 'Appointments',
    description: 'Book and manage veterinary appointments, video calls, and emergency care.',
    features: [
      { icon: 'calendar-plus',       label: 'Book Appointment' },
      { icon: 'video',               label: 'Video Consultation' },
      { icon: 'ambulance',           label: 'Emergency SOS' },
      { icon: 'map-marker',          label: 'Nearby Clinics' },
    ],
  },
  {
    id: '4',
    icon: 'account-group',
    iconColor: '#14B8A6',
    iconBg: '#F0FDFA',
    title: 'Community & More',
    description: 'Connect with pet lovers, manage orders, and unlock premium benefits.',
    features: [
      { icon: 'forum',               label: 'Community Posts' },
      { icon: 'bell-badge',          label: 'Notifications' },
      { icon: 'crown',               label: 'Premium Membership' },
      { icon: 'shopping',            label: 'Pet Store' },
    ],
  },
  {
    id: '5',
    icon: 'robot',
    iconColor: '#6C63FF',
    iconBg: '#F0EEFF',
    title: 'AI-Powered Health',
    description: 'Let artificial intelligence help you keep your pets healthy and thriving.',
    features: [
      { icon: 'robot',               label: 'AI Health Assistant' },
      { icon: 'stethoscope',         label: 'Symptom Checker' },
      { icon: 'heart-pulse',         label: 'Health Analytics' },
      { icon: 'lightbulb',           label: 'Personalized Care Tips' },
    ],
  },
  {
    id: '6',
    icon: 'check-decagram',
    iconColor: colors.success,
    iconBg: '#DCFCE7',
    title: 'You\'re All Set!',
    description: 'Congratulations! You\'re ready to give your pets the best care possible with PetCare+.',
    features: [
      { icon: 'star',                label: 'Full Access Unlocked' },
      { icon: 'shield-check',        label: 'Secure & Private' },
      { icon: 'sync',                label: 'Always Up to Date' },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function TutorialScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX  = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const isLast = currentIndex === PAGES.length - 1;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  function pressIn()  { Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true, friction: 8 }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, friction: 6 }).start(); }

  async function handleNext() {
    if (isLast) {
      await finishTutorial();
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }

  async function handleSkip() {
    await finishTutorial();
  }

  async function finishTutorial() {
    const profile = await authService.getCurrentProfile();
    if (!profile?.role) {
      console.warn('[TutorialScreen] Profile role missing after tutorial; redirecting to Login.');
      Alert.alert('Profile Error', 'Unable to load your account profile. Please try again.');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }

    await authService.markTutorialCompleted();
    const role = profile.role;
    const dest = role === 'doctor'
      ? 'DoctorDashboard'
      : role === 'super_admin' || role === 'admin'
        ? 'SuperAdminDashboard'
        : role === 'pet_owner'
          ? 'MainTabs'
          : 'Login';
    navigation.reset({ index: 0, routes: [{ name: dest as any }] });
  }

  function renderPage({ item, index }: { item: TutorialPage; index: number }) {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
    const translateY = scrollX.interpolate({ inputRange, outputRange: [24, 0, 24], extrapolate: 'clamp' });

    return (
      <View style={styles.page}>
        <Animated.View style={[styles.pageInner, { opacity, transform: [{ translateY }] }]}>
          <View style={[styles.pageIcon, { backgroundColor: item.iconBg }]}>
            <MaterialCommunityIcons name={item.icon} size={56} color={item.iconColor} />
          </View>
          <Text style={styles.pageTitle}>{item.title}</Text>
          <Text style={styles.pageDesc}>{item.description}</Text>
          <View style={styles.featureGrid}>
            {item.features.map((feat) => (
              <View key={feat.label} style={styles.featureChip}>
                <MaterialCommunityIcons name={feat.icon} size={16} color={item.iconColor} />
                <Text style={[styles.featureLabel, { color: item.iconColor }]}>{feat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  const currentPage = PAGES[currentIndex];

  return (
    <SafeAreaView style={styles.root}>
      {/* Skip button */}
      {!isLast && (
        <Pressable style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Pager */}
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {/* Bottom navigation */}
      <View style={styles.bottom}>
        {/* Pagination dots */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });
            const dotColor = scrollX.interpolate({
              inputRange: [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH],
              outputRange: [colors.line, currentPage.iconColor, colors.line],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, backgroundColor: dotColor }]}
              />
            );
          })}
        </View>

        {/* Page counter */}
        <Text style={styles.pageCounter}>{currentIndex + 1} / {PAGES.length}</Text>

        {/* CTA button */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            style={[styles.nextBtn, { backgroundColor: currentPage.iconColor }]}
            onPress={handleNext}
            onPressIn={pressIn}
            onPressOut={pressOut}
          >
            {isLast ? (
              <>
                <MaterialCommunityIcons name="rocket-launch" size={20} color="#fff" />
                <Text style={styles.nextBtnText}>Start Exploring</Text>
              </>
            ) : (
              <>
                <Text style={styles.nextBtnText}>Next</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background },
  skipBtn:    { position: 'absolute', top: 52, right: 20, zIndex: 10, paddingHorizontal: 14, paddingVertical: 8 },
  skipText:   { color: colors.muted, fontWeight: '700', fontSize: 14 },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  pageInner: { alignItems: 'center', gap: 16 },
  pageIcon: {
    width: 110,
    height: 110,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  pageTitle: { fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center' },
  pageDesc:  { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 23 },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 4,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  featureLabel:{ fontSize: 12, fontWeight: '700' },
  bottom: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    paddingTop: 12,
    gap: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  dots:       { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot:        { height: 8, borderRadius: 4 },
  pageCounter:{ fontSize: 12, color: colors.muted, fontWeight: '700' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 20,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    minWidth: 200,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
