import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  db, logAudit, getActiveContext, getTeacherForUser, 
  getTeacherAssignedClassesAndSubjects, saveFormativeGrades, 
  saveSummativeScopeGrades, saveSemesterGrades 
} from '../db';
import { 
  LearningObjective, MaterialScope, Student, FormativeScore, 
  SummativeScopeScore, SemesterScore, Class, Subject 
} from '../types';
import { Modal } from './Modal';
import { 
  BookOpen, Layers, Plus, Edit, Trash2, Save, Sparkles, Check, 
  FileSpreadsheet, Printer, FileText, Search, User, Lock, Eye, EyeOff
} from 'lucide-react';

interface GuruModulesProps {
  currentTab: string;
  addToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
  onRefreshStats: () => void;
}

export const GuruModules: React.FC<GuruModulesProps> = ({ currentTab, addToast, onRefreshStats }) => {
  const session = db.getSession();
  const teacher = useMemo(() => session ? getTeacherForUser(session.id) : null, [session]);

  // If no teacher mapping exists, we can still allow them to view or we fallback
  const assigned = useMemo(() => {
    if (!teacher) return { assignments: [], classes: [], subjects: [] };
    return getTeacherAssignedClassesAndSubjects(teacher.id);
  }, [teacher]);

  // Base entities state
  const [tps, setTps] = useState<LearningObjective[]>(() => db.getLearningObjectives());
  const [scopes, setScopes] = useState<MaterialScope[]>(() => db.getMaterialScopes());
  const [students, setStudents] = useState<Student[]>(() => db.getStudents());
  const [formativeScores, setFormativeScores] = useState<FormativeScore[]>(() => db.getFormativeScores());
  const [summativeScores, setSummativeScores] = useState<SummativeScopeScore[]>(() => db.getSummativeScopeScores());
  const [semesterScores, setSemesterScores] = useState<SemesterScore[]>(() => db.getSemesterScores());

  // Current active Context (Year & Semester)
  const context = useMemo(() => getActiveContext(), []);

  // Sync state helpers
  const syncState = () => {
    setTps(db.getLearningObjectives());
    setScopes(db.getMaterialScopes());
    setStudents(db.getStudents());
    setFormativeScores(db.getFormativeScores());
    setSummativeScores(db.getSummativeScopeScores());
    setSemesterScores(db.getSemesterScores());
    onRefreshStats();
  };

  // State for forms & modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete'>('add');
  const [targetEntity, setTargetEntity] = useState<string>(''); // 'tp' or 'scope'
  const [selectedId, setSelectedId] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  // Filters for input modules & grade entries
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [activeTpId, setActiveTpId] = useState<string>('');
  const [activeScopeId, setActiveScopeId] = useState<string>('');

  // Auto-Save notification states
  const [savingStates, setSavingStates] = useState<{ [studentId: string]: 'idle' | 'saving' | 'saved' }>({});

  // Local grades state to keep inputs completely responsive and stable
  const [localGrades, setLocalGrades] = useState<Record<string, string>>({});
  const saveTimeouts = useRef<Record<string, any>>({});

  useEffect(() => {
    const newGrades: Record<string, string> = {};
    const semId = context.semester?.id || '';
    const yrId = context.year?.id || '';

    if (currentTab === 'formative') {
      if (activeTpId) {
        formativeScores.forEach(s => {
          if (s.tp_id === activeTpId && s.semester === semId && s.tahun === yrId) {
            newGrades[s.student_id] = String(s.nilai);
          }
        });
      }
    } else if (currentTab === 'summative-scope') {
      if (activeScopeId) {
        summativeScores.forEach(s => {
          if (s.lingkup_id === activeScopeId && s.semester === semId && s.tahun === yrId) {
            newGrades[s.student_id] = String(s.nilai);
          }
        });
      }
    } else if (currentTab === 'sas') {
      if (activeSubjectId) {
        semesterScores.forEach(s => {
          if (s.subject_id === activeSubjectId && s.semester === semId && s.tahun === yrId) {
            newGrades[s.student_id] = String(s.nilai);
          }
        });
      }
    }
    setLocalGrades(newGrades);
  }, [
    currentTab, 
    activeTpId, 
    activeScopeId, 
    activeSubjectId, 
    formativeScores, 
    summativeScores, 
    semesterScores, 
    context.semester?.id, 
    context.year?.id
  ]);

  // Profile Change State
  const [profileName, setProfileName] = useState(session?.nama || '');
  const [profilePass, setProfilePass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Search filter for lists & Rekapitulasi table
  const [searchQuery, setSearchQuery] = useState('');

  // Editable Signature Information (stored in localStorage for convenience/durability)
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
    return localStorage.getItem('rekap_teacher_name') || session?.nama || 'Guru Kelas/Mapel';
  });
  const [teacherNip, setTeacherNip] = useState<string>(() => {
    return localStorage.getItem('rekap_teacher_nip') || '19891204 201504 2 003';
  });

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

  // Set default filters based on assigned classes and subjects
  useEffect(() => {
    if (assigned.classes.length > 0 && !activeClassId) {
      setActiveClassId(assigned.classes[0].id);
    }
    if (assigned.subjects.length > 0 && !activeSubjectId) {
      setActiveSubjectId(assigned.subjects[0].id);
    }
  }, [assigned, activeClassId, activeSubjectId]);

  // Filter students based on active class
  const filteredStudents = useMemo(() => {
    if (!activeClassId) return [];
    return students.filter(s => s.kelas_id === activeClassId);
  }, [students, activeClassId]);

  // List of TPs for active class & subject
  const activeTps = useMemo(() => {
    if (!activeClassId || !activeSubjectId) return [];
    return tps.filter(tp => tp.class_id === activeClassId && tp.subject_id === activeSubjectId);
  }, [tps, activeClassId, activeSubjectId]);

  // Auto-select active TP when activeTps list changes
  useEffect(() => {
    if (activeTps.length > 0) {
      const isValid = activeTps.some(tp => tp.id === activeTpId);
      if (!activeTpId || !isValid) {
        setActiveTpId(activeTps[0].id);
      }
    } else {
      if (activeTpId !== '') {
        setActiveTpId('');
      }
    }
  }, [activeTps, activeTpId]);

  // List of Scopes for active class & subject
  const activeScopes = useMemo(() => {
    if (!activeClassId || !activeSubjectId) return [];
    return scopes.filter(sc => sc.class_id === activeClassId && sc.subject_id === activeSubjectId);
  }, [scopes, activeClassId, activeSubjectId]);

  // Auto-select active Scope when activeScopes list changes
  useEffect(() => {
    if (activeScopes.length > 0) {
      const isValid = activeScopes.some(sc => sc.id === activeScopeId);
      if (!activeScopeId || !isValid) {
        setActiveScopeId(activeScopes[0].id);
      }
    } else {
      if (activeScopeId !== '') {
        setActiveScopeId('');
      }
    }
  }, [activeScopes, activeScopeId]);

  // Open / Close modal helpers
  const openModal = (type: 'add' | 'edit' | 'delete', entity: string, id: string = '', initialData: any = {}) => {
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

  // Submit CRUD for TP & Material Scopes
  const handleCrudSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (modalType === 'delete') {
      if (targetEntity === 'tp') {
        const item = tps.find(x => x.id === selectedId);
        if (item) {
          const updated = tps.filter(x => x.id !== selectedId);
          db.setLearningObjectives(updated);
          
          // Clean up scores linked to this TP
          const updatedScores = formativeScores.filter(s => s.tp_id !== selectedId);
          db.setFormativeScores(updatedScores);

          logAudit(session.nama, `Menghapus TP: ${item.kode} - ${item.deskripsi.substring(0, 30)}...`);
          addToast('success', 'TP Dihapus', 'Tujuan Pembelajaran berhasil dihapus beserta seluruh nilainya.');
        }
      } else if (targetEntity === 'scope') {
        const item = scopes.find(x => x.id === selectedId);
        if (item) {
          const updated = scopes.filter(x => x.id !== selectedId);
          db.setMaterialScopes(updated);

          // Clean up summatives linked to this scope
          const updatedSumScores = summativeScores.filter(s => s.lingkup_id !== selectedId);
          db.setSummativeScopeScores(updatedSumScores);

          logAudit(session.nama, `Menghapus Lingkup Materi: ${item.nama}`);
          addToast('success', 'Lingkup Materi Dihapus', 'Lingkup materi berhasil dihapus.');
        }
      }

      syncState();
      closeModal();
      return;
    }

    // Add and Edit for TP & Material Scope
    if (targetEntity === 'tp') {
      const classId = formData.class_id;
      const subjectId = formData.subject_id;
      const code = formData.kode?.trim();
      const desc = formData.deskripsi?.trim();

      if (!classId || !subjectId || !code || !desc) {
        addToast('error', 'Validasi Gagal', 'Harap isi semua kolom formulir.');
        return;
      }

      if (modalType === 'add') {
        // Check duplicate code in same class + subject
        const duplicate = tps.some(tp => tp.class_id === classId && tp.subject_id === subjectId && tp.kode.toLowerCase() === code.toLowerCase());
        if (duplicate) {
          addToast('error', 'Kode Duplikat', `Kode ${code} sudah digunakan di mata pelajaran dan kelas terpilih.`);
          return;
        }

        const newTp: LearningObjective = {
          id: 'tp-' + Date.now(),
          class_id: classId,
          subject_id: subjectId,
          kode: code,
          deskripsi: desc
        };

        db.setLearningObjectives([...tps, newTp]);
        logAudit(session.nama, `Membuat TP Baru: ${code} - ${desc.substring(0, 40)}`);
        addToast('success', 'TP Ditambahkan', `Tujuan Pembelajaran ${code} berhasil disimpan.`);
      } else {
        const otherTps = tps.filter(tp => tp.id !== selectedId);
        const duplicate = otherTps.some(tp => tp.class_id === classId && tp.subject_id === subjectId && tp.kode.toLowerCase() === code.toLowerCase());
        if (duplicate) {
          addToast('error', 'Kode Duplikat', `Kode ${code} sudah terdaftar.`);
          return;
        }

        const updated = tps.map(tp => tp.id === selectedId ? { ...tp, class_id: classId, subject_id: subjectId, kode: code, deskripsi: desc } : tp);
        db.setLearningObjectives(updated);
        logAudit(session.nama, `Mengubah TP: ${code}`);
        addToast('success', 'TP Diperbarui', `Tujuan Pembelajaran ${code} berhasil diubah.`);
      }
    } 

    else if (targetEntity === 'scope') {
      const classId = formData.class_id;
      const subjectId = formData.subject_id;
      const name = formData.nama?.trim();

      if (!classId || !subjectId || !name) {
        addToast('error', 'Validasi Gagal', 'Harap isi semua kolom formulir.');
        return;
      }

      if (modalType === 'add') {
        const duplicate = scopes.some(sc => sc.class_id === classId && sc.subject_id === subjectId && sc.nama.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          addToast('error', 'Nama Duplikat', 'Lingkup Materi tersebut sudah terdaftar.');
          return;
        }

        const newScope: MaterialScope = {
          id: 'sc-' + Date.now(),
          class_id: classId,
          subject_id: subjectId,
          nama: name
        };

        db.setMaterialScopes([...scopes, newScope]);
        logAudit(session.nama, `Membuat Lingkup Materi Baru: ${name}`);
        addToast('success', 'Lingkup Materi Disimpan', `Lingkup materi berhasil ditambahkan.`);
      } else {
        const otherScopes = scopes.filter(sc => sc.id !== selectedId);
        const duplicate = otherScopes.some(sc => sc.class_id === classId && sc.subject_id === subjectId && sc.nama.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          addToast('error', 'Nama Duplikat', 'Lingkup materi sudah terdaftar.');
          return;
        }

        const updated = scopes.map(sc => sc.id === selectedId ? { ...sc, class_id: classId, subject_id: subjectId, nama: name } : sc);
        db.setMaterialScopes(updated);
        logAudit(session.nama, `Mengubah Lingkup Materi ke: ${name}`);
        addToast('success', 'Lingkup Materi Diperbarui', 'Data lingkup materi berhasil diperbarui.');
      }
    }

    syncState();
    closeModal();
  };

  // --- Profile Update ---
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    // Also update teachers table if name is updated
    if (teacher) {
      const allTeachers = db.getTeachers();
      const updatedTeachers = allTeachers.map(t => t.id === teacher.id ? { ...t, nama: name } : t);
      db.setTeachers(updatedTeachers);
    }

    logAudit(name, `Memperbarui profil diri.`);
    addToast('success', 'Profil Diperbarui', 'Nama profil Anda berhasil disimpan.');

    if (profilePass) {
      // Since this is mock database, we show password changed notification
      logAudit(name, `Mengubah kata sandi akun.`);
      addToast('success', 'Sandi Berhasil Diubah', 'Kata sandi baru Anda berhasil diaktifkan.');
      setProfilePass('');
    }
    syncState();
  };

  // --- Grade Input Handlers (Auto-Save on input change) ---
  const handleGradeChange = (
    studentId: string, 
    value: string, 
    type: 'formative' | 'summative-scope' | 'semester-score'
  ) => {
    // Update local state immediately for responsive/consistent typing
    setLocalGrades(prev => ({ ...prev, [studentId]: value }));

    // Show saving animation
    setSavingStates(prev => ({ ...prev, [studentId]: 'saving' }));

    // Clear any previous scheduled saving for this student to prevent race conditions
    if (saveTimeouts.current[studentId]) {
      clearTimeout(saveTimeouts.current[studentId]);
    }

    // Debounce the save to local database (400ms is standard)
    saveTimeouts.current[studentId] = setTimeout(() => {
      const rawVal = parseInt(value, 10);
      const score = isNaN(rawVal) ? 0 : Math.min(100, Math.max(0, rawVal));

      const editorName = session?.nama || 'Guru';
      const semesterId = context.semester?.id || 'sem-ganjil';
      const yearId = context.year?.id || 'th-2025';

      if (type === 'formative') {
        if (!activeTpId) return;
        saveFormativeGrades([{ student_id: studentId, tp_id: activeTpId, nilai: score }], semesterId, yearId, editorName);
      } else if (type === 'summative-scope') {
        if (!activeScopeId) return;
        saveSummativeScopeGrades([{ student_id: studentId, lingkup_id: activeScopeId, nilai: score }], semesterId, yearId, editorName);
      } else if (type === 'semester-score') {
        if (!activeSubjectId) return;
        saveSemesterGrades([{ student_id: studentId, subject_id: activeSubjectId, nilai: score }], semesterId, yearId, editorName);
      }

      // Sync state and set saved flag
      syncState();
      setSavingStates(prev => ({ ...prev, [studentId]: 'saved' }));

      // Clean checkmark after 1.5 seconds
      setTimeout(() => {
        setSavingStates(prev => ({ ...prev, [studentId]: 'idle' }));
      }, 1500);

      delete saveTimeouts.current[studentId];
    }, 400);
  };

  // --- Copy semester scores helper ---
  const handleCopySemesterGrades = () => {
    if (!activeSubjectId || !activeClassId) {
      addToast('error', 'Gagal', 'Sila pilih kelas dan mata pelajaran terlebih dahulu.');
      return;
    }

    const editorName = session?.nama || 'Guru';
    const semesterId = context.semester?.id || 'sem-ganjil';
    const yearId = context.year?.id || 'th-2025';

    // Fetch averages of formative scores for all students in this class/subject as baseline
    const gradesToSave = filteredStudents.map(student => {
      // Calculate active TPs formative scores
      const studentTpsScores = activeTps.map(tp => {
        const fScore = formativeScores.find(
          s => s.student_id === student.id && 
               s.tp_id === tp.id && 
               s.semester === semesterId && 
               s.tahun === yearId
        );
        return fScore ? fScore.nilai : 0;
      });

      const avg = studentTpsScores.length > 0 
        ? Math.round(studentTpsScores.reduce((a, b) => a + b, 0) / studentTpsScores.length)
        : 75; // school default

      return {
        student_id: student.id,
        subject_id: activeSubjectId,
        nilai: avg
      };
    });

    saveSemesterGrades(gradesToSave, semesterId, yearId, editorName);
    addToast('success', 'Nilai Disalin', `Berhasil menyalin rata-rata formatif (${gradesToSave.length} siswa) ke kolom SAS.`);
    syncState();
  };

  // --- Rekapitulasi Ledger Calculator ---
  const rekapLedger = useMemo(() => {
    if (!activeClassId || !activeSubjectId) return { headers: { tps: [], scopes: [] }, rows: [] };
    
    const semId = context.semester?.id || 'sem-ganjil';
    const yrId = context.year?.id || 'th-2025';

    // Find all TPs and Scopes for active class + subject
    const subjectTps = tps.filter(t => t.class_id === activeClassId && t.subject_id === activeSubjectId);
    const subjectScopes = scopes.filter(sc => sc.class_id === activeClassId && sc.subject_id === activeSubjectId);

    // Populate rows per student
    const rows = filteredStudents.map((student, index) => {
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
    const clsName = assigned.classes.find(c => c.id === activeClassId)?.nama || 'Kelas';
    const subName = assigned.subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel';
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

    // Simple robust CSV with UTF8 BOM
    const content = [
      headers.join(','),
      ...rows.map(row => row.map(val => {
        const stringVal = String(val === undefined || val === null ? '' : val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('success', 'Ekspor Excel Berhasil', `File CSV '${fileName}.csv' telah diunduh.`);
  };

  // Print report trigger (will print current Landscape A4 view)
  const handlePrint = () => {
    window.print();
    addToast('info', 'Mencetak Dokumen', 'Halaman cetak/PDF sistem operasi telah dibuka.');
  };

  // Download PDF helper with step-by-step guidance for saving as PDF
  const handleDownloadPDF = () => {
    addToast(
      'info', 
      'Menyiapkan PDF...', 
      'Sila pilih tujuan "Simpan sebagai PDF" / "Save as PDF" dan pastikan Tata Letak disetel ke Lansekap (Landscape) pada jendela cetak.'
    );
    setTimeout(() => {
      window.print();
    }, 1000);
  };


  return (
    <div className="space-y-6">
      
      {/* FILTER PANEL FOR TEACHER (Shared for inputs and rekap, hidden when profile tab is active) */}
      {currentTab !== 'profil' && currentTab !== 'dashboard' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between no-print">
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kelas Diampu</label>
              <select
                value={activeClassId}
                onChange={(e) => { setActiveClassId(e.target.value); syncState(); }}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                {assigned.classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mapel Diampu</label>
              <select
                value={activeSubjectId}
                onChange={(e) => { setActiveSubjectId(e.target.value); syncState(); }}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
              >
                {assigned.subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>

            {/* Sub-Filters specific to Formative Module */}
            {currentTab === 'formative' && activeTps.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tujuan Pembelajaran (TP)</label>
                <select
                  value={activeTpId}
                  onChange={(e) => setActiveTpId(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 max-w-xs truncate"
                >
                  {activeTps.map(tp => (
                    <option key={tp.id} value={tp.id}>{tp.kode} - {tp.deskripsi.substring(0, 40)}...</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sub-Filters specific to Summative Scope Module */}
            {currentTab === 'summative-scope' && activeScopes.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lingkup Materi</label>
                <select
                  value={activeScopeId}
                  onChange={(e) => setActiveScopeId(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 max-w-xs truncate"
                >
                  {activeScopes.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.nama}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            {currentTab === 'tp' && (
              <button
                onClick={() => openModal('add', 'tp', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-md"
              >
                <Plus className="w-4 h-4" />
                Tambah TP
              </button>
            )}

            {currentTab === 'scope' && (
              <button
                onClick={() => openModal('add', 'scope', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl shadow-md"
              >
                <Plus className="w-4 h-4" />
                Tambah Lingkup Materi
              </button>
            )}

            {currentTab === 'sas' && (
              <button
                onClick={handleCopySemesterGrades}
                title="Salin nilai rata-rata formative sebelumnya ke dalam nilai ujian akhir semester ini"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all rounded-xl"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Salin Rata Formatif
              </button>
            )}

            {currentTab === 'rekap' && (
              <>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all rounded-xl shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Excel (.xlsx)
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all rounded-xl shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-indigo-600" />
                  Cetak Ledger
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- TP MODULE VIEW --- */}
      {currentTab === 'tp' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-800">Tujuan Pembelajaran (TP)</h3>
              <p className="text-xs text-slate-500 mt-1">Daftar capaian minimal peserta didik untuk setiap materi dasar.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-24">Kode</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Deskripsi Capaian / Kompetensi</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTps.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-10 text-slate-400 text-sm">
                      Mata pelajaran ini belum memiliki Tujuan Pembelajaran (TP). Sila tambah TP baru.
                    </td>
                  </tr>
                ) : (
                  activeTps.map((tp) => (
                    <tr key={tp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-indigo-600 font-display">{tp.kode}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 leading-relaxed font-medium">{tp.deskripsi}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal('edit', 'tp', tp.id, { class_id: tp.class_id, subject_id: tp.subject_id, kode: tp.kode, deskripsi: tp.deskripsi })}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('delete', 'tp', tp.id)}
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
        </div>
      )}

      {/* --- LINGKUP MATERI VIEW --- */}
      {currentTab === 'scope' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-800">Daftar Lingkup Materi</h3>
              <p className="text-xs text-slate-500 mt-1">Pembagian bab/materi pokok kurikulum merdeka untuk penilaian sumatif.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Nama Lingkup Materi / Bab Kompetensi</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeScopes.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-10 text-slate-400 text-sm">
                      Mata pelajaran ini belum memiliki Lingkup Materi. Sila tambah lingkup materi baru.
                    </td>
                  </tr>
                ) : (
                  activeScopes.map((sc) => (
                    <tr key={sc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-800">{sc.nama}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal('edit', 'scope', sc.id, { class_id: sc.class_id, subject_id: sc.subject_id, nama: sc.nama })}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('delete', 'scope', sc.id)}
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
        </div>
      )}

      {/* --- FORMATIVE SCORE MODULE (Auto-saving) --- */}
      {currentTab === 'formative' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-800">Penginputan Nilai Formatif</h3>
              <p className="text-xs text-slate-500 mt-1">Mengukur kemajuan siswa secara harian. Nilai otomatis tersimpan (Auto-Save).</p>
            </div>
            {activeTpId && (
              <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Input Aktif TP
              </span>
            )}
          </div>

          {!activeTpId ? (
            <div className="text-center py-16 px-6 text-slate-400 text-sm">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              Tujuan Pembelajaran (TP) belum dipilih atau belum dibuat untuk mata pelajaran ini.<br/>
              Harap buat Tujuan Pembelajaran terlebih dahulu melalui tab <strong>Input TP</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-16">No</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40">NISN</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Nama Lengkap Siswa</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40 text-center">Nilai Formatif (0-100)</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40 text-right">Status Simpan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Tidak ada siswa terdaftar di kelas ini.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      // Get current formative score
                      const scoreObj = formativeScores.find(
                        s => s.student_id === student.id && 
                             s.tp_id === activeTpId && 
                             s.semester === (context.semester?.id || '') && 
                             s.tahun === (context.year?.id || '')
                      );
                      const currentVal = scoreObj ? scoreObj.nilai : '';
                      const saveState = savingStates[student.id] || 'idle';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{student.nisn}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.nama}</td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={localGrades[student.id] ?? ''}
                              onChange={(e) => handleGradeChange(student.id, e.target.value, 'formative')}
                              className="w-24 text-center px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold font-mono"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-4 text-right text-xs">
                            {saveState === 'saving' && (
                              <span className="text-slate-400 font-medium flex items-center gap-1.5 justify-end font-mono">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span> Menulis...
                              </span>
                            )}
                            {saveState === 'saved' && (
                              <span className="text-emerald-600 font-bold flex items-center gap-1.5 justify-end">
                                <Check className="w-4 h-4 text-emerald-500" /> Auto-Save
                              </span>
                            )}
                            {saveState === 'idle' && (
                              <span className="text-slate-300 font-mono">Tersimpan</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- SUMMATIVE SCOPE SCORE MODULE (Auto-saving) --- */}
      {currentTab === 'summative-scope' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-800">Nilai Sumatif Lingkup Materi</h3>
              <p className="text-xs text-slate-500 mt-1">Input nilai akhir bab/materi pembelajaran kurikulum merdeka. (Auto-Save).</p>
            </div>
          </div>

          {!activeScopeId ? (
            <div className="text-center py-16 px-6 text-slate-400 text-sm">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              Lingkup Materi belum dipilih atau belum dibuat untuk kelas ini.<br/>
              Sila buat Lingkup Materi terlebih dahulu melalui tab <strong>Input Lingkup Materi</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-16">No</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40">NISN</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Nama Lengkap Siswa</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40 text-center">Nilai Sumatif Bab (0-100)</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40 text-right">Status Simpan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Tidak ada siswa terdaftar di kelas ini.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const scoreObj = summativeScores.find(
                        s => s.student_id === student.id && 
                             s.lingkup_id === activeScopeId && 
                             s.semester === (context.semester?.id || '') && 
                             s.tahun === (context.year?.id || '')
                      );
                      const currentVal = scoreObj ? scoreObj.nilai : '';
                      const saveState = savingStates[student.id] || 'idle';

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{student.nisn}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.nama}</td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={localGrades[student.id] ?? ''}
                              onChange={(e) => handleGradeChange(student.id, e.target.value, 'summative-scope')}
                              className="w-24 text-center px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold font-mono"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-4 text-right text-xs">
                            {saveState === 'saving' && (
                              <span className="text-slate-400 font-medium flex items-center gap-1.5 justify-end font-mono">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span> Menulis...
                              </span>
                            )}
                            {saveState === 'saved' && (
                              <span className="text-emerald-600 font-bold flex items-center gap-1.5 justify-end">
                                <Check className="w-4 h-4 text-emerald-500" /> Auto-Save
                              </span>
                            )}
                            {saveState === 'idle' && (
                              <span className="text-slate-300 font-mono">Tersimpan</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- SUMMATIVE SEMESTER SCORE MODULE (Auto-saving) --- */}
      {currentTab === 'sas' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-800">Nilai Sumatif Akhir Semester (SAS)</h3>
            <p className="text-xs text-slate-500 mt-1">Menginput nilai murni ujian akhir semester untuk dikombinasikan ke dalam rekapitulasi nilai akhir. (Auto-Save).</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-16">No</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40">NISN</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Nama Lengkap Siswa</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40 text-center">Nilai Ujian SAS (0-100)</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40 text-right">Status Simpan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Tidak ada siswa terdaftar di kelas ini.</td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const scoreObj = semesterScores.find(
                      s => s.student_id === student.id && 
                           s.subject_id === activeSubjectId && 
                           s.semester === (context.semester?.id || '') && 
                           s.tahun === (context.year?.id || '')
                    );
                    const currentVal = scoreObj ? scoreObj.nilai : '';
                    const saveState = savingStates[student.id] || 'idle';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-500">{student.nisn}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.nama}</td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={localGrades[student.id] ?? ''}
                            onChange={(e) => handleGradeChange(student.id, e.target.value, 'semester-score')}
                            className="w-24 text-center px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold font-mono"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-4 text-right text-xs">
                          {saveState === 'saving' && (
                            <span className="text-slate-400 font-medium flex items-center gap-1.5 justify-end font-mono">
                              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span> Menulis...
                            </span>
                          )}
                          {saveState === 'saved' && (
                            <span className="text-emerald-600 font-bold flex items-center gap-1.5 justify-end">
                              <Check className="w-4 h-4 text-emerald-500" /> Auto-Save
                            </span>
                          )}
                          {saveState === 'idle' && (
                            <span className="text-slate-300 font-mono">Tersimpan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- REKAPITULASI LEDGER (Report printing-ready & Excel-ready) --- */}
      {currentTab === 'rekap' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm print-container print-break-inside-avoid">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between no-print">
            <div>
              <h3 className="text-base font-bold text-slate-800">Lembar Rekapitulasi Nilai Siswa</h3>
              <p className="text-xs text-slate-500 mt-1">Otomatis menghitung rata-rata harian formatif dan mengkombinasikan seluruh sumatif lingkup materi.</p>
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
            <h2 className="text-xl font-bold uppercase tracking-wide">Rekapitulasi Nilai Peserta Didik SD</h2>
            <p className="text-xs text-slate-600 mt-1">Kurikulum Merdeka Belajar • Tahun Pelajaran {context.year?.nama || '2025/2026'} ({context.semester?.nama || 'Ganjil'})</p>
            <div className="grid grid-cols-2 text-left text-xs max-w-sm mx-auto mt-4 font-mono">
              <span>Kelas: {assigned.classes.find(c => c.id === activeClassId)?.nama || '-'}</span>
              <span>Guru: {session?.nama || '-'}</span>
              <span>Mata Pelajaran: {assigned.subjects.find(s => s.id === activeSubjectId)?.nama || '-'}</span>
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
                  <th className="px-4 py-3 text-xs font-bold text-indigo-800 uppercase tracking-wider text-center bg-indigo-100/50">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapLedger.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6 + rekapLedger.headers.tps.length + rekapLedger.headers.scopes.length} className="text-center py-10 text-slate-400 text-sm">
                      Belum ada siswa atau data nilai terinput.
                    </td>
                  </tr>
                ) : (
                  rekapLedger.rows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-center font-mono text-slate-400">{row.no}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{row.nisn}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-800">{row.nama}</td>
                      
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
                  className="font-bold text-slate-800 dark:text-slate-200 print:text-black border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-hidden pb-0.5 min-w-[200px] print:border-none bg-transparent"
                  placeholder="Nama Kepala Sekolah"
                />
                <div className="flex items-center gap-1 mt-1 print:mt-0.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">NIP.</span>
                  <input
                    type="text"
                    value={kepsekNip}
                    onChange={(e) => handleKepsekNipChange(e.target.value)}
                    className="text-[10px] text-slate-600 dark:text-slate-400 print:text-black font-mono border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-hidden min-w-[160px] print:border-none bg-transparent"
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
                className="text-slate-500 dark:text-slate-400 print:text-black border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-hidden pb-0.5 text-right font-sans text-xs min-w-[200px] print:border-none bg-transparent"
                placeholder="Tempat, Tanggal"
              />
              <p className="font-bold text-slate-800 dark:text-slate-200 print:text-black text-sm mt-0.5">Guru Kelas/Mapel</p>
              
              {/* Space for Signature */}
              <div className="h-24 flex items-center justify-end">
                {/* Visual indicator for handwritten signature */}
                <div className="text-[10px] italic text-indigo-400/80 dark:text-indigo-500/50 print:hidden select-none font-mono tracking-wider rotate-[-2deg] border border-dashed border-indigo-200/50 dark:border-indigo-900/40 px-3 py-1 rounded">
                  ( Tanda Tangan Basah )
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <input
                  type="text"
                  value={customTeacherName}
                  onChange={(e) => handleCustomTeacherNameChange(e.target.value)}
                  className="font-bold text-indigo-600 dark:text-indigo-400 print:text-black border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-hidden pb-0.5 text-right min-w-[200px] print:border-none bg-transparent"
                  placeholder="Nama Guru"
                />
                <div className="flex items-center justify-end gap-1 mt-1 print:mt-0.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono text-right">NIP.</span>
                  <input
                    type="text"
                    value={teacherNip}
                    onChange={(e) => handleTeacherNipChange(e.target.value)}
                    className="text-[10px] text-slate-600 dark:text-slate-400 print:text-black font-mono border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-hidden min-w-[160px] print:border-none bg-transparent text-right"
                    placeholder="NIP Guru"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFILE TEACHER VIEW --- */}
      {currentTab === 'profil' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm max-w-xl mx-auto">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Pengaturan Profil & Sandi</h3>
              <p className="text-xs text-slate-500 mt-0.5">Kelola data informasi diri Anda selaku guru pengampu.</p>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Alamat Email (Akun Login)</label>
              <input
                type="text"
                disabled
                value={session?.email || ''}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-sm font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Email akun dikonfigurasi oleh Administrator sekolah.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Lengkap beserta Gelar</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold"
                placeholder="Siti Aminah, S.Pd."
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


      {/* --- MODAL DIALOGS FOR TEACHER CAPABILITY (TP & Material Scope CRUD) --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={
          modalType === 'delete' ? 'Konfirmasi Hapus' :
          modalType === 'add' ? `Tambah ${targetEntity === 'tp' ? 'Tujuan Pembelajaran' : 'Lingkup Materi'}` :
          `Ubah ${targetEntity === 'tp' ? 'Tujuan Pembelajaran' : 'Lingkup Materi'}`
        }
      >
        {modalType === 'delete' ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data ini secara permanen? Seluruh data nilai siswa yang berkaitan dengan indikator/capaian ini juga akan ikut terhapus dari sistem rekapitulasi.
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
                onClick={handleCrudSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCrudSubmit} className="space-y-4">
            {targetEntity === 'tp' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kelas</label>
                    <select
                      disabled
                      value={formData.class_id || ''}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs cursor-not-allowed"
                    >
                      {assigned.classes.map(c => (
                        <option key={c.id} value={c.id}>{c.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mata Pelajaran</label>
                    <select
                      disabled
                      value={formData.subject_id || ''}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs cursor-not-allowed"
                    >
                      {assigned.subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Kode Capaian (TP)</label>
                  <input
                    type="text"
                    required
                    value={formData.kode || ''}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold font-mono"
                    placeholder="TP 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Deskripsi Tujuan Pembelajaran (Kompetensi)</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.deskripsi || ''}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm leading-relaxed"
                    placeholder="Peserta didik mampu menjelaskan pecahan senilai menggunakan model konkret..."
                  />
                </div>
              </>
            )}

            {targetEntity === 'scope' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kelas</label>
                    <select
                      disabled
                      value={formData.class_id || ''}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs cursor-not-allowed"
                    >
                      {assigned.classes.map(c => (
                        <option key={c.id} value={c.id}>{c.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mata Pelajaran</label>
                    <select
                      disabled
                      value={formData.subject_id || ''}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs cursor-not-allowed"
                    >
                      {assigned.subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nama Lingkup Materi / Judul Bab</label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm font-semibold"
                    placeholder="Lingkup Materi 1: Bilangan Pecahan"
                  />
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
                Simpan Data
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
