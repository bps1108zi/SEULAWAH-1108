/**
 * Utilitas Import, Export, dan Template Data Indikator BPS Aceh Besar
 * Menggunakan format Microsoft Excel (.xlsx) melalui pustaka SheetJS (xlsx).
 */

import * as XLSX from 'xlsx';
import { ReleaseSchedule, QuarterlyPDRBRecord } from '../types';

export interface IndicatorTransferPayload {
  name: string;
  code: string;
  unit: string;
  source?: string;
  rowHeaders: string[];
  columnHeaders: string[];
  gridData?: Record<string, Record<string, number>>;
  periodicity?: 'tahunan' | 'triwulanan' | string;
}

/**
 * Download Template Excel (.xlsx) terstruktur untuk indikator apa pun.
 */
export function downloadIndicatorTemplateExcel(indicator: IndicatorTransferPayload): void {
  const isTriwulanan = indicator.periodicity === 'triwulanan';
  const rowLabels =
    indicator.rowHeaders && indicator.rowHeaders.length > 0
      ? indicator.rowHeaders
      : ['Kabupaten Aceh Besar', 'Provinsi Aceh'];

  const colLabels =
    indicator.columnHeaders && indicator.columnHeaders.length > 0
      ? indicator.columnHeaders
      : isTriwulanan
      ? ['TW I 2025', 'TW II 2025', 'TW III 2025', 'TW IV 2025', 'TW I 2026', 'TW II 2026', 'TW III 2026']
      : ['2020', '2021', '2022', '2023', '2024'];

  const headerRow = ['Kategori / Baris', ...colLabels];
  const dataRows = rowLabels.map((row, rIdx) => {
    const rowVals = colLabels.map((col, cIdx) => {
      const existingVal = indicator.gridData?.[row]?.[col];
      if (typeof existingVal === 'number' && !isNaN(existingVal)) {
        return existingVal;
      }
      return Number((5.0 + rIdx * 1.2 + cIdx * 0.4).toFixed(2));
    });
    return [row, ...rowVals];
  });

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  wsData['!cols'] = [{ wch: 42 }, ...colLabels.map(() => ({ wch: 16 }))];
  XLSX.utils.book_append_sheet(wb, wsData, 'Data Indikator');

  const metaSheet = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE IMPORT DATA INDIKATOR BPS KABUPATEN ACEH BESAR'],
    ['Nama Indikator', indicator.name],
    ['Kode / Singkatan', indicator.code],
    ['Satuan Ukur', indicator.unit],
    ['Periode Rilis', isTriwulanan ? 'Triwulanan' : 'Tahunan'],
    ['Sumber Data', indicator.source || 'BPS Kabupaten Aceh Besar'],
    ['Petunjuk Pengisian', 'Edit nilai numerik pada sheet "Data Indikator" lalu simpan sebagai .xlsx dan impor kembali ke aplikasi.'],
  ]);
  metaSheet['!cols'] = [{ wch: 24 }, { wch: 64 }];
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Info Indikator');

  XLSX.writeFile(wb, `Template_${indicator.code}.xlsx`);
}

/**
 * Export Data Indikator tersimpan ke file Microsoft Excel (.xlsx)
 */
export function exportIndicatorDataExcel(indicator: IndicatorTransferPayload): void {
  const rowLabels =
    indicator.rowHeaders && indicator.rowHeaders.length > 0
      ? indicator.rowHeaders
      : ['Kabupaten Aceh Besar'];
  const colLabels =
    indicator.columnHeaders && indicator.columnHeaders.length > 0
      ? indicator.columnHeaders
      : ['2024'];

  const headerRow = ['Kategori / Baris', ...colLabels];
  const dataRows = rowLabels.map((row) => [
    row,
    ...colLabels.map((col) => {
      const val = indicator.gridData?.[row]?.[col];
      return typeof val === 'number' && !isNaN(val) ? val : 0;
    }),
  ]);

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  wsData['!cols'] = [{ wch: 42 }, ...colLabels.map(() => ({ wch: 16 }))];
  XLSX.utils.book_append_sheet(wb, wsData, 'Data Indikator');

  const metaSheet = XLSX.utils.aoa_to_sheet([
    ['EXPORT DATA STATISTIK BPS KABUPATEN ACEH BESAR'],
    ['Nama Indikator', indicator.name],
    ['Kode / Singkatan', indicator.code],
    ['Satuan Ukur', indicator.unit],
    ['Sumber Data', indicator.source || 'BPS Kabupaten Aceh Besar'],
    ['Tanggal Unduh', new Date().toLocaleString('id-ID')],
  ]);
  metaSheet['!cols'] = [{ wch: 24 }, { wch: 64 }];
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Keterangan');

  XLSX.writeFile(wb, `Data_${indicator.code}.xlsx`);
}

