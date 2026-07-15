import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../core/services/supabase';
import { TABLES } from '../../constants';
import { throwIfError } from '../errors';
import { authSecurityService } from '../security';
import type { DoctorRecord, ProfileRecord, UserRole } from '../../types';

// Ã¢â€â‚¬Ã¢â€â‚¬ AsyncStorage keys Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const TUTORIAL_KEY = 'tutorial_completed_v1';

// Ã¢â€â‚¬Ã¢â€â‚¬ Types Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

type RegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  doctor?: Omit<DoctorRecord, 'id' | 'profile_id'>;
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const SUPPORTED_SIGNUP_ROLES: UserRole[] = ['pet_owner', 'doctor', 'groomer'];
const SUPPORTED_PROFILE_ROLES: UserRole[] = ['pet_owner', 'doctor', 'groomer', 'admin', 'super_admin'];

function isSupportedSignupRole(role: UserRole) {
  return SUPPORTED_SIGNUP_ROLES.includes(role);
}

function isSupportedProfileRole(role: unknown): role is UserRole {
  return typeof role === 'string' && SUPPORTED_PROFILE_ROLES.includes(role as UserRole);
}

function roleFromUserMetadata(user: User): UserRole | null {
  const role = user.user_metadata?.role;
  return isSupportedProfileRole(role) ? role : null;
}

function profileFromUser(user: User, roleOverride?: UserRole): ProfileRecord {
  const metadata = user.user_metadata ?? {};
  const role = roleOverride ?? roleFromUserMetadata(user);
  if (!role) {
    throw new Error('Unable to determine user role from profile metadata.');
  }

  return {
    id:        user.id,
    email:     user.email ?? null,
    full_name: typeof metadata.full_name === 'string' ? metadata.full_name : '',
    phone:     typeof metadata.phone     === 'string' ? metadata.phone     : null,
    role,
  };
}

