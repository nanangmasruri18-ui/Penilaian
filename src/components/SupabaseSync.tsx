import { useState, useEffect } from 'react';
import { supabase, getSyncStatus, pushToSupabase, pullFromSupabase, SyncStatus } from '../supabase';
import { db, logAudit } from '../db';
import { ToastType } from './Toast';
import { 
  Database, RefreshCw, CheckCircle2, AlertCircle, Copy, Check, 
  ExternalLink, Lock, Server, HelpCircle, Cloud, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';
import { motion } from 'motion/react';

interface SupabaseSyncProps {
  addToast: (type: ToastType, title: string, message: string) => void;
  onRefreshStats?: () => void;
}

export function SupabaseSync({ addToast, onRefreshStats }: SupabaseSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [isCopied, setIsCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Mask credentials for visual safety
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://htbpkfzwutyekhfldini.supabase.co';
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWR3b3l0a2p2dWtudWN3eW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjc3MjIsImV4cCI6MjA5OTYwMzcyMn0.3f2I5r7_EH9drjP2DsmV-AzCmsevjkIHe7zb6kfTI7s';

  const maskedUrl = supabaseUrl.replace(/(https?:\/\/)[^.]+(\.supabase\.co)/, '$1******$2');
  const maskedKey = anonKey.slice(0, 8) + '...' + anonKey.slice(-8);

  const sqlSetupCommand = `-- 1. Buat Tabel Penyimpanan Utama (merdeka_store)
create table if not exists merdeka_store (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default now()
);

-- 2. Aktifkan Keamanan Akses (Row Level Security - RLS)
alter table merdeka_store enable row level security;

-- 3. Buat Kebijakan Akses Publik (Supabase Anon Key)
create policy "Allow public read, write, upsert"
on merdeka_store for all
to public
using (true)
with check (true);`;

  useEffect(() => {
    // Listen to Supabase sync changes from background mutations
    const handleSyncChange = () => {
      setSyncStatus(getSyncStatus());
    };

    window.addEventListener('supabase_sync_changed', handleSyncChange);
    return () => {
      window.removeEventListener('supabase_sync_changed', handleSyncChange);
    };
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSetupCommand);
    setIsCopied(true);
    addToast('success', 'SQL Disalin', 'Query pembuatan tabel telah disalin ke clipboard.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage(null);
    try {
      // Try to select from the store, or do a dummy query
      const { data, error } = await supabase.from('merdeka_store').select('key').limit(1);
      
      if (error) {
        throw error;
      }
      
      setTestStatus('success');
      setTestMessage('Koneksi Supabase aktif & tabel "merdeka_store" terdeteksi sempurna!');
      addToast('success', 'Koneksi Berhasil', 'Terhubung ke database Supabase dengan sukses!');
    } catch (err: any) {
      console.error(err);
      setTestStatus('error');
      setTestMessage(
        err.code === 'PGRST116' || err.message?.includes('does not exist')
          ? 'Terhubung ke Supabase, namun tabel "merdeka_store" belum dibuat. Sila jalankan kode SQL di bawah ini di SQL Editor Supabase Anda.'
          : `Gagal terhubung: ${err.message || 'Periksa koneksi internet atau kredensial Anda.'}`
      );
      addToast('error', 'Koneksi Gagal', 'Gagal memverifikasi tabel di database Supabase.');
    }
  };

  const handlePush = async () => {
    const confirm = window.confirm('Apakah Anda yakin ingin MENGIRIM seluruh data lokal Anda ke Supabase? Tindakan ini akan menimpa data yang ada di cloud.');
    if (!confirm) return;

    const session = db.getSession();
    const user = session ? session.nama : 'System';

    logAudit(user, 'Memulai pengiriman (push) data lokal ke Supabase.');
    
    const success = await pushToSupabase();
    if (success) {
      addToast('success', 'Sinkronisasi Berhasil', 'Data lokal Anda telah berhasil dicadangkan ke Supabase!');
      logAudit(user, 'Sukses mengirim data lokal ke Supabase.');
      if (onRefreshStats) onRefreshStats();
    } else {
      const currentStatus = getSyncStatus();
      addToast('error', 'Sinkronisasi Gagal', currentStatus.errorMessage || 'Gagal mengirim data.');
      logAudit(user, `Gagal mengirim data ke Supabase: ${currentStatus.errorMessage}`);
    }
  };

  const handlePull = async () => {
    const confirm = window.confirm('Apakah Anda yakin ingin MENARIK data dari Supabase? Data di aplikasi Anda saat ini akan sepenuhnya diganti oleh data dari cloud.');
    if (!confirm) return;

    const session = db.getSession();
    const user = session ? session.nama : 'System';

    logAudit(user, 'Memulai penarikan (pull) data dari Supabase.');

    const success = await pullFromSupabase();
    if (success) {
      addToast('success', 'Data Diunduh', 'Berhasil memperbarui database lokal dengan data dari Supabase!');
      logAudit(user, 'Sukses mengunduh dan menerapkan data dari Supabase.');
      if (onRefreshStats) onRefreshStats();
      // Reload page to re-render all views with new synced data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const currentStatus = getSyncStatus();
      addToast('error', 'Gagal Mengunduh', currentStatus.errorMessage || 'Gagal menarik data.');
      logAudit(user, `Gagal menarik data dari Supabase: ${currentStatus.errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. STATUS SUMMARY BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Status Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm col-span-2 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Status Database Supabase</h3>
              <p className="text-xs text-slate-500">Koneksi real-time untuk daya tahan data Kurikulum Merdeka.</p>
            </div>
            
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider
              ${syncStatus.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 
                syncStatus.status === 'syncing' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400' : 
                syncStatus.status === 'error' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' : 
                'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}
            `}>
              <span className={`w-2 h-2 rounded-full 
                ${syncStatus.status === 'success' ? 'bg-emerald-500' : 
                  syncStatus.status === 'syncing' ? 'bg-indigo-500 animate-pulse' : 
                  syncStatus.status === 'error' ? 'bg-rose-500' : 
                  'bg-slate-400'}
              `} />
              {syncStatus.status === 'success' ? 'Sinkron' : 
               syncStatus.status === 'syncing' ? 'Menyinkronkan' : 
               syncStatus.status === 'error' ? 'Koneksi Bermasalah' : 'Belum Sinkron'}
            </span>
          </div>

          {/* Masked credentials list */}
          <div className="mt-6 space-y-2 border-t border-slate-50 dark:border-slate-800/80 pt-4 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1"><Server className="w-3.5 h-3.5 text-slate-400" /> Database Endpoint:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200" title={supabaseUrl}>{maskedUrl}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-slate-400" /> Public Anon Key:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200" title={anonKey}>{maskedKey}</span>
            </div>
            {syncStatus.lastSync && (
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1">
                <span>Sinkronisasi Terakhir:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{new Date(syncStatus.lastSync).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/80">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-slate-600 dark:text-slate-300 bg-transparent transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5" />
              {testStatus === 'testing' ? 'Menguji...' : 'Uji Koneksi'}
            </button>
            <button
              onClick={handlePush}
              disabled={syncStatus.status === 'syncing'}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              Kirim ke Supabase (Push)
            </button>
            <button
              onClick={handlePull}
              disabled={syncStatus.status === 'syncing'}
              className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Tarik dari Supabase (Pull)
            </button>
          </div>
        </div>

        {/* Sync Guidance Panel */}
        <div className="bg-indigo-50/40 dark:bg-indigo-950/10 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-4 h-4" /> Panduan Sinkronisasi
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Aplikasi ini mengadopsi pola <strong>Offline-First / Master-Kache</strong>. Anda dapat menginput nilai dengan lancar tanpa bergantung pada koneksi internet.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Setiap kali Anda menambah/mengubah nilai di form, sistem akan <strong>otomatis menyimpan di background</strong> ke Supabase jika internet terhubung.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-indigo-100/30 text-[10px] text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tips:</span>
            Gunakan tombol <strong>Push</strong> untuk migrasi pertama kali demi mempopulasikan database Supabase Anda yang kosong!
          </div>
        </div>
      </div>

      {/* 2. CONNECTION TEST NOTIFICATION */}
      {testMessage && (
        <div className={`p-4 rounded-xl border text-xs flex gap-3 items-start animate-fadeIn
          ${testStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300' : 
            'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300'}
        `}>
          {testStatus === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
          <div>
            <p className="font-bold">{testStatus === 'success' ? 'Uji Koneksi Berhasil!' : 'Koneksi Sukses, Tabel Perlu Dibuat'}</p>
            <p className="mt-1 leading-relaxed">{testMessage}</p>
          </div>
        </div>
      )}

      {/* 3. SQL SETUP CODES SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-150 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Konfigurasi Tabel SQL Supabase</h3>
            <p className="text-xs text-slate-500 mt-0.5">Jalankan instruksi SQL berikut sekali saja di dashboard Supabase Anda.</p>
          </div>
          
          <button
            onClick={handleCopySql}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-100/30 dark:border-indigo-900/30 transition-all cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {isCopied ? 'Tersalin' : 'Salin SQL'}
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Langkah Setup Database:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Buka proyek Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a></li>
              <li>Masuk ke tab <strong>SQL Editor</strong> di bilah menu kiri.</li>
              <li>Klik <strong>New Query</strong> dan paste query SQL di bawah ini.</li>
              <li>Klik tombol <strong>Run</strong> di kanan bawah untuk membuat tabel.</li>
            </ol>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-72">
              <code>{sqlSetupCommand}</code>
            </pre>
          </div>
        </div>
      </div>

    </div>
  );
}