/**
 * Parsing angka fleksibel dari sel Excel (numerik atau string angka)
 */
function parseFlexibleNumber(raw: unknown): { value: number; valid: boolean } {
  if (typeof raw === 'number') {
    return isNaN(raw) ? { value: 0, valid: false } : { value: raw, valid: true };
  }
  if (typeof raw === 'string') {
    let cleaned = raw.trim().replace(/[^\d.,-]/g, '');
    if (!cleaned) return { value: 0, valid: false };
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? { value: 0, valid: false } : { value: num, valid: true };
  }
  return { value: 0, valid: false };
}

/**
 * Parsing file Excel (.xlsx / .xls) menjadi struktur matriks gridData [row][col]
 */
export async function parseExcelFileToGrid(file: File): Promise<{
  success: boolean;
  rowHeaders: string[];
  columnHeaders: string[];
  gridData: Record<string, Record<string, number>>;
  parsedRowCount: number;
  warnings: string[];
  errorMessage?: string;
}> {
  const warnings: string[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        success: false,
        rowHeaders: [],
        columnHeaders: [],
        gridData: {},
        parsedRowCount: 0,
        warnings: [],
        errorMessage: 'File Excel tidak memiliki lembar kerja (sheet).',
      };
    }

    // Prioritaskan sheet "Data Indikator" atau sheet pertama selain "Info Indikator"
    const targetSheetName =
      workbook.SheetNames.find((s) => s.toLowerCase().includes('data')) ||
      workbook.SheetNames.find((s) => !s.toLowerCase().includes('info')) ||
      workbook.SheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    const aoa = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    // Filter baris kosong dan baris komentar '#'
    const cleanRows = aoa.filter((row) => {
      if (!Array.isArray(row) || row.length === 0) return false;
      const firstCell = String(row[0] ?? '').trim();
      if (firstCell.startsWith('#')) return false;
      return row.some((cell) => String(cell ?? '').trim() !== '');
    });

    if (cleanRows.length < 2) {
      return {
        success: false,
        rowHeaders: [],
        columnHeaders: [],
        gridData: {},
        parsedRowCount: 0,
        warnings: [],
        errorMessage: 'Sheet Excel minimal harus memiliki 1 baris header kolom dan 1 baris data.',
      };
    }

    // Temukan baris header (minimal 2 kolom terisi)
    const headerIdx = cleanRows.findIndex((r) => r.filter((c) => String(c ?? '').trim() !== '').length >= 2);
    if (headerIdx === -1 || headerIdx >= cleanRows.length - 1) {
      return {
        success: false,
        rowHeaders: [],
        columnHeaders: [],
        gridData: {},
        parsedRowCount: 0,
        warnings: [],
        errorMessage: 'Format header tabel Excel tidak valid. Pastikan kolom periode terisi di baris pertama.',
      };
    }

    const headerRow = cleanRows[headerIdx];
    // Trim kolom kosong di paling kanan
    let lastValidCol = headerRow.length - 1;
    while (lastValidCol > 0 && String(headerRow[lastValidCol] ?? '').trim() === '') {
      lastValidCol--;
    }

    const columnHeaders = headerRow
      .slice(1, lastValidCol + 1)
      .map((c, idx) => String(c ?? '').trim() || `Periode_${idx + 1}`);

    if (columnHeaders.length === 0) {
      return {
        success: false,
        rowHeaders: [],
        columnHeaders: [],
        gridData: {},
        parsedRowCount: 0,
        warnings: [],
        errorMessage: 'Minimal harus terdapat 1 kolom nilai periode selain kolom Kategori/Baris.',
      };
    }

    const rowHeaders: string[] = [];
    const gridData: Record<string, Record<string, number>> = {};

    for (let i = headerIdx + 1; i < cleanRows.length; i++) {
      const rawRow = cleanRows[i];
      const rowLabel = String(rawRow[0] ?? '').trim();
      if (!rowLabel) continue;

      rowHeaders.push(rowLabel);
      gridData[rowLabel] = {};

      columnHeaders.forEach((col, colOffset) => {
        const rawCell = rawRow[colOffset + 1];
        if (rawCell === undefined || String(rawCell).trim() === '') {
          gridData[rowLabel][col] = 0;
          warnings.push(`Baris "${rowLabel}", Kolom "${col}": sel kosong diisi 0.`);
        } else {
          const parsed = parseFlexibleNumber(rawCell);
          gridData[rowLabel][col] = parsed.value;
          if (!parsed.valid) {
            warnings.push(`Baris "${rowLabel}", Kolom "${col}": nilai "${rawCell}" tidak valid, diisi 0.`);
          }
        }
      });
    }

    if (rowHeaders.length === 0) {
      return {
        success: false,
        rowHeaders: [],
        columnHeaders: [],
        gridData: {},
        parsedRowCount: 0,
        warnings: [],
        errorMessage: 'Tidak ada baris data yang ditemukan pada file Excel.',
      };
    }

    return {
      success: true,
      rowHeaders,
      columnHeaders,
      gridData,
      parsedRowCount: rowHeaders.length,
      warnings: warnings.slice(0, 5),
    };
  } catch (err) {
    return {
      success: false,
      rowHeaders: [],
      columnHeaders: [],
      gridData: {},
      parsedRowCount: 0,
      warnings: [],
      errorMessage: `Gagal membaca file Excel (.xlsx): ${err instanceof Error ? err.message : 'Format tidak valid'}`,
    };
  }
}

