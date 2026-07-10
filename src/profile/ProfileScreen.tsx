import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '../core/components/AppScreen';
import { app } from '../core/constants/app';
import { authService } from '../services/auth';
import { profileService, type ProfileStats } from '../services/profile';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../core/theme/colors';

type ProfileState = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
  membership: string;
};

type MenuItem = {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  subtitle: string;
  action: () => void;
  isDanger?: boolean;
};

const emptyStats: ProfileStats = {
  totalPets: 0,
  totalOrders: 0,
  totalSpent: 0,
  upcomingAppointments: 0,
  totalPosts: 0,
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function getRootNavigation(navigation: any) {
  let current = navigation;
  while (current?.getParent?.()) current = current.getParent();
  return current;
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const resetSessionState = useAppStore(state => state.resetSessionState);
  const [profile, setProfile] = useState<ProfileState>({
    id: '',
    name: 'PetCare+ User',
    email: '',
    phone: '',
    avatarUrl: null,
    membership: 'Basic Member',
  });
  const [stats, setStats] = useState<ProfileStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    // Gracefully handle missing session — just redirect to Login
    const user = await authService.getCurrentUser();

    if (!user) {
      resetSessionState();
      getRootNavigation(navigation).dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
      );
      return;
    }

    // Profile row is optional — if it doesn't exist yet, use auth metadata
    const savedProfile = await authService.getCurrentProfile();

    setProfile({
      id: user.id,
      name:
        savedProfile?.full_name ||
        (typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : 'PetCare+ User'),
      email: savedProfile?.email || user.email || '',
      phone: savedProfile?.phone || '',
      avatarUrl: savedProfile?.avatar_url || null,
      membership: 'Basic Member',
    });

    // Stats are fully guarded — never crash here
    const nextStats = await profileService.getStats(user.id);
    setStats(nextStats);
  }, [navigation, resetSessionState]);

  const loadProfile = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      await fetchUserProfile();
    } catch (error: any) {
      const message = String(error?.message ?? '').toLowerCase();
      // Only redirect to Login for genuine auth errors
      if (
        message.includes('auth session missing') ||
        message.includes('jwt expired') ||
        message.includes('invalid jwt') ||
        message.includes('not authenticated')
      ) {
        resetSessionState();
        getRootNavigation(navigation).dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
        );
      }
      // For any other error (network, missing table, etc.) just log — don't crash
      console.warn('Profile load error:', error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchUserProfile, navigation, resetSessionState]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChangePhoto = async () => {
    if (!profile.id) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow gallery access to change your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      setUploadingPhoto(true);
      const asset = result.assets[0];
      const avatarUrl = await profileService.uploadProfileImage(profile.id, {
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      setProfile(prev => ({ ...prev, avatarUrl }));
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      Alert.alert('Upload failed', 'Your profile photo could not be updated.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to logout? You will need to sign in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Sign out from Supabase (clears server session)
              await authService.signOut();
            } catch (err) {
              // signOut is safe — it swallows errors internally
              console.warn('[ProfileScreen] signOut error:', err);
            }
            // 2. Clear Zustand store
            resetSessionState();
            // 3. Hard-reset navigation to Login — user cannot go back
            getRootNavigation(navigation).dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
            );
          },
        },
      ],
    );
  }, [navigation, resetSessionState]);

  const menuItems: MenuItem[] = useMemo(() => [
    {
      title: 'My Pets',
      icon: 'paw',
      subtitle: 'Manage profiles, QR codes and passports',
      // Navigate via the Home stack (Pets is registered there)
      action: () => navigation.getParent()?.navigate('Home', { screen: 'Pets' }),
    },
    {
      title: 'My Appointments',
      icon: 'calendar-check',
      subtitle: 'Upcoming, completed and cancelled visits',
      // Appointments is a root tab — navigate from the tab navigator level
      action: () => navigation.getParent()?.navigate('Appointments'),
    },
    {
      title: 'Reminders',
      icon: 'bell-ring',
      subtitle: 'Medication, vaccination and health alerts',
      action: () => navigation.getParent()?.navigate('Home', { screen: 'Reminders' }),
    },
    {
      title: 'Order History',
      icon: 'history',
      subtitle: 'Invoices, tracking and reorders',
      // ProfileStack screens
      action: () => navigation.navigate('OrderHistory'),
    },
    {
      title: 'Payment Methods',
      icon: 'credit-card',
      subtitle: 'Cards, UPI and wallets',
      action: () => navigation.navigate('PaymentMethods'),
    },
    {
      title: 'Settings',
      icon: 'cog',
      subtitle: 'Privacy, permissions and app preferences',
      action: () => navigation.navigate('ProfileSettings'),
    },
    {
      title: 'Help & Support',
      icon: 'help-circle',
      subtitle: 'FAQ, live chat and support tickets',
      action: () => navigation.navigate('HelpSupport'),
    },
    {
      title: 'Edit Profile',
      icon: 'account-edit',
      subtitle: 'Update your name, photo and contact details',
      action: () => navigation.navigate('EditProfile'),
    },
    {
      title: 'Sign Out',
      icon: 'logout',
      subtitle: 'Securely leave this device',
      action: handleLogout,
      isDanger: true,
    },
  ], [navigation, handleLogout]);

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </AppScreen>
    );
  }

  const avatarSource = profile.avatarUrl ? { uri: profile.avatarUrl } : app.petImage;

  return (
    <AppScreen scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} tintColor={colors.primary} />}
      >
        <View style={styles.banner}>
          <Pressable style={styles.avatarButton} onPress={handleChangePhoto} disabled={uploadingPhoto}>
            <Image source={avatarSource} style={styles.avatar} />
            <View style={styles.avatarOverlay}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
              )}
            </View>
          </Pressable>

          <View style={styles.bannerContent}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name="shield-star" size={13} color="#FFFFFF" />
              <Text style={styles.badgeText}>{profile.membership}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>{profile.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{profile.email}</Text>
            {!!profile.phone && <Text style={styles.email} numberOfLines={1}>{profile.phone}</Text>}
          </View>

          <Pressable style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
            <MaterialCommunityIcons name="pencil" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          <StatCard icon="paw" color={colors.primary} value={String(stats.totalPets)} label="Pets" />
          <StatCard icon="shopping" color={colors.secondary} value={String(stats.totalOrders)} label="Orders" />
          <StatCard icon="wallet" color={colors.accent} value={formatMoney(stats.totalSpent)} label="Spent" />
        </View>
        <View style={styles.statsContainer}>
          <StatCard icon="calendar-clock" color="#0EA5E9" value={String(stats.upcomingAppointments)} label="Upcoming" />
          <StatCard icon="post" color="#A855F7" value={String(stats.totalPosts)} label="Posts" />
        </View>

        <View style={styles.membershipCard}>
          <View style={styles.membershipCopy}>
            <Text style={styles.membershipTitle}>Premium Care</Text>
            <Text style={styles.membershipText}>Unlock priority booking, offers and care benefits</Text>
          </View>
          <Pressable style={styles.membershipButton} onPress={() => navigation.navigate('PremiumMembership')}>
            <Text style={styles.membershipButtonText}>Upgrade</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <Pressable key={item.title} style={[styles.menuItem, index === menuItems.length - 1 && styles.lastMenuItem]} onPress={item.action}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuItemIcon, { backgroundColor: item.isDanger ? '#FEE2E2' : index % 2 === 0 ? '#F0EEFF' : '#E3F2FD' }]}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={21}
                    color={item.isDanger ? colors.danger : index % 2 === 0 ? colors.primary : colors.secondary}
                  />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, item.isDanger && { color: colors.danger }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle} numberOfLines={2}>{item.subtitle}</Text>
                </View>
              </View>
              {!item.isDanger && <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function StatCard({ icon, color, value, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={25} color={color} />
      <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  banner: {
    minHeight: 132,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatarButton: {
    width: 78,
    height: 78,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  avatarOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bannerContent: {
    flex: 1,
    minWidth: 0,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  email: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
  },
  editButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statNumber: {
    width: '100%',
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  membershipCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFF8E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 22,
  },
  membershipCopy: {
    flex: 1,
    minWidth: 0,
  },
  membershipTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  membershipText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  membershipButton: {
    minWidth: 96,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membershipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  menuItemIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    minWidth: 0,
  },
  menuItemTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 14,
  },
  menuItemSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});


