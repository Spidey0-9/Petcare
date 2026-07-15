import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthDialog, useAuthDialog } from '../components/AuthDialog';
import { authService } from '../services/auth';
import { colors } from '../core/theme/colors';
import type { AuthStackParamList } from '../routes/types';
import { TABLES } from '../constants';
import { REALTIME_TABLES, subscribeToTables, type RealtimeChangePayload } from '../services/realtime';
import {
  superAdminService,
  type AdminAuditEvent,
  type AdminDashboardData,
  type AdminHealthItem,
  type AdminKpi,
  type AdminSearchResult,
  type AdminStatus,
  type AdminTableSummary,
} from '../services/admin/superAdminService';

type Props = NativeStackScreenProps<AuthStackParamList, 'SuperAdminDashboard'>;
type TabKey = 'dashboard' | 'search' | 'health' | 'audit' | 'database' | 'realtime';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type RealtimeEvent = {
  id: string;
  table: string;
  eventType: string;
  recordId: string;
  timestamp: string;
};

const TABS: Array<{ key: TabKey; label: string; icon: IconName }> = [
  { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard' },
  { key: 'search', label: 'Search', icon: 'magnify' },
  { key: 'health', label: 'Health', icon: 'heart-pulse' },
  { key: 'audit', label: 'Audit', icon: 'clipboard-text-clock' },
  { key: 'database', label: 'Database', icon: 'database-search' },
  { key: 'realtime', label: 'Realtime', icon: 'access-point-network' },
];

const KPI_ICONS: Record<string, IconName> = {
  petOwners: 'account-heart',
  users: 'account-group',
  doctors: 'doctor',
  groomers: 'content-cut',
  pets: 'paw',
  clinics: 'hospital-building',
  appointments: 'calendar-month',
  groomingBookings: 'calendar-heart',
  payments: 'credit-card-check',
  revenue: 'cash-multiple',
  notifications: 'bell-badge',
  reviews: 'star-circle',
  ai: 'brain',
  orders: 'cart-check',
  medical: 'file-document-edit',
  community: 'forum',
  issues: 'alert-circle',
};

const STATUS_COLORS: Record<AdminStatus, { color: string; bg: string; label: string }> = {
  ok: { color: colors.success, bg: '#DCFCE7', label: 'OK' },
  warning: { color: '#FF8F00', bg: '#FFF3E0', label: 'Review' },
  error: { color: colors.danger, bg: '#FEE2E2', label: 'Blocked' },
};

function shortId(value: string) {
  if (!value || value === 'unknown' || value === 'system') return value;
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

function rowPreview(row: Record<string, unknown>) {
  return Object.entries(row)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === 'object' && value !== null ? '[object]' : String(value ?? '')}`)
    .join('  |  ');
}

function readPayloadRecordId(record: Record<string, unknown> | object) {
  if ('id' in record && typeof record.id === 'string') return record.id;
  return '';
}

function readPayloadId(payload: RealtimeChangePayload) {
  return readPayloadRecordId(payload.new) || readPayloadRecordId(payload.old) || 'unknown';
}

export function SuperAdminDashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [dialog, showDialog] = useAuthDialog();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTable, setSelectedTable] = useState<AdminTableSummary | null>(null);
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>([]);
  const [tableRowsLoading, setTableRowsLoading] = useState(false);
  const [tableRowsError, setTableRowsError] = useState('');
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const tableByName = useMemo(() => {
    const map = new Map<string, (typeof superAdminService.tableDefinitions)[number]>();
    superAdminService.tableDefinitions.forEach(definition => {
      map.set(TABLES[definition.key], definition);
    });
    return map;
  }, []);

  const kpis = useMemo(() => data?.kpis ?? [], [data?.kpis]);

  const loadDashboard = useCallback(async () => {
    setErrorMessage('');
    try {
      const next = await superAdminService.loadDashboard();
      setData(next);
      if (!selectedTable && next.tables.length) setSelectedTable(next.tables[0]);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load Super Admin dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadDashboard();
  }, [fadeAnim, loadDashboard]);

  useEffect(() => {
    return subscribeToTables('super-admin-dashboard', REALTIME_TABLES, (table, payload) => {
      const recordId = readPayloadId(payload);
      const event: RealtimeEvent = {
        id: `${table}-${payload.eventType}-${recordId}-${Date.now()}`,
        table,
        eventType: payload.eventType,
        recordId,
        timestamp: new Date().toISOString(),
      };

      setRealtimeEvents(previous => [event, ...previous].slice(0, 60));
      setData(previous => {
        if (!previous) return previous;
        const definition = tableByName.get(table);
        if (!definition) return previous;
        void superAdminService.refreshDashboardPatch(definition.key, previous.tables).then(patch => {
          setData(current => {
            if (!current) return current;
            return { ...current, tables: patch.tables, kpis: patch.kpis };
          });
        });
        return previous;
      });
    });
  }, [tableByName]);

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    setSearchError('');
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await superAdminService.globalSearch(trimmed);
      setSearchResults(results);
    } catch (error: unknown) {
      setSearchError(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => runSearch(searchQuery), 350);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, runSearch]);
  const loadSelectedRows = useCallback(async (table: AdminTableSummary) => {
    setSelectedTable(table);
    setTableRows([]);
    setTableRowsError('');
    setTableRowsLoading(true);
    try {
      const rows = await superAdminService.loadTableRows(table.table);
      setTableRows(rows);
    } catch (error: unknown) {
      setTableRowsError(error instanceof Error ? error.message : `Unable to inspect ${table.table}.`);
    } finally {
      setTableRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'database' && selectedTable) {
      loadSelectedRows(selectedTable);
    }
  }, [activeTab, selectedTable?.table, loadSelectedRows]);

  async function handleLogout() {
    await authService.signOut();
    showDialog({
      type: 'success',
      title: 'Logged Out Successfully',
      message: 'You have been securely signed out.',
      autoDismissMs: 1800,
      onDismiss: () => {
        showDialog(null);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      },
    });
  }

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="shield-crown" size={28} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerName}>{data?.profileName ?? 'Super Admin'}</Text>
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons name="shield-check" size={11} color="#fff" />
              <Text style={styles.roleBadgeText}>{data?.role ?? 'super_admin'}</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map(tab => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <MaterialCommunityIcons name={tab.icon} size={16} color={activeTab === tab.key ? '#fff' : colors.primary} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loading ? <LoadingState /> : null}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={loadDashboard} /> : null}
        {!loading && !errorMessage && data ? (
          <>
            {activeTab === 'dashboard' ? <DashboardTab kpis={kpis} tables={data.tables} /> : null}
            {activeTab === 'health' ? <HealthTab health={data.health} failedOperations={data.failedOperations} /> : null}
            {activeTab === 'audit' ? <AuditTab events={data.auditEvents} realtimeEvents={realtimeEvents} /> : null}
            {activeTab === 'database' ? (
              <DatabaseTab
                tables={data.tables}
                selectedTable={selectedTable}
                tableRows={tableRows}
                loading={tableRowsLoading}
                error={tableRowsError}
                onSelectTable={loadSelectedRows}
              />
            ) : null}
            {activeTab === 'realtime' ? <RealtimeTab events={realtimeEvents} /> : null}
          </>
        ) : null}
        <View style={{ height: 70 }} />
      </ScrollView>

      <AuthDialog {...dialog} />
    </Animated.View>
  );
}

function LoadingState() {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateTitle}>Loading live Super Admin data</Text>
      <Text style={styles.stateText}>Checking Supabase tables, health, audit events and realtime channels.</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.stateCard}>
      <MaterialCommunityIcons name="alert-circle" size={34} color={colors.danger} />
      <Text style={styles.stateTitle}>Super Admin unavailable</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Pressable style={styles.primaryButton} onPress={onRetry}>
        <Text style={styles.primaryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name="database-off" size={30} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function DashboardTab({ kpis, tables }: { kpis: AdminKpi[]; tables: AdminTableSummary[] }) {
  return (
    <>
      <View style={styles.welcomeCard}>
        <MaterialCommunityIcons name="shield-crown" size={38} color={colors.primary} />
        <View style={styles.flex}>
          <Text style={styles.welcomeTitle}>Super Admin Control Panel</Text>
          <Text style={styles.welcomeSub}>Live Supabase overview across PetCare+ modules.</Text>
        </View>
      </View>

      <SectionTitle title="System KPIs" />
      <View style={styles.statsGrid}>
        {kpis.map(kpi => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </View>

      <SectionTitle title="Module Integration" />
      {tables.map(table => <TableSummaryRow key={table.key} table={table} />)}
    </>
  );
}

function KpiCard({ kpi }: { kpi: AdminKpi }) {
  const meta = STATUS_COLORS[kpi.status];
  return (
    <View style={[styles.statCard, { backgroundColor: meta.bg }]}> 
      <MaterialCommunityIcons name={KPI_ICONS[kpi.id] ?? 'chart-box'} size={24} color={meta.color} />
      <Text style={[styles.statValue, { color: meta.color }]}>{kpi.value}</Text>
      <Text style={[styles.statLabel, { color: meta.color }]}>{kpi.label}</Text>
      <Text style={styles.statHelper}>{kpi.helper}</Text>
    </View>
  );
}

function TableSummaryRow({ table }: { table: AdminTableSummary }) {
  const meta = STATUS_COLORS[table.status];
  return (
    <View style={styles.actionRow}>
      <View style={[styles.actionIcon, { backgroundColor: meta.bg }]}> 
        <MaterialCommunityIcons name={table.status === 'ok' ? 'database-check' : 'database-alert'} size={21} color={meta.color} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.actionLabel}>{table.label}</Text>
        <Text style={styles.actionSub}>{table.module} | {table.table}</Text>
        {table.errorMessage ? <Text style={styles.errorTiny}>{table.errorMessage}</Text> : null}
      </View>
      <View style={[styles.countBadge, { backgroundColor: meta.bg }]}> 
        <Text style={[styles.countText, { color: meta.color }]}>{table.count}</Text>
      </View>
    </View>
  );
}

function SearchTab({ query, results, loading, error }: { query: string; results: AdminSearchResult[]; loading: boolean; error: string }) {
  return (
    <>
      <SectionTitle title="Global Realtime Search" />
      {query.trim().length < 2 ? <EmptyState title="Search the platform" text="Enter at least two characters to search users, pets, doctors, groomers, clinics, hospitals, appointments, payments, records and posts." /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && error ? <EmptyState title="Search failed" text={error} /> : null}
      {!loading && !error && query.trim().length >= 2 && !results.length ? <EmptyState title="No results" text="No visible live records matched this search." /> : null}
      {!loading && !error && results.map(result => <SearchResultRow key={result.id} result={result} />)}
    </>
  );
}

function SearchResultRow({ result }: { result: AdminSearchResult }) {
  return (
    <View style={styles.eventRow}>
      <MaterialCommunityIcons name="magnify" size={18} color={colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.eventTitle}>{result.label}</Text>
        <Text style={styles.eventMeta}>{result.module} | {result.table} | {shortId(result.recordId)}</Text>
        {!!result.subtitle && <Text style={styles.eventMeta}>{result.subtitle}</Text>}
      </View>
    </View>
  );
}
function HealthTab({ health, failedOperations }: { health: AdminHealthItem[]; failedOperations: Array<{ id: string; entityType: string; operation: string; status: string; timestamp: string }> }) {
  return (
    <>
      <SectionTitle title="System Health" />
      {health.map(item => <HealthRow key={item.id} item={item} />)}
      <SectionTitle title="Failed Operations" />
      {failedOperations.length ? failedOperations.map(operation => (
        <View key={operation.id} style={styles.eventRow}>
          <MaterialCommunityIcons name="alert" size={18} color="#FF8F00" />
          <View style={styles.flex}>
            <Text style={styles.eventTitle}>{operation.operation} | {operation.entityType}</Text>
            <Text style={styles.eventMeta}>{operation.status} | {formatTime(operation.timestamp)}</Text>
          </View>
        </View>
      )) : <EmptyState title="No failed operations" text="The offline sync queue has no visible pending or failed operations." />}
    </>
  );
}

function HealthRow({ item }: { item: AdminHealthItem }) {
  const meta = STATUS_COLORS[item.status];
  return (
    <View style={styles.healthRow}>
      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}> 
        <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.actionLabel}>{item.label}</Text>
        <Text style={styles.actionSub}>{item.value}</Text>
        <Text style={styles.healthDetail}>{item.detail}</Text>
      </View>
    </View>
  );
}

function AuditTab({ events, realtimeEvents }: { events: AdminAuditEvent[]; realtimeEvents: RealtimeEvent[] }) {
  const combinedEvents = [
    ...realtimeEvents.slice(0, 10).map(event => ({
      id: event.id,
      module: 'Realtime',
      event: `${event.eventType} event`,
      table: event.table,
      recordId: event.recordId,
      timestamp: event.timestamp,
      actor: 'database',
    })),
    ...events,
  ].slice(0, 35);

  return (
    <>
      <SectionTitle title="Audit Log" />
      {combinedEvents.length ? combinedEvents.map(event => <AuditEventRow key={event.id} event={event} />) : (
        <EmptyState title="No audit events" text="Live events will appear after users create, update, or delete records." />
      )}
    </>
  );
}

function AuditEventRow({ event }: { event: AdminAuditEvent }) {
  return (
    <View style={styles.eventRow}>
      <MaterialCommunityIcons name="clipboard-text-clock" size={18} color={colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.eventTitle}>{event.event}</Text>
        <Text style={styles.eventMeta}>{event.module} | {event.table} | {shortId(event.recordId)}</Text>
        <Text style={styles.eventMeta}>Actor {shortId(event.actor)} | {formatTime(event.timestamp)}</Text>
      </View>
    </View>
  );
}

function DatabaseTab({
  tables,
  selectedTable,
  tableRows,
  loading,
  error,
  onSelectTable,
}: {
  tables: AdminTableSummary[];
  selectedTable: AdminTableSummary | null;
  tableRows: Record<string, unknown>[];
  loading: boolean;
  error: string;
  onSelectTable: (table: AdminTableSummary) => void;
}) {
  return (
    <>
      <SectionTitle title="Database Inspector" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableChips}>
        {tables.map(table => (
          <Pressable key={table.key} style={[styles.tableChip, selectedTable?.key === table.key && styles.tableChipActive]} onPress={() => onSelectTable(table)}>
            <Text style={[styles.tableChipText, selectedTable?.key === table.key && styles.tableChipTextActive]}>{table.table}</Text>
            <Text style={[styles.tableChipCount, selectedTable?.key === table.key && styles.tableChipTextActive]}>{table.count}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedTable ? <TableSummaryRow table={selectedTable} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={() => selectedTable ? onSelectTable(selectedTable) : undefined} /> : null}
      {!loading && !error && !tableRows.length ? <EmptyState title="No rows visible" text="This table is empty or RLS does not expose rows to the current Super Admin session." /> : null}
      {!loading && !error && tableRows.map((row, index) => (
        <View key={`${selectedTable?.table ?? 'table'}-${index}`} style={styles.rowPreview}>
          <Text style={styles.rowPreviewTitle}>Row {index + 1}</Text>
          <Text style={styles.rowPreviewText}>{rowPreview(row)}</Text>
        </View>
      ))}
    </>
  );
}

function RealtimeTab({ events }: { events: RealtimeEvent[] }) {
  return (
    <>
      <SectionTitle title="Realtime Monitor" />
      {events.length ? events.map(event => (
        <View key={event.id} style={styles.eventRow}>
          <MaterialCommunityIcons name="access-point-network" size={18} color={colors.success} />
          <View style={styles.flex}>
            <Text style={styles.eventTitle}>{event.eventType} on {event.table}</Text>
            <Text style={styles.eventMeta}>Record {shortId(event.recordId)} | {formatTime(event.timestamp)}</Text>
          </View>
        </View>
      )) : <EmptyState title="No realtime events yet" text="Inserts, updates, and deletes across critical tables will appear here live." />}
    </>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.primary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: '900', color: '#fff' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3, alignSelf: 'flex-start' },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEE2E2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { fontSize: 13, fontWeight: '800', color: colors.danger },
  searchShell: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, padding: 0 },
  tabs: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  tabTextActive: { color: '#fff' },
  body: { padding: 20, gap: 0 },
  welcomeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 18, padding: 18, marginBottom: 22, borderWidth: 1, borderColor: colors.line },
  welcomeTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  welcomeSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: colors.text, marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '47%', borderRadius: 16, padding: 14, alignItems: 'center', gap: 5 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  statHelper: { fontSize: 10, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  actionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  actionSub: { fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 2 },
  errorTiny: { fontSize: 10, color: colors.danger, marginTop: 4 },
  countBadge: { minWidth: 42, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  countText: { fontSize: 13, fontWeight: '900' },
  stateCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 24, gap: 8, marginBottom: 16 },
  stateTitle: { fontSize: 15, fontWeight: '900', color: colors.text, textAlign: 'center' },
  stateText: { fontSize: 12, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, marginTop: 4 },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 12, gap: 5 },
  emptyTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
  emptyText: { fontSize: 12, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  healthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  statusPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  statusPillText: { fontSize: 10, fontWeight: '900' },
  healthDetail: { fontSize: 11, color: colors.muted, marginTop: 4, lineHeight: 16 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 13, marginBottom: 9 },
  eventTitle: { fontSize: 13, fontWeight: '900', color: colors.text },
  eventMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  tableChips: { gap: 8, paddingBottom: 12 },
  tableChip: { borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, minWidth: 92 },
  tableChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tableChipText: { fontSize: 11, fontWeight: '900', color: colors.text },
  tableChipTextActive: { color: '#fff' },
  tableChipCount: { fontSize: 10, fontWeight: '800', color: colors.muted, marginTop: 2 },
  rowPreview: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 13, marginBottom: 9 },
  rowPreviewTitle: { fontSize: 12, fontWeight: '900', color: colors.text, marginBottom: 4 },
  rowPreviewText: { fontSize: 11, fontWeight: '600', color: colors.muted, lineHeight: 16 },
});


