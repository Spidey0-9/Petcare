import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface InfoRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}

export function InfoRow({ icon, iconColor, label, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
