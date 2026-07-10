import { SupabaseRepository } from '../../repositories';
import { TABLES } from '../../constants';

export type OfflineSyncRecord = {
  id?: string;
  user_id?: string;
  entity_type: string;
  entity_id?: string | null;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  status?: 'pending' | 'synced' | 'failed';
  created_at?: string;
  synced_at?: string | null;
};

export class OfflineSyncService {
  private readonly repository = new SupabaseRepository<OfflineSyncRecord>(TABLES.offlineSyncQueue);

  enqueue(payload: Partial<OfflineSyncRecord>) {
    return this.repository.create({ ...payload, status: payload.status ?? 'pending' });
  }

  listPending(userId: string) {
    return this.repository.list({ filters: { user_id: userId, status: 'pending' }, orderBy: 'created_at', ascending: true });
  }

  markSynced(id: string) {
    return this.repository.update(id, { status: 'synced', synced_at: new Date().toISOString() });
  }
}

export const offlineSyncService = new OfflineSyncService();
