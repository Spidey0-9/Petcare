import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '../core/components/AppScreen';
import { colors, radii, shadows } from '../core/theme/colors';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type SettingItem = {
  title: string;
  subtitle: string;
  icon: IconName;
  action?: 'password' | 'privacy' | 'terms' | 'about';
  toggle?: boolean;
};

const SETTINGS: SettingItem[] = [
  { title: 'Notifications', subtitle: 'Booking, review, payment and system alerts.', icon: 'bell-outline', toggle: true },
  { title: 'Biometric', subtitle: 'Fingerprint or Face ID for secure portal access.', icon: 'fingerprint', toggle: true },
  { title: 'Change Password', subtitle: 'Send a password reset email to your account.', icon: 'lock-reset', action: 'password' },
  { title: 'Language', subtitle: 'English is active for this device.', icon: 'translate' },
  { title: 'Theme', subtitle: 'System appearance is currently used.', icon: 'theme-light-dark' },
  { title: 'Privacy', subtitle: 'Review account privacy and data controls.', icon: 'shield-account-outline', action: 'privacy' },
  { title: 'Terms', subtitle: 'Read the PetCare+ platform terms.', icon: 'file-document-outline', action: 'terms' },
  { title: 'About', subtitle: 'App version, platform and support details.', icon: 'information-outline', action: 'about' },
];

export function GroomerSettingsScreen() {
  const { profile } = useAuth();

  const handlePress = useCallback(async (item: SettingItem) => {
    if (item.action === 'password') {
      if (!profile?.email) {
        Alert.alert('Email unavailable', 'Your account email could not be loaded.');
        return;
      }
      try {
        await authService.sendPasswordReset(profile.email);
        Alert.alert('Password reset sent', 'Check your email for the reset link.');
      } catch (error) {
        Alert.alert('Password reset failed', error instanceof Error ? error.message : 'Please try again.');
      }
      return;
    }
    Alert.alert(item.title, item.subtitle);
  }, [profile?.email]);

  return (
    <AppScreen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><MaterialCommunityIcons name="cog-outline" size={28} color={colors.primaryDark} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage security, preferences, privacy and account options.</Text>
          </View>
        </View>

        <View style={styles.list}>
          {SETTINGS.map(item => (
            <Pressable key={item.title} style={styles.row} onPress={() => { void handlePress(item); }}>
              <View style={styles.rowIcon}><MaterialCommunityIcons name={item.icon} size={21} color={colors.primary} /></View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              </View>
              {item.toggle ? <Switch value={false} trackColor={{ false: colors.line, true: colors.primarySoft }} thumbColor={colors.surface} /> : <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 34 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 16, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 13, fontWeight: '700', color: colors.muted, lineHeight: 19, marginTop: 4 },
  list: { marginTop: 18, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  rowSubtitle: { fontSize: 12, fontWeight: '700', color: colors.muted, lineHeight: 18, marginTop: 3 },
});
