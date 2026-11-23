import React, { useState, useMemo } from 'react';
import { User, Gender, UserStatus } from '../../types';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Activity,
  Briefcase,
  GraduationCap,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Filter,
  Search,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  users: User[];
  onNavigateToAccounts?: () => void;
  currentUserRole: string;
}

export const DashboardUsers: React.FC<Props> = ({
  users,
  onNavigateToAccounts,
  currentUserRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<'all' | Gender>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');

  // Key Aggregations
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Aktif').length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const userCount = totalUsers - adminCount;

  // Gender Distribution
  const maleCount = users.filter((u) => u.gender === 'Laki-laki').length;
  const femaleCount = users.filter((u) => u.gender === 'Perempuan').length;
  const malePercent = totalUsers > 0 ? ((maleCount / totalUsers) * 100).toFixed(1) : '0';
  const femalePercent = totalUsers > 0 ? ((femaleCount / totalUsers) * 100).toFixed(1) : '0';

  // Age Groups
  const ageGroups = useMemo(() => {
    const groups = {
      '< 25 Tahun': 0,
      '25 - 34 Tahun': 0,
      '35 - 44 Tahun': 0,
      '45+ Tahun': 0,
    };
    users.forEach((u) => {
      if (u.age < 25) groups['< 25 Tahun']++;
      else if (u.age <= 34) groups['25 - 34 Tahun']++;
      else if (u.age <= 44) groups['35 - 44 Tahun']++;
      else groups['45+ Tahun']++;
    });
    return groups;
  }, [users]);

  // Institution Breakdown
  const institutionStats = useMemo(() => {
    const map: Record<string, number> = {};
    users.forEach((u) => {
      // Grouping common categories or exact
      const inst = u.institution || 'Lainnya';
      map[inst] = (map[inst] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [users]);

  // Filtered Users List for explorer
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.institution.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGender = filterGender === 'all' || u.gender === filterGender;
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;
      return matchSearch && matchGender && matchStatus;
    });
  }, [users, searchTerm, filterGender, filterStatus]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Page Title & Context Header */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-sm relative overflow-hidden border border-blue-800/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-orange-300 mb-1.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">SEULAWAH · Monitoring Karakteristik Pengguna BPS Aceh Besar</span>
            </p>
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-balance">
              Karakteristik Pengguna Data BPS Aceh Besar
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Ringkasan profil pengguna terdaftar meliputi nama lengkap, distribusi jenis kelamin, kelompok usia, dan asal instansi pemangku kepentingan di Kabupaten Aceh Besar.
            </p>
          </div>

          {currentUserRole === 'admin' && onNavigateToAccounts && (
            <button
              type="button"
              onClick={onNavigateToAccounts}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs shadow-xs transition shrink-0 self-start md:self-auto whitespace-nowrap"
            >
              <span>Kelola Daftar Akun</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50 text-blue-800 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              Total Pengguna
            </p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-0.5 tabular-nums">
              {totalUsers} <span className="text-xs font-medium text-slate-500">Jiwa</span>
            </h3>
            <p className="text-[10px] text-blue-700 font-medium mt-0.5 truncate">
              Terverifikasi Sistem
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              Pengguna Aktif
            </p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-emerald-700 mt-0.5 tabular-nums">
              {activeUsers}
            </h3>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate tabular-nums">
              {totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(0) : 0}% Keaktifan
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 text-rose-700 shrink-0">
            <UserX className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              Non-Aktif
            </p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-rose-700 mt-0.5 tabular-nums">
              {inactiveUsers}
            </h3>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5 truncate">
              Dapat dibersihkan Admin
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 text-amber-700 shrink-0">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              Hak Akses
            </p>
            <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-0.5 tabular-nums">
              {adminCount} <span className="text-xs font-semibold text-amber-700">Admin</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate tabular-nums">
              {userCount} Akun Role User
            </p>
          </div>
        </div>
      </div>

      {/* Main Characteristics Visualizations (Gender, Age Groups, Usage Purpose) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Distribusi Jenis Kelamin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-sm text-slate-800">
                  Distribusi Jenis Kelamin
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">Demografi</span>
            </div>

            <div className="my-6 flex items-center justify-center gap-6">
              {/* Circular visualization representation */}
              <div className="relative w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center shadow-inner">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#2563eb 0% ${malePercent}%, #ec4899 ${malePercent}% 100%)`,
                    maskImage: 'radial-gradient(circle, transparent 60%, black 61%)',
                    WebkitMaskImage: 'radial-gradient(circle, transparent 60%, black 61%)',
                  }}
                />
                <div className="text-center z-10">
                  <span className="text-xl font-black text-slate-800">{totalUsers}</span>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
                </div>
              </div>

              {/* Legend & Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Laki-laki</span>
                      <span className="text-xs text-blue-700 font-bold">({malePercent}%)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{maleCount} Pengguna</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-pink-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Perempuan</span>
                      <span className="text-xs text-pink-600 font-bold">({femalePercent}%)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{femaleCount} Pengguna</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100">
            Mayoritas pengguna aplikasi BPS Aceh Besar didominasi oleh laki-laki ({malePercent}%), dengan partisipasi perempuan aktif sebesar {femalePercent}%.
          </div>
        </div>

        {/* 2. Distribusi Kelompok Umur */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                <h3 className="font-bold text-sm text-slate-800">
                  Distribusi Kelompok Umur
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">Usia Produktif</span>
            </div>

            <div className="my-4 space-y-3">
              {Object.entries(ageGroups).map(([group, count]) => {
                const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                return (
                  <div key={group} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{group}</span>
                      <span className="font-bold text-slate-900">
                        {count} orang <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-400 to-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-orange-50/70 rounded-xl text-[11px] text-amber-900 border border-orange-100">
            Pengguna terbanyak berada pada usia produktif <strong>25 - 44 tahun</strong> yang merupakan aparatur perencanaan daerah dan akademisi.
          </div>
        </div>

        {/* 3. Distribusi Asal Instansi Pengguna */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-800 truncate">
                  Distribusi Asal Instansi
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-400 shrink-0">Lembaga</span>
            </div>

            <div className="my-4 space-y-3">
              {institutionStats.slice(0, 5).map(([inst, count]) => {
                const pct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                return (
                  <div key={inst} className="space-y-1">
                    <div className="flex justify-between text-xs gap-2">
                      <span className="font-semibold text-slate-700 truncate min-w-0" title={inst}>
                        {inst}
                      </span>
                      <span className="font-bold text-indigo-700 shrink-0">
                        {count} <span className="text-slate-400 text-[10px]">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 6)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 rounded-xl text-[11px] text-blue-900 border border-blue-100">
            Pengguna aplikasi berasal dari {institutionStats.length} instansi pemerintahan, akademisi, dan masyarakat umum.
          </div>
        </div>
      </div>

      {/* Asal Instansi Breakdown & Table Explorer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-700" />
              <span>Daftar Asal Instansi Pengguna Aplikasi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan lembaga pemerintahan, universitas, organisasi, dan badan usaha yang mengakses data
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama / instansi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 w-44 sm:w-56"
              />
            </div>

            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as 'all' | Gender)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            >
              <option value="all">Semua Gender</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | UserStatus)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
            </select>
          </div>
        </div>

        {/* User Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold">Nama Pengguna</th>
                <th className="px-4 py-3 font-bold">Jenis Kelamin</th>
                <th className="px-4 py-3 font-bold">Asal Instansi</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="leading-tight truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-normal font-mono truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      <span className="font-medium">{u.gender}</span>
                      <span className="text-slate-400 ml-1">({u.age} thn)</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium max-w-[220px] truncate" title={u.institution}>
                      {u.institution}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
