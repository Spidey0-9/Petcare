﻿import { supabase } from '../../core/services/supabase';
import { SupabaseRepository } from '../../repositories';
import { TABLES, STORAGE_BUCKETS } from '../../constants';
import type { ProfileRecord } from '../../types';
import { throwIfError } from '../errors';
import { storageService } from '../storage';
import { logDatabaseFailure } from '../database/databaseDiagnostics';

export type ProfileStats = {
  totalPets: number;
  totalOrders: number;
  totalSpent: number;
  upcomingAppointments: number;
  totalPosts: number;
};

export type ProfileOrder = {
  id: string;
  status?: string | null;
  total?: number | null;
  created_at?: string | null;
  items?: unknown;
};

export type ProfilePayment = {
  id: string;
  method?: string | null;
  status?: string | null;
  amount?: number | null;
  created_at?: string | null;
};

export class ProfileService {
  private readonly repository = new SupabaseRepository<ProfileRecord>(TABLES.profiles);

  /**
   * Retrieves a single user profile by its ID.
   * @param id The UUID of the user profile to retrieve.
   * @returns A promise that resolves with the profile record or an error.
   */
  getProfile(id: string) {
    return this.repository.getById(id);
  }

  /**
   * Updates a user's profile.
   * @param id The ID of the profile to update.
   * @param payload An object containing the fields to update.
   * @returns A promise that resolves with the updated profile or an error.
   */
  updateProfile(id: string, payload: Partial<ProfileRecord> | Record<string, unknown>) {
    return this.repository.update(id, payload);
  }

  /**
   * Uploads a new avatar for a user and updates their profile with the new URL.
   * @param userId The ID of the user.
   * @param file The file to upload, containing a local URI, file name, and MIME type.
   * @returns The public URL of the uploaded avatar.
   */
  async uploadProfileImage(
    userId: string,
    file: { uri: string; fileName?: string | null; mimeType?: string | null },
  ) {
    const avatarUrl = await storageService.uploadFile(STORAGE_BUCKETS.profileImages, userId, file);
    await this.updateProfile(userId, { avatar_url: avatarUrl });
    return avatarUrl;
  }

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Every sub-query is fully isolated.  A missing table, missing column,
  // or any other Supabase error returns 0 / [] so the profile screen
  // always renders rather than crashing.

  /**
   * Aggregates various statistics for a user's profile screen.
   * All sub-queries are designed to fail silently (returning 0 or empty array) to prevent the profile screen from crashing.
   * @param userId The ID of the user.
   * @returns An object containing user statistics.
   */
  async getStats(userId: string): Promise<ProfileStats> {
    const [pets, orders, appointments, posts] = await Promise.all([
      this.safeCount(TABLES.pets,  'owner_id', userId),
      this.safeListOrders(userId),
      this.safeCountUpcomingAppointments(userId),
      this.safeCount(TABLES.posts, 'user_id',  userId),
    ]);

    return {
      totalPets:              pets,
      totalOrders:            orders.length,
      totalSpent:             orders.reduce((s, o) => s + Number(o.total ?? 0), 0),
      upcomingAppointments:   appointments,
      totalPosts:             posts,
    };
  }

  /**
   * Retrieves a list of orders for a specific user.
   * @param userId The ID of the user.
   * @returns An array of the user's orders.
   * @throws {AppError} If the database query fails.
   */
  async listOrders(userId: string): Promise<ProfileOrder[]> {
    const { data, error } = await supabase
      .from(TABLES.orders)
      .select('id,status,total,items,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    throwIfError(error, 'Unable to load order history.');
    return data ?? [];
  }

  /**
   * Retrieves a list of payments made by a specific user.
   * @param userId The ID of the user.
   * @returns An array of the user's payments.
   * @throws {AppError} If the database query fails.
   */
  async listPayments(userId: string): Promise<ProfilePayment[]> {
    const { data, error } = await supabase
      .from(TABLES.payments)
      .select('id,method,status,amount,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    throwIfError(error, 'Unable to load payment methods.');
    return data ?? [];
  }

  /**
   * Signs the current user out.
   * This is a placeholder for a full account deletion flow.
   */
  async deleteAccount() {
    await supabase.auth.signOut();
  }

  // â”€â”€ Private safe helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async safeListOrders(userId: string): Promise<ProfileOrder[]> {
    try {
      return await this.listOrders(userId);
    } catch (err) {
      void logDatabaseFailure({ module: 'ProfileService', table: TABLES.orders, operation: 'safeListOrders', query: 'list orders for profile stats' }, err);
      return [];
    }
  }

  private async safeCount(table: string, column: string, value: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq(column, value);

      // Treat any error (missing table, RLS, network) as 0 â€” never crash
      if (error) {
        void logDatabaseFailure({ module: 'ProfileService', table, operation: 'safeCount', query: 'count rows for profile stats' }, error);
        return 0;
      }

      return count ?? 0;
    } catch (err) {
      void logDatabaseFailure({ module: 'ProfileService', table, operation: 'safeCountUnexpected', query: 'count rows for profile stats' }, err);
      return 0;
    }
  }

  private async safeCountUpcomingAppointments(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(TABLES.appointments)
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .gte('scheduled_at', new Date().toISOString())
        .not('status', 'in', '(cancelled,rejected,completed)');

      if (error) {
        void logDatabaseFailure({ module: 'ProfileService', table: TABLES.appointments, operation: 'safeCountUpcomingAppointments', query: 'count upcoming appointments for profile stats' }, error);
        return 0;
      }

      return count ?? 0;
    } catch (err) {
      void logDatabaseFailure({ module: 'ProfileService', table: TABLES.appointments, operation: 'safeCountUpcomingAppointmentsUnexpected', query: 'count upcoming appointments for profile stats' }, err);
      return 0;
    }
  }
}

export const profileService = new ProfileService();
