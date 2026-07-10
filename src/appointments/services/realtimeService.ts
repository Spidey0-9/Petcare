import { supabase } from '../../core/services/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

class RealtimeManager {
  private channel: RealtimeChannel | null = null;
  private subscriptions = new Map<string, Set<TableCallback>>();
  private readonly channelName = 'realtime:all';

  constructor() {
    this.initializeChannel();
    this.listenForAuthChanges();
  }

  private initializeChannel() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    console.log('[Realtime] Initializing channel:', this.channelName);
    this.channel = supabase.channel(this.channelName, {
      config: { broadcast: { self: true } },
    });

    this.channel
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const callbacks = this.subscriptions.get(payload.table);
        if (callbacks) {
          callbacks.forEach(callback => callback(payload));
        }
      })
      .subscribe(async (status, err) => {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        console.log(`[Realtime] Channel "${this.channelName}" subscription status:`, {
          status,
          error: err,
          socketState: this.channel?.socket.connectionState(),
          hasAccessToken: !!token,
        });
      });
  }

  public subscribeToTable(table: string, callback: TableCallback) {
    if (!this.subscriptions.has(table)) {
      this.subscriptions.set(table, new Set());
    }
    this.subscriptions.get(table)!.add(callback);
  }

  public unsubscribeFromTable(table: string, callback: TableCallback) {
    const callbacks = this.subscriptions.get(table);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(table);
      }
    }
  }

  private listenForAuthChanges() {
    supabase.auth.onAuthStateChange((event) => {
      console.log(`[Realtime] Auth state changed: ${event}. Re-initializing channel.`);
      this.initializeChannel();
    });
  }
}

export const realtimeService = new RealtimeManager();