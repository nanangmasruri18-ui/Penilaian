import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// User's Supabase credentials
const RAW_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://anadwoytkjvuknucwymd.supabase.co';

// Sanitize URL: strip trailing slashes, /rest/v1
let sanitizedUrl = RAW_SUPABASE_URL.trim();
if (sanitizedUrl.endsWith('/')) {
  sanitizedUrl = sanitizedUrl.slice(0, -1);
}
if (sanitizedUrl.endsWith('/rest/v1')) {
  sanitizedUrl = sanitizedUrl.slice(0, -8);
}
if (sanitizedUrl.endsWith('/')) {
  sanitizedUrl = sanitizedUrl.slice(0, -1);
}

const SUPABASE_URL = sanitizedUrl;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWR3b3l0a2p2dWtudWN3eW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjc3MjIsImV4cCI6MjA5OTYwMzcyMn0.3f2I5r7_EH9drjP2DsmV-AzCmsevjkIHe7zb6kfTI7s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20
    }
  }
});

// All separated tables
export const SYNC_KEYS = [
  'merdeka_academic_years',
  'merdeka_semesters',
  'merdeka_profiles',
  'merdeka_teachers',
  'merdeka_classes',
  'merdeka_subjects',
  'merdeka_students',
  'merdeka_assignments',
  'merdeka_learning_objectives',
  'merdeka_material_scopes',
  'merdeka_formative_scores',
  'merdeka_summative_scope_scores',
  'merdeka_semester_scores',
  'merdeka_audit_logs'
];

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: string | null;
  errorMessage: string | null;
  isRealtimeConnected: boolean;
}

const STATUS_KEY = 'merdeka_supabase_sync_status';

export function getSyncStatus(): SyncStatus {
  const data = localStorage.getItem(STATUS_KEY);
  if (!data) {
    return { status: 'idle', lastSync: null, errorMessage: null, isRealtimeConnected: false };
  }
  try {
    return JSON.parse(data);
  } catch {
    return { status: 'idle', lastSync: null, errorMessage: null, isRealtimeConnected: false };
  }
}

export function setSyncStatus(status: Partial<SyncStatus>) {
  const current = getSyncStatus();
  const updated: SyncStatus = { ...current, ...status };
  localStorage.setItem(STATUS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('supabase_sync_changed'));
}

// Score tables use composite keys for conflict-free merging
export const SCORE_KEYS = [
  'merdeka_formative_scores',
  'merdeka_summative_scope_scores',
  'merdeka_semester_scores'
];

// Tables where local deletion is authoritative
export const MASTER_TABLES = [
  'merdeka_academic_years',
  'merdeka_semesters',
  'merdeka_profiles',
  'merdeka_teachers',
  'merdeka_classes',
  'merdeka_subjects',
  'merdeka_students',
  'merdeka_assignments',
  'merdeka_learning_objectives',
  'merdeka_material_scopes'
];

function getItemKey(storeKey: string, item: any): string {
  if (!item || typeof item !== 'object') return '';
  if (storeKey === 'merdeka_formative_scores') {
    if (item.student_id && item.tp_id) {
      const sem = item.semester || 'sem-ganjil';
      const yr = item.tahun || 'th-2025';
      return `fs_${item.student_id}_${item.tp_id}_${sem}_${yr}`;
    }
  } else if (storeKey === 'merdeka_summative_scope_scores') {
    if (item.student_id && item.lingkup_id) {
      const sem = item.semester || 'sem-ganjil';
      const yr = item.tahun || 'th-2025';
      return `sss_${item.student_id}_${item.lingkup_id}_${sem}_${yr}`;
    }
  } else if (storeKey === 'merdeka_semester_scores') {
    if (item.student_id && item.subject_id) {
      const sem = item.semester || 'sem-ganjil';
      const yr = item.tahun || 'th-2025';
      return `ses_${item.student_id}_${item.subject_id}_${sem}_${yr}`;
    }
  }
  return item.id ? String(item.id) : '';
}

