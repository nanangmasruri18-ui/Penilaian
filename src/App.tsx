import { useState, useEffect, useMemo } from 'react';
import { 
  Profile, Teacher, Class, Subject, Student, TeacherAssignment, 
  AcademicYear, Semester, FormativeScore, SummativeScopeScore, SemesterScore 
} from './types';
import { 
  initializeDatabase, db, getActiveContext, getTeacherForUser, 
  getTeacherAssignedClassesAndSubjects, logAudit 
} from './db';
import { supabase, pullFromSupabase, pushToSupabase, getSyncStatus, SyncStatus } from './supabase';
import { Login } from './components/Login';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { AdminModules } from './components/AdminModules';
import { GuruModules } from './components/GuruModules';
import { SupabaseSync } from './components/SupabaseSync';
import { 
  GraduationCap, LogOut, Sun, Moon, Menu, X, LayoutDashboard, 
  Users, Layers, BookOpen, Calendar, Clock, History, Settings, 
  Sliders, User, Shield, Info, Database, AlertTriangle, ArrowRight, CheckCircle, Flame,
  Sparkles, FileText, Trophy, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [sessionUser, setSessionUser] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('merdeka_theme') === 'dark';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());

  // Statistics State for Dynamic Dashboard counts
  const [stats, setStats] = useState({
    teachersCount: 0,
    studentsCount: 0,
    classesCount: 0,
    subjectsCount: 0,
    activeYearName: '',
    activeSemesterName: ''
  });

  // Load app & check active session
  useEffect(() => {
    // Run DB initialization if not present
    initializeDatabase();
    
    // Check active session
    const activeSession = db.getSession();
    if (activeSession) {
      setSessionUser(activeSession);
      setActiveTab('dashboard');
    }

    refreshStats();

    // Auto-pull from Supabase on startup to sync the newest cloud state if table is active
    const autoPullOnStart = async () => {
      try {
        const { data, error } = await supabase.from('merdeka_store').select('key').limit(1);
        if (!error && data && data.length > 0) {
          const success = await pullFromSupabase();
          if (success) {
            refreshStats();
            const session = db.getSession();
            if (session) setSessionUser(session);
          }
        }
      } catch (err) {
        console.warn('[Supabase Auto-Sync] Background pull skipped or failed.', err);
      }
    };

    autoPullOnStart();

    // Event listener for manual sync reload trigger and status change
    const handleDbSynced = () => {
      refreshStats();
      const session = db.getSession();
      setSessionUser(session);
      setSyncStatus(getSyncStatus());
    };

    const handleSyncStatusChange = () => {
      setSyncStatus(getSyncStatus());
    };

    window.addEventListener('merdeka_db_synced', handleDbSynced);
    window.addEventListener('supabase_sync_changed', handleSyncStatusChange);
    return () => {
      window.removeEventListener('merdeka_db_synced', handleDbSynced);
      window.removeEventListener('supabase_sync_changed', handleSyncStatusChange);
    };
  }, []);

  // Sync theme to root class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('merdeka_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('merdeka_theme', 'light');
    }
  }, [darkMode]);

  // Recalculate statistics helper
  const refreshStats = () => {
    const teachers = db.getTeachers();
    const students = db.getStudents();
    const classes = db.getClasses();
    const subjects = db.getSubjects();
    const context = getActiveContext();

    setStats({
      teachersCount: teachers.length,
      studentsCount: students.length,
      classesCount: classes.length,
      subjectsCount: subjects.length,
      activeYearName: context.year?.nama || 'Belum Diatur',
      activeSemesterName: context.semester?.nama || 'Belum Diatur'
    });
  };

  // Toast Stack Helpers
  const addToast = (type: ToastType, title: string, message: string) => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Logout routine
  const handleLogout = () => {
    if (sessionUser) {
      logAudit(sessionUser.nama, 'Keluar dari aplikasi.');
      addToast('info', 'Sampai Jumpa', `Sesi ${sessionUser.nama} telah ditutup.`);
    }
    db.setSession(null);
    setSessionUser(null);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
  };

  // Login callback
  const handleLoginSuccess = (profile: Profile) => {
    setSessionUser(profile);
    setActiveTab('dashboard');
    refreshStats();
  };

  // Hard Reset Database to Seeds
  const handleResetDatabase = () => {
    const confirm = window.confirm('PENTING! Tindakan ini akan mengembalikan seluruh data penilaian ke setelan pabrik dan menghapus semua input nilai baru Anda. Lanjutkan reset?');
    if (confirm) {
      initializeDatabase(true);
      refreshStats();
      addToast('success', 'Database Direset', 'Semua data telah dikembalikan ke kondisi seed bawaan.');
      if (sessionUser) {
        // Force refresh session
        const p = db.getProfiles().find(prof => prof.email === sessionUser.email);
        if (p) {
          setSessionUser(p);
        } else {
          handleLogout();
        }
      }
    }
  };

  // Compute stats for Teacher Dashboard (Progress tracker)
  const teacherStats = useMemo(() => {
    if (!sessionUser || sessionUser.role !== 'Guru') return null;
    const teacherObj = getTeacherForUser(sessionUser.id);
    if (!teacherObj) return null;

    const assignedObj = getTeacherAssignedClassesAndSubjects(teacherObj.id);
    const studentsList = db.getStudents();
    const allFormativeScores = db.getFormativeScores();
    const allLearningObjectives = db.getLearningObjectives();
    const context = getActiveContext();

    // Map through each assigned class-subject combo to calculate grading progress
    const progressList = assignedObj.assignments.map(asg => {
      const cls = db.getClasses().find(c => c.id === asg.class_id);
      const sub = db.getSubjects().find(s => s.id === asg.subject_id);
      
      const classStudents = studentsList.filter(s => s.kelas_id === asg.class_id);
      const subjectTps = allLearningObjectives.filter(t => t.class_id === asg.class_id && t.subject_id === asg.subject_id);

      // Total expected grades: students * active TPs
      const totalExpected = classStudents.length * subjectTps.length;
      
      // Count filled grades in active year & semester
      let filledCount = 0;
      classStudents.forEach(student => {
        subjectTps.forEach(tp => {
          const exists = allFormativeScores.some(
            s => s.student_id === student.id && 
                 s.tp_id === tp.id && 
                 s.semester === (context.semester?.id || '') && 
                 s.tahun === (context.year?.id || '')
          );
          if (exists) filledCount++;
        });
      });

      const percentage = totalExpected > 0 ? Math.round((filledCount / totalExpected) * 100) : 0;

      return {
        id: asg.id,
        className: cls?.nama || 'Kelas',
        subjectName: sub?.nama || 'Mapel',
        studentsCount: classStudents.length,
        tpsCount: subjectTps.length,
        progressPercentage: percentage
      };
    });

    // Total unique students taught
    const uniqueClassIds = Array.from(new Set(assignedObj.assignments.map(a => a.class_id)));
    const totalTaughtStudents = studentsList.filter(s => uniqueClassIds.includes(s.kelas_id)).length;

    return {
      classesCount: assignedObj.classes.length,
      subjectsCount: assignedObj.subjects.length,
      studentsCount: totalTaughtStudents,
      progressList
    };
  }, [sessionUser, stats]); // recompute when base stats or user changes

  // Compute data for Admin Dashboard: Top 10 students with the highest scores
  const topStudentsData = useMemo(() => {
    const students = db.getStudents();
    const classes = db.getClasses();
    const tps = db.getLearningObjectives();
    const scopes = db.getMaterialScopes();
    const formativeScores = db.getFormativeScores();
    const summativeScores = db.getSummativeScopeScores();
    const semesterScores = db.getSemesterScores();
    const assignments = db.getAssignments();
    const context = getActiveContext();

    const semId = context.semester?.id || 'sem-ganjil';
    const yrId = context.year?.id || 'th-2025';

    const list = students.map(student => {
      const cls = classes.find(c => c.id === student.kelas_id);
      
      // Find subjects assigned to this class
      const classSubjectIds = Array.from(new Set(
        assignments.filter(a => a.class_id === student.kelas_id).map(a => a.subject_id)
      ));

      let totalSubjectGradesSum = 0;
      let gradedSubjectsCount = 0;

      classSubjectIds.forEach(subId => {
        // Formative TP scores
        const subTps = tps.filter(t => t.class_id === student.kelas_id && t.subject_id === subId);
        const tpScores = subTps
          .map(tp => {
            const f = formativeScores.find(fs => fs.student_id === student.id && fs.tp_id === tp.id && fs.semester === semId && fs.tahun === yrId);
            return f ? f.nilai : null;
          })
          .filter(v => v !== null) as number[];

        const formativeAvg = tpScores.length > 0 ? tpScores.reduce((a, b) => a + b, 0) / tpScores.length : 0;

        // Summative scope scores
        const subScopes = scopes.filter(sc => sc.class_id === student.kelas_id && sc.subject_id === subId);
        const scopeScores = subScopes
          .map(sc => {
            const s = summativeScores.find(ss => ss.student_id === student.id && ss.lingkup_id === sc.id && ss.semester === semId && ss.tahun === yrId);
            return s ? s.nilai : null;
          })
          .filter(v => v !== null) as number[];

        const scopeAvg = scopeScores.length > 0 ? scopeScores.reduce((a, b) => a + b, 0) / scopeScores.length : 0;

        // SAS score
        const sasObj = semesterScores.find(s => s.student_id === student.id && s.subject_id === subId && s.semester === semId && s.tahun === yrId);
        const sasScore = sasObj ? sasObj.nilai : null;

        // Only compute if there is at least one grade in this subject (either formative, scope, or SAS)
        const hasFormative = tpScores.length > 0;
        const hasScope = scopeScores.length > 0;
        const hasSas = sasScore !== null;

        if (hasFormative || hasScope || hasSas) {
          const finalScore = Math.round(
            (formativeAvg * 0.4) +
            (scopeAvg * 0.4) +
            ((sasScore || 0) * 0.2)
          );
          totalSubjectGradesSum += finalScore;
          gradedSubjectsCount++;
        }
      });

      const averageGrade = gradedSubjectsCount > 0 ? Math.round(totalSubjectGradesSum / gradedSubjectsCount) : 0;

      return {
        id: student.id,
        name: student.nama,
        nisn: student.nisn,
        className: cls?.nama || 'Kelas ?',
        averageGrade,
        gradedSubjectsCount
      };
    });

    // Sort by averageGrade descending, and take top 10
    return list
      .sort((a, b) => b.averageGrade - a.averageGrade)
      .slice(0, 10);
  }, [stats]);

  const handleSupabasePush = async () => {
    const confirm = window.confirm('Apakah Anda yakin ingin MENGIRIM seluruh data lokal Anda ke Supabase? Tindakan ini akan menimpa data yang ada di cloud.');
    if (!confirm) return;

    const user = sessionUser ? sessionUser.nama : 'System';
    logAudit(user, 'Memulai pengiriman (push) data lokal ke Supabase dari Dashboard.');
    
    const success = await pushToSupabase();
    if (success) {
      addToast('success', 'Sinkronisasi Berhasil', 'Data lokal Anda telah berhasil dicadangkan ke Supabase!');
      logAudit(user, 'Sukses mengirim data lokal ke Supabase dari Dashboard.');
      refreshStats();
    } else {
      const currentStatus = getSyncStatus();
      addToast('error', 'Sinkronisasi Gagal', currentStatus.errorMessage || 'Gagal mengirim data.');
      logAudit(user, `Gagal mengirim data ke Supabase dari Dashboard: ${currentStatus.errorMessage}`);
    }
  };

  const handleSupabasePull = async () => {
    const confirm = window.confirm('Apakah Anda yakin ingin MENARIK data dari Supabase? Data di aplikasi Anda saat ini akan sepenuhnya diganti oleh data dari cloud.');
    if (!confirm) return;

    const user = sessionUser ? sessionUser.nama : 'System';
    logAudit(user, 'Memulai penarikan (pull) data dari Supabase dari Dashboard.');

    const success = await pullFromSupabase();
    if (success) {
      addToast('success', 'Data Diunduh', 'Berhasil memperbarui database lokal dengan data dari Supabase!');
      logAudit(user, 'Sukses mengunduh dan menerapkan data dari Supabase dari Dashboard.');
      refreshStats();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      const currentStatus = getSyncStatus();
      addToast('error', 'Gagal Mengunduh', currentStatus.errorMessage || 'Gagal menarik data.');
      logAudit(user, `Gagal menarik data dari Supabase dari Dashboard: ${currentStatus.errorMessage}`);
    }
  };

  // Sidebar navigations
  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'guru', label: 'Data Guru', icon: Users },
    { id: 'kelas', label: 'Data Kelas', icon: Layers },
    { id: 'siswa', label: 'Data Siswa', icon: GraduationCap },
    { id: 'subject', label: 'Mata Pelajaran', icon: BookOpen },
    { id: 'academic-year', label: 'Tahun Pelajaran', icon: Calendar },
    { id: 'semester', label: 'Semester', icon: Clock },
    { id: 'assignment', label: 'Penugasan Guru', icon: Sliders },
    { id: 'rekap', label: 'Rekapitulasi Nilai', icon: FileText },
    { id: 'supabase', label: 'Database Supabase', icon: Database },
    { id: 'logs', label: 'Log Aktivitas', icon: History },
    { id: 'profil', label: 'Profil Saya', icon: User }
  ];

  const guruMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tp', label: 'Input TP (Tujuan)', icon: Sliders },
    { id: 'scope', label: 'Input Lingkup Materi', icon: Layers },
    { id: 'formative', label: 'Nilai Formatif', icon: CheckCircle },
    { id: 'summative-scope', label: 'Nilai Sumatif LM', icon: Flame },
    { id: 'sas', label: 'Nilai Sumatif Akhir', icon: Sparkles },
    { id: 'rekap', label: 'Rekapitulasi Nilai', icon: FileText },
    { id: 'supabase', label: 'Database Supabase', icon: Database },
    { id: 'profil', label: 'Profil Saya', icon: User }
  ];

  const activeMenuItems = sessionUser?.role === 'Admin' ? adminMenuItems : guruMenuItems;

  // Render Login page if not authenticated
  if (!sessionUser) {
    return (
      <div className={`${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
        <Login onLoginSuccess={handleLoginSuccess} addToast={addToast} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* GLOBAL TOAST NOTIFIER */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* NAVBAR ATAS (no-print) */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm no-print">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Menu Hamburger mobile & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-150">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold font-display tracking-tight text-slate-900 dark:text-white hidden sm:inline">Kurikulum Merdeka</span>
            </div>
          </div>

          {/* Active Context Banner & Actions */}
          <div className="flex items-center gap-4">
            
            {/* Context Widget (Year & Semester) */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>TP: {stats.activeYearName}</span>
              <span className="mx-1 text-slate-300 dark:text-slate-600">•</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Sem: {stats.activeSemesterName}</span>
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Ganti Tema Visual"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* User Account Info */}
            <div className="flex items-center gap-2.5 border-l border-slate-150 dark:border-slate-800 pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{sessionUser.nama}</p>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider">{sessionUser.role}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold uppercase select-none text-sm">
                {sessionUser.nama.charAt(0)}
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* INNER WRAPPER */}
      <div className="flex-1 flex flex-row">
        
        {/* SIDEBAR KIRI (Desktop & Mobile Drawer - no-print) */}
        <aside className={`
          fixed md:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 border-r border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 transition-transform duration-300 z-30 no-print
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 flex flex-col h-full justify-between overflow-y-auto">
            
            {/* Menu Items */}
            <nav className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Menu Utama</p>
              {activeMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3.5 py-3 text-sm font-semibold rounded-xl transition-all
                      ${isActive 
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Logout and Sandbox config footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              
              {/* Force Reset DB for Admin */}
              {sessionUser.role === 'Admin' && (
                <button
                  onClick={handleResetDatabase}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/20"
                >
                  <Database className="w-3.5 h-3.5" />
                  Reset Database
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all border border-transparent"
              >
                <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                Keluar Aplikasi
              </button>
            </div>

          </div>
        </aside>

        {/* Backdrop for Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-20 md:hidden no-print"
          />
        )}

        {/* MAIN BODY AREA */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* ================= TAB 1: DASHBOARD ================= */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  
                  {/* Dynamic greeting header */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">Selamat Datang, {sessionUser.nama}!</h1>
                      <p className="text-slate-300 text-sm mt-1">Anda masuk selaku <strong className="text-white font-mono uppercase tracking-wider">{sessionUser.role}</strong> sekolah SD Kurikulum Merdeka.</p>
                    </div>
                    <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-mono">
                      Kalender: {stats.activeYearName} • Sem: {stats.activeSemesterName}
                    </div>
                  </div>

                  {/* ADMIN STATS CARDS */}
                  {sessionUser.role === 'Admin' && (
                    <>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase">Total Guru</p>
                            <p className="text-2xl font-bold font-display mt-0.5 text-slate-900 dark:text-white">{stats.teachersCount}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <GraduationCap className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase">Total Siswa</p>
                            <p className="text-2xl font-bold font-display mt-0.5 text-slate-900 dark:text-white">{stats.studentsCount}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase">Total Kelas</p>
                            <p className="text-2xl font-bold font-display mt-0.5 text-slate-900 dark:text-white">{stats.classesCount}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase">Mapel Sekolah</p>
                            <p className="text-2xl font-bold font-display mt-0.5 text-slate-900 dark:text-white">{stats.subjectsCount}</p>
                          </div>
                        </div>
                      </div>

                      {/* ADMIN GRAPHICS (Bespoke Top 10 highest-scoring students table & Bento Grid) */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* 10 Siswa dengan Nilai Tertinggi */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-2 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100/50 dark:border-amber-900/30">
                              <Trophy className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">10 Siswa Nilai Tertinggi</h3>
                              <p className="text-xs text-slate-500">Rekapitulasi peringkat 10 siswa dengan rata-rata nilai mata pelajaran tertinggi.</p>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-450 dark:text-slate-400">
                                  <th className="py-3 text-xs font-bold uppercase w-14 text-center">Rank</th>
                                  <th className="py-3 px-3 text-xs font-bold uppercase">Nama Siswa</th>
                                  <th className="py-3 px-3 text-xs font-bold uppercase text-center w-28">Kelas</th>
                                  <th className="py-3 px-3 text-xs font-bold uppercase text-center w-28">Rata-Rata</th>
                                  <th className="py-3 px-3 text-xs font-bold uppercase text-center w-28">Aktif Mapel</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {topStudentsData.length === 0 || topStudentsData.every(s => s.averageGrade === 0) ? (
                                  <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500">
                                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 mb-3 border border-slate-100 dark:border-slate-800">
                                          <Award className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Belum Ada Data Nilai</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Guru perlu menginput data Tujuan Pembelajaran (TP), lingkup materi, dan nilai terlebih dahulu.</p>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  topStudentsData.map((student, idx) => {
                                    const rank = idx + 1;
                                    let rankBadgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                                    if (rank === 1) rankBadgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 font-extrabold';
                                    else if (rank === 2) rankBadgeColor = 'bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 border border-slate-300/30 font-bold';
                                    else if (rank === 3) rankBadgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30 font-bold';

                                    let gradeBadgeColor = 'bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400';
                                    if (student.averageGrade >= 85) {
                                      gradeBadgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30';
                                    } else if (student.averageGrade >= 75) {
                                      gradeBadgeColor = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30';
                                    } else if (student.averageGrade > 0) {
                                      gradeBadgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30';
                                    }

                                    return (
                                      <tr key={student.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="py-3 text-center">
                                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${rankBadgeColor}`}>
                                            {rank}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.name}</div>
                                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">NISN: {student.nisn || '-'}</div>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <span className="inline-flex px-2 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-bold border border-slate-200/50 dark:border-slate-800">
                                            {student.className}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-bold rounded-xl border ${gradeBadgeColor}`}>
                                            {student.averageGrade}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-450">
                                            {student.gradedSubjectsCount} Mapel
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bento Quick Guide panel */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Informasi Admin</h3>
                          
                          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p>Selaku administrator sekolah, Anda memiliki tanggung jawab penuh untuk memelihara integritas database data primer.</p>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                              <p className="font-bold text-slate-800 dark:text-slate-200">Alur Awal Kurikulum:</p>
                              <ol className="list-decimal list-inside space-y-1">
                                <li>Daftarkan Guru baru</li>
                                <li>Daftarkan Kelas & Rombel</li>
                                <li>Input Siswa (atau Impor Excel)</li>
                                <li>Buat Penugasan Guru Mengajar</li>
                              </ol>
                            </div>
                            <p className="text-[10px] text-slate-400">Pastikan Tahun Pelajaran aktif dan Semester aktif sudah sesuai sebelum guru mengisi nilai.</p>
                          </div>
                        </div>

                      </div>
                    </>
                  )}

                  {/* GURU DASHBOARD VIEWS */}
                  {sessionUser.role === 'Guru' && teacherStats && (
                    <>
                      {/* Teacher overview summaries */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase">Kelas Diampu</p>
                            <p className="text-xl font-bold font-display mt-0.5 text-slate-900 dark:text-white">{teacherStats.classesCount} Rombel</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase">Mata Pelajaran</p>
                            <p className="text-xl font-bold font-display mt-0.5 text-slate-900 dark:text-white">{teacherStats.subjectsCount} Mapel</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase">Total Siswa Diampu</p>
                            <p className="text-xl font-bold font-display mt-0.5 text-slate-900 dark:text-white">{teacherStats.studentsCount} Siswa</p>
                          </div>
                        </div>
                      </div>

                      {/* DYNAMIC PROGRESS MONITORING PER CLASS-MAPEL (Grades fill progress bar) */}
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Progress Pengisian Nilai Formatif</h3>
                          <p className="text-xs text-slate-500">Melacak persentase kelengkapan penginputan nilai formatif siswa berdasarkan Tujuan Pembelajaran (TP) aktif.</p>
                        </div>

                        {teacherStats.progressList.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs">
                            Anda belum memiliki penugasan mengajar terdaftar. Hubungi Admin untuk konfigurasi kelas mengajar.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teacherStats.progressList.map(item => (
                              <div key={item.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.className}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{item.subjectName} • {item.tpsCount} Indikator TP</p>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                                    {item.progressPercentage}%
                                  </span>
                                </div>

                                {/* Horizontal progress tracker */}
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                                    style={{ width: `${item.progressPercentage}%` }}
                                  />
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-slate-400">
                                  <span>Jumlah Siswa: {item.studentsCount}</span>
                                  <span>{item.progressPercentage === 100 ? 'Lengkap Terisi' : 'Sila lengkapi di form nilai'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* QUICK ACCESS ACTION BOARD */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-6 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/20">
                    <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Sliders className="w-4 h-4" />
                      Pintasan Menu Cepat
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {sessionUser.role === 'Admin' ? (
                        <>
                          <button onClick={() => setActiveTab('siswa')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Impor Siswa</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Massal dari Excel</span>
                          </button>
                          <button onClick={() => setActiveTab('guru')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Tambah Guru</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Input akun pengampu</span>
                          </button>
                          <button onClick={() => setActiveTab('assignment')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Penugasan Guru</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Atur kelas mapel</span>
                          </button>
                          <button onClick={() => setActiveTab('logs')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Log Aktivitas</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Sistem Audit Log</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setActiveTab('formative')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Nilai Formatif</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Input nilai kompetensi</span>
                          </button>
                          <button onClick={() => setActiveTab('summative-scope')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Nilai Sumatif LM</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Input nilai per bab</span>
                          </button>
                          <button onClick={() => setActiveTab('sas')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Nilai SAS</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Input ujian akhir</span>
                          </button>
                          <button onClick={() => setActiveTab('rekap')} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl text-left hover:border-indigo-200 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">Cetak Rekap</span>
                            <span className="text-[10px] text-slate-400 mt-1 block">Cetak PDF/A4 Excel</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* ================= TAB 2: OTHER MODULES ================= */}
              {activeTab !== 'dashboard' && (
                <div className="space-y-6">
                  {/* Dynamic sub-header with back button */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-5 no-print">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight uppercase">
                        {sessionUser.role === 'Admin' 
                          ? adminMenuItems.find(i => i.id === activeTab)?.label || 'Aplikasi'
                          : guruMenuItems.find(i => i.id === activeTab)?.label || 'Aplikasi'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">Portal Penilaian SD Kurikulum Merdeka Belajar.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Batal & Dashboard
                    </button>
                  </div>

                  {/* Render modules dynamically based on user role or custom Supabase sync module */}
                  {activeTab === 'supabase' ? (
                    <SupabaseSync 
                      addToast={addToast} 
                      onRefreshStats={refreshStats} 
                    />
                  ) : sessionUser.role === 'Admin' ? (
                    <AdminModules 
                      currentTab={activeTab} 
                      addToast={addToast} 
                      onRefreshStats={refreshStats} 
                    />
                  ) : (
                    <GuruModules 
                      currentTab={activeTab} 
                      addToast={addToast} 
                      onRefreshStats={refreshStats} 
                    />
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </main>
      </div>

    </div>
  );
}
