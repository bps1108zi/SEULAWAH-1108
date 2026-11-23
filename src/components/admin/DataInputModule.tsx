import React, { useState, useEffect } from 'react';
import {
  RegionalPDRBData,
  DistrictData,
  IndicatorFormula,
  CustomIndicator,
  SectorPDRB,
  QuarterlyPDRBRecord,
  QuarterCode,
} from '../../types';
import {
  saveEconomyData,
  resetEconomyData,
  saveDistricts,
  getStoredFormulas,
  saveFormulas,
  getStoredCustomIndicators,
  saveCustomIndicators,
  deleteCustomIndicatorById,
  getStoredQuarterlyPDRB,
  saveQuarterlyPDRB,
  touchIndicatorTimestamp,
} from '../../services/storage';
import { exportQuarterlyPDRBExcel } from '../../utils/dataTransfer';
import {
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  CalendarPlus,
  Edit3,
  Plus,
  Trash2,
  TrendingUp,
  MapPin,
  Users,
  Building,
  X,
  Code2,
  PlusCircle,
  FileSpreadsheet,
  Layers,
  CalendarRange,
  Download,
} from 'lucide-react';

interface Props {
  economyData: RegionalPDRBData;
  districts: DistrictData[];
  onDataUpdated: (newData: RegionalPDRBData) => void;
  onDistrictsUpdated: (newDistricts: DistrictData[]) => void;
}