function mergeArrays(storeKey: string, local: any[], remote: any[]): any[] {
  if (!Array.isArray(local)) return remote || [];
  if (!Array.isArray(remote)) return local || [];

  const isScoreTable = SCORE_KEYS.includes(storeKey);
  const mergedMap = new Map<string, any>();
  
  // 1. Process remote items first (authoritative server / peer state)
  remote.forEach(remoteItem => {
    if (!remoteItem || typeof remoteItem !== 'object') return;
    const k = getItemKey(storeKey, remoteItem) || (remoteItem.id ? String(remoteItem.id) : '');
    if (!k) return;

    const existing = mergedMap.get(k);
    if (!existing) {
      mergedMap.set(k, isScoreTable ? { ...remoteItem, id: k } : remoteItem);
    } else {
      // Pick newer remote or the one with a non-zero score
      const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
      const remoteTime = remoteItem.updated_at ? new Date(remoteItem.updated_at).getTime() : 0;
      if (remoteTime > existingTime || (existing.nilai === 0 && remoteItem.nilai > 0)) {
        mergedMap.set(k, isScoreTable ? { ...remoteItem, id: k } : remoteItem);
      }
    }
  });
  
  // 2. Merge local items
  local.forEach(localItem => {
    if (!localItem || typeof localItem !== 'object') return;
    const k = getItemKey(storeKey, localItem) || (localItem.id ? String(localItem.id) : '');
    if (!k) return;

    const remoteItem = mergedMap.get(k);
    if (!remoteItem) {
      mergedMap.set(k, isScoreTable ? { ...localItem, id: k } : localItem);
    } else {
      if (isScoreTable) {
        const localTime = localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;
        const remoteTime = remoteItem.updated_at ? new Date(remoteItem.updated_at).getTime() : 0;
        // Only keep local score if local edit was made strictly newer by > 1.5 seconds AND has valid grade
        if (localTime > remoteTime + 1500 && localItem.nilai !== undefined && localItem.nilai !== null) {
          mergedMap.set(k, { ...remoteItem, ...localItem, id: k });
        } else {
          // Authoritative remote score wins
          mergedMap.set(k, { ...localItem, ...remoteItem, id: k });
        }
      } else {
        const localTime = localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;
        const remoteTime = remoteItem.updated_at ? new Date(remoteItem.updated_at).getTime() : 0;
        if (localTime > remoteTime) {
          mergedMap.set(k, { ...remoteItem, ...localItem });
        } else {
          mergedMap.set(k, { ...localItem, ...remoteItem });
        }
      }
    }
  });
  
  return Array.from(mergedMap.values());
}

// Track tables that failed upsert to prevent repetitive warning spam
const tableWarningSilenced = new Set<string>();

/**
 * Push data into a dedicated separate relational table in Supabase.
 */
async function pushToDedicatedTable(tableName: string, localItems: any[]): Promise<boolean> {
  if (!Array.isArray(localItems)) return true;

  try {
    // 1. For master tables, reconcile deletions
    if (MASTER_TABLES.includes(tableName)) {
      const { data: remoteRows, error: selError } = await supabase
        .from(tableName)
        .select('id');

      if (!selError && Array.isArray(remoteRows)) {
        const localIdSet = new Set(localItems.map(item => String(item.id)));
        const idsToDelete = remoteRows
          .map(r => String(r.id))
          .filter(id => !localIdSet.has(id));

        if (idsToDelete.length > 0) {
          for (let i = 0; i < idsToDelete.length; i += 100) {
            const batch = idsToDelete.slice(i, i + 100);
            await supabase.from(tableName).delete().in('id', batch);
          }
        }
      }
    }

    // 2. Upsert items in batches of 100
    if (localItems.length > 0) {
      for (let i = 0; i < localItems.length; i += 100) {
        const batch = localItems.slice(i, i + 100).map(item => {
          const canonicalId = getItemKey(tableName, item) || (item.id ? String(item.id) : '');
          return {
            ...item,
            id: canonicalId || item.id,
            updated_at: item.updated_at || new Date().toISOString()
          };
        });

        const { error: upsertError } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: 'id' });

        if (upsertError) {
          if (!tableWarningSilenced.has(tableName)) {
            tableWarningSilenced.add(tableName);
          }
          return false;
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Pull rows directly from a dedicated separate table in Supabase.
 * Uses automatic pagination with .range() in chunks of 1,000 to ensure
 * ALL rows (e.g. all 7,798+ formative scores and 2,047+ summative scores)
 * are retrieved completely without being capped by PostgREST's 1,000-row limit!
 */
export async function pullFromDedicatedTable(tableName: string): Promise<any[] | null> {
  try {
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(from, to);

      if (error) {
        if (page === 0) return null;
        break;
      }

      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
      } else {
        allRows.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
          if (page > 50) hasMore = false; // Safety cap at 50,000 rows
        }
      }
    }

    return allRows;
  } catch {
    return null;
  }
}

/**
 * Push all local tables to separate tables in Supabase.
 */
export async function pushToSupabase(): Promise<boolean> {
  setSyncStatus({ status: 'syncing', errorMessage: null });
  
  try {
    let successCount = 0;

    for (const key of SYNC_KEYS) {
      const localData = localStorage.getItem(key);
      if (localData === null) continue;

      let parsed: any[];
      try {
        parsed = JSON.parse(localData);
      } catch {
        continue;
      }

      const ok = await pushToDedicatedTable(key, parsed);
      if (ok) successCount++;
    }

    setSyncStatus({
      status: 'success',
      lastSync: new Date().toISOString(),
      errorMessage: null
    });
    
    return true;
  } catch (err: any) {
    setSyncStatus({
      status: 'error',
      errorMessage: err?.message || 'Gagal menyinkronkan data ke Supabase.'
    });
    return false;
  }
}

