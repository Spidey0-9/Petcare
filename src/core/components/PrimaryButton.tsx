import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows } from '../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: ReactNode;
  disabled?: boolean;
};

export function PrimaryButton({ label, onPress, variant = 'primary', icon, disabled = false }: Props) {
  const isGhost = variant === 'ghost';

  if (isGhost) {
    return (
      <Pressable onPress={onPress} disabled={disabled} style={[styles.button, styles.ghost, disabled && styles.disabled]}>
        {icon}
        <Text style={[styles.label, styles.ghostLabel]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}>
      <LinearGradient colors={gradients.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.premium,
  },
  gradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
  },
  ghost: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOpacity: 0,
  },
  disabled: {
    opacity: 0.58,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  ghostLabel: {
    color: colors.primaryDark,
  },
});
