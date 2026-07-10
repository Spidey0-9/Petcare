import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors } from '../core/theme/colors';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address?: string;
}

const NEARBY_CLINICS = [
  { id: '1', name: 'Paw Care Veterinary Hospital', distance: '1.2 km', rating: 4.8, open: true,  phone: '+919876543210', specialty: 'General & Emergency' },
  { id: '2', name: 'VetCare Plus Clinic',           distance: '2.5 km', rating: 4.6, open: true,  phone: '+919876543211', specialty: 'Small Animals'       },
  { id: '3', name: 'City Animal Hospital',           distance: '3.8 km', rating: 4.4, open: false, phone: '+919876543212', specialty: 'Surgery & Dental'    },
  { id: '4', name: 'Happy Paws Pet Clinic',          distance: '5.1 km', rating: 4.7, open: true,  phone: '+919876543213', specialty: 'General Practice'    },
];

export function GpsScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const trackPulse = useRef(new Animated.Value(1)).current;

  const [location, setLocation]         = useState<LocationData | null>(null);
  const [isTracking, setIsTracking]     = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading]           = useState(false);
  const watchSub = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8,   useNativeDriver: true }),
    ]).start();
    requestPermission();
    return () => { watchSub.current?.remove(); };
  }, []);

  // Pulse animation when tracking
  useEffect(() => {
    if (isTracking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(trackPulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(trackPulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      trackPulse.setValue(1);
    }
  }, [isTracking]);

  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      getCurrentLocation();
    } else {
      Alert.alert(
        'Permission Required',
        'Location permission is needed to find nearby clinics.',
        [{ text: 'OK' }]
      );
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      }).catch(() => [null]);

      setLocation({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy:  loc.coords.accuracy,
        address: addr
          ? `${addr.street ?? ''}, ${addr.city ?? ''}, ${addr.region ?? ''}`.replace(/^,\s*/, '')
          : undefined,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not get location. Ensure GPS is enabled.');
    }
    setLoading(false);
  };

  const toggleTracking = async () => {
    if (isTracking) {
      watchSub.current?.remove();
      watchSub.current = null;
      setIsTracking(false);
    } else {
      if (!permissionGranted) { await requestPermission(); return; }
      setIsTracking(true);
      watchSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        async (loc) => {
          const [addr] = await Location.reverseGeocodeAsync({
            latitude:  loc.coords.latitude,
            longitude: loc.coords.longitude,
          }).catch(() => [null]);
          setLocation({
            latitude:  loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy:  loc.coords.accuracy,
            address: addr
              ? `${addr.street ?? ''}, ${addr.city ?? ''}`.replace(/^,\s*/, '')
              : undefined,
          });
        }
      );
    }
  };

  const shareLocation = async () => {
    if (!location) { Alert.alert('No location', 'Get your location first.'); return; }
    const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    try {
      await Share.share({
        message: `🐾 My current location:\n${location.address ?? ''}\n\n${mapsUrl}`,
        title: 'Share My Location',
      });
    } catch {}
  };

  const shareViaWhatsApp = () => {
    if (!location) { Alert.alert('No location', 'Get your location first.'); return; }
    const msg = encodeURIComponent(
      `🐾 PetCare+ Emergency Location:\n${location.address ?? ''}\nhttps://maps.google.com/?q=${location.latitude},${location.longitude}`
    );
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() =>
      Alert.alert('WhatsApp not installed')
    );
  };

  const openInMaps = () => {
    if (!location) return;
    Linking.openURL(`https://maps.google.com/?q=${location.latitude},${location.longitude}`);
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="map-marker-radius" size={24} color={colors.primary} />
        <Text style={styles.headerTitle}>GPS & Nearby Clinics</Text>
        <Pressable
          style={styles.refreshBtn}
          onPress={getCurrentLocation}
          disabled={loading || !permissionGranted}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Location Card ─────────────────────────── */}
        <Animated.View style={[styles.locationCard, { transform: [{ translateY: slideAnim }] }]}>
          {/* Map placeholder (would use react-native-maps in full build) */}
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map" size={56} color={colors.primary + '60'} />
            {location && (
              <View style={styles.mapPin}>
                <Animated.View style={[styles.mapPinPulse, { transform: [{ scale: trackPulse }] }]} />
                <MaterialCommunityIcons name="map-marker" size={32} color="#EF4444" />
              </View>
            )}
            {!location && !loading && (
              <Text style={styles.mapHint}>Tap "Get Location" to find your position</Text>
            )}
            {loading && (
              <Text style={styles.mapHint}>Getting your location...</Text>
            )}
            {/* Open in maps overlay */}
            {location && (
              <Pressable style={styles.openMapBtn} onPress={openInMaps}>
                <MaterialCommunityIcons name="open-in-new" size={14} color={colors.primary} />
                <Text style={styles.openMapText}>Open in Maps</Text>
              </Pressable>
            )}
          </View>

          {/* Location details */}
          {location ? (
            <View style={styles.locDetails}>
              <View style={styles.locRow}>
                <MaterialCommunityIcons name="crosshairs-gps" size={18} color={colors.primary} />
                <View style={styles.locInfo}>
                  <Text style={styles.locLabel}>Current Location</Text>
                  <Text style={styles.locAddress} numberOfLines={2}>
                    {location.address ?? 'Address not available'}
                  </Text>
                </View>
              </View>
              <View style={styles.coordsRow}>
                <View style={styles.coordChip}>
                  <Text style={styles.coordLabel}>LAT</Text>
                  <Text style={styles.coordValue}>{location.latitude.toFixed(5)}</Text>
                </View>
                <View style={styles.coordChip}>
                  <Text style={styles.coordLabel}>LNG</Text>
                  <Text style={styles.coordValue}>{location.longitude.toFixed(5)}</Text>
                </View>
                {location.accuracy && (
                  <View style={styles.coordChip}>
                    <Text style={styles.coordLabel}>ACC</Text>
                    <Text style={styles.coordValue}>±{Math.round(location.accuracy)}m</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.getLocBtn}
              onPress={getCurrentLocation}
              disabled={loading}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#fff" />
              <Text style={styles.getLocText}>{loading ? 'Getting Location...' : 'Get My Location'}</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* ── Action Buttons ────────────────────────── */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.actionBtn, isTracking && styles.actionBtnActive]}
            onPress={toggleTracking}
          >
            <Animated.View style={{ transform: [{ scale: isTracking ? trackPulse : new Animated.Value(1) }] }}>
              <MaterialCommunityIcons
                name={isTracking ? 'navigation' : 'navigation-outline'}
                size={20}
                color={isTracking ? '#fff' : colors.primary}
              />
            </Animated.View>
            <Text style={[styles.actionBtnText, isTracking && { color: '#fff' }]}>
              {isTracking ? 'Stop Tracking' : 'Live Track'}
            </Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={shareLocation}>
            <MaterialCommunityIcons name="share-variant" size={20} color={colors.primary} />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>

          <Pressable style={[styles.actionBtn, { borderColor: '#25D366' }]} onPress={shareViaWhatsApp}>
            <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
            <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
          </Pressable>
        </View>

        {/* ── Tracking indicator ────────────────────── */}
        {isTracking && (
          <View style={styles.trackingBanner}>
            <Animated.View style={[styles.trackingDot, { transform: [{ scale: trackPulse }] }]} />
            <Text style={styles.trackingText}>Live location tracking is active</Text>
          </View>
        )}

        {/* ── Nearby Clinics ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="hospital-building" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Nearby Veterinary Clinics</Text>
        </View>

        {NEARBY_CLINICS.map((clinic, i) => (
          <ClinicCard key={clinic.id} clinic={clinic} index={i} />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

function ClinicCard({ clinic, index }: { clinic: typeof NEARBY_CLINICS[0]; index: number }) {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 80, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const onIn  = () => Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  const onOut = () => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true, friction: 6 }).start();

  const stars = Array.from({ length: 5 }, (_, i) => (
    <MaterialCommunityIcons
      key={i}
      name={i < Math.floor(clinic.rating) ? 'star' : 'star-outline'}
      size={11}
      color="#FF8F00"
    />
  ));

  return (
    <Animated.View
      style={[
        styles.clinicCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: pressAnim }] },
      ]}
    >
      <Pressable onPressIn={onIn} onPressOut={onOut} style={styles.clinicPressable}>
        <View style={styles.clinicBanner}>
          <MaterialCommunityIcons name="hospital-building" size={28} color="#fff" />
          <View style={[styles.clinicStatus, { backgroundColor: clinic.open ? colors.success : '#EF4444' }]}>
            <Text style={styles.clinicStatusText}>{clinic.open ? 'Open' : 'Closed'}</Text>
          </View>
        </View>
        <View style={styles.clinicBody}>
          <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
          <Text style={styles.clinicSpecialty}>{clinic.specialty}</Text>
          <View style={styles.clinicMeta}>
            <View style={styles.starRow}>{stars}</View>
            <Text style={styles.ratingText}>{clinic.rating}</Text>
            <MaterialCommunityIcons name="walk" size={12} color={colors.muted} style={{ marginLeft: 8 }} />
            <Text style={styles.distText}>{clinic.distance}</Text>
          </View>
          <View style={styles.clinicActions}>
            <Pressable
              style={styles.clinicCallBtn}
              onPress={() => Linking.openURL(`tel:${clinic.phone}`)}
            >
              <MaterialCommunityIcons name="phone" size={14} color="#fff" />
            </Pressable>
            <Pressable
              style={styles.clinicNavBtn}
              onPress={() => Alert.alert('Navigate', `Opening directions to ${clinic.name}`)}
            >
              <MaterialCommunityIcons name="navigation" size={14} color="#fff" />
            </Pressable>
            <Pressable
              style={styles.clinicBookBtn}
              onPress={() => Alert.alert('Book', `Booking appointment at ${clinic.name}`)}
            >
              <Text style={styles.clinicBookText}>Book Appt</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.text },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  locationCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  mapPlaceholder: {
    height: 180, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  mapPin: { position: 'absolute', alignItems: 'center' },
  mapPinPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: '#EF444440' },
  mapHint: { fontSize: 13, color: colors.muted, fontWeight: '600', position: 'absolute', bottom: 16 },
  openMapBtn: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface + 'E0', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  openMapText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  locDetails: { padding: 16, gap: 12 },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  locInfo: { flex: 1 },
  locLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, marginBottom: 3 },
  locAddress: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 20 },
  coordsRow: { flexDirection: 'row', gap: 8 },
  coordChip: {
    flex: 1, backgroundColor: colors.background, borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  coordLabel: { fontSize: 9, fontWeight: '900', color: colors.muted, letterSpacing: 1 },
  coordValue: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 2 },
  getLocBtn: {
    margin: 16, backgroundColor: colors.primary, borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  getLocText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: colors.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  trackingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.success + '15', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.success + '30',
  },
  trackingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  trackingText: { fontSize: 12, fontWeight: '700', color: colors.success },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  clinicCard: {
    backgroundColor: colors.surface, borderRadius: 18, marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  clinicPressable: {},
  clinicBanner: {
    height: 80, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  clinicStatus: {
    position: 'absolute', top: 10, right: 10,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  clinicStatusText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  clinicBody: { padding: 14, gap: 6 },
  clinicName: { fontSize: 15, fontWeight: '900', color: colors.text },
  clinicSpecialty: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  clinicMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starRow: { flexDirection: 'row', gap: 1 },
  ratingText: { fontSize: 11, fontWeight: '800', color: colors.text, marginLeft: 4 },
  distText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  clinicActions: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  clinicCallBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  clinicNavBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0EA5E9',     alignItems: 'center', justifyContent: 'center' },
  clinicBookBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  clinicBookText:{ fontSize: 12, fontWeight: '800', color: '#fff' },
});
