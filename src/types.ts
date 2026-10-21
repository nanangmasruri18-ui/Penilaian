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
  updated_at?: string;
}

export interface MaterialScope { // Lingkup Materi
  id: string;
  subject_id: string;
  class_id: string;
  nama: string; // e.g. "Bilangan Pecahan"
  updated_at?: string;
}

export interface FormativeScore {
  id: string;
  student_id: string;
  tp_id: string;
  nilai: number; // 0-100
  semester: string; // semester id or code
  tahun: string; // academic year id or code
  updated_at?: string;
}

export interface SummativeScopeScore {
  id: string;
  student_id: string;
  lingkup_id: string;
  nilai: number; // 0-100
  semester: string;
  tahun: string;
  updated_at?: string;
}

export interface SemesterScore {
  id: string;
  student_id: string;
  subject_id: string;
  nilai: number; // 0-100 (SAS score)
  semester: string;
  tahun: string;
  updated_at?: string;
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

// Natural numeric sorting for Learning Objectives (TP 1, TP 2, TP 3, ... TP 10)
export function sortTps(list: LearningObjective[]): LearningObjective[] {
  const extractNum = (str: string): number => {
    const match = str.match(/(?:tp|tujuan|kompetensi)?\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : NaN;
  };

  return [...list].sort((a, b) => {
    const codeA = (a.kode || '').trim();
    const codeB = (b.kode || '').trim();
    const numA = extractNum(codeA || a.deskripsi || '');
    const numB = extractNum(codeB || b.deskripsi || '');

    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    const textA = codeA || (a.deskripsi || '').trim();
    const textB = codeB || (b.deskripsi || '').trim();
    return textA.localeCompare(textB, 'id', { numeric: true, sensitivity: 'base' });
  });
}

// Natural numeric sorting for Material Scopes (LM 1, LM 2, LM 3, ... LM 10, Unit 1, Unit 2, Bab 1...)
export function sortScopes(list: MaterialScope[]): MaterialScope[] {
  const extractNum = (str: string): number => {
    const match = str.match(/(?:lm|lingkup|materi|unit|bab|tema)?\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : NaN;
  };

  return [...list].sort((a, b) => {
    const nameA = (a.nama || '').trim();
    const nameB = (b.nama || '').trim();
    const numA = extractNum(nameA);
    const numB = extractNum(nameB);

    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return nameA.localeCompare(nameB, 'id', { numeric: true, sensitivity: 'base' });
  });
}

// Alphabetical A-Z sorting for Students
export function sortStudents(list: Student[]): Student[] {
  return [...list].sort((a, b) => {
    const nameA = (a.nama || '').trim();
    const nameB = (b.nama || '').trim();
    return nameA.localeCompare(nameB, 'id', { sensitivity: 'base', numeric: true });
  });
}

