import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors } from '../../core/theme/colors';
import { Appointment, AppointmentStatus } from '../types/appointment.types';
import { appointmentService } from '../services/appointmentService';
import { AppointmentCard } from '../components/AppointmentCard';
import { FilterChips } from '../components/FilterChips';
import { EmptyState } from '../components/EmptyState';
import type { AppointmentStackParamList } from '../navigation/AppointmentNavigator';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

const VIEWS = ['All', 'New Requests', 'Today', 'Emergency', 'Upcoming', 'Completed'];

// Demo doctor ID — swap with real auth user ID
const DOCTOR_ID = 'd1';

export function DoctorAppointmentsScreen() {
  const navigation = useNavigation<Nav>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [emergencyAppointments, setEmergencyAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('All');

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [allApts, today, emergency] = await Promise.all([
        appointmentService.getDoctorAppointments(DOCTOR_ID),
        appointmentService.getTodayAppointments(DOCTOR_ID),
        appointmentService.getEmergencyAppointments(DOCTOR_ID),
      ]);
      setAppointments(allApts);
      setTodayAppointments(today);
      setEmergencyAppointments(emergency);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const getFiltered = (): Appointment[] => {
    switch (activeView) {
      case 'New Requests':
        return appointments.filter(a => a.status === AppointmentStatus.PENDING_APPROVAL);
      case 'Today':
        return todayAppointments;
      case 'Emergency':
        return emergencyAppointments;
      case 'Upcoming':
        return appointments.filter(
          a =>
            a.status === AppointmentStatus.CONFIRMED ||
            a.status === AppointmentStatus.UPCOMING
        );
      case 'Completed':
        return appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
      default:
        return appointments;
    }
  };

  const filtered = getFiltered();

  const newRequests = appointments.filter(
    a => a.status === AppointmentStatus.PENDING_APPROVAL
  ).length;
  const todayCount = todayAppointments.length;
  const emergencyCount = emergencyAppointments.length;
  const upcomingCount = appointments.filter(
    a =>
      a.status === AppointmentStatus.CONFIRMED ||
      a.status === AppointmentStatus.UPCOMING
  ).length;

  return (
    <View style={styles.root}>
      {/* ── Header with Gradient ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Doctor Dashboard</Text>
          <Text style={styles.headerSub}>Manage your patient appointments</Text>
        </View>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="medical-bag" size={26} color="#fff" />
        </View>
      </View>

      {/* ── Stats Row ── */}
      {!loading && (
        <View style={styles.statsRow}>
          <StatBox
            label="New"
            count={newRequests}
            color="#FF8F00"
            bgColor="#FFF3E0"
            icon="bell-alert"
          />
          <StatBox
            label="Today"
            count={todayCount}
            color="#0277BD"
            bgColor="#E1F5FE"
            icon="calendar-today"
          />
          <StatBox
            label="Emergency"
            count={emergencyCount}
            color="#EF4444"
            bgColor="#FEE2E2"
            icon="alert-circle"
          />
          <StatBox
            label="Upcoming"
            count={upcomingCount}
            color="#16A34A"
            bgColor="#DCFCE7"
            icon="calendar-clock"
          />
        </View>
      )}

      {/* ── Filters ── */}
      <FilterChips
        filters={VIEWS}
        selected={activeView}
        onSelect={setActiveView}
      />

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon="calendar-blank"
              title={`No ${activeView.toLowerCase()} appointments`}
              message={
                activeView === 'All'
                  ? 'No appointments scheduled yet'
                  : `You have no ${activeView.toLowerCase()} appointments`
              }
            />
          ) : (
            filtered.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                showPatientInfo={true}
                onPress={() =>
                  navigation.navigate('AppointmentDetails', {
                    appointmentId: apt.id,
                    isCustomer: false,
                  })
                }
              />
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────
// StatBox Component
// ──────────────────────────────────────────────────────────────────────

interface StatBoxProps {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

function StatBox({ label, count, color, bgColor, icon }: StatBoxProps) {
  return (
    <View style={[styles.statBox, { backgroundColor: bgColor }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  headerSub: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
});
