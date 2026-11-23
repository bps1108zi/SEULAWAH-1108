import {
  RegionalPDRBData,
  LQResult,
  DLQResult,
  KlassenResult,
  ShiftShareResult,
} from '../types';

/**
 * Hitung Total PDRB untuk daerah pada tahun tertentu
 */
export function calculateTotalPDRB(
  sectors: RegionalPDRBData['sectors'],
  year: number,
  priceType: 'adhb' | 'adhk' = 'adhb'
): number {
  return sectors.reduce((sum, s) => sum + (s[priceType][year] || 0), 0);
}

/**
 * Hitung Laju Pertumbuhan PDRB Antar Dua Tahun
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (!previous || previous <= 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Hitung Pendapatan per Kapita (Rupiah per Jiwa)
 * PDRB dinyatakan dalam Miliar Rupiah, konversi ke Rupiah (x 1.000.000.000)
 */
export function calculatePerCapitaIncome(
  totalPdrbMiliar: number,
  population: number
): number {
  if (!population || population <= 0) return 0;
  return (totalPdrbMiliar * 1_000_000_000) / population;
}

/**
 * Distribusi / Struktur PDRB Aceh Besar
 * Sorted Descending berdasarkan Share Terbesar ke Terkecil
 */
export function getSortedSectorDistribution(
  data: RegionalPDRBData,
  year: number,
  priceType: 'adhb' | 'adhk' = 'adhb'
) {
  const total = calculateTotalPDRB(data.sectors, year, priceType);
  if (total <= 0) return [];

  const items = data.sectors.map((s) => {
    const value = s[priceType][year] || 0;
    const share = (value / total) * 100;
    return {
      code: s.code,
      name: s.name,
      value,
      share,
    };
  });

  // Sort descending by share/value
  return items.sort((a, b) => b.value - a.value);
}

/**
 * 1. Analisis Location Quotient (LQ)
 * LQ_i = (e_i / e) / (E_i / E)
 */
export function calculateLQ(
  data: RegionalPDRBData,
  year: number,
  priceType: 'adhb' | 'adhk' = 'adhb'
): LQResult[] {
  const totalLocal = calculateTotalPDRB(data.sectors, year, priceType);
  const totalProv = calculateTotalPDRB(data.provinceSectors, year, priceType);

  if (totalLocal <= 0 || totalProv <= 0) return [];

  return data.sectors.map((sector) => {
    const provSector = data.provinceSectors.find((p) => p.code === sector.code);
    const localVal = sector[priceType][year] || 0;
    const provVal = provSector ? provSector[priceType][year] || 0 : 0;

    const shareLocal = localVal / totalLocal;
    const shareProv = provVal / totalProv;

    const lq = shareProv > 0 ? shareLocal / shareProv : 0;

    return {
      code: sector.code,
      name: sector.name,
      lq: Number(lq.toFixed(3)),
      isBaseSector: lq > 1.0,
      shareAcehBesar: Number((shareLocal * 100).toFixed(2)),
      shareAcehProvince: Number((shareProv * 100).toFixed(2)),
    };
  });
}

/**
 * 2. Analisis Dynamic Location Quotient (DLQ)
 * DLQ_i = ((1 + g_i) / (1 + g)) / ((1 + G_i) / (1 + G))
 */
export function calculateDLQ(
  data: RegionalPDRBData,
  initialYear: number,
  finalYear: number,
  priceType: 'adhb' | 'adhk' = 'adhk' // Biasanya DLQ menggunakan ADHK untuk mengukur pertumbuhan riil
): DLQResult[] {
  const totalLocalInit = calculateTotalPDRB(data.sectors, initialYear, priceType);
  const totalLocalFin = calculateTotalPDRB(data.sectors, finalYear, priceType);

  const totalProvInit = calculateTotalPDRB(data.provinceSectors, initialYear, priceType);
  const totalProvFin = calculateTotalPDRB(data.provinceSectors, finalYear, priceType);

  const g = totalLocalInit > 0 ? (totalLocalFin - totalLocalInit) / totalLocalInit : 0;
  const G = totalProvInit > 0 ? (totalProvFin - totalProvInit) / totalProvInit : 0;

  return data.sectors.map((sector) => {
    const provSector = data.provinceSectors.find((p) => p.code === sector.code);

    const localInit = sector[priceType][initialYear] || 0;
    const localFin = sector[priceType][finalYear] || 0;
    const provInit = provSector ? provSector[priceType][initialYear] || 0 : 0;
    const provFin = provSector ? provSector[priceType][finalYear] || 0 : 0;

    const gi = localInit > 0 ? (localFin - localInit) / localInit : 0;
    const Gi = provInit > 0 ? (provFin - provInit) / provInit : 0;

    const localFactor = 1 + g > 0 ? (1 + gi) / (1 + g) : 1;
    const provFactor = 1 + G > 0 ? (1 + Gi) / (1 + G) : 1;

    const dlq = provFactor > 0 ? localFactor / provFactor : 0;

    return {
      code: sector.code,
      name: sector.name,
      dlq: Number(dlq.toFixed(3)),
      isProspective: dlq > 1.0,
      growthAcehBesar: Number((gi * 100).toFixed(2)),
      growthProvince: Number((Gi * 100).toFixed(2)),
    };
  });
}

