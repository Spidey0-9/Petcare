import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';

const INVOICES = [
  { id: 'INV001', date: '15 May 2025', service: 'General Checkup — Buddy',       amount: 800,  status: 'paid',    method: 'UPI'  },
  { id: 'INV002', date: '10 May 2025', service: 'Vaccination Pack × 2',           amount: 1400, status: 'paid',    method: 'Card' },
  { id: 'INV003', date: '28 Apr 2025', service: 'Pet Food (Royal Canin 3kg)',     amount: 899,  status: 'paid',    method: 'UPI'  },
  { id: 'INV004', date: '22 Apr 2025', service: 'Grooming Full Package — Luna',   amount: 799,  status: 'pending', method: '—'    },
  { id: 'INV005', date: '15 Apr 2025', service: 'Lab Blood Panel — Max',          amount: 650,  status: 'paid',    method: 'Cash' },
];

const STATUS_META = {
  paid:    { color: colors.success, bg: '#DCFCE7', label: 'Paid' },
  pending: { color: '#FF8F00',       bg: '#FFF3E0', label: 'Pending' },
  overdue: { color: colors.danger,   bg: '#FEE2E2', label: 'Overdue' },
};

export function BillingScreen() {
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const total     = INVOICES.reduce((s, i) => s + i.amount, 0);
  const paid      = INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pending   = INVOICES.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Billing & Payments</Text>
          <Text style={styles.subtitle}>All invoices and transactions</Text>
        </View>
        <Pressable style={styles.downloadBtn} onPress={() => Alert.alert('Download', 'Generating PDF statement...')}>
          <MaterialCommunityIcons name="download" size={18} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          {[
            { label: 'Total Spent', amount: total,   color: colors.primary, bg: '#F0EEFF', icon: 'wallet' },
            { label: 'Paid',        amount: paid,    color: colors.success, bg: '#DCFCE7', icon: 'check-circle' },
            { label: 'Pending',     amount: pending, color: '#FF8F00',      bg: '#FFF3E0', icon: 'clock-alert' },
          ].map(s => (
            <View key={s.label} style={[styles.summaryCard, { backgroundColor: s.bg }]}>
              <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
              <Text style={[styles.summaryAmt, { color: s.color }]}>₹{s.amount}</Text>
              <Text style={[styles.summaryLabel, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Payment methods */}
        <View style={styles.payMethods}>
          <Text style={styles.sectionTitle}>Quick Pay</Text>
          <View style={styles.payRow}>
            {[
              { icon: 'qrcode-scan',    label: 'UPI',        color: '#6C63FF' },
              { icon: 'credit-card',    label: 'Card',       color: '#0EA5E9' },
              { icon: 'bank',           label: 'Net Banking', color: '#22C55E' },
              { icon: 'wallet',         label: 'Wallet',     color: '#FF8F00' },
            ].map(m => (
              <Pressable key={m.label} style={styles.payMethod} onPress={() => Alert.alert(m.label, `Pay via ${m.label}`)}>
                <View style={[styles.payIcon, { backgroundColor: m.color + '20' }]}>
                  <MaterialCommunityIcons name={m.icon as any} size={20} color={m.color} />
                </View>
                <Text style={styles.payLabel}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Invoices */}
        <Text style={styles.sectionTitle}>Invoice History</Text>
        {INVOICES.map((inv, i) => {
          const meta = STATUS_META[inv.status as keyof typeof STATUS_META];
          return (
            <View key={inv.id} style={styles.invoiceCard}>
              <View style={styles.invoiceLeft}>
                <Text style={styles.invoiceId}>{inv.id}</Text>
                <Text style={styles.invoiceService} numberOfLines={1}>{inv.service}</Text>
                <Text style={styles.invoiceDate}>📅 {inv.date} • {inv.method}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmt}>₹{inv.amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                {inv.status === 'pending' && (
                  <Pressable style={styles.payNowBtn} onPress={() => Alert.alert('Pay', `Paying ₹${inv.amount}`)}>
                    <Text style={styles.payNowText}>Pay Now</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:       { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle:    { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  downloadBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  body:        { padding: 20 },
  summaryRow:  { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  summaryAmt:  { fontSize: 14, fontWeight: '900' },
  summaryLabel:{ fontSize: 9, fontWeight: '800' },
  payMethods:  { marginBottom: 20 },
  sectionTitle:{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 12 },
  payRow:      { flexDirection: 'row', gap: 10 },
  payMethod:   { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  payIcon:     { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  payLabel:    { fontSize: 10, fontWeight: '800', color: colors.text },
  invoiceCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  invoiceLeft: { flex: 1, gap: 3 },
  invoiceId:   { fontSize: 11, fontWeight: '900', color: colors.primary },
  invoiceService: { fontSize: 13, fontWeight: '700', color: colors.text },
  invoiceDate: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  invoiceRight:{ alignItems: 'flex-end', gap: 5 },
  invoiceAmt:  { fontSize: 16, fontWeight: '900', color: colors.text },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:  { fontSize: 9, fontWeight: '800' },
  payNowBtn:   { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  payNowText:  { fontSize: 10, fontWeight: '800', color: '#fff' },
});
