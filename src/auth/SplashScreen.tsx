import { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen } from '../core/components/AppScreen';
import { app } from '../core/constants/app';
import { colors } from '../core/theme/colors';
import { authService } from '../services/auth';
import { biometricService } from '../services/biometric';
import { onboardingService } from '../core/services/onboardingService';
import { permissionsService } from '../services/permissions';
import { getSupabaseProjectInfo, runDatabaseHealthCheck } from '../services/database/databaseDiagnostics';
import type { AuthStackParamList } from '../routes/types';
import type { UserRole } from '../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const SPLASH_DELAY_MS = 2200;

// â”€â”€ Role â†’ destination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function destForRole(role: UserRole): keyof AuthStackParamList {
  if (role === 'doctor')      return 'DoctorDashboard';
  if (role === 'groomer')     return 'GroomerDashboard';
  if (role === 'super_admin') return 'SuperAdminDashboard';
  if (role === 'admin')       return 'SuperAdminDashboard';
  if (role === 'pet_owner')   return 'MainTabs';
  throw new Error('Unsupported account role.');
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await new Promise(resolve => setTimeout(resolve, SPLASH_DELAY_MS));
      if (cancelled) return;

      try {
        // â”€â”€ 1. Onboarding gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const onboardingDone = await onboardingService.isCompleted();
        if (!onboardingDone) {
          navigation.replace('Onboarding');
          return;
        }

        // â”€â”€ 2. Permissions gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const permissionsDone = await permissionsService.isCompleted();
        if (!permissionsDone) {
          navigation.replace('Permissions');
          return;
        }

        // â”€â”€ 3. Database health check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const databaseHealth = await runDatabaseHealthCheck();
        if (!databaseHealth.ok) {
          const project = getSupabaseProjectInfo();
          console.error('[SplashScreen] Database health check failed:', databaseHealth);
          const targetProject = project.projectRef || 'the configured project';
          Alert.alert(
            'Database setup issue',
            'Required Supabase tables are missing in ' + targetProject + ': ' + databaseHealth.missingTables.join(', ') + '. Apply the latest migrations and reload the schema cache.',
          );
          navigation.replace('Login');
          return;
        }

        // â”€â”€ 4. Session check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const session = await authService.getSession();
        if (!session) {
          navigation.replace('Login');
          return;
        }

        // â”€â”€ 5. Load profile and route by role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const profile = await authService.getCurrentProfile();

        if (!profile?.role) {
          // Profile missing or role not set â€“ fall back to Login so the
          // user can re-authenticate and trigger profile creation.
          console.warn('[SplashScreen] No profile role found; redirecting to Login.');
          navigation.replace('Login');
          return;
        }

        if (await biometricService.hasSavedLogin(profile.role)) {
          const biometricResult = await biometricService.authenticate(profile.role);
          if (biometricResult.status !== 'success') {
            Alert.alert(
              'Biometric authentication required',
              'Please unlock with biometrics or sign in again.',
            );
            navigation.replace('Login');
            return;
          }
        }

        navigation.replace(destForRole(profile.role));
      } catch (err) {
        console.warn('[SplashScreen] Boot error; falling back to Login:', err);
        navigation.replace('Login');
      }
    }

    boot();
    return () => { cancelled = true; };
  }, [navigation]);

  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.logo}>
        <MaterialCommunityIcons name="home-heart" size={72} color={colors.primary} />
      </View>
      <Text style={styles.title}>{app.name}</Text>
      <Text style={styles.tagline}>{app.tagline}</Text>
      <Image source={app.petImage} style={styles.petImage} resizeMode="contain" />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 14,
  },
  logo: {
    alignSelf: 'center',
    marginTop: 30,
  },
  title: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 44,
    fontWeight: '900',
  },
  tagline: {
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '600',
  },
  petImage: {
    width: '100%',
    height: 250,
    marginVertical: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
});


