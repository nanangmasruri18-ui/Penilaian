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

// Define keys to sync (exactly matching the localStorage keys in src/db.ts)
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

function setSyncStatus(status: SyncStatus) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  // Dispatch custom event to notify React components to re-render
  window.dispatchEvent(new Event('supabase_sync_changed'));
}

/**
 * Push all local tables to Supabase.
 * We store each key as a row in a unified 'merdeka_store' table for absolute reliability.
 * Schema of the table:
 *   table name: merdeka_store
 *   columns: 
 *     - key: text (primary key)
 *     - value: jsonb
 *     - updated_at: timestamp with time zone (default now())
 * 
 * If the table does not exist yet or fails, we provide helpful error reporting
 * so the user knows they need to set up the table, or we can fallback gracefully.
 */
export async function pushToSupabase(): Promise<boolean> {
  setSyncStatus({ status: 'syncing', lastSync: getSyncStatus().lastSync, errorMessage: null });
  
  try {
    for (const key of SYNC_KEYS) {
      const localData = localStorage.getItem(key);
      if (localData === null) continue;

      let parsed;
      try {
        parsed = JSON.parse(localData);
      } catch {
        continue;
      }

      // Upsert into 'merdeka_store' table
      const { error } = await supabase
        .from('merdeka_store')
        .upsert({ 
          key: key, 
          value: parsed,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) {
        throw new Error(`Gagal menyimpan tabel "${key}": ${error.message}`);
      }
    }

    setSyncStatus({
      status: 'success',
      lastSync: new Date().toISOString(),
      errorMessage: null
    });
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
 * Pull all tables from Supabase and overwrite localStorage.
 */
export async function pullFromSupabase(): Promise<boolean> {
  setSyncStatus({ status: 'syncing', lastSync: getSyncStatus().lastSync, errorMessage: null });

  try {
    const { data, error } = await supabase
      .from('merdeka_store')
      .select('*');

    if (error) {
      throw new Error(`Gagal mengambil data: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Supabase database kosong. Klik "Kirim ke Supabase" untuk mengunggah data lokal Anda terlebih dahulu.');
    }

    // Update localStorage
    let updatedCount = 0;
    for (const row of data) {
      if (SYNC_KEYS.includes(row.key)) {
        localStorage.setItem(row.key, JSON.stringify(row.value));
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      throw new Error('Tidak ada data penilaian kurikulum merdeka yang cocok ditemukan di Supabase.');
    }

    setSyncStatus({
      status: 'success',
      lastSync: new Date().toISOString(),
      errorMessage: null
    });

    // Reload state inside current window context
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

/**
 * Background auto-push function for individual table mutations.
 * Doesn't block the UI, silent execution.
 */
export async function queueAutoPush(key: string, data: any): Promise<void> {
  if (!SYNC_KEYS.includes(key)) return;
  
  try {
    await supabase
      .from('merdeka_store')
      .upsert({
        key: key,
        value: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
  } catch (err) {
    console.warn(`[Supabase Auto-Push] Failed to auto-save key "${key}":`, err);
  }
}
