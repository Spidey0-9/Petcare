import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import { AppScreen } from '../core/components/AppScreen';
import { PrimaryButton } from '../core/components/PrimaryButton';
import { colors } from '../core/theme/colors';
import { authService } from '../services/auth';
import { AuthStackParamList } from '../routes/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendResetLink() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert('Email required', 'Enter your account email to receive reset instructions.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.sendPasswordReset(normalizedEmail);
      Alert.alert('Reset link sent', 'Check your email for password reset instructions.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Reset failed', error.message ?? 'Unable to send reset instructions.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your email address to receive reset instructions.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />
      <PrimaryButton label={isSubmitting ? 'Sending...' : 'Send Reset Link'} onPress={sendResetLink} disabled={isSubmitting} />
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
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    color: colors.muted
  },
  input: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    marginBottom: 18
  }
});