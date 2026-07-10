import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../core/theme/colors';

interface MealPlan {
  id: string;
  pet: string;
  type: string;
  meal: string;
  time: string;
  calories: number;
  icon: string;
  color: string;
  bg: string;
  done: boolean;
}

const MEAL_PLANS: MealPlan[] = [
  { id: '1', pet: 'Buddy', type: 'Morning',   meal: 'Royal Canin Adult (1.5 cups)', time: '7:00 AM',  calories: 380, icon: 'food-variant',  color: '#FF8F00', bg: '#FFF3E0', done: true  },
  { id: '2', pet: 'Buddy', type: 'Snack',     meal: 'Dental chew × 1',             time: '11:00 AM', calories: 80,  icon: 'bone',           color: '#8B5CF6', bg: '#F3E8FF', done: true  },
  { id: '3', pet: 'Buddy', type: 'Evening',   meal: 'Royal Canin Adult (1.5 cups)', time: '6:00 PM',  calories: 380, icon: 'food-variant',  color: '#0EA5E9', bg: '#E0F2FE', done: false },
  { id: '4', pet: 'Max',   type: 'Morning',   meal: 'Hills Science Diet (2 cups)',  time: '7:30 AM',  calories: 460, icon: 'food',           color: '#22C55E', bg: '#DCFCE7', done: true  },
  { id: '5', pet: 'Max',   type: 'Evening',   meal: 'Hills Science Diet (2 cups)',  time: '6:30 PM',  calories: 460, icon: 'food',           color: '#22C55E', bg: '#DCFCE7', done: false },
];

const TIPS = [
  { icon: 'water',          color: '#0EA5E9', tip: 'Ensure fresh water is available at all times. Change it daily.' },
  { icon: 'clock-outline',  color: '#6C63FF', tip: 'Feed at consistent times daily. Dogs thrive on routine.' },
  { icon: 'scale-bathroom', color: '#FF8F00', tip: 'Monitor weight weekly. Obesity shortens pet lifespan by 2+ years.' },
  { icon: 'leaf',           color: '#22C55E', tip: 'Add vegetables like carrots and green beans for fiber and vitamins.' },
];

const NUTRIENTS = [
  { label: 'Protein',   pct: 78, color: '#6C63FF', daily: '28g / 36g' },
  { label: 'Fat',       pct: 60, color: '#FF8F00', daily: '9g / 15g'  },
  { label: 'Fiber',     pct: 45, color: '#22C55E', daily: '2g / 4.5g' },
  { label: 'Calories',  pct: 65, color: '#0EA5E9', daily: '840 / 1280 kcal' },
];

