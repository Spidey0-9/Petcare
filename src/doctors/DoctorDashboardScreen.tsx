import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import {
  doctorService,
  type DoctorAppointmentCard,
  type DoctorDashboardStats,
  type DoctorPatient,
  type DoctorProfile,
} from '../services/doctors';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../core/theme/colors';
import type { AppointmentRecord, MedicalRecord } from '../types';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';

type DoctorTab = 'dashboard' | 'appointments' | 'patients' | 'records' | 'settings';

const emptyStats: DoctorDashboardStats = {
  todaysAppointments: 0,
  upcomingAppointments: 0,
  completedAppointments: 0,
  cancelledAppointments: 0,
  totalPatients: 0,
  newPatients: 0,
  monthlyConsultations: 0,
  averageRating: 0,
};

const tabs: Array<{ id: DoctorTab; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { id: 'dashboard', label: 'Home', icon: 'view-dashboard' },
  { id: 'appointments', label: 'Visits', icon: 'calendar-clock' },
  { id: 'patients', label: 'Patients', icon: 'paw' },
  { id: 'records', label: 'Records', icon: 'file-document-edit' },
  { id: 'settings', label: 'Settings', icon: 'cog' },
];
const quickActions: Array<{ label: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bg: string; tab?: DoctorTab }> = [
  { label: 'Appointments', subtitle: 'Review requests', icon: 'calendar-check', color: '#0EA5E9', bg: '#E0F2FE', tab: 'appointments' },
  { label: 'Patients', subtitle: 'Open patient list', icon: 'account-heart', color: '#EC4899', bg: '#FDF2F8', tab: 'patients' },
  { label: 'Records', subtitle: 'Reports & notes', icon: 'file-document-edit', color: '#8B5CF6', bg: '#F3E8FF', tab: 'records' },
  { label: 'Availability', subtitle: 'Manage status', icon: 'clock-edit-outline', color: '#14B8A6', bg: '#CCFBF1', tab: 'settings' },
];

const statusMeta = {
  pending: { label: 'Pending', color: '#FF8F00', bg: '#FFF3E0' },
  accepted: { label: 'Accepted', color: '#0EA5E9', bg: '#E0F2FE' },
  confirmed: { label: 'Confirmed', color: '#0EA5E9', bg: '#E0F2FE' },
  rescheduled: { label: 'Rescheduled', color: '#A855F7', bg: '#F3E8FF' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: '#FEE2E2' },
  completed: { label: 'Completed', color: '#22C55E', bg: '#DCFCE7' },
};

