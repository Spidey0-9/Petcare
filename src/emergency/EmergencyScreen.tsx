import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';

const VET_PHONE = '+911234567890';
const AMBULANCE_PHONE = '+911800200300';
const WHATSAPP_NUMBER = '911234567890';
const SUPPORT_EMAIL = 'emergency@petcareplus.com';

const NEARBY_CLINICS = [
  { id: '1', name: 'Paw Care 24x7 Hospital', distance: '0.8 km', phone: '+919876543210', open: true  },
  { id: '2', name: 'VetCare Emergency',       distance: '2.1 km', phone: '+919876543211', open: true  },
  { id: '3', name: 'City Animal Hospital',    distance: '3.4 km', phone: '+919876543212', open: false },
];

const FIRST_AID_STEPS = [
  { icon: 'heart-pulse',        color: '#EF4444', title: 'Stay Calm',        desc: 'Keep yourself and your pet calm. Panicking worsens the situation.' },
  { icon: 'bandage',            color: '#FF8F00', title: 'Control Bleeding', desc: 'Apply gentle pressure with a clean cloth for 5–10 minutes.' },
  { icon: 'thermometer',        color: '#0EA5E9', title: 'Check Breathing',  desc: 'Ensure airway is clear. Perform gentle mouth-to-snout if needed.' },
  { icon: 'shield-check',       color: '#22C55E', title: 'Immobilize',       desc: 'Do not move if spinal injury is suspected. Use a flat board.' },
  { icon: 'hospital-box',       color: '#8B5CF6', title: 'Rush to Vet',      desc: 'Transport carefully keeping pet still and warm. Call ahead.' },
];

export function EmergencyScreen() {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0.5)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [showFirstAid, setShowFirstAid] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Continuous SOS pulse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 1,    duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 0.5,  duration: 800, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const callVet       = () => Linking.openURL(`tel:${VET_PHONE}`);
  const callAmbulance = () => Linking.openURL(`tel:${AMBULANCE_PHONE}`);
  const openWhatsApp  = () => Linking.openURL(`whatsapp://send?phone=${WHATSAPP_NUMBER}&text=Emergency! My pet needs help.`).catch(() => Alert.alert('WhatsApp not installed'));
  const sendEmail     = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Pet Emergency`);

  const handleSOS = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      '🚨 SOS Activated',
      'Connecting to emergency services and sharing your location...',
      [
        { text: 'Call Vet Ambulance', onPress: callAmbulance, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="ambulance" size={26} color="#EF4444" />
          <Text style={styles.headerTitle}>Emergency SOS</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>24/7</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Giant SOS Button ─────────────────────────── */}
        <View style={styles.sosSection}>
          <Animated.View style={[styles.sosGlow, { opacity: glowAnim, transform: [{ scale: pulseAnim }] }]} />
          <Pressable onPress={handleSOS} style={styles.sosButton}>
            <MaterialCommunityIcons name="alert-circle" size={42} color="#fff" />
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosSubText}>Tap for Emergency</Text>
          </Pressable>
        </View>

        <Text style={styles.sosHint}>Press SOS to instantly alert emergency services</Text>

        {/* ── Quick Action Buttons ─────────────────────── */}
        <View style={styles.actionsGrid}>
          <ActionButton icon="phone" label="Call Vet" color="#22C55E" onPress={callVet} />
          <ActionButton icon="ambulance" label="Ambulance" color="#EF4444" onPress={callAmbulance} />
          <ActionButton icon="whatsapp" label="WhatsApp" color="#25D366" onPress={openWhatsApp} />
          <ActionButton icon="chat" label="Live Chat" color={colors.primary} onPress={() => Alert.alert('Chat', 'Opening live chat support...')} />
          <ActionButton icon="email" label="Email SOS" color="#FF8F00" onPress={sendEmail} />
          <ActionButton icon="map-marker" label="Share Location" color="#0EA5E9" onPress={() => Alert.alert('Location', 'Sharing location...')} />
        </View>

        {/* ── Nearby Emergency Clinics ─────────────────── */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="hospital-building" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Nearby Emergency Clinics</Text>
        </View>
        {NEARBY_CLINICS.map(clinic => (
          <View key={clinic.id} style={styles.clinicCard}>
            <View style={styles.clinicInfo}>
              <View style={styles.clinicIconWrap}>
                <MaterialCommunityIcons name="hospital-building" size={22} color={colors.primary} />
              </View>
              <View style={styles.clinicText}>
                <Text style={styles.clinicName}>{clinic.name}</Text>
                <View style={styles.clinicMeta}>
                  <MaterialCommunityIcons name="walk" size={12} color={colors.muted} />
                  <Text style={styles.clinicMetaText}>{clinic.distance}</Text>
                  <View style={[styles.statusDot, { backgroundColor: clinic.open ? colors.success : '#EF4444' }]} />
                  <Text style={[styles.clinicMetaText, { color: clinic.open ? colors.success : '#EF4444' }]}>
                    {clinic.open ? 'Open Now' : 'Closed'}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${clinic.phone}`)}>
              <MaterialCommunityIcons name="phone" size={16} color="#fff" />
            </Pressable>
          </View>
        ))}

        {/* ── First Aid Guide ───────────────────────────── */}
        <Pressable
          style={styles.firstAidToggle}
          onPress={() => setShowFirstAid(v => !v)}
        >
          <MaterialCommunityIcons name="medical-bag" size={20} color={colors.success} />
          <Text style={styles.firstAidToggleText}>Emergency First Aid Guide</Text>
          <MaterialCommunityIcons
            name={showFirstAid ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.muted}
          />
        </Pressable>

        {showFirstAid && (
          <View style={styles.firstAidSteps}>
            {FIRST_AID_STEPS.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: step.color }]}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <View style={[styles.stepIcon, { backgroundColor: step.color + '20' }]}>
                  <MaterialCommunityIcons name={step.icon as any} size={18} color={step.color} />
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </Animated.View>
  );
}

