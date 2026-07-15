import { supabase } from '../../core/services/supabase';
import { STORAGE_BUCKETS, TABLES } from '../../constants';
import { getRealtimeRegistrySnapshot, REALTIME_TABLES } from '../realtime';
import { getSupabaseProjectInfo, logDatabaseFailure, runDatabaseHealthCheck } from '../database/databaseDiagnostics';
import { getSupabaseErrorInfo } from '../errors';

export type AdminStatus = 'ok' | 'warning' | 'error';

export type AdminTableKey = keyof typeof TABLES;

export type AdminTableSummary = {
  key: AdminTableKey;
  table: string;
  label: string;
  module: string;
  count: number;
  status: AdminStatus;
  errorMessage?: string;
};

export type AdminKpi = {
  id: string;
  label: string;
  value: number;
  helper: string;
  status: AdminStatus;
};

export type AdminHealthItem = {
  id: string;
  label: string;
  status: AdminStatus;
  value: string;
  detail: string;
};

export type AdminAuditEvent = {
  id: string;
  module: string;
  event: string;
  table: string;
  recordId: string;
  timestamp: string;
  actor: string;
};

export type AdminFailedOperation = {
  id: string;
  entityType: string;
  operation: string;
  status: string;
  timestamp: string;
};

export type AdminDashboardData = {
  profileName: string;
  role: string;
  kpis: AdminKpi[];
  tables: AdminTableSummary[];
  health: AdminHealthItem[];
  auditEvents: AdminAuditEvent[];
  failedOperations: AdminFailedOperation[];
};

export type AdminDashboardPatch = {
  tables: AdminTableSummary[];
  kpis: AdminKpi[];
};

export type AdminSearchResult = {
  id: string;
  table: string;
  module: string;
  label: string;
  subtitle: string;
  recordId: string;
  timestamp?: string;
};

export type AdminManagementAction = 'approve' | 'reject' | 'suspend' | 'activate' | 'deactivate' | 'cancel' | 'refund' | 'soft_delete' | 'reset_password';

export type AdminActionInput = {
  table: string;
  recordId: string;
  action: AdminManagementAction;
  reason?: string;
};

const ADMIN_TABLES: Array<{ key: AdminTableKey; label: string; module: string }> = [
  { key: 'profiles', label: 'Users & Roles', module: 'User Management' },
  { key: 'doctors', label: 'Doctors', module: 'Doctor Management' },
  { key: 'groomers', label: 'Groomers', module: 'Groomer Management' },
  { key: 'clinics', label: 'Clinics & Hospitals', module: 'Hospital Management' },
  { key: 'groomingClinics', label: 'Grooming Clinics', module: 'Groomer Management' },
  { key: 'pets', label: 'Pets', module: 'Pet Management' },
  { key: 'appointments', label: 'Appointments', module: 'Appointment Management' },
  { key: 'groomingBookings', label: 'Grooming Bookings', module: 'Groomer Management' },
  { key: 'medicalRecords', label: 'Medical Records', module: 'Medical Records' },
  { key: 'vaccinations', label: 'Vaccinations', module: 'Medical Records' },
  { key: 'petHealthLogs', label: 'Pet Health Logs', module: 'Pet Management' },
  { key: 'payments', label: 'Payments', module: 'Payment Management' },
  { key: 'invoices', label: 'Invoices', module: 'Payment Management' },
  { key: 'memberships', label: 'Memberships', module: 'Membership Management' },
  { key: 'orders', label: 'Orders', module: 'Shop Management' },
  { key: 'products', label: 'Shop Products', module: 'Shop Management' },
  { key: 'categories', label: 'Shop Categories', module: 'Shop Management' },
  { key: 'wishlist', label: 'Wishlists', module: 'Shop Management' },
  { key: 'cart', label: 'Carts', module: 'Shop Management' },
  { key: 'posts', label: 'Community Posts', module: 'Community Management' },
  { key: 'comments', label: 'Community Comments', module: 'Community Management' },
  { key: 'likes', label: 'Community Likes', module: 'Community Management' },
  { key: 'notifications', label: 'Notifications', module: 'Notification Management' },
  { key: 'aiPredictions', label: 'AI Predictions', module: 'AI Management' },
  { key: 'reviews', label: 'Reviews', module: 'Review Management' },
  { key: 'favorites', label: 'Favorites', module: 'User Management' },
  { key: 'savedClinics', label: 'Saved Clinics', module: 'User Management' },
  { key: 'messages', label: 'Messages', module: 'Messaging' },
  { key: 'authDevices', label: 'Device Tracking', module: 'Security' },
  { key: 'authLoginHistory', label: 'Login History', module: 'Security' },
  { key: 'userSecuritySettings', label: 'Security Settings', module: 'Security' },
  { key: 'auditLogs', label: 'Audit Logs', module: 'Audit Logs' },
  { key: 'offlineSyncQueue', label: 'Failed Operations Queue', module: 'System' },
];

