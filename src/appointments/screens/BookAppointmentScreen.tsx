import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, radii, shadows } from '../../core/theme/colors';
import {
  AppointmentStatus,
  AppointmentType,
  PaymentStatus,
  APPOINTMENT_TYPE_INFO,
  type BookingFormData,
  type Doctor,
  type Hospital,
  type Pet,
} from '../types/appointment.types';
import { TABLES } from '../../constants';
import { useRealtimeTables } from '../../services/realtime';
import { appointmentService } from '../services/appointmentService';
import type { AppointmentStackParamList, SelectedHospitalParam } from '../navigation/AppointmentNavigator';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;
type RouteParams = RouteProp<AppointmentStackParamList, 'BookAppointment'>;
type HospitalFilter = 'nearest' | 'fee' | 'rating' | 'emergency' | 'open24' | 'available';

const STEPS = ['Type', 'Pet', 'Hospital', 'Doctor', 'Date', 'Time', 'Symptoms'];
const FILTERS: Array<{ id: HospitalFilter; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { id: 'nearest', label: 'Nearest', icon: 'map-marker-distance' },
  { id: 'fee', label: 'Lowest Fee', icon: 'cash' },
  { id: 'rating', label: 'Highest Rated', icon: 'star' },
  { id: 'emergency', label: 'Emergency', icon: 'ambulance' },
  { id: 'open24', label: '24 Hours', icon: 'clock-time-four' },
  { id: 'available', label: 'Available Today', icon: 'calendar-check' },
];

function hospitalFromSelectedParam(selected: SelectedHospitalParam): Hospital {
  return {
    id: selected.clinicId,
    name: selected.hospitalName,
    logoUrl: undefined,
    coverImage: undefined,
    galleryImages: [],
    address: selected.address,
    area: '',
    city: '',
    state: '',
    pincode: '',
    latitude: selected.latitude,
    longitude: selected.longitude,
    phone: '',
    email: '',
    website: '',
    description: '',
    rating: 0,
    reviewCount: 0,
    services: [],
    departments: [],
    facilities: [],
    consultationFee: selected.consultationFee,
    totalDoctors: selected.doctorCount,
    availableDoctors: selected.doctorCount,
    totalBeds: 0,
    is24x7: false,
    emergencyAvailable: false,
    parkingAvailable: false,
    wheelchairAccessible: false,
    ambulanceService: false,
    pharmacyAvailable: false,
    laboratoryAvailable: false,
    distance: null,
    distanceLabel: 'Selected from GPS',
    todayAvailability: 'Availability loaded from hospital schedule',
  };
}

