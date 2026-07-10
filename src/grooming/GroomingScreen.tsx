import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';

const SERVICES = [
  { id: '1', name: 'Full Grooming',    icon: 'content-cut',  color: '#EC4899', bg: '#FDF2F8', price: 799,  duration: '90 min', desc: 'Bath, brush, cut, nail trim, ear cleaning' },
  { id: '2', name: 'Bath & Brush',     icon: 'shower',       color: '#0EA5E9', bg: '#E0F2FE', price: 399,  duration: '60 min', desc: 'Shampoo, conditioning, blow dry, brushing' },
  { id: '3', name: 'Nail Trimming',    icon: 'scissors-cutting', color: '#6C63FF', bg: '#F0EEFF', price: 149, duration: '20 min', desc: 'Nail clip and file for all four paws' },
  { id: '4', name: 'Ear Cleaning',     icon: 'ear-hearing',  color: '#FF8F00', bg: '#FFF3E0', price: 99,   duration: '15 min', desc: 'Gentle ear canal cleaning and inspection' },
  { id: '5', name: 'Teeth Brushing',   icon: 'tooth',        color: '#22C55E', bg: '#DCFCE7', price: 149,  duration: '20 min', desc: 'Pet-safe toothpaste teeth brushing' },
  { id: '6', name: 'Flea Treatment',   icon: 'bug',          color: '#EF4444', bg: '#FEE2E2', price: 299,  duration: '45 min', desc: 'Anti-flea shampoo and topical treatment' },
];

const HISTORY = [
  { id: '1', pet: 'Buddy', service: 'Full Grooming', date: '15 Apr 2025', groomer: 'Riya S.', rating: 5, cost: 799 },
  { id: '2', pet: 'Luna',  service: 'Bath & Brush',  date: '02 Apr 2025', groomer: 'Amit K.',  rating: 4, cost: 399 },
  { id: '3', pet: 'Max',   service: 'Nail Trimming', date: '28 Mar 2025', groomer: 'Riya S.', rating: 5, cost: 149 },
];

