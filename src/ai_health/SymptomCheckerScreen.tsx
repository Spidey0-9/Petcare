import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Symptom {
  id: string;
  name: string;
  icon: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SymptomResult {
  symptom: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

export function SymptomCheckerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [selectedSymptoms, setSelectedSymptoms] = useState<Symptom[]>([]);
  const [results, setResults] = useState<SymptomResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [petName, setPetName] = useState('Buddy');

  const commonSymptoms: Symptom[] = [
    { id: '1', name: 'Coughing', icon: 'lungs', riskLevel: 'medium' },
    { id: '2', name: 'Vomiting', icon: 'nausea', riskLevel: 'high' },
    { id: '3', name: 'Diarrhea', icon: 'water', riskLevel: 'medium' },
    { id: '4', name: 'Lethargy', icon: 'sleep', riskLevel: 'high' },
    { id: '5', name: 'Loss of Appetite', icon: 'food-off', riskLevel: 'high' },
    { id: '6', name: 'Itching', icon: 'hand-wash', riskLevel: 'low' },
    { id: '7', name: 'Hair Loss', icon: 'brush', riskLevel: 'low' },
    { id: '8', name: 'Limping', icon: 'foot-print', riskLevel: 'medium' },
  ];

  const toggleSymptom = (symptom: Symptom) => {
    const exists = selectedSymptoms.find(s => s.id === symptom.id);
    if (exists) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s.id !== symptom.id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const analyzeSymptoms = () => {
    const analysisResults: SymptomResult[] = selectedSymptoms.map(symptom => {
      const recommendations: Record<string, string> = {
        '1': 'Monitor for respiratory issues. Consult vet if persistent.',
        '2': 'Potential GI issue. Contact vet immediately.',
        '3': 'Keep hydrated. Monitor diet. Consult vet if severe.',
        '4': 'Sign of illness. Schedule vet visit ASAP.',
        '5': 'May indicate underlying condition. Vet consultation needed.',
        '6': 'Possible allergy or skin condition. Use prescribed shampoo.',
        '7': 'Could be natural or allergy-related. Monitor and consult vet.',
        '8': 'Joint or injury issue. Rest and monitor closely.',
      };

      return {
        symptom: symptom.name,
        riskLevel: symptom.riskLevel,
        recommendation: recommendations[symptom.id] || 'Consult your veterinarian.'
      };
    });

    setResults(analysisResults);
    setShowResults(true);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return '#D32F2F';
      case 'medium': return '#F57C00';
      case 'low': return '#388E3C';
      default: return colors.muted;
    }
  };

  if (showResults) {
    return (
      <AppScreen>
        <View style={styles.header}>
          <Pressable onPress={() => { setShowResults(false); setResults([]); }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Analysis Results</Text>
          <Text style={{ width: 24 }} />
        </View>

        <View style={styles.petCard}>
          <Text style={styles.petCardText}>{petName}'s Health Summary</Text>
          <View style={styles.riskSummary}>
            {['high', 'medium', 'low'].map(level => {
              const count = results.filter(r => r.riskLevel === level).length;
              return (
                <View key={level} style={styles.riskItem}>
                  <View style={[styles.riskDot, { backgroundColor: getRiskColor(level) }]} />
                  <Text style={styles.riskLabel}>{level.charAt(0).toUpperCase() + level.slice(1)}: {count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.resultsList}>
          {results.map((result, idx) => (
            <View key={idx} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultSymptom}>{result.symptom}</Text>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(result.riskLevel) }]}>
                  <Text style={styles.riskBadgeText}>{result.riskLevel.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.resultRecommendation}>{result.recommendation}</Text>
            </View>
          ))}
          <Pressable style={styles.consultButton}>
            <MaterialCommunityIcons name="doctor" size={20} color="#FFFFFF" />
            <Text style={styles.consultButtonText}>Book Vet Consultation</Text>
          </Pressable>
        </ScrollView>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Symptom Checker</Text>
        <Text style={{ width: 24 }} />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Pet Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter pet name"
          value={petName}
          onChangeText={setPetName}
          placeholderTextColor={colors.muted}
        />
      </View>

      <Text style={styles.subtitle}>Select symptoms:</Text>

      <View style={styles.symptomsGrid}>
        {commonSymptoms.map(symptom => (
          <Pressable
            key={symptom.id}
            style={[
              styles.symptomCard,
              selectedSymptoms.find(s => s.id === symptom.id) && styles.symptomCardSelected
            ]}
            onPress={() => toggleSymptom(symptom)}
          >
            <View style={[styles.symptomIcon, selectedSymptoms.find(s => s.id === symptom.id) && { backgroundColor: colors.primary }]}>
              <MaterialCommunityIcons
                name={symptom.icon as any}
                size={20}
                color={selectedSymptoms.find(s => s.id === symptom.id) ? '#FFFFFF' : colors.primary}
              />
            </View>
            <Text style={styles.symptomName}>{symptom.name}</Text>
          </Pressable>
        ))}
      </View>

      {selectedSymptoms.length > 0 && (
        <Pressable style={styles.analyzeButton} onPress={analyzeSymptoms}>
          <MaterialCommunityIcons name="stethoscope" size={20} color="#FFFFFF" />
          <Text style={styles.analyzeButtonText}>Analyze Symptoms ({selectedSymptoms.length})</Text>
        </Pressable>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  inputContainer: {
    marginBottom: 20
  },
  label: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: 8
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  subtitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20
  },
  symptomCard: {
    width: '48%',
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 8
  },
  symptomCardSelected: {
    backgroundColor: '#F0EEFF',
    borderWidth: 2,
    borderColor: colors.primary
  },
  symptomIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  symptomName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  analyzeButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  },
  petCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.secondary,
    marginBottom: 20
  },
  petCardText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12
  },
  riskSummary: {
    gap: 8
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  riskLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  resultsList: {
    flex: 1
  },
  resultCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.surface,
    marginBottom: 12
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  resultSymptom: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  riskBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900'
  },
  resultRecommendation: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  consultButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 20
  },
  consultButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14
  }
});