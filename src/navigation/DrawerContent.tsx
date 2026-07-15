import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts';
import { colors, gradients, radii, shadows } from '../core/theme/colors';

type DrawerTarget =
  | { kind: 'home'; screen: string }
  | { kind: 'tab'; tab: string; params?: Record<string, unknown> }
  | { kind: 'profile'; screen: string }
  | { kind: 'logout' };

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  group: 'Care' | 'Services' | 'Account' | 'Legal';
  target: DrawerTarget;
  isDanger?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'Home', label: 'Home', icon: 'home-variant', color: colors.primary, group: 'Care', target: { kind: 'home', screen: 'HomeMain' } },
  { key: 'Pets', label: 'My Pets', icon: 'paw', color: '#FF8F00', group: 'Care', target: { kind: 'home', screen: 'Pets' } },
  { key: 'Appointments', label: 'Appointments', icon: 'calendar-heart', color: '#0EA5E9', group: 'Care', target: { kind: 'tab', tab: 'Appointments' } },
  { key: 'Doctors', label: 'Doctors', icon: 'doctor', color: '#06B6D4', group: 'Care', target: { kind: 'tab', tab: 'Appointments' } },
  { key: 'Hospitals', label: 'Hospitals', icon: 'hospital-building', color: '#F59E0B', group: 'Care', target: { kind: 'home', screen: 'Gps' } },
  { key: 'Grooming', label: 'Nearby Groomers', icon: 'content-cut', color: '#EC4899', group: 'Services', target: { kind: 'home', screen: 'Grooming' } },
  { key: 'Pharmacy', label: 'Pharmacy', icon: 'pill', color: '#EF4444', group: 'Services', target: { kind: 'home', screen: 'Pharmacy' } },
  { key: 'Nutrition', label: 'Nutrition', icon: 'food-apple', color: colors.accent, group: 'Services', target: { kind: 'home', screen: 'Nutrition' } },
  { key: 'Reports', label: 'Medical Records', icon: 'file-document', color: '#8B5CF6', group: 'Services', target: { kind: 'home', screen: 'Reports' } },
  { key: 'Community', label: 'Community', icon: 'account-group', color: '#14B8A6', group: 'Services', target: { kind: 'home', screen: 'Community' } },
  { key: 'AiAssistant', label: 'AI Assistant', icon: 'robot', color: '#6C63FF', group: 'Services', target: { kind: 'home', screen: 'AiAssistant' } },
  { key: 'Notifications', label: 'Notifications', icon: 'bell-outline', color: colors.primaryDark, group: 'Account', target: { kind: 'home', screen: 'Notifications' } },
  { key: 'Payments', label: 'Payments', icon: 'credit-card-outline', color: '#0EA5E9', group: 'Account', target: { kind: 'home', screen: 'Billing' } },
  { key: 'Membership', label: 'Membership', icon: 'crown-outline', color: '#F59E0B', group: 'Account', target: { kind: 'profile', screen: 'PremiumMembership' } },
  { key: 'Emergency', label: 'Emergency Contacts', icon: 'ambulance', color: '#DC2626', group: 'Account', target: { kind: 'home', screen: 'Emergency' }, isDanger: true },
  { key: 'Settings', label: 'Settings', icon: 'cog-outline', color: colors.muted, group: 'Account', target: { kind: 'profile', screen: 'ProfileSettings' } },
  { key: 'Help', label: 'Help & Support', icon: 'lifebuoy', color: colors.secondary, group: 'Account', target: { kind: 'profile', screen: 'HelpSupport' } },
  { key: 'Privacy', label: 'Privacy Policy', icon: 'shield-lock-outline', color: colors.muted, group: 'Legal', target: { kind: 'home', screen: 'HomeMain' } },
  { key: 'Terms', label: 'Terms', icon: 'file-sign', color: colors.muted, group: 'Legal', target: { kind: 'home', screen: 'HomeMain' } },
  { key: 'About', label: 'About', icon: 'information-outline', color: colors.muted, group: 'Legal', target: { kind: 'home', screen: 'HomeMain' } },
  { key: 'Logout', label: 'Sign Out', icon: 'logout', color: '#EF4444', group: 'Legal', target: { kind: 'logout' }, isDanger: true },
];

