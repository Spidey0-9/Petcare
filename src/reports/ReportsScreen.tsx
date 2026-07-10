import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { colors } from '../core/theme/colors';

type RecordType = 'prescription' | 'lab' | 'vaccination' | 'surgery' | 'xray' | 'note';

interface MedRecord {
  id: string;
  type: RecordType;
  title: string;
  date: string;
  doctor: string;
  pet: string;
  summary: string;
}

const TYPE_META: Record<RecordType, { icon: string; color: string; bg: string; label: string }> = {
  prescription: { icon: 'prescription',    color: '#6C63FF', bg: '#F0EEFF', label: 'Prescription' },
  lab:          { icon: 'test-tube',        color: '#0EA5E9', bg: '#E0F2FE', label: 'Lab Report'   },
  vaccination:  { icon: 'needle',           color: '#22C55E', bg: '#DCFCE7', label: 'Vaccination'  },
  surgery:      { icon: 'medical-bag',      color: '#EF4444', bg: '#FEE2E2', label: 'Surgery'      },
  xray:         { icon: 'radiobox-marked',  color: '#8B5CF6', bg: '#F3E8FF', label: 'X-Ray'        },
  note:         { icon: 'note-text',        color: '#FF8F00', bg: '#FFF3E0', label: 'Doctor Note'  },
};

const MOCK_RECORDS: MedRecord[] = [
  { id: '1', type: 'prescription', title: 'Amoxicillin 250mg',       date: '2025-05-10', doctor: 'Dr. Anjali Sharma', pet: 'Buddy', summary: 'Twice daily for 7 days. For ear infection treatment.' },
  { id: '2', type: 'lab',          title: 'CBC + Blood Panel',        date: '2025-04-22', doctor: 'Dr. Rajesh Kumar',  pet: 'Buddy', summary: 'WBC 7.2, RBC 6.8, HGB 14.2. All within normal range.' },
  { id: '3', type: 'vaccination',  title: 'Rabies Vaccine',           date: '2025-01-15', doctor: 'Dr. Anjali Sharma', pet: 'Buddy', summary: 'Annual rabies vaccination. Next due Jan 2026.' },
  { id: '4', type: 'surgery',      title: 'Spay Procedure',           date: '2024-11-08', doctor: 'Dr. Priya Mishra',  pet: 'Luna',  summary: 'Routine spay procedure. Recovery was smooth. No complications.' },
  { id: '5', type: 'xray',         title: 'Hip X-Ray',                date: '2024-10-15', doctor: 'Dr. Rajesh Kumar',  pet: 'Max',   summary: 'Mild hip dysplasia detected. Prescribed joint supplements.' },
  { id: '6', type: 'note',         title: 'Post-Op Follow-up Notes',  date: '2024-11-20', doctor: 'Dr. Priya Mishra',  pet: 'Luna',  summary: 'Good recovery. Stitches removed. Normal activity resumed.' },
];

