import { useState, useEffect } from 'react';
import { supabase, getSyncStatus, pushToSupabase, pullFromSupabase, SyncStatus, SYNC_KEYS } from '../supabase';
import { db, logAudit } from '../db';
import { ToastType } from './Toast';
import { 
  Database, RefreshCw, CheckCircle2, AlertCircle, Copy, Check, 
  ExternalLink, Lock, Server, HelpCircle, Cloud, ArrowUpRight, ArrowDownLeft,
  Table, Download, Code2, Layers, CheckSquare, Sparkles, FileText, Radio, Zap,
  GitBranch, Globe, Terminal, ShieldCheck, Share2
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
    description: 'Menyimpan identitas guru pengajar dan hubungannya ke akun login.',
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
    description: 'Menyimpan data siswa lengkap dengan NISN dan ID rombel/kelas.',
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
    description: 'Relasi penugasan guru mengajar mata pelajaran tertentu pada kelas tertentu.',
    columns: ['id (PK, text)', 'teacher_id (text)', 'class_id (text)', 'subject_id (text)', 'created_at', 'updated_at']
  },
  {
    name: 'merdeka_profiles',
    label: 'Profil Pengguna',
    category: 'Sistem',
    description: 'Akun otentikasi login Administrator dan Guru.',
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
    description: 'Target pencapaian pembelajaran per mata pelajaran dan rombel.',
    columns: ['id (PK, text)', 'subject_id (text)', 'class_id (text)', 'kode (text)', 'deskripsi (text)', 'updated_at']
  },
  {
    name: 'merdeka_material_scopes',
    label: 'Lingkup Materi (LM)',
    category: 'Penilaian',
    description: 'Cakupan bab/tema materi pelajaran untuk penilaian sumatif lingkup materi.',
    columns: ['id (PK, text)', 'subject_id (text)', 'class_id (text)', 'nama (text)', 'updated_at']
  },
  {
    name: 'merdeka_formative_scores',
    label: 'Nilai Formatif',
    category: 'Penilaian',
    description: 'Skor penilaian formatif siswa per Tujuan Pembelajaran (TP).',
    columns: ['id (PK, text)', 'student_id (text)', 'tp_id (text)', 'nilai (numeric)', 'semester', 'tahun', 'updated_at']
  },
  {
    name: 'merdeka_summative_scope_scores',
    label: 'Nilai Sumatif Lingkup Materi',
    category: 'Penilaian',
    description: 'Skor penilaian sumatif per lingkup materi (LM).',
    columns: ['id (PK, text)', 'student_id (text)', 'lingkup_id (text)', 'nilai (numeric)', 'semester', 'tahun', 'updated_at']
  },
  {
    name: 'merdeka_semester_scores',
    label: 'Nilai Sumatif Akhir Semester (SAS)',
    category: 'Penilaian',
    description: 'Skor evaluasi akhir semester per siswa dan mata pelajaran.',
    columns: ['id (PK, text)', 'student_id (text)', 'subject_id (text)', 'nilai (numeric)', 'semester', 'tahun', 'updated_at']
  },
  {
    name: 'merdeka_audit_logs',
    label: 'Audit Log Aktivitas',
    category: 'Sistem',
    description: 'Jejak rekaman riwayat perubahan data pada sistem.',
    columns: ['id (PK, text)', 'user (text)', 'action (text)', 'timestamp (text)']
  }
];

