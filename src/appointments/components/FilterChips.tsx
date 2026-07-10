import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../core/theme/colors';

interface FilterChipsProps {
  filters: string[];
  selected: string;
  onSelect: (filter: string) => void;
}

export function FilterChips({ filters, selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map(filter => {
        const isActive = selected === filter;
        return (
          <Pressable
            key={filter}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(filter)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {filter}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
