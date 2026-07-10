import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors } from '../../core/theme/colors';
import {
  AppointmentType,
  AppointmentStatus,
  PaymentStatus,
  APPOINTMENT_TYPE_INFO,
  Pet,
  Hospital,
  Doctor,
  BookingFormData,
} from '../types/appointment.types';
import { appointmentService } from '../services/appointmentService';
import type { AppointmentStackParamList } from '../navigation/AppointmentNavigator';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;
type RouteParams = RouteProp<AppointmentStackParamList, 'BookAppointment'>;

const STEPS = [
  'Select Type',
  'Choose Pet',
  'Select Hospital',
  'Choose Doctor',
  'Pick Date',
  'Time Slot',
  'Symptoms',
];

export function BookAppointmentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const customerId = route.params?.customerId || 'c1';

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<BookingFormData>({});

  // Data loaded per step
  const [pets, setPets] = useState<Pet[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState('');

  // Load data on-demand
  const loadPets = async () => {
    setLoading(true);
    const data = await appointmentService.getPets();
    setPets(data);
    setLoading(false);
  };

  const loadHospitals = async () => {
    setLoading(true);
    const data = await appointmentService.getHospitals();
    setHospitals(data);
    setLoading(false);
  };

  const loadDoctors = async (hospitalId: string) => {
    setLoading(true);
    const data = await appointmentService.getDoctorsByHospital(hospitalId);
    setDoctors(data);
    setLoading(false);
  };

  const loadSlots = async (doctorId: string, date: string) => {
    setLoading(true);
    const data = await appointmentService.getAvailableSlots(doctorId, date);
    setSlots(data);
    setLoading(false);
  };

  const handleNext = async () => {
    // Validation
    if (step === 0 && !form.type) {
      Alert.alert('Required', 'Please select an appointment type');
      return;
    }
    if (step === 1 && !form.petId) {
      Alert.alert('Required', 'Please select a pet');
      return;
    }
    if (step === 2 && !form.hospitalId) {
      Alert.alert('Required', 'Please select a hospital');
      return;
    }
    if (step === 3 && !form.doctorId) {
      Alert.alert('Required', 'Please select a doctor');
      return;
    }
    if (step === 4 && !form.date) {
      Alert.alert('Required', 'Please select a date');
      return;
    }
    if (step === 5 && !form.timeSlot) {
      Alert.alert('Required', 'Please select a time slot');
      return;
    }
    if (step === 6 && !symptoms.trim()) {
      Alert.alert('Required', 'Please describe symptoms or reason');
      return;
    }

    // Pre-load data for next step
    if (step === 0) await loadPets();
    if (step === 1) await loadHospitals();
    if (step === 2 && form.hospitalId) await loadDoctors(form.hospitalId);
    if (step === 4 && form.doctorId && form.date) await loadSlots(form.doctorId, form.date);

    // Final step: book
    if (step === 6) {
      await bookAppointment();
      return;
    }

    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigation.goBack();
  };

  const bookAppointment = async () => {
    setLoading(true);
    try {
      const pet = pets.find(p => p.id === form.petId);
      const doctor = doctors.find(d => d.id === form.doctorId);
      const hospital = hospitals.find(h => h.id === form.hospitalId);

      if (!pet || !doctor || !hospital) {
        Alert.alert('Error', 'Missing required data');
        return;
      }

      await appointmentService.bookAppointment({
        customerId,
        customerName: 'John Doe', // Replace with actual user name
        doctorId: doctor.id,
        doctorName: doctor.name,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        petId: pet.id,
        petName: pet.name,
        type: form.type!,
        date: form.date!,
        timeSlot: form.timeSlot!,
        status: AppointmentStatus.PENDING_APPROVAL,
        paymentStatus: PaymentStatus.PENDING,
        symptoms,
        medicalReports: [],
        fee: doctor.consultationFee,
      });

      Alert.alert('Success!', 'Appointment booked successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── Header with progress ── */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerStep}>
            Step {step + 1} of {STEPS.length}
          </Text>
        </View>
      </View>

      {/* ── Progress dots ── */}
      <View style={styles.progressRow}>
        {STEPS.map((label, i) => (
          <View key={i} style={styles.progressItem}>
            <View
              style={[
                styles.dot,
                i <= step && styles.dotActive,
                i < step && styles.dotComplete,
              ]}
            >
              {i < step ? (
                <MaterialCommunityIcons name="check" size={12} color="#fff" />
              ) : (
                <Text style={styles.dotText}>{i + 1}</Text>
              )}
            </View>
            <Text style={styles.dotLabel} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Step content ── */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{STEPS[step]}</Text>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {step === 0 && <StepAppointmentType selected={form.type} onSelect={(t) => setForm({ ...form, type: t })} />}
            {step === 1 && <StepSelectPet pets={pets} selected={form.petId} onSelect={(id) => setForm({ ...form, petId: id })} />}
            {step === 2 && <StepSelectHospital hospitals={hospitals} selected={form.hospitalId} onSelect={(id) => setForm({ ...form, hospitalId: id })} />}
            {step === 3 && <StepSelectDoctor doctors={doctors} selected={form.doctorId} onSelect={(id) => setForm({ ...form, doctorId: id })} />}
            {step === 4 && <StepSelectDate selected={form.date} onSelect={(d) => setForm({ ...form, date: d })} />}
            {step === 5 && <StepSelectSlot slots={slots} selected={form.timeSlot} onSelect={(s) => setForm({ ...form, timeSlot: s })} />}
            {step === 6 && <StepSymptoms value={symptoms} onChange={setSymptoms} form={form} pets={pets} doctors={doctors} hospitals={hospitals} />}
          </>
        )}
      </ScrollView>

      {/* ── Footer buttons ── */}
      <View style={styles.footer}>
        {step > 0 && (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextButton, step === 0 && styles.nextButtonFull]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 6 ? 'Book Appointment' : 'Continue'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step Components
// ──────────────────────────────────────────────────────────────────────

function StepAppointmentType({ selected, onSelect }: { selected?: AppointmentType; onSelect: (t: AppointmentType) => void }) {
  return (
    <View style={styles.grid}>
      {Object.values(AppointmentType).map(type => {
        const info = APPOINTMENT_TYPE_INFO[type];
        const isSelected = selected === type;
        return (
          <Pressable
            key={type}
            style={[styles.typeCard, isSelected && styles.typeCardSelected]}
            onPress={() => onSelect(type)}
          >
            <Text style={styles.typeIcon}>{info.icon}</Text>
            <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
              {info.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectPet({ pets, selected, onSelect }: { pets: Pet[]; selected?: string; onSelect: (id: string) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {pets.map(pet => {
        const isSelected = selected === pet.id;
        return (
          <Pressable
            key={pet.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(pet.id)}
          >
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="paw" size={28} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{pet.name}</Text>
              <Text style={styles.cardSub}>{pet.breed} • {pet.age}</Text>
              <Text style={styles.cardDetail}>Health Score: {pet.healthScore}/100</Text>
            </View>
            {isSelected && <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectHospital({ hospitals, selected, onSelect }: { hospitals: Hospital[]; selected?: string; onSelect: (id: string) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {hospitals.map(h => {
        const isSelected = selected === h.id;
        return (
          <Pressable
            key={h.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(h.id)}
          >
            <View style={[styles.cardIcon, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="hospital-building" size={28} color="#0EA5E9" />
            </View>
            <View style={styles.cardBody}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.cardTitle}>{h.name}</Text>
                {h.is24x7 && <View style={styles.badge24}><Text style={styles.badge24Text}>24x7</Text></View>}
              </View>
              <Text style={styles.cardSub}>{h.address}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <MaterialCommunityIcons name="star" size={12} color="#FF8F00" />
                <Text style={styles.cardDetail}>{h.rating} • {h.distance} km away</Text>
              </View>
            </View>
            {isSelected && <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectDoctor({ doctors, selected, onSelect }: { doctors: Doctor[]; selected?: string; onSelect: (id: string) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {doctors.map(d => {
        const isSelected = selected === d.id;
        return (
          <Pressable
            key={d.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onSelect(d.id)}
          >
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="doctor" size={28} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.cardTitle}>{d.name}</Text>
                <MaterialCommunityIcons name="star" size={12} color="#FF8F00" />
                <Text style={styles.cardDetail}>{d.rating}</Text>
              </View>
              <Text style={styles.cardSub}>{d.specialization}</Text>
              <Text style={styles.cardDetail}>{d.experience} yrs exp • {d.qualification}</Text>
              <Text style={[styles.cardDetail, { color: colors.success, fontWeight: '700', marginTop: 4 }]}>
                Fee: ₹{d.consultationFee}
              </Text>
            </View>
            {isSelected && <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectDate({ selected, onSelect }: { selected?: string; onSelect: (d: string) => void }) {
  // Generate next 14 days
  const dates: string[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return (
    <View style={{ gap: 8 }}>
      {dates.map(date => {
        const d = new Date(date);
        const isSelected = selected === date;
        return (
          <Pressable
            key={date}
            style={[styles.dateCard, isSelected && styles.dateCardSelected]}
            onPress={() => onSelect(date)}
          >
            <MaterialCommunityIcons name="calendar" size={20} color={isSelected ? '#fff' : colors.primary} />
            <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
              {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            {isSelected && <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />}
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectSlot({ slots, selected, onSelect }: { slots: string[]; selected?: string; onSelect: (s: string) => void }) {
  if (slots.length === 0) {
    return <Text style={styles.noSlots}>No available slots for this date</Text>;
  }
  return (
    <View style={styles.slotGrid}>
      {slots.map(slot => {
        const isSelected = selected === slot;
        return (
          <Pressable
            key={slot}
            style={[styles.slotCard, isSelected && styles.slotCardSelected]}
            onPress={() => onSelect(slot)}
          >
            <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>{slot}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSymptoms({
  value,
  onChange,
  form,
  pets,
  doctors,
  hospitals,
}: {
  value: string;
  onChange: (v: string) => void;
  form: BookingFormData;
  pets: Pet[];
  doctors: Doctor[];
  hospitals: Hospital[];
}) {
  const pet = pets.find(p => p.id === form.petId);
  const doctor = doctors.find(d => d.id === form.doctorId);
  const hospital = hospitals.find(h => h.id === form.hospitalId);
  const typeInfo = form.type ? APPOINTMENT_TYPE_INFO[form.type] : null;

  return (
    <View>
      <Text style={styles.symptomsLabel}>Describe symptoms or reason for visit:</Text>
      <TextInput
        style={styles.textArea}
        placeholder="e.g., My pet has been lethargic and not eating properly..."
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Booking Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={styles.summaryValue}>{typeInfo?.label || '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Pet</Text>
          <Text style={styles.summaryValue}>{pet?.name || '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Hospital</Text>
          <Text style={styles.summaryValue}>{hospital?.name || '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Doctor</Text>
          <Text style={styles.summaryValue}>{doctor?.name || '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>
            {form.date ? new Date(form.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time</Text>
          <Text style={styles.summaryValue}>{form.timeSlot || '—'}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowFee]}>
          <Text style={styles.summaryLabel}>Fee</Text>
          <Text style={styles.summaryFee}>₹{doctor?.consultationFee || 0}</Text>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { marginRight: 12 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
  headerStep: { fontSize: 12, color: colors.muted, marginTop: 2 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  progressItem: { alignItems: 'center', flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dotActive: { backgroundColor: colors.primary + '50', borderWidth: 2, borderColor: colors.primary },
  dotComplete: { backgroundColor: colors.success },
  dotText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  dotLabel: { fontSize: 9, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  content: { padding: 20 },
  stepTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 16 },
  loader: { paddingVertical: 60, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '48%',
    aspectRatio: 1.3,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  typeCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '10' },
  typeIcon: { fontSize: 32, marginBottom: 8 },
  typeLabel: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center', paddingHorizontal: 4 },
  typeLabelSelected: { color: colors.primary, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardSelected: { borderColor: colors.success, borderWidth: 2, backgroundColor: colors.success + '10' },
  cardIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardDetail: { fontSize: 11, color: colors.muted, marginTop: 4 },
  badge24: { backgroundColor: colors.success + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badge24Text: { fontSize: 9, fontWeight: '700', color: colors.success },
  dateCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dateCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary },
  dateText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  dateTextSelected: { color: '#fff' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotCard: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  slotCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 13, fontWeight: '700', color: colors.text },
  slotTextSelected: { color: '#fff' },
  noSlots: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 40 },
  symptomsLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 120,
  },
  summary: { backgroundColor: colors.success + '15', borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 1, borderColor: colors.success + '30' },
  summaryTitle: { fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 12, color: colors.muted },
  summaryValue: { fontSize: 12, fontWeight: '700', color: colors.text },
  summaryRowFee: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.success + '30' },
  summaryFee: { fontSize: 16, fontWeight: '900', color: colors.success },
  footer: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  backButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  nextButton: { flex: 2, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nextButtonFull: { flex: 1 },
  nextButtonText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
