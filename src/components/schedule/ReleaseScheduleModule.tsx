import React, { useState, useMemo, useEffect } from 'react';
import { ReleaseSchedule, ReleaseFrequency, ReleaseStatus } from '../../types';
import {
  getStoredReleaseSchedules,
  saveReleaseSchedules,
} from '../../services/storage';
import { exportReleaseScheduleExcel } from '../../utils/dataTransfer';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Search,
  Download,
  ExternalLink,
  Layers,
  Sparkles,
  CalendarCheck2,
  FileText,
  X,
  BellRing,
  Filter,
} from 'lucide-react';

interface Props {
  userRole: 'admin' | 'user';
  onNavigateToIndicator?: (code: string) => void;
}

export const ReleaseScheduleModule: React.FC<Props> = ({
  userRole,
  onNavigateToIndicator,
}) => {
  const [schedules, setSchedules] = useState<ReleaseSchedule[]>(() =>
    getStoredReleaseSchedules()
  );

  useEffect(() => {
    const onSchedulesUpdated = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) setSchedules(e.detail);
    };
    window.addEventListener('bps_schedules_updated', onSchedulesUpdated as EventListener);
    return () => {
      window.removeEventListener('bps_schedules_updated', onSchedulesUpdated as EventListener);
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFrequency, setFilterFrequency] = useState<'semua' | ReleaseFrequency>('semua');
  const [filterStatus, setFilterStatus] = useState<'semua' | 'Mendatang' | 'Telah Rilis'>('semua');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formDate, setFormDate] = useState('2026-11-05');
  const [formFrequency, setFormFrequency] = useState<ReleaseFrequency>('Triwulanan');
  const [formStatus, setFormStatus] = useState<ReleaseStatus>('Mendatang');
  const [formBRS, setFormBRS] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Fixed reference date: 2026-11-03
  const todayRef = useMemo(() => new Date('2026-11-03T00:00:00'), []);

  // Helper: Hitung selisih hari & label status
  const getReleaseCountdown = (dateStr: string) => {
    const target = new Date(`${dateStr}T00:00:00`);
    const diffTime = target.getTime() - todayRef.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { label: 'Rilis Hari Ini!', badgeClass: 'bg-emerald-500 text-white animate-pulse', isUpcoming: true, days: 0 };
    } else if (diffDays === 1) {
      return { label: 'Besok (1 hari lagi)', badgeClass: 'bg-amber-500 text-white font-bold', isUpcoming: true, days: 1 };
    } else if (diffDays > 1) {
      return { label: `${diffDays} hari lagi`, badgeClass: 'bg-blue-600 text-white font-bold', isUpcoming: true, days: diffDays };
    } else {
      const pastDays = Math.abs(diffDays);
      return { label: `Telah Rilis (${pastDays} hari lalu)`, badgeClass: 'bg-slate-200 text-slate-700', isUpcoming: false, days: diffDays };
    }
  };

  // Strictly sort schedules by nearest release date!
  // Upcoming nearest first (ascending), followed by past releases (descending)
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const timeA = new Date(a.releaseDate).getTime();
      const timeB = new Date(b.releaseDate).getTime();
      const todayTime = todayRef.getTime();

      const isUpcomingA = timeA >= todayTime;
      const isUpcomingB = timeB >= todayTime;

      // Prioritas 1: Jadwal mendatang selalu di atas
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;

      // Jika keduanya jadwal mendatang: tanggal paling dekat di atas (Ascending)
      if (isUpcomingA && isUpcomingB) {
        return timeA - timeB;
      }

      // Jika keduanya telah lewat: tanggal paling baru lewat di atas (Descending)
      return timeB - timeA;
    });
  }, [schedules, todayRef]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return sortedSchedules.filter((item) => {
      const matchesSearch =
        item.indicatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.indicatorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.periodTarget.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.officialBRSTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFrequency =
        filterFrequency === 'semua' || item.frequency === filterFrequency;

      const countdown = getReleaseCountdown(item.releaseDate);
      const isUpcoming = countdown.isUpcoming;
      const matchesStatus =
        filterStatus === 'semua' ||
        (filterStatus === 'Mendatang' && isUpcoming) ||
        (filterStatus === 'Telah Rilis' && !isUpcoming);

      return matchesSearch && matchesFrequency && matchesStatus;
    });
  }, [sortedSchedules, searchQuery, filterFrequency, filterStatus]);

  // Nearest upcoming schedule item
  const nearestUpcoming = useMemo(() => {
    return sortedSchedules.find((s) => new Date(s.releaseDate).getTime() >= todayRef.getTime());
  }, [sortedSchedules, todayRef]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormCode('PDRB_TW');
    setFormTarget('Triwulan IV 2026');
    setFormDate('2027-02-05');
    setFormFrequency('Triwulanan');
    setFormStatus('Mendatang');
    setFormBRS('');
    setFormLink('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ReleaseSchedule) => {
    setEditingId(item.id);
    setFormName(item.indicatorName);
    setFormCode(item.indicatorCode);
    setFormTarget(item.periodTarget);
    setFormDate(item.releaseDate);
    setFormFrequency(item.frequency);
    setFormStatus(item.status);
    setFormBRS(item.officialBRSTitle);
    setFormLink(item.downloadLink || '');
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDate) {
      alert('Nama Indikator dan Tanggal Rilis wajib diisi.');
      return;
    }

    const payload: ReleaseSchedule = {
      id: editingId || `rel-${Date.now()}`,
      indicatorName: formName.trim(),
      indicatorCode: formCode.trim().toUpperCase() || 'IND_AB',
      periodTarget: formTarget.trim() || 'Tahunan 2026',
      releaseDate: formDate,
      frequency: formFrequency,
      status: formStatus,
      officialBRSTitle: formBRS.trim() || `Berita Resmi Statistik ${formName.trim()}`,
      downloadLink: formLink.trim(),
      notes: formNotes.trim(),
    };

    let updated: ReleaseSchedule[];
    if (editingId) {
      updated = schedules.map((s) => (s.id === editingId ? payload : s));
    } else {
      updated = [payload, ...schedules];
    }

    setSchedules(updated);
    saveReleaseSchedules(updated);
    setIsModalOpen(false);

    setStatusMessage({
      type: 'success',
      text: editingId ? 'Jadwal rilis berhasil diperbarui.' : 'Jadwal rilis baru berhasil ditambahkan.',
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Delete Schedule
  const handleDeleteSchedule = (id: string, name: string) => {
    if (confirm(`Hapus jadwal rilis "${name}"?`)) {
      const updated = schedules.filter((s) => s.id !== id);
      setSchedules(updated);
      saveReleaseSchedules(updated);
      setStatusMessage({
        type: 'success',
        text: `Jadwal rilis "${name}" berhasil dihapus.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    exportReleaseScheduleExcel(filteredSchedules);
    setStatusMessage({
      type: 'success',
      text: 'Jadwal rilis berhasil diekspor ke file Excel (.xlsx).',
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-800 shrink-0">
              <Calendar className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-800 truncate">Jadwal Rilis Indikator</h1>
              <p className="text-xs text-slate-500">
                Kalender resmi Berita Resmi Statistik (BRS) &amp; Publikasi BPS Kabupaten Aceh Besar — diurutkan berdasarkan tanggal rilis terdekat
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Jadwal (.xlsx)</span>
          </button>
          {userRole === 'admin' && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Rilis</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Featured Nearest Release Highlight Card */}
      {nearestUpcoming && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <BellRing className="w-3 h-3 animate-bounce" />
                  Rilis Terdekat Berikutnya
                </span>
                <span className="text-xs text-blue-200 font-mono">
                  {nearestUpcoming.periodTarget}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                {nearestUpcoming.indicatorName}
              </h2>

              <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
                {nearestUpcoming.officialBRSTitle}. {nearestUpcoming.notes}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 shrink-0">
              <div className="text-left sm:text-right bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/15">
                <p className="text-[10px] text-blue-200 uppercase font-semibold">Tanggal Rilis Resmi</p>
                <p className="text-base font-extrabold text-white">
                  {new Date(nearestUpcoming.releaseDate).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <div className="mt-1">
                  <span
                    className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full ${
                      getReleaseCountdown(nearestUpcoming.releaseDate).badgeClass
                    }`}
                  >
                    ⏱ {getReleaseCountdown(nearestUpcoming.releaseDate).label}
                  </span>
                </div>
              </div>

              {nearestUpcoming.downloadLink && (
                <a
                  href={nearestUpcoming.downloadLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Kunjungi Halaman Rilis BPS</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Jadwal Terdata</p>
          <p className="text-xl font-extrabold text-slate-800 mt-0.5">{schedules.length}</p>
          <span className="text-[10px] text-slate-500">Agenda BRS & Publikasi</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-blue-600">Rilis Mendatang</p>
          <p className="text-xl font-extrabold text-blue-800 mt-0.5">
            {schedules.filter((s) => new Date(s.releaseDate).getTime() >= todayRef.getTime()).length}
          </p>
          <span className="text-[10px] text-blue-600">Perlu dipantau</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-purple-600">PDRB Triwulanan</p>
          <p className="text-xl font-extrabold text-purple-800 mt-0.5">
            {schedules.filter((s) => s.frequency === 'Triwulanan').length}
          </p>
          <span className="text-[10px] text-purple-600">TW I, II, III, & IV</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-emerald-600">Telah Rilis</p>
          <p className="text-xl font-extrabold text-emerald-800 mt-0.5">
            {schedules.filter((s) => new Date(s.releaseDate).getTime() < todayRef.getTime()).length}
          </p>
          <span className="text-[10px] text-emerald-600">Data tersedia di sistem</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari indikator, judul BRS, atau target periode..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('semua')}
              className={`px-3 py-1 rounded-md transition ${
                filterStatus === 'semua' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semua Status
            </button>
            <button
              onClick={() => setFilterStatus('Mendatang')}
              className={`px-3 py-1 rounded-md transition ${
                filterStatus === 'Mendatang' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Mendatang
            </button>
            <button
              onClick={() => setFilterStatus('Telah Rilis')}
              className={`px-3 py-1 rounded-md transition ${
                filterStatus === 'Telah Rilis' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600'
              }`}
            >
              Telah Rilis
            </button>
          </div>

          {/* Frequency Filter */}
          <select
            value={filterFrequency}
            onChange={(e) => setFilterFrequency(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
          >
            <option value="semua">Semua Frekuensi</option>
            <option value="Triwulanan">Triwulanan</option>
            <option value="Tahunan">Tahunan</option>
            <option value="Bulanan">Bulanan</option>
          </select>
        </div>
      </div>

      {/* Main Table: Ordered Strictly by Nearest Release Date First */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Kalender Rilis Resmi (Urutan Terdekat)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Menampilkan {filteredSchedules.length} dari {schedules.length} agenda
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3">Tanggal Rilis</th>
                <th className="p-3">Countdown / Status</th>
                <th className="p-3">Indikator & Kode</th>
                <th className="p-3">Periode Sasaran</th>
                <th className="p-3">Frekuensi</th>
                <th className="p-3">Berita Resmi Statistik (BRS)</th>
                {userRole === 'admin' && <th className="p-3 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchedules.map((item, index) => {
                const countdown = getReleaseCountdown(item.releaseDate);

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-blue-50/40 transition ${
                      countdown.isUpcoming && index === 0 ? 'bg-orange-50/50' : ''
                    }`}
                  >
                    <td className="p-3 text-center font-mono text-slate-400">{index + 1}</td>

                    {/* Tanggal Rilis */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>{item.releaseDate}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.releaseDate).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    {/* Countdown Badge */}
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${countdown.badgeClass}`}
                      >
                        {countdown.label}
                      </span>
                    </td>

                    {/* Indikator */}
                    <td className="p-3">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{item.indicatorName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.indicatorCode}
                        </span>
                      </div>
                    </td>

                    {/* Periode */}
                    <td className="p-3 whitespace-nowrap font-medium text-slate-700">
                      {item.periodTarget}
                    </td>

                    {/* Frekuensi */}
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          item.frequency === 'Triwulanan'
                            ? 'bg-purple-100 text-purple-800'
                            : item.frequency === 'Bulanan'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.frequency}
                      </span>
                    </td>

                    {/* BRS Document Title & Link */}
                    <td className="p-3 max-w-xs">
                      <p className="font-medium text-slate-800 line-clamp-1">{item.officialBRSTitle}</p>
                      {item.notes && <p className="text-[10px] text-slate-400 line-clamp-1">{item.notes}</p>}
                      {item.downloadLink && (
                        <a
                          href={item.downloadLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-900 hover:underline mt-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Halaman BPS</span>
                        </a>
                      )}
                    </td>

                    {/* Admin Actions */}
                    {userRole === 'admin' && (
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                            title="Edit Jadwal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(item.id, item.indicatorName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah / Edit Jadwal Rilis */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-800">
                  <Calendar className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingId ? 'Edit Jadwal Rilis' : 'Tambah Jadwal Rilis Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700">Nama Indikator / Rilis</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: PDRB Triwulan IV & Kumulatif 2026"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Kode Indikator</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="PDRB_TW"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Periode Target</label>
                  <input
                    type="text"
                    required
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="Triwulan IV 2026"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Tanggal Rilis (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Frekuensi Rilis</label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1 bg-white"
                  >
                    <option value="Triwulanan">Triwulanan</option>
                    <option value="Tahunan">Tahunan</option>
                    <option value="Bulanan">Bulanan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Judul Berita Resmi Statistik (BRS)</label>
                <input
                  type="text"
                  value={formBRS}
                  onChange={(e) => setFormBRS(e.target.value)}
                  placeholder="Contoh: Pertumbuhan Ekonomi Aceh Besar Triwulan IV-2026"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Tautan Web / Unduhan Publikasi (Opsional)</label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://acehbesarkab.bps.go.id/pressrelease/..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Catatan Tambahan</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan metodologi atau pengumuman penting..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 mt-1"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs shadow-xs"
                >
                  {editingId ? 'Simpan Perubahan' : 'Tambahkan ke Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
