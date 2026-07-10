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
import type { AppointmentStackParamList } from '../navigation/AppointmentNavigator';

type Nav = NativeStackNavigationProp<AppointmentStackParamList>;
type RouteParams = RouteProp<AppointmentStackParamList, 'RateAppointment'>;

export function RateAppointmentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteParams>();
  const { appointmentId } = route.params;

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await appointmentService.rateAppointment(appointmentId, rating, review);
      Alert.alert('Thank You!', 'Your feedback has been submitted', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const getRatingText = (r: number): string => {
    if (r >= 5) return 'Excellent! ⭐';
    if (r >= 4) return 'Very Good! 😊';
    if (r >= 3) return 'Good 👍';
    if (r >= 2) return 'Fair 😐';
    return 'Needs Improvement 😕';
  };

  const getRatingColor = (r: number): string => {
    if (r >= 4) return colors.success;
    if (r >= 3) return colors.primary;
    if (r >= 2) return '#FF8F00';
    return colors.danger;
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Rate Your Experience</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Doctor Card */}
        <View style={styles.doctorCard}>
          <View style={styles.doctorAvatar}>
            <MaterialCommunityIcons name="doctor" size={48} color="#fff" />
          </View>
          <Text style={styles.doctorTitle}>How was your consultation?</Text>
          <Text style={styles.doctorSub}>Your feedback helps us improve our service</Text>
        </View>

        {/* Rating Section */}
        <View style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>Rate your experience</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Pressable
                key={i}
                onPress={() => setRating(i)}
                style={styles.starBtn}
              >
                <MaterialCommunityIcons
                  name={i <= rating ? 'star' : 'star-outline'}
                  size={48}
                  color="#FF8F00"
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingText, { color: getRatingColor(rating) }]}>
              {getRatingText(rating)}
            </Text>
          )}
        </View>

        {/* Review Section */}
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>Share your feedback (Optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell us about your experience with the doctor and treatment..."
            placeholderTextColor={colors.muted}
            value={review}
            onChangeText={setReview}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || rating === 0}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="star" size={20} color="#fff" />
              <Text style={styles.submitText}>Submit Rating</Text>
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
  doctorCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  doctorAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doctorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  doctorSub: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
  ratingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  starBtn: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
  },
  reviewSection: {
    marginBottom: 20,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 120,
    marginTop: 12,
  },
  submitBtn: {
    backgroundColor: '#FF8F00',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
