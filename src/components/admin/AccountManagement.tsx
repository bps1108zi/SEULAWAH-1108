import React, { useState } from 'react';
import { User, UserRole, UserStatus, Gender } from '../../types';
import { saveUsers } from '../../services/storage';
import {
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Download,
  Building2,
  Phone,
  Calendar,
  X,
  Sparkles,
  Eraser,
} from 'lucide-react';

interface Props {
  users: User[];
  currentAdmin: User;
  onUsersUpdated: (users: User[]) => void;
}

export const AccountManagement: React.FC<Props> = ({
  users,
  currentAdmin,
  onUsersUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserGender, setNewUserGender] = useState<Gender>('Laki-laki');
  const [newUserAge, setNewUserAge] = useState<number | ''>(28);
  const [newUserInstitution, setNewUserInstitution] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPurpose, setNewUserPurpose] = useState('Perencanaan & Kebijakan Daerah (RPJMD/RKPD)');
  const [newUserStatus, setNewUserStatus] = useState<UserStatus>('Aktif');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // 1. Ubah Password Akun
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    if (!newPasswordValue.trim() || newPasswordValue.length < 6) {
      showToast('error', 'Password baru minimal harus 6 karakter.');
      return;
    }

    const updated = users.map((u) =>
      u.id === passwordTargetUser.id ? { ...u, password: newPasswordValue } : u
    );
    saveUsers(updated);
    onUsersUpdated(updated);
    showToast('success', `Password untuk akun ${passwordTargetUser.name} (${passwordTargetUser.email}) berhasil diperbarui!`);
    setPasswordTargetUser(null);
    setNewPasswordValue('');
  };

  // 2. Hapus Akun Tidak Aktif Secara Permanen
  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentAdmin.id) {
      showToast('error', 'Anda tidak dapat menghapus akun admin yang sedang login.');
      return;
    }
    if (userToDelete.status === 'Aktif') {
      showToast('error', 'Sesuai ketentuan, hanya akun dengan status "Tidak Aktif" yang dapat dihapus permanen untuk menjaga database tetap bersih.');
      return;
    }

    const updated = users.filter((u) => u.id !== userToDelete.id);
    saveUsers(updated);
    onUsersUpdated(updated);
    showToast('success', `Akun non-aktif "${userToDelete.name}" (${userToDelete.email}) telah dihapus secara permanen dari sistem.`);
    setUserToDelete(null);
  };

  // 3. Batch Cleanup: Hapus SEMUA Akun Tidak Aktif Sekaligus
  const handleBulkDeleteInactive = () => {
    const inactiveCount = users.filter((u) => u.status === 'Tidak Aktif').length;
    if (inactiveCount === 0) {
      showToast('error', 'Tidak ada akun berstatus Tidak Aktif saat ini.');
      setIsBulkDeleteModalOpen(false);
      return;
    }

    const updated = users.filter((u) => u.status === 'Aktif');
    saveUsers(updated);
    onUsersUpdated(updated);
    showToast('success', `Berhasil membersihkan ${inactiveCount} akun tidak aktif secara permanen dari database.`);
    setIsBulkDeleteModalOpen(false);
  };

  // 4. Tambah Akun Baru oleh Admin (Bisa set Role Admin atau User)
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      showToast('error', 'Lengkapi semua field bertanda bintang (*).');
      return;
    }

    const existing = users.find(
      (u) => u.email.toLowerCase() === newUserEmail.trim().toLowerCase()
    );
    if (existing) {
      showToast('error', 'Email tersebut sudah terdaftar di sistem.');
      return;
    }

    const created: User = {
      id: `user-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      password: newUserPassword,
      role: newUserRole,
      gender: newUserGender,
      age: Number(newUserAge) || 28,
      institution: newUserInstitution.trim() || 'Umum',
      phone: newUserPhone.trim() || '-',
      usagePurpose: newUserPurpose,
      status: newUserStatus,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    const updated = [created, ...users];
    saveUsers(updated);
    onUsersUpdated(updated);
    showToast('success', `Akun baru ${created.name} dengan role ${created.role.toUpperCase()} berhasil dibuat!`);

    // Reset Form
    setIsAddModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserInstitution('');
    setNewUserPhone('');
  };

  // Toggle User Status Aktif <-> Tidak Aktif
  const handleToggleStatus = (user: User) => {
    if (user.id === currentAdmin.id) {
      showToast('error', 'Tidak dapat menonaktifkan akun admin Anda sendiri.');
      return;
    }

    const newStatus: UserStatus = user.status === 'Aktif' ? 'Tidak Aktif' : 'Aktif';
    const updated = users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u));
    saveUsers(updated);
    onUsersUpdated(updated);
    showToast('success', `Status akun ${user.name} diubah menjadi "${newStatus}".`);
  };

  // Ubah Role User <-> Admin (Hanya Admin yang bisa mengubah role, termasuk akun Google)
  const handleChangeRole = (user: User, nextRole: UserRole) => {
    if (user.id === currentAdmin.id) {
      showToast('error', 'Tidak dapat mengubah role akun admin yang sedang Anda gunakan.');
      return;
    }
    if (user.role === nextRole) return;
    const updated = users.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u));
    saveUsers(updated);
    onUsersUpdated(updated);
    showToast('success', `Role akun ${user.name} berhasil diubah menjadi ${nextRole.toUpperCase()}.`);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.institution.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const inactiveUsersCount = users.filter((u) => u.status === 'Tidak Aktif').length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-blue-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2.5 border border-amber-500/40">
              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Hak Akses Administrator Khusus</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Manajemen Akun &amp; Karakteristik Pengguna
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Kelola daftar akun terdaftar lengkap dengan karakteristik, hak akses (ubah role User/Admin termasuk akun Google), reset password, serta hapus permanen akun yang tidak aktif.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Akun Baru</span>
            </button>

            {inactiveUsersCount > 0 && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-2.5 bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 border border-rose-500"
                title="Hapus semua akun tidak aktif sekaligus"
              >
                <Eraser className="w-4 h-4" />
                <span>Bersihkan ({inactiveUsersCount}) Akun Non-Aktif</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs shadow-md animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Total: {users.length} Akun Terdaftar
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-emerald-700 font-semibold">
              {users.filter((u) => u.status === 'Aktif').length} Aktif
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-rose-600 font-semibold">
              {inactiveUsersCount} Tidak Aktif
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, email, instansi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 w-44 sm:w-60 bg-white"
              />
            </div>

            {/* Filter Role */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as 'all' | UserRole)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Role Admin</option>
              <option value="user">Role User</option>
            </select>

            {/* Filter Status */}
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

        {/* User Characteristics Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama &amp; Karakteristik</th>
                <th className="py-3 px-3">Email / Username</th>
                <th className="py-3 px-3">Password Akun</th>
                <th className="py-3 px-3">Asal Instansi</th>
                <th className="py-3 px-3 text-center">Role (Akses)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data akun yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPassRevealed = !!revealedPasswords[u.id];
                  const isCurrent = u.id === currentAdmin.id;
                  const isInactive = u.status === 'Tidak Aktif';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      {/* Name, Gender, Age */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-black flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 leading-tight truncate max-w-[160px]" title={u.name}>
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white text-[9px] font-bold shrink-0">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {u.gender} • <span className="font-semibold">{u.age} thn</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email + Google Provider Badge */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-700 break-all">{u.email}</span>
                          {u.authProvider === 'google' && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold shrink-0">
                              Google
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Password (visible to Admin with toggle) */}
                      <td className="py-3 px-3">
                        {u.authProvider === 'google' ? (
                          <span className="text-[10px] italic text-slate-400">OAuth Google</span>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg w-max font-mono text-xs">
                            <span>
                              {isPassRevealed ? u.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="text-slate-400 hover:text-slate-700 ml-1 p-0.5"
                              title={isPassRevealed ? 'Sembunyikan' : 'Tampilkan Password'}
                            >
                              {isPassRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Institution */}
                      <td className="py-3 px-3 text-slate-700 font-medium max-w-[170px] truncate" title={u.institution}>
                        {u.institution}
                      </td>

                      {/* Interactive Role Selector (Only Admin can promote/demote) */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={u.role}
                          disabled={isCurrent}
                          onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          } ${isCurrent ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={isCurrent ? 'Role akun sendiri tidak dapat diubah' : 'Ubah hak akses role pengguna'}
                        >
                          <option value="user">USER</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition hover:opacity-80 ${
                            u.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                          title="Klik untuk beralih status Aktif / Tidak Aktif"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'Aktif' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span>{u.status}</span>
                        </button>
                      </td>

                      {/* Actions: Ubah Password & Hapus Akun Tidak Aktif */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ubah Password Button */}
                          <button
                            onClick={() => {
                              setPasswordTargetUser(u);
                              setNewPasswordValue('');
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 transition active:scale-95"
                            title="Ubah Password Akun"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Hapus Permanen: Hanya untuk Akun Tidak Aktif! */}
                          {isInactive ? (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition active:scale-95"
                              title="Hapus akun tidak aktif secara permanen untuk membersihkan database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-slate-300 cursor-not-allowed"
                              title="Hanya akun Tidak Aktif yang dapat dihapus permanen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: UBAH PASSWORD AKUN */}
      {passwordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <KeyRound className="w-5 h-5 text-blue-800" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Ubah Password Akun</h3>
                  <p className="text-xs text-slate-500">BPS Kabupaten Aceh Besar</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordTargetUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <p className="font-semibold text-slate-800">Target Pengguna:</p>
                <p className="text-slate-600">{passwordTargetUser.name}</p>
                <p className="font-mono text-slate-500 text-[11px]">{passwordTargetUser.email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Ketik password baru (minimal 6 karakter)"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordTargetUser(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold shadow-sm transition"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HAPUS AKUN TIDAK AKTIF SECARA PERMANEN */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Hapus Akun Permanen?
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus akun tidak aktif milik:
            </p>
            <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">{userToDelete.name}</p>
              <p className="font-mono text-slate-500 text-[11px]">{userToDelete.email}</p>
              <p className="text-slate-500 mt-1">Instansi: {userToDelete.institution}</p>
              <p className="text-rose-600 font-bold mt-1">Status: {userToDelete.status}</p>
            </div>

            <p className="text-[11px] text-slate-500">
              Penghapusan ini akan membersihkan data pengguna secara permanen dari sistem untuk menjaga kebersihan database.
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK DELETE ALL INACTIVE USERS */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Eraser className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Bersihkan Seluruh Akun Tidak Aktif
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Pembersihan Database Massal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Terdapat <strong>{inactiveUsersCount} akun berstatus Tidak Aktif</strong> di dalam database.
              Apakah Anda ingin menghapus seluruh akun tidak aktif tersebut secara permanen sekaligus?
            </p>

            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteInactive}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition"
              >
                Bersihkan Database Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH AKUN BARU OLEH ADMIN (ROLE ADMIN / USER) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 text-orange-800 rounded-xl">
                  <UserPlus className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Tambah Akun Baru</h3>
                  <p className="text-xs text-slate-500">Khusus Administrator BPS Aceh Besar</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              {/* Role Selection by Admin */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80">
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Pilih Hak Akses Akun (Role)
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-200 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={newUserRole === 'user'}
                      onChange={() => setNewUserRole('user')}
                      className="text-orange-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Role: USER</p>
                      <p className="text-[10px] text-slate-500">Dashboard & Ekonomi</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-200 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={newUserRole === 'admin'}
                      onChange={() => setNewUserRole('admin')}
                      className="text-orange-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Role: ADMIN</p>
                      <p className="text-[10px] text-amber-700">Akses Penuh + Input Data</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Contoh: Safrizal, S.Stat"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Akun <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="nama@instansi.go.id"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Akun <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Password akun"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={newUserGender}
                    onChange={(e) => setNewUserGender(e.target.value as Gender)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Umur (Tahun)
                  </label>
                  <input
                    type="number"
                    min={17}
                    max={90}
                    value={newUserAge}
                    onChange={(e) => setNewUserAge(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asal Instansi
                </label>
                <input
                  type="text"
                  value={newUserInstitution}
                  onChange={(e) => setNewUserInstitution(e.target.value)}
                  placeholder="Contoh: BPS Aceh Besar / Bappeda / Universitas Syiah Kuala"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Handphone
                  </label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Akun
                  </label>
                  <select
                    value={newUserStatus}
                    onChange={(e) => setNewUserStatus(e.target.value as UserStatus)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
