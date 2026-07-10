import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppScreen } from '../core/components/AppScreen';
import { colors } from '../core/theme/colors';

interface FoodItem {
  name: string;
  safe: boolean;
  reason: string;
}

const FOOD_DATABASE: Record<string, FoodItem> = {
  apple: { name: 'Apple', safe: true, reason: 'Safe for most pets. Remove seeds. Good for teeth.' },
  banana: { name: 'Banana', safe: true, reason: 'Safe in moderation. High in potassium.' },
  carrot: { name: 'Carrot', safe: true, reason: 'Excellent for teeth. Low calorie treat.' },
  chocolate: { name: 'Chocolate', safe: false, reason: 'TOXIC! Contains theobromine. Can cause serious harm.' },
  grape: { name: 'Grape', safe: false, reason: 'TOXIC! Causes kidney failure. Avoid completely.' },
  onion: { name: 'Onion', safe: false, reason: 'TOXIC! Damages red blood cells. Never feed.' },
  garlic: { name: 'Garlic', safe: false, reason: 'TOXIC! Similar to onions. Harmful to pets.' },
  avocado: { name: 'Avocado', safe: false, reason: 'Contains persin. Can cause upset stomach.' },
  chicken: { name: 'Chicken', safe: true, reason: 'Safe cooked and plain. Good protein source.' },
  beef: { name: 'Beef', safe: true, reason: 'Safe cooked. Good protein. Remove fat.' },
  fish: { name: 'Fish', safe: true, reason: 'Safe cooked. Rich in omega-3. Remove bones.' },
  milk: { name: 'Milk', safe: false, reason: 'Many pets are lactose intolerant. Causes digestion issues.' },
  cheese: { name: 'Cheese', safe: true, reason: 'Small amounts okay. High in fat.' },
  egg: { name: 'Egg', safe: true, reason: 'Safe cooked. Good protein. Can be allergenic.' },
  peanut: { name: 'Peanut', safe: true, reason: 'Safe plain. Avoid xylitol-containing peanut butter.' },
  raisin: { name: 'Raisin', safe: false, reason: 'TOXIC! Related to grapes. Avoid completely.' },
  salt: { name: 'Salt', safe: false, reason: 'Excess salt bad for pets. Causes thirst/toxicity.' },
  sugar: { name: 'Sugar', safe: false, reason: 'No nutritional value. Causes obesity and dental issues.' },
  xylitol: { name: 'Xylitol', safe: false, reason: 'TOXIC! Sweetener in sugar-free foods. Causes hypoglycemia.' },
};

export function FoodSafetyScreen() {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState<FoodItem | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (text: string = searchText) => {
    const query = text.toLowerCase().trim();
    if (!query) {
      setResult(null);
      setSearched(false);
      return;
    }

    const foodItem = FOOD_DATABASE[query];
    if (foodItem) {
      setResult(foodItem);
    } else {
      setResult({
        name: query.charAt(0).toUpperCase() + query.slice(1),
        safe: false,
        reason: 'Food not found in database. Consult your vet before feeding.'
      });
    }
    setSearched(true);
  };

  const categorizedFoods = {
    safe: Object.values(FOOD_DATABASE).filter(f => f.safe),
    unsafe: Object.values(FOOD_DATABASE).filter(f => !f.safe),
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Food Safety</Text>
        <Text style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for food..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={colors.muted}
          onSubmitEditing={() => handleSearch()}
        />
        <Pressable onPress={() => handleSearch()}>
          <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
        </Pressable>
      </View>

      {searched && result && (
        <View style={[styles.resultCard, { borderLeftColor: result.safe ? '#4CAF50' : '#D32F2F', borderLeftWidth: 4 }]}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultName}>{result.name}</Text>
            <View style={[styles.resultBadge, { backgroundColor: result.safe ? '#E8F5E9' : '#FFEBEE' }]}>
              <MaterialCommunityIcons
                name={result.safe ? 'check-circle' : 'alert-circle'}
                size={16}
                color={result.safe ? '#4CAF50' : '#D32F2F'}
              />
              <Text style={[styles.resultBadgeText, { color: result.safe ? '#4CAF50' : '#D32F2F' }]}>
                {result.safe ? 'SAFE' : 'UNSAFE'}
              </Text>
            </View>
          </View>
          <Text style={styles.resultReason}>{result.reason}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Safe Foods ({categorizedFoods.safe.length})</Text>
          </View>
          <View style={styles.foodList}>
            {categorizedFoods.safe.map(food => (
              <Pressable
                key={food.name}
                style={styles.foodItem}
                onPress={() => { setSearchText(food.name.toLowerCase()); handleSearch(food.name.toLowerCase()); }}
              >
                <View style={styles.foodItemContent}>
                  <MaterialCommunityIcons name="leaf-circle" size={18} color="#4CAF50" />
                  <View style={styles.foodItemText}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodDescription}>{food.reason}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
            <Text style={[styles.sectionTitle, { color: '#D32F2F' }]}>UNSAFE Foods ({categorizedFoods.unsafe.length})</Text>
          </View>
          <View style={styles.foodList}>
            {categorizedFoods.unsafe.map(food => (
              <Pressable
                key={food.name}
                style={[styles.foodItem, styles.unsafeFood]}
                onPress={() => { setSearchText(food.name.toLowerCase()); handleSearch(food.name.toLowerCase()); }}
              >
                <View style={styles.foodItemContent}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color="#D32F2F" />
                  <View style={styles.foodItemText}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <Text style={styles.foodDescription}>{food.reason}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.warningCard}>
          <MaterialCommunityIcons name="information" size={24} color={colors.accent} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Safety Tips</Text>
            <Text style={styles.warningText}>• Always introduce new foods gradually</Text>
            <Text style={styles.warningText}>• In case of poisoning, contact vet immediately</Text>
            <Text style={styles.warningText}>• Different pets may have different allergies</Text>
            <Text style={styles.warningText}>• When in doubt, consult your veterinarian</Text>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    marginBottom: 16
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14
  },
  resultCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FAFAFA',
    marginBottom: 16
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  resultName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '900'
  },
  resultReason: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
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
  foodList: {
    gap: 8
  },
  foodItem: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  unsafeFood: {
    backgroundColor: '#FFF3E0'
  },
  foodItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  foodItemText: {
    flex: 1
  },
  foodName: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13
  },
  foodDescription: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15
  },
  warningCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FFF8E1',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  warningContent: {
    flex: 1
  },
  warningTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 8
  },
  warningText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  }
});