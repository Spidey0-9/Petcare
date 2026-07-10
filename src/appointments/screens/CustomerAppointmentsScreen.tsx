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

import { AppScreen } from '../../core/components/AppScreen';
import { colors } from '../../core/theme/colors';
import { Appointment, AppointmentStatus } from '../types/appointment.types';
import { appointmentService } from '../services/appointmentService';
import { AppointmentCard } from '../components/AppointmentCard';
import { FilterChips } from '../components/FilterChips';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import type { AppointmentStackParamList } from '../navigation/AppointmentNavigator';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;

const FILTERS = ['All', 'Pending', 'Confirmed', 'Upcoming', 'Completed', 'Cancelled'];

const STATUS_MAP: Record<string, AppointmentStatus[]> = {
  All: Object.values(AppointmentStatus),
  Pending: [AppointmentStatus.PENDING_APPROVAL],
  Confirmed: [AppointmentStatus.CONFIRMED],
  Upcoming: [AppointmentStatus.CONFIRMED, AppointmentStatus.UPCOMING],
  Completed: [AppointmentStatus.COMPLETED],
  Cancelled: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
};

// Demo customer ID — swap with real auth user ID
const CUSTOMER_ID = 'c1';

export function CustomerAppointmentsScreen() {
  const navigation = useNavigation<Nav>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await appointmentService.getCustomerAppointments(CUSTOMER_ID);
      setAppointments(data as unknown as Appointment[]);
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

  const filtered = appointments.filter(a =>
    STATUS_MAP[activeFilter]?.includes(a.status)
  );

  const upcoming = appointments.filter(
    a => a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.UPCOMING
  ).length;
  const pending = appointments.filter(
    a => a.status === AppointmentStatus.PENDING_APPROVAL
  ).length;
  const completed = appointments.filter(
    a => a.status === AppointmentStatus.COMPLETED
  ).length;

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Appointments</Text>
          <Text style={styles.headerSub}>Manage your pet care appointments</Text>
        </View>
        <View style={[styles.headerIcon]}>
          <MaterialCommunityIcons name="calendar-month" size={26} color={colors.primary} />
        </View>
      </View>

      {/* ── Stats Row ── */}
      {!loading && (
        <View style={styles.statsRow}>
          <StatCard
            label="Upcoming"
            count={upcoming}
            color="#2E7D32"
            bgColor="#E8F5E9"
            icon="calendar-check"
          />
          <StatCard
            label="Pending"
            count={pending}
            color="#FF8F00"
            bgColor="#FFF3E0"
            icon="clock-alert"
          />
          <StatCard
            label="Completed"
            count={completed}
            color="#16A34A"
            bgColor="#DCFCE7"
            icon="check-circle"
          />
        </View>
      )}

      {/* ── Filters ── */}
      <FilterChips
        filters={FILTERS}
        selected={activeFilter}
        onSelect={setActiveFilter}
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
              title={`No ${activeFilter.toLowerCase()} appointments`}
              message={
                activeFilter === 'All'
                  ? 'Tap the button below to book your first appointment'
                  : `You have no ${activeFilter.toLowerCase()} appointments`
              }
            />
          ) : (
            filtered.map(apt => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onPress={() =>
                  navigation.navigate('AppointmentDetails', {
                    appointmentId: apt.id,
                    isCustomer: true,
                  })
                }
              />
            ))
          )}
          {/* Bottom padding so FAB doesn't cover last card */}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* ── Book Appointment FAB ── */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() =>
          navigation.navigate('BookAppointment', { customerId: CUSTOMER_ID })
        }
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.fabText}>Book Appointment</Text>
      </Pressable>
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
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
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
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
