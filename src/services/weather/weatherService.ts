import { apiClient } from '../api';

export type WeatherCoordinates = {
  latitude: number;
  longitude: number;
};

export type WeatherSnapshot = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  suggestion: string;
};

const weatherCache = new Map<string, { value: WeatherSnapshot; expiresAt: number }>();

function buildCacheKey({ latitude, longitude }: WeatherCoordinates) {
  return `${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}

function createWeatherSuggestion(snapshot: Omit<WeatherSnapshot, 'suggestion'>) {
  if (snapshot.temperature >= 32) return 'Keep pets hydrated, avoid midday walks, and watch for heat stress.';
  if (snapshot.temperature <= 10) return 'Use warm bedding and keep short-haired pets protected outdoors.';
  if (snapshot.condition.toLowerCase().includes('rain')) return 'Dry paws and coat after walks to reduce skin irritation.';
  return 'Weather looks suitable for normal walks and outdoor play.';
}

export class WeatherService {
  async getCurrentWeather(coordinates: WeatherCoordinates) {
    const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error('Missing EXPO_PUBLIC_OPENWEATHER_API_KEY.');

    const cacheKey = buildCacheKey(coordinates);
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const { data } = await apiClient.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: coordinates.latitude,
        lon: coordinates.longitude,
        units: 'metric',
        appid: apiKey,
      },
    });

    const snapshot = {
      temperature: Number(data.main?.temp ?? 0),
      humidity: Number(data.main?.humidity ?? 0),
      windSpeed: Number(data.wind?.speed ?? 0),
      condition: String(data.weather?.[0]?.main ?? 'Unknown'),
    };

    const value = {
      ...snapshot,
      suggestion: createWeatherSuggestion(snapshot),
    };

    weatherCache.set(cacheKey, { value, expiresAt: Date.now() + 10 * 60 * 1000 });
    return value;
  }
}

export const weatherService = new WeatherService();
export { fetchWeatherByCoordinates } from './legacy';
