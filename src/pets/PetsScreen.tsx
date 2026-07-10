import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { petService, type PetAppointmentSummary, type PetListItem } from '../services/pets';
import { authService } from '../services/auth';
import { colors } from '../core/theme/colors';
import { AddPetModal } from './AddPetModal';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';

const PET_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  dog: 'dog', cat: 'cat', bird: 'bird', rabbit: 'rabbit', fish: 'fish', hamster: 'rodent', other: 'paw',
};

const HEALTH_COLORS = (score: number) =>
  score >= 80 ? { color: colors.success, bg: '#DCFCE7' }
: score >= 60 ? { color: '#FF8F00', bg: '#FFF3E0' }
: { color: colors.danger, bg: '#FEE2E2' };

function petSpecies(pet: PetListItem) {
  return pet.species ?? pet.type ?? 'Other';
}

function calculateAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) years -= 1;
  return Math.max(years, 0);
}

function calculateHealthScore(pet: PetListItem) {
  let score = 70;
  const status = pet.vaccination_status?.toLowerCase() ?? '';
  if (status.includes('fully')) score += 15;
  else if (status.includes('partial') || status.includes('due')) score += 6;
  else if (status.includes('not')) score -= 8;
  if (pet.date_of_birth) score += 4;
  if (Number(pet.weight ?? 0) > 0) score += 4;
  if (pet.allergies) score -= 8;
  if (pet.medical_conditions) score -= 10;
  return Math.max(30, Math.min(95, score));
}

function formatNextAppointment(appointment?: PetAppointmentSummary) {
  if (!appointment) return 'No upcoming appt';
  const date = new Date(appointment.scheduled_at);
  if (Number.isNaN(date.getTime())) return 'Upcoming appt set';
  return `Next appt: ${new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date)}`;
}

