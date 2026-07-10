import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../core/theme/colors';

interface SectionHeaderProps {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
}

export function SectionHeader({ title, rightLabel, onRightPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {rightLabel && (
        <Text style={styles.right} onPress={onRightPress}>
          {rightLabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.3,
  },
  right: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
