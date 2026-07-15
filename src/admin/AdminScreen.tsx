import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../core/theme/colors';
import { supabase } from '../core/services/supabase';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';
import { backendAppointmentService } from '../services/appointments';
import type { AppointmentRecord } from '../types';

type AdminAppointmentStatus = AppointmentRecord['status'];

type AdminAppointment = AppointmentRecord & {
  pet?: { name?: string | null; breed?: string | null } | null;
  owner?: { full_name?: string | null; email?: string | null } | null;
  doctor?: { profile_id?: string | null; email?: string | null; clinic_name?: string | null } | null;
  clinic?: { name?: string | null; hospital_name?: string | null } | null;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#FF8F00', bg: '#FFF3E0' },
  accepted: { label: 'Accepted', color: '#0EA5E9', bg: '#E0F2FE' },
  confirmed: { label: 'Confirmed', color: '#0EA5E9', bg: '#E0F2FE' },
  completed: { label: 'Completed', color: '#22C55E', bg: '#DCFCE7' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
  rescheduled: { label: 'Rescheduled', color: '#7C3AED', bg: '#F3E8FF' },
};

function formatDate(value?: string | null) {
  if (!value) return 'Unscheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday ? 'Today' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function AdminScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'today'>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAppointments = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase
        .from(TABLES.appointments)
        .select('*, pet:pets(name,breed), owner:profiles!appointments_owner_id_fkey(full_name,email), doctor:doctors(profile_id,email,clinic_name), clinic:clinics(name,hospital_name)')
        .order('scheduled_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setAppointments((data ?? []) as AdminAppointment[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load live appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    void loadAppointments();
  }, [fadeAnim, loadAppointments]);

  useRealtimeTables('organization-admin-appointments', [TABLES.appointments, TABLES.notifications, TABLES.payments], () => {
    void loadAppointments(false);
  });

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return [
      { icon: 'calendar-today', label: "Today's", count: appointments.filter(item => new Date(item.scheduled_at).toDateString() === today).length, color: '#6C63FF', bg: '#F0EEFF' },
      { icon: 'clock-alert', label: 'Pending', count: appointments.filter(item => item.status === 'pending').length, color: '#FF8F00', bg: '#FFF3E0' },
      { icon: 'account-group', label: 'Patients', count: new Set(appointments.map(item => item.pet_id)).size, color: '#0EA5E9', bg: '#E0F2FE' },
      { icon: 'check-circle', label: 'Completed', count: appointments.filter(item => item.status === 'completed').length, color: '#22C55E', bg: '#DCFCE7' },
    ];
  }, [appointments]);

  const updateStatus = async (id: string, status: AdminAppointmentStatus) => {
    try {
      await backendAppointmentService.updateStatus(id, status as AppointmentRecord['status']);
      setAppointments(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Unable to update appointment.');
    }
  };

  const filtered = appointments.filter(item => {
    if (activeTab === 'today') return new Date(item.scheduled_at).toDateString() === new Date().toDateString();
    if (activeTab === 'pending') return item.status === 'pending';
    return true;
  });

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Organization Admin</Text>
          <Text style={styles.subtitle}>Live appointment operations</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Realtime</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadAppointments(false); }} tintColor={colors.primary} />}
      >
        <View style={styles.statsRow}>
          {stats.map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.bg }]}> 
              <MaterialCommunityIcons name={stat.icon as keyof typeof MaterialCommunityIcons.glyphMap} size={22} color={stat.color} />
              <Text style={[styles.statCount, { color: stat.color }]}>{stat.count}</Text>
              <Text style={[styles.statLabel, { color: stat.color }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tabs}>
          {(['today', 'pending', 'all'] as const).map(tab => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Loading live appointments...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <MaterialCommunityIcons name="alert-circle" size={28} color={colors.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadAppointments()}><Text style={styles.retryText}>Retry</Text></Pressable>
          </View>
        ) : (
          <View style={styles.aptList}>
            {filtered.length === 0 ? (
              <View style={styles.centerState}>
                <MaterialCommunityIcons name="calendar-blank" size={30} color={colors.muted} />
                <Text style={styles.stateText}>No appointments in this view.</Text>
              </View>
            ) : filtered.map((appointment, index) => (
              <DoctorAptCard key={appointment.id} apt={appointment} index={index} onUpdate={updateStatus} />
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

function DoctorAptCard({ apt, index, onUpdate }: { apt: AdminAppointment; index: number; onUpdate: (id: string, status: AdminAppointmentStatus) => void }) {
  const slideAnim = useRef(new Animated.Value(16)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const meta = STATUS_META[apt.status] ?? STATUS_META.pending;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, index, slideAnim]);

  return (
    <Animated.View style={[styles.aptCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
      <View style={styles.aptHeader}>
        <View style={styles.aptPatient}>
          <View style={styles.aptAvatar}><MaterialCommunityIcons name="account" size={20} color={colors.primary} /></View>
          <View style={styles.aptTextBlock}>
            <Text style={styles.aptName}>{apt.owner?.full_name || apt.owner?.email || 'Pet Owner'}</Text>
            <Text style={styles.aptPet}>{apt.pet?.name || 'Pet'} | {apt.appointment_type || apt.type || 'Clinic Visit'}</Text>
            <Text style={styles.aptClinic}>{apt.clinic?.hospital_name || apt.clinic?.name || apt.doctor?.clinic_name || 'Clinic'}</Text>
          </View>
        </View>
        <View style={[styles.aptStatus, { backgroundColor: meta.bg }]}><Text style={[styles.aptStatusText, { color: meta.color }]}>{meta.label}</Text></View>
      </View>

      <View style={styles.aptTime}>
        <MaterialCommunityIcons name="clock-outline" size={14} color={colors.muted} />
        <Text style={styles.aptTimeText}>{formatDate(apt.scheduled_at)} at {formatTime(apt.scheduled_at)}</Text>
      </View>

      <View style={styles.aptActions}>
        {apt.status === 'pending' && (
          <>
            <Pressable style={[styles.aptBtn, styles.aptBtnAccept]} onPress={() => onUpdate(apt.id, 'accepted')}><MaterialCommunityIcons name="check" size={14} color="#fff" /><Text style={styles.aptBtnText}>Accept</Text></Pressable>
            <Pressable style={[styles.aptBtn, styles.aptBtnReject]} onPress={() => onUpdate(apt.id, 'rejected')}><MaterialCommunityIcons name="close" size={14} color="#fff" /><Text style={styles.aptBtnText}>Reject</Text></Pressable>
          </>
        )}
        {(apt.status === 'accepted' || apt.status === 'confirmed') && (
          <Pressable style={[styles.aptBtn, styles.aptBtnStart]} onPress={() => onUpdate(apt.id, 'completed')}><MaterialCommunityIcons name="play" size={14} color="#fff" /><Text style={styles.aptBtnText}>Complete</Text></Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.success, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: 12, color: '#fff', opacity: 0.9, marginTop: 2 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  statsRow: { flexDirection: 'row', gap: 8, padding: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 3 },
  statCount: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  tabTextActive: { color: '#fff' },
  centerState: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  stateText: { color: colors.muted, fontWeight: '700', textAlign: 'center' },
  errorText: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: '#fff', fontWeight: '800' },
  aptList: { paddingHorizontal: 20, gap: 12 },
  aptCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, gap: 10 },
  aptHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  aptPatient: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  aptAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  aptTextBlock: { flex: 1 },
  aptName: { fontSize: 14, fontWeight: '900', color: colors.text },
  aptPet: { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 2 },
  aptClinic: { fontSize: 10, color: colors.muted, marginTop: 2 },
  aptStatus: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  aptStatusText: { fontSize: 10, fontWeight: '800' },
  aptTime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aptTimeText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  aptActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  aptBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  aptBtnAccept: { backgroundColor: colors.primary },
  aptBtnReject: { backgroundColor: '#EF4444' },
  aptBtnStart: { backgroundColor: '#0EA5E9', flex: 1, justifyContent: 'center' },
  aptBtnText: { fontSize: 11, fontWeight: '800', color: '#fff' },
});
