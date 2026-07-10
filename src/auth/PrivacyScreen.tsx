import { StyleSheet, Text } from 'react-native';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';

export function PrivacyScreen() {
  return (
    <AppScreen>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.copy}>
        PetCare+ protects account, pet, appointment, and health data. We use your information to deliver care reminders, AI support, services, and account security.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 52,
    fontSize: 28,
    fontWeight: '900',
    color: colors.text
  },
  copy: {
    marginTop: 16,
    color: colors.muted,
    lineHeight: 24
  }
});
