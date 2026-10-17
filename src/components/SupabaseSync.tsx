import { useState, useEffect } from 'react';
import { supabase, getSyncStatus, pushToSupabase, pullFromSupabase, SyncStatus, SYNC_KEYS } from '../supabase';
import { db, logAudit } from '../db';
import { ToastType } from './Toast';
import { 
  Database, RefreshCw, CheckCircle2, AlertCircle, Copy, Check, 
  ExternalLink, Lock, Server, HelpCircle, Cloud, ArrowUpRight, ArrowDownLeft,
  Table, Download, Code2, Layers, CheckSquare, Sparkles, FileText
} from 'lucide-react';

interface SupabaseSyncProps {
  addToast: (type: ToastType, title: string, message: string) => void;
  onRefreshStats?: () => void;
}

interface TableMeta {
  name: string;
  label: string;
  category: 'Master Data' | 'Penilaian' | 'Sistem';
  description: string;
  columns: string[];
}

const SEPARATED_TABLES: TableMeta[] = [
  {
    name: 'merdeka_teachers',
    label: 'Data Guru',
    category: 'Master Data',
    description: 'Menyimpan identitas guru pengajar dan kaitannya dengan akun login.',
    columns: ['id (PK, text)', 'user_id (text)', 'nama (text)', 'created_at', 'updated_at']
  },
  {
    name: 'merdeka_classes',
    label: 'Data Kelas',
    category: 'Master Data',
    description: 'Menyimpan daftar rombel/kelas (misal: Kelas 1A, Kelas 4B).',
    columns: ['id (PK, text)', 'nama (text)', 'created_at', 'updated_at']
  },
  {
    name: 'merdeka_students',
    label: 'Data Siswa',
    category: 'Master Data',
    description: 'Menyimpan data siswa lengkap dengan NISN dan referensi ID kelas.',
    columns: ['id (PK, text)', 'nisn (text)', 'nama (text)', 'kelas_id (text)', 'created_at', 'updated_at']
  },
  {
    name: 'merdeka_subjects',
    label: 'Mata Pelajaran',
    category: 'Master Data',
    description: 'Menyimpan daftar mata pelajaran Kurikulum Merdeka.',
    columns: ['id (PK, text)', 'nama (text)', 'created_at', 'updated_at']
  },
  {
    name: 'merdeka_assignments',
    label: 'Penugasan Guru',
    category: 'Master Data',
    description: 'Relasi penugasan guru mengajar mapel tertentu di kelas tertentu.',
    columns: ['id (PK, text)', 'teacher_id (text)', 'class_id (text)', 'subject_id (text)', 'created_at', 'updated_at']
  },
  {
    name: 'merdeka_profiles',
    label: 'Profil Pengguna',
    category: 'Sistem',
    description: 'Akun otentikasi login Admin dan Guru.',
    columns: ['id (PK, text)', 'nama (text)', 'role (Admin|Guru)', 'email (text)', 'password (text)', 'updated_at']
  },
  {
    name: 'merdeka_academic_years',
    label: 'Tahun Ajaran',
    category: 'Sistem',
    description: 'Pengaturan periode tahun pelajaran aktif (misal 2025/2026).',
    columns: ['id (PK, text)', 'nama (text)', 'aktif (boolean)', 'updated_at']
  },
  {
    name: 'merdeka_semesters',
    label: 'Semester',
    category: 'Sistem',
    description: 'Pengaturan semester aktif (Ganjil / Genap).',
    columns: ['id (PK, text)', 'nama (text)', 'aktif (boolean)', 'updated_at']
  },
  {
    name: 'merdeka_learning_objectives',
    label: 'Tujuan Pembelajaran (TP)',
    category: 'Penilaian',
    description: 'Target pencapaian pembelajaran per mapel dan rombel.',
    columns: ['id (PK, text)', 'subject_id (text)', 'class_id (text)', 'kode (text)', 'deskripsi (text)', 'updated_at']
  },
  {
    name: 'merdeka_material_scopes',
    label: 'Lingkup Materi (LM)',
    category: 'Penilaian',
    description: 'Cakupan bab/tema materi pelajaran yang diujikan secara sumatif.',
    columns: ['id (PK, text)', 'subject_id (text)', 'class_id (text)', 'nama (text)', 'updated_at']
  },
  {
    name: 'merdeka_formative_scores',
    label: 'Nilai Formatif',
    category: 'Penilaian',
    description: 'Rekam skor penilaian formatif siswa per Tujuan Pembelajaran (TP).',
    columns: ['id (PK, text)', 'student_id (text)', 'tp_id (text)', 'nilai (numeric)', 'semester', 'tahun', 'updated_at']
  },
  {
    name: 'merdeka_summative_scope_scores',
    label: 'Nilai Sumatif Lingkup Materi',
    category: 'Penilaian',
    description: 'Rekam skor sumatif per lingkup materi (LM).',
    columns: ['id (PK, text)', 'student_id (text)', 'lingkup_id (text)', 'nilai (numeric)', 'semester', 'tahun', 'updated_at']
  },
  {
    name: 'merdeka_semester_scores',
    label: 'Nilai Sumatif Akhir Semester (SAS)',
    category: 'Penilaian',
    description: 'Rekam skor evaluasi akhir semester per siswa dan mata pelajaran.',
    columns: ['id (PK, text)', 'student_id (text)', 'subject_id (text)', 'nilai (numeric)', 'semester', 'tahun', 'updated_at']
  },
  {
    name: 'merdeka_audit_logs',
    label: 'Audit Log Aktivitas',
    category: 'Sistem',
    description: 'Jejak rekaman aktivitas perubahan data untuk akuntabilitas sistem.',
    columns: ['id (PK, text)', 'user (text)', 'action (text)', 'timestamp (text)']
  },
  {
    name: 'merdeka_store',
    label: 'Cadangan Snapshot Key-Value',
    category: 'Sistem',
    description: 'Penyimpanan cadangan / failover otomatis untuk menjaga kontinuitas data.',
    columns: ['key (PK, text)', 'value (jsonb)', 'updated_at (timestamptz)']
  }
];