interface PullOptions {
  silent?: boolean;
  autoPushIfEmpty?: boolean;
}

/**
 * Pull tables from Supabase and synchronize with localStorage.
 * Runs in parallel across all separated tables.
 * OPTIMIZED: Only updates localStorage and dispatches render events IF data actually changed!
 */
export async function pullFromSupabase(options: PullOptions = {}): Promise<boolean> {
  const { silent = false, autoPushIfEmpty = true } = options;

  if (!silent) {
    setSyncStatus({ status: 'syncing', errorMessage: null });
  }

  try {
    let pulledCount = 0;
    let tablesWithData = 0;
    let anyTableChanged = false;

    // Fetch all tables in parallel
    const results = await Promise.allSettled(
      SYNC_KEYS.map(async (key) => {
        const rows = await pullFromDedicatedTable(key);
        return { key, rows };
      })
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.rows !== null) {
        const { key, rows } = res.value;
        if (rows.length > 0) {
          tablesWithData++;
          pulledCount += rows.length;

          const localRaw = localStorage.getItem(key);
          let finalVal = rows;

          if (localRaw && SCORE_KEYS.includes(key)) {
            try {
              const localParsed = JSON.parse(localRaw);
              if (Array.isArray(localParsed)) {
                finalVal = mergeArrays(key, localParsed, rows);
              }
            } catch {}
          }

          // Compare stringified versions to detect ACTUAL changes
          const newRaw = JSON.stringify(finalVal);
          if (localRaw !== newRaw) {
            localStorage.setItem(key, newRaw);
            anyTableChanged = true;
          }
        }
      }
    }

    // If remote has no data yet, check if local has data to seed remote automatically
    if (tablesWithData === 0) {
      let localHasData = false;
      for (const key of ['merdeka_teachers', 'merdeka_classes', 'merdeka_subjects', 'merdeka_profiles']) {
        const raw = localStorage.getItem(key);
        if (raw && raw !== '[]') {
          localHasData = true;
          break;
        }
      }

      if (localHasData && autoPushIfEmpty) {
        await pushToSupabase();
        return true;
      }

      setSyncStatus({
        status: 'idle',
        lastSync: new Date().toISOString(),
        errorMessage: null
      });
      return true;
    }

    setSyncStatus({
      status: 'success',
      lastSync: new Date().toISOString(),
      errorMessage: null
    });

    // ONLY dispatch render event if local database was actually modified by new data!
    if (anyTableChanged) {
      window.dispatchEvent(new Event('merdeka_db_synced'));
    }
    return true;
  } catch (err: any) {
    if (!silent) {
      setSyncStatus({
        status: 'error',
        errorMessage: err?.message || 'Gagal mengunduh data dari Supabase.'
      });
    }
    return false;
  }
}

// Unique identifier for this browser/tab instance to prevent echo loops
export const CLIENT_INSTANCE_ID = 'cli_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

// Real-time synchronization channel
let realtimeChannel: RealtimeChannel | null = null;

/**
 * Broadcast local table update to all other connected browsers/devices in real time (< 50ms)
 * through Supabase Realtime WebSockets.
 */
export function broadcastTableUpdate(table: string, data: any): void {
  if (!realtimeChannel) return;
  try {
    let broadcastData = data;
    let isPartial = false;

    // Supabase Realtime has a 256KB frame limit. If data is a large array (> 80 items),
    // send the 80 most recently modified items to keep message size ~12KB and ultra-fast (<50ms).
    if (Array.isArray(data) && data.length > 80) {
      isPartial = true;
      const sorted = [...data].sort((a, b) => {
        const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tB - tA;
      });
      broadcastData = sorted.slice(0, 80);
    }

    realtimeChannel.send({
      type: 'broadcast',
      event: 'db_sync_table',
      payload: {
        table,
        data: broadcastData,
        isPartial,
        sender: CLIENT_INSTANCE_ID,
        timestamp: Date.now()
      }
    });
  } catch {
    // Non-blocking fallback
  }
}

// Debounced auto-push for fast UI response without freezing keystrokes
const debounceTimers: Record<string, any> = {};

export async function queueAutoPush(key: string, data: any): Promise<void> {
  if (!SYNC_KEYS.includes(key)) return;

  // 1. Immediately broadcast to other open browsers/laptops/phones over WebSocket (0ms delay)
  broadcastTableUpdate(key, data);

  // 2. Fast debounce (100ms) for PostgreSQL upsert to Supabase server
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  debounceTimers[key] = setTimeout(async () => {
    try {
      if (Array.isArray(data)) {
        await pushToDedicatedTable(key, data);
        setSyncStatus({
          status: 'success',
          lastSync: new Date().toISOString()
        });
      }
    } catch {
      // Quiet fallback
    }
  }, 100);
}

