import React, { useState } from 'react';
import { DistrictData } from '../../types';
import {
  MapPin,
  TrendingUp,
  Users,
  Compass,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  X,
} from 'lucide-react';

interface Props {
  districts: DistrictData[];
  selectedDistrict: DistrictData | null;
  onSelectDistrict: (district: DistrictData | null) => void;
}

export const AcehBesarMap: React.FC<Props> = ({
  districts,
  selectedDistrict,
  onSelectDistrict,
}) => {
  const [colorMode, setColorMode] = useState<'growth' | 'pdrb' | 'population'>('growth');
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictData | null>(null);

  // Helper for choropleth styling
  const getFillColor = (d: DistrictData) => {
    if (colorMode === 'growth') {
      if (d.growthRate >= 6.0) return '#1d4ed8'; // blue-700 (High growth)
      if (d.growthRate >= 5.2) return '#3b82f6'; // blue-500
      if (d.growthRate >= 4.8) return '#60a5fa'; // blue-400
      return '#93c5fd'; // blue-300
    }
    if (colorMode === 'pdrb') {
      if (d.pdrbEstimateMiliar >= 2500) return '#ea580c'; // orange-600
      if (d.pdrbEstimateMiliar >= 1500) return '#f97316'; // orange-500
      if (d.pdrbEstimateMiliar >= 900) return '#fb923c'; // orange-400
      return '#fed7aa'; // orange-200
    }
    // population
    if (d.population >= 30000) return '#047857'; // emerald-700
    if (d.population >= 20000) return '#10b981'; // emerald-500
    if (d.population >= 10000) return '#34d399'; // emerald-400
    return '#a7f3d0'; // emerald-200
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Map Control Header */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
            <Compass className="w-5 h-5 text-blue-800" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
              Peta Tematik 23 Kecamatan Aceh Besar
            </h3>
            <p className="text-[11px] text-slate-500">
              Visualisasi spasial potensi ekonomi & koroplet wilayah
            </p>
          </div>
        </div>

        {/* Color Mode Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setColorMode('growth')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              colorMode === 'growth'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Laju Pertumbuhan (%)
          </button>
          <button
            onClick={() => setColorMode('pdrb')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              colorMode === 'pdrb'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estimasi PDRB
          </button>
          <button
            onClick={() => setColorMode('population')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              colorMode === 'population'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Jumlah Penduduk
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative w-full h-[400px] sm:h-[480px] bg-gradient-to-b from-sky-50 via-slate-50 to-blue-50/30 overflow-hidden flex items-center justify-center p-2">
        {/* Ocean / Geographic Watermarks */}
        <div className="absolute top-4 left-6 text-sky-400 font-extrabold text-[11px] tracking-widest uppercase select-none opacity-60">
          Selat Malaka / Laut Andaman
        </div>
        <div className="absolute bottom-6 left-6 text-sky-400 font-extrabold text-[11px] tracking-widest uppercase select-none opacity-60">
          Samudera Hindia (Pantai Barat)
        </div>
        <div className="absolute top-1/2 right-6 text-slate-300 font-extrabold text-[11px] tracking-widest uppercase select-none opacity-60">
          Kabupaten Pidie (Perbatasan Timur)
        </div>

        {/* City of Banda Aceh enclave indicator */}
        <div className="absolute top-[28%] left-[33%] border-2 border-dashed border-red-400 bg-red-50/80 px-2.5 py-1 rounded-lg text-center shadow-xs pointer-events-none z-10">
          <p className="text-[10px] font-black text-red-700">Kota Banda Aceh</p>
          <p className="text-[8px] text-red-500 font-semibold">(Enklave / Ibu Kota Prov)</p>
        </div>

        {/* Interactive SVG Regional Map Canvas */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full max-w-2xl select-none"
          style={{ filter: 'drop-shadow(0px 8px 16px rgba(15, 23, 42, 0.08))' }}
        >
          {/* Background coastline outline */}
          <path
            d="M 10 15 Q 25 15, 38 22 Q 52 18, 70 28 Q 85 40, 92 65 Q 85 85, 65 88 Q 45 85, 25 80 Q 15 65, 10 15 Z"
            fill="#e2e8f0"
            stroke="#cbd5e1"
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />

          {/* District Nodes / Regions */}
          {districts.map((d) => {
            const isSelected = selectedDistrict?.id === d.id;
            const isHovered = hoveredDistrict?.id === d.id;
            const color = getFillColor(d);

            // Shape radius varies slightly by size
            const radius = Math.min(Math.max(Math.sqrt(d.areaKm2) * 0.28, 2.8), 5.5);

            return (
              <g
                key={d.id}
                className="cursor-pointer transition-transform duration-200"
                onClick={() => onSelectDistrict(isSelected ? null : d)}
                onMouseEnter={() => setHoveredDistrict(d)}
                onMouseLeave={() => setHoveredDistrict(null)}
              >
                {/* Halo effect on selection */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={d.coordinates.x}
                    cy={d.coordinates.y}
                    r={radius + 2.5}
                    fill={isSelected ? '#f97316' : '#3b82f6'}
                    opacity={0.35}
                    className="animate-pulse"
                  />
                )}

                {/* District Bubble */}
                <circle
                  cx={d.coordinates.x}
                  cy={d.coordinates.y}
                  r={radius}
                  fill={color}
                  stroke={isSelected ? '#ea580c' : '#ffffff'}
                  strokeWidth={isSelected ? 1.2 : 0.6}
                  className="transition-all hover:scale-110 shadow-md"
                />

                {/* District Name Label */}
                <text
                  x={d.coordinates.x}
                  y={d.coordinates.y + radius + 2.4}
                  textAnchor="middle"
                  fontSize={radius > 4 ? "2.3" : "2.0"}
                  fontWeight="bold"
                  fill="#1e293b"
                  className="pointer-events-none drop-shadow-xs"
                >
                  {d.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip floating */}
        {hoveredDistrict && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white p-3 rounded-xl shadow-xl backdrop-blur-xs text-xs pointer-events-none z-20 border border-slate-700 animate-in fade-in max-w-xs">
            <div className="flex items-center gap-1.5 font-bold text-orange-400 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Kec. {hoveredDistrict.name}</span>
            </div>
            <div className="space-y-0.5 text-[11px] text-slate-200">
              <p>Ibu Kota: <span className="font-semibold">{hoveredDistrict.capital}</span></p>
              <p>Laju Pertumbuhan: <span className="font-semibold text-emerald-400">{hoveredDistrict.growthRate}%</span></p>
              <p>PDRB: <span className="font-semibold">Rp {hoveredDistrict.pdrbEstimateMiliar.toLocaleString('id-ID')} M</span></p>
              <p>Sektor Unggulan: <span className="font-semibold text-amber-300">{hoveredDistrict.leadingSector}</span></p>
            </div>
          </div>
        )}

        {/* Map Legend */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-md text-[10px] z-10 max-w-[170px]">
          <p className="font-bold text-slate-800 mb-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-700" />
            <span>
              {colorMode === 'growth' && 'Legenda Laju Pertumbuhan'}
              {colorMode === 'pdrb' && 'Legenda Nilai PDRB'}
              {colorMode === 'population' && 'Legenda Penduduk'}
            </span>
          </p>
          {colorMode === 'growth' && (
            <div className="space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-700 shrink-0" />
                <span>≥ 6.0% (Sangat Cepat)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>5.2% - 5.9% (Cepat)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                <span>4.8% - 5.1% (Sedang)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300 shrink-0" />
                <span>&lt; 4.8% (Tumbuh Lambat)</span>
              </div>
            </div>
          )}
          {colorMode === 'pdrb' && (
            <div className="space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shrink-0" />
                <span>≥ Rp 2.500 Miliar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                <span>Rp 1.500 - 2.499 M</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                <span>Rp 900 - 1.499 M</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-200 shrink-0" />
                <span>&lt; Rp 900 Miliar</span>
              </div>
            </div>
          )}
          {colorMode === 'population' && (
            <div className="space-y-1 text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 shrink-0" />
                <span>≥ 30.000 Jiwa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>20.000 - 29.999 Jiwa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <span>10.000 - 19.999 Jiwa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 shrink-0" />
                <span>&lt; 10.000 Jiwa</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* District Detail Modal / Bottom Drawer if a district is selected */}
      {selectedDistrict && (
        <div className="p-4 sm:p-5 bg-blue-50/70 border-t border-blue-200 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px] font-bold">
                  KODE {selectedDistrict.code}
                </span>
                <h4 className="font-extrabold text-base text-slate-900">
                  Kecamatan {selectedDistrict.name}
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  (Ibu Kota: {selectedDistrict.capital})
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                {selectedDistrict.description}
              </p>
            </div>
            <button
              onClick={() => onSelectDistrict(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3.5">
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Laju Pertumbuhan</span>
              <p className="text-base font-black text-blue-700 mt-0.5">{selectedDistrict.growthRate}%</p>
              <span className="text-[10px] text-slate-500">y-on-y</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Estimasi PDRB</span>
              <p className="text-base font-black text-orange-600 mt-0.5">
                Rp {selectedDistrict.pdrbEstimateMiliar.toLocaleString('id-ID')} M
              </p>
              <span className="text-[10px] text-slate-500">Harga Berlaku</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Jumlah Penduduk</span>
              <p className="text-base font-black text-emerald-700 mt-0.5">
                {selectedDistrict.population.toLocaleString('id-ID')}
              </p>
              <span className="text-[10px] text-slate-500">Jiwa</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Sektor Unggulan</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate" title={selectedDistrict.leadingSector}>
                {selectedDistrict.leadingSector}
              </p>
              <span className="text-[10px] text-slate-500">Basis Ekonomi</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
