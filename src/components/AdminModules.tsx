import React, { useState, useMemo } from 'react';
import { 
  db, logAudit, getActiveContext 
} from '../db';
import { 
  Profile, Teacher, Class, Subject, Student, TeacherAssignment, 
  AcademicYear, Semester, AuditLog, LearningObjective, MaterialScope,
  FormativeScore, SummativeScopeScore, SemesterScore
} from '../types';
import { Modal } from './Modal';
import { 
  Users, Layers, GraduationCap, BookOpen, Calendar, Clock, 
  Plus, Edit, Trash2, Search, ArrowUpDown, RefreshCw, Key, 
  ChevronLeft, ChevronRight, Upload, CheckCircle2, AlertCircle, FileText, Download,
  Printer, FileSpreadsheet, User, Save, Eye, EyeOff, History
} from 'lucide-react';

const getLogCategory = (action: string) => {
  if (action.includes('TP')) {
    return {
      label: 'Tujuan Pembelajaran (TP)',
      color: 'bg-indigo-50/70 text-indigo-700 border-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
      iconColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
      type: 'tp' as const
    };
  }
  if (action.toLowerCase().includes('lingkup materi')) {
    return {
      label: 'Lingkup Materi (LM)',
      color: 'bg-amber-50/70 text-amber-700 border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
      iconColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      type: 'lm' as const
    };
  }
  if (action.toLowerCase().includes('nilai')) {
    return {
      label: 'Input Nilai',
      color: 'bg-emerald-50/70 text-emerald-750 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
      iconColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      type: 'nilai' as const
    };
  }
  return null;
};

interface AdminModulesProps {
  currentTab: string;
  addToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onRefreshStats: () => void;
}

