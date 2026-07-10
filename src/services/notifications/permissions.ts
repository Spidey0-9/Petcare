import * as Notifications from 'expo-notifications';

export async function requestNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return current;
  }

  return Notifications.requestPermissionsAsync();
}
