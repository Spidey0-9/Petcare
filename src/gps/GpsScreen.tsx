import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors } from '../core/theme/colors';
import { TABLES } from '../constants';
import { useRealtimeTables } from '../services/realtime';
import { appointmentService } from '../appointments/services/appointmentService';
import type { Hospital } from '../appointments/types/appointment.types';
import type { MainTabParamList } from '../routes/types';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address?: string;
}

export function GpsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const trackPulse = useRef(new Animated.Value(1)).current;
  const watchSub = useRef<Location.LocationSubscription | null>(null);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHospitalsSafely = useCallback(async (
    nextLocation?: { latitude: number; longitude: number },
    reason = 'manual',
  ) => {
    try {
      const nextHospitals = await appointmentService.getHospitals(nextLocation);
      setHospitals(nextHospitals);
      return nextHospitals;
    } catch (error) {
      console.error('[GpsScreen] hospital load failed', { reason, error });
      setHospitals([]);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load nearby hospitals.');
      return [];
    }
  }, []);

  useRealtimeTables('gps-hospital-list', [TABLES.clinics], (_table, payload) => {
    void loadHospitalsSafely(location ?? undefined, 'realtime-clinics');
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
    void loadLocationAndHospitals();
    return () => { watchSub.current?.remove(); };
  }, []);

  useEffect(() => {
    if (isTracking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(trackPulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(trackPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      trackPulse.setValue(1);
    }
  }, [isTracking, trackPulse]);

  const loadLocationAndHospitals = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setPermissionGranted(false);
        setErrorMessage('Location permission denied. Hospitals are sorted alphabetically.');
        await loadHospitalsSafely(undefined, 'permission-denied');
        return;
      }

      setPermissionGranted(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [addr] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }).catch(() => [null]);
      const nextLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        address: addr ? `${addr.street ?? ''}, ${addr.city ?? ''}, ${addr.region ?? ''}`.replace(/^,\s*/, '') : undefined,
      };
      setLocation(nextLocation);
      await loadHospitalsSafely(nextLocation, 'gps-location');
    } catch (error) {
      console.error('[GpsScreen] location load failed', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load nearby hospitals.');
      await loadHospitalsSafely(undefined, 'location-fallback');
    } finally {
      setLoading(false);
    }
  };

  const toggleTracking = async () => {
    try {
      if (isTracking) {
        watchSub.current?.remove();
        watchSub.current = null;
        setIsTracking(false);
        return;
      }

      if (!permissionGranted) {
        await loadLocationAndHospitals();
        return;
      }

      setIsTracking(true);
      watchSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        loc => {
          const nextLocation = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy };
          setLocation(nextLocation);
          void loadHospitalsSafely(nextLocation, 'watch-position');
        },
      );
    } catch (error) {
      console.error('[GpsScreen] toggle tracking failed', error);
      setIsTracking(false);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start live tracking.');
    }
  };

  const shareLocation = async () => {
    if (!location) return;
    try {
      await Share.share({ message: `PetCare+ location:\n${location.address ?? ''}\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}` });
    } catch (error) {
      console.error('[GpsScreen] share location failed', error);
    }
  };

  const openInMaps = () => {
    if (!location) return;
    void Linking.openURL(`https://maps.google.com/?q=${location.latitude},${location.longitude}`).catch(error => console.error('[GpsScreen] open maps failed', error));
  };

  const openBookAppointment = (hospital: Hospital) => {
    const tabNavigation = navigation.getParent<NavigationProp<MainTabParamList>>() ?? navigation;
    tabNavigation.navigate('Appointments', {
      screen: 'BookAppointment',
      params: {
        selectedHospital: {
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          clinicId: hospital.id,
          consultationFee: hospital.consultationFee,
          doctorCount: hospital.availableDoctors || hospital.totalDoctors,
          latitude: hospital.latitude,
          longitude: hospital.longitude,
          address: hospital.address,
        },
        startAtDoctorSelection: true,
      },
    });
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <MaterialCommunityIcons name="map-marker-radius" size={24} color={colors.primary} />
        <Text style={styles.headerTitle}>GPS & Nearby Hospitals</Text>
        <Pressable style={styles.refreshBtn} onPress={loadLocationAndHospitals} disabled={loading}>
          <MaterialCommunityIcons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLocationAndHospitals} tintColor={colors.primary} />}>
        <Animated.View style={[styles.locationCard, { transform: [{ translateY: slideAnim }] }]}> 
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map" size={56} color={colors.primary + '60'} />
            {location ? (
              <View style={styles.mapPin}>
                <Animated.View style={[styles.mapPinPulse, { transform: [{ scale: trackPulse }] }]} />
                <MaterialCommunityIcons name="map-marker" size={32} color="#EF4444" />
              </View>
            ) : null}
            <Text style={styles.mapHint}>{loading ? 'Getting location...' : location ? 'Current position detected' : 'Location unavailable'}</Text>
            {location ? (
              <Pressable style={styles.openMapBtn} onPress={openInMaps}>
                <MaterialCommunityIcons name="open-in-new" size={14} color={colors.primary} />
                <Text style={styles.openMapText}>Open in Maps</Text>
              </Pressable>
            ) : null}
          </View>

          {location ? (
            <View style={styles.locDetails}>
              <View style={styles.locRow}>
                <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
                <View style={styles.locInfo}>
                  <Text style={styles.locLabel}>Current Location</Text>
                  <Text style={styles.locAddress} numberOfLines={2}>{location.address ?? 'Address not available'}</Text>
                </View>
              </View>
              <View style={styles.coordsRow}>
                <Coord label="LAT" value={location.latitude.toFixed(5)} />
                <Coord label="LNG" value={location.longitude.toFixed(5)} />
                {location.accuracy ? <Coord label="ACC" value={`${Math.round(location.accuracy)}m`} /> : null}
              </View>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, isTracking && styles.actionBtnActive]} onPress={toggleTracking}>
            <MaterialCommunityIcons name={isTracking ? 'navigation' : 'navigation-outline'} size={20} color={isTracking ? '#fff' : colors.primary} />
            <Text style={[styles.actionBtnText, isTracking && { color: '#fff' }]}>{isTracking ? 'Stop Tracking' : 'Live Track'}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={shareLocation} disabled={!location}>
            <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>
        </View>

        {isTracking ? <View style={styles.trackingBanner}><Animated.View style={[styles.trackingDot, { transform: [{ scale: trackPulse }] }]} /><Text style={styles.trackingText}>Live location tracking is active</Text></View> : null}
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="hospital-building" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Nearby Veterinary Hospitals</Text>
        </View>

        {!loading && !hospitals.length ? <View style={styles.emptyBox}><Text style={styles.emptyTitle}>No hospitals found</Text><Text style={styles.emptyText}>No clinic records were returned from Supabase.</Text></View> : null}
        {hospitals.map((hospital, index) => <HospitalCard key={hospital.id} hospital={hospital} index={index} onBook={openBookAppointment} />)}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

