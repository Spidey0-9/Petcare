import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface Clinic {
  id: string;
  name: string;
  address: string;
  distance: string;
  rating: number;
  isOpen: boolean;
  color?: string;
}

interface NearbyClinicCardProps {
  clinics: Clinic[];
  onCall?: (clinicId: string) => void;
  onNavigate?: (clinicId: string) => void;
  onBook?: (clinicId: string) => void;
}

export function NearbyClinicCard({ clinics, onCall, onNavigate, onBook }: NearbyClinicCardProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {clinics.map((clinic, i) => (
        <ClinicCard
          key={clinic.id}
          clinic={clinic}
          index={i}
          onCall={() => onCall?.(clinic.id)}
          onNavigate={() => onNavigate?.(clinic.id)}
          onBook={() => onBook?.(clinic.id)}
        />
      ))}
    </ScrollView>
  );
}

function ClinicCard({
  clinic,
  index,
  onCall,
  onNavigate,
  onBook,
}: {
  clinic: Clinic;
  index: number;
  onCall: () => void;
  onNavigate: () => void;
  onBook: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = 100 + index * 120;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const renderStars = (rating: number) =>
    [1, 2, 3, 4, 5].map(i => (
      <MaterialCommunityIcons
        key={i}
        name={i <= Math.floor(rating) ? 'star' : i <= rating + 0.5 ? 'star-half-full' : 'star-outline'}
        size={12}
        color="#FF8F00"
      />
    ));

  return (
    <Animated.View
      style={[styles.card, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
    >
      {/* Hospital Icon Banner */}
      <View style={styles.banner}>
        <MaterialCommunityIcons name="hospital-building" size={40} color="#fff" />
        {/* Open / Closed badge */}
        <View style={[styles.statusBadge, { backgroundColor: clinic.isOpen ? '#22C55E' : '#EF4444' }]}>
          <Text style={styles.statusText}>{clinic.isOpen ? 'Open' : 'Closed'}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>{clinic.name}</Text>

        {/* Address + Distance */}
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker" size={12} color={colors.muted} />
          <Text style={styles.address} numberOfLines={1}>{clinic.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="walk" size={12} color={colors.muted} />
          <Text style={styles.distance}>{clinic.distance} away</Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingRow}>
          {renderStars(clinic.rating)}
          <Text style={styles.ratingText}>{clinic.rating}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={[styles.actionBtn, { backgroundColor: '#E0F2FE' }]} onPress={onCall}>
            <MaterialCommunityIcons name="phone" size={14} color="#0EA5E9" />
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]} onPress={onNavigate}>
            <MaterialCommunityIcons name="navigation" size={14} color="#22C55E" />
          </Pressable>
          <Pressable style={styles.bookBtn} onPress={onBook}>
            <Text style={styles.bookText}>Book</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 14, paddingBottom: 4, paddingTop: 2 },
  card: {
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  banner: {
    backgroundColor: colors.primary,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  body: { padding: 12, gap: 6 },
  name: { fontSize: 14, fontWeight: '900', color: colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address:  { fontSize: 10, color: colors.muted, flex: 1 },
  distance: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11, fontWeight: '800', color: colors.text, marginLeft: 2 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  bookText: { fontSize: 11, fontWeight: '800', color: '#fff' },
});