export const AdminModules: React.FC<AdminModulesProps> = ({ currentTab, addToast, onRefreshStats }) => {
  // State for all database entities
  const [teachers, setTeachers] = useState<Teacher[]>(() => db.getTeachers());
  const [profiles, setProfiles] = useState<Profile[]>(() => db.getProfiles());
  const [classes, setClasses] = useState<Class[]>(() => db.getClasses());
  const [subjects, setSubjects] = useState<Subject[]>(() => db.getSubjects());
  const [students, setStudents] = useState<Student[]>(() => db.getStudents());
  const [assignments, setAssignments] = useState<TeacherAssignment[]>(() => db.getAssignments());
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => db.getAcademicYears());
  const [semesters, setSemesters] = useState<Semester[]>(() => db.getSemesters());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => db.getAuditLogs());

  // Additional grade ledger entities for rekapitulasi
  const [tps, setTps] = useState<LearningObjective[]>(() => db.getLearningObjectives());
  const [scopes, setScopes] = useState<MaterialScope[]>(() => db.getMaterialScopes());
  const [formativeScores, setFormativeScores] = useState<FormativeScore[]>(() => db.getFormativeScores());
  const [summativeScores, setSummativeScores] = useState<SummativeScopeScore[]>(() => db.getSummativeScopeScores());
  const [semesterScores, setSemesterScores] = useState<SemesterScore[]>(() => db.getSemesterScores());

  const [activeClassId, setActiveClassId] = useState<string>(() => {
    const list = db.getClasses();
    return list[0]?.id || '';
  });
  const [activeSubjectId, setActiveSubjectId] = useState<string>(() => {
    const list = db.getSubjects();
    return list[0]?.id || '';
  });

  // Current active Context (Year & Semester)
  const context = useMemo(() => getActiveContext(), []);

  // Editable Signature Information (stored in localStorage for convenience/durability, shared with teachers)
  const [kepsekName, setKepsekName] = useState<string>(() => {
    return localStorage.getItem('rekap_kepsek_name') || 'Drs. H. Mulyono, M.Pd.';
  });
  const [kepsekNip, setKepsekNip] = useState<string>(() => {
    return localStorage.getItem('rekap_kepsek_nip') || '19680514 199303 1 002';
  });
  const [signaturePlaceAndDate, setSignaturePlaceAndDate] = useState<string>(() => {
    return localStorage.getItem('rekap_sig_date') || `Sleman, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  });
  const [customTeacherName, setCustomTeacherName] = useState<string>(() => {
    return localStorage.getItem('rekap_teacher_name') || 'Guru Kelas/Mapel';
  });
  const [teacherNip, setTeacherNip] = useState<string>(() => {
    return localStorage.getItem('rekap_teacher_nip') || '19891204 201504 2 003';
  });

  // Profile & Password settings for Admin
  const [profileName, setProfileName] = useState<string>(() => {
    return db.getSession()?.nama || '';
  });
  const [profilePass, setProfilePass] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [selectedLogType, setSelectedLogType] = useState<'all' | 'tp' | 'lm' | 'nilai'>('all');

  const handleKepsekNameChange = (val: string) => {
    setKepsekName(val);
    localStorage.setItem('rekap_kepsek_name', val);
  };

  const handleKepsekNipChange = (val: string) => {
    setKepsekNip(val);
    localStorage.setItem('rekap_kepsek_nip', val);
  };

  const handleSignatureDateChange = (val: string) => {
    setSignaturePlaceAndDate(val);
    localStorage.setItem('rekap_sig_date', val);
  };

  const handleCustomTeacherNameChange = (val: string) => {
    setCustomTeacherName(val);
    localStorage.setItem('rekap_teacher_name', val);
  };

  const handleTeacherNipChange = (val: string) => {
    setTeacherNip(val);
    localStorage.setItem('rekap_teacher_nip', val);
  };

  // --- Admin Profile & Password Update ---
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session = db.getSession();
    if (!session) return;

    const name = profileName.trim();
    if (!name) {
      addToast('error', 'Nama Kosong', 'Nama profil tidak boleh kosong.');
      return;
    }

    // Update session and profiles database
    const updatedSession = { ...session, nama: name, ...(profilePass ? { password: profilePass } : {}) };
    const allProfiles = db.getProfiles();
    const updatedProfiles = allProfiles.map(p => p.id === session.id ? { ...p, nama: name, ...(profilePass ? { password: profilePass } : {}) } : p);

    db.setProfiles(updatedProfiles);
    db.setSession(updatedSession);

    logAudit(name, `Memperbarui profil diri Administrator.`);
    addToast('success', 'Profil Diperbarui', 'Nama profil Anda berhasil disimpan.');

    if (profilePass) {
      logAudit(name, `Mengubah kata sandi akun Administrator.`);
      addToast('success', 'Sandi Berhasil Diubah', 'Kata sandi baru Anda berhasil diaktifkan.');
      setProfilePass('');
    }
    syncState();
  };

  // Helper to sync local state with db
  const syncState = () => {
    setTeachers(db.getTeachers());
    setProfiles(db.getProfiles());
    const clList = db.getClasses();
    setClasses(clList);
    const subList = db.getSubjects();
    setSubjects(subList);
    setStudents(db.getStudents());
    setAssignments(db.getAssignments());
    setAcademicYears(db.getAcademicYears());
    setSemesters(db.getSemesters());
    setAuditLogs(db.getAuditLogs());
    setTps(db.getLearningObjectives());
    setScopes(db.getMaterialScopes());
    setFormativeScores(db.getFormativeScores());
    setSummativeScores(db.getSummativeScopeScores());
    setSemesterScores(db.getSemesterScores());

    if (clList.length > 0 && !activeClassId) {
      setActiveClassId(clList[0].id);
    }
    if (subList.length > 0 && !activeSubjectId) {
      setActiveSubjectId(subList[0].id);
    }

    onRefreshStats();
  };

  // --- Modal Forms State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete' | 'reset-pass'>('add');
  const [targetEntity, setTargetEntity] = useState<string>(''); // 'teacher', 'class', 'student', etc.
  const [selectedId, setSelectedId] = useState<string>('');

  // Form Fields State
  const [formData, setFormData] = useState<any>({});

  // Sorting, Pagination, Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterClass, setFilterClass] = useState('all');
  const itemsPerPage = 8;

  // --- CSV / Excel Copy-Paste Importer State ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importClassId, setImportClassId] = useState('');
  const [pasteData, setPasteData] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<{ nisn: string; nama: string; valid: boolean; error?: string }[]>([]);

  // Open modal helper
  const openModal = (type: 'add' | 'edit' | 'delete' | 'reset-pass', entity: string, id: string = '', initialData: any = {}) => {
    setModalType(type);
    setTargetEntity(entity);
    setSelectedId(id);
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
    setSelectedId('');
  };

  // Sorting Helper
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Submit Handler for Admin CRUD
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const activeUser = db.getSession()?.nama || 'Admin';

    if (modalType === 'delete') {
      // Execute Delete
      if (targetEntity === 'teacher') {
        const t = teachers.find(item => item.id === selectedId);
        if (t) {
          // Delete assignments associated
          const updatedAsg = assignments.filter(a => a.teacher_id !== t.id);
          db.setAssignments(updatedAsg);
          
          // Delete teacher
          const updatedT = teachers.filter(item => item.id !== selectedId);
          db.setTeachers(updatedT);

          // Delete corresponding profile
          const updatedP = profiles.filter(item => item.id !== t.user_id);
          db.setProfiles(updatedP);

          logAudit(activeUser, `Menghapus guru: ${t.nama} dan akun terkait.`);
          addToast('success', 'Berhasil Dihapus', `Guru ${t.nama} telah berhasil dihapus.`);
        }
      } 
      else if (targetEntity === 'class') {
        const c = classes.find(item => item.id === selectedId);
        if (c) {
          // check if students exist in class
          const countStudents = students.filter(s => s.kelas_id === c.id).length;
          if (countStudents > 0) {
            addToast('error', 'Hapus Gagal', `Kelas ${c.nama} masih memiliki ${countStudents} siswa. Kosongkan kelas terlebih dahulu.`);
            closeModal();
            return;
          }

          const updatedC = classes.filter(item => item.id !== selectedId);
          db.setClasses(updatedC);
          // Delete assignments for this class
          const updatedAsg = assignments.filter(a => a.class_id !== c.id);
          db.setAssignments(updatedAsg);

          logAudit(activeUser, `Menghapus kelas: ${c.nama}`);
          addToast('success', 'Berhasil Dihapus', `Kelas ${c.nama} telah berhasil dihapus.`);
        }
      } 
      else if (targetEntity === 'subject') {
        const s = subjects.find(item => item.id === selectedId);
        if (s) {
          const updatedS = subjects.filter(item => item.id !== selectedId);
          db.setSubjects(updatedS);
          // Delete assignments
          const updatedAsg = assignments.filter(a => a.subject_id !== s.id);
          db.setAssignments(updatedAsg);

          logAudit(activeUser, `Menghapus mata pelajaran: ${s.nama}`);
          addToast('success', 'Berhasil Dihapus', `Mata pelajaran ${s.nama} telah berhasil dihapus.`);
        }
      } 
      else if (targetEntity === 'student') {
        const s = students.find(item => item.id === selectedId);
        if (s) {
          const updatedS = students.filter(item => item.id !== selectedId);
          db.setStudents(updatedS);

          logAudit(activeUser, `Menghapus siswa: ${s.nama} (${s.nisn})`);
          addToast('success', 'Berhasil Dihapus', `Siswa ${s.nama} telah berhasil dihapus.`);
        }
      }
      else if (targetEntity === 'assignment') {
        const a = assignments.find(item => item.id === selectedId);
        if (a) {
          const updatedA = assignments.filter(item => item.id !== selectedId);
          db.setAssignments(updatedA);

          const teacher = teachers.find(t => t.id === a.teacher_id);
          const cls = classes.find(c => c.id === a.class_id);
          const sub = subjects.find(s => s.id === a.subject_id);

          logAudit(activeUser, `Menghapus penugasan mengajar: ${teacher?.nama || 'Guru'} di ${cls?.nama || 'Kelas'} (${sub?.nama || 'Mapel'})`);
          addToast('success', 'Berhasil Dihapus', `Penugasan mengajar telah dihapus.`);
        }
      }
      else if (targetEntity === 'academicYear') {
        const y = academicYears.find(item => item.id === selectedId);
        if (y) {
          if (y.aktif) {
            addToast('error', 'Hapus Gagal', `Tahun pelajaran yang sedang aktif tidak dapat dihapus.`);
            closeModal();
            return;
          }
          const updatedY = academicYears.filter(item => item.id !== selectedId);
          db.setAcademicYears(updatedY);
          logAudit(activeUser, `Menghapus tahun pelajaran: ${y.nama}`);
          addToast('success', 'Berhasil Dihapus', `Tahun pelajaran ${y.nama} berhasil dihapus.`);
        }
      }
      else if (targetEntity === 'semester') {
        const s = semesters.find(item => item.id === selectedId);
        if (s) {
          if (s.aktif) {
            addToast('error', 'Hapus Gagal', `Semester yang sedang aktif tidak dapat dihapus.`);
            closeModal();
            return;
          }
          const updatedS = semesters.filter(item => item.id !== selectedId);
          db.setSemesters(updatedS);
          logAudit(activeUser, `Menghapus semester: ${s.nama}`);
          addToast('success', 'Berhasil Dihapus', `Semester ${s.nama} berhasil dihapus.`);
        }
      }

      syncState();
      closeModal();
      return;
    }

    if (modalType === 'reset-pass') {
      const p = profiles.find(item => item.id === selectedId);
      if (p) {
        logAudit(activeUser, `Melakukan reset kata sandi untuk guru: ${p.nama}`);
        addToast('success', 'Sandi Direset', `Kata sandi akun ${p.nama} berhasil direset menjadi "guru123".`);
      }
      closeModal();
      return;
    }

    // Add and Edit logic
    if (targetEntity === 'teacher') {
      const name = formData.nama?.trim();
      const email = formData.email?.trim()?.toLowerCase();

      if (!name || !email) {
        addToast('error', 'Validasi Gagal', 'Nama dan Email guru wajib diisi.');
        return;
      }

      if (modalType === 'add') {
        // Email check duplicate
        if (profiles.some(p => p.email.toLowerCase() === email)) {
          addToast('error', 'Email Terdaftar', 'Email tersebut sudah digunakan akun lain.');
          return;
        }

        const newProfileId = 'prof-' + Date.now();
        const newTeacherId = 'tch-' + Date.now();

        const newProfile: Profile = {
          id: newProfileId,
          nama: name,
          role: 'Guru',
          email: email
        };

        const newTeacher: Teacher = {
          id: newTeacherId,
          user_id: newProfileId,
          nama: name
        };

        db.setProfiles([...profiles, newProfile]);
        db.setTeachers([...teachers, newTeacher]);
        logAudit(activeUser, `Menambahkan guru baru: ${name} (${email})`);
        addToast('success', 'Guru Ditambahkan', `${name} berhasil ditambahkan.`);
      } else {
        // Edit teacher
        const t = teachers.find(item => item.id === selectedId);
        if (t) {
          // Check email duplicate except self
          const otherProfiles = profiles.filter(p => p.id !== t.user_id);
          if (otherProfiles.some(p => p.email.toLowerCase() === email)) {
            addToast('error', 'Email Terdaftar', 'Email tersebut sudah digunakan akun lain.');
            return;
          }

          const updatedT = teachers.map(item => item.id === t.id ? { ...item, nama: name } : item);
          const updatedP = profiles.map(item => item.id === t.user_id ? { ...item, nama: name, email: email } : item);

          db.setTeachers(updatedT);
          db.setProfiles(updatedP);
          logAudit(activeUser, `Mengubah data guru: ${name} (${email})`);
          addToast('success', 'Guru Diubah', `Profil guru ${name} berhasil diperbarui.`);
        }
      }
    }

    else if (targetEntity === 'class') {
      const name = formData.nama?.trim();
      if (!name) {
        addToast('error', 'Validasi Gagal', 'Nama kelas wajib diisi.');
        return;
      }

      if (modalType === 'add') {
        if (classes.some(c => c.nama.toLowerCase() === name.toLowerCase())) {
          addToast('error', 'Duplikasi Data', 'Nama kelas sudah terdaftar.');
          return;
        }
        const newClass: Class = {
          id: 'cls-' + Date.now(),
          nama: name
        };
        db.setClasses([...classes, newClass]);
        logAudit(activeUser, `Menambahkan kelas baru: ${name}`);
        addToast('success', 'Kelas Ditambahkan', `Kelas ${name} berhasil didaftarkan.`);
      } else {
        const otherClasses = classes.filter(c => c.id !== selectedId);
        if (otherClasses.some(c => c.nama.toLowerCase() === name.toLowerCase())) {
          addToast('error', 'Duplikasi Data', 'Nama kelas sudah terdaftar.');
          return;
        }
        const updatedC = classes.map(c => c.id === selectedId ? { ...c, nama: name } : c);
        db.setClasses(updatedC);
        logAudit(activeUser, `Mengubah kelas ke: ${name}`);
        addToast('success', 'Kelas Diubah', `Nama kelas berhasil diubah menjadi ${name}.`);
      }
    }

    else if (targetEntity === 'subject') {
      const name = formData.nama?.trim();
      if (!name) {
        addToast('error', 'Validasi Gagal', 'Nama mata pelajaran wajib diisi.');
        return;
      }

      if (modalType === 'add') {
        if (subjects.some(s => s.nama.toLowerCase() === name.toLowerCase())) {
          addToast('error', 'Duplikasi Data', 'Mata pelajaran sudah terdaftar.');
          return;
        }
        const newSub: Subject = {
          id: 'sub-' + Date.now(),
          nama: name
        };
        db.setSubjects([...subjects, newSub]);
        logAudit(activeUser, `Menambahkan mata pelajaran baru: ${name}`);
        addToast('success', 'Mata Pelajaran Ditambahkan', `Mata pelajaran ${name} berhasil ditambahkan.`);
      } else {
        const otherSubjects = subjects.filter(s => s.id !== selectedId);
        if (otherSubjects.some(s => s.nama.toLowerCase() === name.toLowerCase())) {
          addToast('error', 'Duplikasi Data', 'Mata pelajaran sudah terdaftar.');
          return;
        }
        const updatedS = subjects.map(s => s.id === selectedId ? { ...s, nama: name } : s);
        db.setSubjects(updatedS);
        logAudit(activeUser, `Mengubah mata pelajaran ke: ${name}`);
        addToast('success', 'Mata Pelajaran Diubah', `Nama mata pelajaran berhasil diubah.`);
      }
    }

    else if (targetEntity === 'student') {
      const name = formData.nama?.trim();
      const nisn = formData.nisn?.trim();
      const classId = formData.kelas_id;

      if (!name || !nisn || !classId) {
        addToast('error', 'Validasi Gagal', 'NISN, Nama Lengkap, dan Kelas wajib diisi.');
        return;
      }

      // NISN check length / digits
      if (!/^\d{10}$/.test(nisn)) {
        addToast('error', 'Validasi NISN', 'NISN wajib berisi tepat 10 digit angka.');
        return;
      }

      if (modalType === 'add') {
        if (students.some(s => s.nisn === nisn)) {
          addToast('error', 'NISN Terdaftar', `Siswa dengan NISN ${nisn} sudah terdaftar di sistem.`);
          return;
        }
        const newStudent: Student = {
          id: 'std-' + Date.now(),
          nisn: nisn,
          nama: name,
          kelas_id: classId
        };
        db.setStudents([...students, newStudent]);
        logAudit(activeUser, `Mendaftarkan siswa baru: ${name} (${nisn})`);
        addToast('success', 'Siswa Didaftarkan', `Siswa ${name} berhasil ditambahkan.`);
      } else {
        const otherStudents = students.filter(s => s.id !== selectedId);
        if (otherStudents.some(s => s.nisn === nisn)) {
          addToast('error', 'NISN Terdaftar', `Siswa dengan NISN ${nisn} sudah terdaftar.`);
          return;
        }
        const updatedS = students.map(s => s.id === selectedId ? { ...s, nisn, nama: name, kelas_id: classId } : s);
        db.setStudents(updatedS);
        logAudit(activeUser, `Mengubah data siswa: ${name} (${nisn})`);
        addToast('success', 'Siswa Diperbarui', `Data siswa berhasil diperbarui.`);
      }
    }

    else if (targetEntity === 'assignment') {
      const teacherId = formData.teacher_id;
      const classId = formData.class_id;
      const subjectId = formData.subject_id;

      if (!teacherId || !classId || !subjectId) {
        addToast('error', 'Validasi Gagal', 'Pilih Guru, Kelas, dan Mata Pelajaran.');
        return;
      }

      // Duplicate assignment check
      const isDuplicate = assignments.some(a => 
        a.teacher_id === teacherId && a.class_id === classId && a.subject_id === subjectId
      );

      if (isDuplicate) {
        addToast('error', 'Duplikasi Penugasan', 'Penugasan mengajar ini sudah terdaftar sebelumnya.');
        return;
      }

      const newAsg: TeacherAssignment = {
        id: 'asg-' + Date.now(),
        teacher_id: teacherId,
        class_id: classId,
        subject_id: subjectId
      };

      db.setAssignments([...assignments, newAsg]);
      const t = teachers.find(item => item.id === teacherId);
      const c = classes.find(item => item.id === classId);
      const s = subjects.find(item => item.id === subjectId);
      logAudit(activeUser, `Menugaskan mengajar: ${t?.nama} mengajar ${s?.nama} di ${c?.nama}`);
      addToast('success', 'Penugasan Berhasil', `Berhasil menugaskan ${t?.nama} mengajar ${s?.nama} di ${c?.nama}.`);
    }

    else if (targetEntity === 'academicYear') {
      const name = formData.nama?.trim();
      const active = formData.aktif === 'true' || formData.aktif === true;

      if (!name) {
        addToast('error', 'Validasi Gagal', 'Nama tahun pelajaran wajib diisi.');
        return;
      }

      let updatedY = [...academicYears];
      if (modalType === 'add') {
        const newY: AcademicYear = {
          id: 'th-' + Date.now(),
          nama: name,
          aktif: active
        };
        
        if (active) {
          // deactivate all others
          updatedY = updatedY.map(y => ({ ...y, aktif: false }));
        }
        updatedY.push(newY);
        db.setAcademicYears(updatedY);
        logAudit(activeUser, `Menambahkan tahun pelajaran: ${name}`);
        addToast('success', 'Tahun Pelajaran Ditambahkan', `Tahun pelajaran ${name} berhasil dibuat.`);
      } else {
        if (active) {
          updatedY = updatedY.map(y => ({ ...y, aktif: y.id === selectedId }));
        } else {
          // If deactivated, we must verify at least one remains active
          const willHaveActive = updatedY.some(y => y.id !== selectedId && y.aktif);
          if (!willHaveActive) {
            addToast('error', 'Konfigurasi Tidak Sah', 'Minimal harus ada satu tahun pelajaran aktif.');
            return;
          }
          updatedY = updatedY.map(y => y.id === selectedId ? { ...y, nama: name, aktif: false } : y);
        }
        db.setAcademicYears(updatedY);
        logAudit(activeUser, `Mengubah konfigurasi tahun pelajaran: ${name}`);
        addToast('success', 'Pengaturan Disimpan', `Konfigurasi Tahun Pelajaran berhasil diperbarui.`);
      }
    }

    else if (targetEntity === 'semester') {
      const name = formData.nama?.trim();
      const active = formData.aktif === 'true' || formData.aktif === true;

      if (!name) {
        addToast('error', 'Validasi Gagal', 'Nama semester wajib diisi.');
        return;
      }

      let updatedS = [...semesters];
      if (modalType === 'add') {
        const newS: Semester = {
          id: 'sem-' + Date.now(),
          nama: name,
          aktif: active
        };
        if (active) {
          updatedS = updatedS.map(s => ({ ...s, aktif: false }));
        }
        updatedS.push(newS);
        db.setSemesters(updatedS);
        logAudit(activeUser, `Menambahkan semester baru: ${name}`);
        addToast('success', 'Semester Ditambahkan', `Semester ${name} berhasil dibuat.`);
      } else {
        if (active) {
          updatedS = updatedS.map(s => ({ ...s, aktif: s.id === selectedId }));
        } else {
          const willHaveActive = updatedS.some(s => s.id !== selectedId && s.aktif);
          if (!willHaveActive) {
            addToast('error', 'Konfigurasi Tidak Sah', 'Minimal harus ada satu semester aktif.');
            return;
          }
          updatedS = updatedS.map(s => s.id === selectedId ? { ...s, nama: name, aktif: false } : s);
        }
        db.setSemesters(updatedS);
        logAudit(activeUser, `Mengubah konfigurasi semester ke: ${name}`);
        addToast('success', 'Pengaturan Disimpan', `Konfigurasi Semester berhasil diperbarui.`);
      }
    }

    syncState();
    closeModal();
  };

  // --- CSV Student Importer Logic ---
  const handleParseImport = () => {
    if (!pasteData.trim()) {
      addToast('error', 'Gagal', 'Sila tempelkan teks (NISN & Nama) dari Excel terlebih dahulu.');
      return;
    }

    const lines = pasteData.split('\n');
    const parsed: typeof parsedImportRows = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      
      // Support Tab (\t), semicolon (;), comma (,) separators
      let parts = line.split('\t');
      if (parts.length < 2) parts = line.split(';');
      if (parts.length < 2) parts = line.split(',');

      if (parts.length < 2) {
        parsed.push({
          nisn: '',
          nama: line.trim(),
          valid: false,
          error: 'Format baris tidak dikenal. Wajib ada pemisah Tab, Koma, atau Titik Koma.'
        });
        return;
      }

      const rawNisn = parts[0].trim().replace(/\s+/g, '');
      const rawNama = parts.slice(1).join(' ').trim();

      // Check validation
      const isDigitOnly = /^\d+$/.test(rawNisn);
      const isTenDigit = rawNisn.length === 10;
      const isNisnTaken = students.some(s => s.nisn === rawNisn) || parsed.some(p => p.nisn === rawNisn);

      let valid = true;
      let error = '';

      if (!rawNisn) {
        valid = false;
        error = 'NISN kosong.';
      } else if (!isDigitOnly) {
        valid = false;
        error = 'NISN harus berupa angka.';
      } else if (!isTenDigit) {
        valid = false;
        error = 'NISN wajib tepat 10 digit.';
      } else if (isNisnTaken) {
        valid = false;
        error = 'NISN sudah ada di database/daftar.';
      }

      if (!rawNama) {
        valid = false;
        error = 'Nama siswa kosong.';
      }

      parsed.push({
        nisn: rawNisn,
        nama: rawNama,
        valid,
        error: error || undefined
      });
    });

    setParsedImportRows(parsed);
    addToast('info', 'Data Terurai', `Berhasil menguraikan ${parsed.length} baris data.`);
  };

  const handleCommitImport = () => {
    if (parsedImportRows.length === 0) {
      addToast('error', 'Gagal', 'Belum ada data tervalidasi yang siap diimpor.');
      return;
    }

    if (!importClassId) {
      addToast('error', 'Pilih Kelas', 'Pilih kelas tujuan untuk seluruh siswa ini.');
      return;
    }

    const validRows = parsedImportRows.filter(r => r.valid);
    if (validRows.length === 0) {
      addToast('error', 'Gagal', 'Tidak ada baris data valid yang dapat disimpan.');
      return;
    }

    const newStudents: Student[] = validRows.map(row => ({
      id: 'std-' + Date.now() + Math.random().toString(36).substr(2, 4),
      nisn: row.nisn,
      nama: row.nama,
      kelas_id: importClassId
    }));

    const updatedStudents = [...students, ...newStudents];
    db.setStudents(updatedStudents);
    
    const activeUser = db.getSession()?.nama || 'Admin';
    const clsName = classes.find(c => c.id === importClassId)?.nama || 'Kelas';
    logAudit(activeUser, `Melakukan impor massal ${newStudents.length} siswa ke ${clsName}`);
    addToast('success', 'Impor Sukses', `Berhasil memasukkan ${newStudents.length} siswa ke ${clsName}.`);

    // Reset importer states
    setPasteData('');
    setParsedImportRows([]);
    setImportClassId('');
    setIsImportModalOpen(false);
    syncState();
  };

  const loadSampleTemplate = () => {
    setPasteData(
      "0018374920\tAhmad Fathoni\n" +
      "0019283741\tBalqis Syahira\n" +
      "0012938475\tCakra Baskara\n" +
      "0010928374\tDea Ananda\n" +
      "0017482930\tEdo Prasetyo"
    );
    addToast('info', 'Template Dimuat', 'Contoh data terisi ke kotak teks.');
  };

  // Filter & Search Logic for different lists
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const email = profiles.find(p => p.id === t.user_id)?.email || '';
      return t.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
             email.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [teachers, profiles, searchQuery]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nisn.includes(searchQuery);
      const matchClass = filterClass === 'all' || s.kelas_id === filterClass;
      return matchSearch && matchClass;
    });
  }, [students, searchQuery, filterClass]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => c.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classes, searchQuery]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [subjects, searchQuery]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const teacherName = teachers.find(t => t.id === a.teacher_id)?.nama || '';
      const className = classes.find(c => c.id === a.class_id)?.nama || '';
      const subjectName = subjects.find(s => s.id === a.subject_id)?.nama || '';
      const text = `${teacherName} ${className} ${subjectName}`.toLowerCase();
      return text.includes(searchQuery.toLowerCase());
    });
  }, [assignments, teachers, classes, subjects, searchQuery]);

  // --- Admin Rekapitulasi Ledger Calculator ---
  const rekapLedger = useMemo(() => {
    if (!activeClassId || !activeSubjectId) return { headers: { tps: [], scopes: [] }, rows: [] };
    
    const semId = context.semester?.id || 'sem-ganjil';
    const yrId = context.year?.id || 'th-2025';

    // Find all TPs and Scopes for active class + subject
    const subjectTps = tps.filter(t => t.class_id === activeClassId && t.subject_id === activeSubjectId);
    const subjectScopes = scopes.filter(sc => sc.class_id === activeClassId && sc.subject_id === activeSubjectId);

    // Get all students in the selected class
    const classStudents = students.filter(s => s.kelas_id === activeClassId);

    // Populate rows per student
    const rows = classStudents.map((student, index) => {
      // Find formative scores for each TP
      const studentTpsScores = subjectTps.map(tp => {
        const fScore = formativeScores.find(
          s => s.student_id === student.id && 
               s.tp_id === tp.id && 
               s.semester === semId && 
               s.tahun === yrId
        );
        return { tpId: tp.id, kode: tp.kode, nilai: fScore ? fScore.nilai : null };
      });

      // Calculate formative average
      const validTpsScores = studentTpsScores.filter(s => s.nilai !== null) as { tpId: string; kode: string; nilai: number }[];
      const formativeAverage = validTpsScores.length > 0
        ? Math.round(validTpsScores.reduce((sum, current) => sum + current.nilai, 0) / validTpsScores.length)
        : 0;

      // Find summative scope scores for each scope
      const studentScopeScores = subjectScopes.map(sc => {
        const sScore = summativeScores.find(
          s => s.student_id === student.id && 
               s.lingkup_id === sc.id && 
               s.semester === semId && 
               s.tahun === yrId
        );
        return { scopeId: sc.id, nama: sc.nama, nilai: sScore ? sScore.nilai : null };
      });

      // Calculate summative scope average
      const validScopeScores = studentScopeScores.filter(s => s.nilai !== null) as { scopeId: string; nama: string; nilai: number }[];
      const scopeAverage = validScopeScores.length > 0
        ? Math.round(validScopeScores.reduce((sum, current) => sum + current.nilai, 0) / validScopeScores.length)
        : 0;

      // Find Semester Score (SAS)
      const sasObj = semesterScores.find(
        s => s.student_id === student.id && 
             s.subject_id === activeSubjectId && 
             s.semester === semId && 
             s.tahun === yrId
      );
      const sasScore = sasObj ? sasObj.nilai : null;

      // Final Grade Calculation (Curriculum Merdeka weight standard: 40% Formatif, 40% Sumatif LM, 20% SAS)
      const finalScore = Math.round(
        (formativeAverage * 0.4) + 
        (scopeAverage * 0.4) + 
        ((sasScore || 0) * 0.2)
      );

      return {
        no: index + 1,
        studentId: student.id,
        nisn: student.nisn,
        nama: student.nama,
        tpsScores: studentTpsScores,
        formativeAverage,
        scopeScores: studentScopeScores,
        scopeAverage,
        sasScore,
        finalScore
      };
    }).filter(row => row.nama.toLowerCase().includes(searchQuery.toLowerCase()) || row.nisn.includes(searchQuery));

    return {
      headers: {
        tps: subjectTps,
        scopes: subjectScopes
      },
      rows
    };
  }, [activeClassId, activeSubjectId, students, tps, scopes, formativeScores, summativeScores, semesterScores, context, searchQuery]);

  // Excel CSV exporter
  const handleExportExcel = () => {
    const clsName = classes.find(c => c.id === activeClassId)?.nama || 'Kelas';
    const subName = subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel';
    const fileName = `Rekap_Nilai_${clsName}_${subName}_Semester_${context.semester?.nama || 'Ganjil'}`;

    // Standard headers
    const headers = ['No', 'NISN', 'Nama Siswa'];
    rekapLedger.headers.tps.forEach(tp => headers.push(tp.kode));
    headers.push('Rata Formatif');
    rekapLedger.headers.scopes.forEach((sc, idx) => headers.push(`LM ${idx + 1}`));
    headers.push('Rata Sumatif LM');
    headers.push('SAS');
    headers.push('Nilai Akhir');

    // Row construction
    const rows = rekapLedger.rows.map(row => {
      const cols = [row.no, row.nisn, row.nama];
      row.tpsScores.forEach(sc => cols.push(sc.nilai !== null ? sc.nilai : '-'));
      cols.push(row.formativeAverage);
      row.scopeScores.forEach(sc => cols.push(sc.nilai !== null ? sc.nilai : '-'));
      cols.push(row.scopeAverage);
      cols.push(row.sasScore !== null ? row.sasScore : '-');
      cols.push(row.finalScore);
      return cols;
    });

    // Semicolon-delimited CSV with UTF8 BOM and Excel explicit separator definition for perfect column separation
    const separator = ';';
    const content = [
      `sep=${separator}`,
      headers.join(separator),
      ...rows.map(row => row.map(val => {
        const stringVal = String(val === undefined || val === null ? '' : val);
        if (stringVal.includes(separator) || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(separator))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('success', 'Ekspor Excel Berhasil', `File CSV '${fileName}.csv' telah diunduh dengan pemisah kolom otomatis.`);
  };

  // Print report trigger (will print current Landscape A4 view)
  const handlePrint = () => {
    window.print();
    addToast('info', 'Mencetak Dokumen', 'Halaman cetak/PDF sistem operasi telah dibuka.');
  };

  // Paginated Slices
  const paginatedData = useMemo(() => {
    let currentSet: any[] = [];
    if (currentTab === 'guru') currentSet = filteredTeachers;
    else if (currentTab === 'kelas') currentSet = filteredClasses;
    else if (currentTab === 'siswa') currentSet = filteredStudents;
    else if (currentTab === 'subject') currentSet = filteredSubjects;
    else if (currentTab === 'assignment') currentSet = filteredAssignments;
    else if (currentTab === 'academic-year') currentSet = academicYears;
    else if (currentTab === 'semester') currentSet = semesters;
    else if (currentTab === 'logs') {
      currentSet = auditLogs.filter(l => {
        const cat = getLogCategory(l.action);
        if (!cat) return false;
        if (selectedLogType === 'all') return true;
        return cat.type === selectedLogType;
      });
    }

    // Sorting implementation
    if (sortField) {
      currentSet = [...currentSet].sort((a: any, b: any) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    return {
      data: currentSet.slice(startIndex, startIndex + itemsPerPage),
      totalItems: currentSet.length,
      totalPages: Math.ceil(currentSet.length / itemsPerPage) || 1
    };
  }, [currentTab, filteredTeachers, filteredClasses, filteredStudents, filteredSubjects, filteredAssignments, academicYears, semesters, auditLogs, sortField, sortDirection, currentPage, selectedLogType]);


  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      {currentTab !== 'logs' && currentTab !== 'dashboard' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center no-print">
          <div className="relative w-full md:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all"
              placeholder={`Cari ${currentTab === 'guru' ? 'guru...' : currentTab === 'siswa' ? 'siswa...' : 'data...'}`}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            {/* Filter Class only for Student Tab */}
            {currentTab === 'siswa' && (
              <select
                value={filterClass}
                onChange={(e) => { setFilterClass(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                <option value="all">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            )}

            {/* Quick Action Buttons */}
            {currentTab === 'siswa' && (
              <button
                onClick={() => {
                  setParsedImportRows([]);
                  setPasteData('');
                  setImportClassId('');
                  setIsImportModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all rounded-xl shadow-sm border border-slate-200"
              >
                <Upload className="w-4 h-4" />
                Impor Massal (Excel)
              </button>
            )}

            <button
              onClick={() => {
                if (currentTab === 'guru') openModal('add', 'teacher');
                else if (currentTab === 'kelas') openModal('add', 'class');
                else if (currentTab === 'siswa') openModal('add', 'student', '', { kelas_id: classes[0]?.id || '' });
                else if (currentTab === 'subject') openModal('add', 'subject');
                else if (currentTab === 'assignment') openModal('add', 'assignment', '', { teacher_id: teachers[0]?.id || '', class_id: classes[0]?.id || '', subject_id: subjects[0]?.id || '' });
                else if (currentTab === 'academic-year') openModal('add', 'academicYear', '', { aktif: 'false' });
                else if (currentTab === 'semester') openModal('add', 'semester', '', { aktif: 'false' });
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-md shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              Tambah Data
            </button>
          </div>
        </div>
      )}

      {/* --- GURU PANEL --- */}
      {currentTab === 'guru' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th onClick={() => handleSort('nama')} className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Nama Guru <ArrowUpDown className="w-3.5 h-3.5" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Email Akun</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Role Hak Akses</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Tidak ada guru ditemukan.</td>
                  </tr>
                ) : (
                  paginatedData.data.map((t: Teacher) => {
                    const prof = profiles.find(p => p.id === t.user_id);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{t.nama}</td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">{prof?.email || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {prof?.role || 'Guru'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openModal('reset-pass', 'teacher', prof?.id || '')}
                              title="Reset Password"
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all rounded-xl"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('edit', 'teacher', t.id, { nama: t.nama, email: prof?.email || '' })}
                              title="Ubah Profil"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('delete', 'teacher', t.id)}
                              title="Hapus Guru"
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {paginatedData.totalItems > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">Menampilkan {paginatedData.data.length} dari {paginatedData.totalItems} guru.</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-3">{currentPage} / {paginatedData.totalPages}</span>
                <button
                  disabled={currentPage === paginatedData.totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- KELAS PANEL --- */}
      {currentTab === 'kelas' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th onClick={() => handleSort('nama')} className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Nama Kelas <ArrowUpDown className="w-3.5 h-3.5" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Jumlah Siswa</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.data.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-slate-400 text-sm">Tidak ada kelas ditemukan.</td>
                  </tr>
                ) : (
                  paginatedData.data.map((c: Class) => {
                    const studentCount = students.filter(s => s.kelas_id === c.id).length;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{c.nama}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">{studentCount} Siswa</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openModal('edit', 'class', c.id, { nama: c.nama })}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('delete', 'class', c.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {paginatedData.totalItems > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">Menampilkan {paginatedData.data.length} dari {paginatedData.totalItems} kelas.</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-3">{currentPage} / {paginatedData.totalPages}</span>
                <button
                  disabled={currentPage === paginatedData.totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SISWA PANEL --- */}
      {currentTab === 'siswa' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th onClick={() => handleSort('nisn')} className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">NISN <ArrowUpDown className="w-3.5 h-3.5" /></div>
                  </th>
                  <th onClick={() => handleSort('nama')} className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Nama Lengkap <ArrowUpDown className="w-3.5 h-3.5" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Kelas</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Tidak ada siswa ditemukan.</td>
                  </tr>
                ) : (
                  paginatedData.data.map((s: Student) => {
                    const clsName = classes.find(c => c.id === s.kelas_id)?.nama || 'Tidak diketahui';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-slate-600">{s.nisn}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{s.nama}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{clsName}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openModal('edit', 'student', s.id, { nisn: s.nisn, nama: s.nama, kelas_id: s.kelas_id })}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('delete', 'student', s.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {paginatedData.totalItems > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">Menampilkan {paginatedData.data.length} dari {paginatedData.totalItems} siswa.</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-3">{currentPage} / {paginatedData.totalPages}</span>
                <button
                  disabled={currentPage === paginatedData.totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MATA PELAJARAN PANEL --- */}
      {currentTab === 'subject' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th onClick={() => handleSort('nama')} className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Nama Mata Pelajaran <ArrowUpDown className="w-3.5 h-3.5" /></div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.data.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-10 text-slate-400 text-sm">Tidak ada mata pelajaran ditemukan.</td>
                  </tr>
                ) : (
                  paginatedData.data.map((s: Subject) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">{s.nama}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal('edit', 'subject', s.id, { nama: s.nama })}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('delete', 'subject', s.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {paginatedData.totalItems > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">Menampilkan {paginatedData.data.length} dari {paginatedData.totalItems} mapel.</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-3">{currentPage} / {paginatedData.totalPages}</span>
                <button
                  disabled={currentPage === paginatedData.totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- PENUGASAN GURU --- */}
      {currentTab === 'assignment' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Guru Pengampu</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Kelas Ampuan</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Belum ada penugasan mengajar guru.</td>
                  </tr>
                ) : (
                  paginatedData.data.map((a: TeacherAssignment) => {
                    const teacher = teachers.find(t => t.id === a.teacher_id);
                    const cls = classes.find(c => c.id === a.class_id);
                    const sub = subjects.find(s => s.id === a.subject_id);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{teacher?.nama || 'Guru terhapus'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{cls?.nama || 'Kelas terhapus'}</td>
                        <td className="px-6 py-4 text-sm text-indigo-700">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 border border-indigo-100">
                            {sub?.nama || 'Mapel terhapus'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openModal('delete', 'assignment', a.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {paginatedData.totalItems > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500">Menampilkan {paginatedData.data.length} dari {paginatedData.totalItems} penugasan.</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-3">{currentPage} / {paginatedData.totalPages}</span>
                <button
                  disabled={currentPage === paginatedData.totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAHUN PELAJARAN PANEL --- */}
      {currentTab === 'academic-year' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Tahun Pelajaran</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Status Aktif</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {academicYears.map((y: AcademicYear) => (
                  <tr key={y.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{y.nama}</td>
                    <td className="px-6 py-4 text-sm">
                      {y.aktif ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Aktif Berjalan</span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-50 text-slate-400 border border-slate-100">Tidak Aktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openModal('edit', 'academicYear', y.id, { nama: y.nama, aktif: y.aktif ? 'true' : 'false' })}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('delete', 'academicYear', y.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SEMESTER PANEL --- */}
      {currentTab === 'semester' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Semester</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Status Aktif</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {semesters.map((s: Semester) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{s.nama}</td>
                    <td className="px-6 py-4 text-sm">
                      {s.aktif ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Aktif Berjalan</span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-50 text-slate-400 border border-slate-100">Tidak Aktif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openModal('edit', 'semester', s.id, { nama: s.nama, aktif: s.aktif ? 'true' : 'false' })}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('delete', 'semester', s.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- AUDIT LOGS --- */}
      {currentTab === 'logs' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-800">Log Aktivitas Guru</h3>
              <p className="text-xs text-slate-500 mt-1">Audit terpusat aktivitas pengisian TP, lingkup materi, dan penilaian nilai siswa.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => { setSelectedLogType('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  selectedLogType === 'all'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-sm shadow-slate-100'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => { setSelectedLogType('tp'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  selectedLogType === 'tp'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-105'
                    : 'bg-white border-slate-200 text-indigo-700 hover:bg-indigo-50/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Input TP
              </button>
              <button
                type="button"
                onClick={() => { setSelectedLogType('lm'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  selectedLogType === 'lm'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-sm shadow-amber-105'
                    : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Input Lingkup Materi
              </button>
              <button
                type="button"
                onClick={() => { setSelectedLogType('nilai'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  selectedLogType === 'nilai'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-105'
                    : 'bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50/50'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Input Nilai
              </button>
              
              <div className="w-[1px] h-5 bg-slate-200 mx-1 hidden sm:block" />

              <button
                onClick={() => { setAuditLogs(db.getAuditLogs()); setCurrentPage(1); }}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all rounded-xl flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white"
                title="Segarkan Log"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider w-48">Waktu Kejadian</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider w-64">Nama Guru / Pengguna</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Aktivitas / Perubahan Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.data.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center text-slate-450">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100">
                          <History className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Tidak ada riwayat ditemukan</p>
                        <p className="text-xs text-slate-500 mt-1">Belum ada aktivitas guru dalam kategori ini yang terekam di sistem.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.data.map((l: AuditLog) => {
                    const cat = getLogCategory(l.action);
                    const isTP = cat?.type === 'tp';
                    const isLM = cat?.type === 'lm';
                    const isNilai = cat?.type === 'nilai';
                    
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 text-xs font-medium font-mono">
                          {new Date(l.timestamp).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs uppercase border border-slate-200">
                              {l.user ? l.user.substring(0, 2) : 'GR'}
                            </div>
                            <span className="text-slate-800 font-bold text-sm">{l.user}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${cat?.color || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                              {isTP && <BookOpen className="w-3 h-3" />}
                              {isLM && <Layers className="w-3 h-3" />}
                              {isNilai && <GraduationCap className="w-3 h-3" />}
                              {cat?.label || 'Aktivitas'}
                            </span>
                            <span className="text-slate-750 text-xs font-semibold leading-relaxed">{l.action}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {paginatedData.totalItems > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 no-print">
              <span className="text-xs text-slate-500 font-medium">Menampilkan {paginatedData.data.length} dari {paginatedData.totalItems} baris audit.</span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700 px-3">{currentPage} / {paginatedData.totalPages}</span>
                <button
                  disabled={currentPage === paginatedData.totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- PROFILE ADMINISTRATOR VIEW --- */}
      {currentTab === 'profil' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm max-w-xl mx-auto">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Pengaturan Profil & Sandi Admin</h3>
              <p className="text-xs text-slate-500 mt-0.5">Kelola nama dan kata sandi akun Administrator Anda.</p>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Alamat Email (Akun Login)</label>
              <input
                type="text"
                disabled
                value={db.getSession()?.email || ''}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-sm font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Email akun dikonfigurasi sebagai Administrator sekolah.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Lengkap Administrator</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold"
                placeholder="Administrator Utama"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ubah Sandi Baru (Opsional)</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={profilePass}
                  onChange={(e) => setProfilePass(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-mono"
                  placeholder="Isi jika ingin merubah kata sandi..."
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-lg shadow-indigo-100"
              >
                <Save className="w-4 h-4" />
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- REKAPITULASI LEDGER ADMINISTRATOR --- */}
      {currentTab === 'rekap' && (
        <div className="space-y-6">
          {/* FILTER PANEL FOR ADMIN (Select ANY Class and ANY Subject) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
            <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Kelas</label>
                <select
                  value={activeClassId}
                  onChange={(e) => { setActiveClassId(e.target.value); syncState(); }}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
                >
                  <option value="" disabled>-- Pilih Kelas --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Mata Pelajaran</label>
                <select
                  value={activeSubjectId}
                  onChange={(e) => { setActiveSubjectId(e.target.value); syncState(); }}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium"
                >
                  <option value="" disabled>-- Pilih Mapel --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleExportExcel}
                disabled={rekapLedger.rows.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 font-semibold rounded-xl text-xs transition-all disabled:opacity-50 disabled:pointer-events-none bg-white cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Ekspor Excel
              </button>
              <button
                onClick={handlePrint}
                disabled={rekapLedger.rows.length === 0}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Ledger
              </button>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm print-container print-break-inside-avoid">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between no-print">
              <div>
                <h3 className="text-base font-bold text-slate-800">Lembar Rekapitulasi Nilai Siswa (Seluruh Kelas)</h3>
                <p className="text-xs text-slate-500 mt-1">Sistem administrator memantau seluruh nilai formatif, sumatif lingkup materi, dan ujian akhir semester.</p>
              </div>
              
              <div className="relative w-full md:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all"
                  placeholder="Cari siswa..."
                />
              </div>
            </div>

            {/* Printable Header (Visible only when printed) */}
            <div className="hidden print-only p-6 text-center border-b border-slate-200 mb-6">
              <h2 className="text-xl font-bold uppercase tracking-wide text-black">Rekapitulasi Nilai Peserta Didik SD</h2>
              <p className="text-xs text-slate-600 mt-1">Kurikulum Merdeka Belajar • Tahun Pelajaran {context.year?.nama || '2025/2026'} ({context.semester?.nama || 'Ganjil'})</p>
              <div className="grid grid-cols-2 text-left text-xs max-w-sm mx-auto mt-4 font-mono">
                <span>Kelas: {classes.find(c => c.id === activeClassId)?.nama || '-'}</span>
                <span>Administrator Sekolah</span>
                <span>Mata Pelajaran: {subjects.find(s => s.id === activeSubjectId)?.nama || '-'}</span>
                <span>Dicetak Pada: {new Date().toLocaleDateString('id-ID')}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-12 text-center">No</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-28">NISN</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[160px]">Nama Siswa</th>
                    
                    {/* Dynamic TP Columns */}
                    {rekapLedger.headers.tps.map(tp => (
                      <th key={tp.id} className="px-2 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center bg-slate-50/20" title={tp.deskripsi}>
                        {tp.kode}
                      </th>
                    ))}
                    
                    <th className="px-3 py-3 text-xs font-bold text-indigo-600 uppercase tracking-wider text-center bg-indigo-50/40">Rata Formatif</th>
                    
                    {/* Dynamic Scope Columns */}
                    {rekapLedger.headers.scopes.map((sc, i) => (
                      <th key={sc.id} className="px-2 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center bg-slate-50/20" title={sc.nama}>
                        LM {i + 1}
                      </th>
                    ))}

                    <th className="px-3 py-3 text-xs font-bold text-indigo-600 uppercase tracking-wider text-center bg-indigo-50/40">Rata Sumatif LM</th>
                    <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50">SAS</th>
                    <th className="px-4 py-3 text-xs font-bold text-indigo-800 uppercase tracking-wider text-center bg-indigo-100/50 font-display">Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekapLedger.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6 + rekapLedger.headers.tps.length + rekapLedger.headers.scopes.length} className="text-center py-10 text-slate-400 text-xs font-semibold">
                        Belum ada siswa atau data nilai terinput untuk kelas dan mapel ini.
                      </td>
                    </tr>
                  ) : (
                    rekapLedger.rows.map((row) => (
                      <tr key={row.studentId} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-4 py-3.5 text-xs text-center font-mono text-slate-400">{row.no}</td>
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{row.nisn}</td>
                        <td className="px-4 py-3.5 text-xs font-bold text-slate-850">{row.nama}</td>
                        
                        {/* Formatives */}
                        {row.tpsScores.map(score => (
                          <td key={score.tpId} className="px-2 py-3.5 text-xs font-mono font-semibold text-center text-slate-600">
                            {score.nilai !== null ? score.nilai : '-'}
                          </td>
                        ))}

                        <td className="px-3 py-3.5 text-xs font-mono font-bold text-center text-indigo-700 bg-indigo-50/20">
                          {row.formativeAverage}
                        </td>

                        {/* Summative Scopes */}
                        {row.scopeScores.map(score => (
                          <td key={score.scopeId} className="px-2 py-3.5 text-xs font-mono font-semibold text-center text-slate-600">
                            {score.nilai !== null ? score.nilai : '-'}
                          </td>
                        ))}

                        <td className="px-3 py-3.5 text-xs font-mono font-bold text-center text-indigo-700 bg-indigo-50/20">
                          {row.scopeAverage}
                        </td>

                        {/* SAS */}
                        <td className="px-3 py-3.5 text-xs font-mono font-bold text-center text-slate-700 bg-slate-50/30">
                          {row.sasScore !== null ? row.sasScore : '-'}
                        </td>

                        {/* Final Combined Grade */}
                        <td className="px-4 py-3.5 text-xs font-mono font-bold text-center bg-indigo-100/20 text-slate-900 border-l border-slate-100">
                          <span className={`px-2 py-0.5 rounded ${row.finalScore >= 75 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                            {row.finalScore}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Tanda Tangan Guru Pengampu & Kepala Sekolah (Indonesian Signature Block) */}
            <div className="mt-12 px-8 pb-8 flex flex-row justify-between items-start text-xs font-sans">
              {/* Left Column: Kepala Sekolah */}
              <div className="flex flex-col text-left">
                <p className="text-slate-400 dark:text-slate-500 print:text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black text-sm mt-0.5">Kepala Sekolah</p>
                
                {/* Space for stamp/signature */}
                <div className="h-24 flex items-center">
                  <div className="text-[10px] italic text-slate-300 dark:text-slate-700 print:hidden select-none font-mono">
                    ( Tanda Tangan & Stempel )
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <input
                    type="text"
                    value={kepsekName}
                    onChange={(e) => handleKepsekNameChange(e.target.value)}
                    className="font-bold text-slate-800 dark:text-slate-200 print:text-black border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-none pb-0.5 min-w-[200px] print:border-none bg-transparent"
                    placeholder="Nama Kepala Sekolah"
                  />
                  <div className="flex items-center gap-1 mt-1 print:mt-0.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">NIP.</span>
                    <input
                      type="text"
                      value={kepsekNip}
                      onChange={(e) => handleKepsekNipChange(e.target.value)}
                      className="text-[10px] text-slate-600 dark:text-slate-400 print:text-black font-mono border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-none min-w-[160px] print:border-none bg-transparent"
                      placeholder="NIP Kepala Sekolah"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Guru Kelas/Mapel */}
              <div className="flex flex-col text-right items-end">
                <input
                  type="text"
                  value={signaturePlaceAndDate}
                  onChange={(e) => handleSignatureDateChange(e.target.value)}
                  className="text-slate-500 dark:text-slate-400 print:text-black border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-none pb-0.5 text-right font-sans text-xs min-w-[200px] print:border-none bg-transparent"
                  placeholder="Tempat, Tanggal"
                />
                <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black text-sm mt-0.5">Guru Kelas/Mapel</p>
                
                {/* Space for Signature */}
                <div className="h-24 flex items-center justify-end">
                  <div className="text-[10px] italic text-indigo-400/80 dark:text-indigo-500/50 print:hidden select-none font-mono tracking-wider rotate-[-2deg] border border-dashed border-indigo-200/50 dark:border-indigo-900/40 px-3 py-1 rounded">
                    ( Tanda Tangan Basah )
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <input
                    type="text"
                    value={customTeacherName}
                    onChange={(e) => handleCustomTeacherNameChange(e.target.value)}
                    className="font-bold text-indigo-600 dark:text-indigo-400 print:text-black border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-none pb-0.5 text-right min-w-[200px] print:border-none bg-transparent"
                    placeholder="Nama Guru"
                  />
                  <div className="flex items-center gap-1 mt-1 print:mt-0.5 justify-end">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">NIP.</span>
                    <input
                      type="text"
                      value={teacherNip}
                      onChange={(e) => handleTeacherNipChange(e.target.value)}
                      className="text-[10px] text-slate-600 dark:text-slate-400 print:text-black font-mono border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-none text-right min-w-[160px] print:border-none bg-transparent"
                      placeholder="NIP Guru"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* --- DIALOG MODALS --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={
          modalType === 'delete' ? 'Konfirmasi Hapus Data' :
          modalType === 'reset-pass' ? 'Reset Kata Sandi Akun' :
          modalType === 'add' ? `Tambah Data ${targetEntity === 'teacher' ? 'Guru' : targetEntity === 'class' ? 'Kelas' : targetEntity === 'student' ? 'Siswa' : targetEntity === 'subject' ? 'Mapel' : targetEntity === 'assignment' ? 'Penugasan' : 'Konfigurasi'}` :
          `Ubah Data ${targetEntity === 'teacher' ? 'Guru' : targetEntity === 'class' ? 'Kelas' : targetEntity === 'student' ? 'Siswa' : targetEntity === 'subject' ? 'Mapel' : 'Konfigurasi'}`
        }
      >
        {modalType === 'delete' ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data ini secara permanen? Tindakan ini tidak dapat dibatalkan dan semua riwayat terkait mungkin akan ikut terhapus atau disesuaikan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleFormSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        ) : modalType === 'reset-pass' ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Kata sandi untuk guru terpilih akan dikembalikan ke pengaturan awal pabrik yaitu: <strong className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">guru123</strong>. Guru dapat menggunakannya kembali untuk login pertama kali.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleFormSubmit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Ya, Reset Sandi
              </button>
            </div>
          </div>
        ) : (
          /* Create or Edit Form */
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {targetEntity === 'teacher' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Guru Lengkap beserta Gelar</label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm"
                    placeholder="Budi Santoso, S.Pd."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Email Akun (Gunakan untuk Login)</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-mono"
                    placeholder="nama@sekolah.sch.id"
                  />
                </div>
              </>
            )}

            {targetEntity === 'class' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Kelas</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm"
                  placeholder="Kelas 4-A"
                />
              </div>
            )}

            {targetEntity === 'subject' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={formData.nama || ''}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm"
                  placeholder="Pendidikan Jasmani & Kesehatan"
                />
              </div>
            )}

            {targetEntity === 'student' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">NISN (10 Digit Angka)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.nisn || ''}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-mono"
                    placeholder="0014567891"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm"
                    placeholder="Muhammad Akbar"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Pilih Kelas</label>
                  <select
                    value={formData.kelas_id || ''}
                    onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {targetEntity === 'assignment' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Pilih Guru Pengampu</label>
                  <select
                    value={formData.teacher_id || ''}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Pilih Kelas</label>
                  <select
                    value={formData.class_id || ''}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Pilih Mata Pelajaran</label>
                  <select
                    value={formData.subject_id || ''}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.nama}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {targetEntity === 'academicYear' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Tahun Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-mono"
                    placeholder="2026/2027"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Status Aktif Berjalan</label>
                  <select
                    value={formData.aktif || 'false'}
                    onChange={(e) => setFormData({ ...formData, aktif: e.target.value === 'true' })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Tidak Aktif</option>
                  </select>
                </div>
              </>
            )}

            {targetEntity === 'semester' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Semester</label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm"
                    placeholder="Ganjil"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Status Aktif Berjalan</label>
                  <select
                    value={formData.aktif || 'false'}
                    onChange={(e) => setFormData({ ...formData, aktif: e.target.value === 'true' })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Tidak Aktif</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={closeModal}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* --- MASS EXCEL/CSV IMPORTER MODAL --- */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Impor Massal Data Siswa (Salin Tempel dari Excel)"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Guru SD umumnya memiliki berkas nilai dalam Microsoft Excel. Fitur ini memungkinkan Anda menyalin 2 kolom data di Excel yaitu <strong className="text-indigo-600">NISN (10 digit)</strong> dan <strong className="text-indigo-600">Nama Lengkap</strong>, lalu menempelkannya ke kotak di bawah secara langsung.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">1. Pilih Kelas Tujuan</label>
              <select
                value={importClassId}
                onChange={(e) => setImportClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm bg-white"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={loadSampleTemplate}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Gunakan Contoh Template
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">2. Tempel Data Excel (Kolom NISN & Nama)</label>
            <textarea
              rows={6}
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-xs font-mono placeholder:text-slate-400"
              placeholder="0014567891&#9;Aditya Pratama&#10;0014567892&#9;Amanda Putri"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Pemisah baris otomatis dideteksi dari Tabulator Excel atau Koma.</span>
            <button
              type="button"
              onClick={handleParseImport}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all"
            >
              Urai & Validasi Data
            </button>
          </div>

          {/* Parsed Rows Preview */}
          {parsedImportRows.length > 0 && (
            <div className="border border-slate-150 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-150 flex justify-between items-center text-xs font-semibold text-slate-500">
                <span>Hasil Penguraian Data ({parsedImportRows.length} baris)</span>
                <span className="text-emerald-600">{parsedImportRows.filter(r => r.valid).length} Valid</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-150">
                    <th className="px-3 py-1.5 text-slate-500 font-semibold">NISN</th>
                    <th className="px-3 py-1.5 text-slate-500 font-semibold">Nama Lengkap</th>
                    <th className="px-3 py-1.5 text-slate-500 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {parsedImportRows.map((row, i) => (
                    <tr key={i} className={row.valid ? 'bg-emerald-50/20' : 'bg-rose-50/20'}>
                      <td className="px-3 py-1.5 text-slate-600">{row.nisn || '-'}</td>
                      <td className="px-3 py-1.5 font-sans font-medium text-slate-800">{row.nama}</td>
                      <td className="px-3 py-1.5">
                        {row.valid ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center gap-1" title={row.error}>
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Gagal ({row.error})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button 
              type="button"
              disabled={parsedImportRows.filter(r => r.valid).length === 0 || !importClassId}
              onClick={handleCommitImport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Masukkan {parsedImportRows.filter(r => r.valid).length} Siswa Baru
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
