import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

interface InfoCardProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  bgColor?: string;
  borderColor?: string;
  children: ReactNode;
  rightElement?: ReactNode;
}

export function InfoCard({
  title,
  icon,
  iconColor,
  bgColor = colors.surface,
  borderColor = colors.line,
  children,
  rightElement,
}: InfoCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrapper, { backgroundColor: iconColor + '20' }]}>
            <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        {rightElement && rightElement}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    padding: 16,
  },
});
