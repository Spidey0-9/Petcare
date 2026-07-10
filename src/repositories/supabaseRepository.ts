import { supabase } from '../core/services/supabase';
import { DEFAULT_PAGE_SIZE } from '../constants';
import { classifySupabaseError, throwIfError, toAppError } from '../services/errors';
import { logDatabaseFailure } from '../services/database/databaseDiagnostics';
import type { PaginatedQuery } from '../types';
import type { RealtimeChangePayload } from '../services/realtime/realtimeService';
import { subscribeToTable } from '../services/realtime/realtimeService';

type Filters = Record<string, string | number | boolean | null>;

type QueryOptions = PaginatedQuery & {
  filters?: Filters;
  orderBy?: string;
  ascending?: boolean;
};

function applyFilters(query: any, filters?: Filters) {
  if (!filters) return query;
  return Object.entries(filters).reduce(
    (q, [key, value]) => (value === null ? q.is(key, null) : q.eq(key, value)),
    query,
  );
}

function applyPagination(query: any, options?: PaginatedQuery) {
  if (!options?.page && !options?.pageSize) return query;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return query.range(from, to);
}

function isTableMissingError(error: unknown): boolean {
  return classifySupabaseError(error) === 'table_not_found';
}

function isSchemaMismatchError(error: unknown): boolean {
  return classifySupabaseError(error) === 'schema_mismatch';
}

export class SupabaseRepository<TRecord extends { id?: string }> {
  constructor(private readonly tableName: string) {}

  async list(options: QueryOptions = {}): Promise<TRecord[]> {
    let query = supabase.from(this.tableName).select('*') as any;
    query = applyFilters(query, options.filters);
    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    }
    query = applyPagination(query, options);

    const { data, error } = await query;

    if (error) {
      await logDatabaseFailure({
        module: 'SupabaseRepository',
        table: this.tableName,
        operation: 'list',
        query: `select * from ${this.tableName}`,
      }, error);

      if (isTableMissingError(error)) {
        console.warn(`[Repository] Table "${this.tableName}" not found; returning []. Apply the latest Supabase migration.`);
        return [];
      }
      throwIfError(error, `Unable to load ${this.tableName}.`);
    }

    return (data ?? []) as TRecord[];
  }

  async getById(id: string): Promise<TRecord | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      await logDatabaseFailure({
        module: 'SupabaseRepository',
        table: this.tableName,
        operation: 'getById',
        query: `select * from ${this.tableName} where id = ${id}`,
      }, error);

      if (isTableMissingError(error)) return null;
      throwIfError(error, `Unable to load ${this.tableName} record.`);
    }

    return data as TRecord | null;
  }

  async create(payload: Partial<TRecord> | Record<string, unknown>): Promise<TRecord> {
    const { data, error } = await (supabase.from(this.tableName) as any)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      await logDatabaseFailure({
        module: 'SupabaseRepository',
        table: this.tableName,
        operation: 'create',
        query: `insert into ${this.tableName}`,
      }, error);

      if (isTableMissingError(error) || isSchemaMismatchError(error)) {
        throw toAppError(error, `Unable to create ${this.tableName} record.`);
      }
      throwIfError(error, `Unable to create ${this.tableName} record.`);
    }

    return data as TRecord;
  }

  async update(id: string, payload: Partial<TRecord> | Record<string, unknown>): Promise<TRecord> {
    const { data, error } = await (supabase.from(this.tableName) as any)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      await logDatabaseFailure({
        module: 'SupabaseRepository',
        table: this.tableName,
        operation: 'update',
        query: `update ${this.tableName} where id = ${id}`,
      }, error);

      if (isTableMissingError(error) || isSchemaMismatchError(error)) {
        throw toAppError(error, `Unable to update ${this.tableName} record.`);
      }
      throwIfError(error, `Unable to update ${this.tableName} record.`);
    }

    return data as TRecord;
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      await logDatabaseFailure({
        module: 'SupabaseRepository',
        table: this.tableName,
        operation: 'delete',
        query: `delete from ${this.tableName} where id = ${id}`,
      }, error);

      if (isTableMissingError(error)) {
        console.warn(`[Repository] Delete skipped; table "${this.tableName}" does not exist.`);
        return;
      }
      throwIfError(error, `Unable to delete ${this.tableName} record.`);
    }
  }

  subscribe(
    event: '*' | 'INSERT' | 'UPDATE' | 'DELETE',
    callback: (payload: RealtimeChangePayload) => void,
  ) {
    return subscribeToTable(
      `repo:${this.tableName}`,
      this.tableName,
      callback,
      event,
    );
  }
}
