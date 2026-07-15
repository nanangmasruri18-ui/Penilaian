export type UserRole = 'Admin' | 'Guru';

export interface Profile {
  id: string;
  nama: string;
  role: UserRole;
  email: string;
  password?: string;
}

export interface Teacher {
  id: string;
  user_id: string; // references Profile.id
  nama: string;
}

export interface Class {
  id: string;
  nama: string;
}

export interface Subject {
  id: string;
  nama: string;
}

export interface Student {
  id: string;
  nisn: string;
  nama: string;
  kelas_id: string;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
}

export interface LearningObjective { // TP
  id: string;
  subject_id: string;
  class_id: string;
  kode: string; // e.g. "TP 1"
  deskripsi: string;
}

export interface MaterialScope { // Lingkup Materi
  id: string;
  subject_id: string;
  class_id: string;
  nama: string; // e.g. "Bilangan Pecahan"
}

export interface FormativeScore {
  id: string;
  student_id: string;
  tp_id: string;
  nilai: number; // 0-100
  semester: string; // semester id or code
  tahun: string; // academic year id or code
}

export interface SummativeScopeScore {
  id: string;
  student_id: string;
  lingkup_id: string;
  nilai: number; // 0-100
  semester: string;
  tahun: string;
}

export interface SemesterScore {
  id: string;
  student_id: string;
  subject_id: string;
  nilai: number; // 0-100 (SAS score)
  semester: string;
  tahun: string;
}

export interface AcademicYear {
  id: string;
  nama: string; // e.g. "2025/2026"
  aktif: boolean;
}

export interface Semester {
  id: string;
  nama: string; // e.g. "Ganjil" or "Genap"
  aktif: boolean;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}