function Coord({ label, value }: { label: string; value: string }) {
  return <View style={styles.coordChip}><Text style={styles.coordLabel}>{label}</Text><Text style={styles.coordValue}>{value}</Text></View>;
}

function HospitalCard({ hospital, index, onBook }: { hospital: Hospital; index: number; onBook: (hospital: Hospital) => void }) {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 70, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 360, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, index, slideAnim]);

  return (
    <Animated.View style={[styles.clinicCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
      <View style={styles.clinicBanner}>
        {hospital.logoUrl && !logoFailed ? <Image source={{ uri: hospital.logoUrl }} style={styles.hospitalLogo} onError={() => setLogoFailed(true)} /> : <MaterialCommunityIcons name="hospital-building" size={30} color="#fff" />}
        <View style={[styles.clinicStatus, { backgroundColor: hospital.is24x7 || hospital.emergencyAvailable ? colors.success : '#FF8F00' }]}>
          <Text style={styles.clinicStatusText}>{hospital.is24x7 ? '24/7' : hospital.todayAvailability}</Text>
        </View>
      </View>
      <View style={styles.clinicBody}>
        <Text style={styles.clinicName} numberOfLines={1}>{hospital.name}</Text>
        <Text style={styles.clinicSpecialty}>{hospital.departments.slice(0, 3).join(' | ') || hospital.description}</Text>
        <View style={styles.clinicMeta}>
          <MaterialCommunityIcons name="star" size={12} color="#FF8F00" />
          <Text style={styles.ratingText}>{hospital.rating.toFixed(1)} ({hospital.reviewCount})</Text>
          <MaterialCommunityIcons name="walk" size={12} color={colors.muted} style={{ marginLeft: 8 }} />
          <Text style={styles.distText}>{hospital.distanceLabel}</Text>
        </View>
        <Text style={styles.clinicSpecialty}>{hospital.address}</Text>
        <Text style={styles.feeText}>Fee from Rs {hospital.consultationFee} | Doctors {hospital.availableDoctors}/{hospital.totalDoctors}</Text>
        <View style={styles.clinicActions}>
          <Pressable style={styles.clinicCallBtn} onPress={() => { if (hospital.phone) void Linking.openURL(`tel:${hospital.phone}`).catch(error => console.error('[GpsScreen] call hospital failed', error)); }}>
            <MaterialCommunityIcons name="phone" size={14} color="#fff" />
          </Pressable>
          <Pressable style={styles.clinicNavBtn} onPress={() => { if (hospital.latitude && hospital.longitude) void Linking.openURL(`https://maps.google.com/?q=${hospital.latitude},${hospital.longitude}`).catch(error => console.error('[GpsScreen] navigate hospital failed', error)); }}>
            <MaterialCommunityIcons name="navigation" size={14} color="#fff" />
          </Pressable>
          <Pressable style={styles.clinicBookBtn} onPress={() => onBook(hospital)}>
            <Text style={styles.clinicBookText}>Book Appt</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.text },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  locationCard: { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  mapPlaceholder: { height: 180, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mapPin: { position: 'absolute', alignItems: 'center' },
  mapPinPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: '#EF444440' },
  mapHint: { fontSize: 13, color: colors.muted, fontWeight: '600', position: 'absolute', bottom: 16 },
  openMapBtn: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface + 'E0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  openMapText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  locDetails: { padding: 16, gap: 12 },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  locInfo: { flex: 1 },
  locLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginBottom: 3 },
  locAddress: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  coordsRow: { flexDirection: 'row', gap: 8 },
  coordChip: { flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: 'center' },
  coordLabel: { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 1 },
  coordValue: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  trackingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.success + '15', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.success + '30' },
  trackingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  trackingText: { fontSize: 12, fontWeight: '700', color: colors.success },
  errorText: { backgroundColor: '#FFF3E0', color: '#FF8F00', borderRadius: 12, padding: 12, fontSize: 12, fontWeight: '700', marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  emptyBox: { backgroundColor: colors.surface, borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  emptyText: { fontSize: 12, fontWeight: '600', color: colors.muted, textAlign: 'center', marginTop: 4 },
  clinicCard: { backgroundColor: colors.surface, borderRadius: 18, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  clinicBanner: { height: 80, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  hospitalLogo: { width: 56, height: 56, borderRadius: 16, resizeMode: 'cover' },
  clinicStatus: { position: 'absolute', top: 10, right: 10, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  clinicStatusText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  clinicBody: { padding: 14, gap: 6 },
  clinicName: { fontSize: 15, fontWeight: '900', color: colors.text },
  clinicSpecialty: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  clinicMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 11, fontWeight: '800', color: colors.text, marginLeft: 4 },
  distText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  feeText: { fontSize: 12, color: colors.success, fontWeight: '900' },
  clinicActions: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  clinicCallBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  clinicNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center' },
  clinicBookBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  clinicBookText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});





