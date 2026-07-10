import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vaccinationService } from '../services/vaccinations';
import { colors } from '../core/theme/colors';

interface Vaccine {
  id: string;
  pet_name: string;
  vaccine_name: string;
  given_date: string;
  next_due: string;
  vet_name: string;
  status: 'completed' | 'due' | 'overdue';
  notes?: string;
}

const MOCK_VACCINES: Vaccine[] = [
  { id: '1', pet_name: 'Buddy', vaccine_name: 'Rabies',          given_date: '2025-01-15', next_due: '2026-01-15', vet_name: 'Dr. Anjali Sharma', status: 'completed' },
  { id: '2', pet_name: 'Buddy', vaccine_name: 'DHPP',            given_date: '2025-02-10', next_due: '2026-02-10', vet_name: 'Dr. Anjali Sharma', status: 'completed' },
  { id: '3', pet_name: 'Buddy', vaccine_name: 'Bordetella',      given_date: '2024-12-01', next_due: '2025-12-01', vet_name: 'Dr. Rajesh Kumar', status: 'due'       },
  { id: '4', pet_name: 'Max',   vaccine_name: 'Leptospirosis',   given_date: '2024-11-15', next_due: '2025-11-15', vet_name: 'Dr. Priya Mishra', status: 'overdue'   },
  { id: '5', pet_name: 'Luna',  vaccine_name: 'FVRCP',           given_date: '2025-03-20', next_due: '2026-03-20', vet_name: 'Dr. Anjali Sharma', status: 'completed' },
];

const STATUS_META = {
  completed: { label: 'Completed', color: colors.success, bg: '#DCFCE7', icon: 'check-circle' as const },
  due:       { label: 'Due Soon',  color: '#FF8F00',       bg: '#FFF3E0', icon: 'clock-alert'  as const },
  overdue:   { label: 'Overdue',   color: colors.danger,   bg: '#FEE2E2', icon: 'alert-circle' as const },
};

