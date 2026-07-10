import React, { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface PetCarouselItem {
  id: string;
  name: string;
  breed?: string | null;
  species?: string | null;
  healthScore: number;
  image_url?: string | null;
}

interface PetCarouselProps {
  pets: PetCarouselItem[];
  onPetPress?: (petId: string) => void;
  onAddPet?: () => void;
  selectedId?: string;
}

function petMeta(pet: PetCarouselItem, index: number) {
  const palette = [
    { color: '#FF8F00', bgColor: '#FFF3E0' },
    { color: '#6C63FF', bgColor: '#F0EEFF' },
    { color: '#EC4899', bgColor: '#FDF2F8' },
    { color: '#0EA5E9', bgColor: '#E0F2FE' },
  ];
  const species = (pet.species ?? '').toLowerCase();
  const icon = species.includes('cat') ? 'cat' : species.includes('bird') ? 'bird' : 'dog';
  return { ...palette[index % palette.length], icon: icon as keyof typeof MaterialCommunityIcons.glyphMap };
}

export function PetCarousel({ pets, onPetPress, onAddPet, selectedId }: PetCarouselProps) {
  const [active, setActive] = useState(selectedId ?? pets[0]?.id ?? '');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {pets.map((pet, i) => (
        <PetChip
          key={pet.id}
          pet={pet}
          meta={petMeta(pet, i)}
          isActive={active === pet.id}
          onPress={() => { setActive(pet.id); onPetPress?.(pet.id); }}
        />
      ))}

      <Pressable
        style={styles.addBtn}
        onPress={onAddPet}
      >
        <MaterialCommunityIcons name="plus" size={22} color={colors.primary} />
        <Text style={styles.addLabel}>Add Pet</Text>
      </Pressable>
    </ScrollView>
  );
}

function PetChip({ pet, meta, isActive, onPress }: { pet: PetCarouselItem; meta: ReturnType<typeof petMeta>; isActive: boolean; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9,  useNativeDriver: true, friction: 8 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, friction: 6 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.chip,
          { borderColor: isActive ? meta.color : colors.line, borderWidth: isActive ? 2 : 1 },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.chipAvatar, { backgroundColor: meta.bgColor }]}> 
          {pet.image_url ? <Image source={{ uri: pet.image_url }} style={styles.petImage} /> : <MaterialCommunityIcons name={meta.icon} size={28} color={meta.color} />}
          {isActive && <View style={[styles.activeDot, { backgroundColor: meta.color }]} />}
        </View>

        <Text style={[styles.chipName, isActive && { color: meta.color }]}>{pet.name}</Text>
        <Text style={styles.chipBreed} numberOfLines={1}>{pet.breed || pet.species || 'Pet profile'}</Text>

        <View style={[styles.scoreBadge, { backgroundColor: meta.bgColor }]}> 
          <Text style={[styles.scoreBadgeText, { color: meta.color }]}>Health {pet.healthScore}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 0, gap: 12, paddingBottom: 4, paddingTop: 2 },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    width: 110,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  chipAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  petImage: { width: '100%', height: '100%', borderRadius: 29 },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  chipName: { fontSize: 13, fontWeight: '800', color: colors.text },
  chipBreed: { fontSize: 10, color: colors.muted, textAlign: 'center' },
  scoreBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scoreBadgeText: { fontSize: 10, fontWeight: '900' },
  addBtn: {
    width: 94,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary + '60',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '08',
  },
  addLabel: { fontSize: 11, fontWeight: '800', color: colors.primary },
});


