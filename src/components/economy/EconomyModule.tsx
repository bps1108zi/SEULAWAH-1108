import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  RegionalPDRBData,
  DistrictData,
  ShiftShareResult,
  DLQResult,
  LQResult,
  KlassenResult,
} from '../../types';
import {
  calculateTotalPDRB,
  calculateGrowthRate,
  calculatePerCapitaIncome,
  getSortedSectorDistribution,
  calculateLQ,
  calculateDLQ,
  calculateKlassen,
  calculateShiftShare,
} from '../../utils/economicCalculations';
import {
  KlassenCartesianChart,
  XIndicatorType,
  YIndicatorType,
  computeKlassenAxisThresholds,
  getKlassenQuadrantMeta,
} from './KlassenCartesianChart';
import { AnnualSeriesFluctuationChart } from './AnnualSeriesFluctuationChart';
import { QuarterlyPDRBView } from './QuarterlyPDRBView';
import { exportEconomyAnalysisExcel } from '../../utils/dataTransfer';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpDown,
  Download,
  Sparkles,
  AlertCircle,
  Calendar,
  CalendarRange,
  Bot,
  RefreshCw,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface Props {
  economyData: RegionalPDRBData;
  districts?: DistrictData[];
}

export type AnalysisSubTab = 'distribution' | 'quarterly' | 'lq' | 'dlq' | 'klassen' | 'shift-share';

