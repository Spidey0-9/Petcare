import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';

const PERMISSIONS_KEY = 'app_permissions_completed';

export type AppPermissionId = 'camera' | 'microphone' | 'gallery' | 'notifications' | 'storage';

export type AppPermissionResult = {
  id: AppPermissionId;
  label: string;
  granted: boolean;
};

export const APP_PERMISSION_LABELS: Record<AppPermissionId, string> = {
  camera: 'Camera',
  microphone: 'Microphone',
  gallery: 'Gallery',
  notifications: 'Notifications',
  storage: 'Storage',
};

export const permissionsService = {
  isCompleted: async () => {
    try {
      return (await AsyncStorage.getItem(PERMISSIONS_KEY)) === 'true';
    } catch {
      return false;
    }
  },

  markCompleted: async () => {
    await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
  },

  reset: async () => {
    await AsyncStorage.removeItem(PERMISSIONS_KEY);
  },

  requestAll: async (): Promise<AppPermissionResult[]> => {
    const results: AppPermissionResult[] = [];

    const camera = await Camera.requestCameraPermissionsAsync();
    results.push({ id: 'camera', label: APP_PERMISSION_LABELS.camera, granted: camera.granted });

    const microphone = await Audio.requestPermissionsAsync();
    results.push({ id: 'microphone', label: APP_PERMISSION_LABELS.microphone, granted: microphone.granted });

    const gallery = await ImagePicker.requestMediaLibraryPermissionsAsync();
    results.push({ id: 'gallery', label: APP_PERMISSION_LABELS.gallery, granted: gallery.granted });

    const storage = await MediaLibrary.requestPermissionsAsync();
    results.push({ id: 'storage', label: APP_PERMISSION_LABELS.storage, granted: storage.granted });

    const notifications = await Notifications.requestPermissionsAsync();
    results.push({ id: 'notifications', label: APP_PERMISSION_LABELS.notifications, granted: notifications.granted });

    await permissionsService.markCompleted();
    return results;
  },
};