function formatTime(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(value);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DoctorDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const resetSessionState = useAppStore(state => state.resetSessionState);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState<DoctorTab>('dashboard');
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState<DoctorDashboardStats>(emptyStats);
  const [appointments, setAppointments] = useState<DoctorAppointmentCard[]>([]);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const loadDoctorModule = useCallback(async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const profile = await authService.getCurrentProfile();
      if (!profile) {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
        return;
      }

      const nextDoctor = await doctorService.ensureDoctorProfile({ ...profile, role: 'doctor' });
      setDoctor(nextDoctor);

      if (!nextDoctor.id) {
        setStats(emptyStats);
        setAppointments([]);
        setPatients([]);
        setRecords([]);
        return;
      }

      const [nextStats, nextAppointments, nextPatients, nextRecords] = await Promise.all([
        doctorService.getDashboardStats(nextDoctor.id),
        doctorService.listTodaysAppointments(nextDoctor.id),
        doctorService.listPatients(nextDoctor.id),
        doctorService.listPatientRecords(nextDoctor.id),
      ]);

      setStats(nextStats);
      setAppointments(nextAppointments);
      setPatients(nextPatients);
      setRecords(nextRecords);
    } catch (error: any) {
      console.error('Doctor module load failed:', error);
      setErrorMessage(error?.message ?? 'Unable to load doctor dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadDoctorModule();
  }, [loadDoctorModule]);

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshDoctorSections = useCallback((sections: ReadonlyArray<'profile' | 'appointments' | 'records' | 'notifications'>) => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(async () => {
      try {
        const unique = new Set(sections);
        if (unique.has('profile')) {
          const profile = await authService.getCurrentProfile();
          if (profile?.role === 'doctor') {
            const nextDoctor = await doctorService.ensureDoctorProfile({ ...profile, role: 'doctor' });
            setDoctor(nextDoctor);
          }
        }

        const doctorId = doctor?.id;
        if (!doctorId) return;

        if (unique.has('appointments')) {
          const [nextStats, nextAppointments, nextPatients] = await Promise.all([
            doctorService.getDashboardStats(doctorId),
            doctorService.listTodaysAppointments(doctorId),
            doctorService.listPatients(doctorId),
          ]);
          setStats(nextStats);
          setAppointments(nextAppointments);
          setPatients(nextPatients);
        }

        if (unique.has('records')) {
          setRecords(await doctorService.listPatientRecords(doctorId));
        }
      } catch (error) {
        console.warn('[DoctorDashboard] Realtime refresh failed:', sections, error);
      }
    }, 400);
  }, [doctor?.id]);

  const handleDoctorRealtime = useCallback((table: string) => {
    if (table === TABLES.profiles || table === TABLES.doctors) refreshDoctorSections(['profile']);
    if (table === TABLES.appointments) refreshDoctorSections(['appointments']);
    if (table === TABLES.medicalRecords) refreshDoctorSections(['records']);
    if (table === TABLES.notifications) refreshDoctorSections(['notifications']);
  }, [refreshDoctorSections]);

  useRealtimeTables('doctor-dashboard', [TABLES.profiles, TABLES.doctors, TABLES.appointments, TABLES.medicalRecords, TABLES.notifications], handleDoctorRealtime);

  useEffect(() => () => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
  }, []);

  const updateStatus = async (appointmentId: string, status: AppointmentRecord['status']) => {
    try {
      await doctorService.updateAppointmentStatus(appointmentId, status);
      setAppointments(prev => prev.map(item => item.id === appointmentId ? { ...item, status } : item));
    } catch (error: any) {
      Alert.alert('Update failed', error?.message ?? 'Please try again.');
    }
  };

  const toggleAvailability = async (available: boolean) => {
    if (!doctor?.id) return;
    try {
      const updated = await doctorService.updateOnlineStatus(doctor.id, available);
      setDoctor(prev => prev ? { ...prev, is_available: updated.is_available } : prev);
    } catch (error: any) {
      Alert.alert('Availability update failed', error?.message ?? 'Please try again.');
    }
  };

  const signOut = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.signOut();
          resetSessionState();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
        },
      },
    ]);
  };

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter(patient => [patient.name, patient.species, patient.breed, patient.owner?.full_name].some(value => value?.toLowerCase().includes(query)));
  }, [patients, search]);

  const doctorName = doctor?.profile?.full_name ?? 'Doctor';
  const specialization = doctor?.specialization ?? 'Veterinarian';

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.title}>{doctorName}</Text>
            <Text style={styles.subtitle}>{specialization} • {formatDate()}</Text>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => navigation.getParent()?.navigate('Notifications' as never)}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={19} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients, records, appointments"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Pressable key={tab.id} style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]} onPress={() => setActiveTab(tab.id)}>
            <MaterialCommunityIcons name={tab.icon} size={19} color={activeTab === tab.id ? colors.primary : colors.muted} />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]} numberOfLines={1}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDoctorModule(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <EmptyState icon="loading" title="Loading doctor dashboard..." />
        ) : errorMessage ? (
          <EmptyState icon="alert-circle-outline" title="Doctor dashboard unavailable" subtitle={errorMessage} actionLabel="Try Again" onAction={loadDoctorModule} />
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab doctor={doctor} stats={stats} appointments={appointments} patients={patients} onToggleAvailability={toggleAvailability} onSelectTab={setActiveTab} />}
            {activeTab === 'appointments' && <AppointmentsTab appointments={appointments} onUpdateStatus={updateStatus} />}
            {activeTab === 'patients' && <PatientsTab patients={filteredPatients} />}
            {activeTab === 'records' && <RecordsTab records={records} reload={loadDoctorModule} />}
            {activeTab === 'settings' && <SettingsTab doctor={doctor} onToggleAvailability={toggleAvailability} onLogout={signOut} />}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
}

