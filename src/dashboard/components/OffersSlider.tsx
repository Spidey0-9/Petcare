import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40; // full-width cards

export interface Offer {
  id: string;
  discount: string;
  title: string;
  subtitle: string;
  cta: string;
  bgFrom: string;
  bgTo: string;
  icon: string;
  iconColor: string;
  targetType: 'shop' | 'appointment' | 'ai' | 'vaccination';
}

interface OffersSliderProps {
  offers: Offer[];
  onPress?: (offer: Offer) => void;
}

export function OffersSlider({ offers, onPress }: OffersSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX   = useRef(new Animated.Value(0)).current;
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-slide every 3s
  useEffect(() => {
    if (!offers || offers.length <= 1) return;
    autoTimer.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % offers.length;
        scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
        return next;
      });
    }, 3000);
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, [offers]);

  if (!offers || offers.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
          setActiveIndex(idx);
        }}
      >
        {offers.map(offer => (
          <OfferCard key={offer.id} offer={offer} onPress={() => onPress?.(offer)} />
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {offers.map((_, i) => {
          const inputRange = [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [6, 20, 6],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          const activeBg = offers[activeIndex]?.bgFrom || colors.primary;
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: activeBg }]}
            />
          );
        })}
      </View>
    </View>
  );
}

function OfferCard({ offer, onPress }: { offer: Offer; onPress: () => void }) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, friction: 8 }).start();
  const onOut = () => Animated.spring(pressAnim, { toValue: 1,    useNativeDriver: true, friction: 6 }).start();

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: pressAnim }] }]}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} style={[styles.card, { backgroundColor: offer.bgFrom }]}>
        {/* Background decoration */}
        <View style={[styles.bgCircle1, { backgroundColor: offer.bgTo }]} />
        <View style={[styles.bgCircle2, { backgroundColor: offer.bgTo + '60' }]} />

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.discountBadge}>
            <Text style={styles.discount}>{offer.discount}</Text>
          </View>
          <Text style={styles.title}>{offer.title}</Text>
          <Text style={styles.subtitle}>{offer.subtitle}</Text>
          <Pressable style={styles.ctaBtn} onPress={onPress}>
            <Text style={styles.ctaText}>{offer.cta}</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color={offer.bgFrom} />
          </Pressable>
        </View>

        {/* Icon */}
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name={offer.icon as any} size={48} color="rgba(255,255,255,0.4)" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  cardWrapper: { width: CARD_WIDTH },
  card: {
    borderRadius: 22,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 130,
    overflow: 'hidden',
    position: 'relative',
  },
  bgCircle1: {
    position: 'absolute', width: 140, height: 140,
    borderRadius: 70, top: -40, right: -30,
  },
  bgCircle2: {
    position: 'absolute', width: 80, height: 80,
    borderRadius: 40, bottom: -20, right: 60,
  },
  content: { flex: 1, gap: 6, zIndex: 1 },
  discountBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discount: { fontSize: 13, fontWeight: '900', color: '#fff' },
  title:    { fontSize: 18, fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: 12, color: '#fff', opacity: 0.9, fontWeight: '600' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 4,
  },
  ctaText: { fontSize: 12, fontWeight: '800', color: colors.text },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
});
