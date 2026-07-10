import { useEffect, useMemo } from 'react';
import { subscribeToTables, type RealtimeChangePayload, type RealtimeTable } from './realtimeService';

export function useRealtimeTables(
  scope: string,
  tables: ReadonlyArray<RealtimeTable | string>,
  onChange: (table: string, payload: RealtimeChangePayload) => void,
) {
  const tableKey = useMemo(() => Array.from(new Set(tables)).sort().join('|'), [tables]);

  useEffect(() => {
    if (!tables.length) return undefined;
    return subscribeToTables(scope, tables, onChange);
  }, [scope, tableKey, onChange]);
}
