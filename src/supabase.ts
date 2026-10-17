import { createClient } from '@supabase/supabase-js';

// User's Supabase credentials as fallback/defaults, but can be overridden by environment variables
const RAW_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://anadwoytkjvuknucwymd.supabase.co';

// Sanitize URL: strip trailing slashes, /rest/v1, /rest/v1/ so we have the base project URL
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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define keys to sync (exactly matching the localStorage keys & Supabase table names)
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
}

// Track sync status in localStorage so it persists across reloads
const STATUS_KEY = 'merdeka_supabase_sync_status';

export function getSyncStatus(): SyncStatus {
  const data = localStorage.getItem(STATUS_KEY);
  if (!data) {
    return { status: 'idle', lastSync: null, errorMessage: null };
  }
  try {
    return JSON.parse(data);
  } catch {
    return { status: 'idle', lastSync: null, errorMessage: null };
  }
}

export function setSyncStatus(status: SyncStatus) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  // Dispatch custom event to notify React components to re-render
  window.dispatchEvent(new Event('supabase_sync_changed'));
}

// Only score tables use mergeArrays to support concurrent teacher grading
export const SCORE_KEYS = [
  'merdeka_formative_scores',
  'merdeka_summative_scope_scores',
  'merdeka_semester_scores'
];

// Tables where deletion is authoritative (local deletions should remove remote rows)
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

/**
 * Identify a composite unique key for score records to allow concurrent teacher grading without conflicts
 */
function getItemKey(storeKey: string, item: any): string {
  if (!item || typeof item !== 'object') return '';
  if (storeKey === 'merdeka_formative_scores') {
    if (item.student_id && item.tp_id) {
      const sem = item.semester || 'sem-ganjil';
      const yr = item.tahun || 'th-2025';
      return `${item.student_id}_${item.tp_id}_${sem}_${yr}`;
    }
  } else if (storeKey === 'merdeka_summative_scope_scores') {
    if (item.student_id && item.lingkup_id) {
      const sem = item.semester || 'sem-ganjil';
      const yr = item.tahun || 'th-2025';
      return `${item.student_id}_${item.lingkup_id}_${sem}_${yr}`;
    }
  } else if (storeKey === 'merdeka_semester_scores') {
    if (item.student_id && item.subject_id) {
      const sem = item.semester || 'sem-ganjil';
      const yr = item.tahun || 'th-2025';
      return `${item.student_id}_${item.subject_id}_${sem}_${yr}`;
    }
  }
  return item.id ? String(item.id) : '';
}

function mergeArrays(storeKey: string, local: any[], remote: any[]): any[] {
  if (!Array.isArray(local)) return remote || [];
  if (!Array.isArray(remote)) return local || [];

  const mergedMap = new Map<string, any>();
  
  // 1. Add remote items
  remote.forEach(remoteItem => {
    const k = getItemKey(storeKey, remoteItem);
    if (k) {
      mergedMap.set(k, remoteItem);
    }
  });
  
  // 2. Overwrite with local items if local is newer or equal (Last-Write-Wins)
  local.forEach(localItem => {
    const k = getItemKey(storeKey, localItem);
    if (k) {
      const remoteItem = mergedMap.get(k);
      if (!remoteItem) {
        mergedMap.set(k, localItem);
      } else {
        const localTime = localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;
        const remoteTime = remoteItem.updated_at ? new Date(remoteItem.updated_at).getTime() : 0;
        
        if (localTime >= remoteTime) {
          mergedMap.set(k, { ...remoteItem, ...localItem });
        }
      }
    }
  });
  
  return Array.from(mergedMap.values());
}

/**
 * Push data into a dedicated separate relational table in Supabase.
 * Supports chunking and authoritative deletion for master records.
 */
