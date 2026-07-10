import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts';
import { colors } from '../core/theme/colors';

// ── Menu item definition ─────────────────────────────────────────
interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  screen?: string;
  tab?: string;
  isDanger?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'Home',           label: 'Home',               icon: 'home',             color: colors.primary   },
  { key: 'Pets',           label: 'My Pets',            icon: 'paw',              color: '#FF8F00'        },
  { key: 'Appointments',   label: 'Appointments',       icon: 'calendar-month',   color: '#0EA5E9'        },
  { key: 'Reports',        label: 'Medical Records',    icon: 'file-document',    color: '#8B5CF6'        },
  { key: 'Vaccination',    label: 'Vaccination Tracker', icon: 'needle',          color: '#22C55E'        },
  { key: 'AiAssistant',    label: 'AI Health Assistant', icon: 'robot',           color: '#6C63FF'        },
  { key: 'Pharmacy',       label: 'Pharmacy',           icon: 'pill',             color: '#EF4444'        },
  { key: 'Shop',           label: 'Pet Store',          icon: 'shopping',         color: '#EC4899'        },
  { key: 'Community',      label: 'Community',          icon: 'account-group',    color: '#14B8A6'        },
  { key: 'Gps',            label: 'Nearby Clinics',     icon: 'map-marker',       color: '#F59E0B'        },
  { key: 'Emergency',      label: 'Emergency SOS',      icon: 'ambulance',        color: '#DC2626', isDanger: true },
  { key: 'Settings',       label: 'Settings',           icon: 'cog',              color: colors.muted     },
  { key: 'Logout',         label: 'Logout',             icon: 'logout',           color: '#EF4444', isDanger: true },
];

/**
 * Custom Drawer Content
 * - Profile header reads real name/email/role from AuthContext
 * - 13 menu items with icons and active highlight
 * - Animated item press
 * - Logout clears session and navigates back to Login
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8,   useNativeDriver: true }),
    ]).start();
  }, []);

  const activeRouteName = state.routeNames[state.index];

  const displayName  = profile?.full_name?.trim() || 'Pet Owner';
  const displayEmail = profile?.email?.trim()     || '';
  const displayRole  = profile?.role === 'doctor' ? 'Doctor' : 'Pet Owner';

  async function handleLogout() {
    navigation.closeDrawer();
    await signOut();
    // Reset the entire navigation stack back to Login so there is no
    // way to navigate "back" to authenticated screens after sign-out.
    (navigation as any).reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }

  const handleNav = (item: MenuItem) => {
    if (item.key === 'Logout') {
      handleLogout();
      return;
    }
    if (item.key === 'Shop') {
      navigation.closeDrawer();
      (navigation as any).navigate('MainTabs', { screen: 'Shop' });
      return;
    }
    if (item.key === 'Appointments') {
      navigation.closeDrawer();
      (navigation as any).navigate('MainTabs', { screen: 'Appointments' });
      return;
    }
    // Everything else lives in the Home stack
    navigation.closeDrawer();
    (navigation as any).navigate('MainTabs', {
      screen: 'Home',
      params: { screen: item.key === 'Home' ? 'HomeMain' : item.key },
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Profile Header ────────────────────────────────── */}
      <Animated.View
        style={[
          styles.profileSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={44} color="#fff" />
          </View>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
          {!!displayEmail && (
            <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
          )}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <MaterialCommunityIcons
                name={profile?.role === 'doctor' ? 'doctor' : 'paw'}
                size={10}
                color={colors.primary}
              />
              <Text style={styles.badgeText}>{displayRole}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <View style={styles.divider} />

      {/* ── Menu Items ────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {MENU_ITEMS.map((item, index) => (
          <DrawerItem
            key={item.key}
            item={item}
            index={index}
            isActive={activeRouteName === item.key}
            onPress={() => handleNav(item)}
          />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── App Version ─────────────────────────────────────── */}
      <View style={styles.footer}>
        <MaterialCommunityIcons name="paw" size={14} color={colors.muted} />
        <Text style={styles.version}>PetCare+ v1.0.0</Text>
      </View>
    </View>
  );
}

// ── Individual item ───────────────────────────────────────────────
function DrawerItem({
  item,
  index,
  isActive,
  onPress,
}: {
  item: MenuItem;
  index: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        delay: index * 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onPressIn  = () =>
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, friction: 8 }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, friction: 6 }).start();

  if (item.key === 'Settings') {
    return (
      <>
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.sectionLabel}>GENERAL</Text>
          <View style={styles.dividerLine} />
        </View>
        <AnimatedItem
          item={item}
          isActive={isActive}
          scaleAnim={scaleAnim}
          fadeAnim={fadeAnim}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        />
      </>
    );
  }

  if (item.key === 'Emergency') {
    return (
      <>
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={[styles.sectionLabel, { color: '#DC2626' }]}>SOS</Text>
          <View style={styles.dividerLine} />
        </View>
        <AnimatedItem
          item={item}
          isActive={isActive}
          scaleAnim={scaleAnim}
          fadeAnim={fadeAnim}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        />
      </>
    );
  }

  return (
    <AnimatedItem
      item={item}
      isActive={isActive}
      scaleAnim={scaleAnim}
      fadeAnim={fadeAnim}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    />
  );
}

function AnimatedItem({
  item,
  isActive,
  scaleAnim,
  fadeAnim,
  onPress,
  onPressIn,
  onPressOut,
}: {
  item: MenuItem;
  isActive: boolean;
  scaleAnim: Animated.Value;
  fadeAnim: Animated.Value;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  return (
    <Animated.View
      style={[
        styles.itemWrapper,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        android_ripple={{ color: item.color + '20' }}
        style={[
          styles.item,
          isActive && { backgroundColor: item.color + '18' },
          isActive && { borderLeftColor: item.color, borderLeftWidth: 3 },
        ]}
      >
        <View
          style={[
            styles.itemIcon,
            { backgroundColor: isActive ? item.color + '20' : item.color + '10' },
          ]}
        >
          <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
        </View>
        <Text
          style={[
            styles.itemLabel,
            { color: isActive ? item.color : item.isDanger ? item.color : colors.text },
            isActive && { fontWeight: '900' },
          ]}
        >
          {item.label}
        </Text>
        {isActive && (
          <MaterialCommunityIcons name="chevron-right" size={16} color={item.color} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
    backgroundColor: colors.primary + '08',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: 20,
    marginVertical: 4,
  },
  scroll: {
    flex: 1,
  },
  itemWrapper: {
    marginHorizontal: 10,
    marginVertical: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.muted,
    letterSpacing: 1.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  version: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
});
