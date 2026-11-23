import React, { useState, useMemo } from 'react';
import { KlassenResult, ShiftShareResult, DLQResult, SectorPDRB } from '../../types';

export type XIndicatorType = 'share_regency' | 'share_ratio' | 'pdrb_nominal' | 'shift_compet';
export type YIndicatorType = 'growth_regency' | 'growth_ratio' | 'dlq_index' | 'net_shift';

interface Props {
  data: KlassenResult[];
  shiftShareData?: ShiftShareResult[];
  dlqData?: DLQResult[];
  sectorsPDRB?: SectorPDRB[];
  provinceSectorsPDRB?: SectorPDRB[];
  provTotalGrowth?: number;
  year?: number;
  priceType?: 'adhb' | 'adhk';
  selectedXIndicator?: XIndicatorType;
  selectedYIndicator?: YIndicatorType;
  onChangeXIndicator?: (x: XIndicatorType) => void;
  onChangeYIndicator?: (y: YIndicatorType) => void;
}

export function getKlassenQuadrantMeta(
  valX: number,
  valY: number,
  thresholdX: number,
  thresholdY: number
): { quadrant: 1 | 2 | 3 | 4; category: KlassenResult['category'] } {
  if (valX >= thresholdX && valY >= thresholdY) {
    return { quadrant: 1, category: 'Maju & Tumbuh Cepat' };
  }
  if (valX >= thresholdX && valY < thresholdY) {
    return { quadrant: 2, category: 'Maju Tapi Tertekan' };
  }
  if (valX < thresholdX && valY >= thresholdY) {
    return { quadrant: 3, category: 'Berkembang Cepat' };
  }
  return { quadrant: 4, category: 'Relatif Tertinggal' };
}

export function computeKlassenAxisThresholds(
  data: KlassenResult[],
  provinceSectorsPDRB: SectorPDRB[] = [],
  provTotalGrowth: number | undefined,
  year: number,
  priceType: 'adhb' | 'adhk',
  selectedX: XIndicatorType,
  selectedY: YIndicatorType
): { thresholdX: number; thresholdY: number } {
  const sectorCount = data.length || 17;
  const provShareBench = Number((100 / sectorCount).toFixed(2));
  const provGrowthBench =
    provTotalGrowth !== undefined
      ? Number(provTotalGrowth.toFixed(2))
      : data[0]?.growthRef ?? 5.71;

  const provAvgNominal =
    provinceSectorsPDRB.length > 0
      ? Number(
          (
            provinceSectorsPDRB.reduce((s, p) => s + (p[priceType][year] || 0), 0) /
            provinceSectorsPDRB.length /
            10
          ).toFixed(1)
        )
      : 1500;

  let thresholdX = provShareBench;
  if (selectedX === 'share_ratio') thresholdX = 1.0;
  else if (selectedX === 'pdrb_nominal') thresholdX = provAvgNominal;
  else if (selectedX === 'shift_compet') thresholdX = 0;

  let thresholdY = provGrowthBench;
  if (selectedY === 'growth_ratio') thresholdY = 1.0;
  else if (selectedY === 'dlq_index') thresholdY = 1.0;
  else if (selectedY === 'net_shift') thresholdY = 0;

  return { thresholdX, thresholdY };
}