export function ReportsScreen() {
  const insets    = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [records, setRecords]         = useState<MedRecord[]>(MOCK_RECORDS);
  const [activeType, setActiveType]   = useState<RecordType | 'all'>('all');
  const [expanded, setExpanded]       = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filtered = activeType === 'all' ? records : records.filter(r => r.type === activeType);

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Medical Records</Text>
          <Text style={styles.subtitle}>{records.length} records on file</Text>
        </View>
        <Pressable style={styles.uploadBtn} onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true,
          });
          if (!result.canceled && result.assets[0]) {
            Alert.alert('Uploaded ✅', `${result.assets[0].name} added to medical records.`);
          }
        }}>
          <MaterialCommunityIcons name="upload" size={18} color="#fff" />
          <Text style={styles.uploadText}>Upload</Text>
        </Pressable>
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typesRow}>
        <Pressable
          style={[styles.typeChip, activeType === 'all' && styles.typeChipActive]}
          onPress={() => setActiveType('all')}
        >
          <Text style={[styles.typeChipText, activeType === 'all' && styles.typeChipTextActive]}>All</Text>
        </Pressable>
        {(Object.keys(TYPE_META) as RecordType[]).map(t => {
          const m = TYPE_META[t];
          const isActive = activeType === t;
          return (
            <Pressable
              key={t}
              style={[styles.typeChip, isActive && { backgroundColor: m.color, borderColor: m.color }]}
              onPress={() => setActiveType(t)}
            >
              <MaterialCommunityIcons name={m.icon as any} size={13} color={isActive ? '#fff' : m.color} />
              <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Timeline records */}
      <ScrollView contentContainerStyle={styles.timeline} showsVerticalScrollIndicator={false}>
        {filtered.map((rec, i) => {
          const m   = TYPE_META[rec.type];
          const isOpen = expanded === rec.id;
          return (
            <View key={rec.id} style={styles.timelineItem}>
              {/* Timeline line + dot */}
              <View style={styles.timelineSide}>
                <View style={[styles.timelineDot, { backgroundColor: m.color }]} />
                {i < filtered.length - 1 && <View style={styles.timelineLine} />}
              </View>

              {/* Card */}
              <Pressable
                style={styles.recCard}
                onPress={() => setExpanded(isOpen ? null : rec.id)}
              >
                <View style={styles.recHeader}>
                  <View style={[styles.recIcon, { backgroundColor: m.bg }]}>
                    <MaterialCommunityIcons name={m.icon as any} size={18} color={m.color} />
                  </View>
                  <View style={styles.recInfo}>
                    <Text style={styles.recTitle}>{rec.title}</Text>
                    <Text style={styles.recMeta}>🐾 {rec.pet}  •  📅 {rec.date}</Text>
                    <Text style={styles.recDoctor}>👨‍⚕️ {rec.doctor}</Text>
                  </View>
                  <View style={styles.recActions}>
                    <View style={[styles.typeBadge, { backgroundColor: m.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: m.color }]}>{m.label}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.muted}
                    />
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.recExpanded}>
                    <Text style={styles.recSummary}>{rec.summary}</Text>
                    <View style={styles.recButtons}>
                      <Pressable style={styles.recBtn} onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert('Download', 'Downloading PDF...');
                      }}>
                        <MaterialCommunityIcons name="download" size={14} color={colors.primary} />
                        <Text style={styles.recBtnText}>Download</Text>
                      </Pressable>
                      <Pressable style={styles.recBtn} onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const canShare = await Sharing.isAvailableAsync();
                        if (canShare) {
                          Alert.alert('Share', 'Sharing report...');
                        } else {
                          Alert.alert('Share', 'Sharing not available on this device');
                        }
                      }}>
                        <MaterialCommunityIcons name="share-variant" size={14} color={colors.success} />
                        <Text style={[styles.recBtnText, { color: colors.success }]}>Share</Text>
                      </Pressable>
                      <Pressable style={styles.recBtn} onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert('Print', 'Sending to printer...');
                      }}>
                        <MaterialCommunityIcons name="printer" size={14} color="#FF8F00" />
                        <Text style={[styles.recBtnText, { color: '#FF8F00' }]}>Print</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:      { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle:   { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  uploadBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
  uploadText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  typesRow:   { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  typeChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText:   { fontSize: 11, fontWeight: '800', color: colors.muted },
  typeChipTextActive: { color: '#fff' },
  timeline:   { paddingHorizontal: 20, paddingTop: 8 },
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  timelineSide: { alignItems: 'center', width: 16 },
  timelineDot:  { width: 14, height: 14, borderRadius: 7, marginTop: 16 },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 4 },
  recCard:    { flex: 1, backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  recHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14 },
  recIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recInfo:    { flex: 1, gap: 3 },
  recTitle:   { fontSize: 14, fontWeight: '900', color: colors.text },
  recMeta:    { fontSize: 11, color: colors.muted, fontWeight: '600' },
  recDoctor:  { fontSize: 11, color: colors.muted },
  recActions: { alignItems: 'flex-end', gap: 6 },
  typeBadge:  { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  recExpanded:{ borderTopWidth: 1, borderTopColor: colors.line, padding: 14 },
  recSummary: { fontSize: 13, color: colors.text, lineHeight: 20, fontWeight: '500', marginBottom: 12 },
  recButtons: { flexDirection: 'row', gap: 8 },
  recBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 9 },
  recBtnText: { fontSize: 11, fontWeight: '800', color: colors.primary },
});