export function SupabaseSync({ addToast, onRefreshStats }: SupabaseSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [isCopied, setIsCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [detectedTables, setDetectedTables] = useState<string[]>([]);
  const [selectedTableTab, setSelectedTableTab] = useState<'all' | 'Master Data' | 'Penilaian' | 'Sistem'>('all');

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://anadwoytkjvuknucwymd.supabase.co';
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWR3b3l0a2p2dWtudWN3eW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjc3MjIsImV4cCI6MjA5OTYwMzcyMn0.3f2I5r7_EH9drjP2DsmV-AzCmsevjkIHe7zb6kfTI7s';

  const maskedUrl = supabaseUrl.replace(/(https?:\/\/)[^.]+(\.supabase\.co)/, '$1******$2');
  const maskedKey = anonKey.slice(0, 8) + '...' + anonKey.slice(-8);

  const sqlSetupCommand = `-- ====================================================================
-- SKRIP SQL LENGKAP: DATABASE KURIKULUM MERDEKA (SUPABASE POSTGRESQL)
-- Tabel Terpisah: Guru, Kelas, Siswa, Mapel, Nilai & Sistem
-- ====================================================================

-- 1. TABEL TAHUN AJARAN
create table if not exists public.merdeka_academic_years (
  id text primary key,
  nama text not null,
  aktif boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. TABEL SEMESTER
create table if not exists public.merdeka_semesters (
  id text primary key,
  nama text not null,
  aktif boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. TABEL PROFIL PENGGUNA (ADMIN & GURU)
create table if not exists public.merdeka_profiles (
  id text primary key,
  nama text not null,
  role text not null check (role in ('Admin', 'Guru')),
  email text not null,
  password text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. TABEL DATA GURU
create table if not exists public.merdeka_teachers (
  id text primary key,
  user_id text,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. TABEL DATA KELAS
create table if not exists public.merdeka_classes (
  id text primary key,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 6. TABEL MATA PELAJARAN
create table if not exists public.merdeka_subjects (
  id text primary key,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 7. TABEL DATA SISWA
create table if not exists public.merdeka_students (
  id text primary key,
  nisn text default '',
  nama text not null,
  kelas_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_students_kelas on public.merdeka_students(kelas_id);
create index if not exists idx_students_nisn on public.merdeka_students(nisn);

-- 8. TABEL PENUGASAN GURU (ASSIGNMENT)
create table if not exists public.merdeka_assignments (
  id text primary key,
  teacher_id text not null,
  class_id text not null,
  subject_id text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_assignments_teacher on public.merdeka_assignments(teacher_id);
create index if not exists idx_assignments_class on public.merdeka_assignments(class_id);

-- 9. TABEL TUJUAN PEMBELAJARAN (TP)
create table if not exists public.merdeka_learning_objectives (
  id text primary key,
  subject_id text not null,
  class_id text not null,
  kode text not null,
  deskripsi text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_tp_class_subject on public.merdeka_learning_objectives(class_id, subject_id);

-- 10. TABEL LINGKUP MATERI (LM)
create table if not exists public.merdeka_material_scopes (
  id text primary key,
  subject_id text not null,
  class_id text not null,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_lm_class_subject on public.merdeka_material_scopes(class_id, subject_id);

-- 11. TABEL NILAI FORMATIF
create table if not exists public.merdeka_formative_scores (
  id text primary key,
  student_id text not null,
  tp_id text not null,
  nilai numeric not null default 0,
  semester text not null,
  tahun text not null,
  updated_at timestamp with time zone default now()
);
create index if not exists idx_fscores_student on public.merdeka_formative_scores(student_id);
create index if not exists idx_fscores_tp on public.merdeka_formative_scores(tp_id);

-- 12. TABEL NILAI SUMATIF LINGKUP MATERI
create table if not exists public.merdeka_summative_scope_scores (
  id text primary key,
  student_id text not null,
  lingkup_id text not null,
  nilai numeric not null default 0,
  semester text not null,
  tahun text not null,
  updated_at timestamp with time zone default now()
);
create index if not exists idx_sscores_student on public.merdeka_summative_scope_scores(student_id);
create index if not exists idx_sscores_lingkup on public.merdeka_summative_scope_scores(lingkup_id);

-- 13. TABEL NILAI SUMATIF AKHIR SEMESTER (SAS)
create table if not exists public.merdeka_semester_scores (
  id text primary key,
  student_id text not null,
  subject_id text not null,
  nilai numeric not null default 0,
  semester text not null,
  tahun text not null,
  updated_at timestamp with time zone default now()
);
create index if not exists idx_sas_student on public.merdeka_semester_scores(student_id);
create index if not exists idx_sas_subject on public.merdeka_semester_scores(subject_id);

-- 14. TABEL AUDIT LOG
create table if not exists public.merdeka_audit_logs (
  id text primary key,
  "user" text not null,
  action text not null,
  timestamp text not null,
  created_at timestamp with time zone default now()
);

-- 15. TABEL CADANGAN KEY-VALUE STORE
create table if not exists public.merdeka_store (
  key text primary key,
  value jsonb,
  updated_at timestamp with time zone default now()
);

-- ====================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS)
-- ====================================================================
alter table public.merdeka_academic_years enable row level security;
alter table public.merdeka_semesters enable row level security;
alter table public.merdeka_profiles enable row level security;
alter table public.merdeka_teachers enable row level security;
alter table public.merdeka_classes enable row level security;
alter table public.merdeka_subjects enable row level security;
alter table public.merdeka_students enable row level security;
alter table public.merdeka_assignments enable row level security;
alter table public.merdeka_learning_objectives enable row level security;
alter table public.merdeka_material_scopes enable row level security;
alter table public.merdeka_formative_scores enable row level security;
alter table public.merdeka_summative_scope_scores enable row level security;
alter table public.merdeka_semester_scores enable row level security;
alter table public.merdeka_audit_logs enable row level security;
alter table public.merdeka_store enable row level security;

-- ====================================================================
-- KEBIJAKAN AKSES PUBLIK (SELECT, INSERT, UPDATE, DELETE via anon key)
-- ====================================================================
drop policy if exists "Allow public access for academic_years" on public.merdeka_academic_years;
create policy "Allow public access for academic_years" on public.merdeka_academic_years for all to public using (true) with check (true);

drop policy if exists "Allow public access for semesters" on public.merdeka_semesters;
create policy "Allow public access for semesters" on public.merdeka_semesters for all to public using (true) with check (true);

drop policy if exists "Allow public access for profiles" on public.merdeka_profiles;
create policy "Allow public access for profiles" on public.merdeka_profiles for all to public using (true) with check (true);

drop policy if exists "Allow public access for teachers" on public.merdeka_teachers;
create policy "Allow public access for teachers" on public.merdeka_teachers for all to public using (true) with check (true);

drop policy if exists "Allow public access for classes" on public.merdeka_classes;
create policy "Allow public access for classes" on public.merdeka_classes for all to public using (true) with check (true);

drop policy if exists "Allow public access for subjects" on public.merdeka_subjects;
create policy "Allow public access for subjects" on public.merdeka_subjects for all to public using (true) with check (true);

drop policy if exists "Allow public access for students" on public.merdeka_students;
create policy "Allow public access for students" on public.merdeka_students for all to public using (true) with check (true);

drop policy if exists "Allow public access for assignments" on public.merdeka_assignments;
create policy "Allow public access for assignments" on public.merdeka_assignments for all to public using (true) with check (true);

drop policy if exists "Allow public access for learning_objectives" on public.merdeka_learning_objectives;
create policy "Allow public access for learning_objectives" on public.merdeka_learning_objectives for all to public using (true) with check (true);

drop policy if exists "Allow public access for material_scopes" on public.merdeka_material_scopes;
create policy "Allow public access for material_scopes" on public.merdeka_material_scopes for all to public using (true) with check (true);

drop policy if exists "Allow public access for formative_scores" on public.merdeka_formative_scores;
create policy "Allow public access for formative_scores" on public.merdeka_formative_scores for all to public using (true) with check (true);

drop policy if exists "Allow public access for summative_scope_scores" on public.merdeka_summative_scope_scores;
create policy "Allow public access for summative_scope_scores" on public.merdeka_summative_scope_scores for all to public using (true) with check (true);

drop policy if exists "Allow public access for semester_scores" on public.merdeka_semester_scores;
create policy "Allow public access for semester_scores" on public.merdeka_semester_scores for all to public using (true) with check (true);

drop policy if exists "Allow public access for audit_logs" on public.merdeka_audit_logs;
create policy "Allow public access for audit_logs" on public.merdeka_audit_logs for all to public using (true) with check (true);

drop policy if exists "Allow public access for store" on public.merdeka_store;
create policy "Allow public access for store" on public.merdeka_store for all to public using (true) with check (true);`;

  useEffect(() => {
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
    addToast('success', 'SQL Disalin', 'Query pembuatan tabel terpisah telah disalin ke clipboard.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sqlSetupCommand], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'supabase_merdeka_schema.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('success', 'Skrip Diunduh', 'File supabase_merdeka_schema.sql berhasil diunduh.');
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage(null);
    setDetectedTables([]);

    try {
      const detected: string[] = [];

      // Check key tables
      const checkList = ['merdeka_teachers', 'merdeka_classes', 'merdeka_students', 'merdeka_subjects', 'merdeka_assignments', 'merdeka_store'];
      
      for (const t of checkList) {
        try {
          const { error } = await supabase.from(t).select('id').limit(1);
          if (!error) {
            detected.push(t);
          }
        } catch (e) {}
      }

      setDetectedTables(detected);

      if (detected.length >= 5) {
        setTestStatus('success');
        setTestMessage(`Koneksi aktif! Terdeteksi ${detected.length} tabel relasional terpisah siap digunakan di database Supabase Anda.`);
        addToast('success', 'Koneksi Berhasil', 'Tabel terpisah di Supabase terverifikasi sempurna!');
      } else if (detected.includes('merdeka_store')) {
        setTestStatus('success');
        setTestMessage('Koneksi aktif! Tabel fallback "merdeka_store" terdeteksi. Untuk memisahkan tabel secara penuh (Guru, Kelas, Siswa, dll), jalankan skrip SQL di bawah di SQL Editor Supabase Anda.');
        addToast('info', 'Tabel Store Aktif', 'Jalankan skrip SQL baru untuk memisahkan tabel secara relasional.');
      } else {
        setTestStatus('error');
        setTestMessage('Terhubung ke server Supabase, namun tabel belum dibuat. Silakan salin & jalankan kode SQL di bawah ini di SQL Editor Supabase Anda.');
        addToast('error', 'Tabel Belum Dibuat', 'Silakan jalankan SQL di Supabase SQL Editor.');
      }
    } catch (err: any) {
      console.error(err);
      setTestStatus('error');
      setTestMessage(`Gagal terhubung: ${err.message || 'Periksa koneksi internet atau kredensial Anda.'}`);
      addToast('error', 'Koneksi Gagal', 'Gagal memverifikasi database Supabase.');
    }
  };

  const handlePush = async () => {
    const confirm = window.confirm('Apakah Anda yakin ingin MENGIRIM seluruh data lokal ke tabel Supabase (Guru, Siswa, Kelas, Nilai, dll)?');
    if (!confirm) return;

    const session = db.getSession();
    const user = session ? session.nama : 'System';

    logAudit(user, 'Memulai pengiriman (push) data lokal ke tabel terpisah Supabase.');
    
    const success = await pushToSupabase();
    if (success) {
      addToast('success', 'Sinkronisasi Berhasil', 'Seluruh data lokal berhasil disimpan ke tabel terpisah di Supabase!');
      logAudit(user, 'Sukses mengirim data lokal ke tabel terpisah di Supabase.');
      if (onRefreshStats) onRefreshStats();
    } else {
      const currentStatus = getSyncStatus();
      addToast('error', 'Sinkronisasi Gagal', currentStatus.errorMessage || 'Gagal mengirim data.');
      logAudit(user, `Gagal mengirim data ke Supabase: ${currentStatus.errorMessage}`);
    }
  };

  const handlePull = async () => {
    const confirm = window.confirm('Apakah Anda yakin ingin MENARIK data dari Supabase? Data di aplikasi Anda saat ini akan diselaraskan dengan data dari cloud.');
    if (!confirm) return;

    const session = db.getSession();
    const user = session ? session.nama : 'System';

    logAudit(user, 'Memulai penarikan (pull) data dari Supabase.');

    const success = await pullFromSupabase();
    if (success) {
      addToast('success', 'Data Diunduh', 'Berhasil memperbarui database lokal dengan data dari tabel Supabase!');
      logAudit(user, 'Sukses mengunduh dan menerapkan data dari tabel Supabase.');
      if (onRefreshStats) onRefreshStats();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const currentStatus = getSyncStatus();
      addToast('error', 'Gagal Mengunduh', currentStatus.errorMessage || 'Gagal menarik data.');
      logAudit(user, `Gagal menarik data dari Supabase: ${currentStatus.errorMessage}`);
    }
  };

  const filteredTables = selectedTableTab === 'all' 
    ? SEPARATED_TABLES 
    : SEPARATED_TABLES.filter(t => t.category === selectedTableTab);

  return (
    <div className="space-y-6">
      
      {/* 1. STATUS SUMMARY BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Connection Status Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm col-span-2 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Supabase Relasional (Tabel Terpisah)</h3>
              </div>
              <p className="text-xs text-slate-500">
                Penyimpanan cloud terpisah: Data Guru, Kelas, Siswa, Penugasan, dan Nilai memiliki tabel masing-masing.
              </p>
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
              {testStatus === 'testing' ? 'Menguji Tabel...' : 'Uji Koneksi & Struktur Tabel'}
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
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Desain Relasional Terpisah
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Kini setiap entitas memiliki tabel mandiri: <strong>Guru</strong>, <strong>Kelas</strong>, <strong>Siswa</strong>, <strong>Penugasan</strong>, dan <strong>Nilai</strong>.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Anda dapat mengelola, melihat, mengekspor, atau menghubungkannya ke sistem pelaporan eksternal secara langsung melalui dashboard Supabase.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-indigo-100/30 text-[10px] text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Cara Migrasi:</span>
            Jalankan skrip SQL di bawah pada <strong>SQL Editor Supabase</strong>, lalu klik <strong>"Kirim ke Supabase (Push)"</strong> untuk menyalin data Anda!
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
            <p className="font-bold">{testStatus === 'success' ? 'Pemeriksaan Database Berhasil' : 'Pemberitahuan Tabel Supabase'}</p>
            <p className="mt-1 leading-relaxed">{testMessage}</p>
          </div>
        </div>
      )}

      {/* 3. SEPARATED TABLES DIRECTORY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Table className="w-4 h-4 text-indigo-600" />
              Daftar Tabel Terpisah di Supabase ({SEPARATED_TABLES.length} Tabel)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Struktur tabel relasional untuk kemudahan query SQL, integrasi data, dan pelaporan independen.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            {(['all', 'Master Data', 'Penilaian', 'Sistem'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedTableTab(cat)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTableTab === cat 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTables.map((tbl) => {
            const isDetected = detectedTables.includes(tbl.name);
            return (
              <div 
                key={tbl.name}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                      {tbl.name}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      tbl.category === 'Master Data' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                      tbl.category === 'Penilaian' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                      'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                    }`}>
                      {tbl.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                    {tbl.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    Kolom: {tbl.columns.join(', ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SQL SETUP CODES SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-150 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-600" />
              Skrip SQL Lengkap (PostgreSQL Supabase)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jalankan sekali di SQL Editor Supabase untuk membuat 14 tabel terpisah dan konfigurasi hak akses RLS.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSql}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Unduh skrip sebagai file .sql"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh .SQL
            </button>
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Tersalin!' : 'Salin SQL Lengkap'}
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Panduan Langkah Menjalankan SQL di Supabase:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Buka proyek Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-semibold">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a></li>
              <li>Klik menu <strong>SQL Editor</strong> di bilah navigasi kiri Supabase.</li>
              <li>Klik tombol <strong>New Query</strong> (atau tanda +).</li>
              <li>Salin kode SQL di bawah ini dan tempelkan (Paste) ke editor tersebut.</li>
              <li>Klik tombol hijau <strong>Run</strong> (atau tekan Ctrl+Enter / Cmd+Enter).</li>
              <li>Setelah muncul notifikasi sukses, kembali ke tab ini dan klik tombol <strong>"Kirim ke Supabase (Push)"</strong> untuk menyalin data lokal ke tabel baru.</li>
            </ol>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
              <code>{sqlSetupCommand}</code>
            </pre>
          </div>
        </div>
      </div>

    </div>
  );
}