export function GroomingScreen() {
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab]   = useState<'services' | 'history'>('services');
  const [selectedPet, setSelectedPet] = useState('Buddy');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const nextService = { date: '20 May 2025', time: '11:00 AM', service: 'Full Grooming', pet: 'Buddy' };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Grooming</Text>
          <Text style={styles.subtitle}>Professional pet care</Text>
        </View>
        <Pressable style={styles.bookBtn} onPress={() => Alert.alert('Book', 'Opening grooming booking...')}>
          <MaterialCommunityIcons name="calendar-plus" size={16} color="#fff" />
          <Text style={styles.bookBtnText}>Book Now</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Next appointment banner */}
        <View style={styles.nextBanner}>
          <View style={styles.nextLeft}>
            <MaterialCommunityIcons name="content-cut" size={28} color={colors.primary} />
            <View>
              <Text style={styles.nextTitle}>Next Grooming Session</Text>
              <Text style={styles.nextSub}>{nextService.service} — {nextService.pet}</Text>
              <Text style={styles.nextDate}>📅 {nextService.date} at {nextService.time}</Text>
            </View>
          </View>
          <Pressable style={styles.rescheduleBtn} onPress={() => Alert.alert('Reschedule', 'Opening reschedule...')}>
            <Text style={styles.rescheduleBtnText}>Reschedule</Text>
          </Pressable>
        </View>

        {/* Pet selector */}
        <View style={styles.petRow}>
          {['Buddy', 'Max', 'Luna'].map(pet => (
            <Pressable
              key={pet}
              style={[styles.petChip, selectedPet === pet && styles.petChipActive]}
              onPress={() => setSelectedPet(pet)}
            >
              <Text style={[styles.petChipText, selectedPet === pet && { color: '#fff' }]}>{pet}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['services', 'history'] as const).map(t => (
            <Pressable key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'services' ? (
          <View style={styles.servicesGrid}>
            {SERVICES.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} />
            ))}
          </View>
        ) : (
          <View style={styles.historyList}>
            {HISTORY.map((h, i) => (
              <View key={h.id} style={styles.histCard}>
                <View style={styles.histLeft}>
                  <MaterialCommunityIcons name="content-cut" size={22} color={colors.primary} />
                </View>
                <View style={styles.histInfo}>
                  <Text style={styles.histService}>{h.service}</Text>
                  <Text style={styles.histMeta}>🐾 {h.pet} • {h.groomer}</Text>
                  <Text style={styles.histDate}>📅 {h.date}</Text>
                </View>
                <View style={styles.histRight}>
                  <Text style={styles.histCost}>₹{h.cost}</Text>
                  <View style={styles.histStars}>
                    {[...Array(5)].map((_, j) => (
                      <MaterialCommunityIcons
                        key={j}
                        name={j < h.rating ? 'star' : 'star-outline'}
                        size={12}
                        color="#FF8F00"
                      />
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tips section */}
        <Text style={styles.tipsTitle}>Grooming Tips</Text>
        {[
          { icon: 'content-cut', color: '#EC4899', tip: 'Brush your dog daily to prevent matting and reduce shedding.' },
          { icon: 'shower',      color: '#0EA5E9', tip: 'Bathe dogs every 4–6 weeks. Too frequent bathing strips natural oils.' },
          { icon: 'tooth',       color: '#22C55E', tip: 'Brush teeth 2–3 times per week to prevent dental disease.' },
        ].map((t, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={[styles.tipIcon, { backgroundColor: t.color + '20' }]}>
              <MaterialCommunityIcons name={t.icon as any} size={16} color={t.color} />
            </View>
            <Text style={styles.tipText}>{t.tip}</Text>
          </View>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

function ServiceCard({ service, index }: { service: typeof SERVICES[0]; index: number }) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 8, delay: index * 50, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.serviceCard, { opacity: scaleAnim, transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.serviceCardInner}
        onPress={() => Alert.alert(service.name, `Book ${service.name} for ₹${service.price}\n${service.desc}`)}
      >
        <View style={[styles.serviceIcon, { backgroundColor: service.bg }]}>
          <MaterialCommunityIcons name={service.icon as any} size={26} color={service.color} />
        </View>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDesc} numberOfLines={2}>{service.desc}</Text>
        <View style={styles.serviceMeta}>
          <Text style={styles.serviceDuration}>⏱ {service.duration}</Text>
          <Text style={[styles.servicePrice, { color: service.color }]}>₹{service.price}</Text>
        </View>
        <Pressable style={[styles.serviceBookBtn, { backgroundColor: service.color }]} onPress={() => Alert.alert('Booked!', `${service.name} booked for ${service.duration}`)}>
          <Text style={styles.serviceBookText}>Book</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:       { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle:    { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  bookBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EC4899', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  bookBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  body:        { padding: 20 },
  nextBanner:  { backgroundColor: colors.primary + '10', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderWidth: 1, borderColor: colors.primary + '30' },
  nextLeft:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  nextTitle:   { fontSize: 13, fontWeight: '900', color: colors.text },
  nextSub:     { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 2 },
  nextDate:    { fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: 4 },
  rescheduleBtn: { backgroundColor: colors.primary + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  rescheduleBtnText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  petRow:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
  petChip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary + '40' },
  petChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  petChipText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  tabs:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab:         { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  tabActive:   { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  tabText:     { fontSize: 13, fontWeight: '700', color: colors.muted },
  tabTextActive: { color: '#fff' },
  servicesGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: { width: '47%' },
  serviceCardInner: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  serviceIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  serviceName: { fontSize: 13, fontWeight: '900', color: colors.text },
  serviceDesc: { fontSize: 10, color: colors.muted, fontWeight: '500', lineHeight: 15 },
  serviceMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceDuration: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  servicePrice:    { fontSize: 14, fontWeight: '900' },
  serviceBookBtn:  { borderRadius: 10, paddingVertical: 7, alignItems: 'center' },
  serviceBookText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  historyList: { gap: 10 },
  histCard:    { backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  histLeft:    { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  histInfo:    { flex: 1, gap: 3 },
  histService: { fontSize: 14, fontWeight: '800', color: colors.text },
  histMeta:    { fontSize: 11, color: colors.muted, fontWeight: '600' },
  histDate:    { fontSize: 11, color: colors.muted },
  histRight:   { alignItems: 'flex-end', gap: 4 },
  histCost:    { fontSize: 14, fontWeight: '900', color: colors.text },
  histStars:   { flexDirection: 'row', gap: 1 },
  tipsTitle:   { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 20, marginBottom: 12 },
  tipRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  tipIcon:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipText:     { flex: 1, fontSize: 12, color: colors.text, lineHeight: 19, fontWeight: '500' },
});
