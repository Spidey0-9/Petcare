export interface Medicine {
  id: number;
  name: string;
  genericName: string;
  category: MedicineCategory;
  description: string;
  uses: string[];
  dosage: string;
  sideEffects: string[];
  precautions: string[];
  interactions: string[];
}

export type MedicineCategory =
  | 'vaccines'
  | 'antibiotics'
  | 'pain-relief'
  | 'anti-nausea'
  | 'allergy-relief'
  | 'digestive'
  | 'supplement'
  | 'parasite-control'
  | 'dermatology'
  | 'joint-care';

export interface MedicineCategoryMeta {
  label: string;
  icon: string;
  accent: string;
}

export const medicineCategoryMeta: Record<MedicineCategory, MedicineCategoryMeta> = {
  vaccines: { label: 'Vaccines', icon: '💉', accent: '#1fbf83' },
  antibiotics: { label: 'Antibiotics', icon: '🧪', accent: '#7c3aed' },
  'pain-relief': { label: 'Pain Relief', icon: '🩹', accent: '#f59e0b' },
  'anti-nausea': { label: 'Anti-Nausea', icon: '🧠', accent: '#0ea5e9' },
  'allergy-relief': { label: 'Allergies', icon: '🌼', accent: '#ec4899' },
  digestive: { label: 'Digestive', icon: '🧫', accent: '#14b8a6' },
  supplement: { label: 'Supplements', icon: '🌿', accent: '#65a30d' },
  'parasite-control': { label: 'Parasite Control', icon: '🪱', accent: '#fb923c' },
  dermatology: { label: 'Dermatology', icon: '🧴', accent: '#8b5cf6' },
  'joint-care': { label: 'Joint Care', icon: '🦴', accent: '#ef4444' }
};