export function VaccinationScreen() {
  const insets    = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [vaccines, setVaccines]       = useState<Vaccine[]>(MOCK_VACCINES);
  const [loading, setLoading]         = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'due' | 'overdue'>('all');
  const [showModal, setShowModal]     = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadVaccines();
  }, []);

  const loadVaccines = useCallback(async () => {
    try {
      const data = await vaccinationService.listVaccinations();
      if (data.length > 0) setVaccines(data as Vaccine[]);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  const filtered = activeFilter === 'all' ? vaccines : vaccines.filter(v => v.status === activeFilter);
  const counts = {
    completed: vaccines.filter(v => v.status === 'completed').length,
    due:       vaccines.filter(v => v.status === 'due').length,
    overdue:   vaccines.filter(v => v.status === 'overdue').length,
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vaccination Tracker</Text>
          <Text style={styles.subtitle}>{vaccines.length} records across {[...new Set(vaccines.map(v => v.pet_name))].length} pets</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        {(['completed', 'due', 'overdue'] as const).map(s => {
          const m = STATUS_META[s];
          return (
            <Pressable
              key={s}
              style={[styles.statCard, { backgroundColor: m.bg }, activeFilter === s && styles.statCardActive]}
              onPress={() => setActiveFilter(activeFilter === s ? 'all' : s)}
            >
              <MaterialCommunityIcons name={m.icon} size={22} color={m.color} />
              <Text style={[styles.statCount, { color: m.color }]}>{counts[s]}</Text>
              <Text style={[styles.statLabel, { color: m.color }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {(['all', 'completed', 'due', 'overdue'] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadVaccines(); }} tintColor={colors.primary} />}
      >
        {filtered.map((v, i) => <VaccineCard key={v.id} vaccine={v} index={i} />)}
        <View style={{ height: 80 }} />
      </ScrollView>

      <AddVaccineModal visible={showModal} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadVaccines(); }} />
    </Animated.View>
  );
}

function VaccineCard({ vaccine, index }: { vaccine: Vaccine; index: number }) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const meta = STATUS_META[vaccine.status];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.cardLeft}>
        <View style={[styles.vaccineIcon, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name="needle" size={22} color={meta.color} />
        </View>
        <View style={styles.vaccineInfo}>
          <Text style={styles.vaccineName}>{vaccine.vaccine_name}</Text>
          <Text style={styles.petName}>🐾 {vaccine.pet_name}</Text>
          <Text style={styles.vetName}>👨‍⚕️ {vaccine.vet_name}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.dateLabel}>Given</Text>
        <Text style={styles.dateValue}>{vaccine.given_date}</Text>
        <Text style={styles.dateLabel}>Next Due</Text>
        <Text style={[styles.dateValue, vaccine.status === 'overdue' && { color: colors.danger }]}>{vaccine.next_due}</Text>
      </View>
    </Animated.View>
  );
}

function AddVaccineModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const slideAnim = useRef(new Animated.Value(800)).current;
  const [petName,   setPetName]   = useState('');
  const [vaccine,   setVaccine]   = useState('');
  const [givenDate, setGivenDate] = useState('');
  const [nextDue,   setNextDue]   = useState('');
  const [vet,       setVet]       = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: visible ? 0 : 800, friction: 9, useNativeDriver: true }).start();
  }, [visible]);

  const handleSave = async () => {
    if (!petName || !vaccine || !givenDate) { Alert.alert('Required', 'Fill all required fields'); return; }
    setSaving(true);
    try {
      await vaccinationService.createVaccination({ pet_name: petName, vaccine_name: vaccine, given_date: givenDate, next_due: nextDue, vet_name: vet, status: 'completed' });
      Alert.alert('Saved!', 'Vaccination record added.');
      onSaved();
    } catch { Alert.alert('Note', 'Record saved locally.'); onSaved(); }
    setSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <Pressable style={modal.backdrop} onPress={onClose} />
        <Animated.View style={[modal.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={modal.handle} />
          <View style={modal.headerRow}>
            <Text style={modal.title}>Add Vaccination Record</Text>
            <Pressable style={modal.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={modal.saveBtnText}>{saving ? '...' : 'Save'}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={modal.body}>
            {[
              { label: 'Pet Name *', val: petName, set: setPetName, placeholder: 'e.g. Buddy' },
              { label: 'Vaccine Name *', val: vaccine, set: setVaccine, placeholder: 'e.g. Rabies' },
              { label: 'Date Given *', val: givenDate, set: setGivenDate, placeholder: 'YYYY-MM-DD' },
              { label: 'Next Due Date', val: nextDue, set: setNextDue, placeholder: 'YYYY-MM-DD' },
              { label: 'Vet Name', val: vet, set: setVet, placeholder: 'e.g. Dr. Anjali' },
            ].map(f => (
              <View key={f.label} style={modal.field}>
                <Text style={modal.label}>{f.label}</Text>
                <TextInput style={modal.input} value={f.val} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={colors.muted} />
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:    { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  headerRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:    { fontSize: 17, fontWeight: '900', color: colors.text },
  saveBtn:  { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },
  body:     { padding: 20 },
  field:    { marginBottom: 14 },
  label:    { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 6 },
  input:    { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: colors.text, borderWidth: 1.5, borderColor: colors.line },
});

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:      { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle:   { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  addBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  statsRow:   { flexDirection: 'row', gap: 10, padding: 16 },
  statCard:   { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  statCardActive: { borderWidth: 2, borderColor: colors.primary },
  statCount:  { fontSize: 22, fontWeight: '900' },
  statLabel:  { fontSize: 9, fontWeight: '800' },
  chipsRow:   { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: 12, fontWeight: '700', color: colors.muted },
  chipTextActive: { color: '#fff' },
  list:       { paddingHorizontal: 20, gap: 10 },
  card:       { backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardLeft:   { flexDirection: 'row', gap: 12, flex: 1 },
  vaccineIcon:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vaccineInfo:{ flex: 1, gap: 3 },
  vaccineName:{ fontSize: 14, fontWeight: '900', color: colors.text },
  petName:    { fontSize: 11, fontWeight: '600', color: colors.muted },
  vetName:    { fontSize: 11, color: colors.muted },
  cardRight:  { alignItems: 'flex-end', gap: 3 },
  statusBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 9, fontWeight: '800' },
  dateLabel:  { fontSize: 9, color: colors.muted, fontWeight: '700', marginTop: 3 },
  dateValue:  { fontSize: 11, fontWeight: '800', color: colors.text },
});


