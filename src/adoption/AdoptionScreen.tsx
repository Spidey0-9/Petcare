import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';

const PETS = [
  { id: '1', name: 'Charlie',  type: 'Dog', breed: 'Labrador Mix',     age: '2 years',  gender: 'Male',   status: 'Available',  desc: 'Friendly and loves to play fetch. Good with kids.', icon: 'dog',  color: '#FF8F00', bg: '#FFF3E0', vaccinated: true, neutered: true  },
  { id: '2', name: 'Whiskers', type: 'Cat', breed: 'Tabby',            age: '1 year',   gender: 'Female', status: 'Available',  desc: 'Gentle, indoor cat. Loves cuddles and sunny spots.',icon: 'cat',  color: '#8B5CF6', bg: '#F3E8FF', vaccinated: true, neutered: false },
  { id: '3', name: 'Rocky',    type: 'Dog', breed: 'German Shepherd',  age: '3 years',  gender: 'Male',   status: 'Pending',    desc: 'Intelligent and loyal. Needs experienced owner.',   icon: 'dog',  color: '#0EA5E9', bg: '#E0F2FE', vaccinated: true, neutered: true  },
  { id: '4', name: 'Bella',    type: 'Dog', breed: 'Beagle',           age: '6 months', gender: 'Female', status: 'Available',  desc: 'Puppy full of energy. Needs lots of attention.',    icon: 'dog',  color: '#EC4899', bg: '#FDF2F8', vaccinated: false, neutered: false },
];

export function AdoptionScreen() {
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = filter === 'All' ? PETS : PETS.filter(p => p.type === filter);

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pet Adoption</Text>
          <Text style={styles.subtitle}>{PETS.length} pets looking for a home</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => Alert.alert('List a Pet', 'Opening pet listing form...')}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {['All', 'Dog', 'Cat'].map(f => (
          <Pressable key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((pet, i) => (
          <AdoptionCard key={pet.id} pet={pet} index={i} />
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

function AdoptionCard({ pet, index }: { pet: typeof PETS[0]; index: number }) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay: index * 80, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.cardImg, { backgroundColor: pet.bg }]}>
        <MaterialCommunityIcons name={pet.icon as any} size={60} color={pet.color} />
        <View style={[styles.statusBadge, { backgroundColor: pet.status === 'Available' ? colors.success : '#FF8F00' }]}>
          <Text style={styles.statusText}>{pet.status}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petAge}>{pet.age}</Text>
        </View>
        <Text style={styles.petBreed}>{pet.breed} • {pet.gender}</Text>
        <Text style={styles.petDesc} numberOfLines={2}>{pet.desc}</Text>
        <View style={styles.badgeRow}>
          {pet.vaccinated && <View style={styles.badge}><MaterialCommunityIcons name="needle" size={10} color={colors.success} /><Text style={styles.badgeText}>Vaccinated</Text></View>}
          {pet.neutered   && <View style={styles.badge}><MaterialCommunityIcons name="check-circle" size={10} color="#0EA5E9" /><Text style={[styles.badgeText, { color: '#0EA5E9' }]}>Neutered</Text></View>}
        </View>
        <View style={styles.cardActions}>
          <Pressable style={styles.adoptBtn} onPress={() => Alert.alert('Adopt!', `Starting adoption process for ${pet.name}`)}>
            <MaterialCommunityIcons name="heart" size={14} color="#fff" />
            <Text style={styles.adoptBtnText}>Adopt Now</Text>
          </Pressable>
          <Pressable style={styles.learnBtn} onPress={() => Alert.alert(pet.name, pet.desc)}>
            <Text style={styles.learnBtnText}>Learn More</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:       { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle:    { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  addBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  filterRow:   { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  chip:        { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  chipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:    { fontSize: 12, fontWeight: '700', color: colors.muted },
  chipTextActive: { color: '#fff' },
  list:        { paddingHorizontal: 20, gap: 14 },
  card:        { backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardImg:     { height: 160, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  statusBadge: { position: 'absolute', top: 12, right: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:  { fontSize: 9, fontWeight: '900', color: '#fff' },
  cardBody:    { padding: 16, gap: 8 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  petName:     { fontSize: 20, fontWeight: '900', color: colors.text },
  petAge:      { fontSize: 12, color: colors.muted, fontWeight: '600' },
  petBreed:    { fontSize: 13, color: colors.muted, fontWeight: '600' },
  petDesc:     { fontSize: 13, color: colors.text, lineHeight: 19, fontWeight: '500' },
  badgeRow:    { flexDirection: 'row', gap: 8 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText:   { fontSize: 10, fontWeight: '700', color: colors.success },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  adoptBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 12 },
  adoptBtnText:{ fontSize: 13, fontWeight: '800', color: '#fff' },
  learnBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, borderWidth: 1.5, borderColor: colors.line },
  learnBtnText:{ fontSize: 13, fontWeight: '700', color: colors.text },
});
