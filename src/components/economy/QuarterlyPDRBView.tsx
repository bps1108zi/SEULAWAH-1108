import React, { useState, useMemo, useEffect } from 'react';
import { QuarterlyPDRBRecord } from '../../types';
import { getStoredQuarterlyPDRB } from '../../services/storage';
import { exportQuarterlyPDRBExcel } from '../../utils/dataTransfer';
import {
  Download,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';

interface Props {
  onNavigateToSchedule?: () => void;
}

export const QuarterlyPDRBView: React.FC<Props> = () => {
  const [records, setRecords] = useState<QuarterlyPDRBRecord[]>(() => getStoredQuarterlyPDRB());
  const [selectedYearFilter, setSelectedYearFilter] = useState<'semua' | number>('semua');
  const [activeMetric, setActiveMetric] = useState<'adhb' | 'adhk' | 'growth'>('adhb');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Sync with real-time storage / Firestore updates
  useEffect(() => {
    const onQuarterlyUpdated = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) setRecords(e.detail);
    };
    window.addEventListener('bps_quarterly_pdrb_updated', onQuarterlyUpdated as EventListener);
    return () => {
      window.removeEventListener('bps_quarterly_pdrb_updated', onQuarterlyUpdated as EventListener);
    };
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    if (selectedYearFilter === 'semua') return records;
    return records.filter((r) => r.year === selectedYearFilter);
  }, [records, selectedYearFilter]);

  // Latest quarter entry
  const latestQuarter = records[records.length - 1];

  // Available years in records
  const availableYears = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.year))).sort((a, b) => b - a);
  }, [records]);

  // Extreme value calculations for descriptive analysis
  const extremeStats = useMemo(() => {
    const validQtoQ = records.filter((r) => r.qToQGrowthAB !== undefined);
    const validYonY = records.filter((r) => r.yOnYGrowthAB !== undefined);

    const maxQtoQ = [...validQtoQ].sort((a, b) => (b.qToQGrowthAB || 0) - (a.qToQGrowthAB || 0))[0];
    const minQtoQ = [...validQtoQ].sort((a, b) => (a.qToQGrowthAB || 0) - (b.qToQGrowthAB || 0))[0];

    const maxYonY = [...validYonY].sort((a, b) => (b.yOnYGrowthAB || 0) - (a.yOnYGrowthAB || 0))[0];
    const minYonY = [...validYonY].sort((a, b) => (a.yOnYGrowthAB || 0) - (b.yOnYGrowthAB || 0))[0];

    return { maxQtoQ, minQtoQ, maxYonY, minYonY };
  }, [records]);

  // Handler: Export Excel (.xlsx)
  const handleExportExcel = () => {
    exportQuarterlyPDRBExcel(filteredRecords);
  };

  // Line Chart SVG Geometry
  const svgW = 760;
  const svgH = 290;
  const padL = 62;
  const padR = 26;
  const padT = 26;
  const padB = 46;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const chartSeries = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    if (activeMetric === 'growth') {
      const qtoqVals = filteredRecords.map((r) => r.qToQGrowthAB ?? 0);
      const yonyVals = filteredRecords.map((r) => r.yOnYGrowthAB ?? 0);
      const allVals = [...qtoqVals, ...yonyVals, 0];
      const minV = Math.min(...allVals);
      const maxV = Math.max(...allVals);
      const padV = (maxV - minV) * 0.16 || 2;
      const domainMin = minV - padV;
      const domainMax = maxV + padV;

      const getX = (i: number) =>
        filteredRecords.length === 1
          ? padL + chartW / 2
          : padL + (i / (filteredRecords.length - 1)) * chartW;
      const getY = (v: number) =>
        padT + chartH - ((v - domainMin) / (domainMax - domainMin || 1)) * chartH;

      return {
        isGrowth: true,
        domainMin,
        domainMax,
        zeroY: getY(0),
        primaryLabel: 'Laju q-to-q (%)',
        secondaryLabel: 'Laju y-on-y (%)',
        primaryColor: '#ea580c',
        secondaryColor: '#1d4ed8',
        points: filteredRecords.map((r, i) => ({
          idx: i,
          label: r.periodLabel,
          x: getX(i),
          v1: r.qToQGrowthAB ?? 0,
          y1: getY(r.qToQGrowthAB ?? 0),
          v2: r.yOnYGrowthAB ?? 0,
          y2: getY(r.yOnYGrowthAB ?? 0),
          record: r,
        })),
      };
    }

    const vals = filteredRecords.map((r) =>
      activeMetric === 'adhb' ? r.adhbAcehBesar : r.adhkAcehBesar
    );
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const padV = (maxV - minV) * 0.18 || 200;
    const domainMin = Math.max(0, minV - padV);
    const domainMax = maxV + padV;

    const getX = (i: number) =>
      filteredRecords.length === 1
        ? padL + chartW / 2
        : padL + (i / (filteredRecords.length - 1)) * chartW;
    const getY = (v: number) =>
      padT + chartH - ((v - domainMin) / (domainMax - domainMin || 1)) * chartH;

    return {
      isGrowth: false,
      domainMin,
      domainMax,
      zeroY: null as number | null,
      primaryLabel:
        activeMetric === 'adhb'
          ? 'PDRB ADHB Aceh Besar (Miliar Rp)'
          : 'PDRB ADHK 2010 Aceh Besar (Miliar Rp)',
      secondaryLabel: '',
      primaryColor: activeMetric === 'adhb' ? '#1d4ed8' : '#7c3aed',
      secondaryColor: '',
      points: filteredRecords.map((r, i) => {
        const val = activeMetric === 'adhb' ? r.adhbAcehBesar : r.adhkAcehBesar;
        return {
          idx: i,
          label: r.periodLabel,
          x: getX(i),
          v1: val,
          y1: getY(val),
          v2: 0,
          y2: 0,
          record: r,
        };
      }),
    };
  }, [filteredRecords, activeMetric, chartW, chartH]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-xl bg-purple-100 text-purple-800 font-extrabold text-xs shrink-0">
            TW
          </span>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">
              Analisis PDRB Triwulanan (TW I s.d. TW IV)
            </h2>
            <p className="text-xs text-slate-500">
              Pemantauan dinamika ekonomi kuartalan, pola musiman panen raya, serta pertumbuhan q-to-q dan y-on-y
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Tahun:</span>
            <select
              value={selectedYearFilter}
              onChange={(e) =>
                setSelectedYearFilter(e.target.value === 'semua' ? 'semua' : Number(e.target.value))
              }
              className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="semua">Semua Periode ({records.length} Triwulan)</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Latest Quarter Metrics */}
      {latestQuarter && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: PDRB ADHB */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 truncate">
                  PDRB Nominal (ADHB)
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px] shrink-0">
                  {latestQuarter.periodLabel}
                </span>
              </div>
              <div className="mt-2">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  Rp {latestQuarter.adhbAcehBesar.toLocaleString('id-ID', { minimumFractionDigits: 1 })}
                </h3>
                <span className="text-xs text-slate-500 font-medium">Miliar Rupiah</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 truncate">
              PDRB ADHK: <span className="font-bold text-slate-700">Rp {latestQuarter.adhkAcehBesar.toFixed(1)} Miliar</span>
            </p>
          </div>

          {/* Card 2: Pertumbuhan q-to-q */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 truncate">
                  Pertumbuhan q-to-q
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">thd Triwulan Lalu</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <h3
                  className={`text-2xl font-black tracking-tight ${
                    (latestQuarter.qToQGrowthAB || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {(latestQuarter.qToQGrowthAB || 0) >= 0 ? '+' : ''}
                  {latestQuarter.qToQGrowthAB?.toFixed(2)}%
                </h3>
                {(latestQuarter.qToQGrowthAB || 0) >= 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-rose-600 shrink-0" />
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 truncate">
              Dinamika kuartal terhadap kuartal sebelumnya
            </p>
          </div>

          {/* Card 3: Pertumbuhan y-on-y */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 truncate">
                  Pertumbuhan y-on-y
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">Year-on-Year</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-blue-800 tracking-tight">
                  +{(latestQuarter.yOnYGrowthAB || 0).toFixed(2)}%
                </h3>
                <ArrowUpRight className="w-5 h-5 text-blue-600 shrink-0" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 truncate">
              Terhadap triwulan sama tahun sebelumnya
            </p>
          </div>

          {/* Card 4: Sektor Penggerak (Strictly aligned to category nomenclature) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 truncate">
                  Sektor Penggerak Utama
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] shrink-0">
                  Dominan
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 line-clamp-2" title={latestQuarter.dominantSector}>
                  {latestQuarter.dominantSector}
                </h4>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 truncate">
              Sesuai nomenklatur resmi Lapangan Usaha BPS
            </p>
          </div>
        </div>
      )}

      {/* GRAFIK GARIS DINAMIKA TRIWULANAN (ADHB, ADHK, & LAJU PERTUMBUHAN) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-700 shrink-0" />
              <span>Grafik Garis Dinamika &amp; Fluktuasi PDRB Triwulanan (TW I s.d. TW IV)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisasi tren grafik garis antar-triwulan untuk memantau siklus ekonomi daerah secara presisi
            </p>
          </div>

          {/* Metric Selector */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-semibold gap-1 shrink-0">
            <button
              onClick={() => setActiveMetric('adhb')}
              className={`px-3 py-1 rounded-lg transition ${
                activeMetric === 'adhb' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              PDRB ADHB
            </button>
            <button
              onClick={() => setActiveMetric('adhk')}
              className={`px-3 py-1 rounded-lg transition ${
                activeMetric === 'adhk' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              PDRB ADHK (2010)
            </button>
            <button
              onClick={() => setActiveMetric('growth')}
              className={`px-3 py-1 rounded-lg transition ${
                activeMetric === 'growth' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Laju Pertumbuhan (q-to-q &amp; y-on-y)
            </button>
          </div>
        </div>

        {/* SVG LINE CHART ONLY FOR ALL THREE MODES */}
        {chartSeries && (
          <div className="space-y-3">
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-0.5 inline-block rounded-full"
                  style={{ backgroundColor: chartSeries.primaryColor, height: '3px' }}
                />
                <span className="font-semibold text-slate-700">{chartSeries.primaryLabel}</span>
              </div>
              {chartSeries.isGrowth && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-0.5 inline-block rounded-full"
                    style={{ backgroundColor: chartSeries.secondaryColor, height: '3px' }}
                  />
                  <span className="font-semibold text-slate-700">{chartSeries.secondaryLabel}</span>
                </div>
              )}
            </div>

            <div className="relative w-full overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/40 p-2">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full min-w-[540px] h-auto select-none"
              >
                {/* Horizontal gridlines & Y ticks */}
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                  const val = chartSeries.domainMin + t * (chartSeries.domainMax - chartSeries.domainMin);
                  const yPos = padT + chartH - t * chartH;
                  return (
                    <g key={t}>
                      <line
                        x1={padL}
                        y1={yPos}
                        x2={padL + chartW}
                        y2={yPos}
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padL - 8}
                        y={yPos + 3}
                        textAnchor="end"
                        fontSize="10"
                        fill="#64748b"
                        fontFamily="monospace"
                      >
                        {chartSeries.isGrowth
                          ? `${val.toFixed(1)}%`
                          : Math.round(val).toLocaleString('id-ID')}
                      </text>
                    </g>
                  );
                })}

                {/* Zero baseline for Growth chart */}
                {chartSeries.isGrowth &&
                  chartSeries.zeroY !== null &&
                  chartSeries.zeroY >= padT &&
                  chartSeries.zeroY <= padT + chartH && (
                    <line
                      x1={padL}
                      y1={chartSeries.zeroY}
                      x2={padL + chartW}
                      y2={chartSeries.zeroY}
                      stroke="#94a3b8"
                      strokeWidth="1.2"
                      strokeDasharray="4 2"
                    />
                  )}

                {/* Area gradient fill under primary line for non-growth */}
                {!chartSeries.isGrowth && chartSeries.points.length > 1 && (
                  <path
                    d={`${chartSeries.points
                      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y1}`)
                      .join(' ')} L ${chartSeries.points[chartSeries.points.length - 1].x} ${
                      padT + chartH
                    } L ${chartSeries.points[0].x} ${padT + chartH} Z`}
                    fill={chartSeries.primaryColor}
                    opacity="0.08"
                  />
                )}

                {/* Primary Polyline */}
                {chartSeries.points.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={chartSeries.primaryColor}
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={chartSeries.points.map((p) => `${p.x},${p.y1}`).join(' ')}
                  />
                )}

                {/* Secondary Polyline (y-on-y in Growth tab) */}
                {chartSeries.isGrowth && chartSeries.points.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={chartSeries.secondaryColor}
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={chartSeries.points.map((p) => `${p.x},${p.y2}`).join(' ')}
                  />
                )}

                {/* X-Axis Labels & Interactive Points */}
                {chartSeries.points.map((p) => {
                  const isHover = hoveredIdx === p.idx;
                  return (
                    <g
                      key={p.label}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(p.idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {isHover && (
                        <line
                          x1={p.x}
                          y1={padT}
                          x2={p.x}
                          y2={padT + chartH}
                          stroke="#cbd5e1"
                          strokeWidth="1"
                        />
                      )}

                      {/* Primary Point */}
                      <circle
                        cx={p.x}
                        cy={p.y1}
                        r={isHover ? 6 : 4.5}
                        fill={chartSeries.primaryColor}
                        stroke="#ffffff"
                        strokeWidth="1.8"
                      />

                      {/* Value label above primary point */}
                      <text
                        x={p.x}
                        y={p.y1 - 9}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill={chartSeries.primaryColor}
                      >
                        {chartSeries.isGrowth
                          ? `${p.v1 >= 0 ? '+' : ''}${p.v1.toFixed(1)}%`
                          : p.v1.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </text>

                      {/* Secondary Point (y-on-y) */}
                      {chartSeries.isGrowth && (
                        <>
                          <circle
                            cx={p.x}
                            cy={p.y2}
                            r={isHover ? 6 : 4.5}
                            fill={chartSeries.secondaryColor}
                            stroke="#ffffff"
                            strokeWidth="1.8"
                          />
                          <text
                            x={p.x}
                            y={p.y2 - 9}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="bold"
                            fill={chartSeries.secondaryColor}
                          >
                            +{p.v2.toFixed(1)}%
                          </text>
                        </>
                      )}

                      {/* X-axis tick label */}
                      <text
                        x={p.x}
                        y={padT + chartH + 20}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill={isHover ? '#1e3a8a' : '#475569'}
                      >
                        {p.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Detail Box on Hover */}
              {hoveredIdx !== null && chartSeries.points[hoveredIdx] && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-orange-500 font-bold">
                      {chartSeries.points[hoveredIdx].label}
                    </span>
                    <span className="text-slate-300">
                      Sektor Penggerak:{' '}
                      <strong className="text-white">
                        {chartSeries.points[hoveredIdx].record.dominantSector}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span>
                      ADHB: <strong>Rp {chartSeries.points[hoveredIdx].record.adhbAcehBesar.toLocaleString('id-ID')} M</strong>
                    </span>
                    <span>
                      ADHK: <strong>Rp {chartSeries.points[hoveredIdx].record.adhkAcehBesar.toLocaleString('id-ID')} M</strong>
                    </span>
                    <span>
                      q-to-q:{' '}
                      <strong>
                        {(chartSeries.points[hoveredIdx].record.qToQGrowthAB ?? 0) >= 0 ? '+' : ''}
                        {(chartSeries.points[hoveredIdx].record.qToQGrowthAB ?? 0).toFixed(2)}%
                      </strong>
                    </span>
                    <span>
                      y-on-y: <strong>+{(chartSeries.points[hoveredIdx].record.yOnYGrowthAB ?? 0).toFixed(2)}%</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Descriptive Analysis & Extreme Values */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
          <h3 className="text-sm font-bold text-slate-800">
            Analisis Deskriptif Singkat Nilai Ekstrim &amp; Insight Triwulanan
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-1.5">
            <h4 className="font-bold text-blue-900">1. Pola Nilai Ekstrim Triwulanan:</h4>
            <ul className="space-y-1 text-slate-600 leading-relaxed text-[11px]">
              <li>
                • <strong>Pertumbuhan q-to-q Tertinggi:</strong> Tercatat pada{' '}
                <strong>{extremeStats.maxQtoQ?.periodLabel} (+{extremeStats.maxQtoQ?.qToQGrowthAB?.toFixed(2)}%)</strong>{' '}
                yang dipicu oleh puncak masa panen raya padi sawah irigasi dan mobilitas angkutan udara Bandara SIM.
              </li>
              <li>
                • <strong>Koreksi q-to-q Terendah:</strong> Terjadi pada{' '}
                <strong>{extremeStats.minQtoQ?.periodLabel} ({extremeStats.minQtoQ?.qToQGrowthAB?.toFixed(2)}%)</strong>{' '}
                selaras dengan fase tanam vegetatif sebelum panen raya.
              </li>
              <li>
                • <strong>Pertumbuhan y-on-y Tertinggi:</strong> Dicapai pada{' '}
                <strong>{extremeStats.maxYonY?.periodLabel} (+{extremeStats.maxYonY?.yOnYGrowthAB?.toFixed(2)}%)</strong>,{' '}
                mencerminkan akselerasi ekonomi riil yang terjaga solid.
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
            <h4 className="font-bold text-emerald-900">2. Insight Strategis &amp; Rekomendasi:</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ketergantungan siklus panen triwulanan pada sektor{' '}
              <strong>{latestQuarter?.dominantSector || 'Pertanian, Kehutanan, dan Perikanan'}</strong> dapat dimitigasi melalui hilirisasi agroindustri pascapanen serta optimalisasi aktivitas logistik Bandara SIM pada triwulan ganjil.
            </p>
            <div className="pt-2 text-[10px] text-slate-500 font-mono">
              Sumber: Nerwilis BPS Kabupaten Aceh Besar &amp; BPS Provinsi Aceh
            </div>
          </div>
        </div>
      </div>

      {/* Rumus Penghitungan Indikator Triwulanan Resmi BPS */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
          <span>Rumus Penghitungan Resmi PDRB Triwulanan (BPS):</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
          <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
            <span className="font-bold text-purple-900 text-[11px] block">
              1. Pertumbuhan q-to-q (Quarter-to-Quarter):
            </span>
            <div className="font-mono bg-purple-50 p-1.5 rounded text-[11px] text-purple-950 font-bold text-center">
              q-to-q = [(PDRB_t,q - PDRB_t,q-1) / PDRB_t,q-1] × 100%
            </div>
            <p className="text-[10px] text-slate-500">
              Mengukur perubahan volume produksi riil terhadap triwulan sebelumnya.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
            <span className="font-bold text-blue-900 text-[11px] block">
              2. Pertumbuhan y-on-y (Year-on-Year):
            </span>
            <div className="font-mono bg-blue-50 p-1.5 rounded text-[11px] text-blue-950 font-bold text-center">
              y-on-y = [(PDRB_t,q - PDRB_t-1,q) / PDRB_t-1,q] × 100%
            </div>
            <p className="text-[10px] text-slate-500">
              Mengukur pertumbuhan terhadap triwulan yang sama pada tahun sebelumnya.
            </p>
          </div>
        </div>
      </div>

      {/* Tabel Rinci PDRB Triwulanan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
            Tabel Data PDRB Triwulanan Kabupaten Aceh Besar
          </h3>
          <span className="text-[11px] text-slate-500 font-mono shrink-0">
            {filteredRecords.length} Data Triwulan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Periode</th>
                <th className="p-3 text-right">PDRB ADHB (Miliar Rp)</th>
                <th className="p-3 text-right">PDRB ADHK (Miliar Rp)</th>
                <th className="p-3 text-right">q-to-q Aceh Besar</th>
                <th className="p-3 text-right">y-on-y Aceh Besar</th>
                <th className="p-3">Sektor Penggerak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r, idx) => (
                <tr key={r.periodLabel} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{r.periodLabel}</td>
                  <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">
                    Rp {r.adhbAcehBesar.toLocaleString('id-ID', { minimumFractionDigits: 1 })}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">
                    Rp {r.adhkAcehBesar.toLocaleString('id-ID', { minimumFractionDigits: 1 })}
                  </td>
                  <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                    <span
                      className={
                        (r.qToQGrowthAB || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }
                    >
                      {(r.qToQGrowthAB || 0) >= 0 ? '+' : ''}
                      {r.qToQGrowthAB !== undefined ? r.qToQGrowthAB.toFixed(2) : '-'}%
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-blue-800 whitespace-nowrap">
                    +{r.yOnYGrowthAB !== undefined ? r.yOnYGrowthAB.toFixed(2) : '-'}%
                  </td>
                  <td className="p-3 text-slate-700">{r.dominantSector || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
