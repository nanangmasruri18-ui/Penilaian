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

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_ASSIGNMENTS: TeacherAssignment[] = [];

export const INITIAL_LEARNING_OBJECTIVES: LearningObjective[] = [];

export const INITIAL_MATERIAL_SCOPES: MaterialScope[] = [];

export const INITIAL_FORMATIVE_SCORES: FormativeScore[] = [];

export const INITIAL_SUMMATIVE_SCOPE_SCORES: SummativeScopeScore[] = [];

export const INITIAL_SEMESTER_SCORES: SemesterScore[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'log-1', user: 'Admin Sekolah', action: 'Inisialisasi sistem & database Kurikulum Merdeka', timestamp: '2026-07-14T08:00:00Z' }
];
