import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  db, logAudit, getActiveContext, getTeacherForUser, 
  getTeacherAssignedClassesAndSubjects, saveFormativeGrades, 
  saveSummativeScopeGrades, saveSemesterGrades 
} from '../db';
import { 
  LearningObjective, MaterialScope, Student, FormativeScore, 
  SummativeScopeScore, SemesterScore, Class, Subject,
  AcademicYear, Semester, sortTps, sortScopes, sortStudents
} from '../types';
import { Modal } from './Modal';
import * as XLSX from 'xlsx';
import { 
  BookOpen, Layers, Plus, Edit, Trash2, Save, Sparkles, Check, 
  FileSpreadsheet, Printer, FileText, Search, User, Lock, Eye, EyeOff, Loader2,
  Upload, Download, FileUp, FileDown, AlertCircle
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
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => db.getAcademicYears());
  const [semesters, setSemesters] = useState<Semester[]>(() => db.getSemesters());

  // Current active Context (Year & Semester)
  const context = useMemo(() => {
    return {
      year: academicYears.find(y => y.aktif) || academicYears[0] || null,
      semester: semesters.find(s => s.aktif) || semesters[0] || null
    };
  }, [academicYears, semesters]);

  // Sync state helpers
  const syncState = () => {
    setTps(db.getLearningObjectives());
    setScopes(db.getMaterialScopes());
    setStudents(db.getStudents());
    setFormativeScores(db.getFormativeScores());
    setSummativeScores(db.getSummativeScopeScores());
    setSemesterScores(db.getSemesterScores());
    setAcademicYears(db.getAcademicYears());
    setSemesters(db.getSemesters());
    onRefreshStats();
  };

  useEffect(() => {
    const handleDbSynced = () => {
      syncState();
    };
    window.addEventListener('merdeka_db_synced', handleDbSynced);
    return () => {
      window.removeEventListener('merdeka_db_synced', handleDbSynced);
    };
  }, []);

  // State for forms & modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit' | 'delete'>('add');
  const [targetEntity, setTargetEntity] = useState<string>(''); // 'tp' or 'scope'
  const [selectedId, setSelectedId] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  // Excel Import & Export State
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelImportType, setExcelImportType] = useState<'tp' | 'scope'>('tp');
  const [excelImportMode, setExcelImportMode] = useState<'append' | 'replace'>('append');
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsedRows, setExcelParsedRows] = useState<any[]>([]);
  const [excelError, setExcelError] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Filters for input modules & grade entries
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [activeTpId, setActiveTpId] = useState<string>('');
  const [activeScopeId, setActiveScopeId] = useState<string>('');

  // Grade saving states
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSavingGrades, setIsSavingGrades] = useState<boolean>(false);

  // Local grades state to keep inputs responsive and stable
  const [localGrades, setLocalGrades] = useState<Record<string, string>>({});

  // Selection key to detect when teacher switches tab or filter focus
  const activeSelectionKey = `${currentTab}_${activeClassId}_${activeSubjectId}_${activeTpId}_${activeScopeId}_${context.semester?.id}_${context.year?.id}`;
  const prevSelectionKeyRef = useRef<string>(activeSelectionKey);

  useEffect(() => {
    const isSelectionChanged = prevSelectionKeyRef.current !== activeSelectionKey;
    prevSelectionKeyRef.current = activeSelectionKey;

    // If teacher hasn't changed tab/filters AND has unsaved edits, preserve their typed inputs!
    if (!isSelectionChanged && hasUnsavedChanges) {
      return;
    }

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
    setHasUnsavedChanges(false);
  }, [
    activeSelectionKey,
    hasUnsavedChanges,
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
      const defaultClassId = assigned.classes[0].id;
      setActiveClassId(defaultClassId);
      const defaultSubId = activeSubjectId || (assigned.subjects[0]?.id || '');
      if (defaultSubId) {
        const matchingTps = sortTps(tps.filter(tp => tp.class_id === defaultClassId && tp.subject_id === defaultSubId));
        setActiveTpId(matchingTps[0]?.id || '');
        const matchingScopes = sortScopes(scopes.filter(sc => sc.class_id === defaultClassId && sc.subject_id === defaultSubId));
        setActiveScopeId(matchingScopes[0]?.id || '');
      }
    }
    if (assigned.subjects.length > 0 && !activeSubjectId) {
      setActiveSubjectId(assigned.subjects[0].id);
    }
  }, [assigned, activeClassId, activeSubjectId, tps, scopes]);

  const handleClassChange = (newClassId: string) => {
    setActiveClassId(newClassId);
    const newTps = sortTps(tps.filter(tp => tp.class_id === newClassId && tp.subject_id === activeSubjectId));
    setActiveTpId(newTps[0]?.id || '');
    const newScopes = sortScopes(scopes.filter(sc => sc.class_id === newClassId && sc.subject_id === activeSubjectId));
    setActiveScopeId(newScopes[0]?.id || '');
  };

  const handleSubjectChange = (newSubjectId: string) => {
    setActiveSubjectId(newSubjectId);
    const newTps = sortTps(tps.filter(tp => tp.class_id === activeClassId && tp.subject_id === newSubjectId));
    setActiveTpId(newTps[0]?.id || '');
    const newScopes = sortScopes(scopes.filter(sc => sc.class_id === activeClassId && sc.subject_id === newSubjectId));
    setActiveScopeId(newScopes[0]?.id || '');
  };

  // Filter students based on active class, sorted alphabetically (A-Z)
  const filteredStudents = useMemo(() => {
    if (!activeClassId) return [];
    return sortStudents(students.filter(s => s.kelas_id === activeClassId));
  }, [students, activeClassId]);

  // List of TPs for active class & subject, sorted numerically (TP 1, TP 2, TP 3...)
  const activeTps = useMemo(() => {
    if (!activeClassId || !activeSubjectId) return [];
    return sortTps(tps.filter(tp => tp.class_id === activeClassId && tp.subject_id === activeSubjectId));
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

  // List of Scopes for active class & subject, sorted numerically (LM 1, LM 2, LM 3...)
  const activeScopes = useMemo(() => {
    if (!activeClassId || !activeSubjectId) return [];
    return sortScopes(scopes.filter(sc => sc.class_id === activeClassId && sc.subject_id === activeSubjectId));
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

  // --- Excel Import & Export Handlers ---
  const handleExportTpExcel = () => {
    const clsName = assigned.classes.find(c => c.id === activeClassId)?.nama || 'Kelas';
    const subName = assigned.subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel';
    const cleanFileName = `TP_${clsName}_${subName}`.replace(/[/\\?%*:|"<>]/g, '_');

    let exportData: any[] = [];
    if (activeTps.length > 0) {
      exportData = activeTps.map((tp, idx) => ({
        'No': idx + 1,
        'Kode TP': tp.kode,
        'Deskripsi Capaian': tp.deskripsi
      }));
    } else {
      exportData = [
        { 'No': 1, 'Kode TP': 'TP 1', 'Deskripsi Capaian': 'Membaca dan menulis bilangan cacah sampai 10.000 dengan tepat' },
        { 'No': 2, 'Kode TP': 'TP 2', 'Deskripsi Capaian': 'Membandingkan dan mengurutkan bilangan cacah sampai 10.000' },
        { 'No': 3, 'Kode TP': 'TP 3', 'Deskripsi Capaian': 'Melakukan operasi penjumlahan dan pengurangan bilangan cacah' }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 70 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data TP');
    XLSX.writeFile(wb, `${cleanFileName}.xlsx`);
    addToast('success', 'Excel Diunduh', `Format Excel '${cleanFileName}.xlsx' berhasil diunduh.`);
  };

  const handleExportScopeExcel = () => {
    const clsName = assigned.classes.find(c => c.id === activeClassId)?.nama || 'Kelas';
    const subName = assigned.subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel';
    const cleanFileName = `Lingkup_Materi_${clsName}_${subName}`.replace(/[/\\?%*:|"<>]/g, '_');

    let exportData: any[] = [];
    if (activeScopes.length > 0) {
      exportData = activeScopes.map((sc, idx) => ({
        'No': idx + 1,
        'Nama Lingkup Materi': sc.nama
      }));
    } else {
      exportData = [
        { 'No': 1, 'Nama Lingkup Materi': 'Bab 1 : Bilangan Cacah sampai 10.000' },
        { 'No': 2, 'Nama Lingkup Materi': 'Bab 2 : Pecahan Sederhana' },
        { 'No': 3, 'Nama Lingkup Materi': 'Bab 3 : Pola Gambar dan Pola Bilangan' }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [{ wch: 6 }, { wch: 50 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lingkup Materi');
    XLSX.writeFile(wb, `${cleanFileName}.xlsx`);
    addToast('success', 'Excel Diunduh', `Format Excel '${cleanFileName}.xlsx' berhasil diunduh.`);
  };

  const handleOpenExcelModal = (type: 'tp' | 'scope') => {
    setExcelImportType(type);
    setExcelImportMode('append');
    setExcelFileName('');
    setExcelParsedRows([]);
    setExcelError('');
    setIsExcelModalOpen(true);
  };

  const processExcelFile = (file: File) => {
    setExcelFileName(file.name);
    setExcelError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setExcelError('File Excel tidak memiliki sheet yang valid.');
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!rawRows || rawRows.length === 0) {
          setExcelError('File Excel kosong atau tidak terbaca.');
          return;
        }

        if (excelImportType === 'tp') {
          let headerRowIndex = 0;
          let codeColIdx = -1;
          let descColIdx = -1;
          let noColIdx = -1;

          for (let r = 0; r < Math.min(5, rawRows.length); r++) {
            const row = rawRows[r];
            if (!Array.isArray(row)) continue;
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] || '').toLowerCase().trim();
              if (codeColIdx === -1 && (val.includes('kode') || val.includes('tp') || val === 'kd')) {
                codeColIdx = c;
                headerRowIndex = r;
              }
              if (descColIdx === -1 && (val.includes('deskripsi') || val.includes('capaian') || val.includes('tujuan') || val.includes('uraian') || val.includes('kompetensi') || val.includes('materi'))) {
                descColIdx = c;
                headerRowIndex = r;
              }
              if (noColIdx === -1 && (val === 'no' || val === 'no.' || val === 'nomor' || val === 'urut')) {
                noColIdx = c;
              }
            }
            if (codeColIdx !== -1 && descColIdx !== -1) break;
          }

          if (codeColIdx === -1 || descColIdx === -1) {
            const sampleRow = rawRows.find(r => Array.isArray(r) && r.some(cell => String(cell || '').trim() !== '')) || [];
            if (sampleRow.length <= 2) {
              codeColIdx = 0;
              descColIdx = 1;
              headerRowIndex = /kode|tp|no/i.test(String(sampleRow[0] || '')) ? 0 : -1;
            } else {
              codeColIdx = 1;
              descColIdx = 2;
              headerRowIndex = /kode|tp|no/i.test(String(sampleRow[0] || '')) ? 0 : -1;
            }
          }

          const parsedList: { kode: string; deskripsi: string; valid: boolean }[] = [];
          for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!Array.isArray(row)) continue;

            let code = String(row[codeColIdx] ?? '').trim();
            let desc = String(row[descColIdx] ?? '').trim();

            if (!code && !desc) continue;

            if (!code && desc) {
              code = `TP ${parsedList.length + 1}`;
            }

            if (/^\d+(\.\d+)?$/.test(code)) {
              code = `TP ${code}`;
            }

            const valid = code.length > 0 && desc.length > 0;
            parsedList.push({ kode: code, deskripsi: desc, valid });
          }

          if (parsedList.length === 0) {
            setExcelError('Tidak ditemukan baris data TP yang valid di dalam file Excel.');
            return;
          }

          setExcelParsedRows(parsedList);
        } else {
          let headerRowIndex = 0;
          let nameColIdx = -1;
          let noColIdx = -1;

          for (let r = 0; r < Math.min(5, rawRows.length); r++) {
            const row = rawRows[r];
            if (!Array.isArray(row)) continue;
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] || '').toLowerCase().trim();
              if (nameColIdx === -1 && (val.includes('lingkup') || val.includes('materi') || val.includes('bab') || val.includes('unit') || val.includes('tema') || val.includes('topik') || val.includes('judul'))) {
                nameColIdx = c;
                headerRowIndex = r;
                break;
              }
              if (noColIdx === -1 && (val === 'no' || val === 'no.' || val === 'nomor' || val === 'urut')) {
                noColIdx = c;
              }
            }
            if (nameColIdx !== -1) break;
          }

          if (nameColIdx === -1) {
            const sampleRow = rawRows.find(r => Array.isArray(r) && r.some(cell => String(cell || '').trim() !== '')) || [];
            if (sampleRow.length >= 2 && /^\d+$/.test(String(sampleRow[0] || '').trim())) {
              nameColIdx = 1;
              headerRowIndex = 0;
            } else {
              nameColIdx = 0;
              headerRowIndex = /nama|lingkup|materi|no/i.test(String(sampleRow[0] || '')) ? 0 : -1;
            }
          }

          const parsedList: { nama: string; valid: boolean }[] = [];
          for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!Array.isArray(row)) continue;

            let name = String(row[nameColIdx] ?? '').trim();
            if (!name) continue;

            const valid = name.length > 0;
            parsedList.push({ nama: name, valid });
          }

          if (parsedList.length === 0) {
            setExcelError('Tidak ditemukan data Lingkup Materi yang valid di dalam file Excel.');
            return;
          }

          setExcelParsedRows(parsedList);
        }
      } catch (err: any) {
        setExcelError('Gagal membaca file Excel. Pastikan format file adalah .xlsx, .xls, atau .csv');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommitExcelImport = () => {
    if (!activeClassId || !activeSubjectId) {
      addToast('error', 'Gagal', 'Kelas dan Mata Pelajaran harus dipilih terlebih dahulu.');
      return;
    }

    const userName = session?.nama || 'Guru';
    const clsName = assigned.classes.find(c => c.id === activeClassId)?.nama || 'Kelas';
    const subName = assigned.subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel';

    if (excelImportType === 'tp') {
      const validRows = excelParsedRows.filter(r => r.valid);
      if (validRows.length === 0) {
        addToast('error', 'Gagal', 'Tidak ada baris TP yang valid untuk disimpan.');
        return;
      }

      const currentTps = db.getLearningObjectives();
      let baseList = currentTps;

      if (excelImportMode === 'replace') {
        baseList = currentTps.filter(tp => !(tp.class_id === activeClassId && tp.subject_id === activeSubjectId));
      }

      const now = Date.now();
      const newTps: LearningObjective[] = validRows.map((row, idx) => ({
        id: `tp-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        class_id: activeClassId,
        subject_id: activeSubjectId,
        kode: row.kode,
        deskripsi: row.deskripsi
      }));

      let toAdd = newTps;
      if (excelImportMode === 'append') {
        toAdd = newTps.filter(nt => !baseList.some(et => et.class_id === activeClassId && et.subject_id === activeSubjectId && et.kode.toLowerCase() === nt.kode.toLowerCase()));
      }

      const finalList = sortTps([...baseList, ...toAdd]);
      db.setLearningObjectives(finalList);
      setTps(finalList);
      logAudit(userName, `Impor Excel: Menambahkan ${toAdd.length} TP pada ${clsName} - ${subName}`);
      addToast('success', 'Impor Excel Berhasil', `${toAdd.length} Tujuan Pembelajaran (TP) berhasil disimpan ke ${clsName} (${subName}).`);
    } else {
      const validRows = excelParsedRows.filter(r => r.valid);
      if (validRows.length === 0) {
        addToast('error', 'Gagal', 'Tidak ada baris Lingkup Materi yang valid.');
        return;
      }

      const currentScopes = db.getMaterialScopes();
      let baseList = currentScopes;

      if (excelImportMode === 'replace') {
        baseList = currentScopes.filter(sc => !(sc.class_id === activeClassId && sc.subject_id === activeSubjectId));
      }

      const now = Date.now();
      const newScopes: MaterialScope[] = validRows.map((row, idx) => ({
        id: `sc-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        class_id: activeClassId,
        subject_id: activeSubjectId,
        nama: row.nama
      }));

      let toAdd = newScopes;
      if (excelImportMode === 'append') {
        toAdd = newScopes.filter(ns => !baseList.some(es => es.class_id === activeClassId && es.subject_id === activeSubjectId && es.nama.toLowerCase() === ns.nama.toLowerCase()));
      }

      const finalList = sortScopes([...baseList, ...toAdd]);
      db.setMaterialScopes(finalList);
      setScopes(finalList);
      logAudit(userName, `Impor Excel: Menambahkan ${toAdd.length} Lingkup Materi pada ${clsName} - ${subName}`);
      addToast('success', 'Impor Excel Berhasil', `${toAdd.length} Lingkup Materi berhasil disimpan ke ${clsName} (${subName}).`);
    }

    syncState();
    if (onRefreshStats) onRefreshStats();
    setIsExcelModalOpen(false);
    setExcelParsedRows([]);
  };

  // Submit CRUD for TP & Material Scopes
  const handleCrudSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    const userName = session?.nama || 'Guru';

    if (modalType === 'delete') {
      if (targetEntity === 'tp') {
        const currentTps = db.getLearningObjectives();
        const item = currentTps.find(x => String(x.id) === String(selectedId)) || tps.find(x => String(x.id) === String(selectedId));
        if (item) {
          const updated = currentTps.filter(x => String(x.id) !== String(selectedId));
          db.setLearningObjectives(updated);
          setTps(updated);
          
          // Clean up scores linked to this TP
          const currentScores = db.getFormativeScores();
          const updatedScores = currentScores.filter(s => String(s.tp_id) !== String(selectedId));
          db.setFormativeScores(updatedScores);
          setFormativeScores(updatedScores);

          if (activeTpId === selectedId) {
            setActiveTpId('');
          }

          logAudit(userName, `Menghapus TP: ${item.kode} - ${item.deskripsi.substring(0, 30)}...`);
          addToast('success', 'TP Dihapus', 'Tujuan Pembelajaran berhasil dihapus beserta seluruh nilainya.');
        } else {
          addToast('error', 'Gagal Hapus', 'Data Tujuan Pembelajaran tidak ditemukan.');
        }
      } else if (targetEntity === 'scope') {
        const currentScopes = db.getMaterialScopes();
        const item = currentScopes.find(x => String(x.id) === String(selectedId)) || scopes.find(x => String(x.id) === String(selectedId));
        if (item) {
          const updated = currentScopes.filter(x => String(x.id) !== String(selectedId));
          db.setMaterialScopes(updated);
          setScopes(updated);

          // Clean up summatives linked to this scope
          const currentSumScores = db.getSummativeScopeScores();
          const updatedSumScores = currentSumScores.filter(s => String(s.lingkup_id) !== String(selectedId));
          db.setSummativeScopeScores(updatedSumScores);
          setSummativeScores(updatedSumScores);

          if (activeScopeId === selectedId) {
            setActiveScopeId('');
          }

          logAudit(userName, `Menghapus Lingkup Materi: ${item.nama}`);
          addToast('success', 'Lingkup Materi Dihapus', 'Lingkup materi berhasil dihapus.');
        } else {
          addToast('error', 'Gagal Hapus', 'Data Lingkup Materi tidak ditemukan.');
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

      const currentTps = db.getLearningObjectives();

      if (modalType === 'add') {
        // Check duplicate code in same class + subject
        const duplicate = currentTps.some(tp => tp.class_id === classId && tp.subject_id === subjectId && tp.kode.toLowerCase() === code.toLowerCase());
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

        const updated = [...currentTps, newTp];
        db.setLearningObjectives(updated);
        setTps(updated);
        logAudit(userName, `Membuat TP Baru: ${code} - ${desc.substring(0, 40)}`);
        addToast('success', 'TP Ditambahkan', `Tujuan Pembelajaran ${code} berhasil disimpan.`);
      } else {
        const otherTps = currentTps.filter(tp => String(tp.id) !== String(selectedId));
        const duplicate = otherTps.some(tp => tp.class_id === classId && tp.subject_id === subjectId && tp.kode.toLowerCase() === code.toLowerCase());
        if (duplicate) {
          addToast('error', 'Kode Duplikat', `Kode ${code} sudah terdaftar.`);
          return;
        }

        const updated = currentTps.map(tp => String(tp.id) === String(selectedId) ? { ...tp, class_id: classId, subject_id: subjectId, kode: code, deskripsi: desc } : tp);
        db.setLearningObjectives(updated);
        setTps(updated);
        logAudit(userName, `Mengubah TP: ${code}`);
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

      const currentScopes = db.getMaterialScopes();

      if (modalType === 'add') {
        const duplicate = currentScopes.some(sc => sc.class_id === classId && sc.subject_id === subjectId && sc.nama.toLowerCase() === name.toLowerCase());
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

        const updated = [...currentScopes, newScope];
        db.setMaterialScopes(updated);
        setScopes(updated);
        logAudit(userName, `Membuat Lingkup Materi Baru: ${name}`);
        addToast('success', 'Lingkup Materi Disimpan', `Lingkup materi berhasil ditambahkan.`);
      } else {
        const otherScopes = currentScopes.filter(sc => String(sc.id) !== String(selectedId));
        const duplicate = otherScopes.some(sc => sc.class_id === classId && sc.subject_id === subjectId && sc.nama.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          addToast('error', 'Nama Duplikat', 'Lingkup materi sudah terdaftar.');
          return;
        }

        const updated = currentScopes.map(sc => String(sc.id) === String(selectedId) ? { ...sc, class_id: classId, subject_id: subjectId, nama: name } : sc);
        db.setMaterialScopes(updated);
        setScopes(updated);
        logAudit(userName, `Mengubah Lingkup Materi ke: ${name}`);
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

  // --- Grade Input Handlers (Manual Save) ---
  const handleGradeInputChange = (studentId: string, value: string) => {
    setLocalGrades(prev => ({ ...prev, [studentId]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveAllGrades = async () => {
    if (!session) return;
    setIsSavingGrades(true);

    const editorName = session.nama || 'Guru';
    const semesterId = context.semester?.id || 'sem-ganjil';
    const yearId = context.year?.id || 'th-2025';

    try {
      if (currentTab === 'formative') {
        if (!activeTpId) {
          addToast('error', 'Pilih TP', 'Harap pilih Tujuan Pembelajaran terlebih dahulu.');
          setIsSavingGrades(false);
          return;
        }

        const gradesToSave: { student_id: string; tp_id: string; nilai: number }[] = [];
        filteredStudents.forEach(student => {
          const valStr = localGrades[student.id];
          if (valStr !== undefined && valStr !== null && valStr.trim() !== '') {
            const parsed = parseInt(valStr, 10);
            if (!isNaN(parsed)) {
              const score = Math.min(100, Math.max(0, parsed));
              gradesToSave.push({ student_id: student.id, tp_id: activeTpId, nilai: score });
            }
          }
        });

        saveFormativeGrades(gradesToSave, semesterId, yearId, editorName);
        addToast('success', 'Nilai Formatif Disimpan', `Berhasil menyimpan ${gradesToSave.length} nilai formatif ke database.`);

      } else if (currentTab === 'summative-scope') {
        if (!activeScopeId) {
          addToast('error', 'Pilih Lingkup Materi', 'Harap pilih Lingkup Materi terlebih dahulu.');
          setIsSavingGrades(false);
          return;
        }

        const gradesToSave: { student_id: string; lingkup_id: string; nilai: number }[] = [];
        filteredStudents.forEach(student => {
          const valStr = localGrades[student.id];
          if (valStr !== undefined && valStr !== null && valStr.trim() !== '') {
            const parsed = parseInt(valStr, 10);
            if (!isNaN(parsed)) {
              const score = Math.min(100, Math.max(0, parsed));
              gradesToSave.push({ student_id: student.id, lingkup_id: activeScopeId, nilai: score });
            }
          }
        });

        saveSummativeScopeGrades(gradesToSave, semesterId, yearId, editorName);
        addToast('success', 'Nilai Sumatif Disimpan', `Berhasil menyimpan ${gradesToSave.length} nilai sumatif lingkup materi ke database.`);

      } else if (currentTab === 'sas') {
        if (!activeSubjectId) {
          addToast('error', 'Pilih Mapel', 'Harap pilih mata pelajaran terlebih dahulu.');
          setIsSavingGrades(false);
          return;
        }

        const gradesToSave: { student_id: string; subject_id: string; nilai: number }[] = [];
        filteredStudents.forEach(student => {
          const valStr = localGrades[student.id];
          if (valStr !== undefined && valStr !== null && valStr.trim() !== '') {
            const parsed = parseInt(valStr, 10);
            if (!isNaN(parsed)) {
              const score = Math.min(100, Math.max(0, parsed));
              gradesToSave.push({ student_id: student.id, subject_id: activeSubjectId, nilai: score });
            }
          }
        });

        saveSemesterGrades(gradesToSave, semesterId, yearId, editorName);
        addToast('success', 'Nilai SAS Disimpan', `Berhasil menyimpan ${gradesToSave.length} nilai SAS ke database.`);
      }

      syncState();
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Gagal menyimpan nilai:", err);
      addToast('error', 'Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan data nilai.');
    } finally {
      setIsSavingGrades(false);
    }
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
    if (currentTab !== 'rekap') return { headers: { tps: [], scopes: [] }, rows: [] };
    if (!activeClassId || !activeSubjectId) return { headers: { tps: [], scopes: [] }, rows: [] };
    
    const semId = context.semester?.id || 'sem-ganjil';
    const yrId = context.year?.id || 'th-1784091890382';

    // Find all TPs and Scopes for active class + subject, sorted numerically (TP 1, TP 2, ... LM 1, LM 2, ...)
    const subjectTps = sortTps(tps.filter(t => t.class_id === activeClassId && t.subject_id === activeSubjectId));
    const subjectScopes = sortScopes(scopes.filter(sc => sc.class_id === activeClassId && sc.subject_id === activeSubjectId));

    // Helper to match semester & academic year across different naming conventions
    const isMatchingContext = (itemSem?: string, itemYr?: string) => {
      const matchSem = !itemSem || 
                       itemSem === semId || 
                       itemSem === context.semester?.nama || 
                       (semId.toLowerCase().includes('ganjil') && (itemSem.toLowerCase().includes('ganjil') || itemSem === '1')) ||
                       (semId.toLowerCase().includes('genap') && (itemSem.toLowerCase().includes('genap') || itemSem === '2'));
      const matchYr = !itemYr || 
                      itemYr === yrId || 
                      itemYr === context.year?.nama || 
                      (context.year?.nama && itemYr.includes(context.year.nama.substring(0, 4))) ||
                      (yrId.includes('178409') && (itemYr.includes('178409') || itemYr.includes('2026') || itemYr.includes('2025'))) ||
                      (yrId.includes('2025') && (itemYr.includes('2025') || itemYr.includes('178409')));
      return matchSem && matchYr;
    };

    // Build O(1) Fast Lookup Maps with timestamp prioritization (newest teacher edits always win)
    const formativeMap = new Map<string, { val: number; updatedAt: number }>();
    for (let i = 0; i < formativeScores.length; i++) {
      const fs = formativeScores[i];
      if (isMatchingContext(fs.semester, fs.tahun)) {
        const key = `${fs.student_id}_${fs.tp_id}`;
        const time = fs.updated_at ? new Date(fs.updated_at).getTime() : 0;
        const cur = formativeMap.get(key);
        if (!cur || time >= cur.updatedAt || (cur.val === 0 && fs.nilai > 0)) {
          formativeMap.set(key, { val: fs.nilai, updatedAt: time });
        }
      }
    }

    const summativeMap = new Map<string, { val: number; updatedAt: number }>();
    for (let i = 0; i < summativeScores.length; i++) {
      const ss = summativeScores[i];
      if (isMatchingContext(ss.semester, ss.tahun)) {
        const key = `${ss.student_id}_${ss.lingkup_id}`;
        const time = ss.updated_at ? new Date(ss.updated_at).getTime() : 0;
        const cur = summativeMap.get(key);
        if (!cur || time >= cur.updatedAt || (cur.val === 0 && ss.nilai > 0)) {
          summativeMap.set(key, { val: ss.nilai, updatedAt: time });
        }
      }
    }

    const sasMap = new Map<string, { val: number; updatedAt: number }>();
    for (let i = 0; i < semesterScores.length; i++) {
      const ses = semesterScores[i];
      if (ses.subject_id === activeSubjectId && isMatchingContext(ses.semester, ses.tahun)) {
        const key = ses.student_id;
        const time = ses.updated_at ? new Date(ses.updated_at).getTime() : 0;
        const cur = sasMap.get(key);
        if (!cur || time >= cur.updatedAt || (cur.val === 0 && ses.nilai > 0)) {
          sasMap.set(key, { val: ses.nilai, updatedAt: time });
        }
      }
    }

    const q = searchQuery.toLowerCase();
    // Populate rows per student (filteredStudents is already sorted alphabetically A-Z)
    const rows = filteredStudents.map((student, index) => {
      // Find formative scores for each TP
      const studentTpsScores = subjectTps.map(tp => {
        const entry = formativeMap.get(`${student.id}_${tp.id}`);
        const val = entry !== undefined ? entry.val : null;
        return { tpId: tp.id, kode: tp.kode, nilai: val !== undefined && val !== null ? val : null };
      });

      // Calculate formative average
      const validTpsScores = studentTpsScores.filter(s => s.nilai !== null) as { tpId: string; kode: string; nilai: number }[];
      const formativeAverage = validTpsScores.length > 0
        ? Math.round(validTpsScores.reduce((sum, current) => sum + current.nilai, 0) / validTpsScores.length)
        : 0;

      // Find summative scope scores for each scope
      const studentScopeScores = subjectScopes.map(sc => {
        const entry = summativeMap.get(`${student.id}_${sc.id}`);
        const val = entry !== undefined ? entry.val : null;
        return { scopeId: sc.id, nama: sc.nama, nilai: val !== undefined && val !== null ? val : null };
      });

      // Calculate summative scope average
      const validScopeScores = studentScopeScores.filter(s => s.nilai !== null) as { scopeId: string; nama: string; nilai: number }[];
      const scopeAverage = validScopeScores.length > 0
        ? Math.round(validScopeScores.reduce((sum, current) => sum + current.nilai, 0) / validScopeScores.length)
        : 0;

      // Find Semester Score (SAS)
      const sasEntry = sasMap.get(student.id);
      const sasScore = sasEntry !== undefined ? sasEntry.val : null;

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
    }).filter(row => !q || row.nama.toLowerCase().includes(q) || row.nisn.includes(q));

    return {
      headers: {
        tps: subjectTps,
        scopes: subjectScopes
      },
      rows
    };
  }, [currentTab, activeClassId, activeSubjectId, filteredStudents, tps, scopes, formativeScores, summativeScores, semesterScores, context, searchQuery]);

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
                onChange={(e) => handleClassChange(e.target.value)}
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
                onChange={(e) => handleSubjectChange(e.target.value)}
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTpExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer"
                  title="Unduh data TP / format template Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Unduh Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExcelModal('tp')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl cursor-pointer"
                  title="Upload data TP dari file Excel (.xlsx / .csv)"
                >
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  Upload Excel
                </button>
                <button
                  type="button"
                  onClick={() => openModal('add', 'tp', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah TP
                </button>
              </div>
            )}

            {currentTab === 'scope' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportScopeExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer"
                  title="Unduh data Lingkup Materi / format template Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Unduh Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExcelModal('scope')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl cursor-pointer"
                  title="Upload data Lingkup Materi dari file Excel (.xlsx / .csv)"
                >
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  Upload Excel
                </button>
                <button
                  type="button"
                  onClick={() => openModal('add', 'scope', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Lingkup Materi
                </button>
              </div>
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
                  Ekspor Excel
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
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-800">Tujuan Pembelajaran (TP)</h3>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                  {activeTps.length} TP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Daftar capaian untuk {assigned.classes.find(c => c.id === activeClassId)?.nama || 'Kelas'} • {assigned.subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel'}.
              </p>
            </div>
            {activeTps.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportTpExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer transition-colors shadow-xs"
                  title="Unduh daftar TP saat ini ke file Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Unduh Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExcelModal('tp')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl cursor-pointer transition-colors shadow-xs"
                  title="Upload data TP dari berkas Excel (.xlsx / .csv)"
                >
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  Upload Excel
                </button>
                <button
                  type="button"
                  onClick={() => openModal('add', 'tp', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah TP
                </button>
              </div>
            )}
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
                    <td colSpan={3} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Belum Ada Tujuan Pembelajaran (TP)</p>
                        <p className="text-xs text-slate-500 mt-1 mb-4 text-center">
                          Input Tujuan Pembelajaran secara manual atau unggah berkas Excel untuk pengisian massal yang cepat.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <button
                            type="button"
                            onClick={handleExportTpExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh Format Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenExcelModal('tp')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload File Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal('add', 'tp', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Manual
                          </button>
                        </div>
                      </div>
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
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-xl cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('delete', 'tp', tp.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl cursor-pointer"
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
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-800">Daftar Lingkup Materi</h3>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                  {activeScopes.length} Lingkup Materi
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pembagian bab/materi pokok untuk {assigned.classes.find(c => c.id === activeClassId)?.nama || 'Kelas'} • {assigned.subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel'}.
              </p>
            </div>
            {activeScopes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportScopeExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer transition-colors shadow-xs"
                  title="Unduh data Lingkup Materi saat ini ke file Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Unduh Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenExcelModal('scope')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl cursor-pointer transition-colors shadow-xs"
                  title="Upload data Lingkup Materi dari berkas Excel (.xlsx / .csv)"
                >
                  <FileUp className="w-4 h-4 text-indigo-600" />
                  Upload Excel
                </button>
                <button
                  type="button"
                  onClick={() => openModal('add', 'scope', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Lingkup Materi
                </button>
              </div>
            )}
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
                    <td colSpan={2} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                          <Layers className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Belum Ada Lingkup Materi</p>
                        <p className="text-xs text-slate-500 mt-1 mb-4 text-center">
                          Input judul bab materi secara manual atau unggah berkas Excel untuk pengisian massal yang cepat.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <button
                            type="button"
                            onClick={handleExportScopeExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh Format Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenExcelModal('scope')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload File Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => openModal('add', 'scope', '', { class_id: activeClassId, subject_id: activeSubjectId })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Manual
                          </button>
                        </div>
                      </div>
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

      {/* --- FORMATIVE SCORE MODULE (Manual Save) --- */}
      {currentTab === 'formative' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Penginputan Nilai Formatif</h3>
              <p className="text-xs text-slate-500 mt-1">Mengukur kemajuan harian siswa per TP. Masukkan nilai lalu klik tombol <strong>Simpan Nilai Formatif</strong>.</p>
            </div>
            {activeTpId && (
              <div className="flex items-center gap-3">
                {hasUnsavedChanges ? (
                  <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Ada Perubahan Belum Disimpan
                  </span>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Tersimpan
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAllGrades}
                  disabled={isSavingGrades || !activeTpId || filteredStudents.length === 0}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingGrades ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Nilai Formatif
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {!activeTpId ? (
            <div className="text-center py-16 px-6 text-slate-400 text-sm">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              Tujuan Pembelajaran (TP) belum dipilih atau belum dibuat untuk mata pelajaran ini.<br/>
              Harap buat Tujuan Pembelajaran terlebih dahulu melalui tab <strong>Input TP</strong>.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-16">No</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40">NISN</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Nama Lengkap Siswa</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-48 text-center">Nilai Formatif (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Tidak ada siswa terdaftar di kelas ini.</td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, idx) => {
                        return (
                          <tr key={student.id || `std-f-${idx}`} className="hover:bg-slate-50/20 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-500">{student.nisn}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.nama}</td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={localGrades[student.id] ?? ''}
                                onChange={(e) => handleGradeInputChange(student.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveAllGrades();
                                  }
                                }}
                                className="w-28 text-center px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold font-mono bg-white shadow-sm"
                                placeholder="0"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredStudents.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    Total Siswa: <strong>{filteredStudents.length} Siswa</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveAllGrades}
                    disabled={isSavingGrades || !activeTpId}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSavingGrades ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan Nilai...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan Nilai Formatif
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- SUMMATIVE SCOPE SCORE MODULE (Manual Save) --- */}
      {currentTab === 'summative-scope' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Nilai Sumatif Lingkup Materi</h3>
              <p className="text-xs text-slate-500 mt-1">Input nilai akhir bab/materi pembelajaran. Klik tombol <strong>Simpan Nilai Sumatif</strong> untuk memperbarui data.</p>
            </div>
            {activeScopeId && (
              <div className="flex items-center gap-3">
                {hasUnsavedChanges ? (
                  <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Ada Perubahan Belum Disimpan
                  </span>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Tersimpan
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAllGrades}
                  disabled={isSavingGrades || !activeScopeId || filteredStudents.length === 0}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingGrades ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Nilai Sumatif
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {!activeScopeId ? (
            <div className="text-center py-16 px-6 text-slate-400 text-sm">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              Lingkup Materi belum dipilih atau belum dibuat untuk kelas ini.<br/>
              Sila buat Lingkup Materi terlebih dahulu melalui tab <strong>Input Lingkup Materi</strong>.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-16">No</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40">NISN</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Nama Lengkap Siswa</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-48 text-center">Nilai Sumatif Bab (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Tidak ada siswa terdaftar di kelas ini.</td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, idx) => {
                        return (
                          <tr key={student.id || `std-s-${idx}`} className="hover:bg-slate-50/20 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-6 py-4 text-sm font-mono text-slate-500">{student.nisn}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.nama}</td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={localGrades[student.id] ?? ''}
                                onChange={(e) => handleGradeInputChange(student.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveAllGrades();
                                  }
                                }}
                                className="w-28 text-center px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold font-mono bg-white shadow-sm"
                                placeholder="0"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredStudents.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    Total Siswa: <strong>{filteredStudents.length} Siswa</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveAllGrades}
                    disabled={isSavingGrades || !activeScopeId}
                    className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSavingGrades ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menyimpan Nilai...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Simpan Nilai Sumatif
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- SUMMATIVE SEMESTER SCORE MODULE (Manual Save) --- */}
      {currentTab === 'sas' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Nilai Sumatif Akhir Semester (SAS)</h3>
              <p className="text-xs text-slate-500 mt-1">Menginput nilai murni ujian akhir semester. Masukkan nilai lalu klik <strong>Simpan Nilai SAS</strong>.</p>
            </div>
            {activeSubjectId && (
              <div className="flex items-center gap-3">
                {hasUnsavedChanges ? (
                  <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Ada Perubahan Belum Disimpan
                  </span>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Tersimpan
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveAllGrades}
                  disabled={isSavingGrades || !activeSubjectId || filteredStudents.length === 0}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingGrades ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Nilai SAS
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-16">No</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-40">NISN</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider">Nama Lengkap Siswa</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-400 tracking-wider w-48 text-center">Nilai Ujian SAS (0-100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">Tidak ada siswa terdaftar di kelas ini.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      return (
                        <tr key={student.id || `std-sas-${idx}`} className="hover:bg-slate-50/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-mono text-slate-500">{student.nisn}</td>
                          <td className="px-6 py-4 text-sm font-bold text-slate-800">{student.nama}</td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={localGrades[student.id] ?? ''}
                              onChange={(e) => handleGradeInputChange(student.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveAllGrades();
                                }
                              }}
                              className="w-28 text-center px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold font-mono bg-white shadow-sm"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredStudents.length > 0 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-xs font-medium text-slate-500">
                  Total Siswa: <strong>{filteredStudents.length} Siswa</strong>
                </span>
                <button
                  type="button"
                  onClick={handleSaveAllGrades}
                  disabled={isSavingGrades || !activeSubjectId}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSavingGrades ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan Nilai...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Simpan Nilai SAS
                    </>
                  )}
                </button>
              </div>
            )}
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
                  rekapLedger.rows.map((row, rIdx) => (
                    <tr key={row.studentId || `rekap-${rIdx}`} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-center font-mono text-slate-400">{row.no}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{row.nisn}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-800">{row.nama}</td>
                      
                      {/* Formatives */}
                      {row.tpsScores.map((score, sIdx) => (
                        <td key={score.tpId || `tp-${sIdx}`} className="px-2 py-3.5 text-xs font-mono font-semibold text-center text-slate-600">
                          {score.nilai !== null ? score.nilai : '-'}
                        </td>
                      ))}

                      <td className="px-3 py-3.5 text-xs font-mono font-bold text-center text-indigo-700 bg-indigo-50/20">
                        {row.formativeAverage}
                      </td>

                      {/* Summative Scopes */}
                      {row.scopeScores.map((score, scIdx) => (
                        <td key={score.scopeId || `sc-${scIdx}`} className="px-2 py-3.5 text-xs font-mono font-semibold text-center text-slate-600">
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
                  className="font-bold text-indigo-600 dark:text-indigo-400 print:text-black border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-none pb-0.5 text-right min-w-[200px] print:border-none bg-transparent"
                  placeholder="Nama Guru"
                />
                <div className="flex items-center justify-end gap-1 mt-1 print:mt-0.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono text-right">NIP.</span>
                  <input
                    type="text"
                    value={teacherNip}
                    onChange={(e) => handleTeacherNipChange(e.target.value)}
                    className="text-[10px] text-slate-600 dark:text-slate-400 print:text-black font-mono border-b border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 focus:border-indigo-500 outline-none min-w-[160px] print:border-none bg-transparent text-right"
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

      {/* --- EXCEL IMPORT MODAL (FOR TP & LINGKUP MATERI) --- */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          setExcelParsedRows([]);
          setExcelFileName('');
          setExcelError('');
        }}
        title={`Upload Data ${excelImportType === 'tp' ? 'Tujuan Pembelajaran (TP)' : 'Lingkup Materi'} dari Excel`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Active Class & Subject Target Indicator */}
          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div>
              <span className="text-slate-500">Target Impor: </span>
              <strong className="text-indigo-900 font-semibold">
                {assigned.classes.find(c => c.id === activeClassId)?.nama || 'Kelas'} • {assigned.subjects.find(s => s.id === activeSubjectId)?.nama || 'Mapel'}
              </strong>
            </div>
            <button
              type="button"
              onClick={excelImportType === 'tp' ? handleExportTpExcel : handleExportScopeExcel}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 underline cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Contoh Format Excel
            </button>
          </div>

          {/* Drag & Drop File Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFile(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processExcelFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => excelFileInputRef.current?.click()}
            className={`
              p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors
              ${isDraggingFile ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'}
            `}
          >
            <input
              ref={excelFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processExcelFile(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100/60 text-indigo-600 flex items-center justify-center mb-2">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {excelFileName ? excelFileName : 'Pilih atau Seret Berkas Excel ke Sini'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mendukung format Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) atau <strong>.csv</strong>
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {excelError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{excelError}</span>
            </div>
          )}

          {/* Import Mode Selection */}
          {excelParsedRows.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Metode Penyimpanan Data:
              </label>
              <div className="flex flex-col sm:flex-row gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={excelImportMode === 'append'}
                    onChange={() => setExcelImportMode('append')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tambahkan ke data yang sudah ada (Append)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={excelImportMode === 'replace'}
                    onChange={() => setExcelImportMode('replace')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Gantikan seluruh data untuk kelas & mapel ini (Replace)</span>
                </label>
              </div>
            </div>
          )}

          {/* Parsed Preview Table */}
          {excelParsedRows.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pratinjau Data Terdeteksi ({excelParsedRows.filter(r => r.valid).length} baris valid)
                </span>
                <span className="text-[11px] text-slate-400">
                  Pastikan kolom sesuai sebelum disimpan
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 font-semibold border-b border-slate-200">
                    {excelImportType === 'tp' ? (
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">No</th>
                        <th className="py-2 px-3 w-24">Kode TP</th>
                        <th className="py-2 px-3">Deskripsi Capaian</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="py-2 px-3 w-12 text-center">No</th>
                        <th className="py-2 px-3">Nama Lingkup Materi / Bab</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {excelImportType === 'tp' ? (
                      excelParsedRows.map((row, idx) => (
                        <tr key={idx} className={row.valid ? 'hover:bg-slate-50/50' : 'bg-rose-50/50 text-rose-600'}>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold font-mono text-indigo-600">{row.kode || '-'}</td>
                          <td className="py-2 px-3 text-slate-700 leading-relaxed">{row.deskripsi || '(Kosong)'}</td>
                        </tr>
                      ))
                    ) : (
                      excelParsedRows.map((row, idx) => (
                        <tr key={idx} className={row.valid ? 'hover:bg-slate-50/50' : 'bg-rose-50/50 text-rose-600'}>
                          <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.nama || '(Kosong)'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsExcelModalOpen(false);
                setExcelParsedRows([]);
                setExcelFileName('');
                setExcelError('');
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={excelParsedRows.filter(r => r.valid).length === 0}
              onClick={handleCommitExcelImport}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Simpan ke Database ({excelParsedRows.filter(r => r.valid).length})
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
