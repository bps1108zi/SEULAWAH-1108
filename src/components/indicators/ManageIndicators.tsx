import React, { useState, useEffect, useMemo } from 'react';
import {
  CustomIndicator,
  RegionalPDRBData,
  ReleaseSchedule,
  QuarterlyPDRBRecord,
  IndicatorTimestamps,
  QuarterCode,
} from '../../types';
import {
  getStoredCustomIndicators,
  saveCustomIndicators,
  deleteCustomIndicatorById,
  getStoredReleaseSchedules,
  getStoredQuarterlyPDRB,
  saveQuarterlyPDRB,
  saveEconomyData,
  getStoredIndicatorTimestamps,
  touchIndicatorTimestamp,
} from '../../services/storage';
import {
  downloadIndicatorTemplateExcel,
  exportIndicatorDataExcel,
  parseExcelFileToGrid,
  IndicatorTransferPayload,
} from '../../utils/dataTransfer';
import {
  Layers,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Table as TableIcon,
  X,
  FileDown,
  Eye,
} from 'lucide-react';

interface Props {
  economyData: RegionalPDRBData;
  onNavigateToInputData: () => void;
  onNavigateToSchedule: () => void;
  onEconomyDataUpdated?: (newData: RegionalPDRBData) => void;
  userRole: 'admin' | 'user';
}

interface IndicatorListItem extends IndicatorTransferPayload {
  id: string;
  isBuiltIn: boolean;
  category: string;
  rowCount: number;
  colCount: number;
  updatedAt: string;
  periodicity: 'tahunan' | 'triwulanan';
}