/**
 * 3. Analisis Tipologi Klassen
 * Titik temu sumbu X dan Y mengacu pada nilai acuan Provinsi Aceh:
 * - Acuan Pertumbuhan (gn): Laju pertumbuhan Total PDRB Provinsi Aceh (ADHK)
 * - Acuan Pangsa/Share (sn): Rata-rata pangsa sektoral ideal Provinsi = 100% / jumlah kategori (5.88% untuk 17 sektor)
 * Setiap titik kategori memplot nilai Kabupaten Aceh Besar (gi, si):
 * - Kuadran I  : Maju & Tumbuh Cepat (gi >= gn && si >= sn)
 * - Kuadran II : Maju Tapi Tertekan  (gi < gn && si >= sn)
 * - Kuadran III: Berkembang Cepat    (gi >= gn && si < sn) -> termasuk kategori D & E
 * - Kuadran IV : Relatif Tertinggal  (gi < gn && si < sn)
 */
export function calculateKlassen(
  data: RegionalPDRBData,
  initialYear: number,
  finalYear: number,
  priceType: 'adhb' | 'adhk' = 'adhk'
): KlassenResult[] {
  const totalLocalFin = calculateTotalPDRB(data.sectors, finalYear, priceType);
  const totalProvInit = calculateTotalPDRB(data.provinceSectors, initialYear, priceType);
  const totalProvFin = calculateTotalPDRB(data.provinceSectors, finalYear, priceType);

  // Acuan Provinsi Aceh (Titik silang X & Y)
  const provTotalGrowth =
    totalProvInit > 0 ? ((totalProvFin - totalProvInit) / totalProvInit) * 100 : 0;
  const provShareThreshold = data.sectors.length > 0 ? 100 / data.sectors.length : 5.88;

  return data.sectors.map((sector) => {
    const localInit = sector[priceType][initialYear] || 0;
    const localFin = sector[priceType][finalYear] || 0;

    // Laju pertumbuhan & kontribusi sektor Kabupaten Aceh Besar
    const gi = localInit > 0 ? ((localFin - localInit) / localInit) * 100 : 0;
    const si = totalLocalFin > 0 ? (localFin / totalLocalFin) * 100 : 0;

    // Nilai referensi Provinsi Aceh (garis potong sumbu X dan Y)
    const gn = provTotalGrowth;
    const sn = provShareThreshold;

    let quadrant: 1 | 2 | 3 | 4 = 4;
    let category: KlassenResult['category'] = 'Relatif Tertinggal';

    if (gi >= gn && si >= sn) {
      quadrant = 1;
      category = 'Maju & Tumbuh Cepat';
    } else if (gi < gn && si >= sn) {
      quadrant = 2;
      category = 'Maju Tapi Tertekan';
    } else if (gi >= gn && si < sn) {
      quadrant = 3;
      category = 'Berkembang Cepat';
    } else {
      quadrant = 4;
      category = 'Relatif Tertinggal';
    }

    return {
      code: sector.code,
      name: sector.name,
      growthSector: Number(gi.toFixed(2)),
      growthRef: Number(gn.toFixed(2)),
      shareSector: Number(si.toFixed(2)),
      shareRef: Number(sn.toFixed(2)),
      quadrant,
      category,
    };
  });
}

/**
 * 4. Analisis Shift-Share
 * Y_t = Y_t-1 + N_ij + M_ij + C_ij
 * N_ij = Y_it-1 * r_p
 * M_ij = Y_it-1 * (r_ip - r_p)
 * C_ij = Y_it-1 * (r_ik - r_ip)
 * D_ij = N_ij + M_ij + C_ij
 */
export function calculateShiftShare(
  data: RegionalPDRBData,
  initialYear: number,
  finalYear: number,
  priceType: 'adhb' | 'adhk' = 'adhk'
): ShiftShareResult[] {
  const totalProvInit = calculateTotalPDRB(data.provinceSectors, initialYear, priceType);
  const totalProvFin = calculateTotalPDRB(data.provinceSectors, finalYear, priceType);

  // r_p: Pertumbuhan total PDRB Provinsi
  const rp = totalProvInit > 0 ? (totalProvFin - totalProvInit) / totalProvInit : 0;

  return data.sectors.map((sector) => {
    const provSector = data.provinceSectors.find((p) => p.code === sector.code);

    const Yit0 = sector[priceType][initialYear] || 0;
    const Yit1 = sector[priceType][finalYear] || 0;

    const provInit = provSector ? provSector[priceType][initialYear] || 0 : 0;
    const provFin = provSector ? provSector[priceType][finalYear] || 0 : 0;

    // r_ik: Pertumbuhan sektor i di Aceh Besar
    const rik = Yit0 > 0 ? (Yit1 - Yit0) / Yit0 : 0;
    // r_ip: Pertumbuhan sektor i di Provinsi Aceh
    const rip = provInit > 0 ? (provFin - provInit) / provInit : 0;

    const Nij = Yit0 * rp;
    const Mij = Yit0 * (rip - rp);
    const Cij = Yit0 * (rik - rip);
    const Dij = Nij + Mij + Cij;

    return {
      code: sector.code,
      name: sector.name,
      initialValue: Number(Yit0.toFixed(2)),
      finalValue: Number(Yit1.toFixed(2)),
      regionalGrowthEffect: Number(Nij.toFixed(2)),
      industryMix: Number(Mij.toFixed(2)),
      competitiveAdvantage: Number(Cij.toFixed(2)),
      netShift: Number(Dij.toFixed(2)),
    };
  });
}
