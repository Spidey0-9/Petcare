import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createDrawerNavigator, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { GroomerDashboardScreen } from './GroomerDashboardScreen';
import { GroomerModuleScreen } from './GroomerModuleScreen';
import { GroomerProfileScreen } from './GroomerProfileScreen';
import { GroomerSettingsScreen } from './GroomerSettingsScreen';
import { GroomerShopScreen } from './GroomerShopScreen';
import { GroomerSupportScreen } from './GroomerSupportScreen';
import { useAuth } from '../contexts/AuthContext';
import { colors, gradients, radii, shadows } from '../core/theme/colors';

type DrawerIcon = keyof typeof MaterialCommunityIcons.glyphMap;

type DrawerItem = {
  name: string;
  label: string;
  icon: DrawerIcon;
  tone: string;
};

type DrawerGroup = {
  title: string;
  items: DrawerItem[];
};

const Drawer = createDrawerNavigator();

const DRAWER_GROUPS: DrawerGroup[] = [
  {
    title: 'Command Center',
    items: [
      { name: 'Dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', tone: colors.primary },
      { name: 'Bookings', label: 'Appointments', icon: 'calendar-check-outline', tone: '#EC4899' },
      { name: 'Calendar', label: 'Calendar', icon: 'calendar-month-outline', tone: '#8B5CF6' },
      { name: 'Customers', label: 'Customers', icon: 'account-heart-outline', tone: '#0EA5E9' },
    ],
  },
  {
    title: 'Studio',
    items: [
      { name: 'Services', label: 'Services', icon: 'content-cut', tone: colors.primary },
      { name: 'Packages', label: 'Packages', icon: 'package-variant-closed', tone: '#F97316' },
      { name: 'Gallery', label: 'Gallery', icon: 'image-multiple-outline', tone: '#14B8A6' },
      { name: 'Inventory', label: 'Inventory', icon: 'clipboard-list-outline', tone: '#64748B' },
      { name: 'Shop', label: 'Shop', icon: 'shopping-outline', tone: '#10B981' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { name: 'Revenue', label: 'Revenue', icon: 'cash-multiple', tone: '#22C55E' },
      { name: 'Analytics', label: 'Analytics', icon: 'chart-line', tone: '#6366F1' },
      { name: 'Notifications', label: 'Notifications', icon: 'bell-outline', tone: '#F59E0B' },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'Profile', label: 'Profile', icon: 'account-circle-outline', tone: colors.primaryDark },
      { name: 'Settings', label: 'Settings', icon: 'cog-outline', tone: '#475569' },
      { name: 'Support', label: 'Support', icon: 'lifebuoy', tone: '#0EA5E9' },
      { name: 'About', label: 'About', icon: 'information-outline', tone: '#64748B' },
    ],
  },
];

