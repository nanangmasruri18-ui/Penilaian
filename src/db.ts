import { 
  Profile, Teacher, Class, Subject, Student, TeacherAssignment, 
  LearningObjective, MaterialScope, FormativeScore, SummativeScopeScore, 
  SemesterScore, AcademicYear, Semester, AuditLog 
} from './types';
import * as seed from './seed';
import { queueAutoPush } from './supabase';


// Storage keys
const KEYS = {
  ACADEMIC_YEARS: 'merdeka_academic_years',
  SEMESTERS: 'merdeka_semesters',
  PROFILES: 'merdeka_profiles',
  TEACHERS: 'merdeka_teachers',
  CLASSES: 'merdeka_classes',
  SUBJECTS: 'merdeka_subjects',
  STUDENTS: 'merdeka_students',
  ASSIGNMENTS: 'merdeka_assignments',
  LEARNING_OBJECTIVES: 'merdeka_learning_objectives',
  MATERIAL_SCOPES: 'merdeka_material_scopes',
  FORMATIVE_SCORES: 'merdeka_formative_scores',
  SUMMATIVE_SCOPE_SCORES: 'merdeka_summative_scope_scores',
  SEMESTER_SCORES: 'merdeka_semester_scores',
  AUDIT_LOGS: 'merdeka_audit_logs',
  SESSION: 'merdeka_session'
};

// Initialize database with seed data if not present
export function initializeDatabase(forceReset = false) {
  const check = localStorage.getItem(KEYS.ACADEMIC_YEARS);
  if (!check || forceReset) {
    localStorage.setItem(KEYS.ACADEMIC_YEARS, JSON.stringify(seed.INITIAL_ACADEMIC_YEARS));
    localStorage.setItem(KEYS.SEMESTERS, JSON.stringify(seed.INITIAL_SEMESTERS));
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(seed.INITIAL_PROFILES));
    localStorage.setItem(KEYS.TEACHERS, JSON.stringify(seed.INITIAL_TEACHERS));
    localStorage.setItem(KEYS.CLASSES, JSON.stringify(seed.INITIAL_CLASSES));
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(seed.INITIAL_SUBJECTS));
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(seed.INITIAL_STUDENTS));
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(seed.INITIAL_ASSIGNMENTS));
    localStorage.setItem(KEYS.LEARNING_OBJECTIVES, JSON.stringify(seed.INITIAL_LEARNING_OBJECTIVES));
    localStorage.setItem(KEYS.MATERIAL_SCOPES, JSON.stringify(seed.INITIAL_MATERIAL_SCOPES));
    localStorage.setItem(KEYS.FORMATIVE_SCORES, JSON.stringify(seed.INITIAL_FORMATIVE_SCORES));
    localStorage.setItem(KEYS.SUMMATIVE_SCOPE_SCORES, JSON.stringify(seed.INITIAL_SUMMATIVE_SCOPE_SCORES));
    localStorage.setItem(KEYS.SEMESTER_SCORES, JSON.stringify(seed.INITIAL_SEMESTER_SCORES));
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(seed.INITIAL_AUDIT_LOGS));
    
    if (forceReset) {
      logAudit('System', 'Reset database ke seed data awal.');
    }
    return true;
  }
  return false;
}

