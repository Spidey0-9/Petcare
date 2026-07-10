import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors } from '../../core/theme/colors';
import {
  Appointment,
  AppointmentStatus,
  APPOINTMENT_TYPE_INFO,
} from '../types/appointment.types';
import { appointmentService } from '../services/appointmentService';
import { StatusBadge } from '../components/StatusBadge';
import { InfoCard } from '../components/InfoCard';
import { ActionButton } from '../components/ActionButton';
import { InfoRow } from '../components/InfoRow';
import type { AppointmentStackParamList } from '../navigation/AppointmentNavigator';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;
type RouteParams = RouteProp<AppointmentStackParamList, 'AppointmentDetails'>;

export function AppointmentDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { appointmentId, isCustomer } = route.params;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await appointmentService.getAppointmentDetails(appointmentId);
    setAppointment(data);
    setLoading(false);
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (status: AppointmentStatus) => {
    setActionLoading(true);
    await appointmentService.updateAppointmentStatus(appointmentId, status);
    await load();
    setActionLoading(false);
    Alert.alert('Success', `Appointment ${status.toLowerCase().replace('_', ' ')}`);
  };

  const cancelAppointment = () => {
    Alert.prompt(
      'Cancel Appointment',
      'Please provide a reason for cancellation:',
      async (reason) => {
        if (!reason || !reason.trim()) {
          Alert.alert('Required', 'Please enter a cancellation reason');
          return;
        }
        setActionLoading(true);
        await appointmentService.cancelAppointment(appointmentId, reason);
        Alert.alert('Cancelled', 'Appointment has been cancelled', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        setActionLoading(false);
      }
    );
  };

  if (loading || !appointment) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const typeInfo = APPOINTMENT_TYPE_INFO[appointment.type];
  const date = new Date(appointment.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isEmergency = appointment.type === 'EMERGENCY';
  const isPending = appointment.status === AppointmentStatus.PENDING_APPROVAL;
  const isConfirmed =
    appointment.status === AppointmentStatus.CONFIRMED ||
    appointment.status === AppointmentStatus.UPCOMING;
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
  const isInProgress = appointment.status === AppointmentStatus.IN_PROGRESS;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <Pressable>
          <MaterialCommunityIcons name="share-variant" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor:
                appointment.status === AppointmentStatus.PENDING_APPROVAL
                  ? '#FFF3E0'
                  : appointment.status === AppointmentStatus.CONFIRMED
                  ? '#E1F5FE'
                  : appointment.status === AppointmentStatus.COMPLETED
                  ? '#DCFCE7'
                  : '#FEE2E2',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="information"
            size={20}
            color={
              appointment.status === AppointmentStatus.PENDING_APPROVAL
                ? '#FF8F00'
                : appointment.status === AppointmentStatus.CONFIRMED
                ? '#0277BD'
                : appointment.status === AppointmentStatus.COMPLETED
                ? '#16A34A'
                : '#D32F2F'
            }
          />
          <View style={{ flex: 1 }}>
            <StatusBadge status={appointment.status} size="medium" />
            <Text style={styles.appointmentId}>Appointment #{appointment.id}</Text>
          </View>
          {appointment.fee && (
            <Text style={styles.feeText}>₹{appointment.fee}</Text>
          )}
        </View>

        {/* Emergency Alert */}
        {isEmergency && (
          <View style={styles.emergencyAlert}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.emergencyText}>EMERGENCY CONSULTATION</Text>
          </View>
        )}

        {/* Appointment Type */}
        <InfoCard
          title="Appointment Type"
          icon="calendar-check"
          iconColor={colors.primary}
        >
          <View style={styles.typeRow}>
            <Text style={styles.typeIcon}>{typeInfo.icon}</Text>
            <Text style={styles.typeLabel}>{typeInfo.label}</Text>
          </View>
        </InfoCard>

        {/* Doctor/Patient Info */}
        {isCustomer ? (
          <InfoCard title="Doctor Information" icon="doctor" iconColor="#2E7D32">
            <View style={styles.doctorCard}>
              <View style={styles.avatar}>
                <MaterialCommunityIcons name="doctor" size={36} color="#2E7D32" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                <Text style={styles.hospitalName}>{appointment.hospitalName}</Text>
                <View style={styles.actionRow}>
                  <Pressable style={styles.chipBtn}>
                    <MaterialCommunityIcons name="chat" size={14} color={colors.primary} />
                    <Text style={styles.chipBtnText}>Chat</Text>
                  </Pressable>
                  {appointment.type === 'VIDEO_CONSULTATION' && (
                    <Pressable style={styles.chipBtn}>
                      <MaterialCommunityIcons name="video" size={14} color={colors.primary} />
                      <Text style={styles.chipBtnText}>Video</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </InfoCard>
        ) : (
          <InfoCard title="Patient Information" icon="paw" iconColor="#0EA5E9">
            <View style={styles.doctorCard}>
              <View style={[styles.avatar, { backgroundColor: '#E0F2FE' }]}>
                <MaterialCommunityIcons name="paw" size={36} color="#0EA5E9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorName}>{appointment.petName}</Text>
                <Text style={styles.hospitalName}>Owner: {appointment.customerName}</Text>
                {appointment.aiHealthScore && (
                  <View style={styles.aiScoreBadge}>
                    <MaterialCommunityIcons name="robot" size={12} color="#7C3AED" />
                    <Text style={styles.aiScoreText}>
                      AI Health Score: {appointment.aiHealthScore}
                    </Text>
                  </View>
                )}
                <View style={styles.actionRow}>
                  <Pressable style={styles.chipBtn}>
                    <MaterialCommunityIcons name="history" size={14} color={colors.primary} />
                    <Text style={styles.chipBtnText}>History</Text>
                  </Pressable>
                  <Pressable style={styles.chipBtn}>
                    <MaterialCommunityIcons name="account" size={14} color={colors.primary} />
                    <Text style={styles.chipBtnText}>Profile</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </InfoCard>
        )}

        {/* Date & Time */}
        <InfoCard title="Schedule" icon="clock-outline" iconColor="#FF8F00">
          <InfoRow icon="calendar" iconColor={colors.primary} label="Date" value={formattedDate} />
          <InfoRow icon="clock-outline" iconColor={colors.primary} label="Time" value={appointment.timeSlot} />
        </InfoCard>

        {/* Symptoms */}
        <InfoCard title="Symptoms / Reason" icon="medical-bag" iconColor="#EF4444">
          <Text style={styles.bodyText}>{appointment.symptoms || 'Not specified'}</Text>
        </InfoCard>

        {/* Diagnosis (if present) */}
        {appointment.diagnosis && (
          <InfoCard title="Diagnosis" icon="clipboard-text" iconColor="#16A34A" borderColor="#16A34A">
            <Text style={styles.bodyText}>{appointment.diagnosis}</Text>
          </InfoCard>
        )}

        {/* Prescription (if present) */}
        {appointment.prescription && (
          <InfoCard
            title="Prescription"
            icon="pill"
            iconColor="#7C3AED"
            borderColor="#7C3AED"
            rightElement={
              isCustomer && (
                <Pressable>
                  <MaterialCommunityIcons name="download" size={20} color="#7C3AED" />
                </Pressable>
              )
            }
          >
            <Text style={styles.bodyText}>{appointment.prescription}</Text>
          </InfoCard>
        )}

        {/* Rating (if present) */}
        {appointment.rating && (
          <InfoCard title="Your Rating" icon="star" iconColor="#FF8F00" borderColor="#FF8F00">
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map(i => (
                <MaterialCommunityIcons
                  key={i}
                  name={i <= appointment.rating! ? 'star' : 'star-outline'}
                  size={28}
                  color="#FF8F00"
                />
              ))}
            </View>
            {appointment.review && (
              <Text style={[styles.bodyText, { marginTop: 10, fontStyle: 'italic' }]}>
                "{appointment.review}"
              </Text>
            )}
          </InfoCard>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isCustomer ? (
            <>
              {isConfirmed && (
                <>
                  {appointment.type === 'VIDEO_CONSULTATION' && (
                    <ActionButton
                      icon="video"
                      label="Join Video Consultation"
                      color="#0EA5E9"
                      onPress={() => Alert.alert('Video', 'Starting video call...')}
                    />
                  )}
                  <ActionButton
                    icon="chat"
                    label="Chat with Doctor"
                    color={colors.primary}
                    onPress={() => Alert.alert('Chat', 'Opening chat...')}
                  />
                  <ActionButton
                    icon="file-upload"
                    label="Upload Medical Report"
                    color="#7C3AED"
                    onPress={() => Alert.alert('Upload', 'Opening file picker...')}
                  />
                  <ActionButton
                    icon="calendar-edit"
                    label="Reschedule Appointment"
                    color="#FF8F00"
                    variant="outline"
                    onPress={() => Alert.alert('Reschedule', 'Coming soon')}
                  />
                  <ActionButton
                    icon="close-circle"
                    label="Cancel Appointment"
                    color="#EF4444"
                    variant="outline"
                    loading={actionLoading}
                    onPress={cancelAppointment}
                  />
                </>
              )}
              {isCompleted && (
                <>
                  {appointment.prescription && (
                    <ActionButton
                      icon="download"
                      label="Download Prescription"
                      color="#7C3AED"
                      onPress={() => Alert.alert('Download', 'Downloading...')}
                    />
                  )}
                  <ActionButton
                    icon="receipt"
                    label="View Invoice"
                    color="#0EA5E9"
                    onPress={() => Alert.alert('Invoice', 'Opening invoice...')}
                  />
                  {!appointment.rating && (
                    <ActionButton
                      icon="star"
                      label="Rate Doctor"
                      color="#FF8F00"
                      onPress={() =>
                        navigation.navigate('RateAppointment', { appointmentId })
                      }
                    />
                  )}
                </>
              )}
              {isPending && (
                <ActionButton
                  icon="close-circle"
                  label="Cancel Appointment"
                  color="#EF4444"
                  variant="outline"
                  loading={actionLoading}
                  onPress={cancelAppointment}
                />
              )}
            </>
          ) : (
            <>
              {/* Doctor Actions */}
              {isPending && (
                <>
                  <ActionButton
                    icon="check-circle"
                    label="Accept Appointment"
                    color={colors.success}
                    loading={actionLoading}
                    onPress={() => updateStatus(AppointmentStatus.CONFIRMED)}
                  />
                  <ActionButton
                    icon="calendar-edit"
                    label="Suggest Reschedule"
                    color="#FF8F00"
                    variant="outline"
                    onPress={() => Alert.alert('Reschedule', 'Coming soon')}
                  />
                  <ActionButton
                    icon="close-circle"
                    label="Reject Appointment"
                    color="#EF4444"
                    variant="outline"
                    loading={actionLoading}
                    onPress={() => updateStatus(AppointmentStatus.REJECTED)}
                  />
                </>
              )}
              {isConfirmed && (
                <>
                  <ActionButton
                    icon="play-circle"
                    label="Start Consultation"
                    color={colors.success}
                    loading={actionLoading}
                    onPress={() => updateStatus(AppointmentStatus.IN_PROGRESS)}
                  />
                  {appointment.type === 'VIDEO_CONSULTATION' && (
                    <ActionButton
                      icon="video"
                      label="Start Video Call"
                      color="#0EA5E9"
                      onPress={() => Alert.alert('Video', 'Starting video call...')}
                    />
                  )}
                  <ActionButton
                    icon="history"
                    label="View Medical History"
                    color={colors.primary}
                    variant="outline"
                    onPress={() => Alert.alert('History', 'Opening medical history...')}
                  />
                </>
              )}
              {isInProgress && (
                <>
                  <ActionButton
                    icon="clipboard-text"
                    label="Add Diagnosis & Prescription"
                    color={colors.primary}
                    onPress={() =>
                      navigation.navigate('AddDiagnosis', { appointmentId })
                    }
                  />
                  <ActionButton
                    icon="test-tube"
                    label="Order Lab Tests"
                    color="#0EA5E9"
                    variant="outline"
                    onPress={() => Alert.alert('Lab Tests', 'Coming soon')}
                  />
                  <ActionButton
                    icon="calendar-plus"
                    label="Schedule Follow-up"
                    color="#FF8F00"
                    variant="outline"
                    onPress={() => Alert.alert('Follow-up', 'Coming soon')}
                  />
                </>
              )}
              {isCompleted && (
                <>
                  <ActionButton
                    icon="history"
                    label="View Medical History"
                    color={colors.primary}
                    variant="outline"
                    onPress={() => Alert.alert('History', 'Opening medical history...')}
                  />
                  <ActionButton
                    icon="calendar-plus"
                    label="Schedule Follow-up"
                    color="#FF8F00"
                    variant="outline"
                    onPress={() => Alert.alert('Follow-up', 'Coming soon')}
                  />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: colors.text },
  content: { padding: 20, paddingBottom: 40 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 12,
    marginBottom: 16,
  },
  appointmentId: { fontSize: 11, color: colors.muted, marginTop: 4 },
  feeText: { fontSize: 20, fontWeight: '900', color: colors.text },
  emergencyAlert: {
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  emergencyText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeIcon: { fontSize: 32 },
  typeLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  doctorCard: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorName: { fontSize: 16, fontWeight: '800', color: colors.text },
  hospitalName: { fontSize: 13, color: colors.muted, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipBtnText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  aiScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  aiScoreText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  bodyText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  ratingRow: { flexDirection: 'row', gap: 4 },
  actions: { marginTop: 8 },
});
