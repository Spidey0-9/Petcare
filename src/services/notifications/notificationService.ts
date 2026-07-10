import * as Notifications from 'expo-notifications';

import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';
import type { NotificationRecord } from '../../types';

type CreateNotificationInput = Partial<NotificationRecord> | {
  userId: string;
  message: string;
  referenceId: string;
  type: string;
};

function normalizeCreateInput(input: CreateNotificationInput): Partial<NotificationRecord> {
  if ('userId' in input) {
    return {
      user_id: input.userId,
      title: input.message,
      body: input.message,
      type: input.type,
      data: { referenceId: input.referenceId },
    };
  }
  return input;
}

export class NotificationService {
  private readonly repository = new SupabaseRepository<NotificationRecord>(TABLES.notifications);

  listNotifications() {
    return this.repository.list({ orderBy: 'created_at' });
  }

  listByUser(userId: string) {
    return this.repository.list({ filters: { user_id: userId }, orderBy: 'created_at' });
  }

  async getExpoPushToken() {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) throw new Error('Notification permission is required.');
    return Notifications.getExpoPushTokenAsync();
  }

  createNotification(payload: Partial<NotificationRecord>): Promise<NotificationRecord>;
  createNotification(userId: string, message: string, referenceId: string, type: string): Promise<NotificationRecord>;
  createNotification(
    payloadOrUserId: Partial<NotificationRecord> | string,
    message?: string,
    referenceId?: string,
    type?: string,
  ) {
    const payload = typeof payloadOrUserId === 'string'
      ? normalizeCreateInput({ userId: payloadOrUserId, message: message ?? '', referenceId: referenceId ?? '', type: type ?? 'general' })
      : normalizeCreateInput(payloadOrUserId);
    return this.repository.create(payload);
  }

  markRead(id: string) {
    return this.repository.update(id, { is_read: true });
  }

  deleteNotification(id: string) {
    return this.repository.remove(id);
  }

  subscribe(callback: (payload: unknown) => void) {
    return this.repository.subscribe('*', callback);
  }
}

export const notificationService = new NotificationService();