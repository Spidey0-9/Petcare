import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Appointment, APPOINTMENT_TYPE_INFO } from '../types/appointment.types';
import { StatusBadge } from './StatusBadge';
import { colors } from '../../core/theme/colors';

interface AppointmentCardProps {
  appointment: Appointment;
  onPress: () => void;
  showPatientInfo?: boolean; // For doctor view
}

export function AppointmentCard({ appointment, onPress, showPatientInfo = false }: AppointmentCardProps) {
  const typeInfo = APPOINTMENT_TYPE_INFO[appointment.type];
  const isEmergency = appointment.type === 'EMERGENCY';
  const date = new Date(appointment.date);
  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        isEmergency && styles.cardEmergency,
      ]}
      onPress={onPress}
    >
      {isEmergency && (
        <View style={styles.emergencyBanner}>
          <MaterialCommunityIcons name="alert" size={14} color="#EF4444" />
          <Text style={styles.emergencyText}>EMERGENCY CONSULTATION</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Left: Avatar */}
        <View style={[styles.avatar, { backgroundColor: showPatientInfo ? '#E0F2FE' : '#E8F5E9' }]}>
          <MaterialCommunityIcons
            name={showPatientInfo ? 'paw' : 'doctor'}
            size={32}
            color={showPatientInfo ? '#0EA5E9' : '#2E7D32'}
          />
        </View>

        {/* Middle: Details */}
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {showPatientInfo ? appointment.petName : appointment.doctorName}
            </Text>
            <StatusBadge status={appointment.status} />
          </View>

          <Text style={styles.hospital} numberOfLines={1}>
            {showPatientInfo ? `Owner: ${appointment.customerName}` : appointment.hospitalName}
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.typeIcon}>{typeInfo.icon}</Text>
              <Text style={styles.infoText} numberOfLines={1}>
                {typeInfo.label}
              </Text>
            </View>
          </View>

          {appointment.symptoms && (
            <View style={styles.symptomsContainer}>
              <MaterialCommunityIcons name="medical-bag" size={12} color={colors.muted} />
              <Text style={styles.symptoms} numberOfLines={2}>
                {appointment.symptoms}
              </Text>
            </View>
          )}

          {appointment.aiHealthScore && (
            <View style={styles.aiScore}>
              <MaterialCommunityIcons name="robot" size={12} color="#7C3AED" />
              <Text style={styles.aiScoreText}>AI Score: {appointment.aiHealthScore}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom: Date, Time, Fee */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <MaterialCommunityIcons name="calendar" size={16} color={colors.primary} />
          <Text style={styles.footerText}>{formattedDate}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
          <Text style={styles.footerText}>{appointment.timeSlot}</Text>
        </View>
        {appointment.fee && (
          <View style={[styles.footerItem, styles.feeContainer]}>
            <Text style={styles.feeText}>₹{appointment.fee}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardEmergency: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  emergencyBanner: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emergencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  hospital: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeIcon: {
    fontSize: 14,
  },
  infoText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  symptomsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  symptoms: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
  },
  aiScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  aiScoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  feeContainer: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  feeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
});
