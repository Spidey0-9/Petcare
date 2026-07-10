import { StyleSheet, Text, View } from 'react-native';
import { AppointmentStatus, APPOINTMENT_STATUS_INFO } from '../types/appointment.types';

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const info = APPOINTMENT_STATUS_INFO[status];
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: info.bgColor },
        isSmall ? styles.badgeSmall : styles.badgeMedium,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: info.color },
          isSmall ? styles.textSmall : styles.textMedium,
        ]}
      >
        {info.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
});
