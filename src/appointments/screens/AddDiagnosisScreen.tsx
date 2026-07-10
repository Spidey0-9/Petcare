import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors } from '../../core/theme/colors';
import { appointmentService } from '../services/appointmentService';
import { InfoCard } from '../components/InfoCard';
import type { AppointmentStackParamList } from '../navigation/AppointmentNavigator';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;
type RouteParams = RouteProp<AppointmentStackParamList, 'AddDiagnosis'>;

export function AddDiagnosisScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { appointmentId } = route.params;

  const [diagnosis, setDiagnosis] = useState('');
  const [prescription, setPrescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!diagnosis.trim() || !prescription.trim()) {
      Alert.alert('Required', 'Please enter both diagnosis and prescription');
      return;
    }

    setLoading(true);
    try {
      await appointmentService.addDiagnosisAndPrescription(
        appointmentId,
        diagnosis,
        prescription
      );
      Alert.alert('Success', 'Diagnosis and prescription added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save diagnosis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Diagnosis & Prescription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.infoText}>
          Complete the consultation by adding diagnosis and prescription details
        </Text>

        {/* Diagnosis */}
        <InfoCard
          title="Diagnosis"
          icon="clipboard-text"
          iconColor={colors.success}
        >
          <TextInput
            style={styles.textArea}
            placeholder="Enter detailed diagnosis, examination findings, and clinical observations..."
            placeholderTextColor={colors.muted}
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </InfoCard>

        {/* Prescription */}
        <InfoCard
          title="Prescription"
          icon="pill"
          iconColor="#7C3AED"
        >
          <TextInput
            style={styles.textArea}
            placeholder="Enter medications, dosage, frequency, duration, and special instructions..."
            placeholderTextColor={colors.muted}
            value={prescription}
            onChangeText={setPrescription}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </InfoCard>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>Complete Consultation</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: colors.text },
  content: { padding: 20 },
  infoText: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 20,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 140,
  },
  submitBtn: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