const CRITICAL_STORAGE_BUCKETS = Object.values(STORAGE_BUCKETS);
const EDGE_FUNCTIONS = ['create-payment-session', 'verify-payment-session'];
const RPC_FUNCTIONS = ['get_current_doctor_profile', 'update_own_doctor', 'get_doctor_dashboard_stats'];
const PAID_PAYMENT_STATUSES = ['completed', 'paid', 'success', 'captured'];

function titleFromKey(value: string) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
}

function statusFromError(errorMessage?: string): AdminStatus {
  return errorMessage ? 'error' : 'ok';
}

function eventLabel(table: string) {
  if (table === TABLES.profiles) return 'Profile activity';
  if (table === TABLES.appointments) return 'Appointment activity';
  if (table === TABLES.groomingBookings) return 'Grooming booking activity';
  if (table === TABLES.payments) return 'Payment activity';
  if (table === TABLES.orders) return 'Order activity';
  if (table === TABLES.posts) return 'Community activity';
  if (table === TABLES.notifications) return 'Notification activity';
  return 'CRUD activity';
}

function readRowString(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === 'string' ? value : '';
}

function readRecordId(row: Record<string, unknown>) {
  const id = row.id;
  return typeof id === 'string' ? id : 'unknown';
}

function readAmount(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function readRowArray(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return Array.isArray(value) ? value.map(item => String(item)).join(', ') : '';
}

function escapeSearchTerm(value: string) {
  return value.replace(/[%_,]/g, '').trim();
}

function makeSearchResult(input: {
  table: string;
  module: string;
  row: Record<string, unknown>;
  label: string;
  subtitle: string;
  timestamp?: string;
}): AdminSearchResult {
  const recordId = readRecordId(input.row);
  return {
    id: `${input.table}-${recordId}`,
    table: input.table,
    module: input.module,
    label: input.label || recordId,
    subtitle: input.subtitle,
    recordId,
    timestamp: input.timestamp,
  };
}

async function searchProfiles(term: string) {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select('id,full_name,email,role,created_at')
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,role.ilike.%${term}%`)
    .limit(12);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.profiles, operation: 'searchProfiles', query: 'profile global search' }, error);
    return [] as AdminSearchResult[];
  }

  return (data ?? []).map((row: Record<string, unknown>) => makeSearchResult({
    table: TABLES.profiles,
    module: 'User Management',
    row,
    label: readRowString(row, 'full_name') || readRowString(row, 'email'),
    subtitle: `${readRowString(row, 'role') || 'user'} | ${readRowString(row, 'email')}`,
    timestamp: readRowString(row, 'created_at'),
  }));
}

async function searchPets(term: string) {
  const { data, error } = await supabase
    .from(TABLES.pets)
    .select('id,name,breed,type,species,owner_id,created_at')
    .or(`name.ilike.%${term}%,breed.ilike.%${term}%,type.ilike.%${term}%,species.ilike.%${term}%`)
    .limit(12);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.pets, operation: 'searchPets', query: 'pet global search' }, error);
    return [] as AdminSearchResult[];
  }

  return (data ?? []).map((row: Record<string, unknown>) => makeSearchResult({
    table: TABLES.pets,
    module: 'Pet Management',
    row,
    label: readRowString(row, 'name'),
    subtitle: `${readRowString(row, 'breed') || readRowString(row, 'species') || readRowString(row, 'type') || 'Pet'} | Owner ${readRowString(row, 'owner_id')}`,
    timestamp: readRowString(row, 'created_at'),
  }));
}

async function searchDoctors(term: string) {
  const { data, error } = await supabase
    .from(TABLES.doctors)
    .select('id,profile_id,specialization,clinic_name,license_number,created_at')
    .or(`specialization.ilike.%${term}%,clinic_name.ilike.%${term}%,license_number.ilike.%${term}%`)
    .limit(12);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.doctors, operation: 'searchDoctors', query: 'doctor global search' }, error);
    return [] as AdminSearchResult[];
  }

  return (data ?? []).map((row: Record<string, unknown>) => makeSearchResult({
    table: TABLES.doctors,
    module: 'Doctor Management',
    row,
    label: readRowString(row, 'specialization') || 'Doctor',
    subtitle: `${readRowString(row, 'clinic_name') || 'No clinic'} | Profile ${readRowString(row, 'profile_id')}`,
    timestamp: readRowString(row, 'created_at'),
  }));
}

async function searchGroomers(term: string) {
  const { data, error } = await supabase
    .from(TABLES.groomers)
    .select('id,full_name,email,phone,specializations,approval_status,created_at')
    .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
    .limit(12);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.groomers, operation: 'searchGroomers', query: 'groomer global search' }, error);
    return [] as AdminSearchResult[];
  }

  return (data ?? []).map((row: Record<string, unknown>) => makeSearchResult({
    table: TABLES.groomers,
    module: 'Groomer Management',
    row,
    label: readRowString(row, 'full_name'),
    subtitle: `${readRowArray(row, 'specializations') || 'Groomer'} | ${readRowString(row, 'approval_status')}`,
    timestamp: readRowString(row, 'created_at'),
  }));
}

async function searchClinics(term: string) {
  const { data, error } = await supabase
    .from(TABLES.clinics)
    .select('id,name,hospital_name,category,area,city,created_at')
    .or(`name.ilike.%${term}%,hospital_name.ilike.%${term}%,category.ilike.%${term}%,area.ilike.%${term}%,city.ilike.%${term}%`)
    .limit(12);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.clinics, operation: 'searchClinics', query: 'clinic global search' }, error);
    return [] as AdminSearchResult[];
  }

  return (data ?? []).map((row: Record<string, unknown>) => makeSearchResult({
    table: TABLES.clinics,
    module: 'Hospital Management',
    row,
    label: readRowString(row, 'hospital_name') || readRowString(row, 'name'),
    subtitle: `${readRowString(row, 'category') || 'Clinic'} | ${readRowString(row, 'area') || readRowString(row, 'city')}`,
    timestamp: readRowString(row, 'created_at'),
  }));
}

async function searchSimpleTable(input: { table: string; module: string; select: string; orFilter: string; labelKeys: string[]; subtitleKeys: string[]; term: string }) {
  const { data, error } = await supabase
    .from(input.table)
    .select(input.select)
    .or(input.orFilter.split('__TERM__').join(input.term))
    .limit(12);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: input.table, operation: 'searchSimpleTable', query: `${input.table} global search` }, error);
    return [] as AdminSearchResult[];
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map((row: Record<string, unknown>) => makeSearchResult({
    table: input.table,
    module: input.module,
    row,
    label: input.labelKeys.map(key => readRowString(row, key)).find(Boolean) ?? readRecordId(row),
    subtitle: input.subtitleKeys.map(key => readRowString(row, key)).filter(Boolean).join(' | '),
    timestamp: readRowString(row, 'created_at'),
  }));
}

async function countTable(key: AdminTableKey): Promise<AdminTableSummary> {
  const table = TABLES[key];
  const label = ADMIN_TABLES.find(item => item.key === key)?.label ?? titleFromKey(key);
  const module = ADMIN_TABLES.find(item => item.key === key)?.module ?? label;

  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table, operation: 'countTable', query: `count ${table}` }, error);
    const info = getSupabaseErrorInfo(error);
    return { key, table, label, module, count: 0, status: 'error', errorMessage: info.message };
  }

  return { key, table, label, module, count: count ?? 0, status: 'ok' };
}

async function loadTableActivityEvents() {
  const eventTables: AdminTableKey[] = ['profiles', 'appointments', 'groomingBookings', 'payments', 'orders', 'posts', 'medicalRecords', 'notifications'];
  const eventGroups = await Promise.all(eventTables.map(async key => {
    const table = TABLES[key];
    const { data, error } = await supabase
      .from(table)
      .select('id, created_at, updated_at, user_id, owner_id, profile_id')
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      void logDatabaseFailure({ module: 'SuperAdmin', table, operation: 'loadTableActivityEvents', query: `latest ${table} events` }, error);
      return [] as AdminAuditEvent[];
    }

    return (data ?? []).map((row: Record<string, unknown>) => {
      const createdAt = readRowString(row, 'created_at') || readRowString(row, 'updated_at') || new Date(0).toISOString();
      const actor = readRowString(row, 'user_id') || readRowString(row, 'owner_id') || readRowString(row, 'profile_id') || 'system';
      const recordId = readRecordId(row);
      return {
        id: `${table}-${recordId}-${createdAt}`,
        module: ADMIN_TABLES.find(item => item.key === key)?.module ?? table,
        event: eventLabel(table),
        table,
        recordId,
        timestamp: createdAt,
        actor,
      };
    });
  }));

  return eventGroups.flat();
}

async function loadStoredAuditEvents() {
  const { data, error } = await supabase
    .from(TABLES.auditLogs)
    .select('id, actor_id, actor_role, action, entity_type, entity_id, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.auditLogs, operation: 'loadStoredAuditEvents', query: 'latest audit_logs events' }, error);
    return [] as AdminAuditEvent[];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: readRecordId(row),
    module: readRowString(row, 'entity_type') || 'Audit Logs',
    event: readRowString(row, 'action') || 'Audit event',
    table: TABLES.auditLogs,
    recordId: readRowString(row, 'entity_id') || readRecordId(row),
    timestamp: readRowString(row, 'created_at') || new Date(0).toISOString(),
    actor: readRowString(row, 'actor_id') || readRowString(row, 'actor_role') || 'system',
  }));
}

async function loadAuditEvents() {
  const [stored, activity] = await Promise.all([loadStoredAuditEvents(), loadTableActivityEvents()]);
  return [...stored, ...activity]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 35);
}

async function loadFailedOperations() {
  const { data, error } = await supabase
    .from(TABLES.offlineSyncQueue)
    .select('id, entity_type, operation, status, created_at')
    .neq('status', 'synced')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.offlineSyncQueue, operation: 'loadFailedOperations', query: 'offline queue failures' }, error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: readRecordId(row),
    entityType: readRowString(row, 'entity_type') || 'unknown',
    operation: readRowString(row, 'operation') || 'unknown',
    status: readRowString(row, 'status') || 'unknown',
    timestamp: readRowString(row, 'created_at') || new Date(0).toISOString(),
  }));
}

async function loadRevenueTotal() {
  const { data, error } = await supabase
    .from(TABLES.payments)
    .select('amount,status')
    .in('status', PAID_PAYMENT_STATUSES);

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.payments, operation: 'loadRevenueTotal', query: 'sum completed payment amount' }, error);
    return 0;
  }

  return (data ?? []).reduce((sum, row: Record<string, unknown>) => sum + readAmount(row, 'amount'), 0);
}

async function loadProfileSummary(userId?: string) {
  if (!userId) return { profileName: 'Super Admin', role: 'super_admin' };

  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select('full_name,email,role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.profiles, operation: 'loadProfileSummary', query: 'current admin profile' }, error);
    return { profileName: 'Super Admin', role: 'super_admin' };
  }

  return {
    profileName: readRowString(data ?? {}, 'full_name') || readRowString(data ?? {}, 'email') || 'Super Admin',
    role: readRowString(data ?? {}, 'role') || 'super_admin',
  };
}

async function loadStorageHealth() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    void logDatabaseFailure({ module: 'SuperAdmin', operation: 'loadStorageHealth', query: 'storage.listBuckets' }, error);
    return { status: 'error' as AdminStatus, value: 'Unavailable', detail: getSupabaseErrorInfo(error).message ?? 'Storage status could not be loaded.' };
  }

  const bucketIds = new Set((data ?? []).map(bucket => bucket.id));
  const missing = CRITICAL_STORAGE_BUCKETS.filter(bucket => !bucketIds.has(bucket));
  return {
    status: missing.length ? 'warning' as AdminStatus : 'ok' as AdminStatus,
    value: `${bucketIds.size} buckets`,
    detail: missing.length ? `Missing buckets: ${missing.join(', ')}` : 'All configured PetCare+ storage buckets are visible.',
  };
}

async function loadEdgeFunctionHealth(projectUrl: string) {
  if (!projectUrl) {
    return { status: 'error' as AdminStatus, value: 'Not configured', detail: 'Missing Supabase project URL.' };
  }

  const results = await Promise.all(EDGE_FUNCTIONS.map(async functionName => {
    try {
      const response = await fetch(`${projectUrl}/functions/v1/${functionName}`, { method: 'OPTIONS' });
      return response.status < 500;
    } catch {
      return false;
    }
  }));

  const healthy = results.filter(Boolean).length;
  return {
    status: healthy === EDGE_FUNCTIONS.length ? 'ok' as AdminStatus : healthy > 0 ? 'warning' as AdminStatus : 'error' as AdminStatus,
    value: `${healthy}/${EDGE_FUNCTIONS.length}`,
    detail: healthy === EDGE_FUNCTIONS.length ? 'Edge Function endpoints responded.' : 'One or more Edge Function endpoints did not respond to OPTIONS.',
  };
}

async function loadRpcHealth() {
  const { error } = await supabase.rpc('get_current_doctor_profile');
  if (!error) {
    return { status: 'ok' as AdminStatus, value: `${RPC_FUNCTIONS.length} tracked`, detail: 'Tracked RPC endpoint responded.' };
  }

  const info = getSupabaseErrorInfo(error);
  const expectedRoleFailure = info.code === 'P0001' || info.code === '42501' || info.code === '28000';
  return {
    status: expectedRoleFailure ? 'warning' as AdminStatus : 'error' as AdminStatus,
    value: `${RPC_FUNCTIONS.length} tracked`,
    detail: expectedRoleFailure ? 'RPC is reachable; current role is not eligible for this doctor-specific check.' : info.message ?? 'RPC health check failed.',
  };
}

function buildKpis(tables: AdminTableSummary[], revenueTotal: number): AdminKpi[] {
  const getCount = (key: AdminTableKey) => tables.find(table => table.key === key)?.count ?? 0;
  const userCount = getCount('profiles');
  const doctorCount = getCount('doctors');
  const groomerCount = getCount('groomers');
  const providerAndAdminCount = doctorCount + groomerCount;
  const medicalCount = getCount('medicalRecords') + getCount('vaccinations');
  const errorCount = tables.filter(table => table.status === 'error').length;

  return [
    { id: 'petOwners', label: 'Pet Owners', value: Math.max(userCount - providerAndAdminCount, 0), helper: 'Profiles excluding provider rows', status: 'ok' },
    { id: 'doctors', label: 'Doctors', value: doctorCount, helper: 'Doctor provider rows', status: 'ok' },
    { id: 'groomers', label: 'Groomers', value: groomerCount, helper: 'Groomer provider rows', status: 'ok' },
    { id: 'pets', label: 'Pets', value: getCount('pets'), helper: 'Registered pets', status: 'ok' },
    { id: 'clinics', label: 'Clinics & Hospitals', value: getCount('clinics') + getCount('groomingClinics'), helper: 'Medical and grooming locations', status: 'ok' },
    { id: 'appointments', label: 'Appointments', value: getCount('appointments'), helper: 'Medical appointment records', status: 'ok' },
    { id: 'groomingBookings', label: 'Grooming Bookings', value: getCount('groomingBookings'), helper: 'Grooming booking records', status: 'ok' },
    { id: 'payments', label: 'Payments', value: getCount('payments'), helper: 'Payment records', status: 'ok' },
    { id: 'revenue', label: 'Revenue', value: Math.round(revenueTotal), helper: 'Completed payment total in INR', status: 'ok' },
    { id: 'notifications', label: 'Notifications', value: getCount('notifications'), helper: 'Notification records', status: 'ok' },
    { id: 'reviews', label: 'Reviews', value: getCount('reviews'), helper: 'Review records', status: 'ok' },
    { id: 'ai', label: 'AI Usage', value: getCount('aiPredictions'), helper: 'AI prediction records', status: 'ok' },
    { id: 'medical', label: 'Health Records', value: medicalCount, helper: 'Medical records + vaccinations', status: 'ok' },
    { id: 'issues', label: 'Table Issues', value: errorCount, helper: 'Tables blocked or unavailable', status: errorCount ? 'error' : 'ok' },
  ];
}

export class SuperAdminService {
  readonly tableDefinitions = ADMIN_TABLES;

  async loadDashboard(): Promise<AdminDashboardData> {
    const [profile, tables, revenueTotal, databaseHealth, storageHealth, rpcHealth, auditEvents, failedOperations] = await Promise.all([
      supabase.auth.getUser(),
      Promise.all(ADMIN_TABLES.map(item => countTable(item.key))),
      loadRevenueTotal(),
      runDatabaseHealthCheck(),
      loadStorageHealth(),
      loadRpcHealth(),
      loadAuditEvents(),
      loadFailedOperations(),
    ]);

    const project = getSupabaseProjectInfo();
    const edgeHealth = await loadEdgeFunctionHealth(project.projectUrl);
    const realtimeSubscriptions = getRealtimeRegistrySnapshot();
    const profileSummary = await loadProfileSummary(profile.data.user?.id);

    const health: AdminHealthItem[] = [
      {
        id: 'database',
        label: 'Database connectivity',
        status: databaseHealth.ok ? 'ok' : 'error',
        value: databaseHealth.ok ? 'Connected' : 'Issues found',
        detail: databaseHealth.ok ? `REST ${project.restUrl}` : `Missing/blocked tables: ${databaseHealth.failedChecks.map(check => check.table).join(', ')}`,
      },
      {
        id: 'storage',
        label: 'Storage status',
        ...storageHealth,
      },
      {
        id: 'realtime',
        label: 'Realtime status',
        status: 'ok',
        value: `${realtimeSubscriptions.length} channels`,
        detail: realtimeSubscriptions.length ? 'Realtime registry has active channels.' : `Ready for ${REALTIME_TABLES.length} public realtime tables.`,
      },
      {
        id: 'edge-functions',
        label: 'Edge Functions',
        ...edgeHealth,
      },
      {
        id: 'rpc',
        label: 'RPC status',
        ...rpcHealth,
      },
      {
        id: 'active-users',
        label: 'Active users',
        status: statusFromError(tables.find(table => table.key === 'profiles')?.errorMessage),
        value: String(tables.find(table => table.key === 'profiles')?.count ?? 0),
        detail: 'Client-visible active/auth user detail is limited by Supabase Auth permissions; profile count is live.',
      },
      {
        id: 'failed-operations',
        label: 'Failed operations',
        status: failedOperations.length ? 'warning' : 'ok',
        value: String(failedOperations.length),
        detail: failedOperations.length ? 'Pending or failed offline sync operations require review.' : 'No failed offline sync operations are visible.',
      },
    ];

    return {
      profileName: profileSummary.profileName,
      role: profileSummary.role,
      kpis: buildKpis(tables, revenueTotal),
      tables,
      health,
      auditEvents,
      failedOperations,
    };
  }

  async loadTableRows(table: string) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(20);

    if (error) {
      void logDatabaseFailure({ module: 'SuperAdmin', table, operation: 'loadTableRows', query: `select first 20 from ${table}` }, error);
      throw error;
    }

    return (data ?? []) as Record<string, unknown>[];
  }

  async refreshTableCount(key: AdminTableKey) {
    return countTable(key);
  }

  async refreshDashboardPatch(key: AdminTableKey, currentTables: AdminTableSummary[]): Promise<AdminDashboardPatch> {
    const [summary, revenueTotal] = await Promise.all([countTable(key), loadRevenueTotal()]);
    const tables = currentTables.map(item => item.key === key ? summary : item);
    return { tables, kpis: buildKpis(tables, revenueTotal) };
  }

  async globalSearch(query: string): Promise<AdminSearchResult[]> {
    const term = escapeSearchTerm(query);
    if (term.length < 2) return [];

    const groups = await Promise.all([
      searchProfiles(term),
      searchPets(term),
      searchDoctors(term),
      searchGroomers(term),
      searchClinics(term),
      searchSimpleTable({ table: TABLES.groomingClinics, module: 'Grooming Clinics', select: 'id,name,area,city,approval_status,created_at', orFilter: 'name.ilike.%__TERM__%,area.ilike.%__TERM__%,city.ilike.%__TERM__%,approval_status.ilike.%__TERM__%', labelKeys: ['name'], subtitleKeys: ['area', 'city', 'approval_status'], term }),
      searchSimpleTable({ table: TABLES.appointments, module: 'Appointment Management', select: 'id,status,appointment_type,reason,symptoms,created_at', orFilter: 'status.ilike.%__TERM__%,appointment_type.ilike.%__TERM__%,reason.ilike.%__TERM__%,symptoms.ilike.%__TERM__%', labelKeys: ['appointment_type', 'status'], subtitleKeys: ['reason', 'symptoms'], term }),
      searchSimpleTable({ table: TABLES.groomingBookings, module: 'Grooming Booking Management', select: 'id,status,symptoms,medical_notes,created_at', orFilter: 'status.ilike.%__TERM__%,symptoms.ilike.%__TERM__%,medical_notes.ilike.%__TERM__%', labelKeys: ['status'], subtitleKeys: ['symptoms', 'medical_notes'], term }),
      searchSimpleTable({ table: TABLES.payments, module: 'Payment Management', select: 'id,status,method,provider_reference,created_at', orFilter: 'status.ilike.%__TERM__%,method.ilike.%__TERM__%,provider_reference.ilike.%__TERM__%', labelKeys: ['status', 'method'], subtitleKeys: ['provider_reference'], term }),
      searchSimpleTable({ table: TABLES.invoices, module: 'Invoice Management', select: 'id,invoice_number,file_url,created_at', orFilter: 'invoice_number.ilike.%__TERM__%,file_url.ilike.%__TERM__%', labelKeys: ['invoice_number'], subtitleKeys: ['file_url'], term }),
      searchSimpleTable({ table: TABLES.medicalRecords, module: 'Medical Records', select: 'id,type,title,notes,created_at', orFilter: 'type.ilike.%__TERM__%,title.ilike.%__TERM__%,notes.ilike.%__TERM__%', labelKeys: ['title'], subtitleKeys: ['type', 'notes'], term }),
      searchSimpleTable({ table: TABLES.reviews, module: 'Review Management', select: 'id,target_type,comment,created_at', orFilter: 'target_type.ilike.%__TERM__%,comment.ilike.%__TERM__%', labelKeys: ['target_type'], subtitleKeys: ['comment'], term }),
      searchSimpleTable({ table: TABLES.notifications, module: 'Notification Management', select: 'id,title,body,type,created_at', orFilter: 'title.ilike.%__TERM__%,body.ilike.%__TERM__%,type.ilike.%__TERM__%', labelKeys: ['title'], subtitleKeys: ['type', 'body'], term }),
      searchSimpleTable({ table: TABLES.petHealthLogs, module: 'Health Logs', select: 'id,mood,appetite,notes,created_at', orFilter: 'mood.ilike.%__TERM__%,appetite.ilike.%__TERM__%,notes.ilike.%__TERM__%', labelKeys: ['mood', 'appetite'], subtitleKeys: ['notes'], term }),
      searchSimpleTable({ table: TABLES.posts, module: 'Community Management', select: 'id,content,created_at', orFilter: 'content.ilike.%__TERM__%', labelKeys: ['content'], subtitleKeys: [], term }),
    ]);

    return groups.flat()
      .sort((left, right) => new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime())
      .slice(0, 60);
  }

  async runManagementAction(input: AdminActionInput) {
    const patch: Record<string, unknown> = {};

    if (input.table === TABLES.doctors || input.table === TABLES.groomers) {
      if (input.action === 'approve' || input.action === 'activate') Object.assign(patch, { approval_status: 'approved', is_available: true });
      if (input.action === 'reject') Object.assign(patch, { approval_status: 'rejected', is_available: false });
      if (input.action === 'suspend' || input.action === 'deactivate') Object.assign(patch, { approval_status: 'suspended', is_available: false });
    } else if (input.table === TABLES.clinics || input.table === TABLES.groomingClinics) {
      if (input.action === 'approve' || input.action === 'activate') Object.assign(patch, { approval_status: 'approved', is_active: true });
      if (input.action === 'reject') Object.assign(patch, { approval_status: 'rejected', is_active: false });
      if (input.action === 'suspend' || input.action === 'deactivate') Object.assign(patch, { approval_status: 'suspended', is_active: false });
    } else if (input.table === TABLES.appointments) {
      if (input.action === 'approve' || input.action === 'activate') patch.status = 'accepted';
      if (input.action === 'reject') patch.status = 'rejected';
      if (input.action === 'cancel') patch.status = 'cancelled';
    } else if (input.table === TABLES.groomingBookings) {
      if (input.action === 'approve' || input.action === 'activate') patch.status = 'confirmed';
      if (input.action === 'reject') patch.status = 'rejected';
      if (input.action === 'cancel') patch.status = 'cancelled';
    } else if (input.table === TABLES.payments) {
      if (input.action === 'refund') patch.status = 'refunded';
    }

    if (!Object.keys(patch).length) {
      await this.recordAdminAction(input, 'unsupported_action');
      throw new Error(`The ${input.action.replace('_', ' ')} action is not supported for ${input.table} with the current schema.`);
    }

    const { data, error } = await supabase
      .from(input.table)
      .update(patch)
      .eq('id', input.recordId)
      .select('*')
      .maybeSingle();

    if (error) {
      void logDatabaseFailure({ module: 'SuperAdmin', table: input.table, operation: 'runManagementAction', query: `${input.action} ${input.table}` }, error);
      throw error;
    }

    if (!data) throw new Error(`No ${input.table} row was updated. Check record id and Super Admin RLS policies.`);
    await this.recordAdminAction(input, 'success');
    return data as Record<string, unknown>;
  }

  async recordAdminAction(input: AdminActionInput, status: string) {
    const user = await supabase.auth.getUser();
    const actorId = user.data.user?.id ?? null;
    const { error } = await supabase.from(TABLES.auditLogs).insert({
      actor_id: actorId,
      actor_role: 'super_admin',
      action: `admin_${input.action}`,
      entity_type: input.table,
      entity_id: input.recordId,
      metadata: { reason: input.reason ?? null, status },
      severity: status === 'success' ? 'info' : 'warning',
    });

    if (error) {
      void logDatabaseFailure({ module: 'SuperAdmin', table: TABLES.auditLogs, operation: 'recordAdminAction', query: `audit ${input.action}` }, error);
    }
  }
}

export const superAdminService = new SuperAdminService();