export function BookAppointmentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const customerId = route.params?.customerId || '';
  const selectedHospital = route.params?.selectedHospital;

  const [step, setStep] = useState(route.params?.startAtDoctorSelection && selectedHospital ? 3 : 0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<BookingFormData>(() => selectedHospital ? { type: AppointmentType.GENERAL_CHECKUP, hospitalId: selectedHospital.clinicId } : {});
  const [pets, setPets] = useState<Pet[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<HospitalFilter>('nearest');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>();
  const [locationDenied, setLocationDenied] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadHospitalsSafely = useCallback(async (
    location?: { latitude: number; longitude: number },
    reason = 'manual',
  ) => {
    try {
      const nextHospitals = await appointmentService.getHospitals(location);
      setHospitals(nextHospitals);
      return nextHospitals;
    } catch (error) {
      console.error('[BookAppointmentScreen] hospital load failed', { reason, error });
      setLoadError(error instanceof Error ? error.message : 'Unable to load hospitals.');
      setHospitals([]);
      return [];
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrapLocationAndHospitals() {
      setLoading(true);
      setLoadError('');
      try {
        if (selectedHospital) {
          const selectedLocation = selectedHospital.latitude !== null && selectedHospital.longitude !== null
            ? { latitude: selectedHospital.latitude, longitude: selectedHospital.longitude }
            : undefined;
          if (selectedLocation) setUserLocation(selectedLocation);
          const [detail, nextDoctors, nextPets] = await Promise.all([
            appointmentService.getHospitalDetails(selectedHospital.clinicId, selectedLocation),
            appointmentService.getDoctorsByHospital(selectedHospital.clinicId),
            appointmentService.getPets(),
          ]);
          const nextHospital = detail ?? hospitalFromSelectedParam(selectedHospital);
          if (mounted) {
            setHospitals([nextHospital]);
            setDoctors(nextDoctors);
            setPets(nextPets);
            setForm(current => ({
              ...current,
              type: current.type ?? AppointmentType.GENERAL_CHECKUP,
              petId: current.petId ?? nextPets[0]?.id,
              hospitalId: selectedHospital.clinicId,
            }));
            setStep(3);
          }
          return;
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setLocationDenied(true);
          await loadHospitalsSafely(undefined, 'permission-denied');
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        if (mounted) setUserLocation(coords);
        await loadHospitalsSafely(coords, 'gps-location');
      } catch (error) {
        console.error('[BookAppointmentScreen] location bootstrap failed', error);
        if (mounted) {
          setLocationDenied(true);
          setLoadError(error instanceof Error ? error.message : 'Unable to detect location. Hospitals are sorted alphabetically.');
          await loadHospitalsSafely(undefined, 'location-fallback');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void bootstrapLocationAndHospitals();
    return () => { mounted = false; };
  }, [loadHospitalsSafely, selectedHospital]);

  useRealtimeTables('book-appointment-hospital-selection', [TABLES.clinics], (_table, payload) => {
    if (selectedHospital) {
      void appointmentService.getHospitalDetails(selectedHospital.clinicId, userLocation).then(detail => {
        if (detail) setHospitals([detail]);
      }).catch(error => console.error('[BookAppointmentScreen] selected hospital realtime refresh failed', error));
      return;
    }
    void loadHospitalsSafely(userLocation, 'realtime-clinics');
  });

  const filteredHospitals = useMemo(() => {
    const query = hospitalSearch.trim().toLowerCase();
    const evaluated = hospitals.map(hospital => {
      const reasons: string[] = [];
      const matchesQuery = !query
        || hospital.name.toLowerCase().includes(query)
        || hospital.area.toLowerCase().includes(query)
        || hospital.city.toLowerCase().includes(query)
        || hospital.departments.some(item => item.toLowerCase().includes(query))
        || hospital.facilities.some(item => item.toLowerCase().includes(query));
      if (!matchesQuery) reasons.push(`search:${hospitalSearch}`);
      if (hospitalFilter === 'emergency' && !hospital.emergencyAvailable) reasons.push('filter:emergency=false');
      if (hospitalFilter === 'open24' && !hospital.is24x7) reasons.push('filter:open24=false');
      if (hospitalFilter === 'available' && hospital.availableDoctors <= 0) reasons.push('filter:availableDoctors=0');
      return { hospital, reasons };
    });

    const visible = evaluated
      .filter(item => item.reasons.length === 0)
      .map(item => item.hospital)
      .sort((left, right) => {
        if (hospitalFilter === 'fee') return left.consultationFee - right.consultationFee;
        if (hospitalFilter === 'rating') return right.rating - left.rating;
        if (left.distance !== null && right.distance !== null) return left.distance - right.distance;
        if (left.distance !== null) return -1;
        if (right.distance !== null) return 1;
        return left.name.localeCompare(right.name);
      });

    return visible;
  }, [hospitalFilter, hospitalSearch, hospitals]);

  const loadPets = async () => runLoad('Unable to load pets.', async () => setPets(await appointmentService.getPets()));
  const loadHospitals = async () => runLoad('Unable to load hospitals.', async () => {
    if (selectedHospital) {
      const detail = await appointmentService.getHospitalDetails(selectedHospital.clinicId, userLocation);
      setHospitals([detail ?? hospitalFromSelectedParam(selectedHospital)]);
      return;
    }
    await loadHospitalsSafely(userLocation, 'step-load');
  });
  const loadDoctors = async (hospitalId: string) => runLoad('Unable to load doctors for this hospital.', async () => setDoctors(await appointmentService.getDoctorsByHospital(hospitalId)));
  const loadSlots = async (doctorId: string, date: string) => runLoad('Unable to load slots.', async () => setSlots(await appointmentService.getAvailableSlots(doctorId, date)));

  async function runLoad(message: string, load: () => Promise<void>) {
    setLoading(true);
    setLoadError('');
    try {
      await load();
    } catch (error) {
      console.error('[BookAppointmentScreen] async load failed', { message, error });
      setLoadError(error instanceof Error ? error.message : message);
    } finally {
      setLoading(false);
    }
  }

  const handleNext = async () => {
    if (step === 0 && !form.type) return Alert.alert('Required', 'Please select an appointment type');
    if (step === 1 && !form.petId) return Alert.alert('Required', 'Please select a pet');
    if (step === 2 && !form.hospitalId) return Alert.alert('Required', 'Please select a hospital');
    if (step === 3 && !form.doctorId) return Alert.alert('Required', 'Please select a doctor');
    if (step === 4 && !form.date) return Alert.alert('Required', 'Please select a date');
    if (step === 5 && !form.timeSlot) return Alert.alert('Required', 'Please select a time slot');
    if (step === 6 && !symptoms.trim()) return Alert.alert('Required', 'Please describe symptoms or reason');

    if (step === 0) await loadPets();
    if (step === 1 && !hospitals.length) await loadHospitals();
    if (step === 2 && form.hospitalId) await loadDoctors(form.hospitalId);
    if (step === 3 && form.doctorId && !form.petId) return Alert.alert('Required', 'Please select a pet before choosing a doctor.');
    if (step === 4 && form.doctorId && form.date) await loadSlots(form.doctorId, form.date);
    if (step === 6) return bookAppointment();
    setStep(current => current + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(current => current - 1);
    else navigation.goBack();
  };

  const bookAppointment = async () => {
    setLoading(true);
    try {
      const pet = pets.find(item => item.id === form.petId);
      const doctor = doctors.find(item => item.id === form.doctorId);
      const hospital = hospitals.find(item => item.id === form.hospitalId);
      if (!pet || !doctor || !hospital) throw new Error('Missing required booking data.');

      await appointmentService.bookAppointment({
        customerId,
        customerName: 'Pet Owner',
        doctorId: doctor.id,
        doctorName: doctor.name,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        petId: pet.id,
        petName: pet.name,
        type: form.type,
        date: form.date,
        timeSlot: form.timeSlot,
        status: AppointmentStatus.PENDING_APPROVAL,
        paymentStatus: PaymentStatus.PENDING,
        symptoms,
        medicalReports: [],
        fee: doctor.consultationFee || hospital.consultationFee,
      });

      Alert.alert('Success', 'Appointment request created successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('[BookAppointmentScreen] booking failed', error);
      Alert.alert('Booking failed', error instanceof Error ? error.message : 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Book a Vet Visit</Text>
          <Text style={styles.headerStep}>Premium care booking - Step {step + 1} of {STEPS.length}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {STEPS.map((label, index) => (
          <View key={label} style={styles.progressItem}>
            <View style={[styles.dot, index <= step && styles.dotActive, index < step && styles.dotComplete]}>
              {index < step ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : <Text style={styles.dotText}>{index + 1}</Text>}
            </View>
            <Text style={styles.dotLabel} numberOfLines={1}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>{step === 2 ? 'Discover hospitals near you' : step === 3 ? 'Choose your doctor' : step === 4 ? 'Pick an available date' : step === 5 ? 'Select a time slot' : step === 6 ? 'Symptoms and payment summary' : STEPS[step]}</Text>
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
        {loading ? <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View> : null}
        {!loading && step === 0 ? <StepAppointmentType selected={form.type} onSelect={type => setForm({ ...form, type })} /> : null}
        {!loading && step === 1 ? <StepSelectPet pets={pets} selected={form.petId} onSelect={petId => setForm({ ...form, petId })} /> : null}
        {!loading && step === 2 ? (
          <StepSelectHospital
            hospitals={filteredHospitals}
            selected={form.hospitalId}
            search={hospitalSearch}
            filter={hospitalFilter}
            locationDenied={locationDenied}
            onSearch={setHospitalSearch}
            onFilter={setHospitalFilter}
            onSelect={hospitalId => setForm({ ...form, hospitalId })}
          />
        ) : null}
        {!loading && step === 3 ? <StepSelectDoctor doctors={doctors} selected={form.doctorId} onSelect={doctorId => setForm({ ...form, doctorId })} /> : null}
        {!loading && step === 4 ? <StepSelectDate selected={form.date} onSelect={date => setForm({ ...form, date })} /> : null}
        {!loading && step === 5 ? <StepSelectSlot slots={slots} selected={form.timeSlot} onSelect={timeSlot => setForm({ ...form, timeSlot })} /> : null}
        {!loading && step === 6 ? <StepSymptoms value={symptoms} onChange={setSymptoms} form={form} pets={pets} doctors={doctors} hospitals={hospitals} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? <Pressable style={styles.backButton} onPress={handleBack}><Text style={styles.backButtonText}>Back</Text></Pressable> : null}
        <Pressable style={[styles.nextButton, step === 0 && styles.nextButtonFull]} onPress={handleNext} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.nextButtonText}>{step === 6 ? 'Book Appointment' : 'Continue'}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function StepAppointmentType({ selected, onSelect }: { selected?: AppointmentType; onSelect: (type: AppointmentType) => void }) {
  return (
    <View style={styles.grid}>
      {Object.values(AppointmentType).map(type => {
        const info = APPOINTMENT_TYPE_INFO[type];
        const isSelected = selected === type;
        return (
          <Pressable key={type} style={[styles.typeCard, isSelected && styles.typeCardSelected]} onPress={() => onSelect(type)}>
            <Text style={styles.typeIcon}>{info.icon}</Text>
            <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>{info.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectPet({ pets, selected, onSelect }: { pets: Pet[]; selected?: string; onSelect: (id: string) => void }) {
  if (!pets.length) return <EmptyMessage title="No pets found" text="Add a pet profile before booking an appointment." />;
  return (
    <View style={styles.listGap}>
      {pets.map(pet => {
        const isSelected = selected === pet.id;
        return (
          <Pressable key={pet.id} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => onSelect(pet.id)}>
            <View style={styles.cardIcon}><MaterialCommunityIcons name="paw" size={28} color={colors.primary} /></View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{pet.name}</Text>
              <Text style={styles.cardSub}>{pet.breed} | {pet.age}</Text>
              <Text style={styles.cardDetail}>Health Score: {pet.healthScore}/100</Text>
            </View>
            {isSelected ? <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectHospital({
  hospitals,
  selected,
  search,
  filter,
  locationDenied,
  onSearch,
  onFilter,
  onSelect,
}: {
  hospitals: Hospital[];
  selected?: string;
  search: string;
  filter: HospitalFilter;
  locationDenied: boolean;
  onSearch: (value: string) => void;
  onFilter: (value: HospitalFilter) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.listGap}>
      {locationDenied ? <Text style={styles.locationNote}>Location permission denied. Hospitals are sorted alphabetically.</Text> : null}
      <TextInput style={styles.searchInput} value={search} onChangeText={onSearch} placeholder="Search hospital, area, department or facility" placeholderTextColor={colors.muted} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(item => (
          <Pressable key={item.id} style={[styles.filterChip, filter === item.id && styles.filterChipActive]} onPress={() => onFilter(item.id)}>
            <MaterialCommunityIcons name={item.icon} size={14} color={filter === item.id ? '#fff' : colors.primaryDark} />
            <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {!hospitals.length ? <EmptyMessage title="No hospitals found" text="No live hospital records matched your filters." /> : null}
      {hospitals.map(hospital => {
        const isSelected = selected === hospital.id;
        return <HospitalCard key={hospital.id} hospital={hospital} selected={isSelected} onPress={() => onSelect(hospital.id)} />;
      })}
    </View>
  );
}

function HospitalCard({ hospital, selected, onPress }: { hospital: Hospital; selected: boolean; onPress: () => void }) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Pressable style={[styles.hospitalCard, selected && styles.cardSelected]} onPress={onPress}>
      <View style={styles.hospitalMedia}>
        {hospital.coverImage && !logoFailed ? (
          <Image source={{ uri: hospital.coverImage }} style={styles.hospitalImage} onError={() => setLogoFailed(true)} />
        ) : hospital.logoUrl && !logoFailed ? (
          <Image source={{ uri: hospital.logoUrl }} style={styles.hospitalImage} onError={() => setLogoFailed(true)} />
        ) : (
          <View style={styles.hospitalFallback}><MaterialCommunityIcons name="hospital-building" size={36} color="#fff" /></View>
        )}
        <View style={[styles.openBadge, { backgroundColor: hospital.is24x7 || hospital.availableDoctors > 0 ? colors.success : colors.danger }]}> 
          <Text style={styles.openBadgeText}>{hospital.is24x7 ? 'Open 24/7' : hospital.availableDoctors > 0 ? 'Open' : 'Limited'}</Text>
        </View>
        {hospital.emergencyAvailable ? <View style={styles.emergencyBadge}><MaterialCommunityIcons name="ambulance" size={12} color="#fff" /><Text style={styles.emergencyBadgeText}>Emergency</Text></View> : null}
      </View>

      <View style={styles.hospitalBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>{hospital.name}</Text>
          {selected ? <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} /> : null}
        </View>
        <Text style={styles.cardSub} numberOfLines={1}>{hospital.area || hospital.address}</Text>

        <View style={styles.hospitalStatsRow}>
          <InfoPill icon="map-marker-distance" value={hospital.distanceLabel} />
          <InfoPill icon="star" value={hospital.rating.toFixed(1)} />
          <InfoPill icon="doctor" value={`${hospital.availableDoctors}/${hospital.totalDoctors} doctors`} />
        </View>

        <View style={styles.hospitalMetaGrid}>
          <View style={styles.metaTile}><Text style={styles.metaTileLabel}>Fee</Text><Text style={styles.metaTileValue}>Rs {hospital.consultationFee}</Text></View>
          <View style={styles.metaTile}><Text style={styles.metaTileLabel}>Today</Text><Text style={styles.metaTileValue} numberOfLines={1}>{hospital.todayAvailability}</Text></View>
        </View>

        <Text style={styles.cardDetail} numberOfLines={1}>{hospital.departments.slice(0, 3).join(' | ') || 'General veterinary care'}</Text>
        <View style={styles.cardActionRow}>
          <View style={styles.secondaryAction}><MaterialCommunityIcons name="phone" size={14} color={colors.primaryDark} /><Text style={styles.secondaryActionText}>Call</Text></View>
          <View style={styles.secondaryAction}><MaterialCommunityIcons name="navigation" size={14} color={colors.primaryDark} /><Text style={styles.secondaryActionText}>Directions</Text></View>
          <View style={styles.bookAction}><Text style={styles.bookActionText}>Book Appointment</Text></View>
        </View>
      </View>
    </Pressable>
  );
}

function InfoPill({ icon, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string }) {
  return (
    <View style={styles.infoPill}>
      <MaterialCommunityIcons name={icon} size={13} color={colors.primaryDark} />
      <Text style={styles.infoPillText} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function StepSelectDoctor({ doctors, selected, onSelect }: { doctors: Doctor[]; selected?: string; onSelect: (id: string) => void }) {
  if (!doctors.length) return <EmptyMessage title="No doctors available" text="This hospital has no available doctors in Supabase." />;
  return (
    <View style={styles.listGap}>
      {doctors.map(doctor => {
        const isSelected = selected === doctor.id;
        return (
          <Pressable key={doctor.id} style={[styles.doctorCard, isSelected && styles.cardSelected]} onPress={() => onSelect(doctor.id)}>
            <View style={styles.doctorPhotoWrap}>
              {doctor.photo ? <Image source={{ uri: doctor.photo }} style={styles.doctorPhoto} /> : <MaterialCommunityIcons name="doctor" size={34} color={colors.primaryDark} />}
              <View style={styles.verifiedDot}><MaterialCommunityIcons name="check" size={11} color="#fff" /></View>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{doctor.name}</Text>
                {doctor.availableToday ? <Badge label="Today" color={colors.success} /> : null}
                {isSelected ? <MaterialCommunityIcons name="check-circle" size={22} color={colors.success} /> : null}
              </View>
              <Text style={styles.cardSub}>{doctor.specialization}</Text>
              <Text style={styles.cardDetail}>{doctor.qualification} | {doctor.experience} yrs exp</Text>
              <View style={styles.hospitalStatsRow}>
                <InfoPill icon="translate" value={doctor.languages.join(', ') || 'Not listed'} />
                <InfoPill icon="star" value={`${doctor.rating.toFixed(1)} (${doctor.reviewCount})`} />
              </View>
              <View style={styles.doctorFooterRow}>
                <Text style={styles.feeText}>Rs {doctor.consultationFee}</Text>
                <View style={styles.videoBadge}><MaterialCommunityIcons name="video" size={13} color={colors.secondaryDark} /><Text style={styles.videoBadgeText}>Video ready</Text></View>
              </View>
              <Text style={styles.cardDetail} numberOfLines={1}>Slots: {doctor.availableSlots.slice(0, 3).join(', ') || 'Load date to see slots'}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
function StepSelectDate({ selected, onSelect }: { selected?: string; onSelect: (date: string) => void }) {
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return date.toISOString().split('T')[0];
  });

  return (
    <View style={styles.listGap}>
      {dates.map(dateValue => {
        const date = new Date(dateValue);
        const isSelected = selected === dateValue;
        return (
          <Pressable key={dateValue} style={[styles.dateCard, isSelected && styles.dateCardSelected]} onPress={() => onSelect(dateValue)}>
            <MaterialCommunityIcons name="calendar" size={20} color={isSelected ? '#fff' : colors.primary} />
            <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            {isSelected ? <MaterialCommunityIcons name="check-circle" size={20} color="#fff" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function StepSelectSlot({ slots, selected, onSelect }: { slots: string[]; selected?: string; onSelect: (slot: string) => void }) {
  if (!slots.length) return <EmptyMessage title="No slots available" text="Choose another date or doctor." />;
  return (
    <View style={styles.slotGrid}>
      {slots.map(slot => {
        const isSelected = selected === slot;
        return <Pressable key={slot} style={[styles.slotCard, isSelected && styles.slotCardSelected]} onPress={() => onSelect(slot)}><Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>{slot}</Text></Pressable>;
      })}
    </View>
  );
}

function StepSymptoms({ value, onChange, form, pets, doctors, hospitals }: { value: string; onChange: (value: string) => void; form: BookingFormData; pets: Pet[]; doctors: Doctor[]; hospitals: Hospital[] }) {
  const pet = pets.find(item => item.id === form.petId);
  const doctor = doctors.find(item => item.id === form.doctorId);
  const hospital = hospitals.find(item => item.id === form.hospitalId);
  const typeInfo = form.type ? APPOINTMENT_TYPE_INFO[form.type] : null;

  return (
    <View>
      <Text style={styles.symptomsLabel}>Describe symptoms or reason for visit:</Text>
      <TextInput style={styles.textArea} placeholder="e.g., My pet has been lethargic and not eating properly..." placeholderTextColor={colors.muted} value={value} onChangeText={onChange} multiline numberOfLines={6} textAlignVertical="top" />
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Booking Summary</Text>
        <SummaryRow label="Type" value={typeInfo?.label || '-'} />
        <SummaryRow label="Pet" value={pet?.name || '-'} />
        <SummaryRow label="Hospital" value={hospital?.name || '-'} />
        <SummaryRow label="Doctor" value={doctor?.name || '-'} />
        <SummaryRow label="Date" value={form.date ? new Date(form.date).toLocaleDateString() : '-'} />
        <SummaryRow label="Time" value={form.timeSlot || '-'} />
        <View style={[styles.summaryRow, styles.summaryRowFee]}><Text style={styles.summaryLabel}>Fee</Text><Text style={styles.summaryFee}>Rs {doctor?.consultationFee || hospital?.consultationFee || 0}</Text></View>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

function Badge({ label, color }: { label: string; color: string }) {
  return <View style={[styles.badge, { backgroundColor: color + '20' }]}><Text style={[styles.badgeText, { color }]}>{label}</Text></View>;
}

function EmptyMessage({ title, text }: { title: string; text: string }) {
  return <View style={styles.emptyBox}><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, backgroundColor: colors.surfaceGlass, borderBottomWidth: 1, borderBottomColor: colors.line, ...shadows.soft },
  backBtn: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 21, fontWeight: '900', color: colors.text },
  headerStep: { fontSize: 12, color: colors.muted, marginTop: 3, fontWeight: '700' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 14, backgroundColor: 'rgba(255,255,255,0.72)' },
  progressItem: { alignItems: 'center', flex: 1, gap: 5 },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  dotComplete: { backgroundColor: colors.success, borderColor: colors.success },
  dotText: { fontSize: 11, fontWeight: '900', color: colors.muted },
  dotLabel: { fontSize: 9, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 28 },
  stepTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 16 },
  loader: { paddingVertical: 60, alignItems: 'center' },
  errorText: { backgroundColor: colors.dangerSoft, color: colors.danger, padding: 12, borderRadius: 16, marginBottom: 12, fontSize: 12, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  listGap: { gap: 14 },
  typeCard: { width: '48%', minHeight: 124, backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, padding: 14, ...shadows.soft },
  typeCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primarySoft },
  typeIcon: { fontSize: 32, marginBottom: 8 },
  typeLabel: { fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center', paddingHorizontal: 4 },
  typeLabelSelected: { color: colors.primaryDark, fontWeight: '900' },
  searchInput: { backgroundColor: colors.surfaceGlass, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 15, paddingVertical: 13, color: colors.text, fontSize: 13, fontWeight: '700' },
  filterRow: { gap: 8, paddingVertical: 2 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceGlass, paddingHorizontal: 13, paddingVertical: 9 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 11, fontWeight: '900', color: colors.primaryDark },
  filterTextActive: { color: '#fff' },
  locationNote: { fontSize: 12, fontWeight: '800', color: colors.accent, backgroundColor: colors.accentSoft, borderRadius: 14, padding: 12 },
  card: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  cardSelected: { borderColor: colors.success, borderWidth: 2, backgroundColor: colors.success + '10' },
  cardIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImage: { width: 58, height: 58, resizeMode: 'cover' },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '900', color: colors.text },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 3, fontWeight: '800' },
  cardDetail: { fontSize: 11, color: colors.muted, marginTop: 5, fontWeight: '700' },
  feeText: { fontSize: 14, color: colors.success, fontWeight: '900' },
  badge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  hospitalCard: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)', ...shadows.soft },
  hospitalMedia: { height: 122, backgroundColor: colors.primary, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  hospitalImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  hospitalFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  openBadge: { position: 'absolute', top: 10, right: 10, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  openBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  emergencyBadge: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  emergencyBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  hospitalBody: { padding: 15, gap: 8 },
  hospitalStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, maxWidth: '100%' },
  infoPillText: { fontSize: 10, fontWeight: '900', color: colors.primaryDark, maxWidth: 170 },
  hospitalMetaGrid: { flexDirection: 'row', gap: 8 },
  metaTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: colors.line },
  metaTileLabel: { fontSize: 10, fontWeight: '900', color: colors.muted, textTransform: 'uppercase' },
  metaTileValue: { fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 3 },
  cardActionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  secondaryAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryActionText: { fontSize: 10, fontWeight: '900', color: colors.primaryDark },
  bookAction: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  bookActionText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  doctorCard: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  doctorPhotoWrap: { width: 70, height: 70, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  doctorPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  verifiedDot: { position: 'absolute', right: 5, bottom: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  doctorFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  videoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.secondarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  videoBadgeText: { fontSize: 10, fontWeight: '900', color: colors.secondaryDark },
  dateCard: { backgroundColor: colors.surfaceGlass, borderRadius: radii.lg, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  dateCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary },
  dateText: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.text },
  dateTextSelected: { color: '#fff' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotCard: { minWidth: '30%', paddingVertical: 13, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.surfaceGlass, borderWidth: 1, borderColor: colors.line, alignItems: 'center', ...shadows.soft },
  slotCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontSize: 13, fontWeight: '900', color: colors.text },
  slotTextSelected: { color: '#fff' },
  emptyBox: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, alignItems: 'center', padding: 22, gap: 7, ...shadows.soft },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  emptyText: { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'center', lineHeight: 18 },
  symptomsLabel: { fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 10 },
  textArea: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 15, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.line, minHeight: 130, fontWeight: '700' },
  summary: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 17, marginTop: 20, borderWidth: 1, borderColor: colors.success + '30', ...shadows.soft },
  summaryTitle: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, gap: 12 },
  summaryLabel: { fontSize: 12, color: colors.muted, fontWeight: '800' },
  summaryValue: { fontSize: 12, fontWeight: '900', color: colors.text, flex: 1, textAlign: 'right' },
  summaryRowFee: { marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.success + '30' },
  summaryFee: { fontSize: 18, fontWeight: '900', color: colors.success },
  footer: { flexDirection: 'row', gap: 10, padding: 18, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: 'rgba(255,255,255,0.88)' },
  backButton: { flex: 1, paddingVertical: 15, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  backButtonText: { fontSize: 14, fontWeight: '900', color: colors.primaryDark },
  nextButton: { flex: 2, backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...shadows.premium },
  nextButtonFull: { flex: 1 },
  nextButtonText: { fontSize: 14, fontWeight: '900', color: '#fff' },
});