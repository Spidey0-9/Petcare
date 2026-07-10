import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { authService } from '../services/auth';
import { reminderService } from '../services/reminders';
import type { ReminderListItem } from '../services/reminders/reminderService';
import { colors } from '../core/theme/colors';
import { TABLES } from '../constants';
import { classifySupabaseError } from '../services/errors';
import { logDatabaseFailure } from '../services/database/databaseDiagnostics';
import { useRealtimeTables } from '../services/realtime';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface ReminderType { id: string; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string; }
const REMINDER_TYPES: ReminderType[] = [
  { id: 'medicine',    label: 'Medicine',    icon: 'pill',          color: '#FF8F00', bg: '#FFF3E0' },
  { id: 'vaccination', label: 'Vaccination', icon: 'needle',        color: '#22C55E', bg: '#DCFCE7' },
  { id: 'grooming',    label: 'Grooming',    icon: 'content-cut',   color: '#EC4899', bg: '#FDF2F8' },
  { id: 'appointment', label: 'Appointment', icon: 'calendar-check',color: '#6C63FF', bg: '#F0EEFF' },
  { id: 'feeding',     label: 'Feeding',     icon: 'food-variant',  color: '#0EA5E9', bg: '#E0F2FE' },
  { id: 'water',       label: 'Water',       icon: 'water',         color: '#06B6D4', bg: '#ECFEFF' },
  { id: 'exercise',    label: 'Exercise',    icon: 'run-fast',      color: '#EF4444', bg: '#FEE2E2' },
];

const REPEAT_OPTIONS = ['Once', 'Daily', 'Weekly', 'Monthly'];

type Reminder = ReminderListItem & {
  pet_name: string | null;
  date: string;
  time: string;
  repeat: string;
  is_active: boolean;
  created_at: string;
  scheduled_at: string;
};

