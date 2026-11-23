import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { User, Gender } from '../../types';
import { auth, googleProvider } from '../../firebase';
import {
  getStoredUsers,
  setCurrentUser,
  cacheUsersLocally,
} from '../../services/storage';
import {
  fetchAllUsersFromFirestore,
  upsertGoogleUserToFirestore,
  upsertSingleUserToFirestore,
} from '../../services/firestoreSync';
import {
  Lock,
  Mail,
  User as UserIcon,
  Building2,
  Phone,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface Props {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<Props> = ({ onSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up form state (default role is strictly 'user')
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<Gender>('Laki-laki');
  const [age, setAge] = useState<number | ''>(26);
  const [institution, setInstitution] = useState('');
  const [phone, setPhone] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      // Ambil daftar pengguna terbaru dari Firestore agar multi-device selalu sinkron
      let users = getStoredUsers();
      try {
        const remoteUsers = await fetchAllUsersFromFirestore();
        if (remoteUsers.length > 0) {
          users = remoteUsers;
        }
      } catch {
        // Fallback ke local cache jika sedang offline
      }

      const user = users.find(
        (u) => u.email.trim().toLowerCase() === cleanEmail && u.password === loginPassword
      );

      if (!user) {
        setError('Username/email atau password tidak sesuai. Silakan periksa kembali.');
        return;
      }

      if (user.status === 'Tidak Aktif') {
        setError(
          'Akun Anda berstatus Tidak Aktif. Hubungi Administrator BPS Kabupaten Aceh Besar untuk aktivasi kembali.'
        );
        return;
      }

      const now = new Date().toISOString();
      const activeUser: User = { ...user, lastLogin: now };
      const updatedUsers = users.map((u) => (u.id === user.id ? activeUser : u));
      await upsertSingleUserToFirestore(activeUser);

      const sessionUser =
        activeUser.role === 'admin' ? activeUser : { ...activeUser, password: '' };
      const cacheList =
        activeUser.role === 'admin'
          ? updatedUsers
          : updatedUsers.map((u) => ({ ...u, password: '' }));
      cacheUsersLocally(cacheList);
      setCurrentUser(sessionUser);
      onSuccess(sessionUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const localUsers = getStoredUsers();
      const { user, error: upsertError } = await upsertGoogleUserToFirestore(
        result.user,
        localUsers
      );

      if (upsertError) {
        setError(upsertError);
        return;
      }

      // Perbarui cache lokal pengguna (scrub password jika bukan admin)
      const sanitizedUser = user.role === 'admin' ? user : { ...user, password: '' };
      const existsLocally = localUsers.some((u) => u.id === user.id);
      const nextList = existsLocally
        ? localUsers.map((u) => (u.id === user.id ? sanitizedUser : u))
        : [sanitizedUser, ...localUsers];
      cacheUsersLocally(
        user.role === 'admin' ? nextList : nextList.map((u) => ({ ...u, password: '' }))
      );

      setCurrentUser(sanitizedUser);
      onSuccess(sanitizedUser);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Proses masuk dengan Google dibatalkan.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Popup browser terblokir. Izinkan popup untuk masuk menggunakan akun Google.');
      } else {
        setError(`Gagal masuk dengan Google: ${err?.message || 'Terjadi kesalahan autentikasi'}`);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Mohon lengkapi semua kolom yang bertanda bintang (*).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password yang Anda masukkan.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal harus 6 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      let users = getStoredUsers();
      try {
        const remoteUsers = await fetchAllUsersFromFirestore();
        if (remoteUsers.length > 0) {
          users = remoteUsers;
        }
      } catch {
        // Fallback ke local cache
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = users.find((u) => u.email.trim().toLowerCase() === cleanEmail);
      if (existing) {
        setError('Email sudah terdaftar dalam sistem. Silakan login atau gunakan email lain.');
        return;
      }

      const now = new Date().toISOString();
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'user', // strictly role user for public sign up!
        gender,
        age: Number(age) || 25,
        institution: institution.trim() || 'Umum / Peneliti Mandiri',
        phone: phone.trim() || '-',
        usagePurpose: 'Umum',
        status: 'Aktif',
        authProvider: 'password',
        createdAt: now,
        lastLogin: now,
      };

      await upsertSingleUserToFirestore(newUser);
      const sessionUser: User = { ...newUser, password: '' };
      const scrubbedCache = [sessionUser, ...users].map((u) => ({ ...u, password: '' }));
      cacheUsersLocally(scrubbedCache);
      setCurrentUser(sessionUser);
      setSuccessMsg('Pendaftaran berhasil! Akun pengguna Anda telah aktif.');
      setTimeout(() => {
        onSuccess(sessionUser);
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="w-full max-w-lg text-center mb-5 z-10 px-2">
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 mb-3 shadow-lg">
          <img
            src="/pwa-192x192.png"
            alt="Logo SEULAWAH"
            className="w-10 h-10 rounded-xl border border-white/25 object-cover shadow-xs shrink-0"
          />
          <div className="text-left min-w-0">
            <h1 className="text-white font-extrabold text-sm sm:text-base leading-tight tracking-wide truncate">
              BADAN PUSAT STATISTIK
            </h1>
            <p className="text-orange-300 text-xs font-semibold truncate">KABUPATEN ACEH BESAR (1108)</p>
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
          SEULAWAH
        </h2>
        <p className="text-orange-300 font-bold text-xs sm:text-sm mt-0.5 leading-snug max-w-md mx-auto">
          Sistem Ekonomi Unggulan dan Layanan Analisis Wilayah Aceh Besar
        </p>
        <p className="text-slate-300 text-[11px] sm:text-xs mt-1.5">
          Akses visualisasi PDRB, Tipologi Klassen, LQ, DLQ, Shift-Share &amp; Daftar Indikator
        </p>
      </div>

      {/* Main Form Container */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 transition-all">
        {/* Tab switch between Login and Sign Up */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(true);
              setError(null);
            }}
            className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
              isLoginMode
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Masuk (Login)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(false);
              setError(null);
            }}
            className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 ${
              !isLoginMode
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Daftar (Sign Up)</span>
          </button>
        </div>

        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isLoginMode ? (
            /* LOGIN FORM */
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Username / Email Akun
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Masukkan username atau email terdaftar"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan password akun Anda"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[46px] py-2.5 bg-blue-800 hover:bg-blue-900 disabled:opacity-60 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">
                  atau
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Google Sign-In Button (Default role: user) */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full min-h-[46px] py-2.5 px-4 bg-white hover:bg-slate-50 disabled:opacity-60 active:scale-[0.99] text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-xs transition flex items-center justify-center gap-2.5"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Menghubungkan Google...' : 'Masuk dengan Google'}</span>
              </button>
              <p className="text-[11px] text-center text-slate-400">
                Login dengan Google otomatis mendapatkan akses <strong>Role: User</strong> (dapat diakses dari perangkat mana saja).
              </p>
            </div>
          ) : (
            /* SIGN UP FORM (DEFAULT ROLE: USER) */
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 text-[11px] text-blue-950 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p>
                  Pendaftaran mandiri (Sign Up) otomatis berstatus akun <strong>Role: User</strong>. Perubahan hak akses menjadi Admin hanya dapat dilakukan oleh Administrator.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Muhammad Razi, S.E"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Akun <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Umur (Tahun) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={99}
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Contoh: 28"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Asal Instansi <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Bappeda / USK / Umum"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Handphone / WA
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Akun <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ulangi Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-slate-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 active:scale-[0.99] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Mendaftarkan...' : 'Daftar Sekarang (Role: User)'}</span>
              </button>
            </form>
          )}
        </div>

        {/* PWA download strip in modal footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 min-w-0">
            <Smartphone className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-[11px] truncate">Bisa diunduh di Android &amp; Web</span>
          </span>
          <PWAInstallButton variant="prominent" />
        </div>
      </div>

      {/* Official BPS Footer note */}
      <div className="mt-4 text-center text-slate-400 text-[11px] z-10 px-3">
        © 2026 Badan Pusat Statistik Kabupaten Aceh Besar • Jl. Inpres Desa Gani, Kec. Ingin Jaya
      </div>
    </div>
  );
};
