import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { supabase } from '../../core/services/supabase';
import { TABLES } from '../../constants';
import { logDatabaseFailure } from '../database/databaseDiagnostics';
import type { UserRole } from '../../types';

export type LoginMethod = 'password' | 'phone_otp' | 'google' | 'apple' | 'biometric';
export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditLogInput = {
  actorId?: string | null;
  actorRole?: UserRole | string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
};

function deviceName() {
  return Constants.deviceName ?? `${Platform.OS} device`;
}

function appVersion() {
  return Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? 'unknown';
}

function fingerprint(userId?: string | null) {
  const installationId = Constants.sessionId ?? Constants.installationId ?? 'petcare-device';
  return `${Platform.OS}:${installationId}:${userId ?? 'anonymous'}`;
}

export class AuthSecurityService {
  async ensureSettings(userId: string, role?: UserRole | string | null) {
    const sessionTimeout = role === 'super_admin' || role === 'admin' ? 30 : role === 'doctor' || role === 'groomer' ? 480 : 1440;
    const { error } = await supabase.from(TABLES.userSecuritySettings).upsert({
      user_id: userId,
      mfa_required: role === 'doctor' || role === 'groomer' || role === 'admin' || role === 'super_admin',
      session_timeout_minutes: sessionTimeout,
    }, { onConflict: 'user_id' });

    if (error) {
      await logDatabaseFailure({ module: 'AuthSecurityService', table: TABLES.userSecuritySettings, operation: 'ensureSettings' }, error);
    }
  }

  async recordDevice(userId: string, trusted = true) {
    const { error } = await supabase.from(TABLES.authDevices).upsert({
      user_id: userId,
      device_name: deviceName(),
      platform: Platform.OS,
      app_version: appVersion(),
      device_fingerprint: fingerprint(userId),
      trusted,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    }, { onConflict: 'user_id,device_fingerprint' });

    if (error) {
      await logDatabaseFailure({ module: 'AuthSecurityService', table: TABLES.authDevices, operation: 'recordDevice' }, error);
    }
  }

  async recordLogin(input: { userId?: string | null; email?: string | null; method: LoginMethod; success: boolean; role?: UserRole | string | null; failureReason?: string | null }) {
    const { error } = await supabase.from(TABLES.authLoginHistory).insert({
      user_id: input.userId ?? null,
      email: input.email ?? null,
      login_method: input.method,
      success: input.success,
      failure_reason: input.failureReason ?? null,
      role: input.role ?? null,
      device_name: deviceName(),
      platform: Platform.OS,
      user_agent: `PetCare+/${appVersion()} (${Platform.OS})`,
    });

    if (error) {
      await logDatabaseFailure({ module: 'AuthSecurityService', table: TABLES.authLoginHistory, operation: 'recordLogin' }, error);
    }
  }

  async listDevices(userId: string) {
    const { data, error } = await supabase
      .from(TABLES.authDevices)
      .select('*')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false });

    if (error) {
      await logDatabaseFailure({ module: 'AuthSecurityService', table: TABLES.authDevices, operation: 'listDevices' }, error);
      return [];
    }

    return data ?? [];
  }

  async listLoginHistory(userId: string) {
    const { data, error } = await supabase
      .from(TABLES.authLoginHistory)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      await logDatabaseFailure({ module: 'AuthSecurityService', table: TABLES.authLoginHistory, operation: 'listLoginHistory' }, error);
      return [];
    }

    return data ?? [];
  }

  async recordAudit(input: AuditLogInput) {
    const { error } = await supabase.from(TABLES.auditLogs).insert({
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
      severity: input.severity ?? 'info',
    });

    if (error) {
      await logDatabaseFailure({ module: 'AuthSecurityService', table: TABLES.auditLogs, operation: 'recordAudit' }, error);
    }
  }

  async updateBiometricSetting(userId: string, enabled: boolean) {
    const { error } = await supabase
      .from(TABLES.userSecuritySettings)
      .upsert({ user_id: userId, biometric_enabled: enabled, preferred_login_method: enabled ? 'biometric' : 'password' }, { onConflict: 'user_id' });

    if (error) {
      await logDatabaseFailure({ module: 'AuthSecurityService', table: TABLES.userSecuritySettings, operation: 'updateBiometricSetting' }, error);
    }
  }
}

export const authSecurityService = new AuthSecurityService();

