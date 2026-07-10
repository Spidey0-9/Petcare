import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title?: string;
  message?: string;
}

export function EmptyState({
  icon = 'calendar-blank',
  title = 'No appointments found',
  message = 'Book your first appointment now',
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={72} color={colors.muted + '60'} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.muted,
  },
  message: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
