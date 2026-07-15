import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '../core/components/AppScreen';
import { colors, radii, shadows } from '../core/theme/colors';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const SUPPORT_ITEMS: Array<{ title: string; subtitle: string; icon: IconName; color: string }> = [
  { title: 'Booking Help', subtitle: 'Resolve booking requests, reschedules and cancellations.', icon: 'calendar-question', color: '#EC4899' },
  { title: 'Payment Support', subtitle: 'Get help with payouts, invoices and payment status.', icon: 'credit-card-outline', color: colors.primary },
  { title: 'Customer Safety', subtitle: 'Guidelines for safe pickup, dropoff and grooming.', icon: 'shield-check-outline', color: '#0EA5E9' },
  { title: 'Service Setup', subtitle: 'Learn how services, packages and gallery content appear.', icon: 'content-cut', color: '#8B5CF6' },
  { title: 'Contact Support', subtitle: 'Reach the PetCare+ operations team.', icon: 'lifebuoy', color: '#F59E0B' },
];

export function GroomerSupportScreen() {
  return (
    <AppScreen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><MaterialCommunityIcons name="lifebuoy" size={30} color={colors.primaryDark} /></View>
          <Text style={styles.title}>Help & Support</Text>
          <Text style={styles.subtitle}>Fast operational support for grooming bookings, payments, services and account security.</Text>
        </View>

        <View style={styles.grid}>
          {SUPPORT_ITEMS.map(item => (
            <Pressable key={item.title} style={styles.card} onPress={() => Alert.alert(item.title, item.subtitle)}>
              <View style={[styles.icon, { backgroundColor: `${item.color}18` }]}><MaterialCommunityIcons name={item.icon} size={24} color={item.color} /></View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.faqCard}>
          <Text style={styles.sectionTitle}>Frequently Asked</Text>
          <Faq question="Why can I not accept a booking?" answer="Only bookings assigned to your groomer profile can be updated." />
          <Faq question="Where do services come from?" answer="Services are loaded from live grooming service records connected to your clinic." />
          <Faq question="How do customers see my profile?" answer="Approved groomer and clinic records appear in Pet Owner grooming discovery." />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return <View style={styles.faq}><Text style={styles.faqQ}>{question}</Text><Text style={styles.faqA}>{answer}</Text></View>;
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 34 },
  hero: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 18, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 25, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 13, fontWeight: '700', color: colors.muted, lineHeight: 20, marginTop: 6 },
  grid: { gap: 10, marginTop: 18 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: colors.line, ...shadows.soft },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  cardSubtitle: { fontSize: 12, fontWeight: '700', color: colors.muted, lineHeight: 18, marginTop: 4 },
  faqCard: { backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 15, borderWidth: 1, borderColor: colors.line, gap: 12, marginTop: 18, ...shadows.soft },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text },
  faq: { gap: 3 },
  faqQ: { fontSize: 13, fontWeight: '900', color: colors.text },
  faqA: { fontSize: 12, fontWeight: '700', color: colors.muted, lineHeight: 18 },
});
