import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppScreen } from './AppScreen';
import { colors } from '../theme/colors';

type Props = {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
};

export function ModulePlaceholder({ title, icon, description }: Props) {
  return (
    <AppScreen>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={34} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 12
  },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text
  },
  description: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22
  }
});