function roleLabel(role?: string | null) {
  if (role === 'doctor') return 'Doctor';
  if (role === 'groomer') return 'Groomer';
  if (role === 'admin' || role === 'super_admin') return 'Super Admin';
  return 'Pet Owner';
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-16)).current;
  const displayName = profile?.full_name?.trim() || 'Pet Parent';
  const displayEmail = profile?.email?.trim() || '';
  const initial = displayName.charAt(0).toUpperCase() || 'P';
  const groups = ['Care', 'Services', 'Account', 'Legal'] as const;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  async function handleLogout() {
    navigation.closeDrawer();
    await signOut();
    (navigation as never as { reset: (state: { index: number; routes: Array<{ name: string }> }) => void }).reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  function navigateTo(target: DrawerTarget) {
    if (target.kind === 'logout') {
      void handleLogout();
      return;
    }
    navigation.closeDrawer();
    if (target.kind === 'tab') {
      (navigation as never as { navigate: (name: string, params?: unknown) => void }).navigate('MainTabs', { screen: target.tab, params: target.params });
      return;
    }
    if (target.kind === 'profile') {
      (navigation as never as { navigate: (name: string, params?: unknown) => void }).navigate('MainTabs', { screen: 'Profile', params: { screen: target.screen } });
      return;
    }
    (navigation as never as { navigate: (name: string, params?: unknown) => void }).navigate('MainTabs', { screen: 'Home', params: { screen: target.screen } });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}> 
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <LinearGradient colors={gradients.dark} style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.avatarShell}>
              {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarInitial}>{initial}</Text>}
            </View>
            <View style={styles.petAvatarShell}>
              <MaterialCommunityIcons name="paw" size={20} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {!!displayEmail && <Text style={styles.email} numberOfLines={1}>{displayEmail}</Text>}
          <View style={styles.profilePills}>
            <View style={styles.profilePill}><MaterialCommunityIcons name="crown-outline" size={12} color="#fff" /><Text style={styles.profilePillText}>Membership</Text></View>
            <View style={styles.profilePill}><MaterialCommunityIcons name="heart-pulse" size={12} color="#fff" /><Text style={styles.profilePillText}>Health --</Text></View>
            <View style={styles.profilePill}><Text style={styles.profilePillText}>{roleLabel(profile?.role)}</Text></View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {groups.map(group => (
          <View key={group} style={styles.groupBlock}>
            <Text style={styles.groupTitle}>{group}</Text>
            {MENU_ITEMS.filter(item => item.group === group).map((item, index) => (
              <DrawerItem key={item.key} item={item} index={index} onPress={() => navigateTo(item.target)} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function DrawerItem({ item, index, onPress }: { item: MenuItem; index: number; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, delay: index * 22, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, delay: index * 22, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, index, scaleAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <Pressable style={styles.item} onPress={onPress} android_ripple={{ color: item.color + '18' }}>
        <View style={[styles.itemIcon, { backgroundColor: item.color + '14' }]}>
          <MaterialCommunityIcons name={item.icon} size={19} color={item.color} />
        </View>
        <Text style={[styles.itemLabel, item.isDanger && { color: item.color }]} numberOfLines={1}>{item.label}</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.muted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 14 },
  headerCard: { borderRadius: radii.xxl, padding: 18, marginTop: 10, overflow: 'hidden', ...shadows.premium },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarShell: { width: 64, height: 64, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.38)' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { color: '#fff', fontSize: 24, fontWeight: '900' },
  petAvatarShell: { width: 44, height: 44, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  name: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 14 },
  email: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '700', marginTop: 3 },
  profilePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  profilePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.16)' },
  profilePillText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  scroll: { flex: 1, marginTop: 14 },
  scrollContent: { paddingBottom: 28 },
  groupBlock: { marginBottom: 16 },
  groupTitle: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 8 },
  item: { minHeight: 48, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 8, ...shadows.soft },
  itemIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '900' },
});