function GroomerDrawerContent(props: DrawerContentComponentProps) {
  const { profile, signOut } = useAuth();
  const activeRoute = props.state.routeNames[props.state.index];

  const onLogout = useCallback(() => {
    Alert.alert('Logout', 'Sign out from the groomer portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          void signOut().finally(() => {
            props.navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
          });
        },
      },
    ]);
  }, [props.navigation, signOut]);

  return (
    <View style={styles.drawerShell}>
      <LinearGradient colors={gradients.dark} style={styles.drawerHero}>
        <View style={styles.heroTop}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="content-cut" size={27} color="#fff" />
          </View>
          <View style={styles.verifiedPill}>
            <MaterialCommunityIcons name="check-decagram" size={14} color="#A7F3D0" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>
        <Text style={styles.portalLabel}>PetCare+ Studio</Text>
        <Text style={styles.drawerName} numberOfLines={1}>{profile?.full_name ?? 'Groomer'}</Text>
        <Text style={styles.drawerEmail} numberOfLines={1}>{profile?.email ?? 'Live PetCare+ account'}</Text>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerList}>
        {DRAWER_GROUPS.map(group => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map(item => {
              const focused = activeRoute === item.name;
              return (
                <Pressable
                  key={item.name}
                  style={[styles.drawerItem, focused && styles.drawerItemActive]}
                  onPress={() => props.navigation.navigate(item.name)}
                >
                  <View style={[styles.drawerIcon, { backgroundColor: `${item.tone}18` }]}>
                    <MaterialCommunityIcons name={item.icon} size={19} color={focused ? colors.primaryDark : item.tone} />
                  </View>
                  <Text style={[styles.drawerItemText, focused && styles.drawerItemTextActive]}>{item.label}</Text>
                  {focused && <View style={styles.activeDot} />}
                </Pressable>
              );
            })}
          </View>
        ))}

        <Pressable style={[styles.drawerItem, styles.logoutItem]} onPress={onLogout}>
          <View style={[styles.drawerIcon, { backgroundColor: colors.dangerSoft }]}>
            <MaterialCommunityIcons name="logout" size={19} color={colors.danger} />
          </View>
          <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function GroomerPortalNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <GroomerDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: 'rgba(255,255,255,0.94)' },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '900' },
        drawerStyle: { width: 326, backgroundColor: 'transparent' },
        overlayColor: 'rgba(15,23,42,0.42)',
        swipeEdgeWidth: 76,
      }}
    >
      <Drawer.Screen name="Dashboard" component={GroomerDashboardScreen} options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="Bookings" component={GroomerModuleScreen} options={{ title: 'Appointments' }} />
      <Drawer.Screen name="Calendar" component={GroomerModuleScreen} options={{ title: 'Calendar' }} />
      <Drawer.Screen name="Customers" component={GroomerModuleScreen} options={{ title: 'Customers' }} />
      <Drawer.Screen name="Services" component={GroomerModuleScreen} options={{ title: 'Services' }} />
      <Drawer.Screen name="Packages" component={GroomerModuleScreen} options={{ title: 'Packages' }} />
      <Drawer.Screen name="Gallery" component={GroomerModuleScreen} options={{ title: 'Gallery' }} />
      <Drawer.Screen name="Inventory" component={GroomerModuleScreen} options={{ title: 'Inventory' }} />
      <Drawer.Screen name="Shop" component={GroomerShopScreen} options={{ title: 'Shop' }} />
      <Drawer.Screen name="Revenue" component={GroomerModuleScreen} options={{ title: 'Revenue' }} />
      <Drawer.Screen name="Analytics" component={GroomerModuleScreen} options={{ title: 'Analytics' }} />
      <Drawer.Screen name="Notifications" component={GroomerModuleScreen} options={{ title: 'Notifications' }} />
      <Drawer.Screen name="Profile" component={GroomerProfileScreen} options={{ title: 'Profile' }} />
      <Drawer.Screen name="Settings" component={GroomerSettingsScreen} options={{ title: 'Settings' }} />
      <Drawer.Screen name="Support" component={GroomerSupportScreen} options={{ title: 'Help & Support' }} />
      <Drawer.Screen name="About" component={GroomerModuleScreen} options={{ title: 'About' }} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerShell: { flex: 1, backgroundColor: colors.background, padding: 14 },
  drawerHero: { borderRadius: radii.xl, padding: 18, paddingTop: 28, marginBottom: 14, overflow: 'hidden', ...shadows.premium },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  avatarCircle: { width: 60, height: 60, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: 'rgba(16,185,129,0.18)' },
  verifiedText: { color: '#D1FAE5', fontSize: 10, fontWeight: '900' },
  portalLabel: { color: 'rgba(255,255,255,0.74)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  drawerName: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  drawerEmail: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', marginTop: 4 },
  drawerList: { paddingBottom: 22, gap: 14 },
  group: { gap: 6 },
  groupTitle: { fontSize: 10, fontWeight: '900', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0, paddingHorizontal: 8, marginBottom: 2 },
  drawerItem: { minHeight: 46, borderRadius: 15, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  drawerItemActive: { backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  drawerIcon: { width: 34, height: 34, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  drawerItemText: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.muted },
  drawerItemTextActive: { color: colors.text },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  logoutItem: { marginTop: 2, backgroundColor: 'rgba(239,68,68,0.08)' },
  logoutText: { color: colors.danger },
});

