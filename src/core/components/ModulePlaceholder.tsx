import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppScreen } from './AppScreen';
import { colors, gradients, radii, shadows } from '../theme/colors';

type Props = {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
};

export function ModulePlaceholder({ title, icon, description }: Props) {
  return (
    <AppScreen>
      <View style={styles.card}>
        <LinearGradient colors={gradients.premium} style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={34} color="#fff" />
        </LinearGradient>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 28,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    gap: 12,
    ...shadows.soft,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.premium,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
  },
});