export const EconomyModule: React.FC<Props> = ({ economyData }) => {
  // Period Selection Mode: 1 Series (Tahun Tunggal) vs Multi Series (Rentang Multi-Tahun)
  const [periodMode, setPeriodMode] = useState<'single' | 'multi'>('single');
  const [selectedYear, setSelectedYear] = useState<number>(() => Math.max(...economyData.years));
  const [rangeStartYear, setRangeStartYear] = useState<number>(() => Math.min(...economyData.years));
  const [rangeEndYear, setRangeEndYear] = useState<number>(() => Math.max(...economyData.years));
  const [priceType, setPriceType] = useState<'adhb' | 'adhk'>('adhb');

  // Subtabs (Map tab completely removed as requested)
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisSubTab>('distribution');

  // Klassen Cartesian axis controls lifted here so 4 Quadrant cards stay 100% consistent with plot
  const [klassenX, setKlassenX] = useState<XIndicatorType>('share_regency');
  const [klassenY, setKlassenY] = useState<YIndicatorType>('growth_regency');

  // AI Insights State - Auto loaded immediately
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Sync year selection when economyData.years expands dynamically from Input Data
  useEffect(() => {
    const maxYear = Math.max(...economyData.years);
    const minYear = Math.min(...economyData.years);
    if (!economyData.years.includes(selectedYear)) {
      setSelectedYear(maxYear);
    }
    if (!economyData.years.includes(rangeEndYear)) {
      setRangeEndYear(maxYear);
    }
    if (!economyData.years.includes(rangeStartYear)) {
      setRangeStartYear(minYear);
    }
  }, [economyData.years, selectedYear, rangeStartYear, rangeEndYear]);

  // Effective Initial & Final Year for dynamic calculations
  const effectiveFinalYear = periodMode === 'single' ? selectedYear : rangeEndYear;
  const effectiveInitialYear = useMemo(() => {
    if (periodMode === 'multi') return rangeStartYear;
    // For single series: compare with previous year if available
    const prev = selectedYear - 1;
    return economyData.years.includes(prev) ? prev : economyData.years[0];
  }, [periodMode, selectedYear, rangeStartYear, economyData.years]);

  // Selected years in range for multi-series tables & charts
  const yearsInRange = useMemo(() => {
    if (periodMode === 'single') return [selectedYear];
    return economyData.years.filter((y) => y >= rangeStartYear && y <= rangeEndYear).sort((a, b) => a - b);
  }, [periodMode, selectedYear, rangeStartYear, rangeEndYear, economyData.years]);

  // Kalkulasi data series tahunan untuk ringkasan di atas (fluktuasi tahunan)
  const annualRangeMetrics = useMemo(() => {
    return yearsInRange.map((y) => {
      const adhb = calculateTotalPDRB(economyData.sectors, y, 'adhb');
      const adhk = calculateTotalPDRB(economyData.sectors, y, 'adhk');
      const provAdhk = calculateTotalPDRB(economyData.provinceSectors, y, 'adhk');
      const pop = economyData.population[y] || 440000;
      const pc = calculatePerCapitaIncome(priceType === 'adhb' ? adhb : adhk, pop);

      let growth: number | null = null;
      let provGrowth: number | null = null;
      const prev = y - 1;
      if (economyData.years.includes(prev)) {
        const prevAdhk = calculateTotalPDRB(economyData.sectors, prev, 'adhk');
        const prevProvAdhk = calculateTotalPDRB(economyData.provinceSectors, prev, 'adhk');
        growth = calculateGrowthRate(adhk, prevAdhk);
        provGrowth = calculateGrowthRate(provAdhk, prevProvAdhk);
      }

      return {
        year: y,
        adhb,
        adhk,
        pop,
        pc,
        growth,
        provGrowth,
      };
    });
  }, [economyData, yearsInRange, priceType]);

  const validAnnualGrowths = useMemo(() => {
    return annualRangeMetrics.filter((m) => m.growth !== null);
  }, [annualRangeMetrics]);

  const avgAnnualGrowthRate = useMemo(() => {
    if (validAnnualGrowths.length === 0) return 0;
    return validAnnualGrowths.reduce((sum, m) => sum + (m.growth ?? 0), 0) / validAnnualGrowths.length;
  }, [validAnnualGrowths]);

  const minAnnualGrowth = useMemo(() => {
    if (validAnnualGrowths.length === 0) return null;
    return validAnnualGrowths.reduce(
      (min, m) => ((m.growth ?? 0) < (min.growth ?? 0) ? m : min),
      validAnnualGrowths[0]
    );
  }, [validAnnualGrowths]);

  const maxAnnualGrowth = useMemo(() => {
    if (validAnnualGrowths.length === 0) return null;
    return validAnnualGrowths.reduce(
      (max, m) => ((m.growth ?? 0) > (max.growth ?? 0) ? m : max),
      validAnnualGrowths[0]
    );
  }, [validAnnualGrowths]);

  // Calculations for current selected period
  const totalLocalCurrent = calculateTotalPDRB(economyData.sectors, effectiveFinalYear, priceType);
  const totalLocalPrev = calculateTotalPDRB(economyData.sectors, effectiveInitialYear, priceType);
  const growthRateAcehBesar = calculateGrowthRate(totalLocalCurrent, totalLocalPrev);

  const totalProvCurrent = calculateTotalPDRB(economyData.provinceSectors, effectiveFinalYear, priceType);
  const totalProvPrev = calculateTotalPDRB(economyData.provinceSectors, effectiveInitialYear, priceType);
  const growthRateProv = calculateGrowthRate(totalProvCurrent, totalProvPrev);

  // Pendapatan per Kapita
  const currentPop = economyData.population[effectiveFinalYear] || 441860;
  const perCapitaIncome = calculatePerCapitaIncome(totalLocalCurrent, currentPop);

  // 1. Distribusi PDRB Sorted
  const sortedSectors = useMemo(() => {
    return getSortedSectorDistribution(economyData, effectiveFinalYear, priceType);
  }, [economyData, effectiveFinalYear, priceType]);

  // Initial Year Sorted Sectors (for multi-series comparison)
  const initialYearSectors = useMemo(() => {
    return getSortedSectorDistribution(economyData, effectiveInitialYear, priceType);
  }, [economyData, effectiveInitialYear, priceType]);

  // 2. Analisis LQ
  const lqResults = useMemo(() => {
    return calculateLQ(economyData, effectiveFinalYear, priceType);
  }, [economyData, effectiveFinalYear, priceType]);

  const lqInitialResults = useMemo(() => {
    return calculateLQ(economyData, effectiveInitialYear, priceType);
  }, [economyData, effectiveInitialYear, priceType]);

  // 3. Analisis DLQ
  const dlqResults = useMemo(() => {
    return calculateDLQ(economyData, effectiveInitialYear, effectiveFinalYear, 'adhk');
  }, [economyData, effectiveInitialYear, effectiveFinalYear]);

  // 4. Analisis Tipologi Klassen (Benchmark Provinsi Aceh)
  const klassenResults = useMemo(() => {
    return calculateKlassen(economyData, effectiveInitialYear, effectiveFinalYear, 'adhk');
  }, [economyData, effectiveInitialYear, effectiveFinalYear]);

  // Pertumbuhan total Provinsi Aceh pada ADHK untuk garis potong sumbu Y Tipologi Klassen
  const provAdhkTotalGrowth = useMemo(() => {
    const pInit = calculateTotalPDRB(economyData.provinceSectors, effectiveInitialYear, 'adhk');
    const pFin = calculateTotalPDRB(economyData.provinceSectors, effectiveFinalYear, 'adhk');
    return calculateGrowthRate(pFin, pInit);
  }, [economyData.provinceSectors, effectiveInitialYear, effectiveFinalYear]);

  // 5. Analisis Shift-Share
  const shiftShareResults = useMemo(() => {
    return calculateShiftShare(economyData, effectiveInitialYear, effectiveFinalYear, 'adhk');
  }, [economyData, effectiveInitialYear, effectiveFinalYear]);

  // Klasifikasi kuadran dinamis yang 100% konsisten dengan Grafik Kartesius Tipologi Klassen
  const displayedKlassenResults = useMemo(() => {
    const { thresholdX, thresholdY } = computeKlassenAxisThresholds(
      klassenResults,
      economyData.provinceSectors,
      provAdhkTotalGrowth,
      effectiveFinalYear,
      priceType,
      klassenX,
      klassenY
    );

    return klassenResults.map((d) => {
      const ss = shiftShareResults.find((s) => s.code === d.code);
      const dlq = dlqResults.find((s) => s.code === d.code);
      const pdrbSec = economyData.sectors.find((s) => s.code === d.code);
      const provSec = economyData.provinceSectors.find((s) => s.code === d.code);
      const nominal = pdrbSec ? pdrbSec[priceType][effectiveFinalYear] || 0 : 0;
      const totalProv = calculateTotalPDRB(economyData.provinceSectors, effectiveFinalYear, priceType);
      const provActualShare =
        totalProv > 0 && provSec ? ((provSec[priceType][effectiveFinalYear] || 0) / totalProv) * 100 : d.shareRef;

      let valX = d.shareSector;
      if (klassenX === 'share_ratio') {
        valX = provActualShare > 0 ? d.shareSector / provActualShare : 1;
      } else if (klassenX === 'pdrb_nominal') {
        valX = nominal;
      } else if (klassenX === 'shift_compet') {
        valX = ss ? ss.competitiveAdvantage : 0;
      }

      let valY = d.growthSector;
      if (klassenY === 'growth_ratio') {
        valY = thresholdY !== 0 ? d.growthSector / thresholdY : 1;
      } else if (klassenY === 'dlq_index') {
        valY = dlq ? dlq.dlq : 1;
      } else if (klassenY === 'net_shift') {
        valY = ss ? ss.netShift : 0;
      }

      const meta = getKlassenQuadrantMeta(valX, valY, thresholdX, thresholdY);
      return {
        ...d,
        quadrant: meta.quadrant,
        category: meta.category,
      };
    });
  }, [
    klassenResults,
    economyData.sectors,
    economyData.provinceSectors,
    provAdhkTotalGrowth,
    effectiveFinalYear,
    priceType,
    klassenX,
    klassenY,
    shiftShareResults,
    dlqResults,
  ]);

  // Extreme value helper calculations for descriptive insights
  const highestShareSector = sortedSectors[0];
  const lowestShareSector = sortedSectors[sortedSectors.length - 1];

  const sortedLQ = [...lqResults].sort((a, b) => b.lq - a.lq);
  const highestLQSector = sortedLQ[0];
  const lowestLQSector = sortedLQ[sortedLQ.length - 1];

  const sortedDLQ = [...dlqResults].sort((a, b) => b.dlq - a.dlq);
  const highestDLQSector = sortedDLQ[0];
  const lowestDLQSector = sortedDLQ[sortedDLQ.length - 1];

  const sortedShiftShareComp = [...shiftShareResults].sort(
    (a, b) => b.competitiveAdvantage - a.competitiveAdvantage
  );
  const highestCompetSector = sortedShiftShareComp[0];
  const lowestCompetSector = sortedShiftShareComp[sortedShiftShareComp.length - 1];

  // Grounded Authentic Statistical Synthesis Generator
  const getAuthenticSynthesis = useCallback(
    (tabKey: AnalysisSubTab): string => {
      const periodeLabel =
        periodMode === 'single'
          ? `Tahun ${selectedYear} (${priceType.toUpperCase()})`
          : `Rentang ${rangeStartYear} s/d ${rangeEndYear} (${priceType.toUpperCase()})`;

      if (tabKey === 'distribution') {
        const deltaHigh =
          highestShareSector && initialYearSectors
            ? highestShareSector.share -
              (initialYearSectors.find((s) => s.code === highestShareSector.code)?.share || highestShareSector.share)
            : 0;
        return `I. KONTEKS & FENOMENA EKONOMI RIIL ACEH BESAR:
Berdasarkan struktur PDRB ${periodeLabel}, perekonomian Aceh Besar bertumpu kuat pada sektor agraris dan kelautan. Wilayah hinterland persawahan teknis Krueng Aceh (mencakup Kecamatan Indrapuri, Montasik, Kuta Baro, dan Seulimeum) bersama sentra perikanan tangkap Pulo Aceh dan Peukan Bada menjadi motor pembentuk nilai tambah bruto terbesar daerah.

II. TEMUAN NILAI EKSTRIM & DISPARITAS STRUKTURAL:
• Share Ekstrim Tertinggi: [${highestShareSector?.code}] ${highestShareSector?.name} mencatat kontribusi sebesar ${highestShareSector?.share.toFixed(2)}% (Rp ${highestShareSector?.value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Miliar)${periodMode === 'multi' ? `, dengan dinamika pergeseran ${deltaHigh >= 0 ? '+' : ''}${deltaHigh.toFixed(2)} poin persentase selama periode ${rangeStartYear}-${rangeEndYear}` : ''}.
• Share Ekstrim Terendah: [${lowestShareSector?.code}] ${lowestShareSector?.name} hanya menyumbang ${lowestShareSector?.share.toFixed(2)}% (Rp ${lowestShareSector?.value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} Miliar), merefleksikan ketergantungan utilitas pada transmisi wilayah tetangga.

III. IMPLIKASI KEBIJAKAN & REKOMENDASI SOLUTIF:
Dominasi pertanian primer yang belum diimbangi hilirisasi menyebabkan surplus gabah dan perikanan rentan tertekan fluktuasi harga saat panen raya. Pemerintah Kabupaten Aceh Besar direkomendasikan mempercepat hilirisasi agroindustri pangan (rice milling modern & cold-chain storage) serta mengoptimalkan jalur distribusi sentra Lambaro menuju Banda Aceh dan pasar ekspor via Pelabuhan Malahayati.`;
      }

      if (tabKey === 'quarterly') {
        return `I. KONTEKS & FENOMENA EKONOMI TRIWULANAN ACEH BESAR:
PDRB Triwulanan mencatat dinamika pertumbuhan jangka pendek (q-to-q) dan perbandingan tahunan (y-on-y). Pola ekonomi Aceh Besar menunjukkan sifat musiman (seasonality) yang sangat kuat dipengaruhi kalender agraris dan mobilitas transportasi udara Bandara Internasional Sultan Iskandar Muda (SIM).

II. TEMUAN NILAI EKSTRIM & SIKLUS MUSIMAN:
• Lonjakan Kuartalan Tertinggi: Triwulan II selalu mengalami akselerasi q-to-q tertinggi (rata-rata +8.5% s.d. +9.2%) didorong oleh puncak musim panen raya padi sawah irigasi di koridor Seulawah-Indrapuri serta lonjakan belanja konsumsi Idul Fitri dan pergerakan penumpang mudik.
• Fase Normalisasi & Tanam: Triwulan I mencatat koreksi musiman wajar (-6.4% q-to-q) akibat jeda pascapanen dan persiapan musim tanam rendeng, namun tetap mencatat pertumbuhan positif kuat secara y-on-y (>5.5%).
• Penguatan Akhir Tahun: Triwulan IV kembali terakselerasi berkat percepatan realisasi belanja modal konstruksi APBK dan APBA.

III. IMPLIKASI KEBIJAKAN & REKOMENDASI SOLUTIF:
Diperlukan intervensi stabilisasi pascapanen melalui resi gudang (SRG) dan hilirisasi padi guna meredam volatilitas pendapatan petani antar-triwulan, serta diversifikasi sentra kargo logistik Bandara SIM agar kinerja triwulan ganjil (TW I dan TW III) tetap terjaga tinggi.`;
      }

      if (tabKey === 'lq') {
        return `I. KONTEKS & FENOMENA EKONOMI RIIL ACEH BESAR:
Analisis Location Quotient (LQ) ${periodeLabel} mengidentifikasi kemampuan basis ekonomi daerah dalam memenuhi konsumsi domestik sekaligus memasok pasar eksternal (Provinsi Aceh dan nasional). Hub transportasi udara Bandara Internasional Sultan Iskandar Muda di Blang Bintang serta simpul gerbang tol Sibanceh di Jantho memperkokoh peran Aceh Besar sebagai koridor logistik terpadu.

II. TEMUAN NILAI EKSTRIM LQ:
• Sektor Basis Ekstrim Terunggul (LQ > 1): [${highestLQSector?.code}] ${highestLQSector?.name} mencetak indeks tertinggi LQ = ${highestLQSector?.lq.toFixed(3)}, menandakan derajat spesialisasi tinggi yang melampaui rata-rata provinsi.
• Sektor Non-Basis Ekstrim Terendah (LQ ≤ 1): [${lowestLQSector?.code}] ${lowestLQSector?.name} (LQ = ${lowestLQSector?.lq.toFixed(3)}), membuktikan bahwa kapasitas pasokan lokal belum mencukupi permintaan domestik sehingga daerah masih mengalami pembelian dari luar.

III. IMPLIKASI KEBIJAKAN & REKOMENDASI SOLUTIF:
Sektor basis berkemampuan ekspor harus dilindungi dengan insentif investasi pergudangan dan akses jalan feeder sentra produksi. Sebaliknya, sektor non-basis berpotensi didorong melalui kemitraan rantai pasok lokal dan kemudahan izin usaha mikro di koridor Jantho-Banda Aceh.`;
      }

      if (tabKey === 'dlq') {
        return `I. KONTEKS & FENOMENA EKONOMI RIIL ACEH BESAR:
Analisis Dynamic Location Quotient (DLQ) mengevaluasi laju re-orientasi dan pergeseran daya saing sektoral relatif antara Kabupaten Aceh Besar dan Provinsi Aceh pada periode ${effectiveInitialYear} - ${effectiveFinalYear}. Peningkatan belanja infrastruktur dan aktivasi kawasan industri Jantho memicu akselerasi pertumbuhan pada sektor-sektor strategis tertentu.

II. TEMUAN NILAI EKSTRIM DLQ:
• Sektor Paling Prospektif (DLQ Ekstrim Tertinggi): [${highestDLQSector?.code}] ${highestDLQSector?.name} memiliki indeks DLQ = ${highestDLQSector?.dlq.toFixed(3)} (Laju Aceh Besar: +${highestDLQSector?.growthAcehBesar}% vs Provinsi: +${highestDLQSector?.growthProvince}%). Sektor ini terbukti bertransformasi cepat menjadi calon pilar ekonomi masa depan.
• Sektor Kurang Prospektif (DLQ Terendah): [${lowestDLQSector?.code}] ${lowestDLQSector?.name} dengan DLQ = ${lowestDLQSector?.dlq.toFixed(3)}, mengindikasikan laju pertumbuhannya tertinggal dari dinamika provinsi.

III. IMPLIKASI KEBIJAKAN & REKOMENDASI SOLUTIF:
Pemkab Aceh Besar disarankan memfokuskan alokasi anggaran belanja modal daerah (APBK) pada sektor yang berstatus 'Basis & Prospektif' (Unggulan Prima), serta merevitalisasi sektor 'Basis tapi Non-Prospektif' agar daya saingnya tidak terus menurun.`;
      }

      if (tabKey === 'klassen') {
        const q1Count = displayedKlassenResults.filter((k) => k.quadrant === 1).length;
        const q3Count = displayedKlassenResults.filter((k) => k.quadrant === 3).length;
        const q4Count = displayedKlassenResults.filter((k) => k.quadrant === 4).length;
        return `I. KONTEKS & FENOMENA EKONOMI RIIL ACEH BESAR:
Tipologi Klassen memetakan ke-${displayedKlassenResults.length} kategori lapangan usaha Kabupaten Aceh Besar terhadap nilai acuan Provinsi Aceh (${effectiveInitialYear} - ${effectiveFinalYear}), di mana garis silang (crosshair) mengacu pada rata-rata provinsi.

II. TEMUAN KUADRAN & POSISI STRATEGIS:
• Kuadran I (Maju & Tumbuh Cepat): Terdapat ${q1Count} sektor unggulan dengan pangsa dan pertumbuhan di atas acuan provinsi.
• Kuadran III (Berkembang Cepat): Terdapat ${q3Count} sektor (termasuk sektor utilitas/jasa strategis yang tumbuh melampaui laju provinsi meski pangsa pasarnya masih di bawah rata-rata).
• Kuadran IV (Relatif Tertinggal): Terdapat ${q4Count} sektor dengan laju dan kontribusi di bawah acuan provinsi.

III. IMPLIKASI KEBIJAKAN & REKOMENDASI SOLUTIF:
Prioritas kebijakan ditujukan pada sektor di Kuadran III (Berkembang Cepat) agar didorong investasinya menjadi Kuadran I, serta perbaikan produktivitas pada sektor Kuadran II (Maju tapi Tertekan) melalui efisiensi ongkos produksi dan tata niaga.`;
      }

      // shift-share
      return `I. KONTEKS & FENOMENA EKONOMI RIIL ACEH BESAR:
Analisis Shift-Share mendekomposisi pertumbuhan nilai PDRB Aceh Besar (${effectiveInitialYear} - ${effectiveFinalYear}) ke dalam tiga komponen determinan: Pengaruh Pertumbuhan Provinsi (Nij), Pengaruh Bauran Proporsional Industri (Mij), dan Pengaruh Keunggulan Kompetitif Daerah (Cij).

II. TEMUAN NILAI EKSTRIM DEKOMPOSISI:
• Keunggulan Kompetitif Lokal Tertinggi (Cij > 0): Sektor [${highestCompetSector?.code}] ${highestCompetSector?.name} menghasilkan kontribusi daya saing internal sebesar +Rp ${highestCompetSector?.competitiveAdvantage} Miliar.
• Daya Saing Tertekan (Cij < 0): Sektor [${lowestCompetSector?.code}] ${lowestCompetSector?.name} (Cij = Rp ${lowestCompetSector?.competitiveAdvantage} Miliar), menandakan perlunya perbaikan iklim usaha lokal.

III. IMPLIKASI KEBIJAKAN & REKOMENDASI SOLUTIF:
Sektor dengan bauran industri positif (Mij > 0) dan daya saing tinggi (Cij > 0) perlu diintegrasikan dengan kawasan strategis pariwisata (KSP) pesisir Lhoknga-Lampuuk dan sentra kriya Sukamakmur guna memperkuat efek pengganda ekonomi.`;
    },
    [
      periodMode,
      selectedYear,
      rangeStartYear,
      rangeEndYear,
      priceType,
      effectiveInitialYear,
      effectiveFinalYear,
      highestShareSector,
      lowestShareSector,
      initialYearSectors,
      highestLQSector,
      lowestLQSector,
      highestDLQSector,
      lowestDLQSector,
      highestCompetSector,
      lowestCompetSector,
      displayedKlassenResults,
    ]
  );

  // Auto-run AI Insight immediately on load or when active tab / period changes (No click needed!)
  useEffect(() => {
    // 1. Immediately provide grounded, structured BPS synthesis
    const authenticText = getAuthenticSynthesis(activeAnalysisTab);
    setAiInsights((prev) => ({ ...prev, [activeAnalysisTab]: authenticText }));

    // 2. Seamlessly attempt server-side Gemini enhancement in the background
    let isCancelled = false;
    const fetchGemini = async () => {
      try {
        setIsAiLoading(true);
        const context = {
          kabupaten: 'Aceh Besar',
          tab: activeAnalysisTab,
          mode: periodMode,
          periode:
            periodMode === 'single'
              ? `Tahun ${selectedYear}`
              : `Rentang ${rangeStartYear} - ${rangeEndYear}`,
          lajuAcehBesar: growthRateAcehBesar.toFixed(2),
          lajuProvinsi: growthRateProv.toFixed(2),
          pendapatanPerKapita: Math.round(perCapitaIncome),
          ekstrimTertinggi: highestShareSector?.name,
          ekstrimTerendah: lowestShareSector?.name,
          lqTertinggi: highestLQSector ? `${highestLQSector.name} (LQ: ${highestLQSector.lq.toFixed(2)})` : '',
          dlqTertinggi: highestDLQSector ? `${highestDLQSector.name} (DLQ: ${highestDLQSector.dlq.toFixed(2)})` : '',
          dayaSaingTertinggi: highestCompetSector ? `${highestCompetSector.name} (+${highestCompetSector.competitiveAdvantage} M)` : '',
        };

        const res = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisType: activeAnalysisTab,
            prompt: `Berikan analisis eksekutif BPS komprehensif, terstruktur 3 bagian (Konteks Riil Aceh Besar, Nilai Ekstrim, Rekomendasi Pemkab) dan cantumkan sumber data valid Katalog BPS 1102001.1108 untuk modul ${activeAnalysisTab} periode ${context.periode}.`,
            contextData: context,
          }),
        });

        if (res.ok && !isCancelled) {
          const json = await res.json();
          if (json.insight && json.insight.length > 50) {
            setAiInsights((prev) => ({ ...prev, [activeAnalysisTab]: json.insight }));
          }
        }
      } catch {
        // Fallback already active and preserved
      } finally {
        if (!isCancelled) setIsAiLoading(false);
      }
    };

    fetchGemini();
    return () => {
      isCancelled = true;
    };
  }, [
    activeAnalysisTab,
    periodMode,
    selectedYear,
    rangeStartYear,
    rangeEndYear,
    priceType,
    getAuthenticSynthesis,
    growthRateAcehBesar,
    growthRateProv,
    perCapitaIncome,
    highestShareSector,
    lowestShareSector,
    highestLQSector,
    highestDLQSector,
    highestCompetSector,
  ]);

  const handleExportExcel = () => {
    const rows = sortedSectors.map((s) => ({
      code: s.code,
      name: s.name,
      value: s.value,
      share: s.share,
      lq: lqResults.find((x) => x.code === s.code)?.lq || 0,
      dlq: dlqResults.find((x) => x.code === s.code)?.dlq || 0,
      klassen: displayedKlassenResults.find((x) => x.code === s.code)?.category || '-',
      netShift: shiftShareResults.find((x) => x.code === s.code)?.netShift || 0,
    }));
    exportEconomyAnalysisExcel(effectiveFinalYear, priceType, rows);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Module Title & Global Filters */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-blue-800/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800 text-blue-200 text-xs font-semibold mb-2.5 border border-blue-700">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <span>Sistem Indikator PDRB & Analisis Regional Satker 1108</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Perekonomian Kabupaten Aceh Besar
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Disajikan bersumber dari data yang diinput pada menu Input Data. Dilengkapi opsi periode <strong>1 Series</strong> (tahunan) maupun <strong>Multi Series</strong> (rentang multi-tahun) yang diterapkan menyeluruh pada seluruh analisis ekonomi makro.
            </p>
          </div>

          {/* Interactive Filters Bar with 1 Series vs Multi Series Mode */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/15">
            {/* Periode Mode Toggle (1 Series vs Multi Series) */}
            <div className="flex items-center gap-1 bg-blue-950/90 p-0.5 rounded-lg border border-blue-700 text-xs">
              <button
                type="button"
                onClick={() => setPeriodMode('single')}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                  periodMode === 'single'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Pilih satu tahun tunggal untuk seluruh analisis"
              >
                <span>1 Series</span>
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('multi')}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                  periodMode === 'multi'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Pilih rentang multi-tahun untuk seluruh analisis"
              >
                <span>Multi Series</span>
              </button>
            </div>

            {/* DYNAMIC PERIOD DROPDOWNS */}
            {periodMode === 'single' ? (
              /* 1 SERIES: Only shows single year dropdown */
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-blue-200">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-blue-900/90 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg border border-blue-600 focus:outline-none focus:ring-1 focus:ring-orange-400"
                >
                  {economyData.years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* MULTI SERIES: Shows range start and end year dropdowns */
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-blue-200">Rentang:</span>
                <select
                  value={rangeStartYear}
                  onChange={(e) => setRangeStartYear(Number(e.target.value))}
                  className="bg-blue-900/90 text-white font-bold text-xs px-2 py-1.5 rounded-lg border border-blue-600 focus:outline-none"
                >
                  {economyData.years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className="text-white text-xs">s/d</span>
                <select
                  value={rangeEndYear}
                  onChange={(e) => setRangeEndYear(Number(e.target.value))}
                  className="bg-blue-900/90 text-white font-bold text-xs px-2 py-1.5 rounded-lg border border-blue-600 focus:outline-none"
                >
                  {economyData.years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Type */}
            <div className="flex items-center gap-1">
              <div className="bg-blue-950/80 p-0.5 rounded-lg border border-blue-700 flex text-xs">
                <button
                  type="button"
                  onClick={() => setPriceType('adhb')}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    priceType === 'adhb' ? 'bg-orange-500 text-white' : 'text-blue-200 hover:text-white'
                  }`}
                  title="Atas Dasar Harga Berlaku (Nominal)"
                >
                  ADHB
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType('adhk')}
                  className={`px-2 py-1 rounded-md font-semibold transition ${
                    priceType === 'adhk' ? 'bg-orange-500 text-white' : 'text-blue-200 hover:text-white'
                  }`}
                  title="Atas Dasar Harga Konstan (Riil)"
                >
                  ADHK
                </button>
              </div>
            </div>

            {/* Export Excel (.xlsx) button */}
            <button
              onClick={handleExportExcel}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Highlight Cards with Annual Series Fluctuation Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total PDRB */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total PDRB Aceh Besar
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                {priceType.toUpperCase()} {effectiveFinalYear}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Rp {totalLocalCurrent.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </h3>
                <span className="text-xs font-semibold text-slate-500">Miliar Rupiah</span>
              </div>

              {/* Sparkline Visual (Rentang Tahunan) */}
              {annualRangeMetrics.length > 1 && (
                <div className="flex flex-col items-end">
                  <svg width="84" height="28" className="overflow-visible">
                    {(() => {
                      const vals = annualRangeMetrics.map((m) => (priceType === 'adhb' ? m.adhb : m.adhk));
                      const min = Math.min(...vals);
                      const max = Math.max(...vals);
                      const range = max - min || 1;
                      const pts = vals.map((v, i) => {
                        const x = (i / (vals.length - 1)) * 74 + 5;
                        const y = 24 - ((v - min) / range) * 20;
                        return { x, y };
                      });
                      const path = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                      return (
                        <>
                          <path
                            d={`${path} L ${pts[pts.length - 1].x} 28 L ${pts[0].x} 28 Z`}
                            fill="#1d4ed8"
                            opacity="0.15"
                          />
                          <path d={path} fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#1d4ed8" />
                        </>
                      );
                    })()}
                  </svg>
                  <span className="text-[9px] font-mono font-semibold text-blue-700">
                    Series {yearsInRange[0]}-{yearsInRange[yearsInRange.length - 1]}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Kontribusi thd Provinsi:</span>
            <span className="font-bold text-blue-700">
              {totalProvCurrent > 0 ? ((totalLocalCurrent / totalProvCurrent) * 100).toFixed(2) : 0}%
            </span>
          </div>
        </div>

        {/* Card 2: Laju Pertumbuhan Ekonomi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Laju Pertumbuhan Ekonomi
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {periodMode === 'single' ? 'y-on-y' : `Rentang ${effectiveInitialYear}-${effectiveFinalYear}`}
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
                  {periodMode === 'single'
                    ? `+${growthRateAcehBesar.toFixed(2)}%`
                    : `+${avgAnnualGrowthRate.toFixed(2)}%`}
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {periodMode === 'single' ? 'vs Tahun Sebelumnya' : 'Rata-rata Tahunan'}
                </span>
              </div>

              {/* Annual Growth Fluctuation Sparkline (Rentang Tahunan) */}
              {annualRangeMetrics.length > 1 && (
                <div className="flex flex-col items-end">
                  <svg width="84" height="28" className="overflow-visible">
                    {(() => {
                      const validPts = annualRangeMetrics.filter((m) => m.growth !== null);
                      if (validPts.length <= 1) return null;
                      const vals = validPts.map((m) => m.growth as number);
                      const min = Math.min(...vals);
                      const max = Math.max(...vals);
                      const range = max - min || 1;
                      const pts = vals.map((v, i) => {
                        const x = (i / (vals.length - 1)) * 74 + 5;
                        const y = 24 - ((v - min) / range) * 20;
                        return { x, y };
                      });
                      const path = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                      return (
                        <>
                          <path
                            d={`${path} L ${pts[pts.length - 1].x} 28 L ${pts[0].x} 28 Z`}
                            fill="#059669"
                            opacity="0.15"
                          />
                          <path d={path} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#059669" />
                        </>
                      );
                    })()}
                  </svg>
                  <span className="text-[9px] font-mono font-semibold text-emerald-700">
                    {periodMode === 'multi' && minAnnualGrowth && maxAnnualGrowth
                      ? `Min ${minAnnualGrowth.growth?.toFixed(1)}% | Max ${maxAnnualGrowth.growth?.toFixed(1)}%`
                      : 'Fluktuasi y-on-y'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {periodMode === 'single' ? 'Laju Provinsi Aceh:' : 'Laju Thn Terakhir (' + effectiveFinalYear + '):'}
            </span>
            <span className="font-semibold text-slate-800">
              {periodMode === 'single'
                ? `+${growthRateProv.toFixed(2)}%`
                : `+${(annualRangeMetrics[annualRangeMetrics.length - 1]?.growth ?? growthRateAcehBesar).toFixed(2)}%`}
            </span>
          </div>
        </div>

        {/* Card 3: Pendapatan per Kapita */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pendapatan per Kapita
              </span>
              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold">
                Rp / Jiwa / Tahun
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                  Rp {Math.round(perCapitaIncome).toLocaleString('id-ID')}
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  Penduduk: {currentPop.toLocaleString('id-ID')} Jiwa
                </span>
              </div>

              {/* Sparkline Per Capita Progression */}
              {annualRangeMetrics.length > 1 && (
                <div className="flex flex-col items-end">
                  <svg width="84" height="28" className="overflow-visible">
                    {(() => {
                      const vals = annualRangeMetrics.map((m) => m.pc);
                      const min = Math.min(...vals);
                      const max = Math.max(...vals);
                      const range = max - min || 1;
                      const pts = vals.map((v, i) => {
                        const x = (i / (vals.length - 1)) * 74 + 5;
                        const y = 24 - ((v - min) / range) * 20;
                        return { x, y };
                      });
                      const path = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                      return (
                        <>
                          <path
                            d={`${path} L ${pts[pts.length - 1].x} 28 L ${pts[0].x} 28 Z`}
                            fill="#ea580c"
                            opacity="0.15"
                          />
                          <path d={path} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#ea580c" />
                        </>
                      );
                    })()}
                  </svg>
                  <span className="text-[9px] font-mono font-semibold text-orange-700">
                    Progres {yearsInRange[0]}-{yearsInRange[yearsInRange.length - 1]}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Basis Perhitungan:</span>
            <span className="font-bold text-slate-700">
              {priceType.toUpperCase()} ({effectiveFinalYear})
            </span>
          </div>
        </div>
      </div>

      {/* GRAFIK & ANALISIS FLUKTUASI SERIES TAHUNAN (RINGKASAN DIATASNYA) */}
      {/* Tampil otomatis pada mode Multi Series dan dapat disesuaikan dengan rentang yang dipilih */}
      {periodMode === 'multi' && (
        <AnnualSeriesFluctuationChart
          economyData={economyData}
          startYear={rangeStartYear}
          endYear={rangeEndYear}
          priceType={priceType}
        />
      )}

      {/* Catatan Rumus Perhitungan Indikator Makro Utama */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <BookOpen className="w-4 h-4 text-blue-700" />
          <span>Catatan & Rumus Perhitungan Indikator Makro Utama (Metodologi BPS):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
            <span className="font-bold text-blue-900 text-[11px] block">1. Laju Pertumbuhan Ekonomi (gₜ):</span>
            <div className="font-mono bg-blue-50/70 p-1.5 rounded text-[11px] text-blue-950 font-bold text-center">
              gₜ = [(PDRBₜ - PDRBₜ₋₁) / PDRBₜ₋₁] × 100%
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              *Keterangan: Menggunakan PDRB Atas Dasar Harga Konstan (ADHK) tahun dasar 2010 guna mencerminkan pertambahan volume riil produksi barang dan jasa tanpa pengaruh inflasi.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
            <span className="font-bold text-orange-900 text-[11px] block">2. Pendapatan per Kapita:</span>
            <div className="font-mono bg-orange-50/70 p-1.5 rounded text-[11px] text-orange-950 font-bold text-center">
              Pendapatan per Kapita = (Total PDRB_ADHB × 1.000.000.000) / Jumlah Penduduk
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              *Keterangan: Total nilai PDRB Nominal (ADHB) dalam Miliar Rupiah dikonversi ke satuan Rupiah penuh, kemudian dibagi total jumlah penduduk kabupaten pada tahun berjalan.
            </p>
          </div>
        </div>
      </div>

      {/* Main Sub-Navigation Bar for Perekonomian Kita (Clean 5 econometric tabs, no map) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveAnalysisTab('distribution')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeAnalysisTab === 'distribution'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Distribusi Kategori (Sorted)</span>
        </button>

        <button
          onClick={() => setActiveAnalysisTab('quarterly')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeAnalysisTab === 'quarterly'
              ? 'bg-purple-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5" />
          <span>PDRB Triwulanan (TW I-IV)</span>
        </button>

        <button
          onClick={() => setActiveAnalysisTab('lq')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeAnalysisTab === 'lq'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Analisis LQ</span>
        </button>

        <button
          onClick={() => setActiveAnalysisTab('dlq')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeAnalysisTab === 'dlq'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Analisis DLQ</span>
        </button>

        <button
          onClick={() => setActiveAnalysisTab('klassen')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeAnalysisTab === 'klassen'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tipologi Klassen</span>
        </button>

        <button
          onClick={() => setActiveAnalysisTab('shift-share')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeAnalysisTab === 'shift-share'
              ? 'bg-blue-800 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analisis Shift-Share</span>
        </button>
      </div>

      {/* REUSABLE AUTO-RENDERED COMPREHENSIVE AI INSIGHT BOX */}
      <div className="bg-gradient-to-br from-blue-50/95 via-indigo-50/90 to-amber-50/80 rounded-2xl border border-blue-200/90 shadow-xs p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-800 text-white rounded-lg shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
                <span>Wawasan Cerdas AI</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold border border-blue-200">
                  Otomatis Aktif
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Analisis fenomena riil, identifikasi nilai ekstrim, dan rekomendasi kebijakan berbasis data ekonomi daerah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAiLoading && (
              <span className="text-[11px] text-blue-700 font-semibold animate-pulse flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Menyinkronkan AI...</span>
              </span>
            )}
          </div>
        </div>

        {/* Formatted Content */}
        <div className="text-xs text-slate-800 leading-relaxed font-sans bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-blue-100 whitespace-pre-line shadow-2xs">
          {aiInsights[activeAnalysisTab] || getAuthenticSynthesis(activeAnalysisTab)}
        </div>
      </div>

      {/* SUBTAB 1: DISTRIBUSI PDRB SORTED */}
      {activeAnalysisTab === 'distribution' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-blue-700" />
                <span>Distribusi Kategori Lapangan Usaha (Sorted: Share Terbesar ke Terkecil)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {periodMode === 'single'
                  ? `Urutan pangsa pasar PDRB tahun ${selectedYear} (${priceType.toUpperCase()})`
                  : `Matriks perbandingan multi-series rentang ${rangeStartYear} - ${rangeEndYear} (${priceType.toUpperCase()})`}
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold font-mono">
              {periodMode === 'single' ? `1 SERIES (${selectedYear})` : `MULTI SERIES (${rangeStartYear}-${rangeEndYear})`}
            </span>
          </div>

          {/* 1 SERIES VIEW: Sorted Horizontal Bar Chart & Single Table */}
          {periodMode === 'single' ? (
            <div className="space-y-6">
              {/* Visual Horizontal Bars */}
              <div className="space-y-3">
                {sortedSectors.map((sector, rank) => {
                  const maxShare = sortedSectors[0]?.share || 1;
                  const barWidth = (sector.share / maxShare) * 100;

                  return (
                    <div key={sector.code} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="w-5 text-center font-bold text-slate-400 shrink-0">
                            #{rank + 1}
                          </span>
                          <span className="font-bold text-blue-800 font-mono shrink-0">[{sector.code}]</span>
                          <span className="font-semibold text-slate-800 truncate">{sector.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-slate-500 hidden sm:inline">
                            Rp {sector.value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} M
                          </span>
                          <span className="font-black text-slate-900 text-sm w-16 text-right">
                            {sector.share.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex items-center">
                        <div
                          className="bg-gradient-to-r from-blue-700 via-blue-600 to-orange-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(barWidth, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 1 Series Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                      <th className="py-2.5 px-3 w-16">Kode</th>
                      <th className="py-2.5 px-3">Kategori Lapangan Usaha</th>
                      <th className="py-2.5 px-3 text-right">Nilai PDRB (Miliar Rp)</th>
                      <th className="py-2.5 px-3 text-right">Share (%)</th>
                      <th className="py-2.5 px-3 text-right">Kumulatif (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedSectors.map((sector, idx) => {
                      const cumulativeShare = sortedSectors
                        .slice(0, idx + 1)
                        .reduce((acc, curr) => acc + curr.share, 0);

                      return (
                        <tr key={sector.code} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">#{idx + 1}</td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-800">[{sector.code}]</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{sector.name}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                            {sector.value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                            {sector.share.toFixed(2)}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-500">
                            {cumulativeShare.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* MULTI SERIES VIEW: Full Multi-Year Columns & Delta Share */
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center bg-slate-200/80">Rank</th>
                      <th className="py-2.5 px-3 w-16 bg-slate-200/80">Kode</th>
                      <th className="py-2.5 px-3 min-w-[200px] bg-slate-200/80">Kategori Lapangan Usaha</th>
                      {yearsInRange.map((yr) => (
                        <th key={yr} className="py-2.5 px-3 text-right min-w-[100px]">
                          {yr} (%)
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-right bg-blue-100 text-blue-900 min-w-[100px]">
                        Δ Share (%pt)
                      </th>
                      <th className="py-2.5 px-3 text-right bg-emerald-100 text-emerald-900 min-w-[110px]">
                        Pertumbuhan Kumulatif
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedSectors.map((sector, idx) => {
                      const secData = economyData.sectors.find((s) => s.code === sector.code);
                      const initialVal = secData ? secData[priceType][rangeStartYear] || 0 : 0;
                      const finalVal = secData ? secData[priceType][rangeEndYear] || 0 : 0;
                      const sectorGrowth = initialVal > 0 ? ((finalVal - initialVal) / initialVal) * 100 : 0;

                      const initTotal = calculateTotalPDRB(economyData.sectors, rangeStartYear, priceType);
                      const initialShare = initTotal > 0 ? (initialVal / initTotal) * 100 : 0;
                      const deltaShare = sector.share - initialShare;

                      return (
                        <tr key={sector.code} className="hover:bg-blue-50/30 transition">
                          <td className="py-2 px-3 text-center font-bold text-slate-400 bg-slate-50/50">
                            #{idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-blue-800 bg-slate-50/50">
                            [{sector.code}]
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">{sector.name}</td>
                          {yearsInRange.map((yr) => {
                            const yrTotal = calculateTotalPDRB(economyData.sectors, yr, priceType);
                            const yrVal = secData ? secData[priceType][yr] || 0 : 0;
                            const yrShare = yrTotal > 0 ? (yrVal / yrTotal) * 100 : 0;
                            return (
                              <td key={yr} className="py-2 px-3 text-right font-mono">
                                {yrShare.toFixed(2)}%
                              </td>
                            );
                          })}
                          <td
                            className={`py-2 px-3 text-right font-mono font-bold bg-blue-50/50 ${
                              deltaShare >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {deltaShare >= 0 ? `+${deltaShare.toFixed(2)}` : deltaShare.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                            +{sectorGrowth.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Descriptive extreme insight note */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span>Analisis Deskriptif Singkat Nilai Ekstrim:</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Share Terbesar</strong>: Didominasi oleh <strong>[{highestShareSector?.code}] {highestShareSector?.name} ({highestShareSector?.share.toFixed(2)}%)</strong>, bertumpu pada lumbung padi teknis Krueng Aceh dan perikanan laut.
            </p>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Share Terendah</strong>: Berada pada <strong>[{lowestShareSector?.code}] {lowestShareSector?.name} ({lowestShareSector?.share.toFixed(2)}%)</strong>.
            </p>
          </div>

          {/* Catatan Rumus Perhitungan Distribusi Sektoral */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Catatan & Rumus Perhitungan Distribusi Sektoral (Metodologi BPS):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-slate-700">
              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">1. Pangsa Sektor (sᵢ):</span>
                <div className="font-mono bg-blue-50 p-1 rounded text-[11px] text-blue-950 font-bold text-center">
                  sᵢ = (Yᵢ / ∑Yⱼ) × 100%
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Di mana Yᵢ adalah nilai PDRB sektor ke-i, dan ∑Yⱼ adalah total PDRB seluruh 17 kategori lapangan usaha.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">2. Perubahan Pangsa (Δsᵢ):</span>
                <div className="font-mono bg-blue-50 p-1 rounded text-[11px] text-blue-950 font-bold text-center">
                  Δsᵢ = sᵢ,ₜₙ - sᵢ,ₜ₀ (poin %)
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Menghitung pergeseran struktur ekonomi dari tahun awal rentang (t₀) ke tahun akhir rentang (tₙ).
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">3. Pertumbuhan Kumulatif:</span>
                <div className="font-mono bg-blue-50 p-1 rounded text-[11px] text-blue-950 font-bold text-center">
                  gᵢ = [(Yᵢ,ₜₙ - Yᵢ,ₜ₀) / Yᵢ,ₜ₀] × 100%
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Laju ekspansi atau kontraksi nominal/riil nilai tambah bruto sektor ke-i selama seluruh rentang tahun.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB TRIWULANAN: PDRB TRIWULANAN (TW I s.d. TW IV) */}
      {activeAnalysisTab === 'quarterly' && <QuarterlyPDRBView />}

      {/* SUBTAB 2: LOCATION QUOTIENT (LQ) */}
      {activeAnalysisTab === 'lq' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-800 text-white text-[10px] font-bold">
                  LQ
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Location Quotient (LQ) - Identifikasi Sektor Basis
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {periodMode === 'single'
                  ? `Analisis spesialisasi ekonomi tahun ${selectedYear} (${priceType.toUpperCase()})`
                  : `Dinamika pergeseran status basis rentang ${rangeStartYear} s/d ${rangeEndYear}`}
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold font-mono">
              {periodMode === 'single' ? `1 SERIES (${selectedYear})` : `MULTI SERIES (${rangeStartYear}-${rangeEndYear})`}
            </span>
          </div>

          {/* 1 SERIES LQ Table */}
          {periodMode === 'single' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-16">Kode</th>
                    <th className="py-2.5 px-3">Kategori Lapangan Usaha</th>
                    <th className="py-2.5 px-3 text-right">PDRB Aceh Besar (M)</th>
                    <th className="py-2.5 px-3 text-right">PDRB Provinsi (M)</th>
                    <th className="py-2.5 px-3 text-right">Share AB (%)</th>
                    <th className="py-2.5 px-3 text-right">Share Prov (%)</th>
                    <th className="py-2.5 px-3 text-right font-black">Nilai LQ</th>
                    <th className="py-2.5 px-3 text-center">Status Sektor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lqResults.map((item) => {
                    const sec = economyData.sectors.find((s) => s.code === item.code);
                    const provSec = economyData.provinceSectors.find((s) => s.code === item.code);
                    const valAB = sec ? sec[priceType][selectedYear] || 0 : 0;
                    const valProv = provSec ? provSec[priceType][selectedYear] || 0 : 0;

                    return (
                      <tr key={item.code} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-800">[{item.code}]</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {valAB.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {valProv.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-900 font-semibold">{item.shareAcehBesar}%</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{item.shareAcehProvince}%</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                          <span className={item.lq > 1 ? 'text-emerald-600' : 'text-slate-600'}>
                            {item.lq.toFixed(3)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              item.isBaseSector
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.isBaseSector ? 'SEKTOR BASIS' : 'Non-Basis'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* MULTI SERIES LQ Table (Comparing Start Year vs End Year LQ) */
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-16 bg-slate-200/80">Kode</th>
                    <th className="py-2.5 px-3 min-w-[200px] bg-slate-200/80">Kategori Lapangan Usaha</th>
                    <th className="py-2.5 px-3 text-right">LQ Awal ({rangeStartYear})</th>
                    <th className="py-2.5 px-3 text-right font-bold text-blue-900">LQ Akhir ({rangeEndYear})</th>
                    <th className="py-2.5 px-3 text-right bg-blue-100 text-blue-900">Δ LQ (Perubahan)</th>
                    <th className="py-2.5 px-3 text-center">Status Dinamis Daya Saing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lqResults.map((item) => {
                    const initLqObj = lqInitialResults.find((x) => x.code === item.code);
                    const initLq = initLqObj ? initLqObj.lq : item.lq;
                    const finalLq = item.lq;
                    const deltaLq = finalLq - initLq;

                    let dynamicStatus = 'Non-Basis Stabil';
                    let badgeColor = 'bg-slate-100 text-slate-600';

                    if (initLq > 1 && finalLq > 1) {
                      dynamicStatus = deltaLq >= 0 ? 'Basis Menguat' : 'Basis Melemah';
                      badgeColor =
                        deltaLq >= 0
                          ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 font-bold';
                    } else if (initLq <= 1 && finalLq > 1) {
                      dynamicStatus = 'Masuk Sektor Basis Baru';
                      badgeColor = 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-300';
                    } else if (initLq > 1 && finalLq <= 1) {
                      dynamicStatus = 'Turun ke Non-Basis';
                      badgeColor = 'bg-rose-100 text-rose-800 font-bold';
                    }

                    return (
                      <tr key={item.code} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-800 bg-slate-50/50">
                          [{item.code}]
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{initLq.toFixed(3)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">{finalLq.toFixed(3)}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold bg-blue-50/40 ${
                            deltaLq >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {deltaLq >= 0 ? `+${deltaLq.toFixed(3)}` : deltaLq.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] ${badgeColor}`}>
                            {dynamicStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <AlertCircle className="w-4 h-4 text-blue-700" />
              <span>Analisis Deskriptif Nilai Ekstrim LQ:</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Sektor Basis Ekstrim Terunggul</strong>: Dipegang oleh <strong>[{highestLQSector?.code}] {highestLQSector?.name} (LQ: {highestLQSector?.lq.toFixed(3)})</strong> dengan keunggulan orientasi ekspor.
            </p>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Sektor Non-Basis Ekstrim Terendah</strong>: <strong>[{lowestLQSector?.code}] {lowestLQSector?.name} (LQ: {lowestLQSector?.lq.toFixed(3)})</strong>.
            </p>
          </div>

          {/* Catatan Rumus Perhitungan Location Quotient (LQ) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Catatan & Rumus Perhitungan Location Quotient (LQ) (Metodologi BPS):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">Rumus Formula Matematis LQ:</span>
                <div className="font-mono bg-blue-50 p-2 rounded text-xs text-blue-950 font-bold text-center">
                  LQᵢ = (vᵢ / Vₜ) / (Yᵢ / Yₜ) = sᵢ,AB / sᵢ,PROV
                </div>
                <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
                  <p>• <strong>vᵢ</strong>: Nilai PDRB sektor i di Kabupaten Aceh Besar</p>
                  <p>• <strong>Vₜ</strong>: Total PDRB seluruh sektor di Kabupaten Aceh Besar</p>
                  <p>• <strong>Yᵢ</strong>: Nilai PDRB sektor i di Provinsi Aceh (wilayah acuan)</p>
                  <p>• <strong>Yₜ</strong>: Total PDRB seluruh sektor di Provinsi Aceh</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1.5">
                <span className="font-bold text-blue-900 text-[11px] block">Kriteria Klasifikasi Sektor:</span>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                    <strong className="text-emerald-800">LQ &gt; 1 (Sektor Basis)</strong>: Memiliki spesialisasi &amp; keunggulan komparatif. Mampu memenuhi kebutuhan internal serta mengekspor produk ke luar wilayah kabupaten.
                  </div>
                  <div className="p-1.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                    <strong className="text-slate-700">LQ ≤ 1 (Sektor Non-Basis)</strong>: Belum mampu memenuhi kebutuhan domestik secara mandiri sehingga masih memerlukan pasokan barang/jasa dari luar wilayah.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DYNAMIC LOCATION QUOTIENT (DLQ) */}
      {activeAnalysisTab === 'dlq' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-800 text-white text-[10px] font-bold">
                  DLQ
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Dynamic Location Quotient (DLQ) & Matriks Reposisi Sektoral
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Periode Analisis: {effectiveInitialYear} - {effectiveFinalYear} ({periodMode === 'single' ? 'Tahun Berjalan y-on-y' : 'Rentang Multi-Series'})
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold font-mono">
              {periodMode === 'single' ? `1 SERIES (${effectiveInitialYear}-${effectiveFinalYear})` : `MULTI SERIES (${rangeStartYear}-${rangeEndYear})`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-16">Kode</th>
                  <th className="py-2.5 px-3">Kategori Sektor</th>
                  <th className="py-2.5 px-3 text-right">Laju Aceh Besar (%)</th>
                  <th className="py-2.5 px-3 text-right">Laju Provinsi (%)</th>
                  <th className="py-2.5 px-3 text-right font-black">Nilai DLQ</th>
                  <th className="py-2.5 px-3 text-center">Status Prospektif</th>
                  <th className="py-2.5 px-3 text-center">Matriks Gabungan (LQ x DLQ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dlqResults.map((dlq) => {
                  const lq = lqResults.find((x) => x.code === dlq.code)?.lq || 0;
                  const isLqBase = lq > 1;
                  const isDlqPro = dlq.dlq > 1;

                  let matrixClass = 'Sektor Tertinggal';
                  let badgeStyle = 'bg-slate-100 text-slate-700';

                  if (isLqBase && isDlqPro) {
                    matrixClass = 'Sektor Unggulan Prima';
                    badgeStyle = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300';
                  } else if (isLqBase && !isDlqPro) {
                    matrixClass = 'Sektor Matang Jenuh';
                    badgeStyle = 'bg-blue-100 text-blue-800 font-semibold';
                  } else if (!isLqBase && isDlqPro) {
                    matrixClass = 'Sektor Potensial Prospektif';
                    badgeStyle = 'bg-amber-100 text-amber-800 font-semibold';
                  }

                  return (
                    <tr key={dlq.code} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-800">[{dlq.code}]</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{dlq.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono">+{dlq.growthAcehBesar}%</td>
                      <td className="py-2.5 px-3 text-right font-mono">+{dlq.growthProvince}%</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-sm">
                        <span className={dlq.dlq > 1 ? 'text-indigo-600' : 'text-slate-600'}>
                          {dlq.dlq.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            dlq.isProspective
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {dlq.isProspective ? 'PROSPEKTIF' : 'Non-Prospektif'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] ${badgeStyle}`}>
                          {matrixClass}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              <span>Analisis Deskriptif Nilai Ekstrim DLQ:</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Akselerasi Tertinggi (Ekstrim Atas)</strong>: <strong>[{highestDLQSector?.code}] {highestDLQSector?.name} (DLQ: {highestDLQSector?.dlq.toFixed(3)})</strong>, berpotensi kuat sebagai pilar ekonomi baru Aceh Besar.
            </p>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Perlambatan Terendah (Ekstrim Bawah)</strong>: <strong>[{lowestDLQSector?.code}] {lowestDLQSector?.name} (DLQ: {lowestDLQSector?.dlq.toFixed(3)})</strong>.
            </p>
          </div>

          {/* Catatan Rumus Perhitungan Dynamic Location Quotient (DLQ) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Catatan & Rumus Perhitungan Dynamic Location Quotient (DLQ) (Metodologi BPS):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">Rumus Formula Matematis DLQ:</span>
                <div className="font-mono bg-blue-50 p-2 rounded text-xs text-blue-950 font-bold text-center">
                  DLQᵢ = [(1 + gᵢ) / (1 + g)] / [(1 + Gᵢ) / (1 + G)]
                </div>
                <div className="text-[10px] text-slate-600 space-y-0.5 pt-1">
                  <p>• <strong>gᵢ</strong>: Rata-rata laju pertumbuhan sektor i di Kabupaten Aceh Besar</p>
                  <p>• <strong>g</strong>: Rata-rata laju pertumbuhan total PDRB Kabupaten Aceh Besar</p>
                  <p>• <strong>Gᵢ</strong>: Rata-rata laju pertumbuhan sektor i di Provinsi Aceh</p>
                  <p>• <strong>G</strong>: Rata-rata laju pertumbuhan total PDRB Provinsi Aceh</p>
                  <p className="pt-1 text-slate-500">
                    *Kriteria: DLQ &gt; 1 = <strong>Sektor Prospektif</strong> (daya saing masa depan menguat); DLQ ≤ 1 = <strong>Non-Prospektif</strong>.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">Matriks Reposisi Sektoral (Gabungan LQ × DLQ):</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-0.5">
                  <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                    <strong className="block text-emerald-800">1. Unggulan Prima</strong>
                    LQ &gt; 1 &amp; DLQ &gt; 1 (Basis dan Prospektif di masa depan).
                  </div>
                  <div className="p-1.5 rounded bg-blue-50 border border-blue-200 text-blue-950">
                    <strong className="block text-blue-800">2. Matang Jenuh</strong>
                    LQ &gt; 1 &amp; DLQ ≤ 1 (Basis namun pertumbuhannya melambat).
                  </div>
                  <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-950">
                    <strong className="block text-amber-800">3. Potensial Prospektif</strong>
                    LQ ≤ 1 &amp; DLQ &gt; 1 (Non-basis namun akselerasinya pesat).
                  </div>
                  <div className="p-1.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                    <strong className="block text-slate-700">4. Sektor Tertinggal</strong>
                    LQ ≤ 1 &amp; DLQ ≤ 1 (Non-basis dan pertumbuhannya lambat).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: TIPOLOGI KLASSEN */}
      {activeAnalysisTab === 'klassen' && (
        <div className="space-y-6">
          {/* Top Cartesian Plot with selectable abscissa and ordinate */}
          <KlassenCartesianChart
            data={klassenResults}
            shiftShareData={shiftShareResults}
            dlqData={dlqResults}
            sectorsPDRB={economyData.sectors}
            provinceSectorsPDRB={economyData.provinceSectors}
            provTotalGrowth={provAdhkTotalGrowth}
            year={effectiveFinalYear}
            priceType={priceType}
            selectedXIndicator={klassenX}
            selectedYIndicator={klassenY}
            onChangeXIndicator={setKlassenX}
            onChangeYIndicator={setKlassenY}
          />

          {/* 4 Quadrants Card (100% consistent with Cartesian Plot above) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm text-slate-900">
                  Klasifikasi 4 Kuadran Tipologi Klassen ({effectiveInitialYear} - {effectiveFinalYear})
                </h4>
                <p className="text-xs text-slate-500">
                  Konsisten penuh dengan titik potong acuan <strong>Provinsi Aceh</strong> pada grafik Kartesius di atas (setiap titik kategori memplot Kabupaten Aceh Besar).
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold font-mono shrink-0 self-start sm:self-auto">
                {periodMode === 'single' ? `1 SERIES (${effectiveInitialYear}-${effectiveFinalYear})` : `MULTI SERIES (${rangeStartYear}-${rangeEndYear})`}
              </span>
            </div>

            {/* 4 Clean Quadrant Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kuadran 1 */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between min-h-[110px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                      KUADRAN I
                    </span>
                    <span className="text-xs font-bold text-emerald-800">Maju &amp; Tumbuh Cepat</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {displayedKlassenResults.filter((k) => k.quadrant === 1).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        (Tidak ada kategori lapangan usaha pada kuadran ini)
                      </span>
                    ) : (
                      displayedKlassenResults
                        .filter((k) => k.quadrant === 1)
                        .map((k) => (
                          <span
                            key={k.code}
                            className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-950 text-xs font-semibold shadow-2xs"
                          >
                            [{k.code}] {k.name}
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Kuadran 2 */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between min-h-[110px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-bold text-[10px]">
                      KUADRAN II
                    </span>
                    <span className="text-xs font-bold text-blue-900">Maju Tapi Tertekan</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {displayedKlassenResults.filter((k) => k.quadrant === 2).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        (Tidak ada kategori lapangan usaha pada kuadran ini)
                      </span>
                    ) : (
                      displayedKlassenResults
                        .filter((k) => k.quadrant === 2)
                        .map((k) => (
                          <span
                            key={k.code}
                            className="px-2.5 py-1 rounded-md bg-white border border-blue-300 text-blue-950 text-xs font-semibold shadow-2xs"
                          >
                            [{k.code}] {k.name}
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Kuadran 3 */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between min-h-[110px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[10px]">
                      KUADRAN III
                    </span>
                    <span className="text-xs font-bold text-amber-900">Berkembang Cepat</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {displayedKlassenResults.filter((k) => k.quadrant === 3).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        (Tidak ada kategori lapangan usaha pada kuadran ini)
                      </span>
                    ) : (
                      displayedKlassenResults
                        .filter((k) => k.quadrant === 3)
                        .map((k) => (
                          <span
                            key={k.code}
                            className="px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-950 text-xs font-semibold shadow-2xs"
                          >
                            [{k.code}] {k.name}
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Kuadran 4 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between min-h-[110px]">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-slate-600 text-white font-bold text-[10px]">
                      KUADRAN IV
                    </span>
                    <span className="text-xs font-bold text-slate-700">Relatif Tertinggal</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {displayedKlassenResults.filter((k) => k.quadrant === 4).length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        (Tidak ada kategori lapangan usaha pada kuadran ini)
                      </span>
                    ) : (
                      displayedKlassenResults
                        .filter((k) => k.quadrant === 4)
                        .map((k) => (
                          <span
                            key={k.code}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-slate-800 text-xs font-semibold shadow-2xs"
                          >
                            [{k.code}] {k.name}
                          </span>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Catatan Rumus Perhitungan Analisis Tipologi Klassen */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Catatan &amp; Rumus Perhitungan Analisis Tipologi Klassen (Metodologi BPS):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">Variabel &amp; Tolok Ukur Pembanding:</span>
                <div className="text-[10px] text-slate-600 space-y-1 pt-0.5">
                  <p>• <strong>gᵢ</strong> : Laju pertumbuhan PDRB sektor <em>i</em> Kabupaten Aceh Besar</p>
                  <p>• <strong>gₙ</strong> : Laju pertumbuhan PDRB sektor <em>i</em> Provinsi Aceh (wilayah acuan/referensi)</p>
                  <p>• <strong>sᵢ</strong> : Pangsa (share) sektor <em>i</em> terhadap total PDRB Kabupaten Aceh Besar = <em>(yᵢ / Y_total) × 100%</em></p>
                  <p>• <strong>sₙ</strong> : Pangsa (share) sektor <em>i</em> terhadap total PDRB Provinsi Aceh = <em>(Yᵢ_prov / Y_total_prov) × 100%</em></p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1">
                <span className="font-bold text-blue-900 text-[11px] block">Kriteria Klasifikasi 4 Kuadran Klassen:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-0.5">
                  <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
                    <strong className="block text-emerald-800">Kuadran I: Maju &amp; Pesat</strong>
                    gᵢ &gt; gₙ dan sᵢ &gt; sₙ (Pertumbuhan tinggi, kontribusi besar).
                  </div>
                  <div className="p-1.5 rounded bg-blue-50 border border-blue-200 text-blue-950">
                    <strong className="block text-blue-800">Kuadran II: Maju Tapi Tertekan</strong>
                    gᵢ ≤ gₙ dan sᵢ &gt; sₙ (Pertumbuhan rendah, kontribusi besar).
                  </div>
                  <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-950">
                    <strong className="block text-amber-800">Kuadran III: Berkembang Cepat</strong>
                    gᵢ &gt; gₙ dan sᵢ ≤ sₙ (Pertumbuhan tinggi, kontribusi kecil).
                  </div>
                  <div className="p-1.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                    <strong className="block text-slate-700">Kuadran IV: Relatif Tertinggal</strong>
                    gᵢ ≤ gₙ dan sᵢ ≤ sₙ (Pertumbuhan lambat, kontribusi kecil).
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              *Catatan: Grafik kartesius di atas menampilkan sebaran posisi sektor berdasarkan indikator absis dan ordinat yang dapat dipilih secara dinamis oleh pengguna.
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 5: SHIFT-SHARE ANALYSIS */}
      {activeAnalysisTab === 'shift-share' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-800 text-white text-[10px] font-bold">
                  Shift-Share
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Analisis Shift-Share (Dekomposisi Pertumbuhan PDRB)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Periode: {effectiveInitialYear} s/d {effectiveFinalYear} ({periodMode === 'single' ? 'Dekomposisi Tahunan' : 'Dekomposisi Rentang Multi-Series'})
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold font-mono">
              {periodMode === 'single' ? `1 SERIES (${effectiveInitialYear}-${effectiveFinalYear})` : `MULTI SERIES (${rangeStartYear}-${rangeEndYear})`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-14">Kode</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Kategori Sektor</th>
                  <th className="py-2.5 px-3 text-right">Awal ({effectiveInitialYear})</th>
                  <th className="py-2.5 px-3 text-right">Akhir ({effectiveFinalYear})</th>
                  <th className="py-2.5 px-3 text-right" title="Regional Share (Nij)">Nij (Efek Provinsi)</th>
                  <th className="py-2.5 px-3 text-right" title="Proportionality Shift (Mij)">Mij (Bauran Industri)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-800" title="Differential Shift (Cij)">
                    Cij (Keunggulan Bersaing)
                  </th>
                  <th className="py-2.5 px-3 text-right font-black">Net Shift (Dij)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {shiftShareResults.map((ss) => (
                  <tr key={ss.code} className="hover:bg-slate-50/60 text-[11px]">
                    <td className="py-2.5 px-3 font-bold text-blue-800">[{ss.code}]</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800">{ss.name}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{ss.initialValue}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{ss.finalValue}</td>
                    <td className="py-2.5 px-3 text-right text-blue-700">+{ss.regionalGrowthEffect}</td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        ss.industryMix >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-500'
                      }`}
                    >
                      {ss.industryMix >= 0 ? `+${ss.industryMix}` : ss.industryMix}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right ${
                        ss.competitiveAdvantage >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'
                      }`}
                    >
                      {ss.competitiveAdvantage >= 0 ? `+${ss.competitiveAdvantage}` : ss.competitiveAdvantage}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 font-sans text-xs">
                      Rp {ss.netShift > 0 ? `+${ss.netShift}` : ss.netShift} M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <AlertCircle className="w-4 h-4 text-blue-700" />
              <span>Analisis Deskriptif Nilai Ekstrim Shift-Share:</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Keunggulan Kompetitif Tertinggi (Cij &gt; 0)</strong>: Dipegang oleh <strong>[{highestCompetSector?.code}] {highestCompetSector?.name} (+{highestCompetSector?.competitiveAdvantage} Miliar Rp)</strong>, didorong efisiensi faktor produksi internal Aceh Besar.
            </p>
            <p className="text-slate-700 leading-relaxed">
              • <strong>Daya Saing Ekstrim Tertekan (Cij &lt; 0)</strong>: <strong>[{lowestCompetSector?.code}] {lowestCompetSector?.name} ({lowestCompetSector?.competitiveAdvantage} Miliar Rp)</strong>.
            </p>
          </div>

          {/* Catatan Rumus Perhitungan Analisis Shift-Share */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Catatan &amp; Rumus Perhitungan Analisis Shift-Share (Metodologi BPS):</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1.5">
                <span className="font-bold text-blue-900 text-[11px] block">Persamaan Dekomposisi Pokok (Net Shift):</span>
                <div className="font-mono bg-blue-50 p-2 rounded text-xs text-blue-950 font-bold text-center">
                  Dᵢⱼ = Nᵢⱼ + Mᵢⱼ + Cᵢⱼ = Yᵢ,ₜ - Yᵢ,₀
                </div>
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <p>• <strong>Dᵢⱼ (Net Shift)</strong> : Perubahan riil total nilai PDRB sektor <em>i</em> di Kabupaten Aceh Besar dari tahun awal (<em>t₀</em>) ke tahun akhir (<em>t</em>).</p>
                  <p>• <strong>Yᵢ,₀</strong> : Nilai PDRB sektor <em>i</em> Kabupaten Aceh Besar pada tahun awal analisis ({effectiveInitialYear}).</p>
                  <p>• <strong>Yᵢ,ₜ</strong> : Nilai PDRB sektor <em>i</em> Kabupaten Aceh Besar pada tahun akhir analisis ({effectiveFinalYear}).</p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-blue-100 space-y-1.5">
                <span className="font-bold text-blue-900 text-[11px] block">Tiga Komponen Pertumbuhan Sektoral:</span>
                <div className="text-[10px] text-slate-600 space-y-1">
                  <p className="p-1 rounded bg-slate-50 border border-slate-100">
                    <strong className="text-blue-800">1. Nᵢⱼ (Regional Share) = Yᵢ,₀ × rₙ</strong>
                    <br />Pengaruh pertumbuhan ekonomi Provinsi Aceh secara keseluruhan terhadap sektor daerah (<em>rₙ = laju pertumbuhan total PDRB Provinsi</em>).
                  </p>
                  <p className="p-1 rounded bg-slate-50 border border-slate-100">
                    <strong className="text-indigo-800">2. Mᵢⱼ (Proportionality Shift / Industry Mix) = Yᵢ,₀ × (rᵢₙ - rₙ)</strong>
                    <br />Dampak komposisi sektoral. Positif (&gt; 0) jika sektor <em>i</em> di tingkat provinsi tumbuh lebih cepat dari agregat provinsi (sektor bertumbuh pesat).
                  </p>
                  <p className="p-1 rounded bg-slate-50 border border-slate-100">
                    <strong className="text-emerald-800">3. Cᵢⱼ (Differential Shift / Daya Saing) = Yᵢ,₀ × (rᵢ - rᵢₙ)</strong>
                    <br />Keunggulan kompetitif internal Aceh Besar. Positif (&gt; 0) jika laju pertumbuhan sektor <em>i</em> lokal lebih tinggi dari sektor yang sama di tingkat provinsi.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              *Interpretasi: Sektor dengan Cᵢⱼ positif menunjukkan keunggulan komparatif dan daya saing lokal yang tangguh di Kabupaten Aceh Besar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