// Low-level read/write
function get<T>(key: string, defaultValue: T): T {
  const item = localStorage.getItem(key);
  if (!item) return defaultValue;
  try {
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  // Queue asynchronous background auto-save to Supabase
  queueAutoPush(key, value);
}

// Log actions
export function logAudit(user: string, action: string) {
  const logs = get<AuditLog[]>(KEYS.AUDIT_LOGS, []);
  const newLog: AuditLog = {
    id: 'log-' + Date.now() + Math.random().toString(36).substr(2, 4),
    user,
    action,
    timestamp: new Date().toISOString()
  };
  set(KEYS.AUDIT_LOGS, [newLog, ...logs]);
}

// --- Getter API ---
export const db = {
  getAcademicYears: () => get<AcademicYear[]>(KEYS.ACADEMIC_YEARS, []),
  setAcademicYears: (data: AcademicYear[]) => set(KEYS.ACADEMIC_YEARS, data),

  getSemesters: () => get<Semester[]>(KEYS.SEMESTERS, []),
  setSemesters: (data: Semester[]) => set(KEYS.SEMESTERS, data),

  getProfiles: () => get<Profile[]>(KEYS.PROFILES, []),
  setProfiles: (data: Profile[]) => set(KEYS.PROFILES, data),

  getTeachers: () => get<Teacher[]>(KEYS.TEACHERS, []),
  setTeachers: (data: Teacher[]) => set(KEYS.TEACHERS, data),

  getClasses: () => get<Class[]>(KEYS.CLASSES, []),
  setClasses: (data: Class[]) => set(KEYS.CLASSES, data),

  getSubjects: () => get<Subject[]>(KEYS.SUBJECTS, []),
  setSubjects: (data: Subject[]) => set(KEYS.SUBJECTS, data),

  getStudents: () => get<Student[]>(KEYS.STUDENTS, []),
  setStudents: (data: Student[]) => set(KEYS.STUDENTS, data),

  getAssignments: () => get<TeacherAssignment[]>(KEYS.ASSIGNMENTS, []),
  setAssignments: (data: TeacherAssignment[]) => set(KEYS.ASSIGNMENTS, data),

  getLearningObjectives: () => get<LearningObjective[]>(KEYS.LEARNING_OBJECTIVES, []),
  setLearningObjectives: (data: LearningObjective[]) => set(KEYS.LEARNING_OBJECTIVES, data),

  getMaterialScopes: () => get<MaterialScope[]>(KEYS.MATERIAL_SCOPES, []),
  setMaterialScopes: (data: MaterialScope[]) => set(KEYS.MATERIAL_SCOPES, data),

  getFormativeScores: () => get<FormativeScore[]>(KEYS.FORMATIVE_SCORES, []),
  setFormativeScores: (data: FormativeScore[]) => set(KEYS.FORMATIVE_SCORES, data),

  getSummativeScopeScores: () => get<SummativeScopeScore[]>(KEYS.SUMMATIVE_SCOPE_SCORES, []),
  setSummativeScopeScores: (data: SummativeScopeScore[]) => set(KEYS.SUMMATIVE_SCOPE_SCORES, data),

  getSemesterScores: () => get<SemesterScore[]>(KEYS.SEMESTER_SCORES, []),
  setSemesterScores: (data: SemesterScore[]) => set(KEYS.SEMESTER_SCORES, data),

  getAuditLogs: () => get<AuditLog[]>(KEYS.AUDIT_LOGS, []),
  
  getSession: () => get<Profile | null>(KEYS.SESSION, null),
  setSession: (profile: Profile | null) => set(KEYS.SESSION, profile)
};

// --- CRUD Helpers ---

// Get active academic year & semester
export function getActiveContext() {
  const years = db.getAcademicYears();
  const sems = db.getSemesters();
  return {
    year: years.find(y => y.aktif) || years[0] || null,
    semester: sems.find(s => s.aktif) || sems[0] || null
  };
}

// Teacher Assignment CRUD
export function getTeacherForUser(userId: string): Teacher | null {
  const teachers = db.getTeachers();
  return teachers.find(t => t.user_id === userId) || null;
}

export function getTeacherAssignedClassesAndSubjects(teacherId: string) {
  const assignments = db.getAssignments();
  const classes = db.getClasses();
  const subjects = db.getSubjects();

  const teacherAssignments = assignments.filter(a => a.teacher_id === teacherId);
  
  const assignedClasses = classes.filter(c => 
    teacherAssignments.some(a => a.class_id === c.id)
  );

  const assignedSubjects = subjects.filter(s => 
    teacherAssignments.some(a => a.subject_id === s.id)
  );

  return {
    assignments: teacherAssignments,
    classes: assignedClasses,
    subjects: assignedSubjects
  };
}

// Formative Grade Management
export function saveFormativeGrades(
  grades: { student_id: string; tp_id: string; nilai: number }[],
  semesterId: string,
  yearId: string,
  editorName: string
) {
  const current = db.getFormativeScores();
  const updated = [...current];

  grades.forEach(g => {
    const existingIndex = updated.findIndex(
      item => item.student_id === g.student_id && 
              item.tp_id === g.tp_id && 
              item.semester === semesterId && 
              item.tahun === yearId
    );

    const nowIso = new Date().toISOString();
    if (existingIndex > -1) {
      updated[existingIndex].nilai = g.nilai;
      updated[existingIndex].updated_at = nowIso;
    } else {
      updated.push({
        id: 'fs-' + Date.now() + Math.random().toString(36).substr(2, 4),
        student_id: g.student_id,
        tp_id: g.tp_id,
        nilai: g.nilai,
        semester: semesterId,
        tahun: yearId,
        updated_at: nowIso
      });
    }
  });

  db.setFormativeScores(updated);
  logAudit(editorName, `Mengubah ${grades.length} nilai formatif.`);
}

// Summative Scope Grade Management
export function saveSummativeScopeGrades(
  grades: { student_id: string; lingkup_id: string; nilai: number }[],
  semesterId: string,
  yearId: string,
  editorName: string
) {
  const current = db.getSummativeScopeScores();
  const updated = [...current];

  grades.forEach(g => {
    const existingIndex = updated.findIndex(
      item => item.student_id === g.student_id && 
              item.lingkup_id === g.lingkup_id && 
              item.semester === semesterId && 
              item.tahun === yearId
    );

    const nowIso = new Date().toISOString();
    if (existingIndex > -1) {
      updated[existingIndex].nilai = g.nilai;
      updated[existingIndex].updated_at = nowIso;
    } else {
      updated.push({
        id: 'sss-' + Date.now() + Math.random().toString(36).substr(2, 4),
        student_id: g.student_id,
        lingkup_id: g.lingkup_id,
        nilai: g.nilai,
        semester: semesterId,
        tahun: yearId,
        updated_at: nowIso
      });
    }
  });

  db.setSummativeScopeScores(updated);
  logAudit(editorName, `Mengubah ${grades.length} nilai sumatif lingkup materi.`);
}

// Semester Score (SAS) Management
export function saveSemesterGrades(
  grades: { student_id: string; subject_id: string; nilai: number }[],
  semesterId: string,
  yearId: string,
  editorName: string
) {
  const current = db.getSemesterScores();
  const updated = [...current];

  grades.forEach(g => {
    const existingIndex = updated.findIndex(
      item => item.student_id === g.student_id && 
              item.subject_id === g.subject_id && 
              item.semester === semesterId && 
              item.tahun === yearId
    );

    const nowIso = new Date().toISOString();
    if (existingIndex > -1) {
      updated[existingIndex].nilai = g.nilai;
      updated[existingIndex].updated_at = nowIso;
    } else {
      updated.push({
        id: 'ses-' + Date.now() + Math.random().toString(36).substr(2, 4),
        student_id: g.student_id,
        subject_id: g.subject_id,
        nilai: g.nilai,
        semester: semesterId,
        tahun: yearId,
        updated_at: nowIso
      });
    }
  });

  db.setSemesterScores(updated);
  logAudit(editorName, `Mengubah ${grades.length} nilai sumatif akhir semester.`);
}