export const medicineDatabase: Medicine[] = [
  {
    id: 1,
    name: "Rabies Vaccine",
    genericName: "Rabies Vaccine",
    category: "vaccines",
    description: "Core vaccine to protect pets against rabies. Often required by law and recommended for travel or boarding.",
    uses: ["Rabies prevention", "Travel documentation", "Boarding requirement"],
    dosage: "Boosters as recommended by your veterinarian",
    sideEffects: ["Mild swelling", "Temporary fatigue"],
    precautions: ["Keep vaccination records", "Schedule before travel"],
    interactions: []
  },
  {
    id: 2,
    name: "DHPP Vaccine",
    genericName: "Distemper, Hepatitis, Parvo, Parainfluenza",
    category: "vaccines",
    description: "A combination vaccine for dogs protecting against several serious contagious diseases.",
    uses: ["Core puppy protection", "Annual boosters", "Preventive care"],
    dosage: "Initial series followed by boosters",
    sideEffects: ["Mild fever", "Reduced appetite"],
    precautions: ["Complete the full schedule", "Record every dose"],
    interactions: []
  },
  {
    id: 3,
    name: "FVRCP Vaccine",
    genericName: "Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia",
    category: "vaccines",
    description: "Essential feline vaccine that protects against three major infectious cat diseases.",
    uses: ["Kitten protection", "Annual wellness", "Cat boarding"],
    dosage: "Series of vaccines as directed",
    sideEffects: ["Mild soreness", "Temporary lethargy"],
    precautions: ["Follow booster schedule", "Monitor for reactions"],
    interactions: []
  },
  {
    id: 4,
    name: "Leptospirosis Vaccine",
    genericName: "Leptospirosis Vaccine",
    category: "vaccines",
    description: "Helps protect dogs against leptospirosis, a bacterial disease spread through contaminated water or soil.",
    uses: ["Outdoor dog protection", "Water exposure prevention"],
    dosage: "Annual booster recommended",
    sideEffects: ["Mild swelling", "Temporary tiredness"],
    precautions: ["Important for outdoor dogs", "Keep vaccination history"],
    interactions: []
  },
  {
    id: 5,
    name: "Bordetella Vaccine",
    genericName: "Bordetella Vaccine",
    category: "vaccines",
    description: "Supports protection against kennel cough, often recommended for social or boarded dogs.",
    uses: ["Kennel cough prevention", "Boarding and grooming visits"],
    dosage: "Annual or as recommended",
    sideEffects: ["Temporary cough", "Sneezing"],
    precautions: ["Give before boarding", "Discuss with your vet"],
    interactions: []
  },
  {
    id: 6,
    name: "Bravecto",
    genericName: "Fluralaner",
    category: "parasite-control",
    description: "Long-lasting flea and tick treatment for dogs and cats. Helps prevent infestations for months.",
    uses: ["Flea control", "Tick prevention", "Parasite protection"],
    dosage: "One dose as prescribed by weight",
    sideEffects: ["Temporary itching", "Lethargy"],
    precautions: ["Use only as directed", "Avoid in sick animals"],
    interactions: []
  },
  {
    id: 7,
    name: "Heartgard Plus",
    genericName: "Ivermectin/Pyrantel",
    category: "parasite-control",
    description: "Common monthly preventive for heartworm and intestinal parasites in dogs.",
    uses: ["Heartworm prevention", "Roundworm control", "Hookworm control"],
    dosage: "Monthly oral treatment",
    sideEffects: ["Mild vomiting", "Loose stool"],
    precautions: ["Give consistently", "Keep vet informed"],
    interactions: []
  },
  {
    id: 8,
    name: "Amoxicillin for Pets",
    genericName: "Amoxicillin",
    category: "antibiotics",
    description: "Antibiotic used for bacterial infections in dogs and cats, including skin, ear, and urinary tract issues.",
    uses: ["Bacterial infections", "Skin infections", "Ear infections", "UTIs"],
    dosage: "5-10mg per lb twice daily",
    sideEffects: ["Vomiting", "Diarrhea", "Loss of appetite"],
    precautions: ["Complete the full course", "Report allergic reactions"],
    interactions: []
  },
  {
    id: 9,
    name: "Doxycycline for Pets",
    genericName: "Doxycycline",
    category: "antibiotics",
    description: "Common antibiotic for bacterial infections and vector-borne diseases, especially in dogs.",
    uses: ["Respiratory infections", "Tick-borne disease treatment", "Bacterial illness"],
    dosage: "2.5-5mg per lb twice daily",
    sideEffects: ["Nausea", "Vomiting", "Loss of appetite"],
    precautions: ["Take with food", "Stay hydrated"],
    interactions: ["Dairy products", "Iron supplements", "Antacids"]
  },
  {
    id: 10,
    name: "Cerenia (Maropitant)",
    genericName: "Maropitant citrate",
    category: "anti-nausea",
    description: "Anti-nausea medication for dogs and cats used to treat vomiting and motion sickness.",
    uses: ["Nausea relief", "Vomiting prevention", "Motion sickness"],
    dosage: "1mg per lb once daily",
    sideEffects: ["Sedation", "Appetite suppression"],
    precautions: ["Prescription only", "Monitor for side effects"],
    interactions: []
  },
  {
    id: 11,
    name: "Apoquel",
    genericName: "Oclacitinib maleate",
    category: "allergy-relief",
    description: "Fast-acting anti-itch medication for dogs with allergies and dermatitis.",
    uses: ["Allergy relief", "Itch relief", "Skin inflammation"],
    dosage: "0.4-0.6mg per lb twice daily initially",
    sideEffects: ["Increased thirst", "Increased urination", "Increased appetite"],
    precautions: ["Prescription only", "Regular monitoring recommended"],
    interactions: []
  },
  {
    id: 12,
    name: "Zyrtec for Pets",
    genericName: "Cetirizine",
    category: "allergy-relief",
    description: "An antihistamine used to reduce mild allergic symptoms in pets.",
    uses: ["Allergy support", "Itch relief", "Mild seasonal allergies"],
    dosage: "As directed by your veterinarian",
    sideEffects: ["Drowsiness", "Dry mouth"],
    precautions: ["Avoid overuse", "Monitor for sedation"],
    interactions: []
  },
  {
    id: 13,
    name: "Metacam (Meloxicam)",
    genericName: "Meloxicam",
    category: "pain-relief",
    description: "NSAID used to reduce pain and inflammation in dogs and cats.",
    uses: ["Pain relief", "Arthritis management", "Post-surgery care"],
    dosage: "0.1mg per lb once daily",
    sideEffects: ["Stomach upset", "Loss of appetite", "Vomiting"],
    precautions: ["Use with food", "Monitor kidney function"],
    interactions: ["Other NSAIDs", "Corticosteroids"]
  },
  {
    id: 14,
    name: "Carprofen",
    genericName: "Carprofen",
    category: "pain-relief",
    description: "NSAID pain reliever commonly used for arthritis and post-operative pain in dogs.",
    uses: ["Pain relief", "Arthritis treatment", "Inflammation reduction"],
    dosage: "1-2mg per lb twice daily",
    sideEffects: ["Digestive upset", "Lethargy"],
    precautions: ["Monitor liver function", "Use lowest effective dose"],
    interactions: ["Other NSAIDs", "Anticoagulants"]
  },
  {
    id: 15,
    name: "Gabapentin for Pets",
    genericName: "Gabapentin",
    category: "pain-relief",
    description: "Helpful for nerve pain, chronic discomfort, and anxiety-related restlessness in pets.",
    uses: ["Nerve pain relief", "Anxiety reduction", "Chronic pain"],
    dosage: "5-10mg per lb every 8 hours",
    sideEffects: ["Sedation", "Dizziness", "Lethargy"],
    precautions: ["Prescription only", "Monitor kidney function"],
    interactions: ["Morphine", "Hydrocodone", "NSAIDs"]
  },
  {
    id: 16,
    name: "Probiotics for Pets",
    genericName: "Pet Probiotics",
    category: "digestive",
    description: "Supports digestive balance and gut flora in dogs and cats.",
    uses: ["Digestive health", "Diarrhea support", "Gut health"],
    dosage: "As per product instructions",
    sideEffects: ["Occasional mild bloating"],
    precautions: ["Store per instructions", "Consult vet for dosage"],
    interactions: []
  },
  {
    id: 17,
    name: "Fish Oil for Pets",
    genericName: "Omega-3 Fish Oil",
    category: "supplement",
    description: "A supplement that can support skin, coat, joint, and heart health in pets.",
    uses: ["Joint health", "Coat health", "Heart health", "Brain function"],
    dosage: "As per product instructions",
    sideEffects: ["Fish odor breath", "Loose stools"],
    precautions: ["Use pet-specific products", "Monitor for fish allergy"],
    interactions: []
  },
  {
    id: 18,
    name: "Dasuquin",
    genericName: "Glucosamine/Chondroitin",
    category: "joint-care",
    description: "Joint support supplement often used for aging pets or pets with stiffness.",
    uses: ["Joint support", "Arthritis support", "Mobility support"],
    dosage: "As directed on packaging or by your veterinarian",
    sideEffects: ["Mild stomach upset"],
    precautions: ["Use consistently", "Discuss with vet for severe pain"],
    interactions: []
  },
  {
    id: 19,
    name: "Veterinary Shampoo",
    genericName: "Antiseptic Pet Shampoo",
    category: "dermatology",
    description: "Supportive shampoo used for mild skin irritation, odor, or itch relief in pets.",
    uses: ["Skin irritation", "Itch relief", "Coat care"],
    dosage: "Use as directed on the label",
    sideEffects: ["Mild dryness"],
    precautions: ["Avoid eyes", "Patch test if sensitive"],
    interactions: []
  },
  {
    id: 20,
    name: "Trifexis",
    genericName: "Spinosad/Milbemycin",
    category: "parasite-control",
    description: "Combination parasite treatment for monthly flea, heartworm, and intestinal worm prevention.",
    uses: ["Flea prevention", "Heartworm prevention", "Worm control"],
    dosage: "Monthly oral medication",
    sideEffects: ["Vomiting", "Loose stool"],
    precautions: ["Use as prescribed", "Keep regular dosing schedule"],
    interactions: []
  }
];

export const getMedicineCategoryMeta = (category: MedicineCategory): MedicineCategoryMeta => {
  return medicineCategoryMeta[category] || { label: category.replace(/-/g, ' '), icon: '💊', accent: '#0f6fff' };
};

export const filterMedicines = (
  medicines: Medicine[],
  category: MedicineCategory | 'all',
  query: string
): Medicine[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return medicines.filter(med => {
    const matchesCategory = category === 'all' || med.category === category;
    const haystack = `${med.name} ${med.genericName} ${med.description} ${med.uses.join(' ')} ${med.category}`.toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
};

export const searchMedicines = (medicines: Medicine[], query: string): Medicine[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return medicines.slice(0, 6);

  return medicines
    .filter(med => {
      const haystack = `${med.name} ${med.genericName} ${med.description} ${med.uses.join(' ')} ${med.category}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    })
    .slice(0, 6);
};