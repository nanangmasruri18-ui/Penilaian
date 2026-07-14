import React, { useState } from 'react';
import { db, logAudit } from '../db';
import { Profile } from '../types';
import { GraduationCap, Lock, Mail, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (profile: Profile) => void;
  addToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, addToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('error', 'Login Gagal', 'Harap isi semua field.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const profiles = db.getProfiles();
      const matchedProfile = profiles.find(p => p.email.toLowerCase() === email.trim().toLowerCase());

      if (!matchedProfile) {
        addToast('error', 'Login Gagal', 'Email tidak terdaftar.');
        setLoading(false);
        return;
      }

      // Match mock passwords
      let isCorrect = false;
      if (matchedProfile.role === 'Admin' && password === 'admin123') {
        isCorrect = true;
      } else if (matchedProfile.role === 'Guru' && password === 'guru123') {
        isCorrect = true;
      }

      if (isCorrect) {
        db.setSession(matchedProfile);
        logAudit(matchedProfile.nama, 'Berhasil masuk ke aplikasi.');
        addToast('success', 'Selamat Datang', `Berhasil masuk sebagai ${matchedProfile.nama} (${matchedProfile.role}).`);
        onLoginSuccess(matchedProfile);
      } else {
        addToast('error', 'Login Gagal', 'Kata sandi salah. Gunakan password "admin123" untuk Admin atau "guru123" untuk Guru.');
      }
      setLoading(false);
    }, 600);
  };

  const handleQuickFill = (role: 'Admin' | 'Guru') => {
    if (role === 'Admin') {
      setEmail('admin@sekolah.sch.id');
      setPassword('admin123');
      addToast('info', 'Uji Coba Admin', 'Form diisi otomatis dengan akun Administrator.');
    } else {
      setEmail('guru@sekolah.sch.id');
      setPassword('guru123');
      addToast('info', 'Uji Coba Guru', 'Form diisi otomatis dengan akun Guru (Budi Santoso, S.Pd.).');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 mb-6"
          >
            <GraduationCap className="h-9 w-9 text-white" />
          </motion.div>
          
          <motion.h2 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-3xl font-bold text-slate-900 tracking-tight font-display"
          >
            Sistem Penilaian SD
          </motion.h2>
          
          <motion.p 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-2 text-sm text-slate-500"
          >
            Kurikulum Merdeka • Portal Guru & Administrator
          </motion.p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/50"
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all bg-slate-50/50 focus:bg-white"
                  placeholder="nama@sekolah.sch.id"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm transition-all bg-slate-50/50 focus:bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-100 disabled:opacity-70 disabled:cursor-wait"
              >
                {loading ? 'Menghubungkan...' : 'Masuk Aplikasi'}
                {!loading && <ChevronRight className="ml-1.5 h-5 w-5 flex-shrink-0" />}
              </button>
            </div>
          </form>

          {/* Quick Access Sandbox Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Uji Coba Masuk Cepat
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickFill('Admin')}
                className="flex flex-col items-center justify-center p-3 border border-slate-200/80 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center group"
              >
                <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Sebagai Admin</span>
                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">admin@sekolah.sch.id</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('Guru')}
                className="flex flex-col items-center justify-center p-3 border border-slate-200/80 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-center group"
              >
                <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Sebagai Guru</span>
                <span className="text-[10px] text-slate-400 mt-0.5 font-mono">guru@sekolah.sch.id</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