export function NutritionScreen() {
  const insets    = useSafeAreaInsets();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [meals, setMeals] = useState(MEAL_PLANS);
  const [activePet, setActivePet] = useState('Buddy');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const toggleMeal = (id: string) =>
    setMeals(prev => prev.map(m => m.id === id ? { ...m, done: !m.done } : m));

  const petMeals    = meals.filter(m => m.pet === activePet);
  const totalCals   = petMeals.reduce((s, m) => s + m.calories, 0);
  const doneCals    = petMeals.filter(m => m.done).reduce((s, m) => s + m.calories, 0);
  const calPct      = Math.round((doneCals / totalCals) * 100);

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nutrition & Diet</Text>
          <Text style={styles.subtitle}>Daily meal tracking</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => Alert.alert('Add Meal', 'Opening meal planner...')}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Pet selector */}
        <View style={styles.petSelector}>
          {['Buddy', 'Max', 'Luna'].map(pet => (
            <Pressable
              key={pet}
              style={[styles.petChip, activePet === pet && styles.petChipActive]}
              onPress={() => setActivePet(pet)}
            >
              <MaterialCommunityIcons name="paw" size={14} color={activePet === pet ? '#fff' : colors.primary} />
              <Text style={[styles.petChipText, activePet === pet && styles.petChipTextActive]}>{pet}</Text>
            </Pressable>
          ))}
        </View>

        {/* Calorie ring */}
        <View style={styles.calorieCard}>
          <View style={styles.calRing}>
            <View style={[styles.calRingFill, { width: `${calPct}%` }]} />
            <View style={styles.calRingInner}>
              <Text style={styles.calNumber}>{doneCals}</Text>
              <Text style={styles.calUnit}>kcal consumed</Text>
            </View>
          </View>
          <View style={styles.calInfo}>
            <Text style={styles.calTitle}>{activePet}'s Calories Today</Text>
            <Text style={styles.calMeta}>{doneCals} / {totalCals} kcal • {calPct}% done</Text>
            <View style={styles.calBar}>
              <View style={[styles.calBarFill, { width: `${calPct}%` }]} />
            </View>
          </View>
        </View>

        {/* Nutrients */}
        <Text style={styles.sectionTitle}>Nutrient Breakdown</Text>
        <View style={styles.nutrientsGrid}>
          {NUTRIENTS.map(n => (
            <NutrientBar key={n.label} item={n} />
          ))}
        </View>

        {/* Meal plan */}
        <Text style={styles.sectionTitle}>Today's Meal Schedule</Text>
        {petMeals.map((meal, i) => (
          <Pressable key={meal.id} style={[styles.mealCard, meal.done && styles.mealDone]} onPress={() => toggleMeal(meal.id)}>
            <View style={[styles.mealIcon, { backgroundColor: meal.bg }]}>
              <MaterialCommunityIcons name={meal.icon as any} size={22} color={meal.color} />
            </View>
            <View style={styles.mealInfo}>
              <Text style={styles.mealType}>{meal.type}</Text>
              <Text style={styles.mealName}>{meal.meal}</Text>
              <Text style={styles.mealTime}>🕐 {meal.time} • {meal.calories} kcal</Text>
            </View>
            <View style={[styles.mealCheck, meal.done && styles.mealCheckDone]}>
              {meal.done && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
            </View>
          </Pressable>
        ))}

        {/* Tips */}
        <Text style={styles.sectionTitle}>Nutrition Tips</Text>
        {TIPS.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <View style={[styles.tipIcon, { backgroundColor: tip.color + '20' }]}>
              <MaterialCommunityIcons name={tip.icon as any} size={18} color={tip.color} />
            </View>
            <Text style={styles.tipText}>{tip.tip}</Text>
          </View>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

function NutrientBar({ item }: { item: typeof NUTRIENTS[0] }) {
  const animPct = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animPct, { toValue: item.pct, duration: 900, delay: 300, useNativeDriver: false }).start();
  }, []);
  const width = animPct.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={nb.card}>
      <Text style={nb.label}>{item.label}</Text>
      <View style={nb.track}>
        <Animated.View style={[nb.fill, { width, backgroundColor: item.color }]} />
      </View>
      <Text style={[nb.pct, { color: item.color }]}>{item.pct}%</Text>
      <Text style={nb.daily}>{item.daily}</Text>
    </View>
  );
}
const nb = StyleSheet.create({
  card:  { backgroundColor: colors.surface, borderRadius: 14, padding: 14, flex: 1 },
  label: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 8 },
  track: { height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  fill:  { height: 6, borderRadius: 3 },
  pct:   { fontSize: 13, fontWeight: '900' },
  daily: { fontSize: 10, color: colors.muted, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
  title:       { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle:    { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  addBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  body:        { padding: 20 },
  petSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  petChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary + '40' },
  petChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  petChipText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  petChipTextActive: { color: '#fff' },
  calorieCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  calRing:     { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.line, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  calRingFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.success + '40' },
  calRingInner:{ alignItems: 'center' },
  calNumber:   { fontSize: 16, fontWeight: '900', color: colors.text },
  calUnit:     { fontSize: 8, color: colors.muted, fontWeight: '700', textAlign: 'center' },
  calInfo:     { flex: 1 },
  calTitle:    { fontSize: 15, fontWeight: '900', color: colors.text },
  calMeta:     { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 3 },
  calBar:      { height: 6, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  calBarFill:  { height: 6, borderRadius: 3, backgroundColor: colors.success },
  sectionTitle:{ fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 12, marginTop: 4 },
  nutrientsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  mealCard:    { backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  mealDone:    { opacity: 0.7 },
  mealIcon:    { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mealInfo:    { flex: 1, gap: 3 },
  mealType:    { fontSize: 10, fontWeight: '900', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  mealName:    { fontSize: 13, fontWeight: '800', color: colors.text },
  mealTime:    { fontSize: 11, color: colors.muted, fontWeight: '600' },
  mealCheck:   { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  mealCheckDone: { backgroundColor: colors.success, borderColor: colors.success },
  tipCard:     { backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  tipIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipText:     { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20, fontWeight: '500' },
});
