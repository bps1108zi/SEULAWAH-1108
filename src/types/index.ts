export type UserRole = 'admin' | 'user';
export type UserStatus = 'Aktif' | 'Tidak Aktif';
export type Gender = 'Laki-laki' | 'Perempuan';

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  password: string; // Stored for display/edit by Admin as requested
  role: UserRole;
  gender: Gender;
  age: number;
  institution: string; // Asal Instansi (e.g., Bappeda, Universitas Syiah Kuala, etc.)
  phone: string;
  usagePurpose: string; // Kebutuhan pemanfaatan data
  status: UserStatus;
  authProvider?: 'password' | 'google';
  photoURL?: string;
  createdAt: string;
  lastLogin: string;
}

export interface SectorPDRB {
  code: string; // 'A', 'B', etc.
  name: string;
  adhb: Record<number, number>; // Nilai ADHB per tahun (Miliar Rupiah)
  adhk: Record<number, number>; // Nilai ADHK 2010 per tahun (Miliar Rupiah)
}

export interface RegionalPDRBData {
  regencyName: string; // 'Kabupaten Aceh Besar'
  referenceName: string; // 'Provinsi Aceh'
  years: number[];
  baseYear: number;
  population: Record<number, number>; // Jumlah penduduk Aceh Besar
  provincePopulation: Record<number, number>; // Jumlah penduduk Prov Aceh
  sectors: SectorPDRB[];
  provinceSectors: SectorPDRB[];
}

export interface DistrictData {
  id: string;
  name: string;
  code: string;
  capital: string;
  population: number; // Sumber: BPS Aceh Besar (SP2020 Lanjutan & Registrasi)
  areaKm2: number; // Sumber: Badan Informasi Geospasial / BPS
  pdrbEstimateMiliar: number; // Sumber: Nerwilis BPS Aceh Besar & Bappeda
  growthRate: number; // % y-on-y
  leadingSector: string; // Sumber: KDA BPS Aceh Besar
  coordinates: { x: number; y: number };
  description: string;
  luasBakuSawahHa?: number; // Sumber: KSA BPS & Distan Aceh Besar
  jumlahSaranaPasar?: number; // Sumber: Pendataan PODES BPS Aceh Besar
  officialSource?: string; // 'BPS Kabupaten Aceh Besar (Katalog: 1102001.1108)'
}

// Analisis Result Types
export interface LQResult {
  code: string;
  name: string;
  lq: number;
  isBaseSector: boolean;
  shareAcehBesar: number; // %
  shareAcehProvince: number; // %
}

export interface DLQResult {
  code: string;
  name: string;
  dlq: number;
  isProspective: boolean;
  growthAcehBesar: number; // %
  growthProvince: number; // %
}

export interface KlassenResult {
  code: string;
  name: string;
  growthSector: number; // gi
  growthRef: number; // gn
  shareSector: number; // si
  shareRef: number; // sn
  quadrant: 1 | 2 | 3 | 4;
  category: 'Maju & Tumbuh Cepat' | 'Maju Tapi Tertekan' | 'Berkembang Cepat' | 'Relatif Tertinggal';
}

export interface ShiftShareResult {
  code: string;
  name: string;
  initialValue: number; // Y_t-1
  finalValue: number; // Y_t
  regionalGrowthEffect: number; // N_ij
  industryMix: number; // M_ij
  competitiveAdvantage: number; // C_ij
  netShift: number; // D_ij
}

// Model Rumus & Formula Indikator
export interface IndicatorFormula {
  id: string;
  name: string;
  targetAnalysis: 'lq' | 'dlq' | 'klassen' | 'shift-share' | 'per-capita';
  formulaExpression: string;
  variablesUsed: string[];
  description: string;
  updatedAt: string;
}

// Model Indikator Baru (Kustom) dengan Baris, Kolom, dan Preview Grid Data
export interface CustomIndicator {
  id: string;
  name: string;
  code: string; // Singkatan Indikator (e.g., TPT_AB, IPED_AB)
  unit: string;
  source: string;
  rowCount: number; // Jumlah baris data (hanya datanya, tidak termasuk nama baris)
  colCount: number; // Jumlah kolom data (hanya datanya, tidak termasuk nama kolom)
  rowHeaders: string[]; // Daftar nama/label setiap baris
  columnHeaders: string[]; // Daftar nama/label setiap kolom
  gridData: Record<string, Record<string, number>>; // Nilai data sel [row][col]
  periodicity?: 'tahunan' | 'triwulanan'; // Jenis rilis data
  category?: string; // e.g., 'Sosial & Kependudukan', 'Harga & Inflasi', 'Produksi'
  createdAt: string;
  updatedAt?: string;
}

export type IndicatorTimestamps = Record<string, string>;

// Jadwal Rilis Indikator BPS (Berita Resmi Statistik & Publikasi)
export type ReleaseFrequency = 'Triwulanan' | 'Tahunan' | 'Bulanan';
export type ReleaseStatus = 'Mendatang' | 'Rilis Hari Ini' | 'Telah Rilis';

export interface ReleaseSchedule {
  id: string;
  indicatorCode: string; // e.g. 'PDRB_TW', 'TPT_AB', 'IKK_AB', 'IPM_AB'
  indicatorName: string; // e.g. 'PDRB Kabupaten Aceh Besar Triwulan III-2026'
  periodTarget: string; // e.g. 'Triwulan III 2026'
  releaseDate: string; // YYYY-MM-DD
  frequency: ReleaseFrequency;
  status: ReleaseStatus;
  officialBRSTitle: string; // Judul Berita Resmi Statistik (BRS)
  downloadLink?: string; // Tautan unduhan PDF atau katalog BPS
  notes?: string;
}

// Data PDRB Triwulanan (TW I s.d. TW IV)
export type QuarterCode = 'TW I' | 'TW II' | 'TW III' | 'TW IV';

export interface QuarterlyPDRBRecord {
  year: number;
  quarter: QuarterCode;
  periodLabel: string; // 'TW I 2026'
  adhbAcehBesar: number; // Miliar Rupiah
  adhkAcehBesar: number; // Miliar Rupiah
  adhbProvince: number; // Miliar Rupiah
  adhkProvince: number; // Miliar Rupiah
  qToQGrowthAB?: number; // % pertumbuhan q-to-q (terhadap triwulan lalu)
  yOnYGrowthAB?: number; // % pertumbuhan y-on-y (terhadap triwulan sama tahun lalu)
  qToQGrowthProv?: number;
  yOnYGrowthProv?: number;
  dominantSector?: string;
  sectorContributions?: Record<string, number>; // code -> ADHB share (%)
}

