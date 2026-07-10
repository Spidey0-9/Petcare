import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';
import { AppPermissionResult, permissionsService } from '../services/permissions';
import type { AuthStackParamList } from '../routes/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Permissions'>;

const PERMISSION_ITEMS = [
  { id: 'camera', icon: 'camera', title: 'Camera', body: 'Capture pet photos, reports, and consultation images.' },
  { id: 'microphone', icon: 'microphone', title: 'Microphone', body: 'Enable video consultations and voice support.' },
  { id: 'gallery', icon: 'image-multiple', title: 'Gallery', body: 'Upload pet images, prescriptions, and medical reports.' },
  { id: 'notifications', icon: 'bell-ring', title: 'Notifications', body: 'Receive reminders, appointments, orders, and emergency alerts.' },
  { id: 'storage', icon: 'folder-image', title: 'Storage', body: 'Save and manage media used by pet profiles and reports.' },
] as const;

export function PermissionsScreen({ navigation }: Props) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [results, setResults] = useState<AppPermissionResult[]>([]);

  const continueToLogin = () => navigation.replace('Login');

  const requestPermissions = async () => {
    setIsRequesting(true);
    try {
      const nextResults = await permissionsService.requestAll();
      setResults(nextResults);

      const denied = nextResults.filter(item => !item.granted);
      if (denied.length > 0) {
        Alert.alert(
          'Permissions saved',
          `${denied.map(item => item.label).join(', ')} can be enabled later from device settings.`
        );
      }

      continueToLogin();
    } catch (error: any) {
      Alert.alert('Permissions', error.message ?? 'Unable to request permissions right now.');
    } finally {
      setIsRequesting(false);
    }
  };

  const skipForNow = async () => {
    await permissionsService.markCompleted();
    continueToLogin();
  };

  const resultFor = (id: string) => results.find(item => item.id === id);

  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.headerIcon}>
        <MaterialCommunityIcons name="shield-check" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>Allow app permissions</Text>
      <Text style={styles.subtitle}>PetCare+ uses these permissions only for pet care features you choose to use.</Text>

      <View style={styles.list}>
        {PERMISSION_ITEMS.map(item => {
          const result = resultFor(item.id);
          return (
            <View key={item.id} style={styles.permissionRow}>
              <View style={styles.permissionIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>{item.title}</Text>
                <Text style={styles.permissionBody}>{item.body}</Text>
              </View>
              {result && (
                <MaterialCommunityIcons
                  name={result.granted ? 'check-circle' : 'alert-circle'}
                  size={20}
                  color={result.granted ? colors.success : colors.danger}
                />
              )}
            </View>
          );
        })}
      </View>

      <Pressable style={[styles.primaryButton, isRequesting && styles.disabled]} onPress={requestPermissions} disabled={isRequesting}>
        <Text style={styles.primaryText}>{isRequesting ? 'Requesting...' : 'Accept & Continue'}</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={skipForNow} disabled={isRequesting}>
        <Text style={styles.secondaryText}>Not now</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'center', gap: 16 },
  headerIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary + '14', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: 'center', paddingHorizontal: 10 },
  list: { gap: 10, marginTop: 8 },
  permissionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12 },
  permissionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
  permissionText: { flex: 1 },
  permissionTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  permissionBody: { marginTop: 2, fontSize: 12, color: colors.muted, lineHeight: 17 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', paddingVertical: 10 },
  secondaryText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
});