function ActionButton({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, friction: 8 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 6 }).start();

  return (
    <Animated.View style={[styles.actionBtnWrapper, { transform: [{ scale }] }]}>
      <Pressable style={[styles.actionBtn, { backgroundColor: color + '18' }]} onPress={onPress} onPressIn={onIn} onPressOut={onOut}>
        <View style={[styles.actionIconWrap, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon as any} size={22} color="#fff" />
        </View>
        <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  headerBadge: { backgroundColor: '#EF444420', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  headerBadgeText: { fontSize: 12, fontWeight: '900', color: '#EF4444' },
  body: { padding: 20 },
  sosSection: { alignItems: 'center', marginVertical: 28, position: 'relative' },
  sosGlow: {
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#EF444440',
  },
  sosButton: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 14,
  },
  sosText:    { fontSize: 28, fontWeight: '900', color: '#fff' },
  sosSubText: { fontSize: 10, color: '#fff', opacity: 0.9, fontWeight: '600' },
  sosHint:    { textAlign: 'center', fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 24 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24 },
  actionBtnWrapper: { width: '30%' },
  actionBtn: { borderRadius: 16, padding: 14, alignItems: 'center', gap: 8 },
  actionIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:  { fontSize: 16, fontWeight: '900', color: colors.text },
  clinicCard: {
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  clinicInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  clinicIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  clinicText: { flex: 1 },
  clinicName:     { fontSize: 14, fontWeight: '800', color: colors.text },
  clinicMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  clinicMetaText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  firstAidToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    marginTop: 16, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  firstAidToggleText: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text },
  firstAidSteps: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 14 },
  stepRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum:  { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepNumText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  stepIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepInfo: { flex: 1 },
  stepTitle:{ fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 2 },
  stepDesc: { fontSize: 12, color: colors.muted, lineHeight: 18, fontWeight: '500' },
});
