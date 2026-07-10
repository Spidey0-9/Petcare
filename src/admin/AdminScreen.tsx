import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';

interface Appointment {
  id: string;
  patient: string;
  petName: string;
  type: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: '1', patient: 'John Doe',   petName: 'Buddy', type: 'General Checkup',     date: 'Today',    time: '10:00 AM', status: 'confirmed'   },
  { id: '2', patient: 'Priya S.',   petName: 'Max',   type: 'Vaccination',         date: 'Today',    time: '11:30 AM', status: 'pending'     },
  { id: '3', patient: 'Amit K.',    petName: 'Luna',  type: 'Dental Cleaning',     date: 'Today',    time: '02:00 PM', status: 'in_progress' },
  { id: '4', patient: 'Meera T.',   petName: 'Bruno', type: 'Emergency',           date: 'Today',    time: '03:30 PM', status: 'pending'     },
  { id: '5', patient: 'Ravi M.',    petName: 'Coco',  type: 'Post-Op Follow-up',   date: 'Tomorrow', time: '09:00 AM', status: 'confirmed'   },
];

const STATUS_META = {
  pending:     { label: 'Pending',     color: '#FF8F00', bg: '#FFF3E0' },
  confirmed:   { label: 'Confirmed',   color: '#0EA5E9', bg: '#E0F2FE' },
  in_progress: { label: 'In Progress', color: '#6C63FF', bg: '#F0EEFF' },
  completed:   { label: 'Completed',   color: '#22C55E', bg: '#DCFCE7' },
  cancelled:   { label: 'Cancelled',   color: '#EF4444', bg: '#FEE2E2' },
};

const STATS = [
  { icon: 'calendar-today', label: "Today's",  count: 4,  color: '#6C63FF', bg: '#F0EEFF' },
  { icon: 'clock-alert',    label: 'Pending',  count: 2,  color: '#FF8F00', bg: '#FFF3E0' },
  { icon: 'account-group',  label: 'Patients', count: 18, color: '#0EA5E9', bg: '#E0F2FE' },
  { icon: 'check-circle',   label: 'Completed',count: 12, color: '#22C55E', bg: '#DCFCE7' },
];