// Ã¢â€â‚¬Ã¢â€â‚¬ AuthService Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export class AuthService {

  // Ã¢â€â‚¬Ã¢â€â‚¬ Core sign-in / sign-up Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async signInWithEmail(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (error) {
      await authSecurityService.recordLogin({
        email: normalizedEmail,
        method: 'password',
        success: false,
        failureReason: error.message,
      });
      throwIfError(error, 'Invalid email or password.');
    }

    if (data.user) {
      const profile = await this.ensureProfileForUser(data.user);
      await Promise.all([
        authSecurityService.ensureSettings(data.user.id, profile.role),
        authSecurityService.recordDevice(data.user.id, true),
        authSecurityService.recordLogin({
          userId: data.user.id,
          email: normalizedEmail,
          method: 'password',
          success: true,
          role: profile.role,
        }),
        authSecurityService.recordAudit({
          actorId: data.user.id,
          actorRole: profile.role,
          action: 'auth.login',
          entityType: 'profile',
          entityId: data.user.id,
          metadata: { method: 'password' },
        }),
      ]);
    }

    return data;
  }

  async registerWithEmail(payload: RegisterPayload) {
    if (!isSupportedSignupRole(payload.role)) {
      throw new Error('Only pet owner, doctor, and groomer accounts can be created from the app.');
    }

    const { data, error } = await supabase.auth.signUp({
      email:    payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          phone:     payload.phone ?? null,
          role:      payload.role,
        },
      },
    });
    throwIfError(error, 'Unable to create account.');

    // Create profile row immediately if session is available (email confirmation disabled)
    if (data.user && data.session) {
      await this.ensureProfileForUser(data.user, {
        full_name: payload.fullName,
        phone:     payload.phone ?? null,
        role:      payload.role,
      });

      if (payload.role === 'doctor' && payload.doctor) {
        await this.upsertDoctorProfile(data.user.id, payload.doctor);
      }
    }

    return data;
  }

  async signInWithGoogle(redirectTo?: string) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  redirectTo ? { redirectTo } : undefined,
    });
    throwIfError(error, 'Unable to start Google login.');
    return data;
  }

  async setSessionFromOAuthUrl(callbackUrl: string) {
    const [, fragment = ''] = callbackUrl.split('#');
    const query = callbackUrl.includes('?') ? callbackUrl.split('?')[1]?.split('#')[0] ?? '' : '';
    const params = new URLSearchParams(fragment || query);
    const errorDescription = params.get('error_description') ?? params.get('error');
    if (errorDescription) throw new Error(errorDescription);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) {
      throw new Error('Google login did not return a valid session. Please try again.');
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    throwIfError(error, 'Unable to complete Google login.');

    if (data.user) {
      const profile = await this.ensureProfileForUser(data.user);
      await Promise.all([
        authSecurityService.ensureSettings(data.user.id, profile.role),
        authSecurityService.recordDevice(data.user.id, true),
        authSecurityService.recordLogin({
          userId: data.user.id,
          email: data.user.email ?? undefined,
          method: 'google',
          success: true,
          role: profile.role,
        }),
        authSecurityService.recordAudit({
          actorId: data.user.id,
          actorRole: profile.role,
          action: 'auth.login',
          entityType: 'profile',
          entityId: data.user.id,
          metadata: { method: 'google' },
        }),
      ]);
    }

    return data;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Password management Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async sendPasswordReset(email: string, redirectTo?: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    );
    throwIfError(error, 'Unable to send password reset email.');
    return data;
  }

  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password });
    throwIfError(error, 'Unable to update password.');
    return data;
  }

  async updateEmail(email: string) {
    const { data, error } = await supabase.auth.updateUser({ email });
    throwIfError(error, 'Unable to update email.');
    return data;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Session Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) { console.warn('[AuthService] getSession:', error.message); return null; }
      return data.session ?? null;
    } catch (err) {
      console.warn('[AuthService] getSession unexpected error:', err);
      return null;
    }
  }

  async getCurrentUser() {
    try {
      const session = await this.getSession();
      if (!session?.user) return null;
      const { data, error } = await supabase.auth.getUser();
      if (error) { console.warn('[AuthService] getUser:', error.message); return null; }
      return data.user ?? null;
    } catch (err) {
      console.warn('[AuthService] getCurrentUser unexpected error:', err);
      return null;
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Profile Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async getCurrentProfile(): Promise<ProfileRecord | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) { console.warn('[AuthService] getCurrentProfile Supabase error:', error); return null; }
      if (data)  return data as ProfileRecord;
      return await this.ensureProfileForUser(user);
    } catch (err) {
      console.warn('[AuthService] getCurrentProfile unexpected error:', err);
      return null;
    }
  }

  async ensureProfileForUser(user: User, overrides: Partial<ProfileRecord> = {}) {
    // Ã¢â€â‚¬Ã¢â€â‚¬ Step 1: check whether a profile row already exists Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // We MUST NOT overwrite an existing `role` with a metadata-derived
    // default.  The DB row is the source of truth after initial creation.
    // Example failure mode: a doctor account created by the admin script may
    // not have `user_metadata.role = 'doctor'`, so `profileFromUser` falls
    // back to 'pet_owner' and a plain upsert would silently demote the doctor.
    try {
      const { data: existing } = await supabase
        .from(TABLES.profiles)
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (existing?.id) {
        // Row already exists Ã¢â‚¬â€ only patch explicitly-provided fields.
        // Never overwrite role, full_name, etc. from stale metadata.
        const patch: Record<string, unknown> = { email: user.email ?? null };
        if (overrides.full_name !== undefined) patch.full_name = overrides.full_name;
        if (overrides.phone     !== undefined) patch.phone     = overrides.phone;
        // Only allow role to be patched when the override is a valid role AND
        // the current DB role is still the default sentinel 'pet_owner'.
        if (
          overrides.role !== undefined &&
          isSupportedSignupRole(overrides.role) &&
          existing.role === 'pet_owner'
        ) {
          patch.role = overrides.role;
        }
        if (overrides.avatar_url !== undefined) patch.avatar_url = overrides.avatar_url;

        const { data, error } = await supabase
          .from(TABLES.profiles)
          .update(patch)
          .eq('id', user.id)
          .select('*')
          .single();

        if (!error && data) return data as ProfileRecord;
        // Fall through to full upsert if update somehow failed
      }
    } catch (err) {
      console.warn('[AuthService] ensureProfileForUser existence check failed:', err);
      // Fall through to upsert if existence check fails
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ Step 2: no row yet Ã¢â‚¬â€ create it from metadata + overrides Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    const profile = {
      ...profileFromUser(user, overrides.role),
      ...overrides,
      id:    user.id,
      email: overrides.email ?? user.email ?? null,
    } satisfies ProfileRecord;
    return this.upsertProfile(profile);
  }

  async updateCurrentProfile(payload: Partial<ProfileRecord> & Record<string, unknown>) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Login required.');

    const existing = await this.getCurrentProfile();

    // Build upsert payload Ã¢â‚¬â€ preserve any extra columns passed in (address, city, etc.)
    const upsertPayload: ProfileRecord & Record<string, unknown> = {
      id:         user.id,
      email:      user.email ?? existing?.email ?? null,
      full_name:  payload.full_name  ?? existing?.full_name  ?? profileFromUser(user, existing?.role).full_name,
      phone:      payload.phone      ?? existing?.phone      ?? null,
      role:       payload.role       ?? existing?.role       ?? roleFromUserMetadata(user) ?? (() => { throw new Error('Unable to determine user role.'); })(),
      avatar_url: payload.avatar_url ?? existing?.avatar_url ?? null,
    };

    // Carry through any extra fields (address, city, state, pincode, emergency_contact)
    const knownKeys = new Set(['id', 'email', 'full_name', 'phone', 'role', 'avatar_url']);
    for (const key of Object.keys(payload)) {
      if (!knownKeys.has(key)) upsertPayload[key] = payload[key];
    }

    return this.upsertProfile(upsertPayload as ProfileRecord);
  }

  async updateCurrentRole(role: UserRole) {
    if (!isSupportedSignupRole(role)) {
      throw new Error('Only pet owner, doctor, and groomer roles can be selected in the app.');
    }
    const { error } = await supabase.auth.updateUser({ data: { role } });
    throwIfError(error, 'Unable to update account role.');
    return this.updateCurrentProfile({ role });
  }

  async upsertProfile(profile: ProfileRecord) {
    const { data, error } = await supabase
      .from(TABLES.profiles)
      .upsert(profile, { onConflict: 'id' })
      .select('*')
      .single();
    throwIfError(error, 'Unable to save profile.');
    return data as ProfileRecord;
  }

  async upsertDoctorProfile(profileId: string, doctor: Omit<DoctorRecord, 'id' | 'profile_id'> = {}) {
    const { data, error } = await supabase
      .from(TABLES.doctors)
      .upsert({ profile_id: profileId, ...doctor }, { onConflict: 'profile_id' })
      .select('*')
      .single();
    throwIfError(error, 'Unable to save doctor profile.');
    return data as DoctorRecord;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Phone OTP verification Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  /**
   * Send an OTP to the given 10-digit Indian mobile number via Supabase Phone Auth.
   * Requires "Phone" provider enabled in Supabase Auth settings.
   * The phone number is normalised to E.164 (+91XXXXXXXXXX) before calling Supabase.
   */
  async sendPhoneOtp(phone: string) {
    throw new Error('Phone OTP login has been disabled. Please use email verification.');
  }

  async verifyPhoneOtp(phone: string, token: string) {
    throw new Error('Phone OTP login has been disabled. Please use email verification.');
  }

  async isPhoneVerified(): Promise<boolean> {
    return false;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Email verification Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  /**
   * Check whether the current user's email address has been confirmed.
   * Calls supabase.auth.getUser() to get the freshest server-side state.
   */
  async checkEmailVerified(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return false;
      return !!data.user.email_confirmed_at;
    } catch {
      return false;
    }
  }

  /**
   * Ask Supabase to resend the email confirmation link to the given address.
   * Uses the OTP email flow which works even when the user is not yet confirmed.
   */
  async resendVerificationEmail(email: string) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    throwIfError(error, 'Unable to resend verification email. Please try again later.');
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Tutorial state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  /** Returns true if the user has already completed the first-time tutorial. */
  async isTutorialCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(TUTORIAL_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  /** Mark the tutorial as completed so it is never shown again. */
  async markTutorialCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
    } catch (err) {
      console.warn('[AuthService] markTutorialCompleted:', err);
    }
  }

  /** Reset tutorial flag (for testing / re-onboarding). */
  async resetTutorial(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TUTORIAL_KEY);
    } catch (err) {
      console.warn('[AuthService] resetTutorial:', err);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Auth state subscription Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback).data.subscription;
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Sign-out Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  async clearLocalSession() {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('[AuthService] clearLocalSession error:', err);
    }
  }

  async signOut() {
    try {
      const profile = await this.getCurrentProfile();
      if (profile?.id) {
        await authSecurityService.recordAudit({
          actorId: profile.id,
          actorRole: profile.role,
          action: 'auth.logout',
          entityType: 'profile',
          entityId: profile.id,
        });
      }
      await supabase.auth.signOut();
    } catch (err) {
      await this.clearLocalSession();
      console.warn('[AuthService] signOut error (session cleared locally):', err);
    }
  }


  async signOutOtherDevices() {
    const profile = await this.getCurrentProfile();
    if (profile?.id) {
      await authSecurityService.recordAudit({
        actorId: profile.id,
        actorRole: profile.role,
        action: 'auth.logout_other_devices',
        entityType: 'profile',
        entityId: profile.id,
        severity: 'warning',
      });
    }
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    throwIfError(error, 'Unable to log out other devices.');
  }

  async signOutAllDevices() {
    const profile = await this.getCurrentProfile();
    if (profile?.id) {
      await authSecurityService.recordAudit({
        actorId: profile.id,
        actorRole: profile.role,
        action: 'auth.logout_all_devices',
        entityType: 'profile',
        entityId: profile.id,
        severity: 'warning',
      });
    }
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    throwIfError(error, 'Unable to log out all devices.');
  }
  // Private helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  /** Convert a 10-digit Indian mobile number to E.164 format (+91XXXXXXXXXX). */
  private toE164(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // Already E.164 with country code
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
    // Plain 10-digit
    if (digits.length === 10) return `+91${digits}`;
    // Return as-is with + prefix (let Supabase validate)
    return `+${digits}`;
  }
}

export const authService = new AuthService();
