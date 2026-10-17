-- ====================================================================
-- SKRIP SQL LENGKAP: DATABASE KURIKULUM MERDEKA (SUPABASE POSTGRESQL)
-- Versi Tabel Terpisah (Relasional) & Sinkronisasi Realtime
-- ====================================================================

-- 0. HAPUS TABEL LAMA (merdeka_store) SESUAI INSTRUKSI MIGRASI
drop table if exists public.merdeka_store cascade;

-- 1. Tabel Tahun Ajaran
create table if not exists public.merdeka_academic_years (
  id text primary key,
  nama text not null,
  aktif boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Tabel Semester
create table if not exists public.merdeka_semesters (
  id text primary key,
  nama text not null,
  aktif boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Tabel Profil Pengguna (Admin & Guru)
create table if not exists public.merdeka_profiles (
  id text primary key,
  nama text not null,
  role text not null check (role in ('Admin', 'Guru')),
  email text not null,
  password text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 4. Tabel Data Guru
create table if not exists public.merdeka_teachers (
  id text primary key,
  user_id text,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. Tabel Data Kelas
create table if not exists public.merdeka_classes (
  id text primary key,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 6. Tabel Mata Pelajaran
create table if not exists public.merdeka_subjects (
  id text primary key,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 7. Tabel Data Siswa
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

-- 8. Tabel Penugasan Guru (Assignment Kelas & Mapel)
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

-- 9. Tabel Tujuan Pembelajaran (TP)
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

-- 10. Tabel Lingkup Materi (LM)
create table if not exists public.merdeka_material_scopes (
  id text primary key,
  subject_id text not null,
  class_id text not null,
  nama text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
create index if not exists idx_lm_class_subject on public.merdeka_material_scopes(class_id, subject_id);

-- 11. Tabel Nilai Formatif
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

-- 12. Tabel Nilai Sumatif Lingkup Materi
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

-- 13. Tabel Nilai Sumatif Akhir Semester (SAS)
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

-- 14. Tabel Audit Log
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
  -- Jika replikasi sudah aktif untuk tabel tertentu, abaikan error
  null;
end $$;