// Debounce dispatching merdeka_db_synced so multiple simultaneous row updates batch smoothly
let syncNotifyTimer: any = null;
function notifyDbSynced(onSync?: () => void) {
  if (syncNotifyTimer) clearTimeout(syncNotifyTimer);
  syncNotifyTimer = setTimeout(() => {
    window.dispatchEvent(new Event('merdeka_db_synced'));
    if (onSync) onSync();
  }, 60);
}

export function initSupabaseRealtime(onSync?: () => void) {
  if (realtimeChannel) {
    return realtimeChannel;
  }

  try {
    realtimeChannel = supabase
      .channel('merdeka_realtime_sync', {
        config: {
          broadcast: { ack: false, self: false }
        }
      })
      // A. Listen to ultra-fast peer-to-peer broadcast across all active browsers and devices
      .on(
        'broadcast',
        { event: 'db_sync_table' },
        ({ payload }) => {
          if (!payload || payload.sender === CLIENT_INSTANCE_ID) return;
          const { table, data, isPartial } = payload;
          if (!SYNC_KEYS.includes(table) || !Array.isArray(data)) return;

          const localRaw = localStorage.getItem(table);
          let finalData = data;

          if (localRaw) {
            try {
              const localParsed = JSON.parse(localRaw);
              if (Array.isArray(localParsed)) {
                finalData = mergeArrays(table, localParsed, data);
              }
            } catch {}
          }

          const newRaw = JSON.stringify(finalData);
          if (localRaw !== newRaw) {
            try {
              localStorage.setItem(table, newRaw);
            } catch {}
            notifyDbSynced(onSync);
          }

          // If the broadcast was partial or involves large score ledgers,
          // trigger an asynchronous background pull to ensure all 7,798+ rows remain synchronized!
          if (isPartial || SCORE_KEYS.includes(table)) {
            pullFromDedicatedTable(table).then(freshRows => {
              if (freshRows && Array.isArray(freshRows)) {
                const cur = localStorage.getItem(table);
                let merged = freshRows;
                if (cur) {
                  try {
                    const curParsed = JSON.parse(cur);
                    if (Array.isArray(curParsed)) {
                      merged = mergeArrays(table, curParsed, freshRows);
                    }
                  } catch {}
                }
                const mergedStr = JSON.stringify(merged);
                if (cur !== mergedStr) {
                  try {
                    localStorage.setItem(table, mergedStr);
                  } catch {}
                  notifyDbSynced(onSync);
                }
              }
            });
          }
        }
      )
      // B. Listen to direct PostgreSQL changes from Supabase
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const table = payload.table;
          if (!SYNC_KEYS.includes(table)) return;

          const currentRaw = localStorage.getItem(table);
          let currentList: any[] = [];
          try {
            currentList = currentRaw ? JSON.parse(currentRaw) : [];
            if (!Array.isArray(currentList)) currentList = [];
          } catch {
            currentList = [];
          }

          const targetKey = getItemKey(table, payload.new || payload.old);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const canonicalId = targetKey || (payload.new?.id ? String(payload.new.id) : '');
            const newRecord = {
              ...payload.new,
              id: canonicalId || payload.new?.id
            };
            const existsIdx = currentList.findIndex(i => 
              (canonicalId && (String(i.id) === canonicalId || getItemKey(table, i) === canonicalId)) ||
              (payload.new?.id && String(i.id) === String(payload.new.id))
            );
            if (existsIdx >= 0) {
              currentList[existsIdx] = { ...currentList[existsIdx], ...newRecord };
            } else {
              currentList.push(newRecord);
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id ? String(payload.old.id) : '';
            currentList = currentList.filter(i => {
              if (oldId && String(i.id) === oldId) return false;
              if (targetKey && (String(i.id) === targetKey || getItemKey(table, i) === targetKey)) return false;
              return true;
            });
          }

          const newRaw = JSON.stringify(currentList);
          // Only trigger state reload if the data actually differs from current local storage!
          if (currentRaw !== newRaw) {
            localStorage.setItem(table, newRaw);
            notifyDbSynced(onSync);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus({ isRealtimeConnected: true });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSyncStatus({ isRealtimeConnected: false });
          // Auto-reconnect after 3 seconds if disconnected
          setTimeout(() => {
            if (realtimeChannel) {
              realtimeChannel.subscribe();
            }
          }, 3000);
        }
      });
  } catch {
    // Non-fatal
  }

  return realtimeChannel;
}