const formatReminderDate = (scheduledAt: string) => {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

const formatReminderTime = (scheduledAt: string) => {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const normalizeReminder = (reminder: ReminderListItem): Reminder => ({
  ...reminder,
  pet_name: reminder.pet_name ?? null,
  date: reminder.date ?? formatReminderDate(reminder.scheduled_at),
  time: reminder.time ?? formatReminderTime(reminder.scheduled_at),
  repeat: reminder.repeat ?? 'none',
  is_active: reminder.is_active ?? true,
  created_at: reminder.created_at ?? reminder.scheduled_at,
});

export function RemindersScreen() {
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    requestNotifPermission();
    loadReminders();
  }, []);

  const requestNotifPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') Alert.alert('Notifications', 'Enable notifications to receive reminders.');
  };

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        setReminders([]);
        // Not an error — just show empty state with a login prompt
        setErrorMessage('Please login to view your reminders.');
        return;
      }

      const data = await reminderService.listByUser(user.id);
      setReminders(data.map(normalizeReminder));
      setErrorMessage('');
    } catch (error: unknown) {
      const typedError = error as Error;
      void logDatabaseFailure({
        module: 'RemindersScreen',
        table: TABLES.reminders,
        operation: 'loadReminders',
        query: 'list reminders for authenticated user',
      }, error);

      const category = classifySupabaseError(typedError);
      setReminders([]);
      if (category === 'table_not_found') {
        setErrorMessage('Reminders are unavailable because the reminders table is missing. Apply the latest Supabase migration.');
      } else if (category === 'schema_mismatch') {
        setErrorMessage('Reminders are unavailable because the app and Supabase schema are out of sync.');
      } else if (category === 'authentication_error') {
        setErrorMessage('Please login to view your reminders.');
      } else if (category === 'permission_denied' || category === 'rls_denied') {
        setErrorMessage('Your account does not have permission to read these reminders.');
      } else {
        setErrorMessage(typedError?.message ?? 'Could not load reminders. Pull down to retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRemindersRealtime = useCallback(() => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(() => {
      loadReminders();
    }, 300);
  }, [loadReminders]);

  useRealtimeTables('reminders-screen', [TABLES.reminders], handleRemindersRealtime);

  useEffect(() => () => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
  }, []);

  const toggleReminder = async (id: string, current: boolean) => {
    try {
      await reminderService.toggleReminder(id, current);
      setReminders(r => r.map(rem => rem.id === id ? { ...rem, is_active: !current } : rem));
    } catch (error: unknown) {
      const typedError = error as Error;
      Alert.alert('Reminder update failed', typedError?.message ?? 'Please try again.');
    }
  };

  const deleteReminder = async (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await reminderService.deleteReminder(id);
            setReminders(r => r.filter(rem => rem.id !== id));
          } catch (error: unknown) {
            const typedError = error as Error;
            Alert.alert('Delete failed', typedError?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  };

  const typeInfo = (typeId: string) => REMINDER_TYPES.find(t => t.id === typeId) ?? REMINDER_TYPES[0];

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="bell-ring" size={22} color={colors.primary} />
        <Text style={styles.headerTitle}>Reminders</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Quick type chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {REMINDER_TYPES.map(t => (
          <Pressable
            key={t.id}
            style={[styles.chip, { backgroundColor: t.bg, borderColor: t.color + '40' }]}
            onPress={() => setShowModal(true)}
          >
            <MaterialCommunityIcons name={t.icon} size={14} color={t.color} />
            <Text style={[styles.chipText, { color: t.color }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReminders(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-sleep" size={56} color={colors.muted + '60'} />
            <Text style={styles.emptyTitle}>Loading reminders...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.danger + '80'} />
            <Text style={styles.emptyTitle}>Reminders unavailable</Text>
            <Text style={styles.emptySub}>{errorMessage}</Text>
            <Pressable style={styles.emptyBtn} onPress={loadReminders}>
              <Text style={styles.emptyBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="bell-plus" size={56} color={colors.muted + '60'} />
            <Text style={styles.emptyTitle}>No reminders yet</Text>
            <Text style={styles.emptySub}>Tap + to add your first reminder</Text>
            <Pressable style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Add Reminder</Text>
            </Pressable>
          </View>
        ) : (
          reminders.map((rem, i) => {
            const info = typeInfo(rem.type);
            return (
              <ReminderCard
                key={rem.id}
                reminder={rem}
                info={info}
                index={i}
                onToggle={() => toggleReminder(rem.id, rem.is_active)}
                onDelete={() => deleteReminder(rem.id)}
              />
            );
          })
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Modal */}
      <AddReminderModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => { setShowModal(false); loadReminders(); }}
      />
    </Animated.View>
  );
}

function ReminderCard({ reminder, info, index, onToggle, onDelete }: { reminder: Reminder; info: ReminderType; index: number; onToggle: () => void; onDelete: () => void; }) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, !reminder.is_active && styles.cardInactive, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.cardIconWrap, { backgroundColor: info.bg }]}>
        <MaterialCommunityIcons name={info.icon} size={22} color={info.color} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, !reminder.is_active && { color: colors.muted }]}>{reminder.title}</Text>
        <View style={styles.cardMeta}>
          {reminder.pet_name ? <><MaterialCommunityIcons name="paw" size={11} color={colors.muted} /><Text style={styles.metaText}>{reminder.pet_name}</Text></> : null}
          <MaterialCommunityIcons name="clock-outline" size={11} color={colors.muted} />
          <Text style={styles.metaText}>{reminder.time}</Text>
          <MaterialCommunityIcons name="calendar" size={11} color={colors.muted} />
          <Text style={styles.metaText}>{reminder.date}</Text>
        </View>
        <View style={[styles.repeatChip, { backgroundColor: info.color + '15' }]}>
          <Text style={[styles.repeatText, { color: info.color }]}>{reminder.repeat}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Switch
          value={reminder.is_active}
          onValueChange={onToggle}
          trackColor={{ true: info.color + '60', false: colors.line }}
          thumbColor={reminder.is_active ? info.color : '#fff'}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
        <Pressable onPress={onDelete} style={styles.deleteBtn}>
          <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.danger} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function AddReminderModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void; }) {
  const slideAnim = useRef(new Animated.Value(800)).current;
  const [type,    setType]    = useState('medicine');
  const [title,   setTitle]   = useState('');
  const [petName, setPetName] = useState('');
  const [date,    setDate]    = useState('');
  const [time,    setTime]    = useState('09:00 AM');
  const [repeat,  setRepeat]  = useState('Daily');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : 800, friction: 9, useNativeDriver: true }).start();
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title'); return; }
    if (!date.trim())  { Alert.alert('Required', 'Please enter a date (e.g. 25/07/2025)'); return; }
    setSaving(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        Alert.alert('Login required', 'Please login to create reminders.');
        setSaving(false);
        return;
      }

      let savedReminder: ReminderListItem | null = null;
      try {
        savedReminder = await reminderService.createReminder({
          user_id:   user.id,
          type,
          title:     title.trim(),
          pet_name:  petName.trim() || null,
          date,
          time,
          repeat,
          is_active: true,
        });
      } catch (createErr: unknown) {
        void logDatabaseFailure({
          module: 'RemindersScreen',
          table: TABLES.reminders,
          operation: 'createReminder',
          query: 'insert reminder for authenticated user',
        }, createErr);

        const category = classifySupabaseError(createErr as Error);
        if (category === 'table_not_found') {
          Alert.alert('Database not ready', 'The reminders table is missing. Apply the latest Supabase migration.');
          setSaving(false);
          return;
        }
        if (category === 'schema_mismatch') {
          Alert.alert('Database schema mismatch', 'The reminders table schema does not match the app. Apply the latest migration and reload the Supabase schema cache.');
          setSaving(false);
          return;
        }
        throw createErr;
      }

      // Schedule local notification (non-fatal if it fails)
      if (savedReminder?.id) {
        await reminderService.scheduleLocalNotification(savedReminder).catch(
          (e: unknown) => {
            console.warn('[RemindersScreen] notification schedule failed:', (e as Error)?.message ?? e);
          },
        );
      }

      Alert.alert('✅ Saved', `"${title}" reminder saved successfully!`);
      setTitle(''); setPetName(''); setDate(''); setTime('09:00 AM'); setRepeat('Daily');
      onSaved();
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error)?.message ?? 'Failed to save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = REMINDER_TYPES.find(t => t.id === type)!;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <Pressable style={modal.backdrop} onPress={onClose} />
        <Animated.View style={[modal.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={modal.handle} />
          <View style={modal.headerRow}>
            <Text style={modal.title}>Add Reminder</Text>
            <Pressable style={[modal.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              <Text style={modal.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={modal.body} showsVerticalScrollIndicator={false}>
            {/* Type selector */}
            <Text style={modal.label}>REMINDER TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modal.typeRow}>
              {REMINDER_TYPES.map(t => (
                <Pressable
                  key={t.id}
                  style={[modal.typeChip, { backgroundColor: t.bg, borderColor: t.id === type ? t.color : 'transparent', borderWidth: 2 }]}
                  onPress={() => setType(t.id)}
                >
                  <MaterialCommunityIcons name={t.icon} size={20} color={t.color} />
                  <Text style={[modal.typeLabel, { color: t.color }]}>{t.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Fields */}
            <Text style={modal.label}>TITLE *</Text>
            <TextInput style={modal.input} value={title} onChangeText={setTitle} placeholder="e.g. Give Amoxicillin" placeholderTextColor={colors.muted} />
            <Text style={modal.label}>PET NAME</Text>
            <TextInput style={modal.input} value={petName} onChangeText={setPetName} placeholder="e.g. Buddy" placeholderTextColor={colors.muted} />
            <Text style={modal.label}>DATE *</Text>
            <TextInput style={modal.input} value={date} onChangeText={setDate} placeholder="DD/MM/YYYY" placeholderTextColor={colors.muted} />
            <Text style={modal.label}>TIME</Text>
            <TextInput style={modal.input} value={time} onChangeText={setTime} placeholder="09:00 AM" placeholderTextColor={colors.muted} />
            <Text style={modal.label}>REPEAT</Text>
            <View style={modal.repeatRow}>
              {REPEAT_OPTIONS.map(opt => (
                <Pressable
                  key={opt}
                  style={[modal.repeatChip, repeat === opt && { backgroundColor: selectedType.color, borderColor: selectedType.color }]}
                  onPress={() => setRepeat(opt)}
                >
                  <Text style={[modal.repeatText, repeat === opt && { color: '#fff' }]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontSize: 18, fontWeight: '900', color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  body: { padding: 20 },
  label: { fontSize: 11, fontWeight: '900', color: colors.muted, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, fontWeight: '600', color: colors.text, borderWidth: 1.5, borderColor: colors.line },
  typeRow: { gap: 10, paddingBottom: 4 },
  typeChip: { borderRadius: 14, padding: 12, alignItems: 'center', gap: 6, minWidth: 76 },
  typeLabel: { fontSize: 10, fontWeight: '800' },
  repeatRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  repeatChip: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.line },
  repeatText: { fontSize: 13, fontWeight: '700', color: colors.text },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.text },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '800' },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.muted },
  emptySub:   { fontSize: 13, color: colors.muted },
  emptyBtn:   { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText:{ fontSize: 14, fontWeight: '800', color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardInactive: { opacity: 0.55 },
  cardIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  repeatChip: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  repeatText: { fontSize: 10, fontWeight: '800' },
  cardRight: { alignItems: 'center', gap: 6 },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.danger + '15', alignItems: 'center', justifyContent: 'center' },
});


