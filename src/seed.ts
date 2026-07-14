import { 
  Profile, Teacher, Class, Subject, Student, TeacherAssignment, 
  LearningObjective, MaterialScope, FormativeScore, SummativeScopeScore, 
  SemesterScore, AcademicYear, Semester, AuditLog 
} from './types';

export const INITIAL_ACADEMIC_YEARS: AcademicYear[] = [
  { id: 'th-2025', nama: '2025/2026', aktif: true },
  { id: 'th-2024', nama: '2024/2025', aktif: false }
];

export const INITIAL_SEMESTERS: Semester[] = [
  { id: 'sem-ganjil', nama: 'Ganjil', aktif: true },
  { id: 'sem-genap', nama: 'Genap', aktif: false }
];

export const INITIAL_PROFILES: Profile[] = [
  { id: 'prof-admin', nama: 'Administrator Utama', role: 'Admin', email: 'admin@sekolah.sch.id' },
  { id: 'prof-guru', nama: 'Budi Santoso, S.Pd.', role: 'Guru', email: 'guru@sekolah.sch.id' },
  { id: 'prof-guru2', nama: 'Siti Aminah, S.Pd.', role: 'Guru', email: 'guru2@sekolah.sch.id' }
];

export const INITIAL_TEACHERS: Teacher[] = [
  { id: 'tch-budi', user_id: 'prof-guru', nama: 'Budi Santoso, S.Pd.' },
  { id: 'tch-siti', user_id: 'prof-guru2', nama: 'Siti Aminah, S.Pd.' }
];

export const INITIAL_CLASSES: Class[] = [
  { id: 'cls-1a', nama: 'Kelas 1-A' },
  { id: 'cls-1b', nama: 'Kelas 1-B' },
  { id: 'cls-4a', nama: 'Kelas 4-A' },
  { id: 'cls-4b', nama: 'Kelas 4-B' },
  { id: 'cls-5a', nama: 'Kelas 5-A' },
  { id: 'cls-5b', nama: 'Kelas 5-B' },
  { id: 'cls-6a', nama: 'Kelas 6-A' }
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub-mat', nama: 'Matematika' },
  { id: 'sub-ind', nama: 'Bahasa Indonesia' },
  { id: 'sub-ipa', nama: 'IPAS (Sains)' },
  { id: 'sub-pkn', nama: 'Pendidikan Pancasila' },
  { id: 'sub-srb', nama: 'Seni Rupa' }
];

export const INITIAL_STUDENTS: Student[] = [
  // Kelas 4-A (12 siswa)
  { id: 'std-01', nisn: '0014567891', nama: 'Achmad Fauzi', kelas_id: 'cls-4a' },
  { id: 'std-02', nisn: '0014567892', nama: 'Aditya Pratama', kelas_id: 'cls-4a' },
  { id: 'std-03', nisn: '0014567893', nama: 'Amanda Putri', kelas_id: 'cls-4a' },
  { id: 'std-04', nisn: '0014567894', nama: 'Bagas Saputra', kelas_id: 'cls-4a' },
  { id: 'std-05', nisn: '0014567895', nama: 'Citra Lestari', kelas_id: 'cls-4a' },
  { id: 'std-06', nisn: '0014567896', nama: 'Dimas Wijaya', kelas_id: 'cls-4a' },
  { id: 'std-07', nisn: '0014567897', nama: 'Elsa Mayori', kelas_id: 'cls-4a' },
  { id: 'std-08', nisn: '0014567898', nama: 'Fajar Ramadhan', kelas_id: 'cls-4a' },
  { id: 'std-09', nisn: '0014567899', nama: 'Giska Amelia', kelas_id: 'cls-4a' },
  { id: 'std-10', nisn: '0014567900', nama: 'Hendra Wijaya', kelas_id: 'cls-4a' },
  { id: 'std-11', nisn: '0014567901', nama: 'Indah Permata', kelas_id: 'cls-4a' },
  { id: 'std-12', nisn: '0014567902', nama: 'Joko Susilo', kelas_id: 'cls-4a' },

  // Kelas 4-B (8 siswa)
  { id: 'std-13', nisn: '0014567903', nama: 'Kevin Sanjaya', kelas_id: 'cls-4b' },
  { id: 'std-14', nisn: '0014567904', nama: 'Larasati Ayu', kelas_id: 'cls-4b' },
  { id: 'std-15', nisn: '0014567905', nama: 'Muhammad Rian', kelas_id: 'cls-4b' },
  { id: 'std-16', nisn: '0014567906', nama: 'Nadia Safitri', kelas_id: 'cls-4b' },
  { id: 'std-17', nisn: '0014567907', nama: 'Okta Ramadhan', kelas_id: 'cls-4b' },
  { id: 'std-18', nisn: '0014567908', nama: 'Putri Salsabila', kelas_id: 'cls-4b' },
  { id: 'std-19', nisn: '0014567909', nama: 'Raka Saputra', kelas_id: 'cls-4b' },
  { id: 'std-20', nisn: '0014567910', nama: 'Sonia Clarissa', kelas_id: 'cls-4b' },

  // Kelas 5-A (6 siswa)
  { id: 'std-21', nisn: '0014567911', nama: 'Taufik Hidayat', kelas_id: 'cls-5a' },
  { id: 'std-22', nisn: '0014567912', nama: 'Ulyasari Ningrum', kelas_id: 'cls-5a' },
  { id: 'std-23', nisn: '0014567913', nama: 'Vina Panduwinata', kelas_id: 'cls-5a' },
  { id: 'std-24', nisn: '0014567914', nama: 'Wahyu Hidayat', kelas_id: 'cls-5a' },
  { id: 'std-25', nisn: '0014567915', nama: 'Yusuf Mansur', kelas_id: 'cls-5a' },
  { id: 'std-26', nisn: '0014567916', nama: 'Zahra Syabila', kelas_id: 'cls-5a' }
];

