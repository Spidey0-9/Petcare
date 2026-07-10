import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';
import {
  medicineDatabase,
  medicineCategoryMeta,
  filterMedicines,
  searchMedicines,
  Medicine,
  MedicineCategory
} from '../models/Medicine';

export function PharmacyScreen() {
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  const filteredMedicines = filterMedicines(medicineDatabase, selectedCategory, searchQuery);
  const searchedMedicines = searchMedicines(medicineDatabase, searchQuery);

  const categories: (MedicineCategory | 'all')[] = [
    'all',
    'vaccines',
    'antibiotics',
    'pain-relief',
    'anti-nausea',
    'allergy-relief',
    'digestive',
    'supplement',
    'parasite-control',
    'dermatology',
    'joint-care'
  ];

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Pharmacy</Text>
        <Text style={styles.subtitle}>Medicine catalog and information</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search medicines..."
        placeholderTextColor={colors.muted}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(category => {
          const meta = category === 'all'
            ? { label: 'All', icon: '🧾', accent: '#0f6fff' }
            : medicineCategoryMeta[category as MedicineCategory];

          return (
            <Pressable
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && { backgroundColor: meta.accent }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={styles.categoryIcon}>{meta.icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  selectedCategory === category && styles.categoryLabelActive
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.medicineList}>
        {filteredMedicines.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="pill" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>No medicines found</Text>
          </View>
        ) : (
          filteredMedicines.map(medicine => {
            const meta = medicineCategoryMeta[medicine.category];
            return (
              <Pressable
                key={medicine.id}
                style={styles.medicineCard}
                onPress={() => setSelectedMedicine(medicine)}
              >
                <View style={[styles.medicineIcon, { backgroundColor: `${meta.accent}22` }]}>
                  <Text style={styles.medicineIconText}>{meta.icon}</Text>
                </View>
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  <Text style={styles.medicineGeneric}>{medicine.genericName}</Text>
                  <Text style={styles.medicineDescription} numberOfLines={2}>
                    {medicine.description}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!selectedMedicine}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMedicine(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedMedicine(null)}>
          <View style={styles.modalContent}>
            {selectedMedicine && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTop}>
                    <View style={[
                      styles.modalIcon,
                      { backgroundColor: `${medicineCategoryMeta[selectedMedicine.category].accent}22` }
                    ]}>
                      <Text style={styles.modalIconText}>
                        {medicineCategoryMeta[selectedMedicine.category].icon}
                      </Text>
                    </View>
                    <View style={styles.modalHeaderText}>
                      <Text style={styles.modalTitle}>{selectedMedicine.name}</Text>
                      <Text style={styles.modalGeneric}>{selectedMedicine.genericName}</Text>
                      <View style={[styles.modalCategoryBadge, {
                        backgroundColor: `${medicineCategoryMeta[selectedMedicine.category].accent}22`
                      }]}>
                        <Text style={[styles.modalCategoryText, {
                          color: medicineCategoryMeta[selectedMedicine.category].accent
                        }]}>
                          {medicineCategoryMeta[selectedMedicine.category].label}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.sectionText}>{selectedMedicine.description}</Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dosage</Text>
                    <Text style={styles.sectionText}>{selectedMedicine.dosage}</Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Common Uses</Text>
                    {selectedMedicine.uses.map((use, index) => (
                      <View key={index} style={styles.listItem}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                        <Text style={styles.listItemText}>{use}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Side Effects</Text>
                    {selectedMedicine.sideEffects.map((effect, index) => (
                      <View key={index} style={styles.listItem}>
                        <MaterialCommunityIcons name="alert-circle" size={20} color={colors.accent} />
                        <Text style={styles.listItemText}>{effect}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Precautions</Text>
                    {selectedMedicine.precautions.map((precaution, index) => (
                      <View key={index} style={styles.listItem}>
                        <MaterialCommunityIcons name="information" size={20} color={colors.secondary} />
                        <Text style={styles.listItemText}>{precaution}</Text>
                      </View>
                    ))}
                  </View>

                  {selectedMedicine.interactions.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Interactions</Text>
                      {selectedMedicine.interactions.map((interaction, index) => (
                      <View key={index} style={styles.listItem}>
                        <MaterialCommunityIcons name="link-variant-off" size={20} color={colors.danger} />
                        <Text style={styles.listItemText}>{interaction}</Text>
                      </View>
                      ))}
                    </View>
                  )}

                  <Pressable style={styles.closeButton} onPress={() => setSelectedMedicine(null)}>
                    <Text style={styles.closeButtonText}>Close</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ECEEF5'
  },
  categoryContainer: {
    marginBottom: 16
  },
  categoryContent: {
    gap: 8,
    paddingRight: 16
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#ECEEF5'
  },
  categoryIcon: {
    fontSize: 16
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  categoryLabelActive: {
    color: '#FFFFFF'
  },
  medicineList: {
    flex: 1
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEEF5'
  },
  medicineIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  medicineIconText: {
    fontSize: 24
  },
  medicineInfo: {
    flex: 1
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2
  },
  medicineGeneric: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4
  },
  medicineDescription: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%'
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF5'
  },
  modalHeaderTop: {
    flexDirection: 'row',
    gap: 16
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalIconText: {
    fontSize: 32
  },
  modalHeaderText: {
    flex: 1
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4
  },
  modalGeneric: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8
  },
  modalCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  modalCategoryText: {
    fontSize: 12,
    fontWeight: '700'
  },
  modalBody: {
    padding: 20
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12
  },
  sectionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingVertical: 6
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  }
});