export const DataInputModule: React.FC<Props> = ({
  economyData,
  districts,
  onDataUpdated,
  onDistrictsUpdated,
}) => {
  // Local editable copies
  const [localEconomy, setLocalEconomy] = useState<RegionalPDRBData>(JSON.parse(JSON.stringify(economyData)));
  const [localDistricts, setLocalDistricts] = useState<DistrictData[]>(JSON.parse(JSON.stringify(districts)));
  const [localFormulas, setLocalFormulas] = useState<IndicatorFormula[]>(() => getStoredFormulas());
  const [localCustomIndicators, setLocalCustomIndicators] = useState<CustomIndicator[]>(() => getStoredCustomIndicators());
  const [localQuarterly, setLocalQuarterly] = useState<QuarterlyPDRBRecord[]>(() => getStoredQuarterlyPDRB());

  // Subtabs
  const [selectedSubTab, setSelectedSubTab] = useState<
    'pdrb-local' | 'pdrb-quarterly' | 'pdrb-prov' | 'population' | 'districts' | 'formulas' | 'custom-indicators'
  >('pdrb-local');

  const [priceType, setPriceType] = useState<'adhb' | 'adhk'>('adhb');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync with real-time storage/Firestore updates
  useEffect(() => {
    setLocalEconomy(JSON.parse(JSON.stringify(economyData)));
  }, [economyData]);

  useEffect(() => {
    setLocalDistricts(JSON.parse(JSON.stringify(districts)));
  }, [districts]);

  useEffect(() => {
    const onCi = (e: CustomEvent) => setLocalCustomIndicators(e.detail);
    const onQp = (e: CustomEvent) => setLocalQuarterly(e.detail);
    const onFm = (e: CustomEvent) => setLocalFormulas(e.detail);
    window.addEventListener('bps_custom_indicators_updated', onCi as EventListener);
    window.addEventListener('bps_quarterly_pdrb_updated', onQp as EventListener);
    window.addEventListener('bps_formulas_updated', onFm as EventListener);
    return () => {
      window.removeEventListener('bps_custom_indicators_updated', onCi as EventListener);
      window.removeEventListener('bps_quarterly_pdrb_updated', onQp as EventListener);
      window.removeEventListener('bps_formulas_updated', onFm as EventListener);
    };
  }, []);

  // Modals state
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [isAddQuarterModalOpen, setIsAddQuarterModalOpen] = useState(false);
  const [newQuarterYear, setNewQuarterYear] = useState<number>(2026);
  const [newQuarterCode, setNewQuarterCode] = useState<QuarterCode>('TW IV');
  const [isEditNomenclatureModalOpen, setIsEditNomenclatureModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState<number>(() => Math.max(...economyData.years) + 1);

  // New category row input
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');

  // New Custom Indicator form state with Dynamic Row/Col and Preview Grid
  const [isNewIndicatorModalOpen, setIsNewIndicatorModalOpen] = useState(false);
  const [newIndName, setNewIndName] = useState('');
  const [newIndCode, setNewIndCode] = useState('');
  const [newIndUnit, setNewIndUnit] = useState('%');
  const [newIndSource, setNewIndSource] = useState('BPS Kabupaten Aceh Besar (Katalog: 1102001.1108)');
  const [newIndRowCount, setNewIndRowCount] = useState<number>(3);
  const [newIndColCount, setNewIndColCount] = useState<number>(5);
  const [newIndRowHeaders, setNewIndRowHeaders] = useState<string[]>([
    'Kabupaten Aceh Besar',
    'Kota Banda Aceh (Pembanding)',
    'Provinsi Aceh',
  ]);
  const [newIndColHeaders, setNewIndColHeaders] = useState<string[]>([
    '2020',
    '2021',
    '2022',
    '2023',
    '2024',
  ]);
  const [newIndGridValues, setNewIndGridValues] = useState<Record<string, Record<string, number>>>({
    'Kabupaten Aceh Besar': { '2020': 5.4, '2021': 5.8, '2022': 6.2, '2023': 6.5, '2024': 6.9 },
    'Kota Banda Aceh (Pembanding)': { '2020': 5.1, '2021': 5.5, '2022': 5.9, '2023': 6.1, '2024': 6.4 },
    'Provinsi Aceh': { '2020': 4.9, '2021': 5.2, '2022': 5.6, '2023': 5.8, '2024': 6.1 },
  });

  // Safe modal opener with validated defaults
  const openNewIndicatorModal = () => {
    setNewIndName('');
    setNewIndCode('');
    setNewIndUnit('%');
    setNewIndSource('BPS Kabupaten Aceh Besar (Katalog: 1102001.1108)');
    setNewIndRowCount(3);
    setNewIndColCount(5);
    setNewIndRowHeaders(['Kabupaten Aceh Besar', 'Kota Banda Aceh (Pembanding)', 'Provinsi Aceh']);
    setNewIndColHeaders(['2020', '2021', '2022', '2023', '2024']);
    setNewIndGridValues({
      'Kabupaten Aceh Besar': { '2020': 5.4, '2021': 5.8, '2022': 6.2, '2023': 6.5, '2024': 6.9 },
      'Kota Banda Aceh (Pembanding)': { '2020': 5.1, '2021': 5.5, '2022': 5.9, '2023': 6.1, '2024': 6.4 },
      'Provinsi Aceh': { '2020': 4.9, '2021': 5.2, '2022': 5.6, '2023': 5.8, '2024': 6.1 },
    });
    setIsNewIndicatorModalOpen(true);
  };

  // Dynamic row count adjuster
  const handleRowCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(25, count));
    setNewIndRowCount(validCount);
    const updatedRows = [...(newIndRowHeaders || [])];
    while (updatedRows.length < validCount) {
      updatedRows.push(`Baris Data ${updatedRows.length + 1}`);
    }
    setNewIndRowHeaders(updatedRows.slice(0, validCount));
  };

  // Dynamic column count adjuster
  const handleColCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(25, count));
    setNewIndColCount(validCount);
    const updatedCols = [...(newIndColHeaders || [])];
    while (updatedCols.length < validCount) {
      const lastYear = parseInt(updatedCols[updatedCols.length - 1], 10);
      const nextLabel = !isNaN(lastYear) ? String(lastYear + 1) : `Kolom ${updatedCols.length + 1}`;
      updatedCols.push(nextLabel);
    }
    setNewIndColHeaders(updatedCols.slice(0, validCount));
  };

  // Update specific row header name
  const handleRowHeaderNameChange = (idx: number, name: string) => {
    const updated = [...(newIndRowHeaders || [])];
    updated[idx] = name;
    setNewIndRowHeaders(updated);
  };

  // Update specific column header name
  const handleColHeaderNameChange = (idx: number, name: string) => {
    const updated = [...(newIndColHeaders || [])];
    updated[idx] = name;
    setNewIndColHeaders(updated);
  };

  // Update preview cell value safely
  const handlePreviewCellValueChange = (rowName: string, colName: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setNewIndGridValues((prev) => {
      const safePrev = prev || {};
      return {
        ...safePrev,
        [rowName]: {
          ...(safePrev[rowName] || {}),
          [colName]: val,
        },
      };
    });
  };

  // Cell change: PDRB Aceh Besar
  const handleLocalPDRBChange = (sectorCode: string, year: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const updated = { ...localEconomy };
    const sec = updated.sectors.find((s) => s.code === sectorCode);
    if (sec) {
      sec[priceType][year] = val;
      setLocalEconomy(updated);
    }
  };

  // Cell change: PDRB Prov
  const handleProvPDRBChange = (sectorCode: string, year: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const updated = { ...localEconomy };
    const sec = updated.provinceSectors.find((s) => s.code === sectorCode);
    if (sec) {
      sec[priceType][year] = val;
      setLocalEconomy(updated);
    }
  };

  // Cell change: Population
  const handlePopulationChange = (target: 'regency' | 'province', year: number, valStr: string) => {
    const val = parseInt(valStr, 10) || 0;
    const updated = { ...localEconomy };
    if (target === 'regency') {
      updated.population[year] = val;
    } else {
      updated.provincePopulation[year] = val;
    }
    setLocalEconomy(updated);
  };

  // Cell change: Districts
  const handleDistrictChange = (distId: string, field: keyof DistrictData, val: any) => {
    const updated = localDistricts.map((d) => {
      if (d.id === distId) {
        return { ...d, [field]: val };
      }
      return d;
    });
    setLocalDistricts(updated);
  };

  // Quarterly PDRB cell change
  const handleQuarterlyChange = (
    idx: number,
    field: keyof QuarterlyPDRBRecord,
    value: number | string
  ) => {
    const updated = localQuarterly.map((rec, i) => {
      if (i === idx) {
        return { ...rec, [field]: value };
      }
      return rec;
    });
    setLocalQuarterly(updated);
  };

  // Add new Quarterly PDRB period
  const handleAddQuarter = () => {
    const periodLabel = `${newQuarterCode} ${newQuarterYear}`;
    if (localQuarterly.some((q) => q.periodLabel === periodLabel)) {
      setStatusMessage({
        type: 'error',
        text: `Periode ${periodLabel} sudah ada pada data PDRB Triwulanan.`,
      });
      return;
    }
    const last = localQuarterly[localQuarterly.length - 1];
    const newRec: QuarterlyPDRBRecord = {
      year: newQuarterYear,
      quarter: newQuarterCode,
      periodLabel,
      adhbAcehBesar: last ? Number((last.adhbAcehBesar * 1.015).toFixed(2)) : 6500,
      adhkAcehBesar: last ? Number((last.adhkAcehBesar * 1.012).toFixed(2)) : 3800,
      adhbProvince: last ? Number((last.adhbProvince * 1.014).toFixed(2)) : 62000,
      adhkProvince: last ? Number((last.adhkProvince * 1.011).toFixed(2)) : 37000,
      qToQGrowthAB: 1.45,
      yOnYGrowthAB: 5.1,
      qToQGrowthProv: 1.35,
      yOnYGrowthProv: 4.85,
      dominantSector:
        last?.dominantSector ||
        localEconomy.sectors[0]?.name ||
        'Pertanian, Kehutanan, dan Perikanan',
    };
    const updated = [...localQuarterly, newRec];
    setLocalQuarterly(updated);
    saveQuarterlyPDRB(updated);
    touchIndicatorTimestamp('PDRB_TW');
    setIsAddQuarterModalOpen(false);
    setStatusMessage({
      type: 'success',
      text: `Periode ${periodLabel} berhasil ditambahkan dan disinkronkan!`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 1. TAMBAH TAHUN BARU - Otomatis sinkronisasi ke seluruh aplikasi
  const handleConfirmAddYear = () => {
    if (localEconomy.years.includes(newYearInput)) {
      setStatusMessage({
        type: 'error',
        text: `Tahun ${newYearInput} sudah ada dalam basis data.`,
      });
      return;
    }

    const latestYear = Math.max(...localEconomy.years);
    const updated = { ...localEconomy };
    updated.years = [...updated.years, newYearInput].sort((a, b) => a - b);

    updated.sectors.forEach((sec) => {
      const prevAdhb = sec.adhb[latestYear] || 100;
      const prevAdhk = sec.adhk[latestYear] || 80;
      sec.adhb[newYearInput] = Number((prevAdhb * 1.055).toFixed(2));
      sec.adhk[newYearInput] = Number((prevAdhk * 1.045).toFixed(2));
    });

    updated.provinceSectors.forEach((sec) => {
      const prevAdhb = sec.adhb[latestYear] || 1000;
      const prevAdhk = sec.adhk[latestYear] || 800;
      sec.adhb[newYearInput] = Number((prevAdhb * 1.052).toFixed(2));
      sec.adhk[newYearInput] = Number((prevAdhk * 1.042).toFixed(2));
    });

    const prevPop = updated.population[latestYear] || 440000;
    const prevProvPop = updated.provincePopulation[latestYear] || 5500000;
    updated.population[newYearInput] = Math.round(prevPop * 1.015);
    updated.provincePopulation[newYearInput] = Math.round(prevProvPop * 1.013);

    // Save and emit immediately to update all series range dropdowns across the application
    setLocalEconomy(updated);
    saveEconomyData(updated);
    touchIndicatorTimestamp('PDRB_ADHB');
    touchIndicatorTimestamp('PDRB_ADHK');
    touchIndicatorTimestamp('POP_AB');
    onDataUpdated(updated);

    setIsAddYearModalOpen(false);
    setStatusMessage({
      type: 'success',
      text: `Tahun ${newYearInput} berhasil ditambahkan! Pilihan rentang series otomatis terupdate di Perekonomian Kita.`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 2. EDIT / TAMBAH / HAPUS NOMENKLATUR KATEGORI
  const handleUpdateNomenclature = (sectorCode: string, newName: string) => {
    const updated = { ...localEconomy };
    const sec = updated.sectors.find((s) => s.code === sectorCode);
    if (sec) sec.name = newName;
    const provSec = updated.provinceSectors.find((s) => s.code === sectorCode);
    if (provSec) provSec.name = newName;
    setLocalEconomy(updated);
  };

  // Tambah baris kategori baru
  const handleAddCategoryRow = () => {
    if (!newCatCode.trim() || !newCatName.trim()) {
      alert('Masukkan Kode Kategori dan Nama Kategori.');
      return;
    }

    const code = newCatCode.trim().toUpperCase();
    if (localEconomy.sectors.some((s) => s.code === code)) {
      alert(`Kategori dengan kode [${code}] sudah ada.`);
      return;
    }

    const updated = { ...localEconomy };
    const initialAdhb: Record<number, number> = {};
    const initialAdhk: Record<number, number> = {};
    const provAdhb: Record<number, number> = {};
    const provAdhk: Record<number, number> = {};

    updated.years.forEach((y) => {
      initialAdhb[y] = 250;
      initialAdhk[y] = 180;
      provAdhb[y] = 2500;
      provAdhk[y] = 1800;
    });

    const newSector: SectorPDRB = {
      code,
      name: newCatName.trim(),
      adhb: initialAdhb,
      adhk: initialAdhk,
    };

    const newProvSector: SectorPDRB = {
      code,
      name: newCatName.trim(),
      adhb: provAdhb,
      adhk: provAdhk,
    };

    updated.sectors.push(newSector);
    updated.provinceSectors.push(newProvSector);

    setLocalEconomy(updated);
    setNewCatCode('');
    setNewCatName('');
    setStatusMessage({
      type: 'success',
      text: `Baris kategori baru [${code}] ${newCatName} berhasil ditambahkan!`,
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Hapus baris kategori
  const handleDeleteCategoryRow = (code: string) => {
    if (window.confirm(`Yakin ingin menghapus baris kategori [${code}]?`)) {
      const updated = { ...localEconomy };
      updated.sectors = updated.sectors.filter((s) => s.code !== code);
      updated.provinceSectors = updated.provinceSectors.filter((s) => s.code !== code);
      setLocalEconomy(updated);
      setStatusMessage({
        type: 'success',
        text: `Baris kategori [${code}] berhasil dihapus.`,
      });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // 3. EDIT RUMUS & FORMULA ANALISIS
  const handleFormulaChange = (id: string, newExpr: string) => {
    const updated = localFormulas.map((f) => {
      if (f.id === id) {
        return { ...f, formulaExpression: newExpr, updatedAt: new Date().toISOString() };
      }
      return f;
    });
    setLocalFormulas(updated);
  };

  // 4. TAMBAH INDIKATOR BARU (KUSTOM) DENGAN MATRIKS GRID DATA
  const handleCreateCustomIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIndName.trim() || !newIndCode.trim()) return;

    // Build the gridData mapping from newIndRowHeaders and newIndColHeaders
    const finalGridData: Record<string, Record<string, number>> = {};
    newIndRowHeaders.forEach((rowName, rIdx) => {
      finalGridData[rowName] = {};
      newIndColHeaders.forEach((colName, cIdx) => {
        const existingVal = newIndGridValues[rowName]?.[colName];
        finalGridData[rowName][colName] = existingVal !== undefined ? existingVal : Number((5.5 + rIdx * 1.2 + cIdx * 0.4).toFixed(2));
      });
    });

    const now = new Date().toISOString();
    const created: CustomIndicator = {
      id: `ci-${Date.now()}`,
      name: newIndName.trim(),
      code: newIndCode.trim().toUpperCase(),
      unit: newIndUnit.trim() || '-',
      source: newIndSource.trim() || 'BPS Kabupaten Aceh Besar',
      rowCount: newIndRowCount,
      colCount: newIndColCount,
      rowHeaders: [...newIndRowHeaders],
      columnHeaders: [...newIndColHeaders],
      gridData: finalGridData,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [created, ...localCustomIndicators];
    setLocalCustomIndicators(updated);
    saveCustomIndicators(updated);
    setIsNewIndicatorModalOpen(false);
    setNewIndName('');
    setNewIndCode('');
    setStatusMessage({
      type: 'success',
      text: `Indikator baru "${created.name}" (${created.code}) dengan tabel ${created.rowCount} Baris x ${created.colCount} Kolom data berhasil dibuat!`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleCustomIndicatorCellChange = (
    indicatorId: string,
    rowName: string,
    colName: string,
    valStr: string
  ) => {
    const val = parseFloat(valStr) || 0;
    const updated = localCustomIndicators.map((ci) => {
      if (ci.id === indicatorId) {
        return {
          ...ci,
          updatedAt: new Date().toISOString(),
          gridData: {
            ...ci.gridData,
            [rowName]: {
              ...(ci.gridData?.[rowName] || {}),
              [colName]: val,
            },
          },
        };
      }
      return ci;
    });
    setLocalCustomIndicators(updated);
  };

  const handleDeleteCustomIndicator = (indicatorId: string) => {
    if (window.confirm('Yakin ingin menghapus indikator kustom ini?')) {
      const updated = deleteCustomIndicatorById(indicatorId);
      setLocalCustomIndicators(updated);
      setStatusMessage({
        type: 'success',
        text: 'Indikator kustom berhasil dihapus.',
      });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // SAVE ALL
  const handleSaveAll = () => {
    saveEconomyData(localEconomy);
    saveDistricts(localDistricts);
    saveFormulas(localFormulas);
    saveCustomIndicators(localCustomIndicators);
    saveQuarterlyPDRB(localQuarterly);
    touchIndicatorTimestamp('PDRB_ADHB');
    touchIndicatorTimestamp('PDRB_ADHK');
    touchIndicatorTimestamp('POP_AB');
    touchIndicatorTimestamp('PDRB_TW');
    onDataUpdated(localEconomy);
    onDistrictsUpdated(localDistricts);

    setStatusMessage({
      type: 'success',
      text: 'Semua perubahan data tahunan, PDRB triwulanan, rumus formula, dan indikator kustom berhasil disimpan dan disinkronkan ke cloud!',
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // RESET DEFAULT
  const handleReset = () => {
    if (window.confirm('Reset seluruh data ke default resmi BPS Kabupaten Aceh Besar?')) {
      const resetData = resetEconomyData();
      setLocalEconomy(JSON.parse(JSON.stringify(resetData)));
      onDataUpdated(resetData);
      setStatusMessage({
        type: 'success',
        text: 'Data telah direset ke nilai default BPS.',
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-blue-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2.5 border border-amber-500/40">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>Khusus Hak Akses Administrator (Admin Only)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Input Sumber Data, Nomenklatur & Rumus Formula
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Dilengkapi singkatan indikator untuk identifikasi rumus, editor rumus formula analisis, penambahan tahun baru, penyesuaian baris kategori, serta input indikator baru level kabupaten/kecamatan.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setNewYearInput(Math.max(...localEconomy.years) + 1);
                setIsAddYearModalOpen(true);
              }}
              className="px-3 py-2 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <CalendarPlus className="w-4 h-4 text-orange-300" />
              <span>Tambah Tahun Baru</span>
            </button>

            <button
              onClick={() => setIsEditNomenclatureModalOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 border border-slate-700"
            >
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>Kelola Baris Kategori</span>
            </button>

            <button
              onClick={openNewIndicatorModal}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-amber-200" />
              <span>Tambah Indikator Baru</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold rounded-xl border border-white/20 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Sub Tabs Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          onClick={() => setSelectedSubTab('pdrb-local')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'pdrb-local'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>PDRB Aceh Besar [PDRB_SEK_AB]</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('pdrb-quarterly')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'pdrb-quarterly'
              ? 'bg-purple-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5" />
          <span>PDRB Triwulanan [PDRB_TW]</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('pdrb-prov')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'pdrb-prov'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>PDRB Provinsi [PDRB_SEK_PROV]</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('population')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'population'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Penduduk [POP_AB]</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('districts')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'districts'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>23 Kecamatan (Level Kec)</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('formulas')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'formulas'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Rumus Formula Analisis</span>
        </button>

        <button
          onClick={() => setSelectedSubTab('custom-indicators')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            selectedSubTab === 'custom-indicators'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Input Indikator Baru</span>
        </button>
      </div>

      {/* TAB 1: PDRB ACEH BESAR */}
      {selectedSubTab === 'pdrb-local' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[10px] font-bold">
                  VAR: PDRB_SEK_AB
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  Data PDRB Kabupaten Aceh Besar (Miliar Rupiah)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Singkatan rumus: Nilai PDRB Sektor = <code className="text-blue-700 font-bold">PDRB_SEK_AB</code>, Total PDRB = <code className="text-blue-700 font-bold">PDRB_AB</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Basis Harga:</span>
              <div className="bg-slate-100 p-1 rounded-xl flex text-xs">
                <button
                  type="button"
                  onClick={() => setPriceType('adhb')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    priceType === 'adhb' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ADHB (Nominal)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType('adhk')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    priceType === 'adhk' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ADHK (Riil)
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-14">Kode</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Kategori Lapangan Usaha</th>
                  {localEconomy.years.map((y) => (
                    <th key={y} className="py-2.5 px-2 text-right min-w-[95px]">
                      {y} (Miliar)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {localEconomy.sectors.map((s) => (
                  <tr key={s.code} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-bold text-blue-800">{s.code}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">{s.name}</td>
                    {localEconomy.years.map((y) => (
                      <td key={y} className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={s[priceType][y] ?? 0}
                          onChange={(e) => handleLocalPDRBChange(s.code, y, e.target.value)}
                          className="w-22 text-right px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white text-xs font-mono font-semibold"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1B: PDRB TRIWULANAN */}
      {selectedSubTab === 'pdrb-quarterly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono text-[10px] font-bold">
                  VAR: PDRB_TW
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  Input Data PDRB Triwulanan (ADHB, ADHK & Pertumbuhan)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sektor penggerak merujuk langsung kepada daftar kategori nomenklatur resmi Lapangan Usaha.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => exportQuarterlyPDRBExcel(localQuarterly)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddQuarterModalOpen(true)}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Triwulan Baru</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 min-w-[105px]">Periode</th>
                  <th className="py-2.5 px-2 text-right min-w-[110px]">ADHB AB (M)</th>
                  <th className="py-2.5 px-2 text-right min-w-[110px]">ADHK AB (M)</th>
                  <th className="py-2.5 px-2 text-right min-w-[115px]">ADHB Prov (M)</th>
                  <th className="py-2.5 px-2 text-right min-w-[115px]">ADHK Prov (M)</th>
                  <th className="py-2.5 px-2 text-right min-w-[85px]">q-to-q (%)</th>
                  <th className="py-2.5 px-2 text-right min-w-[85px]">y-on-y (%)</th>
                  <th className="py-2.5 px-3 min-w-[230px]">Sektor Penggerak (Nomenklatur)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localQuarterly.map((q, idx) => (
                  <tr key={q.periodLabel} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-bold text-purple-900 whitespace-nowrap">
                      {q.periodLabel}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={q.adhbAcehBesar}
                        onChange={(e) =>
                          handleQuarterlyChange(idx, 'adhbAcehBesar', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={q.adhkAcehBesar}
                        onChange={(e) =>
                          handleQuarterlyChange(idx, 'adhkAcehBesar', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={q.adhbProvince}
                        onChange={(e) =>
                          handleQuarterlyChange(idx, 'adhbProvince', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={q.adhkProvince}
                        onChange={(e) =>
                          handleQuarterlyChange(idx, 'adhkProvince', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={q.qToQGrowthAB ?? 0}
                        onChange={(e) =>
                          handleQuarterlyChange(idx, 'qToQGrowthAB', parseFloat(e.target.value) || 0)
                        }
                        className="w-18 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-emerald-700"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={q.yOnYGrowthAB ?? 0}
                        onChange={(e) =>
                          handleQuarterlyChange(idx, 'yOnYGrowthAB', parseFloat(e.target.value) || 0)
                        }
                        className="w-18 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-blue-800"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <select
                        value={q.dominantSector || localEconomy.sectors[0]?.name || ''}
                        onChange={(e) => handleQuarterlyChange(idx, 'dominantSector', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
                      >
                        {localEconomy.sectors.map((sec) => (
                          <option key={sec.code} value={sec.name}>
                            [{sec.code}] {sec.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PDRB PROVINSI ACEH */}
      {selectedSubTab === 'pdrb-prov' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[10px] font-bold">
                  VAR: PDRB_SEK_PROV
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  Data PDRB Provinsi Aceh (Referensi Pembanding)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Singkatan rumus: Nilai PDRB Sektor Provinsi = <code className="text-blue-700 font-bold">PDRB_SEK_PROV</code>, Total PDRB Provinsi = <code className="text-blue-700 font-bold">PDRB_PROV</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Basis Harga:</span>
              <div className="bg-slate-100 p-1 rounded-xl flex text-xs">
                <button
                  type="button"
                  onClick={() => setPriceType('adhb')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    priceType === 'adhb' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ADHB (Nominal)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType('adhk')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    priceType === 'adhk' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  ADHK (Riil)
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-14">Kode</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Kategori Lapangan Usaha Provinsi</th>
                  {localEconomy.years.map((y) => (
                    <th key={y} className="py-2.5 px-2 text-right min-w-[95px]">
                      {y} (Miliar)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {localEconomy.provinceSectors.map((s) => (
                  <tr key={s.code} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-bold text-blue-800">{s.code}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">{s.name}</td>
                    {localEconomy.years.map((y) => (
                      <td key={y} className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={s[priceType][y] ?? 0}
                          onChange={(e) => handleProvPDRBChange(s.code, y, e.target.value)}
                          className="w-24 text-right px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white text-xs font-mono font-semibold"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: POPULATION */}
      {selectedSubTab === 'population' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[10px] font-bold">
                VAR: POP_AB & POP_PROV
              </span>
              <h3 className="font-bold text-base text-slate-900">
                Data Jumlah Penduduk (Jiwa)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Digunakan dalam rumus pendapatan per kapita: <code>KAPITA = (PDRB_AB * 1_000_000_000) / POP_AB</code>
            </p>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 min-w-[180px]">Wilayah Administrasi</th>
                  <th className="py-2.5 px-3">Singkatan Variabel</th>
                  {localEconomy.years.map((y) => (
                    <th key={y} className="py-2.5 px-3 text-right min-w-[105px]">
                      {y} (Jiwa)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-sans font-bold text-blue-900">
                    Kabupaten Aceh Besar
                  </td>
                  <td className="py-3 px-3 text-blue-700 font-bold">POP_AB</td>
                  {localEconomy.years.map((y) => (
                    <td key={y} className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={localEconomy.population[y] || 0}
                        onChange={(e) => handlePopulationChange('regency', y, e.target.value)}
                        className="w-26 text-right px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white font-mono font-bold text-xs"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-sans font-bold text-slate-800">
                    Provinsi Aceh (Total)
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-bold">POP_PROV</td>
                  {localEconomy.years.map((y) => (
                    <td key={y} className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={localEconomy.provincePopulation[y] || 0}
                        onChange={(e) => handlePopulationChange('province', y, e.target.value)}
                        className="w-26 text-right px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white font-mono font-bold text-xs"
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 23 KECAMATAN LEVEL DATA */}
      {selectedSubTab === 'districts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-blue-900">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span>Sumber Data Resmi Khusus Level Kecamatan di Aceh Besar:</span>
            </p>
            <p className="text-[11px] leading-relaxed text-blue-900">
              Indikator pada tabel ini merupakan data resmi yang tersedia hingga level 23 kecamatan, bersumber dari <strong>BPS Kabupaten Aceh Besar: Publikasi Kabupaten Aceh Besar Dalam Angka (KDA Katalog: 1102001.1108)</strong>, Pendataan Potensi Desa (PODES), Hasil SP2020 Lanjutan, dan Survei KSA Padi.
            </p>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-16">Kode</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Kecamatan</th>
                  <th className="py-2.5 px-2 text-right min-w-[85px]" title="KEC_POP">
                    Penduduk (Jiwa)
                  </th>
                  <th className="py-2.5 px-2 text-right min-w-[85px]" title="KEC_PDRB">
                    PDRB (M)
                  </th>
                  <th className="py-2.5 px-2 text-right min-w-[75px]" title="KEC_GROWTH">
                    Laju (%)
                  </th>
                  <th className="py-2.5 px-2 text-right min-w-[90px]" title="KEC_SAWAH">
                    Sawah (Ha)
                  </th>
                  <th className="py-2.5 px-2 text-right min-w-[70px]" title="KEC_PASAR">
                    Pasar
                  </th>
                  <th className="py-2.5 px-3 min-w-[170px]" title="KEC_LEAD">
                    Komoditas / Sektor Basis Unggulan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localDistricts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-mono font-bold text-blue-800">{d.code}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{d.name}</td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        value={d.population}
                        onChange={(e) => handleDistrictChange(d.id, 'population', parseInt(e.target.value, 10) || 0)}
                        className="w-20 text-right px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={d.pdrbEstimateMiliar}
                        onChange={(e) => handleDistrictChange(d.id, 'pdrbEstimateMiliar', parseFloat(e.target.value) || 0)}
                        className="w-20 text-right px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={d.growthRate}
                        onChange={(e) => handleDistrictChange(d.id, 'growthRate', parseFloat(e.target.value) || 0)}
                        className="w-16 text-right px-1.5 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white font-mono text-xs text-blue-700 font-bold"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        value={d.luasBakuSawahHa || 0}
                        onChange={(e) => handleDistrictChange(d.id, 'luasBakuSawahHa', parseInt(e.target.value, 10) || 0)}
                        className="w-20 text-right px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        value={d.jumlahSaranaPasar || 0}
                        onChange={(e) => handleDistrictChange(d.id, 'jumlahSaranaPasar', parseInt(e.target.value, 10) || 0)}
                        className="w-14 text-right px-1.5 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={d.leadingSector}
                        onChange={(e) => handleDistrictChange(d.id, 'leadingSector', e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: RUMUS & FORMULA ANALISIS (BISA DI-EDIT SESUAI SINGKATAN INDIKATOR) */}
      {selectedSubTab === 'formulas' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-700" />
              <span>Daftar & Editor Rumus Dasar Analisis Ekonomi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rumus dasar diidentifikasi menggunakan singkatan indikator resmi. Anda dapat mengedit ekspresi rumus di bawah ini sesuai metodologi BPS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localFormulas.map((form) => (
              <div key={form.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900">{form.name}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold uppercase">
                    {form.targetAnalysis}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Ekspresi Rumus (Menggunakan Singkatan Indikator):
                  </label>
                  <input
                    type="text"
                    value={form.formulaExpression}
                    onChange={(e) => handleFormulaChange(form.id, e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="text-slate-500">{form.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {form.variablesUsed.map((v) => (
                      <span key={v} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 font-mono text-[9px] rounded font-bold">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: INPUT & KELOLA INDIKATOR BARU (KUSTOM) */}
      {selectedSubTab === 'custom-indicators' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-orange-500" />
                <span>Input & Kelola Indikator Baru (Kustom)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rancang indikator baru lengkap dengan konfigurasi jumlah baris dan kolom data, penamaan baris/kolom, serta tabel preview data interaktif.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewIndicatorModal}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Indikator Baru</span>
            </button>
          </div>

          {/* List of Custom Indicators as formatted Matrix Tables */}
          {localCustomIndicators.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Belum ada indikator kustom tambahan</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Klik tombol "Buat Indikator Baru" di atas untuk menambahkan indikator dengan matriks tabel kustom.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {localCustomIndicators.map((ci) => {
                const safeCols = Array.isArray(ci.columnHeaders) && ci.columnHeaders.length > 0
                  ? ci.columnHeaders
                  : ['2020', '2021', '2022', '2023', '2024'];
                const safeRows = Array.isArray(ci.rowHeaders) && ci.rowHeaders.length > 0
                  ? ci.rowHeaders
                  : ['Kabupaten Aceh Besar', 'Provinsi Aceh'];

                return (
                  <div key={ci.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{ci.name}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[10px] font-bold">
                            {ci.code}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-semibold">
                            {safeRows.length} Baris x {safeCols.length} Kolom Data
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Satuan: <span className="font-semibold text-slate-700">{ci.unit}</span> • Sumber Resmi: <span className="font-semibold text-slate-700">{ci.source}</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomIndicator(ci.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg border border-rose-200 transition shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Indikator</span>
                      </button>
                    </div>

                    {/* Formatted Matrix Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5 font-bold text-slate-700 bg-slate-100/90 min-w-[200px]">
                              Karakteristik / Kategori
                            </th>
                            {safeCols.map((colName, cIdx) => (
                              <th key={`hdr-col-${ci.id}-${cIdx}`} className="px-3.5 py-2.5 text-right font-bold text-slate-700 min-w-[110px]">
                                {colName}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {safeRows.map((rowName, rIdx) => (
                            <tr key={`row-${ci.id}-${rIdx}`} className="hover:bg-blue-50/40 transition">
                              <td className="px-3.5 py-2 font-semibold text-slate-800 bg-slate-50/50">
                                {rowName}
                              </td>
                              {safeCols.map((colName, cIdx) => (
                                <td key={`cell-${ci.id}-${rIdx}-${cIdx}`} className="px-2 py-1.5 text-right">
                                  <input
                                    type="number"
                                    step="any"
                                    value={ci.gridData?.[rowName]?.[colName] ?? 0}
                                    onChange={(e) =>
                                      handleCustomIndicatorCellChange(ci.id, rowName, colName, e.target.value)
                                    }
                                    className="w-24 text-right px-2 py-1 rounded-md border border-slate-200 hover:border-blue-400 focus:border-blue-600 focus:outline-none font-mono text-xs bg-white text-slate-900"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: TAMBAH TAHUN BARU */}
      {isAddYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <CalendarPlus className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Tambah Tahun Baru</h3>
                  <p className="text-xs text-slate-500">Ekspansi Deret Data PDRB</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddYearModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tahun baru akan otomatis ditambahkan ke seluruh 17 sektor PDRB Kabupaten Aceh Besar, PDRB Provinsi Aceh, dan data populasi penduduk. Pilihan rentang series pada menu Perekonomian Kita akan langsung terupdate.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Baru yang Ditambahkan:
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2035}
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(parseInt(e.target.value, 10) || newYearInput)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddYearModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddYear}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition"
                >
                  Tambahkan Tahun {newYearInput}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: KELOLA BARIS KATEGORI (EDIT, TAMBAH, HAPUS) */}
      {isEditNomenclatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Edit3 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Kelola Baris Kategori Lapangan Usaha
                  </h3>
                  <p className="text-xs text-slate-500">Edit Nama, Tambah Kategori Baru, atau Hapus Baris</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditNomenclatureModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Category Row Form */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 my-3 shrink-0">
              <span className="block text-xs font-bold text-amber-900 mb-2">
                + Tambah Baris Kategori Baru
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Kode (misal: S)"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                  className="w-full sm:w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-amber-300 bg-white"
                />
                <input
                  type="text"
                  placeholder="Nama Kategori Lapangan Usaha"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCategoryRow}
                  className="w-full sm:w-auto px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs shrink-0"
                >
                  Tambah Baris
                </button>
              </div>
            </div>

            {/* Editable List of Category Rows with Delete Option */}
            <div className="flex-1 overflow-y-auto py-1 space-y-2">
              {localEconomy.sectors.map((sec) => (
                <div key={sec.code} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-12 text-center font-mono font-bold text-blue-800 text-xs shrink-0">
                    [{sec.code}]
                  </span>
                  <input
                    type="text"
                    value={sec.name}
                    onChange={(e) => handleUpdateNomenclature(sec.code, e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteCategoryRow(sec.code)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus baris kategori ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsEditNomenclatureModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold shadow-md transition"
              >
                Selesai & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INPUT INDIKATOR BARU DENGAN PREVIEW TABEL & DIMENSI DATA */}
      {isNewIndicatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 text-orange-800 rounded-xl">
                  <PlusCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Rancang & Buat Indikator Baru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi Jumlah Baris & Kolom Data, Label Karakteristik, serta Preview Tabel Interaktif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewIndicatorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateCustomIndicator} className="flex-1 overflow-y-auto py-4 space-y-5">
              {/* Step 1: Info Dasar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Indikator <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tingkat Partisipasi Angkatan Kerja"
                    value={newIndName}
                    onChange={(e) => setNewIndName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Singkatan Indikator (Kode) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: TPAK_AB"
                    value={newIndCode}
                    onChange={(e) => setNewIndCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan Data
                  </label>
                  <input
                    type="text"
                    value={newIndUnit}
                    onChange={(e) => setNewIndUnit(e.target.value)}
                    placeholder="%, Jiwa, Kuintal/Ha, Rp"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Sumber Data */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sumber Data Resmi BPS / Dinas Terkait
                </label>
                <input
                  type="text"
                  value={newIndSource}
                  onChange={(e) => setNewIndSource(e.target.value)}
                  placeholder="Contoh: BPS Kabupaten Aceh Besar (Katalog: 1102001.1108)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Step 2: Konfigurasi Dimensi Data (Jumlah Baris & Kolom Data Saja) */}
              <div className="p-4 rounded-xl bg-orange-50/80 border border-orange-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-extrabold text-orange-950 uppercase tracking-wide">
                    Dimensi Data Tabel (Hanya Datanya, Tidak Termasuk Karakteristik Header)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Jumlah Baris Data:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={newIndRowCount}
                        onChange={(e) => handleRowCountChange(parseInt(e.target.value, 10) || 1)}
                        className="w-24 px-3 py-2 rounded-xl border border-orange-300 bg-white font-mono font-bold text-sm text-center"
                      />
                      <span className="text-[11px] text-slate-500">
                        baris entitas data (misal: 3 daerah/kategori)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Jumlah Kolom Data:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={newIndColCount}
                        onChange={(e) => handleColCountChange(parseInt(e.target.value, 10) || 1)}
                        className="w-24 px-3 py-2 rounded-xl border border-orange-300 bg-white font-mono font-bold text-sm text-center"
                      />
                      <span className="text-[11px] text-slate-500">
                        kolom variabel/waktu (misal: 5 deret tahun)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Input Nama Baris & Nama Kolom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input Nama Baris */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="block text-xs font-bold text-slate-800">
                    Nama Setiap Baris Data ({(newIndRowHeaders || []).length} Baris):
                  </span>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(newIndRowHeaders || []).map((rName, idx) => (
                      <div key={`row-header-input-${idx}`} className="flex items-center gap-2">
                        <span className="w-6 text-[10px] font-bold text-slate-400 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={rName}
                          onChange={(e) => handleRowHeaderNameChange(idx, e.target.value)}
                          placeholder={`Nama Baris ${idx + 1}`}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Input Nama Kolom */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="block text-xs font-bold text-slate-800">
                    Nama Setiap Kolom Data ({(newIndColHeaders || []).length} Kolom):
                  </span>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {(newIndColHeaders || []).map((cName, idx) => (
                      <div key={`col-header-input-${idx}`} className="flex items-center gap-2">
                        <span className="w-6 text-[10px] font-bold text-slate-400 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={cName}
                          onChange={(e) => handleColHeaderNameChange(idx, e.target.value)}
                          placeholder={`Nama Kolom ${idx + 1} (misal: 2024)`}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 4: PREVIEW TABEL YANG COBA DIBUAT (LIVE INTERACTIVE PREVIEW) */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-extrabold text-slate-900">
                      Preview Tabel Data yang Sedang Dibuat
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    *Nilai data pada sel di bawah dapat langsung diisi sebagai data awal
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-inner bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-blue-900 text-white font-bold border-b border-blue-950">
                      <tr>
                        <th className="px-3.5 py-2.5 min-w-[180px] bg-blue-950">
                          Karakteristik / Kategori
                        </th>
                        {(newIndColHeaders || []).map((colName, cIdx) => (
                          <th key={`prev-col-${cIdx}`} className="px-3 py-2.5 text-right min-w-[100px]">
                            {colName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(newIndRowHeaders || []).map((rowName, rIdx) => (
                        <tr key={`prev-row-${rIdx}`} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2 font-semibold text-slate-800 bg-slate-50">
                            {rowName}
                          </td>
                          {(newIndColHeaders || []).map((colName, cIdx) => (
                            <td key={`prev-cell-${rIdx}-${cIdx}`} className="px-2 py-1.5 text-right">
                              <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={newIndGridValues?.[rowName]?.[colName] ?? ''}
                                onChange={(e) =>
                                  handlePreviewCellValueChange(rowName, colName, e.target.value)
                                }
                                className="w-24 text-right px-2 py-1 rounded-md border border-slate-300 focus:border-blue-600 focus:outline-none font-mono text-xs bg-white text-slate-900"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewIndicatorModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Indikator Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TAMBAH TRIWULAN BARU */}
      {isAddQuarterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <CalendarRange className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Tambah Triwulan Baru</h3>
                  <p className="text-xs text-slate-500">Rilis Seri PDRB Triwulanan (PDRB_TW)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddQuarterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tahun:</label>
                  <input
                    type="number"
                    min={2020}
                    max={2035}
                    value={newQuarterYear}
                    onChange={(e) => setNewQuarterYear(parseInt(e.target.value, 10) || 2026)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Triwulan:</label>
                  <select
                    value={newQuarterCode}
                    onChange={(e) => setNewQuarterCode(e.target.value as QuarterCode)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="TW I">TW I (Jan–Mar)</option>
                    <option value="TW II">TW II (Apr–Jun)</option>
                    <option value="TW III">TW III (Jul–Sep)</option>
                    <option value="TW IV">TW IV (Okt–Des)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddQuarterModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddQuarter}
                  className="w-1/2 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md transition"
                >
                  Tambahkan {newQuarterCode} {newQuarterYear}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
