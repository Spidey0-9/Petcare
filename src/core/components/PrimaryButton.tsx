import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: ReactNode;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, variant = 'primary', icon, disabled = false }: Props) {
  const isGhost = variant === 'ghost';

  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, isGhost && styles.ghost, disabled && styles.disabled]}>
      {icon}
      <Text style={[styles.label, isGhost && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3
  },
  ghost: {
    backgroundColor: '#F0EEFF',
    shadowOpacity: 0
  },
  disabled: {
    opacity: 0.58
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  ghostLabel: {
    color: colors.primary
  }
});