export function PetsScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [pets, setPets] = useState<PetListItem[]>([]);
  const [appointments, setAppointments] = useState<Record<string, PetAppointmentSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPet, setEditingPet] = useState<PetListItem | null>(null);

  const loadPets = useCallback(async () => {
    setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        setPets([]);
        setAppointments({});
        return;
      }
      const [petRows, appointmentRows] = await Promise.all([
        petService.listByOwner(user.id),
        petService.listUpcomingAppointmentsByOwner(user.id),
      ]);
      setPets(petRows);
      const nextByPet: Record<string, PetAppointmentSummary> = {};
      appointmentRows.forEach(appointment => {
        if (!nextByPet[appointment.pet_id]) nextByPet[appointment.pet_id] = appointment;
      });
      setAppointments(nextByPet);
    } catch (error) {
      console.error('Unable to load pets:', error);
      Alert.alert('Pets unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadPets();
  }, [fadeAnim, loadPets]);

  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePetsRealtime = useCallback(() => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(() => {
      loadPets();
    }, 350);
  }, [loadPets]);

  useRealtimeTables('pets-screen', [TABLES.pets, TABLES.appointments, TABLES.vaccinations, TABLES.medicalRecords, TABLES.petHealthLogs], handlePetsRealtime);

  useEffect(() => () => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
  }, []);

  const deletePet = (id: string, name: string) => {
    Alert.alert('Delete Pet', `Remove ${name} from your profile?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await petService.deletePet(id);
            await loadPets();
          } catch (error) {
            Alert.alert('Delete failed', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  const openAdd = () => { setEditingPet(null); setShowAddModal(true); };
  const openEdit = (pet: PetListItem) => { setEditingPet(pet); setShowAddModal(true); };
  const closeModal = () => { setShowAddModal(false); setEditingPet(null); };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Pets</Text>
          <Text style={styles.subtitle}>{loading ? 'Loading pets...' : `${pets.length} pet${pets.length !== 1 ? 's' : ''} registered`}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.refreshBtn} onPress={() => { setRefreshing(true); loadPets(); }}>
            <MaterialCommunityIcons name="refresh" size={20} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add Pet</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPets(); }} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.emptySub}>Loading your pets...</Text>
          </View>
        ) : pets.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="paw-off" size={56} color={colors.muted + '60'} />
            <Text style={styles.emptyTitle}>No pets yet</Text>
            <Text style={styles.emptySub}>Tap "Add Pet" to create your first pet profile</Text>
            <Pressable style={styles.emptyBtn} onPress={openAdd}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Your First Pet</Text>
            </Pressable>
          </View>
        ) : (
          pets.map((pet, index) => (
            <PetCard
              key={pet.id}
              pet={pet}
              index={index}
              healthScore={calculateHealthScore(pet)}
              nextAppointment={appointments[pet.id]}
              onEdit={() => openEdit(pet)}
              onDelete={() => deletePet(pet.id, pet.name)}
            />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <AddPetModal
        visible={showAddModal}
        initialPet={editingPet}
        onClose={closeModal}
        onSuccess={() => { closeModal(); loadPets(); }}
      />
    </Animated.View>
  );
}

function PetCard({ pet, index, healthScore, nextAppointment, onEdit, onDelete }: {
  pet: PetListItem;
  index: number;
  healthScore: number;
  nextAppointment?: PetAppointmentSummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const delay = index * 80;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressAnim, { toValue: healthScore / 100, duration: 1000, delay: delay + 300, useNativeDriver: false }).start();
  }, [healthScore, index, slideAnim, fadeAnim, progressAnim]);

  const species = petSpecies(pet);
  const age = calculateAge(pet.date_of_birth) ?? pet.age ?? null;
  const petType = species.toLowerCase() as keyof typeof PET_ICONS;
  const petIcon = PET_ICONS[petType] ?? 'paw';
  const hColors = HEALTH_COLORS(healthScore);
  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const vaccMeta: Record<string, { color: string; icon: string }> = {
    'Fully Vaccinated': { color: colors.success, icon: 'check-circle' },
    'Partially Vaccinated': { color: '#FF8F00', icon: 'clock-alert' },
    'Not Vaccinated': { color: colors.danger, icon: 'alert-circle' },
    'Due for Vaccination': { color: '#FF8F00', icon: 'bell-ring' },
  };
  const currentVacc = pet.vaccination_status ?? 'Unknown';
  const meta = vaccMeta[currentVacc] ?? { color: colors.muted, icon: 'help-circle' };

  const actions = [
    { icon: 'pencil', label: 'Edit', color: colors.primary, onPress: onEdit },
    { icon: 'trash-can', label: 'Delete', color: colors.danger, onPress: onDelete },
    { icon: 'eye', label: expanded ? 'Hide' : 'Details', color: '#0EA5E9', onPress: () => setExpanded(value => !value) },
  ];

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.cardTop}>
        <View style={[styles.petAvatar, { backgroundColor: hColors.bg }]}>
          {pet.image_url ? <Image source={{ uri: pet.image_url }} style={styles.petAvatarImage} /> : <MaterialCommunityIcons name={petIcon} size={36} color={hColors.color} />}
          <View style={[styles.genderDot, { backgroundColor: pet.gender === 'Female' ? '#EC4899' : '#0EA5E9' }]} />
        </View>

        <View style={styles.petInfo}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petBreed}>{pet.breed ?? species}{age !== null ? ` • ${age} yr` : ''}</Text>
          {Number(pet.weight ?? 0) > 0 && <Text style={styles.petWeight}>{pet.weight} kg</Text>}
        </View>

        <View style={[styles.healthCircle, { borderColor: hColors.color }]}>
          <Text style={[styles.healthScore, { color: hColors.color }]}>{healthScore}</Text>
          <Text style={[styles.healthLabel, { color: hColors.color }]}>Score</Text>
        </View>
      </View>

      <View style={styles.healthBarSection}>
        <Text style={styles.healthBarLabel}>Health Status</Text>
        <View style={styles.healthTrack}>
          <Animated.View style={[styles.healthFill, { width: barWidth, backgroundColor: hColors.color }]} />
        </View>
        <Text style={[styles.healthPct, { color: hColors.color }]}>{healthScore}%</Text>
      </View>

      <View style={styles.vaccRow}>
        <MaterialCommunityIcons name={meta.icon as any} size={14} color={meta.color} />
        <Text style={[styles.vaccText, { color: meta.color }]}>{currentVacc}</Text>
        <Text style={styles.nextAppt}>{formatNextAppointment(nextAppointment)}</Text>
      </View>

      <View style={styles.actionsRow}>
        {actions.map(action => (
          <Pressable key={action.label} style={styles.actionBtn} onPress={action.onPress}>
            <MaterialCommunityIcons name={action.icon as any} size={16} color={action.color} />
            <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {expanded && (
        <View style={styles.expanded}>
          {[
            { label: 'Species', value: species },
            { label: 'Gender', value: pet.gender ?? '-' },
            { label: 'DOB', value: pet.date_of_birth ?? '-' },
            { label: 'Weight', value: pet.weight ? `${pet.weight} kg` : '-' },
            { label: 'Color', value: pet.color ?? '-' },
            { label: 'Microchip', value: pet.microchip_number ?? '-' },
            { label: 'Blood Group', value: pet.blood_group ?? '-' },
          ].map(detail => (
            <View key={detail.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontSize: 24, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  list: { padding: 20, gap: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.muted },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  petAvatar: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  petAvatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  genderDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.surface },
  petInfo: { flex: 1, gap: 4 },
  petName: { fontSize: 20, fontWeight: '900', color: colors.text },
  petBreed: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  petWeight: { fontSize: 11, color: colors.muted },
  healthCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  healthScore: { fontSize: 18, fontWeight: '900' },
  healthLabel: { fontSize: 9, fontWeight: '800' },
  healthBarSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthBarLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, width: 80 },
  healthTrack: { flex: 1, height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  healthFill: { height: 6, borderRadius: 3 },
  healthPct: { fontSize: 11, fontWeight: '900', width: 32, textAlign: 'right' },
  vaccRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vaccText: { fontSize: 12, fontWeight: '700', flex: 1 },
  nextAppt: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 0, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, justifyContent: 'space-between' },
  actionBtn: { alignItems: 'center', gap: 4, flex: 1 },
  actionLabel: { fontSize: 9, fontWeight: '800' },
  expanded: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  detailLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'right' },
});

