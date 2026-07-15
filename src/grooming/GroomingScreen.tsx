import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
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
import * as Location from 'expo-location';
import { colors } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';
import { groomingService, type GroomingDirectoryItem } from '../services/grooming';
import type { GroomerRecord, GroomingBookingRecord, GroomingServiceRecord, PetRecord } from '../types';

type LoadState = 'loading' | 'ready' | 'error';
type Coords = { latitude: number; longitude: number } | null;

function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time: string) {
  const [hourText, minuteText] = time.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText ?? '0');
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function nextDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return date.toISOString().slice(0, 10);
  });
}

function distanceKm(from: Coords, clinic: GroomingDirectoryItem) {
  if (!from || clinic.latitude == null || clinic.longitude == null) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(clinic.latitude - from.latitude);
  const dLon = toRad(clinic.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(clinic.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clinicOpenLabel(clinic: GroomingDirectoryItem) {
  if (!clinic.opening_time || !clinic.closing_time) return 'Hours pending';
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = clinic.opening_time.split(':').map(Number);
  const [closeHour, closeMinute] = clinic.closing_time.split(':').map(Number);
  const open = openHour * 60 + (openMinute || 0);
  const close = closeHour * 60 + (closeMinute || 0);
  return current >= open && current <= close ? 'Open now' : 'Closed';
}

function startingPrice(clinic: GroomingDirectoryItem) {
  const prices = clinic.services.map(service => Number(service.price ?? 0)).filter(price => price > 0);
  return prices.length ? Math.min(...prices) : 0;
}
const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '16:00', '17:00', '18:00'];

export function GroomingScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [directory, setDirectory] = useState<GroomingDirectoryItem[]>([]);
  const [coords, setCoords] = useState<Coords>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [bookings, setBookings] = useState<GroomingBookingRecord[]>([]);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedGroomerId, setSelectedGroomerId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(nextDates()[0]);
  const [selectedTime, setSelectedTime] = useState(DEFAULT_SLOTS[0]);
  const [symptoms, setSymptoms] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [pickupRequired, setPickupRequired] = useState(false);
  const [dropoffRequired, setDropoffRequired] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const selectedClinic = useMemo(
    () => directory.find(clinic => clinic.id === selectedClinicId) ?? null,
    [directory, selectedClinicId],
  );
  const clinicServices = selectedClinic?.services ?? [];
  const clinicGroomers = selectedClinic?.groomers ?? [];
  const selectedService = clinicServices.find(service => service.id === selectedServiceId) ?? null;
  const selectedGroomer = clinicGroomers.find(groomer => groomer.id === selectedGroomerId) ?? null;
  const upcomingBooking = bookings.find(booking => !['completed', 'cancelled', 'rejected'].includes(booking.status));

  const load = useCallback(async (silent = false) => {
    if (!silent) setState('loading');
    setError('');
    try {
      const userId = await groomingService.getCurrentUserId();
      let nextCoords: Coords = null;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          nextCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch (locationError) {
        console.warn('[GroomingScreen] location unavailable:', locationError);
      }
      const [nextPets, nextDirectory, nextBookings] = await Promise.all([
        groomingService.listOwnerPets(userId),
        groomingService.listDirectory(),
        groomingService.listOwnerBookings(userId),
      ]);

      const sortedDirectory = nextCoords ? [...nextDirectory].sort((a, b) => (distanceKm(nextCoords, a) ?? 9999) - (distanceKm(nextCoords, b) ?? 9999)) : nextDirectory;
      setCoords(nextCoords);
      setOwnerId(userId);
      setPets(nextPets);
      setDirectory(sortedDirectory);
      setBookings(nextBookings);
      setSelectedPetId(current => current || nextPets[0]?.id || '');
      setSelectedClinicId(current => current || sortedDirectory[0]?.id || '');
      setSelectedServiceId(current => current || sortedDirectory[0]?.services[0]?.id || '');
      setSelectedGroomerId(current => current ?? sortedDirectory[0]?.groomers[0]?.id ?? null);
      setState('ready');
    } catch (loadError) {
      console.error('[GroomingScreen] load failed:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load grooming data.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    load();
  }, [fadeAnim, load]);

  useRealtimeTables(
    'grooming-screen',
    [TABLES.groomingClinics, TABLES.groomers, TABLES.groomingServices, TABLES.groomingBookings, TABLES.pets],
    () => { void load(true); },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  async function bookGrooming() {
    if (!selectedPetId) {
      Alert.alert('Select pet', 'Please add or select a pet before booking grooming.');
      return;
    }
    if (!selectedClinic || !selectedService) {
      Alert.alert('Select service', 'Please select a grooming clinic and service.');
      return;
    }

    setIsBooking(true);
    try {
      const booking = await groomingService.createBooking({
        ownerId,
        petId: selectedPetId,
        clinicId: selectedClinic.id,
        serviceId: selectedService.id,
        groomerId: selectedGroomerId,
        serviceDate: selectedDate,
        serviceTime: selectedTime,
        pickupRequired,
        dropoffRequired,
        symptoms: symptoms.trim() || null,
        medicalNotes: medicalNotes.trim() || null,
      });
      Alert.alert('Grooming requested', `${selectedService.name} has been requested for ${formatDateLabel(booking.service_date)} at ${formatTime(booking.service_time)}.`);
      setSymptoms('');
      setMedicalNotes('');
      await load(true);
    } catch (bookingError) {
      console.error('[GroomingScreen] booking failed:', bookingError);
      Alert.alert('Booking failed', bookingError instanceof Error ? bookingError.message : 'Unable to create grooming booking.');
    } finally {
      setIsBooking(false);
    }
  }

  function selectClinic(clinic: GroomingDirectoryItem) {
    setSelectedClinicId(clinic.id);
    setSelectedServiceId(clinic.services[0]?.id ?? '');
    setSelectedGroomerId(clinic.groomers[0]?.id ?? null);
  }

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Grooming</Text>
          <Text style={styles.subtitle}>Live grooming booking</Text>
        </View>
        <Pressable style={[styles.bookBtn, isBooking && styles.disabled]} onPress={bookGrooming} disabled={isBooking || state !== 'ready'}>
          {isBooking ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="calendar-plus" size={16} color="#fff" />}
          <Text style={styles.bookBtnText}>{isBooking ? 'Booking' : 'Book Now'}</Text>
        </Pressable>
      </View>

      {state === 'loading' ? (
        <StateBlock icon="content-cut" title="Loading grooming" message="Finding available groomers and services." />
      ) : state === 'error' ? (
        <StateBlock icon="alert-circle" title="Grooming unavailable" message={error} actionLabel="Retry" onAction={() => load()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {upcomingBooking ? (
            <View style={styles.nextBanner}>
              <MaterialCommunityIcons name="content-cut" size={28} color={colors.primary} />
              <View style={styles.nextText}>
                <Text style={styles.nextTitle}>Next Grooming Session</Text>
                <Text style={styles.nextSub}>{formatDateLabel(upcomingBooking.service_date)} at {formatTime(upcomingBooking.service_time)}</Text>
                <Text style={styles.statusText}>{upcomingBooking.status.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyBanner}>
              <MaterialCommunityIcons name="calendar-plus" size={24} color="#EC4899" />
              <Text style={styles.emptyBannerText}>No upcoming grooming booking.</Text>
            </View>
          )}

          <SectionTitle title="Select Pet" />
          {pets.length === 0 ? (
            <InlineEmpty message="Add a pet before booking grooming." />
          ) : (
            <View style={styles.rowWrap}>
              {pets.map(pet => (
                <Pressable key={pet.id} style={[styles.petChip, selectedPetId === pet.id && styles.petChipActive]} onPress={() => setSelectedPetId(pet.id)}>
                  <Text style={[styles.petChipText, selectedPetId === pet.id && styles.petChipTextActive]}>{pet.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.discoveryHeader}>
            <SectionTitle title="Nearby Groomers" />
            <View style={styles.modeToggle}>
              <Pressable style={[styles.modeToggleBtn, viewMode === 'list' && styles.modeToggleActive]} onPress={() => setViewMode('list')}><MaterialCommunityIcons name="format-list-bulleted" size={15} color={viewMode === 'list' ? '#fff' : colors.primary} /></Pressable>
              <Pressable style={[styles.modeToggleBtn, viewMode === 'map' && styles.modeToggleActive]} onPress={() => setViewMode('map')}><MaterialCommunityIcons name="map" size={15} color={viewMode === 'map' ? '#fff' : colors.primary} /></Pressable>
            </View>
          </View>
          {viewMode === 'map' ? <View style={styles.mapPreview}><MaterialCommunityIcons name="map-marker-radius" size={34} color={colors.primary} /><Text style={styles.mapPreviewText}>{coords ? 'Showing grooming clinics near your current location' : 'Enable location to sort nearby groomers'}</Text></View> : null}
          {directory.length === 0 ? (
            <InlineEmpty message="No approved grooming clinics are available yet." />
          ) : (
            <View style={styles.listGap}>
              {directory.map(clinic => (
                <ClinicCard key={clinic.id} clinic={clinic} coords={coords} selected={clinic.id === selectedClinicId} onPress={() => selectClinic(clinic)} onBook={bookGrooming} />
              ))}
            </View>
          )}

          {!!selectedClinic && (
            <>
              <SectionTitle title="Services" />
              <View style={styles.servicesGrid}>
                {clinicServices.map(service => (
                  <ServiceCard key={service.id} service={service} selected={service.id === selectedServiceId} onPress={() => setSelectedServiceId(service.id)} />
                ))}
              </View>

              <SectionTitle title="Groomer" />
              {clinicGroomers.length === 0 ? (
                <InlineEmpty message="This clinic has no approved groomers assigned yet." />
              ) : (
                <View style={styles.listGap}>
                  {clinicGroomers.map(groomer => (
                    <GroomerRow key={groomer.id} groomer={groomer} selected={groomer.id === selectedGroomerId} onPress={() => setSelectedGroomerId(groomer.id)} />
                  ))}
                </View>
              )}
            </>
          )}

          <SectionTitle title="Date & Slot" />
          <View style={styles.rowWrap}>
            {nextDates().map(date => (
              <Pressable key={date} style={[styles.dateChip, selectedDate === date && styles.dateChipActive]} onPress={() => setSelectedDate(date)}>
                <Text style={[styles.dateChipText, selectedDate === date && styles.dateChipTextActive]}>{formatDateLabel(date)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rowWrap}>
            {DEFAULT_SLOTS.map(slot => (
              <Pressable key={slot} style={[styles.slotChip, selectedTime === slot && styles.slotChipActive]} onPress={() => setSelectedTime(slot)}>
                <Text style={[styles.slotChipText, selectedTime === slot && styles.slotChipTextActive]}>{formatTime(slot)}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle title="Care Notes" />
          <TextInput style={styles.input} placeholder="Symptoms, skin issues, matting, anxiety..." placeholderTextColor={colors.muted} value={symptoms} onChangeText={setSymptoms} multiline />
          <TextInput style={styles.input} placeholder="Medical safety notes or allergies" placeholderTextColor={colors.muted} value={medicalNotes} onChangeText={setMedicalNotes} multiline />
          <View style={styles.rowWrap}>
            <Toggle label="Pickup" active={pickupRequired} onPress={() => setPickupRequired(value => !value)} />
            <Toggle label="Drop-off" active={dropoffRequired} onPress={() => setDropoffRequired(value => !value)} />
          </View>

          <SectionTitle title="Booking Summary" />
          <View style={styles.summaryCard}>
            <SummaryRow label="Clinic" value={selectedClinic?.name ?? 'Not selected'} />
            <SummaryRow label="Service" value={selectedService?.name ?? 'Not selected'} />
            <SummaryRow label="Groomer" value={selectedGroomer?.full_name ?? 'Auto assign'} />
            <SummaryRow label="Fee" value={selectedService ? `Rs ${Number(selectedService.price).toFixed(0)}` : 'Rs 0'} />
            <SummaryRow label="When" value={`${formatDateLabel(selectedDate)} at ${formatTime(selectedTime)}`} />
          </View>

          <SectionTitle title="History" />
          {bookings.length === 0 ? <InlineEmpty message="No grooming bookings yet." /> : bookings.map(booking => (
            <View key={booking.id} style={styles.historyCard}>
              <MaterialCommunityIcons name="content-cut" size={20} color="#EC4899" />
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>{formatDateLabel(booking.service_date)} at {formatTime(booking.service_time)}</Text>
                <Text style={styles.historyMeta}>{booking.status.replace('_', ' ')} - Rs {Number(booking.price ?? 0).toFixed(0)}</Text>
              </View>
            </View>
          ))}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </Animated.View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StateBlock({ icon, title, message, actionLabel, onAction }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.stateBlock}>
      <MaterialCommunityIcons name={icon} size={36} color="#EC4899" />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {!!actionLabel && <Pressable style={styles.retryBtn} onPress={onAction}><Text style={styles.retryText}>{actionLabel}</Text></Pressable>}
    </View>
  );
}

function InlineEmpty({ message }: { message: string }) {
  return <View style={styles.inlineEmpty}><Text style={styles.inlineEmptyText}>{message}</Text></View>;
}

function ClinicCard({ clinic, coords, selected, onPress, onBook }: { clinic: GroomingDirectoryItem; coords: Coords; selected: boolean; onPress: () => void; onBook: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const distance = distanceKm(coords, clinic);
  const eta = distance == null ? 'ETA --' : `${Math.max(6, Math.round(distance * 4 + 5))} min`;
  const openLabel = clinicOpenLabel(clinic);
  const price = startingPrice(clinic);
  const serviceNames = clinic.services.slice(0, 3).map(service => service.name).join(' Ã¢â‚¬Â¢ ');

  return (
    <Pressable style={[styles.discoveryCard, selected && styles.selectedCard]} onPress={onPress}>
      <View style={styles.discoveryImage}>
        {clinic.cover_image && !imageFailed ? <Image source={{ uri: clinic.cover_image }} style={styles.discoveryPhoto} onError={() => setImageFailed(true)} /> : <MaterialCommunityIcons name="content-cut" size={30} color="#fff" />}
        <View style={[styles.openBadge, openLabel === 'Open now' && styles.openBadgeActive]}><Text style={styles.openBadgeText}>{openLabel}</Text></View>
      </View>
      <View style={styles.discoveryBody}>
        <View style={styles.discoveryTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{clinic.name}</Text>
          <Pressable style={styles.favoriteBtn}><MaterialCommunityIcons name="heart-outline" size={17} color="#EC4899" /></Pressable>
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>{[clinic.area, clinic.city].filter(Boolean).join(', ') || 'Location not provided'}</Text>
        <View style={styles.discoveryMetaRow}>
          <MetaChip icon="map-marker-distance" text={distance == null ? 'Distance --' : `${distance.toFixed(1)} km`} />
          <MetaChip icon="clock-outline" text={eta} />
          <MetaChip icon="star" text={Number(clinic.average_rating ?? 0).toFixed(1)} />
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>{serviceNames || 'Services pending'}</Text>
        <Text style={styles.priceLine}>Starts at Rs {price.toFixed(0)}</Text>
        <View style={styles.discoveryActions}>
          <Pressable style={styles.smallActionBtn} onPress={() => { if (clinic.phone) void Linking.openURL(`tel:${clinic.phone}`); }}><MaterialCommunityIcons name="phone" size={14} color="#fff" /></Pressable>
          <Pressable style={styles.smallActionBtnAlt} onPress={() => { if (clinic.latitude && clinic.longitude) void Linking.openURL(`https://maps.google.com/?q=${clinic.latitude},${clinic.longitude}`); }}><MaterialCommunityIcons name="navigation" size={14} color="#fff" /></Pressable>
          <Pressable style={styles.discoveryBookBtn} onPress={onBook}><Text style={styles.discoveryBookText}>Book Now</Text></Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function MetaChip({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  return <View style={styles.metaChip}><MaterialCommunityIcons name={icon} size={12} color={colors.primary} /><Text style={styles.metaChipText}>{text}</Text></View>;
}
function ServiceCard({ service, selected, onPress }: { service: GroomingServiceRecord; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.serviceCard, selected && styles.serviceCardActive]} onPress={onPress}>
      <MaterialCommunityIcons name="content-cut" size={22} color={selected ? '#fff' : '#EC4899'} />
      <Text style={[styles.serviceName, selected && styles.serviceActiveText]}>{service.name}</Text>
      <Text style={[styles.serviceDesc, selected && styles.serviceActiveText]} numberOfLines={2}>{service.description || `${service.duration_minutes ?? 60} minutes`}</Text>
      <Text style={[styles.servicePrice, selected && styles.serviceActiveText]}>Rs {Number(service.price).toFixed(0)}</Text>
    </Pressable>
  );
}

function GroomerRow({ groomer, selected, onPress }: { groomer: GroomerRecord; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.clinicCard, selected && styles.selectedCard]} onPress={onPress}>
      <View style={styles.clinicIcon}><MaterialCommunityIcons name="account-tie" size={22} color="#0EA5E9" /></View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{groomer.full_name}</Text>
        <Text style={styles.cardMeta}>{(groomer.specializations ?? []).slice(0, 2).join(', ') || 'Grooming specialist'}</Text>
        <Text style={styles.cardMeta}>{groomer.experience_years ?? 0} yrs - {Number(groomer.rating ?? 0).toFixed(1)} rating</Text>
      </View>
      {selected && <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />}
    </Pressable>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, active && styles.toggleActive]} onPress={onPress}>
      <MaterialCommunityIcons name={active ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={16} color={active ? '#fff' : colors.primary} />
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  bookBtn: { minWidth: 112, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EC4899', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  disabled: { opacity: 0.58 },
  bookBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  body: { padding: 20 },
  nextBanner: { backgroundColor: colors.primary + '10', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.primary + '30' },
  nextText: { flex: 1, gap: 3 },
  nextTitle: { fontSize: 13, fontWeight: '900', color: colors.text },
  nextSub: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  statusText: { fontSize: 11, color: colors.primary, fontWeight: '900' },
  emptyBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FDF2F8', borderRadius: 14, padding: 14, marginBottom: 16 },
  emptyBannerText: { flex: 1, color: colors.text, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 18, marginBottom: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listGap: { gap: 10 },
  petChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary + '40' },
  petChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  petChipText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  petChipTextActive: { color: '#fff' },
  clinicCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line },
  selectedCard: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  clinicIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' },
  discoveryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeToggle: { flexDirection: 'row', gap: 6, backgroundColor: colors.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.line },
  modeToggleBtn: { width: 32, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  modeToggleActive: { backgroundColor: colors.primary },
  mapPreview: { minHeight: 126, borderRadius: 20, backgroundColor: colors.primary + '12', borderWidth: 1, borderColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  mapPreviewText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  discoveryCard: { backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 22, elevation: 4 },
  discoveryImage: { height: 104, backgroundColor: '#EC4899', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  discoveryPhoto: { width: '100%', height: '100%' },
  openBadge: { position: 'absolute', top: 10, right: 10, borderRadius: 999, backgroundColor: colors.warning, paddingHorizontal: 9, paddingVertical: 5 },
  openBadgeActive: { backgroundColor: colors.success },
  openBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  discoveryBody: { padding: 14, gap: 7 },
  discoveryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favoriteBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' },
  discoveryMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: colors.primary + '10', paddingHorizontal: 8, paddingVertical: 5 },
  metaChipText: { color: colors.primaryDark, fontSize: 10, fontWeight: '900' },
  priceLine: { color: colors.success, fontSize: 12, fontWeight: '900' },
  discoveryActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  smallActionBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  smallActionBtnAlt: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center' },
  discoveryBookBtn: { flex: 1, minHeight: 36, borderRadius: 12, backgroundColor: '#EC4899', alignItems: 'center', justifyContent: 'center' },
  discoveryBookText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  cardInfo: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  cardMeta: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: { width: '47%', backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 7, borderWidth: 1, borderColor: colors.line },
  serviceCardActive: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  serviceName: { fontSize: 13, fontWeight: '900', color: colors.text },
  serviceDesc: { fontSize: 10, color: colors.muted, fontWeight: '600', lineHeight: 15 },
  servicePrice: { fontSize: 14, fontWeight: '900', color: '#EC4899' },
  serviceActiveText: { color: '#fff' },
  dateChip: { minWidth: 92, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateChipText: { fontSize: 11, fontWeight: '800', color: colors.text },
  dateChipTextActive: { color: '#fff' },
  slotChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  slotChipActive: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  slotChipText: { fontSize: 12, fontWeight: '800', color: colors.text },
  slotChipTextActive: { color: '#fff' },
  input: { minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, marginBottom: 10, textAlignVertical: 'top' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.primary + '55', backgroundColor: colors.surface },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  toggleTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.line },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  summaryValue: { flex: 1, textAlign: 'right', color: colors.text, fontWeight: '900', fontSize: 12 },
  historyCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  historyInfo: { flex: 1, gap: 3 },
  historyTitle: { fontSize: 13, color: colors.text, fontWeight: '900' },
  historyMeta: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'capitalize' },
  stateBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  stateTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  stateMessage: { fontSize: 13, fontWeight: '600', color: colors.muted, textAlign: 'center', lineHeight: 20 },
  retryBtn: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '900' },
  inlineEmpty: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line },
  inlineEmptyText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
});
