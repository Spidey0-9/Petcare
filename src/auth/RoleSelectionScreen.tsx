import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';
import { authService } from '../services/auth';
import { AuthStackParamList } from '../routes/types';
import type { UserRole } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;

type SelectableRole = Extract<UserRole, 'pet_owner' | 'doctor'>;

const roles: Array<{ value: SelectableRole; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { value: 'pet_owner', label: 'Pet Owner', icon: 'paw' },
  { value: 'doctor', label: 'Veterinarian', icon: 'doctor' },
];

export function RoleSelectionScreen({ navigation }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function selectRole(role: SelectableRole) {
    setIsSubmitting(true);
    try {
      await authService.updateCurrentRole(role);
      navigation.navigate('CompleteProfile', { role });
    } catch (error: any) {
      Alert.alert('Role update failed', error.message ?? 'Unable to save your role.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <Text style={styles.title}>Role Selection</Text>
      <Text style={styles.subtitle}>Choose the correct account experience.</Text>
      <View style={styles.list}>
        {roles.map((role) => (
          <Pressable key={role.value} style={styles.card} onPress={() => selectRole(role.value)} disabled={isSubmitting}>
            <MaterialCommunityIcons name={role.icon} size={28} color={colors.primary} />
            <Text style={styles.role}>{role.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 52,
    color: colors.text,
    fontSize: 28,
    fontWeight: '900'
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted
  },
  list: {
    marginTop: 24,
    gap: 12
  },
  card: {
    minHeight: 72,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  role: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  }
});