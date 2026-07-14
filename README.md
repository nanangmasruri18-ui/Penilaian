# Aplikasi Penilaian Siswa SD Kurikulum Merdeka

Aplikasi web ini dirancang khusus untuk membantu guru sekolah dasar (SD) menginput dan merekapitulasi nilai siswa secara cepat, ringan, responsif, dan akurat berdasarkan kerangka **Kurikulum Merdeka**.

Aplikasi ini berfokus sepenuhnya pada pengelolaan data nilai harian formatif, sumatif lingkup materi, dan sumatif akhir semester (SAS) serta menghasilkan lembar ledger rekapitulasi nilai otomatis yang siap dicetak (A4 Landscape) atau diekspor ke format Excel.

---

## 🚀 Fitur Utama

1. **Autentikasi Multi-Role**: Sesi aman untuk **Administrator** (kelola data master) dan **Guru** (kelola nilai & capaian).
2. **Auto-Save Input Nilai**: Sistem pengisian nilai formatif, sumatif lingkup materi, dan sumatif akhir semester (SAS) yang otomatis menyimpan data ke local storage sewaktu guru mengetik tanpa tombol simpan manual.
3. **Salin Rata-rata Formatif**: Tombol cerdas bagi guru untuk menyalin rata-rata nilai harian formatif siswa langsung sebagai dasar nilai SAS.
4. **Impor Siswa Massal dari Excel**: Antarmuka salin-tempel (copy-paste) kolom NISN & Nama dari Microsoft Excel langsung ke dalam sistem dengan validasi instan.
5. **Cetak & Ekspor Fleksibel**:
   - Cetak PDF ukuran **A4 Landscape** dengan penyesuaian gaya CSS cetak yang rapi.
   - Ekspor lembar rekapitulasi nilai ke berkas **Excel (.csv)** tervalidasi UTF-8 BOM.
6. **Sistem Audit Log**: Mencatat setiap riwayat aktivitas perubahan nilai dan administrasi demi integritas data sekolah.
7. **Tema Visual Fleksibel**: Dilengkapi dengan toggle mode gelap (Dark Mode) yang nyaman untuk mata guru.

---

## 🛠️ Panduan Instalasi Lokal

### 1. Prasyarat
Pastikan komputer Anda sudah terinstal **Node.js** (Versi 18 atau lebih baru) dan **npm**.

### 2. Kloning & Install Dependensi
```bash
# Clone repositori dari GitHub (ganti URL jika dideploy)
git clone https://github.com/username/penilaian-kurikulum-merdeka.git

# Masuk ke direktori project
cd penilaian-kurikulum-merdeka

# Install semua dependensi yang diperlukan
npm install
```

### 3. Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan berjalan secara lokal di [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Konfigurasi Supabase PostgreSQL

Untuk memindahkan penyimpanan data dari `localStorage` client-side ke cloud database **Supabase**, ikuti panduan migrasi terstruktur berikut:

