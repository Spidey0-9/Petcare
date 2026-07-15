import * as Notifications from 'expo-notifications';

import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';
import type { NotificationRecord } from '../../types';

type CreateNotificationInput = Partial<NotificationRecord> | {
  userId: string;
  message: string;
  referenceId: string;
  type: string;
};

function isNotificationMetadataMissing(error: { code?: string; message?: string } | null) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /column .* does not exist/i.test(error?.message ?? '');
}

function normalizeCreateInput(input: CreateNotificationInput): Partial<NotificationRecord> {
  if ('userId' in input) {
    return {
      user_id: input.userId,
      title: input.message,
      body: input.message,
      type: input.type,
      data: { referenceId: input.referenceId, action: input.type },
      reference_id: input.referenceId || null,
      action: input.type,
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
  async createNotification(
    payloadOrUserId: Partial<NotificationRecord> | string,
    message?: string,
    referenceId?: string,
    type?: string,
  ) {
    const payload = typeof payloadOrUserId === 'string'
      ? normalizeCreateInput({ userId: payloadOrUserId, message: message ?? '', referenceId: referenceId ?? '', type: type ?? 'general' })
      : normalizeCreateInput(payloadOrUserId);

    const { data, error } = await supabase.from(TABLES.notifications).insert(payload).select('*').single();
    if (isNotificationMetadataMissing(error)) {
      const { action, actor_id, organization_id, ...fallbackPayload } = payload;
      const retry = await supabase.from(TABLES.notifications).insert(fallbackPayload).select('*').single();
      if (retry.error) throw retry.error;
      return retry.data as NotificationRecord;
    }
    if (error) throw error;
    return data as NotificationRecord;
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