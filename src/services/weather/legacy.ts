import { apiClient } from '../api';

export type WeatherCoordinates = {
  latitude: number;
  longitude: number;
};

export async function fetchWeatherByCoordinates({ latitude, longitude }: WeatherCoordinates) {
  return apiClient.get('/weather', {
    params: {
      lat: latitude,
      lon: longitude,
    },
  });
}