### 1. Buat Project Baru di Supabase
1. Masuk ke dashboard [Supabase](https://supabase.com).
2. Buat project baru, tentukan nama organisasi, nama database, dan kata sandi root database.
3. Tunggu hingga proses penyediaan (provisioning) selesai.

### 2. Jalankan Migrasi Skema Database (SQL Editor)
Salin seluruh kode SQL di bawah ini dan tempelkan ke menu **SQL Editor** -> **New Query** di dashboard Supabase Anda, lalu klik **Run** untuk membuat seluruh tabel beserta relasinya:

```sql
-- 1. Tabel Profiles (User Authentication Mapping)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Guru')),
  email VARCHAR(255) UNIQUE NOT NULL
);

-- 2. Tabel Teachers
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  nama VARCHAR(255) NOT NULL
);

-- 3. Tabel Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) UNIQUE NOT NULL
);

-- 4. Tabel Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) UNIQUE NOT NULL
);

-- 5. Tabel Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nisn CHAR(10) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  kelas_id UUID REFERENCES classes(id) ON DELETE RESTRICT
);

-- 6. Tabel Teacher Assignments (Penugasan Guru)
CREATE TABLE teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT unique_assignment UNIQUE (teacher_id, class_id, subject_id)
);

-- 7. Tabel Learning Objectives (TP)
CREATE TABLE learning_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  kode VARCHAR(20) NOT NULL,
  deskripsi TEXT NOT NULL
);

-- 8. Tabel Material Scopes (Lingkup Materi)
CREATE TABLE material_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  nama VARCHAR(255) NOT NULL
);

-- 9. Tabel Formative Scores (Nilai Formatif)
CREATE TABLE formative_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  tp_id UUID REFERENCES learning_objectives(id) ON DELETE CASCADE,
  nilai INT NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  semester VARCHAR(50) NOT NULL,
  tahun VARCHAR(50) NOT NULL
);

-- 10. Tabel Summative Scope Scores (Nilai Sumatif LM)
CREATE TABLE summative_scope_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  lingkup_id UUID REFERENCES material_scopes(id) ON DELETE CASCADE,
  nilai INT NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  semester VARCHAR(50) NOT NULL,
  tahun VARCHAR(50) NOT NULL
);

-- 11. Tabel Semester Scores (Nilai Sumatif Akhir Semester SAS)
CREATE TABLE semester_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  nilai INT NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
  semester VARCHAR(50) NOT NULL,
  tahun VARCHAR(50) NOT NULL
);

-- 12. Tabel Academic Years
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(50) UNIQUE NOT NULL,
  aktif BOOLEAN DEFAULT false
);

-- 13. Tabel Semesters
CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(50) NOT NULL,
  aktif BOOLEAN DEFAULT false
);

-- 14. Tabel Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- KEAMANAN: Aktifkan Row Level Security (RLS) pada Seluruh Tabel
-- =========================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE formative_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE summative_scope_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_scores ENABLE ROW LEVEL SECURITY;

-- Contoh Kebijakan (Policies) RLS untuk Guru agar hanya dapat melihat 
-- data kelas/mata pelajaran yang diampunya saja:
CREATE POLICY policy_select_my_grades ON formative_scores
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE kelas_id IN (
        SELECT class_id FROM teacher_assignments WHERE teacher_id = (
          SELECT id FROM teachers WHERE user_id = auth.uid()
        )
      )
    )
  );

-- SEED DATA AWAL (Akun Default)
-- Admin
INSERT INTO profiles (id, nama, role, email) 
VALUES ('c3b88b3a-59b8-4bc2-8921-2e69780a4a11', 'Administrator Sekolah', 'Admin', 'admin@sekolah.sch.id');

-- Guru (Budi Santoso, S.Pd.)
INSERT INTO profiles (id, nama, role, email) 
VALUES ('d2b88b3a-59b8-4bc2-8921-2e69780a4a22', 'Budi Santoso, S.Pd.', 'Guru', 'guru@sekolah.sch.id');

INSERT INTO teachers (id, user_id, nama) 
VALUES ('e1b88b3a-59b8-4bc2-8921-2e69780a4a33', 'd2b88b3a-59b8-4bc2-8921-2e69780a4a22', 'Budi Santoso, S.Pd.');
```

---

## 🔒 Konfigurasi Environment Variable (.env)

Buat berkas `.env` di direktori utama (root) dari project Anda untuk menghubungkan antarmuka dengan credential Supabase:

```env
# URL API Supabase (Dapatkan dari Project Settings -> API)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# API Key Anon Supabase (Dapatkan dari Project Settings -> API)
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📤 Langkah Publikasi ke GitHub & Vercel

### 1. Unggah ke GitHub
```bash
# Inisialisasi repositori git lokal
git init

# Tambahkan berkas yang akan di-commit (pastikan .env terabaikan lewat .gitignore)
git add .

# Buat commit pertama Anda
git commit -m "feat: inisialisasi aplikasi penilaian SD kurikulum merdeka"

# Hubungkan dengan repositori GitHub Anda
git branch -M main
git remote add origin https://github.com/username/penilaian-kurikulum-merdeka.git

# Dorong (push) kode ke GitHub
git push -u origin main
```

### 2. Deploy Aplikasi ke Vercel
1. Masuk ke [Vercel Dashboard](https://vercel.com).
2. Klik tombol **Add New** -> **Project**.
3. Hubungkan akun GitHub Anda dan pilih repositori `penilaian-kurikulum-merdeka`.
4. Pada bagian **Framework Preset**, Vercel akan otomatis mendeteksi **Vite**.
5. Pada bagian **Environment Variables**, masukkan variabel berikut:
   - `VITE_SUPABASE_URL` dengan URL database Supabase Anda.
   - `VITE_SUPABASE_ANON_KEY` dengan API Key Anon Supabase Anda.
6. Klik **Deploy**. Selesai!

### 3. Menghubungkan Supabase dengan Vercel secara Otomatis
Vercel menyediakan integrasi langsung dengan Supabase untuk menghemat waktu:
1. Pada menu dashboard project Vercel Anda, masuk ke tab **Integrations**.
2. Cari **Supabase** dan klik **Install Integration**.
3. Ikuti petunjuk untuk menghubungkan project Vercel dengan project database Supabase Anda.
4. Integrasi ini akan otomatis mengisi Environment Variables Supabase langsung ke dalam konfigurasi Vercel Anda.

---

## 🏗️ Build Production
Untuk menguji hasil kompilasi produksi secara lokal sebelum dipublikasikan:
```bash
# Jalankan kompilasi TypeScript & bundler Vite
npm run build

# Jalankan lokal preview produksi
npm run preview
```

---

## 🔐 Akun Uji Coba (Seed Data Bawaan)
- **Akun Administrator Utama**:
  - **Email**: `admin@sekolah.sch.id`
  - **Password**: `admin123`
- **Akun Guru Utama**:
  - **Email**: `guru@sekolah.sch.id`
  - **Password**: `guru123`