export const ManageIndicators: React.FC<Props> = ({
  economyData,
  onNavigateToInputData,
  onNavigateToSchedule,
  onEconomyDataUpdated,
  userRole,
}) => {
  const [customIndicators, setCustomIndicators] = useState<CustomIndicator[]>(() =>
    getStoredCustomIndicators()
  );
  const [schedules, setSchedules] = useState<ReleaseSchedule[]>(() =>
    getStoredReleaseSchedules()
  );
  const [quarterlyRecords, setQuarterlyRecords] = useState<QuarterlyPDRBRecord[]>(() =>
    getStoredQuarterlyPDRB()
  );
  const [timestamps, setTimestamps] = useState<IndicatorTimestamps>(() =>
    getStoredIndicatorTimestamps()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriodicity, setFilterPeriodicity] = useState<'semua' | 'tahunan' | 'triwulanan'>('semua');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Import Excel state (Admin only)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIndicatorForImport, setSelectedIndicatorForImport] = useState<IndicatorListItem | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    rowHeaders: string[];
    columnHeaders: string[];
    gridData: Record<string, Record<string, number>>;
    warnings: string[];
  } | null>(null);

  // Modal Lihat Nilai state (Available for both Admin & User)
  const [viewingIndicator, setViewingIndicator] = useState<IndicatorListItem | null>(null);

  // Listen to storage & Firestore real-time updates
  useEffect(() => {
    const onCustomUpdated = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) setCustomIndicators(e.detail);
    };
    const onSchedulesUpdated = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) setSchedules(e.detail);
    };
    const onQuarterlyUpdated = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) setQuarterlyRecords(e.detail);
    };
    const onTimestampsUpdated = (e: CustomEvent) => {
      if (e.detail) setTimestamps(e.detail);
    };

    window.addEventListener('bps_custom_indicators_updated', onCustomUpdated as EventListener);
    window.addEventListener('bps_schedules_updated', onSchedulesUpdated as EventListener);
    window.addEventListener('bps_quarterly_pdrb_updated', onQuarterlyUpdated as EventListener);
    window.addEventListener('bps_timestamps_updated', onTimestampsUpdated as EventListener);

    return () => {
      window.removeEventListener('bps_custom_indicators_updated', onCustomUpdated as EventListener);
      window.removeEventListener('bps_schedules_updated', onSchedulesUpdated as EventListener);
      window.removeEventListener('bps_quarterly_pdrb_updated', onQuarterlyUpdated as EventListener);
      window.removeEventListener('bps_timestamps_updated', onTimestampsUpdated as EventListener);
    };
  }, []);

  // Build real gridData for all built-in indicators & combine with custom indicators
  const allIndicators = useMemo<IndicatorListItem[]>(() => {
    const yearCols = economyData.years.map(String);

    // 1. PDRB ADHB
    const adhbRows = economyData.sectors.map((s) => `[${s.code}] ${s.name}`);
    const adhbGrid: Record<string, Record<string, number>> = {};
    economyData.sectors.forEach((s) => {
      const label = `[${s.code}] ${s.name}`;
      adhbGrid[label] = {};
      economyData.years.forEach((y) => {
        adhbGrid[label][String(y)] = s.adhb[y] ?? 0;
      });
    });

    // 2. PDRB ADHK
    const adhkRows = economyData.sectors.map((s) => `[${s.code}] ${s.name}`);
    const adhkGrid: Record<string, Record<string, number>> = {};
    economyData.sectors.forEach((s) => {
      const label = `[${s.code}] ${s.name}`;
      adhkGrid[label] = {};
      economyData.years.forEach((y) => {
        adhkGrid[label][String(y)] = s.adhk[y] ?? 0;
      });
    });

    // 3. PDRB Triwulanan
    const twCols = quarterlyRecords.map((r) => r.periodLabel);
    const twRows = [
      'PDRB ADHB Aceh Besar (Miliar Rp)',
      'PDRB ADHK Aceh Besar (Miliar Rp)',
      'Pertumbuhan q-to-q (%)',
      'Pertumbuhan y-on-y (%)',
    ];
    const twGrid: Record<string, Record<string, number>> = {
      'PDRB ADHB Aceh Besar (Miliar Rp)': {},
      'PDRB ADHK Aceh Besar (Miliar Rp)': {},
      'Pertumbuhan q-to-q (%)': {},
      'Pertumbuhan y-on-y (%)': {},
    };
    quarterlyRecords.forEach((r) => {
      twGrid['PDRB ADHB Aceh Besar (Miliar Rp)'][r.periodLabel] = r.adhbAcehBesar;
      twGrid['PDRB ADHK Aceh Besar (Miliar Rp)'][r.periodLabel] = r.adhkAcehBesar;
      twGrid['Pertumbuhan q-to-q (%)'][r.periodLabel] = r.qToQGrowthAB ?? 0;
      twGrid['Pertumbuhan y-on-y (%)'][r.periodLabel] = r.yOnYGrowthAB ?? 0;
    });

    // 4. Penduduk Aceh Besar
    const popRows = ['Kabupaten Aceh Besar', 'Provinsi Aceh'];
    const popGrid: Record<string, Record<string, number>> = {
      'Kabupaten Aceh Besar': {},
      'Provinsi Aceh': {},
    };
    economyData.years.forEach((y) => {
      popGrid['Kabupaten Aceh Besar'][String(y)] = economyData.population[y] ?? 0;
      popGrid['Provinsi Aceh'][String(y)] = economyData.provincePopulation[y] ?? 0;
    });

    const builtIn: IndicatorListItem[] = [
      {
        id: 'builtin-pdrb-adhb',
        name: 'Produk Domestik Regional Bruto (PDRB) ADHB',
        code: 'PDRB_ADHB',
        unit: 'Miliar Rupiah',
        source: 'Nerwilis BPS Kabupaten Aceh Besar (Katalog: 1102001.1108)',
        periodicity: 'tahunan',
        isBuiltIn: true,
        category: 'Perekonomian Regional',
        rowCount: adhbRows.length,
        colCount: yearCols.length,
        rowHeaders: adhbRows,
        columnHeaders: yearCols,
        gridData: adhbGrid,
        updatedAt: timestamps.PDRB_ADHB || '2026-11-03T17:00:00Z',
      },
      {
        id: 'builtin-pdrb-adhk',
        name: 'Produk Domestik Regional Bruto (PDRB) ADHK 2010',
        code: 'PDRB_ADHK',
        unit: 'Miliar Rupiah',
        source: 'Nerwilis BPS Kabupaten Aceh Besar (Tahun Dasar 2010)',
        periodicity: 'tahunan',
        isBuiltIn: true,
        category: 'Perekonomian Regional',
        rowCount: adhkRows.length,
        colCount: yearCols.length,
        rowHeaders: adhkRows,
        columnHeaders: yearCols,
        gridData: adhkGrid,
        updatedAt: timestamps.PDRB_ADHK || '2026-11-03T17:10:00Z',
      },
      {
        id: 'builtin-pdrb-quarterly',
        name: 'PDRB Triwulanan (TW I - TW IV)',
        code: 'PDRB_TW',
        unit: 'Miliar Rupiah & %',
        source: 'Nerwilis BPS Aceh Besar & Neraca BPS Provinsi Aceh',
        periodicity: 'triwulanan',
        isBuiltIn: true,
        category: 'Perekonomian Regional',
        rowCount: twRows.length,
        colCount: twCols.length,
        rowHeaders: twRows,
        columnHeaders: twCols,
        gridData: twGrid,
        updatedAt: timestamps.PDRB_TW || '2026-11-03T18:20:00Z',
      },
      {
        id: 'builtin-pop',
        name: 'Jumlah Penduduk Aceh Besar',
        code: 'POP_AB',
        unit: 'Jiwa',
        source: 'BPS Aceh Besar (Hasil SP2020 Lanjutan & Proyeksi)',
        periodicity: 'tahunan',
        isBuiltIn: true,
        category: 'Kependudukan',
        rowCount: popRows.length,
        colCount: yearCols.length,
        rowHeaders: popRows,
        columnHeaders: yearCols,
        gridData: popGrid,
        updatedAt: timestamps.POP_AB || '2026-11-03T17:20:00Z',
      },
    ];

    const customItems: IndicatorListItem[] = customIndicators.map((ci) => ({
      id: ci.id,
      name: ci.name,
      code: ci.code,
      unit: ci.unit,
      source: ci.source,
      rowHeaders: ci.rowHeaders,
      columnHeaders: ci.columnHeaders,
      gridData: ci.gridData,
      isBuiltIn: false,
      periodicity: ci.periodicity || 'tahunan',
      category: ci.category || 'Indikator Khusus Daerah',
      rowCount: ci.rowHeaders?.length || ci.rowCount || 0,
      colCount: ci.columnHeaders?.length || ci.colCount || 0,
      updatedAt: ci.updatedAt || ci.createdAt || '2026-11-03T18:00:00Z',
    }));

    // Sort strictly newest inputted/updated on top (descending)
    return [...builtIn, ...customItems].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [economyData, quarterlyRecords, customIndicators, timestamps]);

  // Filtered indicators based on search and periodicity
  const filteredIndicators = useMemo(() => {
    return allIndicators.filter((ind) => {
      const matchesSearch =
        ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ind.source || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ind.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPeriod =
        filterPeriodicity === 'semua' || ind.periodicity === filterPeriodicity;

      return matchesSearch && matchesPeriod;
    });
  }, [allIndicators, searchQuery, filterPeriodicity]);

  // Handler: Download Template Excel (.xlsx) - Admin Only
  const handleDownloadTemplate = (ind: IndicatorListItem) => {
    downloadIndicatorTemplateExcel(ind);
    setStatusMessage({
      type: 'success',
      text: `Template Excel (.xlsx) untuk indikator ${ind.name} (${ind.code}) berhasil diunduh.`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Handler: Export Indicator Data Excel (.xlsx)
  const handleExportExcel = (ind: IndicatorListItem) => {
    exportIndicatorDataExcel(ind);
    setStatusMessage({
      type: 'success',
      text: `Data indikator ${ind.code} berhasil diekspor ke format Excel (.xlsx).`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Handler: Open Import Modal (Admin Only - works for both custom and built-in indicators)
  const handleOpenImport = (ind: IndicatorListItem) => {
    setSelectedIndicatorForImport(ind);
    setSelectedFileName('');
    setImportError(null);
    setImportPreview(null);
    setIsImportModalOpen(true);
  };

  // Handler: Process Excel (.xlsx/.xls) file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setImportError(null);

    const parsed = await parseExcelFileToGrid(file);
    if (parsed.success) {
      setImportPreview({
        rowHeaders: parsed.rowHeaders,
        columnHeaders: parsed.columnHeaders,
        gridData: parsed.gridData,
        warnings: parsed.warnings,
      });
    } else {
      setImportPreview(null);
      setImportError(parsed.errorMessage || 'Gagal memproses file Excel (.xlsx).');
    }
  };

  // Helper: Extract sector code from label like "[A] Pertanian..." or "A. Pertanian..."
  const matchSectorCode = (rowLabel: string): string | null => {
    const bracketMatch = rowLabel.match(/^\[([A-Z0-9,_-]+)\]/i);
    if (bracketMatch) return bracketMatch[1].toUpperCase();
    const dotMatch = rowLabel.match(/^([A-Z0-9,_-]+)\.\s/i);
    if (dotMatch) return dotMatch[1].toUpperCase();
    const byName = economyData.sectors.find(
      (s) => s.name.toLowerCase() === rowLabel.trim().toLowerCase()
    );
    return byName ? byName.code : null;
  };

  // Handler: Commit Imported Excel Data to Firestore & Local Cache
  const handleCommitImport = () => {
    if (!selectedIndicatorForImport || !importPreview) return;

    const nowIso = new Date().toISOString();
    const targetCode = selectedIndicatorForImport.code;

    if (!selectedIndicatorForImport.isBuiltIn) {
      const updated = customIndicators.map((ci) => {
        if (ci.id === selectedIndicatorForImport.id) {
          return {
            ...ci,
            rowCount: importPreview.rowHeaders.length,
            colCount: importPreview.columnHeaders.length,
            rowHeaders: importPreview.rowHeaders,
            columnHeaders: importPreview.columnHeaders,
            gridData: importPreview.gridData,
            updatedAt: nowIso,
          };
        }
        return ci;
      });
      setCustomIndicators(updated);
      saveCustomIndicators(updated);
    } else if (targetCode === 'PDRB_ADHB' || targetCode === 'PDRB_ADHK') {
      const priceKey = targetCode === 'PDRB_ADHB' ? 'adhb' : 'adhk';
      const updatedEcon: RegionalPDRBData = JSON.parse(JSON.stringify(economyData));

      // Extract numeric year columns
      const numericYears = importPreview.columnHeaders
        .map((c) => parseInt(c.trim(), 10))
        .filter((y) => !isNaN(y) && y >= 2000 && y <= 2100);

      numericYears.forEach((yr) => {
        if (!updatedEcon.years.includes(yr)) {
          updatedEcon.years.push(yr);
        }
      });
      updatedEcon.years.sort((a, b) => a - b);

      importPreview.rowHeaders.forEach((rLabel) => {
        const matchedCode = matchSectorCode(rLabel);
        const targetSector = matchedCode
          ? updatedEcon.sectors.find((s) => s.code.toUpperCase() === matchedCode)
          : undefined;
        if (targetSector) {
          importPreview.columnHeaders.forEach((col) => {
            const yr = parseInt(col.trim(), 10);
            if (!isNaN(yr)) {
              targetSector[priceKey][yr] = importPreview.gridData[rLabel]?.[col] ?? 0;
            }
          });
        }
      });

      saveEconomyData(updatedEcon);
      onEconomyDataUpdated?.(updatedEcon);
      const nextTs = touchIndicatorTimestamp(targetCode);
      setTimestamps(nextTs);
    } else if (targetCode === 'POP_AB') {
      const updatedEcon: RegionalPDRBData = JSON.parse(JSON.stringify(economyData));
      importPreview.rowHeaders.forEach((rLabel) => {
        const lower = rLabel.toLowerCase();
        const isProv = lower.includes('provinsi') || lower.includes('prov');
        importPreview.columnHeaders.forEach((col) => {
          const yr = parseInt(col.trim(), 10);
          if (!isNaN(yr)) {
            const val = Math.round(importPreview.gridData[rLabel]?.[col] ?? 0);
            if (isProv) {
              updatedEcon.provincePopulation[yr] = val;
            } else {
              updatedEcon.population[yr] = val;
            }
          }
        });
      });
      saveEconomyData(updatedEcon);
      onEconomyDataUpdated?.(updatedEcon);
      const nextTs = touchIndicatorTimestamp('POP_AB');
      setTimestamps(nextTs);
    } else if (targetCode === 'PDRB_TW') {
      const updatedQuarterly = [...quarterlyRecords];
      importPreview.columnHeaders.forEach((periodCol) => {
        const existingIdx = updatedQuarterly.findIndex(
          (q) => q.periodLabel.toLowerCase() === periodCol.trim().toLowerCase()
        );
        const adhbRow = importPreview.rowHeaders.find((r) => r.toLowerCase().includes('adhb'));
        const adhkRow = importPreview.rowHeaders.find((r) => r.toLowerCase().includes('adhk'));
        const qtoqRow = importPreview.rowHeaders.find((r) => r.toLowerCase().includes('q-to-q'));
        const yonyRow = importPreview.rowHeaders.find((r) => r.toLowerCase().includes('y-on-y'));

        if (existingIdx >= 0) {
          const rec = { ...updatedQuarterly[existingIdx] };
          if (adhbRow) rec.adhbAcehBesar = importPreview.gridData[adhbRow]?.[periodCol] ?? rec.adhbAcehBesar;
          if (adhkRow) rec.adhkAcehBesar = importPreview.gridData[adhkRow]?.[periodCol] ?? rec.adhkAcehBesar;
          if (qtoqRow) rec.qToQGrowthAB = importPreview.gridData[qtoqRow]?.[periodCol] ?? rec.qToQGrowthAB;
          if (yonyRow) rec.yOnYGrowthAB = importPreview.gridData[yonyRow]?.[periodCol] ?? rec.yOnYGrowthAB;
          updatedQuarterly[existingIdx] = rec;
        } else {
          const matchQ = periodCol.match(/(TW\s*(?:IV|III|II|I))\s*(\d{4})/i);
          const qCode = (matchQ ? matchQ[1].replace(/\s+/g, ' ').toUpperCase() : 'TW IV') as QuarterCode;
          const yr = matchQ ? parseInt(matchQ[2], 10) : 2026;
          updatedQuarterly.push({
            year: yr,
            quarter: qCode,
            periodLabel: periodCol.trim(),
            adhbAcehBesar: adhbRow ? importPreview.gridData[adhbRow]?.[periodCol] ?? 0 : 0,
            adhkAcehBesar: adhkRow ? importPreview.gridData[adhkRow]?.[periodCol] ?? 0 : 0,
            adhbProvince: 65000,
            adhkProvince: 41000,
            qToQGrowthAB: qtoqRow ? importPreview.gridData[qtoqRow]?.[periodCol] ?? 0 : 0,
            yOnYGrowthAB: yonyRow ? importPreview.gridData[yonyRow]?.[periodCol] ?? 0 : 0,
            dominantSector: economyData.sectors[0]?.name || 'Pertanian, Kehutanan, dan Perikanan',
          });
        }
      });
      setQuarterlyRecords(updatedQuarterly);
      saveQuarterlyPDRB(updatedQuarterly);
      const nextTs = touchIndicatorTimestamp('PDRB_TW');
      setTimestamps(nextTs);
    }

    setIsImportModalOpen(false);
    setStatusMessage({
      type: 'success',
      text: `Data Excel (.xlsx) untuk indikator "${selectedIndicatorForImport.name}" berhasil diimpor & disinkronkan.`,
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Handler: Delete custom indicator (Admin Only)
  const handleDeleteIndicator = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus indikator "${name}" secara permanen?`)) {
      const updated = deleteCustomIndicatorById(id);
      setCustomIndicators(updated);
      setStatusMessage({
        type: 'success',
        text: `Indikator "${name}" berhasil dihapus dari sistem.`,
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="p-2.5 rounded-xl bg-blue-100 text-blue-800 shrink-0">
            <Layers className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">Daftar Indikator</h1>
            <p className="text-xs text-slate-500">
              {userRole === 'admin'
                ? 'Urutan indikator terbaru di atas • Lihat nilai, unduh template & impor Excel (.xlsx), dan ekspor data'
                : 'Urutan indikator terbaru di atas • Klik Lihat Nilai untuk pratinjau tabel atau Export Excel (.xlsx)'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {userRole === 'admin' && (
            <button
              onClick={onNavigateToInputData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-semibold text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Input / Buat Indikator Baru</span>
            </button>
          )}
          <button
            onClick={onNavigateToSchedule}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-semibold text-xs transition"
          >
            <Calendar className="w-4 h-4" />
            <span>Jadwal Rilis</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="truncate">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari indikator, singkatan, atau sumber..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Frekuensi:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilterPeriodicity('semua')}
              className={`px-3 py-1 rounded-md transition ${
                filterPeriodicity === 'semua'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({allIndicators.length})
            </button>
            <button
              onClick={() => setFilterPeriodicity('tahunan')}
              className={`px-3 py-1 rounded-md transition ${
                filterPeriodicity === 'tahunan'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tahunan
            </button>
            <button
              onClick={() => setFilterPeriodicity('triwulanan')}
              className={`px-3 py-1 rounded-md transition ${
                filterPeriodicity === 'triwulanan'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Triwulanan
            </button>
          </div>
        </div>
      </div>

      {/* VERTICAL LIST OF INDICATORS (Sorted Newest Updated/Inputted First) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
        {filteredIndicators.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            Tidak ditemukan indikator yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filteredIndicators.map((ind, idx) => {
            const relatedSchedule = schedules.find(
              (s) => s.indicatorCode === ind.code && s.status === 'Mendatang'
            );

            return (
              <div
                key={ind.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left Info Block */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {ind.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ind.periodicity === 'triwulanan'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {ind.periodicity === 'triwulanan' ? 'Triwulanan' : 'Tahunan'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ind.isBuiltIn
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ind.isBuiltIn ? 'Indikator Utama' : 'Indikator Kustom'}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                        Input Terbaru
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {ind.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>
                      Satuan: <strong className="text-slate-700">{ind.unit}</strong>
                    </span>
                    <span>
                      Dimensi:{' '}
                      <strong className="text-slate-700">
                        {ind.rowCount} Baris × {ind.colCount} Kolom
                      </strong>
                    </span>
                    <span className="truncate max-w-md" title={ind.source}>
                      Sumber: <strong className="text-slate-700">{ind.source}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      Diperbarui:{' '}
                      {new Date(ind.updatedAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {relatedSchedule && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200/80 text-[11px] text-orange-900 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>Jadwal rilis berikutnya: {relatedSchedule.releaseDate}</span>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Lihat Nilai (Always available to both User and Admin) */}
                  <button
                    onClick={() => setViewingIndicator(ind)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-700" />
                    <span>Lihat Nilai</span>
                  </button>

                  {/* Export Excel (.xlsx) */}
                  <button
                    onClick={() => handleExportExcel(ind)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition"
                    title="Export data indikator dalam format Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  {/* Admin-Only Actions: Template Excel & Import Data Excel */}
                  {userRole === 'admin' && (
                    <>
                      <button
                        onClick={() => handleDownloadTemplate(ind)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-800 text-xs font-semibold transition"
                        title="Unduh template Excel (.xlsx) khusus indikator ini"
                      >
                        <FileDown className="w-3.5 h-3.5 text-blue-600" />
                        <span>Template (.xlsx)</span>
                      </button>

                      <button
                        onClick={() => handleOpenImport(ind)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold shadow-xs transition"
                        title="Impor file Excel (.xlsx) ke indikator ini"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import Excel</span>
                      </button>

                      {!ind.isBuiltIn && (
                        <button
                          onClick={() => handleDeleteIndicator(ind.id, ind.name)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-200 transition"
                          title="Hapus Indikator Kustom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Import Data Excel (.xlsx) - Admin Only */}
      {isImportModalOpen && selectedIndicatorForImport && userRole === 'admin' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-sm truncate">
                    Import Data Excel (.xlsx): {selectedIndicatorForImport.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    Kode Indikator: {selectedIndicatorForImport.code} ({selectedIndicatorForImport.unit})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Download Template Excel reminder */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-blue-900">
                <p className="font-bold">Belum memiliki format file Excel yang sesuai?</p>
                <p className="text-[11px] text-blue-700">
                  Unduh template resmi berformat Excel (.xlsx) sesuai struktur baris &amp; kolom indikator ini.
                </p>
              </div>
              <button
                onClick={() => handleDownloadTemplate(selectedIndicatorForImport)}
                className="px-3 py-1.5 rounded-lg bg-blue-800 text-white font-semibold text-xs hover:bg-blue-900 transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Unduh Template (.xlsx)</span>
              </button>
            </div>

            {/* Step 2: File Upload Input (.xlsx / .xls) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Pilih File Excel (.xlsx / .xls) dari Perangkat Anda
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl p-2 cursor-pointer"
              />
              {selectedFileName && (
                <p className="text-[11px] text-slate-500">
                  File terpilih: <strong className="text-slate-800">{selectedFileName}</strong>
                </p>
              )}
              {importError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {importError}
                </div>
              )}
            </div>

            {/* Step 3: Preview Table */}
            {importPreview && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Pratinjau Data Excel ({importPreview.rowHeaders.length} Baris ×{' '}
                    {importPreview.columnHeaders.length} Kolom):
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Format Excel Valid
                  </span>
                </div>

                <div className="overflow-x-auto max-h-52 border border-slate-200 rounded-xl">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0">
                      <tr>
                        <th className="p-2 border-b border-slate-200 font-bold">Kategori / Baris</th>
                        {importPreview.columnHeaders.map((col) => (
                          <th key={col} className="p-2 border-b border-slate-200 font-bold text-right whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.rowHeaders.map((row) => (
                        <tr key={row} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-800">{row}</td>
                          {importPreview.columnHeaders.map((col) => (
                            <td key={col} className="p-2 text-right font-mono text-slate-700 whitespace-nowrap">
                              {importPreview.gridData[row]?.[col] ?? '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {importPreview.warnings.length > 0 && (
                  <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 space-y-0.5">
                    <span className="font-bold">Catatan penyesuaian:</span>
                    {importPreview.warnings.map((w, idx) => (
                      <p key={idx}>• {w}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                onClick={handleCommitImport}
                disabled={!importPreview || importPreview.rowHeaders.length === 0}
                className="px-4 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan &amp; Terapkan Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lihat Nilai Indikator (Available for Both Admin & User) */}
      {viewingIndicator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                  <TableIcon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {viewingIndicator.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    Kode: {viewingIndicator.code} | Satuan: {viewingIndicator.unit} | Sumber:{' '}
                    {viewingIndicator.source}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingIndicator(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-auto border border-slate-200 rounded-xl flex-1">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-blue-900 text-white sticky top-0">
                  <tr>
                    <th className="p-2.5 font-bold min-w-[200px]">Kategori / Baris</th>
                    {viewingIndicator.columnHeaders.map((col) => (
                      <th key={col} className="p-2.5 font-bold text-right whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingIndicator.rowHeaders.map((row, rIdx) => (
                    <tr key={row} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="p-2.5 font-semibold text-slate-800">{row}</td>
                      {viewingIndicator.columnHeaders.map((col) => {
                        const rawVal = viewingIndicator.gridData?.[row]?.[col];
                        return (
                          <td key={col} className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                            {typeof rawVal === 'number'
                              ? rawVal.toLocaleString('id-ID', { maximumFractionDigits: 2 })
                              : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                {userRole === 'admin' && (
                  <button
                    onClick={() => handleDownloadTemplate(viewingIndicator)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5 text-blue-600" />
                    <span>Template (.xlsx)</span>
                  </button>
                )}
                <button
                  onClick={() => handleExportExcel(viewingIndicator)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              <button
                onClick={() => setViewingIndicator(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
