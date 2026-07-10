import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatCardProps {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

export function StatCard({ label, count, color, bgColor, icon }: StatCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor: color + '40' }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={[styles.count, { color }]}>{count}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  count: {
    fontSize: 22,
    fontWeight: '900',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
