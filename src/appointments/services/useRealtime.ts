import { useEffect, useMemo } from 'react';
import { realtimeService } from './realtimeService';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useRealtime(
  tables: string[],
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
) {
  const tableSet = useMemo(() => new Set(tables), [tables]);

  useEffect(() => {
    if (tables.length === 0) return;

    const handler = (payload: RealtimePostgresChangesPayload<any>) => {
      if (tableSet.has(payload.table)) {
        callback(payload);
      }
    };

    tables.forEach(table => {
      realtimeService.subscribeToTable(table, handler);
    });

    return () => {
      tables.forEach(table => realtimeService.unsubscribeFromTable(table, handler));
    };
  }, [tables, callback, tableSet]);
}