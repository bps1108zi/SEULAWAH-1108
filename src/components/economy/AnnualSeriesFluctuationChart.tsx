import React, { useState, useMemo } from 'react';
import { RegionalPDRBData } from '../../types';
import {
  calculateTotalPDRB,
  calculateGrowthRate,
  calculatePerCapitaIncome,
} from '../../utils/economicCalculations';
import {
  TrendingUp,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface AnnualFluctuationPoint {
  year: number;
  totalLocalADHB: number;
  totalLocalADHK: number;
  totalProvADHB: number;
  totalProvADHK: number;
  population: number;
  perCapitaADHB: number;
  perCapitaADHK: number;
  growthRateLocal: number | null; // % y-on-y (menggunakan ADHK sesuai kaidah BPS)
  growthRateProv: number | null; // % y-on-y (menggunakan ADHK)
  growthRateADHBLocal: number | null; // % y-on-y nominal
  growthAcceleration: number | null; // delta % poin laju pertumbuhan dibanding tahun sebelumnya
}

interface Props {
  economyData: RegionalPDRBData;
  startYear: number;
  endYear: number;
  priceType: 'adhb' | 'adhk';
}

export type MetricType = 'growth' | 'pdrb' | 'perCapita';

export const AnnualSeriesFluctuationChart: React.FC<Props> = ({
  economyData,
  startYear,
  endYear,
  priceType,
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricType>('growth');
  const [chartStyle, setChartStyle] = useState<'line' | 'bar'>('line');
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState<boolean>(true);

  // Normalisasi rentang tahun
  const effectiveStart = Math.min(startYear, endYear);
  const effectiveEnd = Math.max(startYear, endYear);

  // Daftar tahun dalam rentang terpilih
  const yearsInRange = useMemo(() => {
    return economyData.years
      .filter((y) => y >= effectiveStart && y <= effectiveEnd)
      .sort((a, b) => a - b);
  }, [economyData.years, effectiveStart, effectiveEnd]);

  // Kalkulasi data point tahunan lengkap
  const annualSeries = useMemo<AnnualFluctuationPoint[]>(() => {
    return yearsInRange.map((year, index) => {
      const totalLocalADHB = calculateTotalPDRB(economyData.sectors, year, 'adhb');
      const totalLocalADHK = calculateTotalPDRB(economyData.sectors, year, 'adhk');
      const totalProvADHB = calculateTotalPDRB(economyData.provinceSectors, year, 'adhb');
      const totalProvADHK = calculateTotalPDRB(economyData.provinceSectors, year, 'adhk');
      const population = economyData.population[year] || 440000;
      const perCapitaADHB = calculatePerCapitaIncome(totalLocalADHB, population);
      const perCapitaADHK = calculatePerCapitaIncome(totalLocalADHK, population);

      // Hitung laju pertumbuhan y-on-y terhadap tahun sebelumnya (t-1)
      const prevYear = year - 1;
      let growthRateLocal: number | null = null;
      let growthRateProv: number | null = null;
      let growthRateADHBLocal: number | null = null;

      if (economyData.years.includes(prevYear)) {
        const prevLocalADHK = calculateTotalPDRB(economyData.sectors, prevYear, 'adhk');
        const prevProvADHK = calculateTotalPDRB(economyData.provinceSectors, prevYear, 'adhk');
        const prevLocalADHB = calculateTotalPDRB(economyData.sectors, prevYear, 'adhb');

        growthRateLocal = calculateGrowthRate(totalLocalADHK, prevLocalADHK);
        growthRateProv = calculateGrowthRate(totalProvADHK, prevProvADHK);
        growthRateADHBLocal = calculateGrowthRate(totalLocalADHB, prevLocalADHB);
      }

      // Akselerasi pertumbuhan (perubahan laju vs tahun t-1)
      let growthAcceleration: number | null = null;
      if (index > 0) {
        const prevPointYear = yearsInRange[index - 1];
        if (economyData.years.includes(prevPointYear - 1)) {
          const prevPointPrevADHK = calculateTotalPDRB(economyData.sectors, prevPointYear - 1, 'adhk');
          const prevPointCurADHK = calculateTotalPDRB(economyData.sectors, prevPointYear, 'adhk');
          const prevPointGrowth = calculateGrowthRate(prevPointCurADHK, prevPointPrevADHK);
          if (growthRateLocal !== null) {
            growthAcceleration = growthRateLocal - prevPointGrowth;
          }
        }
      }

      return {
        year,
        totalLocalADHB,
        totalLocalADHK,
        totalProvADHB,
        totalProvADHK,
        population,
        perCapitaADHB,
        perCapitaADHK,
        growthRateLocal,
        growthRateProv,
        growthRateADHBLocal,
        growthAcceleration,
      };
    });
  }, [economyData, yearsInRange]);

  // Statistik fluktuasi rentang
  const stats = useMemo(() => {
    const validGrowth = annualSeries.filter((p) => p.growthRateLocal !== null);
    if (validGrowth.length === 0) {
      return {
        avgGrowth: 0,
        avgGrowthProv: 0,
        peakGrowth: null,
        troughGrowth: null,
        growthSpread: 0,
        totalPdrbDelta: 0,
        totalPdrbGrowthPercent: 0,
      };
    }

    const sumGrowth = validGrowth.reduce((acc, p) => acc + (p.growthRateLocal ?? 0), 0);
    const sumGrowthProv = validGrowth.reduce((acc, p) => acc + (p.growthRateProv ?? 0), 0);
    const avgGrowth = sumGrowth / validGrowth.length;
    const avgGrowthProv = sumGrowthProv / validGrowth.length;

    let peakGrowth = validGrowth[0];
    let troughGrowth = validGrowth[0];

    validGrowth.forEach((p) => {
      if ((p.growthRateLocal ?? 0) > (peakGrowth.growthRateLocal ?? 0)) peakGrowth = p;
      if ((p.growthRateLocal ?? 0) < (troughGrowth.growthRateLocal ?? 0)) troughGrowth = p;
    });

    const growthSpread = (peakGrowth.growthRateLocal ?? 0) - (troughGrowth.growthRateLocal ?? 0);

    const firstPoint = annualSeries[0];
    const lastPoint = annualSeries[annualSeries.length - 1];
    const targetKey = priceType === 'adhb' ? 'totalLocalADHB' : 'totalLocalADHK';
    const totalPdrbDelta = lastPoint[targetKey] - firstPoint[targetKey];
    const totalPdrbGrowthPercent =
      firstPoint[targetKey] > 0 ? (totalPdrbDelta / firstPoint[targetKey]) * 100 : 0;

    return {
      avgGrowth,
      avgGrowthProv,
      peakGrowth,
      troughGrowth,
      growthSpread,
      totalPdrbDelta,
      totalPdrbGrowthPercent,
    };
  }, [annualSeries, priceType]);

  // Konfigurasi koordinat SVG untuk grafik adaptif
  const svgWidth = 800;
  const svgHeight = 280;
  const padding = { top: 35, right: 40, bottom: 45, left: 65 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Nilai Min dan Max sesuai metrik aktif
  const chartDomain = useMemo(() => {
    if (annualSeries.length === 0) return { min: 0, max: 10 };

    if (activeMetric === 'growth') {
      const values: number[] = [];
      annualSeries.forEach((p) => {
        if (p.growthRateLocal !== null) values.push(p.growthRateLocal);
        if (p.growthRateProv !== null) values.push(p.growthRateProv);
      });
      if (values.length === 0) return { min: 0, max: 10 };
      const rawMin = Math.min(...values);
      const rawMax = Math.max(...values);
      const min = Math.min(0, Math.floor(rawMin - 0.8));
      const max = Math.max(min + 2, Math.ceil(rawMax + 1.2));
      return { min, max };
    }

    if (activeMetric === 'pdrb') {
      const values: number[] = [];
      annualSeries.forEach((p) => {
        values.push(p.totalLocalADHB);
        values.push(p.totalLocalADHK);
      });
      const rawMin = Math.min(...values);
      const rawMax = Math.max(...values);
      const margin = (rawMax - rawMin) * 0.15 || 500;
      return {
        min: Math.max(0, Math.floor((rawMin - margin) / 500) * 500),
        max: Math.ceil((rawMax + margin) / 500) * 500,
      };
    }

    // perCapita
    const values: number[] = [];
    annualSeries.forEach((p) => {
      values.push(priceType === 'adhb' ? p.perCapitaADHB : p.perCapitaADHK);
    });
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const margin = (rawMax - rawMin) * 0.15 || 2_000_000;
    return {
      min: Math.max(0, Math.floor((rawMin - margin) / 1_000_000) * 1_000_000),
      max: Math.ceil((rawMax + margin) / 1_000_000) * 1_000_000,
    };
  }, [annualSeries, activeMetric, priceType]);

  // Fungsi pemetaan koordinat (Scales)
  const getX = (index: number) => {
    if (annualSeries.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (annualSeries.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const range = chartDomain.max - chartDomain.min || 1;
    const normalized = (val - chartDomain.min) / range;
    return padding.top + chartHeight - normalized * chartHeight;
  };

  // Garis nol untuk pertumbuhan
  const zeroY = activeMetric === 'growth' ? getY(0) : null;

  // Path SVG untuk kurva
  const pathData = useMemo(() => {
    if (annualSeries.length === 0) return { local: '', prov: '', adhb: '', adhk: '' };

    const getLinePath = (getValue: (p: AnnualFluctuationPoint) => number | null) => {
      const validPoints: { x: number; y: number }[] = [];
      annualSeries.forEach((p, idx) => {
        const v = getValue(p);
        if (v !== null) {
          validPoints.push({ x: getX(idx), y: getY(v) });
        }
      });
      if (validPoints.length === 0) return '';
      return validPoints.reduce(
        (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
        ''
      );
    };

    return {
      localGrowth: getLinePath((p) => p.growthRateLocal),
      provGrowth: getLinePath((p) => p.growthRateProv),
      pdrbADHB: getLinePath((p) => p.totalLocalADHB),
      pdrbADHK: getLinePath((p) => p.totalLocalADHK),
      perCapita: getLinePath((p) => (priceType === 'adhb' ? p.perCapitaADHB : p.perCapitaADHK)),
    };
  }, [annualSeries, chartDomain, priceType]);

  // Horizontal Grid Lines Ticks
  const yTicks = useMemo(() => {
    const count = 5;
    const step = (chartDomain.max - chartDomain.min) / (count - 1);
    return Array.from({ length: count }, (_, i) => chartDomain.min + i * step);
  }, [chartDomain]);

  const activePoint = annualSeries.find((p) => p.year === hoveredYear) || null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
      {/* Header Panel Fluktuasi Series Tahunan */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 border-b border-blue-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-400/30">
              <Activity className="w-3.5 h-3.5 text-orange-400" />
              <span>Dinamika Makro Multi-Tahun</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <span>Fluktuasi Series Tahunan PDRB Aceh Besar</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-orange-500 text-white text-xs font-bold font-mono">
                {effectiveStart} - {effectiveEnd}
              </span>
            </h2>
            <p className="text-xs text-blue-200/90 max-w-2xl">
              Visualisasi runtut waktu (time-series) tahunan yang melacak fluktuasi riil, akselerasi, dan titik balik perekonomian di setiap tahun dalam rentang yang dipilih.
            </p>
          </div>

          {/* Interactive Metric Switcher & Chart Style */}
          <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/15">
            <div className="flex items-center bg-blue-950/80 p-0.5 rounded-lg border border-blue-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveMetric('growth')}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                  activeMetric === 'growth'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Laju Pertumbuhan Ekonomi y-on-y (%)"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Laju Pertumbuhan (%)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMetric('pdrb')}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                  activeMetric === 'pdrb'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Nilai Total PDRB ADHB & ADHK (Miliar Rp)"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Nilai PDRB</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMetric('perCapita')}
                className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                  activeMetric === 'perCapita'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-blue-200 hover:text-white'
                }`}
                title="Pendapatan per Kapita (Rupiah/Jiwa)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Per Kapita</span>
              </button>
            </div>

            {/* Toggle Garis vs Batang (untuk metrik pertumbuhan) */}
            {activeMetric === 'growth' && (
              <div className="flex items-center bg-blue-950/80 p-0.5 rounded-lg border border-blue-700 text-xs">
                <button
                  type="button"
                  onClick={() => setChartStyle('line')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    chartStyle === 'line' ? 'bg-blue-700 text-white' : 'text-blue-300 hover:text-white'
                  }`}
                >
                  Garis
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('bar')}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    chartStyle === 'bar' ? 'bg-blue-700 text-white' : 'text-blue-300 hover:text-white'
                  }`}
                >
                  Batang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Ringkasan Fluktuasi Rentang */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Rata-rata Pertumbuhan Tahunan
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight">
              +{stats.avgGrowth.toFixed(2)}%
            </span>
            <span className="text-[10px] font-semibold text-slate-500">/ tahun</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Prov. Aceh: +{stats.avgGrowthProv.toFixed(2)}% / thn
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Puncak Pertumbuhan (Peak)
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
              +{stats.peakGrowth?.growthRateLocal !== null ? stats.peakGrowth?.growthRateLocal?.toFixed(2) : '-'}%
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {stats.peakGrowth?.year || '-'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
            Titik ekspansi tertinggi dalam rentang
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Pertumbuhan Terendah (Trough)
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
              +{stats.troughGrowth?.growthRateLocal !== null ? stats.troughGrowth?.growthRateLocal?.toFixed(2) : '-'}%
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
              {stats.troughGrowth?.year || '-'}
            </span>
          </div>
          <span className="text-[10px] text-amber-700 mt-1 block font-medium">
            Rentang volatilitas: {stats.growthSpread.toFixed(2)} %-poin
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Akumulasi Nilai ({priceType.toUpperCase()})
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              +Rp {stats.totalPdrbDelta.toLocaleString('id-ID', { maximumFractionDigits: 0 })} M
            </span>
          </div>
          <span className="text-[10px] text-blue-700 mt-1 block font-bold">
            Total kenaikan rentang: +{stats.totalPdrbGrowthPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Main Interactive Chart Canvas */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Legend Bar & Hover Tooltip Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {activeMetric === 'growth' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-blue-700 shadow-xs" />
                  <span className="font-bold text-slate-800">Aceh Besar (ADHK Riil y-on-y)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-amber-500 shadow-xs" />
                  <span className="font-semibold text-slate-600">Provinsi Aceh (Referensi)</span>
                </div>
              </>
            )}

            {activeMetric === 'pdrb' && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-blue-700 shadow-xs" />
                  <span className="font-bold text-slate-800">PDRB ADHB (Harga Berlaku - Nominal)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-600 shadow-xs" />
                  <span className="font-bold text-slate-800">PDRB ADHK (Harga Konstan 2010 - Riil)</span>
                </div>
              </>
            )}

            {activeMetric === 'perCapita' && (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-orange-600 shadow-xs" />
                <span className="font-bold text-slate-800">
                  Pendapatan per Kapita ({priceType.toUpperCase()} - Rupiah / Jiwa)
                </span>
              </div>
            )}
          </div>

          <span className="text-[11px] text-slate-500 italic hidden sm:inline">
            *Sorot titik pada grafik untuk melihat rincian angka setiap tahun
          </span>
        </div>

        {/* SVG Graphic Area */}
        <div className="relative w-full bg-slate-50/50 rounded-2xl border border-slate-200/80 p-2 sm:p-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[340px] overflow-visible select-none"
          >
            <defs>
              {/* Gradient PDRB Area */}
              <linearGradient id="localPdrbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="adhkPdrbGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="perCapitaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ea580c" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {yTicks.map((tickVal) => {
              const y = getY(tickVal);
              return (
                <g key={tickVal}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={tickVal === 0 ? '0' : '4 4'}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono font-medium"
                  >
                    {activeMetric === 'growth'
                      ? `${tickVal >= 0 ? '+' : ''}${tickVal.toFixed(1)}%`
                      : activeMetric === 'pdrb'
                      ? `${(tickVal / 1000).toFixed(1)}k M`
                      : `${(tickVal / 1_000_000).toFixed(0)} Jt`}
                  </text>
                </g>
              );
            })}

            {/* Garis Dasar 0 (Zero Baseline) untuk pertumbuhan */}
            {zeroY !== null && zeroY >= padding.top && zeroY <= padding.top + chartHeight && (
              <line
                x1={padding.left}
                y1={zeroY}
                x2={svgWidth - padding.right}
                y2={zeroY}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            )}

            {/* Vertical Year Gridlines & Column Bands */}
            {annualSeries.map((point, index) => {
              const x = getX(index);
              const isHovered = hoveredYear === point.year;
              return (
                <g key={point.year}>
                  {/* Subtle column hover highlight */}
                  <rect
                    x={x - chartWidth / (annualSeries.length * 2)}
                    y={padding.top}
                    width={chartWidth / annualSeries.length}
                    height={chartHeight}
                    fill={isHovered ? '#3b82f6' : 'transparent'}
                    fillOpacity={isHovered ? 0.08 : 0}
                    className="cursor-pointer transition-colors duration-150"
                    onMouseEnter={() => setHoveredYear(point.year)}
                    onMouseLeave={() => setHoveredYear(null)}
                  />

                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke={isHovered ? '#3b82f6' : '#f1f5f9'}
                    strokeWidth={isHovered ? 1.5 : 1}
                  />

                  {/* Year Label */}
                  <text
                    x={x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    className={`text-[11px] font-mono cursor-pointer transition-colors ${
                      isHovered
                        ? 'fill-blue-700 font-black text-xs'
                        : 'fill-slate-600 font-bold'
                    }`}
                    onMouseEnter={() => setHoveredYear(point.year)}
                  >
                    {point.year}
                  </text>
                </g>
              );
            })}

            {/* METRIC 1: LAJU PERTUMBUHAN EKONOMI */}
            {activeMetric === 'growth' && (
              <>
                {/* Bar Style Representation */}
                {chartStyle === 'bar' &&
                  annualSeries.map((point, index) => {
                    if (point.growthRateLocal === null) return null;
                    const x = getX(index);
                    const barW = Math.min(36, chartWidth / (annualSeries.length * 2.2));
                    const base = zeroY ?? getY(0);
                    const targetY = getY(point.growthRateLocal);
                    const isPositive = point.growthRateLocal >= 0;
                    const barY = isPositive ? targetY : base;
                    const barH = Math.max(2, Math.abs(base - targetY));

                    // Provinsi bar
                    const provVal = point.growthRateProv ?? 0;
                    const provY = getY(provVal);
                    const provH = Math.max(2, Math.abs(base - provY));

                    return (
                      <g key={`bar-${point.year}`}>
                        {/* Prov Bar */}
                        <rect
                          x={x - barW - 2}
                          y={provVal >= 0 ? provY : base}
                          width={barW}
                          height={provH}
                          fill="#f59e0b"
                          rx="3"
                          opacity="0.85"
                        />
                        {/* Local Bar */}
                        <rect
                          x={x + 2}
                          y={barY}
                          width={barW}
                          height={barH}
                          fill="#1d4ed8"
                          rx="3"
                          className="transition-all duration-200"
                        />
                        {/* Bar Label */}
                        <text
                          x={x + 2 + barW / 2}
                          y={barY - 5}
                          textAnchor="middle"
                          className="text-[10px] font-black fill-blue-900 font-mono"
                        >
                          +{point.growthRateLocal.toFixed(2)}%
                        </text>
                      </g>
                    );
                  })}

                {/* Line Style Representation */}
                {chartStyle === 'line' && (
                  <>
                    {/* Provinsi Aceh Reference Line */}
                    {pathData.provGrowth && (
                      <path
                        d={pathData.provGrowth}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="5 5"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Aceh Besar Primary Line */}
                    {pathData.localGrowth && (
                      <path
                        d={pathData.localGrowth}
                        fill="none"
                        stroke="#1d4ed8"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points & Badges */}
                    {annualSeries.map((point, index) => {
                      if (point.growthRateLocal === null) return null;
                      const x = getX(index);
                      const y = getY(point.growthRateLocal);
                      const isPeak = stats.peakGrowth?.year === point.year;
                      const isTrough = stats.troughGrowth?.year === point.year && !isPeak;
                      const isHovered = hoveredYear === point.year;

                      return (
                        <g key={`growth-dot-${point.year}`}>
                          {/* Pulse halo on hover or peak */}
                          {(isHovered || isPeak) && (
                            <circle
                              cx={x}
                              cy={y}
                              r={isHovered ? 12 : 9}
                              fill={isPeak ? '#10b981' : '#1d4ed8'}
                              fillOpacity="0.25"
                            />
                          )}

                          <circle
                            cx={x}
                            cy={y}
                            r={isHovered ? 6 : 5}
                            fill={isPeak ? '#059669' : isTrough ? '#d97706' : '#1d4ed8'}
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredYear(point.year)}
                          />

                          {/* Value Tag Above Dot */}
                          <g transform={`translate(${x}, ${y - 12})`}>
                            <rect
                              x="-26"
                              y="-16"
                              width="52"
                              height="17"
                              rx="4"
                              fill={isPeak ? '#065f46' : isTrough ? '#92400e' : '#1e3a8a'}
                              opacity="0.95"
                            />
                            <text
                              x="0"
                              y="-4"
                              textAnchor="middle"
                              className="text-[10px] font-black fill-white font-mono"
                            >
                              +{point.growthRateLocal.toFixed(2)}%
                            </text>
                          </g>

                          {/* Prov point */}
                          {point.growthRateProv !== null && (
                            <circle
                              cx={x}
                              cy={getY(point.growthRateProv)}
                              r="3.5"
                              fill="#f59e0b"
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          )}
                        </g>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* METRIC 2: NILAI PDRB (ADHB & ADHK) */}
            {activeMetric === 'pdrb' && (
              <>
                {/* ADHB Area & Line */}
                {pathData.pdrbADHB && (
                  <>
                    <path
                      d={`${pathData.pdrbADHB} L ${getX(annualSeries.length - 1)} ${
                        padding.top + chartHeight
                      } L ${getX(0)} ${padding.top + chartHeight} Z`}
                      fill="url(#localPdrbGradient)"
                    />
                    <path
                      d={pathData.pdrbADHB}
                      fill="none"
                      stroke="#1d4ed8"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* ADHK Area & Line */}
                {pathData.pdrbADHK && (
                  <>
                    <path
                      d={`${pathData.pdrbADHK} L ${getX(annualSeries.length - 1)} ${
                        padding.top + chartHeight
                      } L ${getX(0)} ${padding.top + chartHeight} Z`}
                      fill="url(#adhkPdrbGradient)"
                    />
                    <path
                      d={pathData.pdrbADHK}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeDasharray="6 3"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Points */}
                {annualSeries.map((point, index) => {
                  const x = getX(index);
                  const yADHB = getY(point.totalLocalADHB);
                  const yADHK = getY(point.totalLocalADHK);
                  const isHovered = hoveredYear === point.year;

                  return (
                    <g key={`pdrb-dot-${point.year}`}>
                      <circle
                        cx={x}
                        cy={yADHB}
                        r={isHovered ? 6 : 4.5}
                        fill="#1d4ed8"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredYear(point.year)}
                      />
                      <circle
                        cx={x}
                        cy={yADHK}
                        r={isHovered ? 5.5 : 4}
                        fill="#059669"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredYear(point.year)}
                      />

                      {/* Tag ADHB */}
                      <text
                        x={x}
                        y={yADHB - 10}
                        textAnchor="middle"
                        className="text-[10px] font-black fill-blue-900 font-mono"
                      >
                        Rp {(point.totalLocalADHB / 1000).toFixed(1)}k M
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {/* METRIC 3: PENDAPATAN PER KAPITA */}
            {activeMetric === 'perCapita' && (
              <>
                {pathData.perCapita && (
                  <>
                    <path
                      d={`${pathData.perCapita} L ${getX(annualSeries.length - 1)} ${
                        padding.top + chartHeight
                      } L ${getX(0)} ${padding.top + chartHeight} Z`}
                      fill="url(#perCapitaGradient)"
                    />
                    <path
                      d={pathData.perCapita}
                      fill="none"
                      stroke="#ea580c"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {annualSeries.map((point, index) => {
                  const val = priceType === 'adhb' ? point.perCapitaADHB : point.perCapitaADHK;
                  const x = getX(index);
                  const y = getY(val);
                  const isHovered = hoveredYear === point.year;

                  return (
                    <g key={`pc-dot-${point.year}`}>
                      {(isHovered || index === annualSeries.length - 1) && (
                        <circle cx={x} cy={y} r="9" fill="#ea580c" fillOpacity="0.25" />
                      )}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 5}
                        fill="#ea580c"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredYear(point.year)}
                      />
                      <text
                        x={x}
                        y={y - 10}
                        textAnchor="middle"
                        className="text-[10px] font-black fill-orange-800 font-mono"
                      >
                        Rp {(val / 1_000_000).toFixed(1)} Jt
                      </text>
                    </g>
                  );
                })}
              </>
            )}
          </svg>
        </div>

        {/* Floating Detail Card for Hovered Year */}
        {activePoint && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 text-xs shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-200/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700" />
                <span className="font-extrabold text-blue-950 text-sm">
                  Rincian Data Tahun {activePoint.year} (Kabupaten Aceh Besar)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-mono font-bold text-[10px]">
                {priceType.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div>
                <span className="text-slate-500 text-[10px] block">Laju Pertumbuhan Riil (ADHK):</span>
                <span className="font-black text-sm text-emerald-700">
                  {activePoint.growthRateLocal !== null
                    ? `+${activePoint.growthRateLocal.toFixed(2)}%`
                    : 'Tahun Awal Seri'}
                </span>
                {activePoint.growthAcceleration !== null && (
                  <span
                    className={`text-[10px] block font-semibold ${
                      activePoint.growthAcceleration >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {activePoint.growthAcceleration >= 0 ? '▲ Akselerasi +' : '▼ Deselerasi '}
                    {activePoint.growthAcceleration.toFixed(2)} %-poin
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">Total PDRB ADHB (Nominal):</span>
                <span className="font-bold text-slate-900">
                  Rp {activePoint.totalLocalADHB.toLocaleString('id-ID', { maximumFractionDigits: 1 })} M
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">Total PDRB ADHK (Riil 2010):</span>
                <span className="font-bold text-slate-900">
                  Rp {activePoint.totalLocalADHK.toLocaleString('id-ID', { maximumFractionDigits: 1 })} M
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">Pendapatan per Kapita:</span>
                <span className="font-bold text-orange-700">
                  Rp {Math.round(activePoint.perCapitaADHB).toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Penduduk: {activePoint.population.toLocaleString('id-ID')} Jiwa
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabel Series Tahunan Lengkap (Accordion) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 transition text-xs font-bold text-slate-800"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <span>Tabel Matriks Series Tahunan ({effectiveStart} - {effectiveEnd})</span>
              <span className="text-[10px] text-slate-500 font-normal">
                ({annualSeries.length} periode waktu)
              </span>
            </div>
            <div className="flex items-center gap-1 text-blue-700 text-xs">
              <span>{isTableExpanded ? 'Sembunyikan' : 'Tampilkan Tabel'}</span>
              {isTableExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isTableExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                    <th className="py-2.5 px-3">Tahun</th>
                    <th className="py-2.5 px-3 text-right">PDRB ADHB (Miliar Rp)</th>
                    <th className="py-2.5 px-3 text-right">PDRB ADHK (Miliar Rp)</th>
                    <th className="py-2.5 px-3 text-right">Laju Aceh Besar (%)</th>
                    <th className="py-2.5 px-3 text-right">Laju Prov. Aceh (%)</th>
                    <th className="py-2.5 px-3 text-right">Pendapatan per Kapita (Rp)</th>
                    <th className="py-2.5 px-3 text-center">Dinamika Fluktuasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {annualSeries.map((point) => {
                    const isPeak = stats.peakGrowth?.year === point.year;
                    const isTrough = stats.troughGrowth?.year === point.year && !isPeak;

                    return (
                      <tr
                        key={point.year}
                        className={`hover:bg-blue-50/60 transition ${
                          hoveredYear === point.year ? 'bg-blue-50 font-semibold' : ''
                        }`}
                        onMouseEnter={() => setHoveredYear(point.year)}
                        onMouseLeave={() => setHoveredYear(null)}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">
                          {point.year}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          Rp {point.totalLocalADHB.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          Rp {point.totalLocalADHK.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {point.growthRateLocal !== null ? (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] ${
                                isPeak
                                  ? 'bg-emerald-100 text-emerald-800 font-black'
                                  : isTrough
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'text-emerald-700'
                              }`}
                            >
                              +{point.growthRateLocal.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Dasar Seri</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {point.growthRateProv !== null ? `+${point.growthRateProv.toFixed(2)}%` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-orange-700">
                          Rp {Math.round(point.perCapitaADHB).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isPeak ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <ArrowUpRight className="w-3 h-3" /> Puncak Ekspansi
                            </span>
                          ) : isTrough ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              <ArrowDownRight className="w-3 h-3" /> Titik Terendah
                            </span>
                          ) : point.growthAcceleration !== null && point.growthAcceleration >= 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold">
                              <ArrowUpRight className="w-3 h-3" /> Menguat
                            </span>
                          ) : point.growthAcceleration !== null ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                              <ArrowDownRight className="w-3 h-3" /> Melambat
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Analisis Deskriptif Singkat Fluktuasi Ekstrim */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-950">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>Analisis Deskriptif Dinamika Fluktuasi Antar Tahun (Metodologi BPS):</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Perekonomian Kabupaten Aceh Besar pada rentang series{' '}
            <strong className="text-blue-900">{effectiveStart} s/d {effectiveEnd}</strong> mencatatkan rata-rata
            pertumbuhan tahunan sebesar <strong className="text-emerald-700">+{stats.avgGrowth.toFixed(2)}%</strong> per tahun.
            Fluktuasi tertinggi dicapai pada tahun{' '}
            <strong className="text-emerald-800">{stats.peakGrowth?.year || '-'}</strong> dengan laju ekspansi{' '}
            <strong className="text-emerald-800">+{stats.peakGrowth?.growthRateLocal?.toFixed(2) || '0'}%</strong>, didorong
            oleh normalisasi mobilitas barang dan jasa pasca-pandemi serta pemulihan sektor konstruksi dan perdagangan.
            Sebaliknya, titik perlambatan tercatat pada tahun{' '}
            <strong className="text-amber-800">{stats.troughGrowth?.year || '-'}</strong> sebesar{' '}
            <strong className="text-amber-800">+{stats.troughGrowth?.growthRateLocal?.toFixed(2) || '0'}%</strong> dengan
            rentang volatilitas antar tahun sebesar {stats.growthSpread.toFixed(2)} %-poin.
          </p>
          <div className="pt-2 border-t border-blue-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>
              💡 <strong>Rekomendasi Kebijakan:</strong> Menjaga stabilitas serapan APBK Aceh Besar sejak triwulan I guna mencegah perlambatan musiman dan menjaga daya beli masyarakat di sentra Lambaro & Ingin Jaya.
            </span>
            <span className="font-semibold text-blue-800">
              Katalog BPS: 1102001.1108
            </span>
          </div>
        </div>

        {/* Catatan Rumus Fluktuasi Tahunan */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <BookOpen className="w-3.5 h-3.5 text-blue-700" />
            <span>Rumus Perhitungan Fluktuasi Tahunan:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-1.5 bg-white rounded border border-slate-200">
              <span className="font-bold text-blue-900 block font-sans">Laju Pertumbuhan Tahunan (y-on-y):</span>
              gₜ = [(PDRB_ADHKₜ - PDRB_ADHKₜ₋₁) / PDRB_ADHKₜ₋₁] × 100%
            </div>
            <div className="p-1.5 bg-white rounded border border-slate-200">
              <span className="font-bold text-blue-900 block font-sans">Rata-rata Pertumbuhan Rentang (ḡ):</span>
              ḡ = (∑ gₜ) / n, dengan n = jumlah periode tahunan dalam rentang terpilih
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
