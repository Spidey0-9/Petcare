export class AppError extends Error {
  code?: string;
  status?: number;
  hint?: string | null;
  details?: unknown;
  category?: DatabaseErrorCategory;

  constructor(
    message: string,
    code?: string,
    details?: unknown,
    category?: DatabaseErrorCategory,
    status?: number,
    hint?: string | null,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.category = category;
    this.status = status;
    this.hint = hint;
  }
}

export type DatabaseErrorCategory =
  | 'table_not_found'
  | 'schema_mismatch'
  | 'permission_denied'
  | 'rls_denied'
  | 'validation_error'
  | 'authentication_error'
  | 'network_error'
  | 'not_found'
  | 'unknown';

export type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: unknown;
  hint?: string | null;
  status?: number;
};

export function getSupabaseErrorInfo(error: unknown): SupabaseErrorLike {
  if (!error || typeof error !== 'object') return {};
  const candidate = error as SupabaseErrorLike;
  return {
    code: candidate.code,
    message: candidate.message,
    details: candidate.details,
    hint: candidate.hint,
    status: candidate.status,
  };
}

export function classifySupabaseError(error: unknown): DatabaseErrorCategory {
  const info = getSupabaseErrorInfo(error);
  const code = String(info.code ?? '');
  const message = String(info.message ?? '').toLowerCase();
  const details = String(info.details ?? '').toLowerCase();
  const combined = `${message} ${details}`;

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    combined.includes('could not find the table') ||
    combined.includes('relation does not exist') ||
    (combined.includes('relation "') && combined.includes('" does not exist'))
  ) {
    return 'table_not_found';
  }

  if (
    code === 'PGRST200' ||
    code === 'PGRST204' ||
    combined.includes('schema cache') ||
    combined.includes('could not find the') ||
    combined.includes('relationship') ||
    combined.includes('column')
  ) {
    return 'schema_mismatch';
  }

  if (code === '42501' || combined.includes('permission denied') || combined.includes('not authorized')) {
    return 'permission_denied';
  }

  if (combined.includes('row-level security') || combined.includes('violates row-level security')) {
    return 'rls_denied';
  }

  if (code === 'PGRST116' || combined.includes('0 rows')) {
    return 'not_found';
  }

  if (
    code === '23502' ||
    code === '23503' ||
    code === '23505' ||
    code === '23514' ||
    code === '22P02' ||
    code === '22001'
  ) {
    return 'validation_error';
  }

  if (
    combined.includes('jwt') ||
    combined.includes('session') ||
    combined.includes('not authenticated') ||
    combined.includes('auth')
  ) {
    return 'authentication_error';
  }

  if (
    combined.includes('fetch') ||
    combined.includes('network') ||
    combined.includes('timeout') ||
    combined.includes('failed to connect')
  ) {
    return 'network_error';
  }

  return 'unknown';
}

export function describeDatabaseError(error: unknown, fallback = 'Database request failed.') {
  const info = getSupabaseErrorInfo(error);
  const category = classifySupabaseError(error);

  switch (category) {
    case 'table_not_found':
      return 'A required database table is missing. Please apply the latest Supabase migrations.';
    case 'schema_mismatch':
      return 'The app and Supabase schema do not match. Please apply the latest migration and reload the Supabase schema cache.';
    case 'permission_denied':
      return 'The database rejected this request because of insufficient permissions.';
    case 'rls_denied':
      return 'The database rejected this request because the row ownership policy did not allow it.';
    case 'validation_error':
      return info.message || 'The submitted data failed database validation.';
    case 'authentication_error':
      return 'Your session could not be verified. Please sign in again.';
    case 'network_error':
      return 'Unable to reach Supabase. Please check your connection and try again.';
    case 'not_found':
      return info.message || 'The requested record was not found.';
    default:
      return info.message || fallback;
  }
}

export function toAppError(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof AppError) return error;

  if (error && typeof error === 'object') {
    const candidate = getSupabaseErrorInfo(error);
    return new AppError(
      describeDatabaseError(error, fallback),
      candidate.code,
      candidate.details,
      classifySupabaseError(error),
      candidate.status,
      candidate.hint,
    );
  }

  return new AppError(fallback);
}

export function throwIfError(error: unknown, fallback?: string): asserts error is null | undefined {
  if (error) throw toAppError(error, fallback);
}
