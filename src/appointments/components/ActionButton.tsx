import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ActionButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  variant?: 'filled' | 'outline';
  loading?: boolean;
  onPress: () => void;
}

export function ActionButton({
  icon,
  label,
  color,
  variant = 'filled',
  loading = false,
  onPress,
}: ActionButtonProps) {
  const isFilled = variant === 'filled';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isFilled ? color : 'transparent',
          borderColor: color,
          borderWidth: isFilled ? 0 : 1.5,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFilled ? '#fff' : color} />
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={isFilled ? '#FFFFFF' : color}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: isFilled ? '#FFFFFF' : color },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
  },
});
