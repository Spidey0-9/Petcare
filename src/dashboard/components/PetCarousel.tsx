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
  gender?: string | null;
  age?: number | null;
  date_of_birth?: string | null;
  vaccination_status?: string | null;
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
    { color: colors.accent, bgColor: colors.accentSoft },
    { color: colors.primary, bgColor: colors.primarySoft },
    { color: '#EC4899', bgColor: '#FDF2F8' },
    { color: colors.secondary, bgColor: colors.secondarySoft },
  ];
  const species = (pet.species ?? '').toLowerCase();
  const icon = species.includes('cat') ? 'cat' : species.includes('bird') ? 'bird' : 'dog';
  return { ...palette[index % palette.length], icon: icon as keyof typeof MaterialCommunityIcons.glyphMap };
}

function petAgeLabel(pet: PetCarouselItem) {
  if (typeof pet.age === 'number') return `${pet.age}y`;
  if (!pet.date_of_birth) return 'Age -';
  const dob = new Date(pet.date_of_birth);
  if (Number.isNaN(dob.getTime())) return 'Age -';
  const now = new Date();
  const months = Math.max(0, (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth());
  if (months < 12) return `${Math.max(1, months)}m`;
  return `${Math.floor(months / 12)}y`;
}

function petGenderLabel(value?: string | null) {
  if (!value) return 'Gender -';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function petHealthStatus(score: number) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Healthy';
  if (score >= 50) return 'Watch';
  return 'Care';
}

function vaccinationLabel(value?: string | null) {
  if (!value) return 'Vaccines pending';
  return value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
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
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, friction: 8 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View
        style={[
          styles.chip,
          { borderColor: isActive ? meta.color : 'rgba(15,23,42,0.08)', borderWidth: isActive ? 2 : 1 },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.chipAvatar, { backgroundColor: meta.bgColor }]}> 
          {pet.image_url ? <Image source={{ uri: pet.image_url }} style={styles.petImage} /> : <MaterialCommunityIcons name={meta.icon} size={32} color={meta.color} />}
          {isActive && <View style={[styles.activeDot, { backgroundColor: meta.color }]} />}
        </View>

        <Text style={[styles.chipName, isActive && { color: meta.color }]} numberOfLines={1}>{pet.name}</Text>
        <Text style={styles.chipBreed} numberOfLines={1}>{pet.breed || pet.species || 'Pet profile'}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{petAgeLabel(pet)}</Text>
          <Text style={styles.metaText}>{petGenderLabel(pet.gender)}</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.scoreBadge, { backgroundColor: meta.bgColor }]}> 
            <Text style={[styles.scoreBadgeText, { color: meta.color }]}>{pet.healthScore}</Text>
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusText}>{petHealthStatus(pet.healthScore)}</Text>
            <Text style={styles.vaccineText} numberOfLines={1}>{vaccinationLabel(pet.vaccination_status)}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 0, gap: 14, paddingBottom: 6, paddingTop: 4 },
  chip: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: 24,
    padding: 14,
    width: 176,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 22,
    elevation: 5,
  },
  chipAvatar: {
    width: '100%',
    height: 98,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  petImage: { width: '100%', height: '100%', borderRadius: 20 },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  chipName: { fontSize: 16, fontWeight: '900', color: colors.text },
  chipBreed: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, fontSize: 10, fontWeight: '900', color: colors.muted, backgroundColor: 'rgba(15,23,42,0.04)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgeText: { fontSize: 14, fontWeight: '900' },
  statusCopy: { flex: 1, minWidth: 0 },
  statusText: { fontSize: 12, fontWeight: '900', color: colors.primaryDark },
  vaccineText: { fontSize: 10, fontWeight: '800', color: colors.muted, marginTop: 1 },
  addBtn: {
    width: 124,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary + '70',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '10',
  },
  addLabel: { fontSize: 12, fontWeight: '900', color: colors.primary },
});