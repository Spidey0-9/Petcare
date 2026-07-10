import { StyleSheet, Text } from 'react-native';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';

export function TermsScreen() {
  return (
    <AppScreen>
      <Text style={styles.title}>Terms & Conditions</Text>
      <Text style={styles.copy}>
        Use PetCare+ responsibly. AI guidance is supportive information and does not replace licensed veterinary diagnosis, treatment, or emergency care.
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