export function SupabaseSync({ addToast, onRefreshStats }: SupabaseSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [isCopied, setIsCopied] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [detectedTables, setDetectedTables] = useState<string[]>([]);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [selectedTableTab, setSelectedTableTab] = useState<'all' | 'Master Data' | 'Penilaian' | 'Sistem'>('all');

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://anadwoytkjvuknucwymd.supabase.co';
  const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYWR3b3l0a2p2dWtudWN3eW1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjc3MjIsImV4cCI6MjA5OTYwMzcyMn0.3f2I5r7_EH9drjP2DsmV-AzCmsevjkIHe7zb6kfTI7s';

  const maskedUrl = supabaseUrl.replace(/(https?:\/\/)[^.]+(\.supabase\.co)/, '$1******$2');
  const maskedKey = anonKey.slice(0, 8) + '...' + anonKey.slice(-8);

  // Automatically check live row counts in Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      const detected: string[] = [];
      const tablesToCheck = [
        'merdeka_formative_scores', 'merdeka_summative_scope_scores', 'merdeka_semester_scores',
        'merdeka_students', 'merdeka_teachers', 'merdeka_classes', 'merdeka_subjects',
        'merdeka_learning_objectives', 'merdeka_material_scopes', 'merdeka_academic_years', 'merdeka_semesters'
      ];
      for (const t of tablesToCheck) {
        try {
          const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
          if (!error && count !== null) {
            counts[t] = count;
            detected.push(t);
          }
        } catch {}
      }
      if (isMounted) {
        setTableCounts(counts);
        if (detected.length > 0) setDetectedTables(detected);
      }
    };
    loadCounts();
    return () => { isMounted = false; };
  }, []);

  const sqlSetupCommand = `-- ====================================================================
-- SKRIP SQL LENGKAP: DATABASE KURIKULUM MERDEKA (SUPABASE POSTGRESQL)
-- Versi Tabel Terpisah (Relasional) & Sinkronisasi Realtime
-- ====================================================================

-- 0. HAPUS TABEL LAMA (merdeka_store) SESUAI INSTRUKSI MIGRASI
drop table if exists public.merdeka_store cascade;

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

-- ====================================================================
-- AKTIFKAN REPLIKASI REALTIME SUPABASE UNTUK SETIAP TABEL
-- ====================================================================
do $$
begin
  alter publication supabase_realtime add table 
    public.merdeka_academic_years,
    public.merdeka_semesters,
    public.merdeka_profiles,
    public.merdeka_teachers,
    public.merdeka_classes,
    public.merdeka_subjects,
    public.merdeka_students,
    public.merdeka_assignments,
    public.merdeka_learning_objectives,
    public.merdeka_material_scopes,
    public.merdeka_formative_scores,
    public.merdeka_summative_scope_scores,
    public.merdeka_semester_scores,
    public.merdeka_audit_logs;
exception when others then
  null;
end $$;`;

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
    addToast('success', 'SQL Disalin', 'Query pembuatan tabel terpisah & realtime telah disalin ke clipboard.');
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
      const counts: Record<string, number> = {};
      const checkList = [
        'merdeka_formative_scores', 'merdeka_summative_scope_scores', 'merdeka_semester_scores',
        'merdeka_students', 'merdeka_teachers', 'merdeka_classes', 'merdeka_subjects',
        'merdeka_assignments', 'merdeka_profiles', 'merdeka_learning_objectives', 
        'merdeka_material_scopes', 'merdeka_academic_years', 'merdeka_semesters'
      ];
      
      for (const t of checkList) {
        try {
          const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
          if (!error) {
            detected.push(t);
            counts[t] = count ?? 0;
          }
        } catch {}
      }

      setDetectedTables(detected);
      setTableCounts(counts);

      if (detected.length >= 4) {
        setTestStatus('success');
        const totalScores = (counts['merdeka_formative_scores'] || 0) + (counts['merdeka_summative_scope_scores'] || 0) + (counts['merdeka_semester_scores'] || 0);
        setTestMessage(`Koneksi aktif! Terdeteksi ${detected.length} dari ${checkList.length} tabel relasional di cloud Supabase. Terdapat ${totalScores.toLocaleString()} data nilai (${(counts['merdeka_formative_scores'] || 0).toLocaleString()} formatif & ${(counts['merdeka_summative_scope_scores'] || 0).toLocaleString()} sumatif) serta ${(counts['merdeka_students'] || 0).toLocaleString()} siswa.`);
        addToast('success', 'Koneksi Berhasil', 'Tabel terpisah di Supabase terverifikasi sempurna!');
      } else {
        setTestStatus('error');
        setTestMessage('Terhubung ke server Supabase, namun tabel terpisah belum terdeteksi. Silakan salin & jalankan kode SQL di bawah ini di SQL Editor Supabase Anda.');
        addToast('error', 'Tabel Belum Dibuat', 'Silakan jalankan SQL di Supabase SQL Editor.');
      }
    } catch (err: any) {
      console.error(err);
      setTestStatus('error');
      setTestMessage(`Gagal terhubung: ${err.message || 'Periksa koneksi internet Anda.'}`);
      addToast('error', 'Koneksi Gagal', 'Gagal memverifikasi database Supabase.');
    }
  };

  const handlePush = async () => {
    const confirm = window.confirm('Apakah Anda ingin MENGIRIM seluruh data lokal ke tabel terpisah Supabase? Seluruh guru, siswa, kelas, dan nilai akan disinkronkan ke cloud.');
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
    const confirm = window.confirm('Apakah Anda ingin MENARIK data terbaru dari tabel Supabase? Data di browser ini akan diperbarui dari cloud.');
    if (!confirm) return;

    const session = db.getSession();
    const user = session ? session.nama : 'System';

    logAudit(user, 'Memulai penarikan (pull) data dari Supabase.');

    const success = await pullFromSupabase({ silent: false, autoPushIfEmpty: false });
    if (success) {
      addToast('success', 'Data Diunduh', 'Berhasil menyelaraskan database lokal dengan data dari tabel Supabase!');
      logAudit(user, 'Sukses mengunduh dan menerapkan data dari tabel Supabase.');
      if (onRefreshStats) onRefreshStats();
      setTimeout(() => {
        window.location.reload();
      }, 800);
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
                Data Guru, Kelas, Siswa, Mapel, dan Nilai terpisah secara rapi dengan sinkronisasi Real-Time multi-perangkat.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
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
                 syncStatus.status === 'error' ? 'Koneksi Bermasalah' : 'Siap'}
              </span>

              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/50">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
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
                <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> Sinkronisasi Terakhir:</span>
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
              {testStatus === 'testing' ? 'Menguji Tabel...' : 'Uji Koneksi & Tabel'}
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
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Sinkronisasi Real-Time Multi-Device
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Saat guru menginput nilai dari HP atau laptop lain, data <strong>langsung terupdate secara realtime</strong> di layar Admin dan guru lainnya tanpa perlu refresh manual.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Tabel lama (<code>merdeka_store</code>) telah dihapus dan digantikan oleh 14 tabel relasional mandiri.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900/80 rounded-xl border border-indigo-100/30 text-[10px] text-slate-500">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Status Realtime:</span>
            Koneksi WebSocket aktif memantau perubahan data tabel di cloud secara konstan.
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
              Daftar Tabel Terpisah di Supabase ({SEPARATED_TABLES.length} Tabel Relasional)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap tabel dapat di-query, di-filter, dan diintegrasikan secara independen.
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

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-mono truncate">
                    {tbl.columns.length} Kolom
                  </span>
                  {tableCounts[tbl.name] !== undefined ? (
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                      {tableCounts[tbl.name].toLocaleString()} Baris di Cloud
                    </span>
                  ) : isDetected ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">Terhubung</span>
                  ) : null}
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
              Skrip SQL Lengkap (Hapus Tabel Lama & Buat 14 Tabel Baru)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jalankan sekali di SQL Editor Supabase untuk memastikan 14 tabel terpisah dan replikasi Realtime aktif.
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
            <p className="font-semibold text-slate-800 dark:text-slate-200">Langkah Menjalankan di Supabase:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Buka proyek Anda di <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 font-semibold">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a></li>
              <li>Klik menu <strong>SQL Editor</strong> di bilah navigasi kiri.</li>
              <li>Klik tombol <strong>New Query</strong> (+).</li>
              <li>Salin kode SQL di bawah ini dan tempelkan (Paste).</li>
              <li>Klik tombol hijau <strong>Run</strong> (atau tekan Ctrl+Enter). Tabel baru beserta replikasi Realtime akan aktif.</li>
            </ol>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-80">
              <code>{sqlSetupCommand}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* 5. PANDUAN DEPLOY KE GITHUB & VERCEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                Panduan Menyelaraskan Aplikasi ke GitHub & Vercel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cara mempublikasikan aplikasi agar dapat diakses oleh seluruh guru dan admin dari HP atau laptop mana pun secara online.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold rounded-full border border-emerald-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Siap Publikasi
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: GitHub */}
          <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</div>
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                Unggah Proyek ke GitHub
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Buat repositori baru di akun GitHub Anda (misal: <code>kurikulum-merdeka-sekolah</code>), kemudian jalankan perintah git berikut di terminal laptop Anda:
            </p>
            <div className="bg-slate-950 rounded-lg p-3 text-emerald-400 font-mono text-[11px] space-y-1">
              <div>git init</div>
              <div>git add .</div>
              <div>git commit -m "feat: implementasi kurikulum merdeka dengan sinkronisasi realtime supabase"</div>
              <div>git branch -M main</div>
              <div>git remote add origin https://github.com/USERNAME-ANDA/kurikulum-merdeka-sekolah.git</div>
              <div>git push -u origin main</div>
            </div>
          </div>

          {/* Step 2: Vercel Deploy */}
          <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-600" />
                Deploy ke Vercel (Gratis & Cepat)
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              1. Buka <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">vercel.com</a> dan masuk menggunakan akun GitHub Anda.<br/>
              2. Klik tombol <strong>Add New... &rarr; Project</strong>, lalu pilih repositori GitHub Anda.<br/>
              3. Pada bagian <strong>Environment Variables</strong> di halaman konfigurasi Vercel, masukkan 2 variabel penting berikut:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  <span>Key:</span>
                  <span className="text-indigo-600">VITE_SUPABASE_URL</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 break-all mt-1">
                  https://anadwoytkjvuknucwymd.supabase.co
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  <span>Key:</span>
                  <span className="text-indigo-600">VITE_SUPABASE_ANON_KEY</span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 break-all mt-1">
                  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
              4. Klik tombol <strong>Deploy</strong>. Dalam 1-2 menit, Vercel akan memberikan alamat website publik sekolah Anda (contoh: <code>https://kurikulum-merdeka-sekolah.vercel.app</code>).
            </p>
          </div>

          {/* Step 3: Multi-device usage */}
          <div className="border border-emerald-150 dark:border-emerald-900/40 rounded-xl p-4 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Akses Bersama di Seluruh Perangkat (HP, Laptop, Tablet)
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bagikan link website Vercel tersebut kepada seluruh guru dan administrator. Karena semua perangkat mengakses database Supabase yang sama:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1 pl-1">
              <li>Saat guru menginput nilai formatif/sumatif dari HP di kelas, data <strong>langsung masuk ke Supabase</strong> dan disiarkan dalam hitungan milidetik.</li>
              <li>Admin yang sedang membuka halaman Rekapitulasi di laptop kantor langsung melihat nilainya terisi secara otomatis tanpa perlu refresh manual.</li>
              <li>Data aman tersimpan di cloud Supabase dan tidak akan hilang meskipun browser ditutup atau berganti gawai.</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