/**
 * Export Jadwal Rilis ke format Excel (.xlsx)
 */
export function exportReleaseScheduleExcel(schedules: ReleaseSchedule[]): void {
  const header = [
    'Tanggal Rilis',
    'Status',
    'Indikator',
    'Kode',
    'Periode Target',
    'Frekuensi',
    'Judul Publikasi / BRS',
    'Catatan',
  ];
  const rows = schedules.map((s) => [
    s.releaseDate,
    s.status,
    s.indicatorName,
    s.indicatorCode,
    s.periodTarget,
    s.frequency,
    s.officialBRSTitle,
    s.notes || '-',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 36 },
    { wch: 12 },
    { wch: 24 },
    { wch: 14 },
    { wch: 42 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Rilis BPS');
  XLSX.writeFile(wb, 'Jadwal_Rilis_Indikator_BPS_Aceh_Besar.xlsx');
}

/**
 * Export PDRB Triwulanan ke format Excel (.xlsx)
 */
export function exportQuarterlyPDRBExcel(records: QuarterlyPDRBRecord[]): void {
  const header = [
    'Tahun',
    'Triwulan',
    'Periode',
    'PDRB ADHB Aceh Besar (Miliar Rp)',
    'PDRB ADHK Aceh Besar (Miliar Rp)',
    'PDRB ADHB Prov Aceh (Miliar Rp)',
    'PDRB ADHK Prov Aceh (Miliar Rp)',
    'Pertumbuhan q-to-q Aceh Besar (%)',
    'Pertumbuhan y-on-y Aceh Besar (%)',
    'Sektor Penggerak Utama',
  ];

  const rows = records.map((r) => [
    r.year,
    r.quarter,
    r.periodLabel,
    r.adhbAcehBesar,
    r.adhkAcehBesar,
    r.adhbProvince,
    r.adhkProvince,
    r.qToQGrowthAB ?? 0,
    r.yOnYGrowthAB ?? 0,
    r.dominantSector || 'Pertanian, Kehutanan, dan Perikanan',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 42 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'PDRB Triwulanan');
  XLSX.writeFile(wb, 'PDRB_Triwulanan_Aceh_Besar.xlsx');
}

/**
 * Export Ringkasan Analisis Perekonomian Aceh Besar ke Excel (.xlsx)
 */
export function exportEconomyAnalysisExcel(
  year: number,
  priceType: string,
  rows: {
    code: string;
    name: string;
    value: number;
    share: number;
    lq: number;
    dlq: number;
    klassen: string;
    netShift: number;
  }[]
): void {
  const header = [
    'Kategori',
    'Nama Lapangan Usaha',
    `Nilai PDRB (${priceType.toUpperCase()} Miliar Rp)`,
    'Share (%)',
    'LQ',
    'DLQ',
    'Tipologi Klassen',
    'Shift-Share Net (Dij Miliar Rp)',
  ];
  const aoaRows = rows.map((r) => [
    r.code,
    r.name,
    Number(r.value.toFixed(2)),
    Number(r.share.toFixed(2)),
    r.lq,
    r.dlq,
    r.klassen,
    r.netShift,
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...aoaRows]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 44 },
    { wch: 24 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 24 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, `Analisis ${year}`);
  XLSX.writeFile(wb, `Perekonomian_Aceh_Besar_${year}.xlsx`);
}
