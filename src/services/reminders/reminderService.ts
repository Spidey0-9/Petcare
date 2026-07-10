import * as Notifications from 'expo-notifications';
import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';
import type { ReminderRecord } from '../../types';

export type ReminderListItem = ReminderRecord & {
  pet_name?: string | null;
  /** display date string entered by the user (DD/MM/YYYY or YYYY-MM-DD) */
  date?: string | null;
  /** display time string entered by the user (e.g. "09:00 AM") */
  time?: string | null;
};

export class ReminderService {
  private readonly repository = new SupabaseRepository<ReminderListItem>(TABLES.reminders);

  listReminders() {
    return this.repository.list({ orderBy: 'created_at' });
  }

  listByUser(userId: string) {
    return this.repository.list({
      filters:   { user_id: userId },
      orderBy:   'created_at',
      ascending: false,
    });
  }

  createReminder(payload: Partial<ReminderListItem> | Record<string, unknown>) {
    return this.repository.create(this.normalizePayload(payload));
  }

  updateReminder(id: string, payload: Partial<ReminderListItem> | Record<string, unknown>) {
    return this.repository.update(id, this.normalizePayload(payload));
  }

  deleteReminder(id: string) {
    return this.repository.remove(id);
  }

  toggleReminder(id: string, currentIsActive: boolean) {
    return this.repository.update(id, { is_active: !currentIsActive });
  }

  async scheduleLocalNotification(
    reminder: Pick<ReminderListItem, 'id' | 'title' | 'type' | 'scheduled_at'>,
  ) {
    try {
      const triggerDate = reminder.scheduled_at ? new Date(reminder.scheduled_at) : null;
      const isFuture    = triggerDate && triggerDate.getTime() > Date.now();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🐾 ${reminder.title}`,
          body:  `PetCare+ reminder — ${reminder.type}`,
          data:  { reminderId: reminder.id, type: reminder.type },
          sound: true,
        },
        // If the scheduled time is in the future, use it; otherwise fire after 5 s
        trigger: isFuture ? triggerDate! : { seconds: 5 },
      });

      // Persist the notification ID so we can cancel it later
      // (guard: only update if id exists — new records may not have one yet)
      if (reminder.id) {
        try {
          await this.repository.update(reminder.id, { notification_id: notificationId });
        } catch {
          // Non-fatal — local notification still fires even if DB update fails
        }
      }

      return notificationId;
    } catch (err) {
      console.warn('[ReminderService] scheduleLocalNotification:', err);
      return null;
    }
  }

  async cancelLocalNotification(notificationId?: string | null) {
    if (!notificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.warn('[ReminderService] cancelLocalNotification:', err);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  private normalizePayload(
    payload: Partial<ReminderListItem> | Record<string, unknown>,
  ): Record<string, unknown> {
    const next = { ...payload } as Record<string, unknown>;

    // Normalise repeat value to what the DB expects
    if (typeof next.repeat === 'string') {
      next.repeat =
        next.repeat.toLowerCase() === 'once' ? 'none' : next.repeat.toLowerCase();
    }

    // Derive scheduled_at from human-readable date + time if not provided
    if (!next.scheduled_at && typeof next.date === 'string') {
      next.scheduled_at = this.toScheduledAt(
        next.date,
        typeof next.time === 'string' ? next.time : undefined,
      );
    }

    return next;
  }

  private toScheduledAt(dateValue: string, timeValue = '09:00 AM'): string {
    const date      = dateValue.trim();
    const time      = timeValue.trim();
    const ddmmyyyy  = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const yyyymmdd  = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const timeMatch = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);

    let year: number, month: number, day: number;

    if (ddmmyyyy) {
      day   = Number(ddmmyyyy[1]);
      month = Number(ddmmyyyy[2]) - 1;
      year  = Number(ddmmyyyy[3]);
    } else if (yyyymmdd) {
      year  = Number(yyyymmdd[1]);
      month = Number(yyyymmdd[2]) - 1;
      day   = Number(yyyymmdd[3]);
    } else {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
      year  = parsed.getFullYear();
      month = parsed.getMonth();
      day   = parsed.getDate();
    }

    let hour       = timeMatch ? Number(timeMatch[1]) : 9;
    const minute   = timeMatch?.[2] ? Number(timeMatch[2]) : 0;
    const meridiem = timeMatch?.[3]?.toUpperCase();

    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;

    return new Date(year, month, day, hour, minute).toISOString();
  }
}

export const reminderService = new ReminderService();
