import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export function AiHealthScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleNavigate = (screen: string) => {
    navigation.navigate(screen);
  };

  return (
    <AppScreen>
      <View style={styles.hero}>
        <MaterialCommunityIcons name="robot" size={42} color="#FFFFFF" />
        <Text style={styles.heroTitle}>AI pet health assistant</Text>
        <Text style={styles.heroText}>Check symptoms, generate care reports, and ask pet health questions.</Text>
      </View>
      <View style={styles.list}>
        {tools.map(({ title, icon, subtitle, screen }) => (
          <Pressable
            style={styles.tool}
            key={title}
            onPress={() => handleNavigate(screen)}
          >
            <View style={styles.icon}>
              <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: colors.primary
  },
  heroTitle: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900'
  },
  heroText: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 22
  },
  list: {
    marginTop: 20,
    gap: 12
  },
  tool: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  copy: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontWeight: '900'
  },
  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12
  }
});

const tools: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  subtitle: string;
  screen: string;
}[] = [
  { title: 'Symptom Checker', icon: 'stethoscope', subtitle: 'Describe symptoms and get a risk overview.', screen: 'SymptomChecker' },
  { title: 'AI Assistant', icon: 'chat-processing', subtitle: 'Ask about vaccines, nutrition, medicine, and care.', screen: 'AiAssistant' },
  { title: 'Food Safety', icon: 'food-apple', subtitle: 'Check whether food is safe for your pet.', screen: 'FoodSafety' },
  { title: 'Health Report', icon: 'file-chart', subtitle: 'Generate a simple care summary.', screen: 'HealthReport' }
];