export const INITIAL_ASSIGNMENTS: TeacherAssignment[] = [
  // Budi Santoso mengampu Kelas 4-A Matematika & IPAS, Kelas 5-A Matematika
  { id: 'asg-01', teacher_id: 'tch-budi', class_id: 'cls-4a', subject_id: 'sub-mat' },
  { id: 'asg-02', teacher_id: 'tch-budi', class_id: 'cls-4a', subject_id: 'sub-ipa' },
  { id: 'asg-03', teacher_id: 'tch-budi', class_id: 'cls-5a', subject_id: 'sub-mat' },

  // Siti Aminah mengampu Kelas 4-B Matematika & Bahasa Indonesia
  { id: 'asg-04', teacher_id: 'tch-siti', class_id: 'cls-4b', subject_id: 'sub-mat' },
  { id: 'asg-05', teacher_id: 'tch-siti', class_id: 'cls-4b', subject_id: 'sub-ind' }
];

export const INITIAL_LEARNING_OBJECTIVES: LearningObjective[] = [
  // Kelas 4-A Matematika
  { id: 'tp-mat4a-1', subject_id: 'sub-mat', class_id: 'cls-4a', kode: 'TP 1', deskripsi: 'Peserta didik mampu menjelaskan pecahan senilai menggunakan gambar atau benda konkret.' },
  { id: 'tp-mat4a-2', subject_id: 'sub-mat', class_id: 'cls-4a', kode: 'TP 2', deskripsi: 'Peserta didik mampu mengurutkan pecahan penyebut sama.' },
  { id: 'tp-mat4a-3', subject_id: 'sub-mat', class_id: 'cls-4a', kode: 'TP 3', deskripsi: 'Peserta didik mampu menjumlahkan pecahan berpenyebut sama.' },

  // Kelas 4-A IPAS
  { id: 'tp-ipa4a-1', subject_id: 'sub-ipa', class_id: 'cls-4a', kode: 'TP 1', deskripsi: 'Peserta didik mampu mengidentifikasi bagian-bagian tubuh tumbuhan dan fungsinya.' },
  { id: 'tp-ipa4a-2', subject_id: 'sub-ipa', class_id: 'cls-4a', kode: 'TP 2', deskripsi: 'Peserta didik mendeskripsikan siklus hidup tumbuhan.' },

  // Kelas 4-B Matematika
  { id: 'tp-mat4b-1', subject_id: 'sub-mat', class_id: 'cls-4b', kode: 'TP 1', deskripsi: 'Peserta didik mampu menjelaskan desimal persepuluhan dan perseratusan.' }
];

export const INITIAL_MATERIAL_SCOPES: MaterialScope[] = [
  // Kelas 4-A Matematika
  { id: 'lm-mat4a-1', subject_id: 'sub-mat', class_id: 'cls-4a', nama: 'Lingkup Materi 1: Pecahan Senilai' },
  { id: 'lm-mat4a-2', subject_id: 'sub-mat', class_id: 'cls-4a', nama: 'Lingkup Materi 2: Penjumlahan Pecahan' },

  // Kelas 4-A IPAS
  { id: 'lm-ipa4a-1', subject_id: 'sub-ipa', class_id: 'cls-4a', nama: 'Lingkup Materi 1: Bagian Tubuh Tumbuhan' },

  // Kelas 4-B Matematika
  { id: 'lm-mat4b-1', subject_id: 'sub-mat', class_id: 'cls-4b', nama: 'Lingkup Materi 1: Bilangan Desimal' }
];

