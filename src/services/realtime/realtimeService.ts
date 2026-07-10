import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../../core/services/supabase';
import { TABLES } from '../../constants';

export type RealtimeTable = typeof REALTIME_TABLES[number];
export type RealtimeChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;
export type RealtimeChangeHandler = (payload: RealtimeChangePayload) => void;

export const REALTIME_TABLES = [
  TABLES.profiles,
  TABLES.doctors,
  TABLES.pets,
  TABLES.appointments,
  TABLES.reminders,
  TABLES.medicalRecords,
  TABLES.vaccinations,
  TABLES.petHealthLogs,
  TABLES.aiPredictions,
  TABLES.notifications,
  TABLES.posts,
  TABLES.comments,
  TABLES.likes,
  TABLES.clinics,
  TABLES.products,
  TABLES.categories,
  TABLES.wishlist,
  TABLES.cart,
  TABLES.orders,
  TABLES.payments,
  TABLES.invoices,
  TABLES.memberships,
  TABLES.reviews,
  TABLES.favorites,
  TABLES.savedClinics,
  TABLES.messages,
] as const;

type SubscriptionEntry = {
  channel: RealtimeChannel;
  handlers: Map<string, RealtimeChangeHandler>;
};

const registry = new Map<string, SubscriptionEntry>();

function channelKey(scope: string, table: string) {
  return `${scope}:${table}`;
}

function handlerKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function subscribeToTable(scope: string, table: RealtimeTable | string, handler: RealtimeChangeHandler, event: '*' | 'INSERT' | 'UPDATE' | 'DELETE' = '*') {
  const key = channelKey(scope, table);
  let entry = registry.get(key);

  if (!entry) {
    const handlers = new Map<string, RealtimeChangeHandler>();
    const channel = supabase
      .channel(`petcare:${key}`)
      .on('postgres_changes', { event, schema: 'public', table }, payload => {
        handlers.forEach(nextHandler => nextHandler(payload as RealtimeChangePayload));
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] subscription issue', { scope, table, status });
        }
      });

    entry = { channel, handlers };
    registry.set(key, entry);
  }

  const id = handlerKey();
  entry.handlers.set(id, handler);

  return () => {
    const current = registry.get(key);
    if (!current) return;
    current.handlers.delete(id);
    if (current.handlers.size === 0) {
      registry.delete(key);
      void supabase.removeChannel(current.channel);
    }
  };
}

export function subscribeToTables(scope: string, tables: ReadonlyArray<RealtimeTable | string>, handler: (table: string, payload: RealtimeChangePayload) => void) {
  const uniqueTables = Array.from(new Set(tables));
  const unsubscribers = uniqueTables.map(table => subscribeToTable(scope, table, payload => handler(table, payload)));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

export function getRealtimeRegistrySnapshot() {
  return Array.from(registry.entries()).map(([key, entry]) => ({ key, handlerCount: entry.handlers.size }));
}
