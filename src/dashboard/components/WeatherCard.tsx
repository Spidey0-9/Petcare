import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import type { HomeLocationStatus } from '../services/homeDashboardService';

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
  description: string;
}

interface WeatherMeta {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
  tip: string;
}

interface WeatherCardProps {
  coords?: { latitude: number; longitude: number } | null;
  locationStatus: HomeLocationStatus;
  onRetry: () => void;
}

function getWeatherMeta(code: number, temp: number): WeatherMeta {
  if (code <= 1) return { icon: 'weather-sunny', color: '#FF8F00', bg: '#FFF8E1', tip: temp >= 36 ? `${temp}C is very hot. Avoid midday walks and keep water available.` : temp >= 30 ? `${temp}C outside. Prefer early morning or evening walks.` : 'Good weather for outdoor pet care.' };
  if (code <= 3) return { icon: 'weather-partly-cloudy', color: '#64748B', bg: '#F1F5F9', tip: 'Partly cloudy conditions. Outdoor care looks comfortable.' };
  if (code <= 67) return { icon: 'weather-rainy', color: '#0EA5E9', bg: '#E0F2FE', tip: 'Rain expected. Dry paws after walks and avoid muddy areas.' };
  if (code <= 77) return { icon: 'weather-snowy', color: '#6366F1', bg: '#EEF2FF', tip: 'Cold conditions. Keep outdoor time short and pets warm.' };
  if (code <= 99) return { icon: 'weather-lightning-rainy', color: '#EF4444', bg: '#FEE2E2', tip: 'Storm risk. Keep pets indoors and reduce noise stress.' };
  return { icon: 'weather-cloudy', color: colors.muted, bg: colors.background, tip: 'Weather loaded. Review conditions before going out.' };
}

export function WeatherCard({ coords, locationStatus, onRetry }: WeatherCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!coords) {
      setWeather(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather service unavailable.');
        const data = await res.json();
        const c = data.current;
        if (!active) return;
        setWeather({
          temp: Math.round(c.temperature_2m),
          feelsLike: Math.round(c.apparent_temperature),
          humidity: c.relative_humidity_2m,
          windSpeed: Math.round(c.wind_speed_10m),
          code: c.weather_code,
          description: codeToDesc(c.weather_code),
        });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load weather.');
      } finally {
        if (active) setLoading(false);
      }
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    };

    fetchWeather();
    return () => { active = false; };
  }, [coords?.latitude, coords?.longitude, fadeAnim, slideAnim]);

  if (locationStatus === 'denied') {
    return <StateCard icon="map-marker-off" text="Location permission is denied. Enable location to load weather." onRetry={onRetry} />;
  }

  if (!coords) {
    return <StateCard icon="map-marker-question" text="Location is unavailable. Weather cannot be loaded." onRetry={onRetry} />;
  }

  if (loading) {
    return <StateCard icon="weather-cloudy-clock" text="Loading weather..." />;
  }

  if (error || !weather) {
    return <StateCard icon="refresh" text={error || 'Could not load weather.'} onRetry={onRetry} />;
  }

  const meta = getWeatherMeta(weather.code, weather.temp);

  return (
    <Animated.View style={[styles.card, { backgroundColor: meta.bg, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
      <Pressable onPress={() => setExpanded(v => !v)} style={styles.pressable}>
        <View style={styles.mainRow}>
          <View style={styles.tempSection}>
            <MaterialCommunityIcons name={meta.icon} size={40} color={meta.color} />
            <View>
              <Text style={[styles.temp, { color: meta.color }]}>{weather.temp}C</Text>
              <Text style={styles.desc}>{weather.description}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </View>

        <View style={[styles.tipRow, { borderColor: meta.color + '30' }]}> 
          <MaterialCommunityIcons name="paw" size={14} color={meta.color} />
          <Text style={[styles.tipText, { color: meta.color }]}>{meta.tip}</Text>
        </View>

        {expanded && (
          <View style={styles.details}>
            <WeatherStat icon="thermometer" label="Feels Like" value={`${weather.feelsLike}C`} color={meta.color} />
            <WeatherStat icon="water-percent" label="Humidity" value={`${weather.humidity}%`} color="#0EA5E9" />
            <WeatherStat icon="weather-windy" label="Wind" value={`${weather.windSpeed} km/h`} color="#64748B" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function StateCard({ icon, text, onRetry }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string; onRetry?: () => void }) {
  return (
    <Pressable style={[styles.card, styles.stateCard]} onPress={onRetry} disabled={!onRetry}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.muted} />
      <Text style={styles.loadingText}>{text}</Text>
      {onRetry && <Text style={styles.retryText}>Retry</Text>}
    </Pressable>
  );
}

function WeatherStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={stat.item}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} />
      <View>
        <Text style={stat.label}>{label}</Text>
        <Text style={stat.value}>{value}</Text>
      </View>
    </View>
  );
}

const stat = StyleSheet.create({
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, padding: 10 },
  label: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  value: { fontSize: 13, color: colors.text, fontWeight: '900' },
});

function codeToDesc(code: number): string {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Rain Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  pressable: { padding: 16, gap: 12 },
  stateCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, backgroundColor: colors.background },
  loadingText: { flex: 1, fontSize: 13, color: colors.muted, fontWeight: '600' },
  retryText: { fontSize: 12, color: colors.primary, fontWeight: '900' },
  mainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tempSection: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  temp: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  desc: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 2 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderTopWidth: 1, paddingTop: 12 },
  tipText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  details: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