// Seed some sample scores for Class 4-A Matematika
export const INITIAL_FORMATIVE_SCORES: FormativeScore[] = [
  // Achmad Fauzi
  { id: 'fs-01', student_id: 'std-01', tp_id: 'tp-mat4a-1', nilai: 85, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-02', student_id: 'std-01', tp_id: 'tp-mat4a-2', nilai: 78, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-03', student_id: 'std-01', tp_id: 'tp-mat4a-3', nilai: 90, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Aditya Pratama
  { id: 'fs-04', student_id: 'std-02', tp_id: 'tp-mat4a-1', nilai: 92, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-05', student_id: 'std-02', tp_id: 'tp-mat4a-2', nilai: 88, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-06', student_id: 'std-02', tp_id: 'tp-mat4a-3', nilai: 85, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Amanda Putri
  { id: 'fs-07', student_id: 'std-03', tp_id: 'tp-mat4a-1', nilai: 70, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-08', student_id: 'std-03', tp_id: 'tp-mat4a-2', nilai: 75, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-09', student_id: 'std-03', tp_id: 'tp-mat4a-3', nilai: 72, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Bagas Saputra
  { id: 'fs-10', student_id: 'std-04', tp_id: 'tp-mat4a-1', nilai: 65, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-11', student_id: 'std-04', tp_id: 'tp-mat4a-2', nilai: 70, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-12', student_id: 'std-04', tp_id: 'tp-mat4a-3', nilai: 68, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Citra Lestari
  { id: 'fs-13', student_id: 'std-05', tp_id: 'tp-mat4a-1', nilai: 98, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-14', student_id: 'std-05', tp_id: 'tp-mat4a-2', nilai: 95, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'fs-15', student_id: 'std-05', tp_id: 'tp-mat4a-3', nilai: 96, semester: 'sem-ganjil', tahun: 'th-2025' }
];

export const INITIAL_SUMMATIVE_SCOPE_SCORES: SummativeScopeScore[] = [
  // Achmad Fauzi
  { id: 'sss-01', student_id: 'std-01', lingkup_id: 'lm-mat4a-1', nilai: 82, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'sss-02', student_id: 'std-01', lingkup_id: 'lm-mat4a-2', nilai: 88, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Aditya Pratama
  { id: 'sss-03', student_id: 'std-02', lingkup_id: 'lm-mat4a-1', nilai: 90, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'sss-04', student_id: 'std-02', lingkup_id: 'lm-mat4a-2', nilai: 85, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Amanda Putri
  { id: 'sss-05', student_id: 'std-03', lingkup_id: 'lm-mat4a-1', nilai: 72, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'sss-06', student_id: 'std-03', lingkup_id: 'lm-mat4a-2', nilai: 74, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Bagas Saputra
  { id: 'sss-07', student_id: 'std-04', lingkup_id: 'lm-mat4a-1', nilai: 68, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'sss-08', student_id: 'std-04', lingkup_id: 'lm-mat4a-2', nilai: 70, semester: 'sem-ganjil', tahun: 'th-2025' },
  // Citra Lestari
  { id: 'sss-09', student_id: 'std-05', lingkup_id: 'lm-mat4a-1', nilai: 95, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'sss-10', student_id: 'std-05', lingkup_id: 'lm-mat4a-2', nilai: 97, semester: 'sem-ganjil', tahun: 'th-2025' }
];

export const INITIAL_SEMESTER_SCORES: SemesterScore[] = [
  { id: 'ses-01', student_id: 'std-01', subject_id: 'sub-mat', nilai: 80, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'ses-02', student_id: 'std-02', subject_id: 'sub-mat', nilai: 88, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'ses-03', student_id: 'std-03', subject_id: 'sub-mat', nilai: 75, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'ses-04', student_id: 'std-04', subject_id: 'sub-mat', nilai: 65, semester: 'sem-ganjil', tahun: 'th-2025' },
  { id: 'ses-05', student_id: 'std-05', subject_id: 'sub-mat', nilai: 94, semester: 'sem-ganjil', tahun: 'th-2025' }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', user: 'Admin Sekolah', action: 'Inisialisasi sistem & database Kurikulum Merdeka', timestamp: '2026-07-14T08:00:00Z' },
  { id: 'log-2', user: 'Budi Santoso, S.Pd.', action: 'Melakukan input Nilai Formatif TP 1 Kelas 4-A Matematika', timestamp: '2026-07-14T09:15:00Z' }
];