async function pushToDedicatedTable(tableName: string, localItems: any[]): Promise<boolean> {
  if (!Array.isArray(localItems)) return true;

  try {
    // 1. For master tables, handle deletions if items were removed locally
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
          // Delete in batches of 100
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
          // Ensure valid structure & timestamp
          return {
            ...item,
            updated_at: item.updated_at || new Date().toISOString()
          };
        });

        const { error: upsertError } = await supabase
          .from(tableName)
          .upsert(batch, { onConflict: 'id' });

        if (upsertError) {
          console.warn(`[pushToDedicatedTable] Error upserting to ${tableName}:`, upsertError);
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    console.warn(`[pushToDedicatedTable] Exception for ${tableName}:`, err);
    return false;
  }
}

/**
 * Pull rows directly from a dedicated separate table in Supabase.
 */
async function pullFromDedicatedTable(tableName: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      // Table might not exist yet in Supabase
      return null;
    }

    return Array.isArray(data) ? data : null;
  } catch (err) {
    return null;
  }
}

/**
 * Store-based fallback helper for backwards compatibility and JSON snapshot
 */
async function fetchMergeAndSave(key: string, localData: any): Promise<any> {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    
    // 1. Fetch current remote state
    const { data: remoteRow, error: fetchError } = await supabase
      .from('merdeka_store')
      .select('value, updated_at')
      .eq('key', key)
      .maybeSingle();

    if (fetchError) {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      continue;
    }

    const nowIso = new Date().toISOString();
    let finalData = localData;

    if (remoteRow) {
      if (SCORE_KEYS.includes(key) && remoteRow.value && Array.isArray(localData) && Array.isArray(remoteRow.value)) {
        finalData = mergeArrays(key, localData, remoteRow.value);
      }

      let query = supabase
        .from('merdeka_store')
        .update({
          value: finalData,
          updated_at: nowIso
        })
        .eq('key', key);

      if (remoteRow.updated_at === null || remoteRow.updated_at === undefined) {
        query = query.is('updated_at', null);
      } else {
        query = query.eq('updated_at', remoteRow.updated_at);
      }

      const { data: updateData, error: updateError } = await query.select();

      if (updateError) {
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        continue;
      }

      if (!updateData || updateData.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
        continue;
      }

      localStorage.setItem(key, JSON.stringify(finalData));
      return finalData;

    } else {
      const { error: insertError } = await supabase
        .from('merdeka_store')
        .insert({
          key: key,
          value: finalData,
          updated_at: nowIso
        });

      if (insertError) {
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        continue;
      }

      localStorage.setItem(key, JSON.stringify(finalData));
      return finalData;
    }
  }

  return localData;
}

/**
 * Push all local tables to Supabase.
 * Writes both to dedicated relational tables (merdeka_teachers, merdeka_students, etc.)
 * AND to the fallback merdeka_store for maximum reliability and backward compatibility.
 */
export async function pushToSupabase(): Promise<boolean> {
  setSyncStatus({ status: 'syncing', lastSync: getSyncStatus().lastSync, errorMessage: null });
  
  try {
    let dedicatedSuccessCount = 0;

    for (const key of SYNC_KEYS) {
      const localData = localStorage.getItem(key);
      if (localData === null) continue;

      let parsed: any[];
      try {
        parsed = JSON.parse(localData);
      } catch {
        continue;
      }

      // 1. Push to dedicated relational table
      const dedicatedSuccess = await pushToDedicatedTable(key, parsed);
      if (dedicatedSuccess) {
        dedicatedSuccessCount++;
      }

      // 2. Also save to merdeka_store as secondary snapshot/fallback
      try {
        await fetchMergeAndSave(key, parsed);
      } catch (err) {
        // Silently continue if store fails, primary goal is relational tables
      }
    }

    setSyncStatus({
      status: 'success',
      lastSync: new Date().toISOString(),
      errorMessage: null
    });
    
    // Notify React components to sync local states
    window.dispatchEvent(new Event('merdeka_db_synced'));
    return true;
  } catch (err: any) {
    console.error('Supabase Push Error:', err);
    setSyncStatus({
      status: 'error',
      lastSync: getSyncStatus().lastSync,
      errorMessage: err.message || 'Gagal menyinkronkan data ke Supabase.'
    });
    return false;
  }
}

