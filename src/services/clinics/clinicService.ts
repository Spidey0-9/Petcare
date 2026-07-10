import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';
import type { ClinicRecord } from '../../types';

function distanceInKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radius = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export class ClinicService {
  private readonly repository = new SupabaseRepository<ClinicRecord>(TABLES.clinics);

  async getCurrentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) throw new Error('Location permission is required.');
    return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  }

  async listNearbyClinics(latitude: number, longitude: number) {
    const clinics = await this.repository.list();
    return clinics
      .map((clinic) => ({
        ...clinic,
        distanceKm: clinic.latitude && clinic.longitude
          ? distanceInKm({ latitude, longitude }, { latitude: clinic.latitude, longitude: clinic.longitude })
          : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  openMaps(latitude: number, longitude: number, label = 'Veterinary Clinic') {
    const encodedLabel = encodeURIComponent(label);
    return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${encodedLabel}`);
  }

  callClinic(phone?: string | null) {
    if (!phone) throw new Error('Clinic phone number is not available.');
    return Linking.openURL(`tel:${phone}`);
  }
}

export const clinicService = new ClinicService();
