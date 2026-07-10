import { supabase } from '../../core/services/supabase';
import { TABLES } from '../../constants';
import {
  classifySupabaseError,
  getSupabaseErrorInfo,
  type DatabaseErrorCategory,
} from '../errors';

type DatabaseFailureContext = {
  module: string;
  table?: string;
  operation: string;
  query?: string;
  schema?: string;
};

export type DatabaseHealthResult = {
  ok: boolean;
  missingTables: string[];
  failedChecks: Array<{ table: string; category: DatabaseErrorCategory; message?: string; code?: string }>;
};

const REQUIRED_TABLES = [
  TABLES.profiles,
  TABLES.doctors,
  TABLES.pets,
  TABLES.appointments,
  TABLES.reminders,
  TABLES.products,
  'memberships',
] as const;

export function getSupabaseProjectInfo() {
  const projectUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  let projectRef = '';

  try {
    projectRef = new URL(projectUrl).hostname.split('.')[0] ?? '';
  } catch {
    projectRef = '';
  }

  return {
    projectUrl,
    projectRef,
    authUrl: projectUrl ? `${projectUrl}/auth/v1` : '',
    restUrl: projectUrl ? `${projectUrl}/rest/v1` : '',
  };
}

export async function logDatabaseFailure(context: DatabaseFailureContext, error: unknown) {
  const info = getSupabaseErrorInfo(error);
  const category = classifySupabaseError(error);
  const project = getSupabaseProjectInfo();
  let userId: string | null = null;

  try {
    const { data } = await supabase.auth.getSession();
    userId = data.session?.user.id ?? null;
  } catch {
    userId = null;
  }

  console.error('[DatabaseFailure]', {
    module: context.module,
    table: context.table,
    operation: context.operation,
    query: context.query,
    schema: context.schema ?? 'public',
    category,
    status: info.status,
    code: info.code,
    message: info.message,
    hint: info.hint,
    details: info.details,
    projectUrl: project.projectUrl,
    projectRef: project.projectRef,
    userId,
  });
}

export async function runDatabaseHealthCheck(): Promise<DatabaseHealthResult> {
  const missingTables: string[] = [];
  const failedChecks: DatabaseHealthResult['failedChecks'] = [];

  await Promise.all(REQUIRED_TABLES.map(async table => {
    const { error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (!error) return;

    const category = classifySupabaseError(error);
    const info = getSupabaseErrorInfo(error);

    if (category === 'table_not_found') {
      missingTables.push(table);
    }

    failedChecks.push({
      table,
      category,
      message: info.message,
      code: info.code,
    });
  }));

  return {
    ok: missingTables.length === 0,
    missingTables,
    failedChecks,
  };
}