/**
 * Pull tables from Supabase and overwrite localStorage.
 * Prioritizes dedicated relational tables, with fallback to merdeka_store.
 */
export async function pullFromSupabase(): Promise<boolean> {
  setSyncStatus({ status: 'syncing', lastSync: getSyncStatus().lastSync, errorMessage: null });

  try {
    let pulledCount = 0;

    // 1. Try pulling from dedicated tables first
    for (const key of SYNC_KEYS) {
      const dedicatedRows = await pullFromDedicatedTable(key);
      if (dedicatedRows !== null && dedicatedRows.length > 0) {
        const localRaw = localStorage.getItem(key);
        let finalVal = dedicatedRows;

        if (localRaw && SCORE_KEYS.includes(key)) {
          try {
            const localParsed = JSON.parse(localRaw);
            if (Array.isArray(localParsed)) {
              finalVal = mergeArrays(key, localParsed, dedicatedRows);
            }
          } catch (e) {}
        }

        localStorage.setItem(key, JSON.stringify(finalVal));
        pulledCount++;
      }
    }

    // 2. If dedicated tables had no data, fallback to merdeka_store
    if (pulledCount === 0) {
      const { data: storeData, error: storeError } = await supabase
        .from('merdeka_store')
        .select('*');

      if (!storeError && Array.isArray(storeData) && storeData.length > 0) {
        for (const row of storeData) {
          if (SYNC_KEYS.includes(row.key)) {
            const localRaw = localStorage.getItem(row.key);
            let finalVal = row.value;
            if (localRaw && SCORE_KEYS.includes(row.key)) {
              try {
                const localParsed = JSON.parse(localRaw);
                if (Array.isArray(localParsed) && Array.isArray(row.value)) {
                  finalVal = mergeArrays(row.key, localParsed, row.value);
                }
              } catch (e) {}
            }
            localStorage.setItem(row.key, JSON.stringify(finalVal));
            pulledCount++;
          }
        }
      }
    }

    if (pulledCount === 0) {
      throw new Error('Database Supabase kosong atau tabel belum dibuat. Jalankan skrip SQL di Supabase dan klik "Kirim ke Supabase (Push)" untuk mengisi data awal.');
    }

    setSyncStatus({
      status: 'success',
      lastSync: new Date().toISOString(),
      errorMessage: null
    });

    window.dispatchEvent(new Event('merdeka_db_synced'));
    return true;
  } catch (err: any) {
    console.error('Supabase Pull Error:', err);
    setSyncStatus({
      status: 'error',
      lastSync: getSyncStatus().lastSync,
      errorMessage: err.message || 'Gagal mengunduh data dari Supabase.'
    });
    return false;
  }
}

const queuePromises: Record<string, Promise<any>> = {};

/**
 * Background auto-push function for individual table mutations.
 * Updates both the dedicated relational table and the merdeka_store.
 */
export async function queueAutoPush(key: string, data: any): Promise<void> {
  if (!SYNC_KEYS.includes(key)) return;
  
  const parentPromise = queuePromises[key] || Promise.resolve();
  
  const currentPromise = parentPromise.then(async () => {
    try {
      // 1. Sync dedicated relational table
      if (Array.isArray(data)) {
        await pushToDedicatedTable(key, data);
      }
      // 2. Sync to backup store
      await fetchMergeAndSave(key, data);
      window.dispatchEvent(new Event('merdeka_db_synced'));
    } catch (err) {
      console.warn(`[Supabase Auto-Push] Failed to auto-save key "${key}":`, err);
    }
  });
  
  queuePromises[key] = currentPromise;
  await currentPromise;
}