export function AdminScreen() {
  const insets    = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [activeTab, setActiveTab]       = useState<'all' | 'pending' | 'today'>('today');
  const [refreshing, setRefreshing]     = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const updateStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    Alert.alert('Updated', `Appointment ${status}`);
  };

  const filtered = appointments.filter(a => {
    if (activeTab === 'today')   return a.date === 'Today';
    if (activeTab === 'pending') return a.status === 'pending';
    return true;
  });

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Doctor Dashboard</Text>
          <Text style={styles.subtitle}>Dr. Anjali Sharma • Veterinarian</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Available</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor={colors.primary} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <MaterialCommunityIcons name={s.icon as any} size={22} color={s.color} />
              <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
              <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Availability toggle */}
        <View style={styles.availSection}>
          <Text style={styles.availTitle}>Availability</Text>
          <View style={styles.availSlots}>
            {['09-11 AM', '11-1 PM', '2-4 PM', '4-6 PM'].map((slot, i) => (
              <Pressable
                key={slot}
                style={[styles.slotChip, i < 2 && styles.slotChipActive]}
                onPress={() => Alert.alert('Slot', `Toggling slot: ${slot}`)}
              >
                <Text style={[styles.slotText, i < 2 && styles.slotTextActive]}>{slot}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['today', 'pending', 'all'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Appointments */}
        <View style={styles.aptList}>
          {filtered.map((apt, i) => (
            <DoctorAptCard key={apt.id} apt={apt} index={i} onUpdate={updateStatus} />
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

function DoctorAptCard({ apt, index, onUpdate }: { apt: Appointment; index: number; onUpdate: (id: string, status: Appointment['status']) => void }) {
  const slideAnim = useRef(new Animated.Value(16)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const meta = STATUS_META[apt.status];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.aptCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.aptHeader}>
        <View style={styles.aptPatient}>
          <View style={styles.aptAvatar}>
            <MaterialCommunityIcons name="account" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.aptName}>{apt.patient}</Text>
            <Text style={styles.aptPet}>🐾 {apt.petName} • {apt.type}</Text>
          </View>
        </View>
        <View style={[styles.aptStatus, { backgroundColor: meta.bg }]}>
          <Text style={[styles.aptStatusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.aptTime}>
        <MaterialCommunityIcons name="clock-outline" size={14} color={colors.muted} />
        <Text style={styles.aptTimeText}>{apt.date} at {apt.time}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.aptActions}>
        {apt.status === 'pending' && (
          <>
            <Pressable style={[styles.aptBtn, styles.aptBtnAccept]} onPress={() => onUpdate(apt.id, 'confirmed')}>
              <MaterialCommunityIcons name="check" size={14} color="#fff" />
              <Text style={styles.aptBtnText}>Accept</Text>
            </Pressable>
            <Pressable style={[styles.aptBtn, styles.aptBtnReject]} onPress={() => onUpdate(apt.id, 'cancelled')}>
              <MaterialCommunityIcons name="close" size={14} color="#fff" />
              <Text style={styles.aptBtnText}>Reject</Text>
            </Pressable>
          </>
        )}
        {apt.status === 'confirmed' && (
          <Pressable style={[styles.aptBtn, styles.aptBtnStart]} onPress={() => onUpdate(apt.id, 'in_progress')}>
            <MaterialCommunityIcons name="play" size={14} color="#fff" />
            <Text style={styles.aptBtnText}>Start Consultation</Text>
          </Pressable>
        )}
        {apt.status === 'in_progress' && (
          <>
            <Pressable style={[styles.aptBtn, styles.aptBtnAccept]} onPress={() => Alert.alert('Prescription', 'Opening prescription form')}>
              <MaterialCommunityIcons name="prescription" size={14} color="#fff" />
              <Text style={styles.aptBtnText}>Prescription</Text>
            </Pressable>
            <Pressable style={[styles.aptBtn, { backgroundColor: '#22C55E' }]} onPress={() => onUpdate(apt.id, 'completed')}>
              <MaterialCommunityIcons name="check-all" size={14} color="#fff" />
              <Text style={styles.aptBtnText}>Complete</Text>
            </Pressable>
          </>
        )}
        <Pressable style={[styles.aptBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line }]} onPress={() => Alert.alert('Profile', `Opening ${apt.patient}'s profile`)}>
          <MaterialCommunityIcons name="account-eye" size={14} color={colors.text} />
          <Text style={[styles.aptBtnText, { color: colors.text }]}>Profile</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.success, paddingBottom: 20 },
  title:        { fontSize: 22, fontWeight: '900', color: '#fff' },
  subtitle:     { fontSize: 12, color: '#fff', opacity: 0.9, marginTop: 2 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  statusText:   { fontSize: 11, fontWeight: '800', color: '#fff' },
  statsRow:     { flexDirection: 'row', gap: 8, padding: 16 },
  statCard:     { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 3 },
  statCount:    { fontSize: 20, fontWeight: '900' },
  statLabel:    { fontSize: 9, fontWeight: '800' },
  availSection: { paddingHorizontal: 20, paddingBottom: 14 },
  availTitle:   { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 10 },
  availSlots:   { flexDirection: 'row', gap: 8 },
  slotChip:     { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.line },
  slotChipActive:{ backgroundColor: colors.success + '20', borderColor: colors.success },
  slotText:     { fontSize: 11, fontWeight: '700', color: colors.muted },
  slotTextActive:{ color: colors.success },
  tabs:         { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  tabActive:    { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText:      { fontSize: 12, fontWeight: '700', color: colors.muted },
  tabTextActive:{ color: '#fff' },
  aptList:      { paddingHorizontal: 20, gap: 12 },
  aptCard:      { backgroundColor: colors.surface, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, gap: 10 },
  aptHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aptPatient:   { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  aptAvatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  aptName:      { fontSize: 14, fontWeight: '900', color: colors.text },
  aptPet:       { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 2 },
  aptStatus:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  aptStatusText:{ fontSize: 10, fontWeight: '800' },
  aptTime:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aptTimeText:  { fontSize: 12, color: colors.muted, fontWeight: '600' },
  aptActions:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  aptBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  aptBtnAccept: { backgroundColor: colors.primary },
  aptBtnReject: { backgroundColor: '#EF4444' },
  aptBtnStart:  { backgroundColor: '#0EA5E9', flex: 1, justifyContent: 'center' },
  aptBtnText:   { fontSize: 11, fontWeight: '800', color: '#fff' },
});


