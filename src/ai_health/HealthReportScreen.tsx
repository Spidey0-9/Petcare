import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';

interface HealthData {
  lastCheckup: string;
  vaccinations: string[];
  medications: string[];
  allergies: string[];
  weight: string;
  age: string;
  breed: string;
  healthScore: number;
}

export function HealthReportScreen() {
  const navigation = useNavigation();
  const [petName] = useState('Buddy');
  const [healthData, setHealthData] = useState<HealthData>({
    lastCheckup: '2025-04-15',
    vaccinations: ['Rabies', 'DHPP', 'Bordetella'],
    medications: ['Flea & Tick preventive (monthly)', 'Heartworm preventive (monthly)'],
    allergies: ['Chicken', 'Corn'],
    weight: '28 kg',
    age: '4 years',
    breed: 'Golden Retriever',
    healthScore: 85
  });

  const healthStatusColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    return '#D32F2F';
  };

  const healthStatusText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Attention';
  };

  const generateReport = () => {
    return `
HEALTH REPORT - ${petName}
Generated: ${new Date().toLocaleDateString()}

BASIC INFORMATION
─────────────────────
Pet Name: ${petName}
Breed: ${healthData.breed}
Age: ${healthData.age}
Weight: ${healthData.weight}

HEALTH SCORE: ${healthData.healthScore}/100 (${healthStatusText(healthData.healthScore)})

VACCINATION STATUS
─────────────────────
${healthData.vaccinations.map(v => `✓ ${v}`).join('\n')}

CURRENT MEDICATIONS
─────────────────────
${healthData.medications.map(m => `• ${m}`).join('\n')}

ALLERGIES & SENSITIVITIES
─────────────────────
${healthData.allergies.map(a => `⚠ ${a}`).join('\n')}

LAST CHECKUP
─────────────────────
Date: ${healthData.lastCheckup}

RECOMMENDATIONS
─────────────────────
1. Schedule next vet checkup in 6 months
2. Maintain regular flea and tick prevention
3. Continue current medications as prescribed
4. Monitor diet - avoid allergenic foods
5. Ensure regular exercise and play

Contact your vet if you notice any behavioral changes or health concerns.
    `;
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Health Report</Text>
        <Pressable>
          <MaterialCommunityIcons name="download" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Health Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{healthData.healthScore}</Text>
            <Text style={styles.scoreLabel}>Health</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={[styles.scoreStatus, { color: healthStatusColor(healthData.healthScore) }]}>
              {healthStatusText(healthData.healthScore)}
            </Text>
            <Text style={styles.scoreSubtext}>
              {healthData.healthScore >= 80
                ? 'Your pet is in great health!'
                : healthData.healthScore >= 60
                ? 'Monitor for any changes'
                : 'Requires immediate attention'}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="heart-pulse"
            size={40}
            color={healthStatusColor(healthData.healthScore)}
            style={styles.scoreIcon}
          />
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="paw" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Breed</Text>
              <Text style={styles.infoValue}>{healthData.breed}</Text>
            </View>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{healthData.age}</Text>
            </View>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="weight" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Weight</Text>
              <Text style={styles.infoValue}>{healthData.weight}</Text>
            </View>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="clock-check" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Last Checkup</Text>
              <Text style={styles.infoValue}>{healthData.lastCheckup}</Text>
            </View>
          </View>
        </View>

        {/* Vaccinations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="needle" size={20} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Vaccinations</Text>
          </View>
          {healthData.vaccinations.map((vac, idx) => (
            <View key={idx} style={styles.listItem}>
              <View style={styles.checkmark}>
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.listItemText}>{vac}</Text>
              <Text style={styles.listItemDate}>Up to date</Text>
            </View>
          ))}
        </View>

        {/* Medications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="pill" size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>Current Medications</Text>
          </View>
          {healthData.medications.map((med, idx) => (
            <View key={idx} style={styles.listItem}>
              <View style={[styles.mediIcon, { backgroundColor: colors.accent }]}>
                <MaterialCommunityIcons name="pill" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.listItemText}>{med}</Text>
            </View>
          ))}
        </View>

        {/* Allergies */}
        {healthData.allergies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert" size={20} color="#FF9800" />
              <Text style={styles.sectionTitle}>Allergies & Sensitivities</Text>
            </View>
            {healthData.allergies.map((allergy, idx) => (
              <View key={idx} style={[styles.listItem, styles.allergyItem]}>
                <View style={styles.allergyIcon}>
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#FF9800" />
                </View>
                <Text style={styles.listItemText}>{allergy}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="lightbulb" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Recommendations</Text>
          </View>
          <View style={styles.recommendationsList}>
            {[
              'Schedule next vet checkup in 6 months',
              'Continue regular exercise (30+ min/day)',
              'Maintain flea and tick prevention',
              'Monitor diet - avoid known allergens',
              'Keep up with current medications'
            ].map((rec, idx) => (
              <View key={idx} style={styles.recommendationItem}>
                <Text style={styles.recommendationNumber}>{idx + 1}.</Text>
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.actionButton}>
            <MaterialCommunityIcons name="printer" size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>Print Report</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.actionButtonSecondary]}>
            <MaterialCommunityIcons name="share" size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  scoreCard: {
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900'
  },
  scoreLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600'
  },
  scoreInfo: {
    flex: 1
  },
  scoreStatus: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4
  },
  scoreSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    lineHeight: 16
  },
  scoreIcon: {
    marginLeft: 'auto'
  },
  section: {
    marginBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  infoCard: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 6
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600'
  },
  infoValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900'
  },
  listItem: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listItemText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  listItemDate: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '600'
  },
  allergyItem: {
    backgroundColor: '#FFF3E0'
  },
  allergyIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFE0B2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  recommendationsList: {
    gap: 8
  },
  recommendationItem: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start'
  },
  recommendationNumber: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 20
  },
  recommendationText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 20
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary
  },
  actionButtonSecondary: {
    backgroundColor: '#F0EEFF'
  },
  actionButtonText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13
  }
});