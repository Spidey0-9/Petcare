import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationService } from '../services/notifications';
import { colors } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';

type NotifCategory = 'appointment' | 'medicine' | 'vaccination' | 'order' | 'community' | 'emergency';

interface Notif {
  id: string;
  category: NotifCategory;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const CAT_META: Record<NotifCategory, { icon: string; color: string; bg: string }> = {
  appointment: { icon: 'calendar-check',  color: '#6C63FF', bg: '#F0EEFF' },
  medicine:    { icon: 'pill',             color: '#FF8F00', bg: '#FFF3E0' },
  vaccination: { icon: 'needle',           color: '#22C55E', bg: '#DCFCE7' },
  order:       { icon: 'package-variant',  color: '#0EA5E9', bg: '#E0F2FE' },
  community:   { icon: 'account-group',    color: '#EC4899', bg: '#FDF2F8' },
  emergency:   { icon: 'alert-circle',     color: '#EF4444', bg: '#FEE2E2' },
};



export function NotificationsScreen() {
  const insets      = useSafeAreaInsets();
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const [notifs, setNotifs]         = useState<Notif[]>([]);
  const [activeTab, setActiveTab]   = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadNotifs();
  }, []);

  const loadNotifs = useCallback(async () => {
    try {
      const data = await notificationService.listNotifications();
      setNotifs(data.map((item: any) => ({
        id: item.id,
        category: item.category ?? item.type ?? 'appointment',
        title: item.title,
        body: item.body ?? '',
        time: item.time ?? item.created_at ?? 'now',
        read: item.read ?? item.is_read ?? false,
      })));
    } catch (error) {
      console.warn('[NotificationsScreen] Unable to load notifications:', error);
      setNotifs([]);
    }
    setRefreshing(false);
  }, []);

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNotificationsRealtime = useCallback(() => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(() => {
      loadNotifs();
    }, 300);
  }, [loadNotifs]);

  useRealtimeTables('notifications-screen', [TABLES.notifications], handleNotificationsRealtime);

  useEffect(() => () => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
  }, []);

  const markRead = (id: string) =>
    setNotifs(n => n.map(notif => notif.id === id ? { ...notif, read: true } : notif));

  const markAllRead = () => setNotifs(n => n.map(notif => ({ ...notif, read: true })));

  const deleteNotif = async (id: string) => {
    await notificationService.deleteNotification(id);
    setNotifs(n => n.filter(notif => notif.id !== id));
  };

  const displayed = activeTab === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.subtitle}>{unreadCount} unread</Text>}
        </View>
        <Pressable style={styles.markAllBtn} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'unread'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifs(); }} tintColor={colors.primary} />}
      >
        {displayed.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-check" size={56} color={colors.muted + '60'} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>No {activeTab === 'unread' ? 'unread ' : ''}notifications</Text>
          </View>
        ) : (
          displayed.map((notif, i) => (
            <NotifCard
              key={notif.id}
              notif={notif}
              index={i}
              onRead={() => markRead(notif.id)}
              onDelete={() => deleteNotif(notif.id)}
            />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

function NotifCard({ notif, index, onRead, onDelete }: { notif: Notif; index: number; onRead: () => void; onDelete: () => void }) {
  const slideAnim = useRef(new Animated.Value(16)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const meta = CAT_META[notif.category];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 50, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        !notif.read && styles.cardUnread,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      <Pressable style={styles.cardPressable} onPress={onRead}>
        <View style={[styles.cardIcon, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardTitle, !notif.read && styles.cardTitleUnread]}>{notif.title}</Text>
            <Text style={styles.cardTime}>{notif.time}</Text>
          </View>
          <Text style={styles.cardText} numberOfLines={2}>{notif.body}</Text>
        </View>
        <View style={styles.cardRight}>
          {!notif.read && <View style={[styles.unreadDot, { backgroundColor: meta.color }]} />}
          <Pressable style={styles.deleteBtn} onPress={onDelete}>
            <MaterialCommunityIcons name="close" size={14} color={colors.muted} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:        { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle:     { fontSize: 12, color: colors.danger, fontWeight: '700', marginTop: 2 },
  markAllBtn:   { backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  markAllText:  { fontSize: 12, fontWeight: '800', color: colors.primary },
  tabs:         { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  tab:          { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  tabActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText:      { fontSize: 13, fontWeight: '700', color: colors.muted },
  tabTextActive:{ color: '#fff' },
  list:         { paddingHorizontal: 20, paddingTop: 4, gap: 8 },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:   { fontSize: 18, fontWeight: '800', color: colors.muted },
  emptySub:     { fontSize: 13, color: colors.muted },
  card:         { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardUnread:   { borderLeftWidth: 3, borderLeftColor: colors.primary },
  cardPressable:{ flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  cardIcon:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody:     { flex: 1, gap: 4 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:    { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 },
  cardTitleUnread: { fontWeight: '900' },
  cardTime:     { fontSize: 10, color: colors.muted, fontWeight: '600' },
  cardText:     { fontSize: 12, color: colors.muted, lineHeight: 18, fontWeight: '500' },
  cardRight:    { alignItems: 'center', gap: 8 },
  unreadDot:    { width: 8, height: 8, borderRadius: 4 },
  deleteBtn:    { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
});



