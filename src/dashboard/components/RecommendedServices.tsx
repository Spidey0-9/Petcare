import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

export interface Service {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  badge?: string;
}

interface RecommendedServicesProps {
  services: Service[];
  onPress?: (serviceId: string) => void;
}

export function RecommendedServices({ services, onPress }: RecommendedServicesProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {services.map((svc, i) => (
        <ServiceCard key={svc.id} service={svc} index={i} onPress={() => onPress?.(svc.id)} />
      ))}
    </ScrollView>
  );
}

function ServiceCard({
  service, index, onPress,
}: { service: Service; index: number; onPress: () => void }) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = 60 * index;
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, friction: 8, delay, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const onPressIn  = () => Animated.spring(pressAnim, { toValue: 0.9, useNativeDriver: true, friction: 8 }).start();
  const onPressOut = () => Animated.spring(pressAnim, { toValue: 1,   useNativeDriver: true, friction: 6 }).start();

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: pressAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.pressable}
      >
        {/* Badge */}
        {service.badge && (
          <View style={[styles.badge, { backgroundColor: service.color }]}>
            <Text style={styles.badgeText}>{service.badge}</Text>
          </View>
        )}

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: service.bgColor }]}>
          <MaterialCommunityIcons name={service.icon as any} size={28} color={service.color} />
        </View>

        <Text style={styles.label}>{service.label}</Text>
        <Text style={styles.desc}>{service.desc}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingBottom: 4, paddingTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'visible',
  },
  pressable: {
    padding: 14,
    alignItems: 'center',
    width: 95,
    gap: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  badgeText: { fontSize: 8, fontWeight: '900', color: '#fff' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, fontWeight: '800', color: colors.text, textAlign: 'center' },
  desc:  { fontSize: 10, fontWeight: '600', color: colors.muted, textAlign: 'center' },
});