function DashboardTab({ doctor, stats, appointments, patients, onToggleAvailability, onSelectTab }: { doctor: DoctorProfile | null; stats: DoctorDashboardStats; appointments: DoctorAppointmentCard[]; patients: DoctorPatient[]; onToggleAvailability: (value: boolean) => void; onSelectTab: (tab: DoctorTab) => void }) {
  const statItems = [
    { label: "Today's", value: stats.todaysAppointments, icon: 'calendar-today', color: colors.primary, bg: '#F0EEFF' },
    { label: 'Upcoming', value: stats.upcomingAppointments, icon: 'calendar-clock', color: '#0EA5E9', bg: '#E0F2FE' },
    { label: 'Completed', value: stats.completedAppointments, icon: 'check-circle', color: '#22C55E', bg: '#DCFCE7' },
    { label: 'Cancelled', value: stats.cancelledAppointments, icon: 'close-circle', color: '#EF4444', bg: '#FEE2E2' },
    { label: 'Patients', value: stats.totalPatients, icon: 'account-heart', color: '#EC4899', bg: '#FDF2F8' },
    { label: 'New', value: stats.newPatients, icon: 'account-plus', color: '#14B8A6', bg: '#CCFBF1' },
    { label: 'Monthly', value: stats.monthlyConsultations, icon: 'chart-line', color: '#8B5CF6', bg: '#F3E8FF' },
    { label: 'Rating', value: stats.averageRating.toFixed(1), icon: 'star', color: '#F59E0B', bg: '#FEF3C7' },
  ];

  const nextAppointment = appointments.find(item => !['cancelled', 'rejected', 'completed'].includes(item.status)) ?? appointments[0];
  const estimatedEarnings = Number(doctor?.consultation_fee ?? 0) * stats.completedAppointments;

  return (
    <>
      <View style={styles.profileCard}>
        <View style={styles.doctorAvatar}><MaterialCommunityIcons name="doctor" size={34} color="#FFFFFF" /></View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{doctor?.profile?.full_name ?? 'Doctor Profile'}</Text>
          <Text style={styles.profileMeta}>{doctor?.qualification ?? 'Qualification'} • {doctor?.experience_years ?? 0} yrs</Text>
          <Text style={styles.profileMeta}>Fee Rs {Number(doctor?.consultation_fee ?? 0).toFixed(0)} - Rating {stats.averageRating.toFixed(1)}</Text>
        </View>
        <View style={styles.availabilityBox}>
          <Text style={styles.availabilityLabel}>{doctor?.is_available ? 'Online' : 'Offline'}</Text>
          <Switch value={!!doctor?.is_available} onValueChange={onToggleAvailability} />
        </View>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Today</Text>
            <Text style={styles.heroTitle}>{stats.todaysAppointments} appointments scheduled</Text>
          </View>
          <View style={styles.heroBadge}>
            <MaterialCommunityIcons name={doctor?.is_available ? 'access-point' : 'access-point-off'} size={18} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>{doctor?.is_available ? 'Accepting' : 'Paused'}</Text>
          </View>
        </View>
        <View style={styles.heroMetrics}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{stats.upcomingAppointments}</Text>
            <Text style={styles.heroMetricLabel}>Upcoming</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{stats.totalPatients}</Text>
            <Text style={styles.heroMetricLabel}>Patients</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>Rs {estimatedEarnings.toFixed(0)}</Text>
            <Text style={styles.heroMetricLabel}>Earnings</Text>
          </View>
        </View>
      </View>

      <SectionHeader title="Quick Actions" action="Manage" onPress={() => onSelectTab('settings')} />
      <View style={styles.quickGrid}>
        {quickActions.map(item => (
          <Pressable key={item.label} style={[styles.quickCard, { backgroundColor: item.bg }]} onPress={() => item.tab && onSelectTab(item.tab)}>
            <View style={[styles.quickIcon, { backgroundColor: item.color }]}><MaterialCommunityIcons name={item.icon} size={20} color="#FFFFFF" /></View>
            <Text style={[styles.quickTitle, { color: item.color }]}>{item.label}</Text>
            <Text style={styles.quickSub}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Next Visit" action="View all" onPress={() => onSelectTab('appointments')} />
      {nextAppointment ? (
        <AppointmentCard appointment={nextAppointment} onUpdateStatus={() => onSelectTab('appointments')} />
      ) : (
        <View style={styles.compactEmpty}><MaterialCommunityIcons name="calendar-blank" size={22} color={colors.muted} /><Text style={styles.compactEmptyText}>No upcoming visits for today.</Text></View>
      )}

      <SectionHeader title="Overview" />
      <View style={styles.statsGrid}>
        {statItems.map(item => <StatCard key={item.label} item={item} />)}
      </View>

      <SectionHeader title="Recent Patients" action="Open" onPress={() => onSelectTab('patients')} />
      <View style={styles.patientStrip}>
        {patients.slice(0, 3).map(patient => (
          <Pressable key={patient.id} style={styles.patientPill} onPress={() => onSelectTab('patients')}>
            <View style={styles.patientPillAvatar}><MaterialCommunityIcons name="paw" size={18} color={colors.primary} /></View>
            <Text style={styles.patientPillName} numberOfLines={1}>{patient.name}</Text>
          </Pressable>
        ))}
        {patients.length === 0 && <Text style={styles.stripEmptyText}>Patients will appear after completed visits.</Text>}
      </View>
    </>
  );
}

function AppointmentsTab({ appointments, onUpdateStatus }: { appointments: DoctorAppointmentCard[]; onUpdateStatus: (id: string, status: AppointmentRecord['status']) => void }) {
  if (appointments.length === 0) return <EmptyState icon="calendar-blank" title="No appointments today" subtitle="New appointments will appear here in realtime." />;

  return <View style={styles.list}>{appointments.map(item => <AppointmentCard key={item.id} appointment={item} onUpdateStatus={onUpdateStatus} />)}</View>;
}

function PatientsTab({ patients }: { patients: DoctorPatient[] }) {
  if (patients.length === 0) return <EmptyState icon="paw-off" title="No patients yet" subtitle="Patients appear after appointments are booked." />;

  return <View style={styles.list}>{patients.map(patient => <PatientCard key={patient.id} patient={patient} />)}</View>;
}

function RecordsTab({ records, reload }: { records: MedicalRecord[]; reload: () => void }) {
  return (
    <View style={styles.list}>
      {records.length === 0 ? <EmptyState icon="file-document-outline" title="No records yet" subtitle="Prescriptions and reports created by you will appear here." /> : records.map(record => (
        <View key={record.id} style={styles.infoCard}>
          <MaterialCommunityIcons name="file-document" size={24} color={colors.primary} />
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>{record.title}</Text>
            <Text style={styles.infoSub}>{record.type} • {record.created_at ? formatDate(new Date(record.created_at)) : 'recent'}</Text>
          </View>
          <Pressable onPress={reload}><MaterialCommunityIcons name="refresh" size={20} color={colors.muted} /></Pressable>
        </View>
      ))}
    </View>
  );
}
function SettingsTab({ doctor, onToggleAvailability, onLogout }: { doctor: DoctorProfile | null; onToggleAvailability: (value: boolean) => void; onLogout: () => void }) {
  const settings = [
    { icon: 'calendar-edit', title: 'Availability', subtitle: 'Working days, hours, break time and duration' },
    { icon: 'video-outline', title: 'Consultation', subtitle: 'Video, voice and chat consultation settings' },
    { icon: 'bell-outline', title: 'Notifications', subtitle: 'Appointments, emergencies and patient updates' },
    { icon: 'star-outline', title: 'Reviews', subtitle: 'Average rating and recent patient reviews' },
    { icon: 'cash-multiple', title: 'Earnings', subtitle: 'Daily, weekly and monthly consultations' },
  ];

  return (
    <View style={styles.list}>
      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="circle" size={20} color={doctor?.is_available ? colors.success : colors.muted} />
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Online Status</Text>
          <Text style={styles.infoSub}>Receive appointment and emergency requests</Text>
        </View>
        <Switch value={!!doctor?.is_available} onValueChange={onToggleAvailability} />
      </View>
      {settings.map(item => <View key={item.title} style={styles.infoCard}><MaterialCommunityIcons name={item.icon as any} size={22} color={colors.primary} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>{item.title}</Text><Text style={styles.infoSub}>{item.subtitle}</Text></View><MaterialCommunityIcons name="chevron-right" size={20} color={colors.muted} /></View>)}
      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!action && <Pressable style={styles.sectionAction} onPress={onPress}><Text style={styles.sectionActionText}>{action}</Text><MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} /></Pressable>}
    </View>
  );
}
function StatCard({ item }: { item: { label: string; value: string | number; icon: string; color: string; bg: string } }) {
  return (
    <View style={[styles.statCard, { backgroundColor: item.bg }]}>
      <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
      <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
      <Text style={[styles.statLabel, { color: item.color }]}>{item.label}</Text>
    </View>
  );
}

function AppointmentCard({ appointment, onUpdateStatus }: { appointment: DoctorAppointmentCard; onUpdateStatus: (id: string, status: AppointmentRecord['status']) => void }) {
  const meta = statusMeta[appointment.status] ?? statusMeta.pending;
  const canStartConsultation = !!appointment.video_url && ['accepted', 'confirmed', 'rescheduled'].includes(appointment.status);
  const openConsultation = async () => {
    if (!appointment.video_url) return;
    try {
      await Linking.openURL(appointment.video_url);
    } catch (error: any) {
      Alert.alert('Consultation unavailable', error?.message ?? 'Unable to open the consultation room.');
    }
  };
  return (
    <View style={styles.appointmentCard}>
      <View style={styles.appointmentTop}>
        <View style={styles.petAvatar}><MaterialCommunityIcons name="paw" size={22} color={colors.primary} /></View>
        <View style={styles.appointmentCopy}>
          <Text style={styles.cardTitle}>{appointment.pet?.name ?? 'Pet'}</Text>
          <Text style={styles.cardSub}>{appointment.owner?.full_name ?? 'Owner'} • {formatTime(appointment.scheduled_at)}</Text>
          <Text style={styles.cardSub}>{appointment.reason ?? appointment.symptoms ?? 'Consultation'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}><Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text></View>
      </View>
      <View style={styles.actionRow}>
        {appointment.status === 'pending' && <><ActionButton label="Accept" icon="check" color={colors.success} onPress={() => onUpdateStatus(appointment.id, 'accepted')} /><ActionButton label="Reject" icon="close" color={colors.danger} onPress={() => onUpdateStatus(appointment.id, 'rejected')} /></>}
        {canStartConsultation && <ActionButton label="Start" icon="video" color="#0EA5E9" onPress={openConsultation} />}
        {['accepted', 'confirmed', 'rescheduled'].includes(appointment.status) && <ActionButton label="Complete" icon="check-all" color={colors.success} onPress={() => onUpdateStatus(appointment.id, 'completed')} />}
        <ActionButton label="Reschedule" icon="calendar-sync" color="#8B5CF6" onPress={() => onUpdateStatus(appointment.id, 'rescheduled')} />
      </View>
    </View>
  );
}

function PatientCard({ patient }: { patient: DoctorPatient }) {
  return (
    <View style={styles.patientCard}>
      <View style={styles.petAvatar}><MaterialCommunityIcons name="paw" size={22} color={colors.primary} /></View>
      <View style={styles.infoCopy}>
        <Text style={styles.cardTitle}>{patient.name}</Text>
        <Text style={styles.cardSub}>{patient.species ?? 'Pet'} • {patient.breed ?? 'Breed'} • {patient.weight ?? 0} kg</Text>
        <Text style={styles.cardSub}>{patient.owner?.full_name ?? 'Owner'} • {patient.owner?.phone ?? 'No phone'}</Text>
      </View>
    </View>
  );
}

function ActionButton({ label, icon, color, onPress }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={14} color="#FFFFFF" />
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ icon, title, subtitle, actionLabel, onAction }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name={icon} size={42} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {!!actionLabel && <Pressable style={styles.emptyButton} onPress={onAction}><Text style={styles.emptyButtonText}>{actionLabel}</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  notificationButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
  searchBar: { minHeight: 46, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, marginTop: 14 },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  tabBar: { minHeight: 66, backgroundColor: colors.surface, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: colors.primary },
  tabLabel: { fontSize: 10, color: colors.muted, fontWeight: '800' },
  tabLabelActive: { color: colors.primary },
  content: { padding: 16, paddingBottom: 110 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  doctorAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  profileMeta: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  availabilityBox: { alignItems: 'center', gap: 2 },
  availabilityLabel: { color: colors.text, fontSize: 11, fontWeight: '900' },
  heroPanel: { backgroundColor: colors.primary, borderRadius: 18, padding: 16, marginBottom: 16, gap: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '900' },
  heroTitle: { color: '#FFFFFF', fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 4 },
  heroBadge: { minHeight: 34, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  heroMetrics: { flexDirection: 'row', gap: 10 },
  heroMetric: { flex: 1, minHeight: 64, borderRadius: 14, padding: 10, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' },
  heroMetricValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  heroMetricLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '900', marginTop: 2 },
  sectionHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  sectionAction: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
  sectionActionText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  quickCard: { width: '47.9%', minHeight: 116, borderRadius: 14, padding: 12, justifyContent: 'space-between' },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontSize: 14, fontWeight: '900', marginTop: 10 },
  quickSub: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  compactEmpty: { minHeight: 76, borderRadius: 14, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  compactEmptyText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  patientStrip: { minHeight: 82, borderRadius: 14, backgroundColor: colors.surface, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  patientPill: { width: 92, alignItems: 'center', gap: 6 },
  patientPillAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F0EEFF', alignItems: 'center', justifyContent: 'center' },
  patientPillName: { color: colors.text, fontSize: 11, fontWeight: '900', maxWidth: 86 },
  stripEmptyText: { color: colors.muted, fontSize: 12, fontWeight: '800' },  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47.9%', minHeight: 94, borderRadius: 14, padding: 12, justifyContent: 'center', gap: 5 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '900' },
  list: { gap: 12 },
  appointmentCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 12 },
  appointmentTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  petAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0EEFF', alignItems: 'center', justifyContent: 'center' },
  appointmentCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  cardSub: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  statusBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButton: { minHeight: 36, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  patientCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  patientActions: { gap: 6 },
  miniButton: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.primary + '12' },
  miniButtonText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  infoCard: { minHeight: 72, backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoCopy: { flex: 1, minWidth: 0 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  infoSub: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2, fontWeight: '700' },
  primaryAction: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  logoutButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#FEE2E2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: colors.danger, fontWeight: '900' },
  emptyState: { minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptySub: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyButton: { marginTop: 8, borderRadius: 10, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '900' },
});


