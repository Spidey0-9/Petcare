import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, radii, shadows } from '../theme/colors';

export type EnterpriseIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type EnterpriseBottomNavItem = {
  route: string;
  label: string;
  icon: EnterpriseIconName;
};

type BottomNavProps = {
  items: EnterpriseBottomNavItem[];
  activeRoute: string;
  onNavigate: (route: string) => void;
};

type EmptyStateProps = {
  icon: EnterpriseIconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EnterpriseGlassCard({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={gradients.glass} style={styles.glassCard}>
      {children}
    </LinearGradient>
  );
}

export function EnterpriseFloatingBottomNav({ items, activeRoute, onNavigate }: BottomNavProps) {
  return (
    <View pointerEvents="box-none" style={styles.navWrap}>
      <View style={styles.navBar}>
        {items.map(item => {
          const active = item.route === activeRoute;
          return (
            <Pressable key={item.route} style={[styles.navTab, active && styles.navTabActive]} onPress={() => onNavigate(item.route)} accessibilityRole="button" accessibilityLabel={item.label}>
              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                <MaterialCommunityIcons name={item.icon} size={21} color={active ? '#fff' : colors.muted} />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function EnterpriseEmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><MaterialCommunityIcons name={icon} size={30} color={colors.primary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? <Pressable style={styles.emptyAction} onPress={onAction}><Text style={styles.emptyActionText}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

export function EnterpriseSkeletonBlock({ height = 120 }: { height?: number }) {
  return <View style={[styles.skeletonBlock, { height }]} />;
}

const styles = StyleSheet.create({
  glassCard: { borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(221,234,228,0.82)', ...shadows.soft },
  navWrap: { position: 'absolute', left: 16, right: 16, bottom: 14, alignItems: 'center' },
  navBar: { width: '100%', minHeight: 72, borderRadius: radii.xl, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(221,234,228,0.86)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8, ...shadows.premium },
  navTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 0 },
  navTabActive: { transform: [{ translateY: -2 }] },
  navIconWrap: { width: 36, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navIconWrapActive: { backgroundColor: colors.primary },
  navLabel: { fontSize: 10, fontWeight: '900', color: colors.muted, lineHeight: 12 },
  navLabelActive: { color: colors.text },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, padding: 22, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  emptyIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginTop: 10, textAlign: 'center' },
  emptyBody: { fontSize: 12, fontWeight: '700', color: colors.muted, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  emptyAction: { marginTop: 12, borderRadius: 999, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9 },
  emptyActionText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  skeletonBlock: { borderRadius: radii.xl, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: colors.line, ...shadows.soft },
});