export const KlassenCartesianChart: React.FC<Props> = ({
  data,
  shiftShareData = [],
  dlqData = [],
  sectorsPDRB = [],
  provinceSectorsPDRB = [],
  provTotalGrowth,
  year = 2024,
  priceType = 'adhk',
  selectedXIndicator: controlledX,
  selectedYIndicator: controlledY,
  onChangeXIndicator,
  onChangeYIndicator,
}) => {
  const [internalX, setInternalX] = useState<XIndicatorType>('share_regency');
  const [internalY, setInternalY] = useState<YIndicatorType>('growth_regency');
  const [hoveredSector, setHoveredSector] = useState<any | null>(null);

  const selectedXIndicator = controlledX ?? internalX;
  const selectedYIndicator = controlledY ?? internalY;

  const setXIndicator = (val: XIndicatorType) => {
    setInternalX(val);
    onChangeXIndicator?.(val);
  };

  const setYIndicator = (val: YIndicatorType) => {
    setInternalY(val);
    onChangeYIndicator?.(val);
  };

  const { thresholdX, thresholdY } = useMemo(
    () =>
      computeKlassenAxisThresholds(
        data,
        provinceSectorsPDRB,
        provTotalGrowth,
        year,
        priceType,
        selectedXIndicator,
        selectedYIndicator
      ),
    [data, provinceSectorsPDRB, provTotalGrowth, year, priceType, selectedXIndicator, selectedYIndicator]
  );

  const xIndicatorLabels: Record<XIndicatorType, { name: string; unit: string }> = {
    share_regency: { name: 'Pangsa Sektor Aceh Besar terhadap PDRB (si)', unit: '%' },
    share_ratio: { name: 'Rasio Pangsa Aceh Besar / Provinsi (si / sn)', unit: 'Rasio' },
    pdrb_nominal: { name: 'Nilai PDRB Sektor Aceh Besar', unit: 'Miliar Rp' },
    shift_compet: { name: 'Keunggulan Kompetitif Lokal (Cij)', unit: 'Miliar Rp' },
  };

  const yIndicatorLabels: Record<YIndicatorType, { name: string; unit: string }> = {
    growth_regency: { name: 'Laju Pertumbuhan Riil Aceh Besar (gi)', unit: '%' },
    growth_ratio: { name: 'Rasio Pertumbuhan Aceh Besar / Provinsi (gi / gn)', unit: 'Rasio' },
    dlq_index: { name: 'Indeks Dynamic Location Quotient (DLQ)', unit: 'Indeks' },
    net_shift: { name: 'Net Shift Pertumbuhan PDRB (Dij)', unit: 'Miliar Rp' },
  };

  // Compute dynamic points & consistent dynamic quadrant per axis selection
  const points = useMemo(() => {
    return data.map((d) => {
      const ss = shiftShareData.find((s) => s.code === d.code);
      const dlq = dlqData.find((s) => s.code === d.code);
      const pdrbSec = sectorsPDRB.find((s) => s.code === d.code);
      const provSec = provinceSectorsPDRB.find((s) => s.code === d.code);
      const nominal = pdrbSec ? pdrbSec[priceType][year] || 0 : 0;

      // Actual provincial share for share_ratio calculation
      const totalProv = provinceSectorsPDRB.reduce((sum, p) => sum + (p[priceType][year] || 0), 0);
      const provActualShare = totalProv > 0 && provSec ? ((provSec[priceType][year] || 0) / totalProv) * 100 : d.shareRef;

      let valX = d.shareSector;
      if (selectedXIndicator === 'share_ratio') {
        valX = provActualShare > 0 ? d.shareSector / provActualShare : 1;
      } else if (selectedXIndicator === 'pdrb_nominal') {
        valX = nominal;
      } else if (selectedXIndicator === 'shift_compet') {
        valX = ss ? ss.competitiveAdvantage : 0;
      }

      let valY = d.growthSector;
      if (selectedYIndicator === 'growth_ratio') {
        valY = thresholdY !== 0 ? d.growthSector / thresholdY : 1;
      } else if (selectedYIndicator === 'dlq_index') {
        valY = dlq ? dlq.dlq : 1;
      } else if (selectedYIndicator === 'net_shift') {
        valY = ss ? ss.netShift : 0;
      }

      const dynamicQuad = getKlassenQuadrantMeta(valX, valY, thresholdX, thresholdY);

      return {
        ...d,
        valX,
        valY,
        nominal,
        quadrant: dynamicQuad.quadrant,
        category: dynamicQuad.category,
      };
    });
  }, [
    data,
    selectedXIndicator,
    selectedYIndicator,
    shiftShareData,
    dlqData,
    sectorsPDRB,
    provinceSectorsPDRB,
    year,
    priceType,
    thresholdX,
    thresholdY,
  ]);

  // Determine min and max for X and Y
  const xValues = points.map((p) => p.valX);
  const yValues = points.map((p) => p.valY);

  const minXRaw = Math.min(...xValues, thresholdX);
  const maxXRaw = Math.max(...xValues, thresholdX);
  const minYRaw = Math.min(...yValues, thresholdY);
  const maxYRaw = Math.max(...yValues, thresholdY);

  const paddingX = (maxXRaw - minXRaw) * 0.14 || 1;
  const paddingY = (maxYRaw - minYRaw) * 0.16 || 1;

  const minX = minXRaw - paddingX;
  const maxX = maxXRaw + paddingX;
  const minY = minYRaw - paddingY;
  const maxY = maxYRaw + paddingY;

  // SVG dimensions
  const width = 620;
  const height = 360;
  const padLeft = 68;
  const padRight = 32;
  const padTop = 28;
  const padBottom = 52;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getSvgX = (x: number) => padLeft + ((x - minX) / (maxX - minX || 1)) * chartW;
  const getSvgY = (y: number) => padTop + chartH - ((y - minY) / (maxY - minY || 1)) * chartH;

  const lineX = getSvgX(thresholdX);
  const lineY = getSvgY(thresholdY);

  const getQuadrantColor = (quadrant: 1 | 2 | 3 | 4) => {
    switch (quadrant) {
      case 1:
        return '#10b981'; // Emerald (Q-I)
      case 2:
        return '#3b82f6'; // Blue (Q-II)
      case 3:
        return '#f59e0b'; // Amber (Q-III)
      case 4:
        return '#64748b'; // Slate (Q-IV)
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 relative overflow-hidden space-y-4">
      {/* Top Header & Indicator Selectors for Absis & Ordinat */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <h4 className="font-extrabold text-sm text-slate-900">
            Grafik Posisi Potensi Sektoral (Plot Kartesius Tipologi Klassen)
          </h4>
          <p className="text-[11px] text-slate-500">
            Garis potong (crosshair) merujuk pada nilai acuan <strong>Provinsi Aceh</strong> ({thresholdX} {xIndicatorLabels[selectedXIndicator].unit} × {thresholdY} {yIndicatorLabels[selectedYIndicator].unit}); titik memplot kategori Kabupaten Aceh Besar.
          </p>
        </div>

        {/* Dual Axis Selectors */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-600 uppercase">Absis (X):</span>
            <select
              value={selectedXIndicator}
              onChange={(e) => setXIndicator(e.target.value as XIndicatorType)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="share_regency">Pangsa Sektor Daerah (%)</option>
              <option value="share_ratio">Rasio Pangsa (si/sn)</option>
              <option value="pdrb_nominal">Nilai PDRB (Miliar Rp)</option>
              <option value="shift_compet">Daya Saing Lokal (Cij)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-600 uppercase">Ordinat (Y):</span>
            <select
              value={selectedYIndicator}
              onChange={(e) => setYIndicator(e.target.value as YIndicatorType)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="growth_regency">Laju Pertumbuhan Daerah (%)</option>
              <option value="growth_ratio">Rasio Pertumbuhan (gi/gn)</option>
              <option value="dlq_index">Indeks Dinamis (DLQ)</option>
              <option value="net_shift">Net Shift (Dij Miliar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto flex justify-center py-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl h-auto select-none">
          {/* Quadrant Background Shading */}
          {/* Top-Left = Kuadran III (Berkembang Cepat: si < sn, gi >= gn) */}
          <rect
            x={padLeft}
            y={padTop}
            width={Math.max(lineX - padLeft, 0)}
            height={Math.max(lineY - padTop, 0)}
            fill="#fef3c7"
            opacity="0.35"
          />
          {/* Top-Right = Kuadran I (Maju & Tumbuh Cepat: si >= sn, gi >= gn) */}
          <rect
            x={lineX}
            y={padTop}
            width={Math.max(padLeft + chartW - lineX, 0)}
            height={Math.max(lineY - padTop, 0)}
            fill="#d1fae5"
            opacity="0.35"
          />
          {/* Bottom-Left = Kuadran IV (Relatif Tertinggal: si < sn, gi < gn) */}
          <rect
            x={padLeft}
            y={lineY}
            width={Math.max(lineX - padLeft, 0)}
            height={Math.max(padTop + chartH - lineY, 0)}
            fill="#f1f5f9"
            opacity="0.5"
          />
          {/* Bottom-Right = Kuadran II (Maju Tapi Tertekan: si >= sn, gi < gn) */}
          <rect
            x={lineX}
            y={lineY}
            width={Math.max(padLeft + chartW - lineX, 0)}
            height={Math.max(padTop + chartH - lineY, 0)}
            fill="#dbeafe"
            opacity="0.35"
          />

          {/* Subtle Quadrant Labels Inside Corners */}
          <text x={padLeft + 8} y={padTop + 14} fontSize="9" fontWeight="bold" fill="#b45309">
            Kuadran III: Berkembang Cepat
          </text>
          <text
            x={padLeft + chartW - 8}
            y={padTop + 14}
            textAnchor="end"
            fontSize="9"
            fontWeight="bold"
            fill="#047857"
          >
            Kuadran I: Maju &amp; Tumbuh Cepat
          </text>
          <text x={padLeft + 8} y={padTop + chartH - 8} fontSize="9" fontWeight="bold" fill="#475569">
            Kuadran IV: Relatif Tertinggal
          </text>
          <text
            x={padLeft + chartW - 8}
            y={padTop + chartH - 8}
            textAnchor="end"
            fontSize="9"
            fontWeight="bold"
            fill="#1d4ed8"
          >
            Kuadran II: Maju Tapi Tertekan
          </text>

          {/* Reference Dividing Threshold Lines (Provinsi Aceh Benchmark) */}
          <line
            x1={lineX}
            y1={padTop}
            x2={lineX}
            y2={padTop + chartH}
            stroke="#475569"
            strokeWidth="1.4"
            strokeDasharray="5 3"
          />
          <line
            x1={padLeft}
            y1={lineY}
            x2={padLeft + chartW}
            y2={lineY}
            stroke="#475569"
            strokeWidth="1.4"
            strokeDasharray="5 3"
          />

          {/* Outer Border */}
          <rect
            x={padLeft}
            y={padTop}
            width={chartW}
            height={chartH}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {/* Clean Axis Title on Absis (Sumbu X) */}
          <text
            x={padLeft + chartW / 2}
            y={height - 10}
            textAnchor="middle"
            fill="#1e293b"
            fontSize="10.5"
            fontWeight="bold"
          >
            {xIndicatorLabels[selectedXIndicator].name} ({xIndicatorLabels[selectedXIndicator].unit})
          </text>

          {/* Clean Axis Title on Ordinat (Sumbu Y) */}
          <text
            x={-(padTop + chartH / 2)}
            y={16}
            transform="rotate(-90)"
            textAnchor="middle"
            fill="#1e293b"
            fontSize="10.5"
            fontWeight="bold"
          >
            {yIndicatorLabels[selectedYIndicator].name} ({yIndicatorLabels[selectedYIndicator].unit})
          </text>

          {/* Threshold value text on axis */}
          <text
            x={lineX}
            y={padTop + chartH + 16}
            textAnchor="middle"
            fill="#334155"
            fontSize="9"
            fontWeight="bold"
          >
            Prov ({thresholdX})
          </text>
          <text
            x={padLeft - 6}
            y={lineY + 3}
            textAnchor="end"
            fill="#334155"
            fontSize="9"
            fontWeight="bold"
          >
            {thresholdY}
          </text>

          {/* Plot Sector Points */}
          {points.map((p) => {
            const cx = getSvgX(p.valX);
            const cy = getSvgY(p.valY);
            const isHovered = hoveredSector?.code === p.code;
            const color = getQuadrantColor(p.quadrant);

            return (
              <g
                key={p.code}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredSector(p)}
                onMouseLeave={() => setHoveredSector(null)}
              >
                {isHovered && (
                  <circle cx={cx} cy={cy} r={14} fill={color} opacity="0.28" />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 8.5 : 6.5}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                <text
                  x={cx}
                  y={cy - 9}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="9"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {p.code}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Detail */}
        {hoveredSector && (
          <div className="absolute top-3 right-3 bg-slate-900/95 text-white p-3 rounded-xl shadow-xl backdrop-blur-xs text-xs pointer-events-none z-20 border border-slate-700 animate-in fade-in max-w-xs">
            <div className="flex items-center gap-1.5 font-bold text-orange-400 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: getQuadrantColor(hoveredSector.quadrant) }}
              />
              <span>
                [{hoveredSector.code}] {hoveredSector.name}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-200">
              <p>
                {xIndicatorLabels[selectedXIndicator].name}:{' '}
                <strong className="text-white">
                  {typeof hoveredSector.valX === 'number'
                    ? hoveredSector.valX.toLocaleString('id-ID', { maximumFractionDigits: 2 })
                    : hoveredSector.valX}{' '}
                  {xIndicatorLabels[selectedXIndicator].unit}
                </strong>
              </p>
              <p>
                {yIndicatorLabels[selectedYIndicator].name}:{' '}
                <strong className="text-white">
                  {typeof hoveredSector.valY === 'number'
                    ? hoveredSector.valY.toLocaleString('id-ID', { maximumFractionDigits: 2 })
                    : hoveredSector.valY}{' '}
                  {yIndicatorLabels[selectedYIndicator].unit}
                </strong>
              </p>
              <p className="border-t border-slate-700 pt-1 text-[10px] text-slate-400">
                Kategori Kuadran:{' '}
                <strong className="text-emerald-400">
                  {hoveredSector.category} (Kuadran {hoveredSector.quadrant})
                </strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
