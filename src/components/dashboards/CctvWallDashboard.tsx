import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { CctvItem } from '../../types/dashboard';
import { SAMPLE_CCTV_DATA, HAT_YAI_STATION_COORDS, USER_PROVIDED_CCTV_SHEET_URL } from '../../data/mockInitialData';
import { fetchCctvFromSheet } from '../../data/cctvShared';
import { StatChart } from '../common/StatChart';
import { InteractiveMap, CATEGORY_COLORS } from '../map/InteractiveMap';
import type { MapMarkerItem } from '../map/InteractiveMap';
import {
  Cctv,
  Video,
  MapPin,
  MapPinned,
  LayoutGrid,
  Grid2x2,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Building2,
  Layers,
  Cpu,
  Crosshair,
  Copy,
  Check,
  Navigation2,
} from 'lucide-react';

interface CctvWallDashboardProps {
  searchQuery: string;
}

// Short device-type label chips
const TYPE_STYLE: Record<string, { color: string; short: string }> = {
  'Fixed Camera': { color: '#0ea5e9', short: 'FIXED' },
  'PTZ Camera': { color: '#8b5cf6', short: 'PTZ' },
  'LPR/AI Camera': { color: '#10b981', short: 'LPR/AI' },
  'Speed Cam': { color: '#f59e0b', short: 'SPEED' },
};

// A single honest "installation point" card — shows only what the source data actually contains
const CameraCard: React.FC<{
  cam: CctvItem;
  onOpen: () => void;
}> = ({ cam, onOpen }) => {
  const agencyColor = CATEGORY_COLORS[cam.agency] || '#3b82f6';
  const typeInfo = TYPE_STYLE[cam.type] || { color: '#64748b', short: cam.type };

  return (
    <button
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-left transition-all hover:border-blue-500/60 hover:bg-slate-900 hover:-translate-y-0.5"
    >
      {/* accent bar by agency */}
      <span className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: agencyColor }} />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow"
          style={{ backgroundColor: agencyColor }}
        >
          {cam.agency}
        </span>
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
          style={{ color: typeInfo.color, borderColor: `${typeInfo.color}55`, backgroundColor: `${typeInfo.color}18` }}
        >
          {typeInfo.short}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5 pl-1.5">
        <div
          className="p-2 rounded-lg border border-white/10 bg-black/30 shrink-0"
          style={{ color: agencyColor }}
        >
          <Cctv className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-slate-100 truncate">{cam.locationName}</p>
          <p className="text-[10px] text-slate-500 font-mono">CAM-{String(cam.no).padStart(4, '0')}</p>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between pl-1.5">
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 truncate">
          <Crosshair className="w-3 h-3 text-blue-400 shrink-0" />
          {cam.lat.toFixed(4)}, {cam.lng.toFixed(4)}
        </span>
        <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-400 flex items-center gap-0.5 shrink-0">
          ดูจุด <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
};

export const CctvWallDashboard: React.FC<CctvWallDashboardProps> = ({ searchQuery }) => {
  const [cctvData, setCctvData] = useState<CctvItem[]>(SAMPLE_CCTV_DATA);

  // Load real CCTV points from a configured sheet (falls back to sample data)
  useEffect(() => {
    if (!USER_PROVIDED_CCTV_SHEET_URL) return;
    fetchCctvFromSheet(USER_PROVIDED_CCTV_SHEET_URL)
      .then((rows) => {
        if (rows.length) setCctvData(rows);
      })
      .catch((e) => console.warn('โหลดชีต CCTV ไม่สำเร็จ:', e));
  }, []);
  const [agencyFilter, setAgencyFilter] = useState<string>('ทั้งหมด');
  const [typeFilter, setTypeFilter] = useState<string>('ทั้งหมด');
  const [density, setDensity] = useState<2 | 3 | 4>(3);
  const [page, setPage] = useState<number>(0);
  const [selected, setSelected] = useState<CctvItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [clock, setClock] = useState<Date>(new Date());
  const [mapCenter, setMapCenter] = useState(HAT_YAI_STATION_COORDS);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const perPage = density * 3; // 3 rows

  // Center the map on a camera and scroll it into view
  const focusOnMap = (cam: CctvItem) => {
    setMapCenter({ lat: cam.lat, lng: cam.lng, zoom: 17 });
    setFocusedId(cam.id);
    mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Aggregate stats from real fields only
  const stats = useMemo(() => {
    const agencyCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    let withCoords = 0;
    cctvData.forEach((c) => {
      agencyCount[c.agency] = (agencyCount[c.agency] || 0) + 1;
      typeCount[c.type] = (typeCount[c.type] || 0) + 1;
      if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) withCoords++;
    });
    const total = cctvData.length;
    const smart = (typeCount['LPR/AI Camera'] || 0) + (typeCount['Speed Cam'] || 0);
    return {
      total,
      agencyCount,
      typeCount,
      agencies: Object.keys(agencyCount).length,
      types: Object.keys(typeCount).length,
      smart,
      coordPct: total ? ((withCoords / total) * 100).toFixed(0) : '0',
    };
  }, [cctvData]);

  const filtered = useMemo(() => {
    return cctvData.filter((item) => {
      if (agencyFilter !== 'ทั้งหมด' && item.agency !== agencyFilter) return false;
      if (typeFilter !== 'ทั้งหมด' && item.type !== typeFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.locationName.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.agency.toLowerCase().includes(q)
      );
    });
  }, [cctvData, agencyFilter, typeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  useEffect(() => {
    setPage(0);
  }, [agencyFilter, typeFilter, searchQuery, density]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = page * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Map markers respect the active filters
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filtered.map((item) => ({
      id: item.id,
      lat: item.lat,
      lng: item.lng,
      title: item.locationName,
      category: item.agency,
      address: item.address,
      notes: item.notes,
      type: item.type,
      color: CATEGORY_COLORS[item.agency] || '#3b82f6',
      rawData: item,
    }));
  }, [filtered]);

  const agencies = ['ทั้งหมด', ...Object.keys(stats.agencyCount)];
  const types = ['ทั้งหมด', ...Object.keys(stats.typeCount)];

  const gridColsClass =
    density === 2 ? 'grid-cols-1 sm:grid-cols-2' : density === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';

  const copyCoords = (cam: CctvItem) => {
    navigator.clipboard?.writeText(`${cam.lat}, ${cam.lng}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Command header */}
      <div className="glass-panel bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/60 border border-blue-500/25 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-500/15 border border-blue-500/30 rounded-xl text-blue-300 shadow-inner">
              <Cctv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-300 uppercase tracking-widest mb-1">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> CCTV ASSET DIRECTORY · ทะเบียนจุดติดตั้งกล้อง
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
                บอร์ดไดเรกทอรีจุดติดตั้งกล้องวงจรปิด สภ.สะท้อน
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                รวม <b className="text-blue-300">{stats.total.toLocaleString('th-TH')} จุด</b> จาก{' '}
                <b className="text-blue-300">{stats.agencies} หน่วยงาน</b> · ข้อมูลทะเบียนตำแหน่งและสังกัด (ไม่รวมภาพสตรีมสด)
              </p>
            </div>
          </div>

          {/* System time */}
          <div className="text-right shrink-0">
            <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
              {clock.toLocaleTimeString('th-TH', { hour12: false })}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {clock.toLocaleDateString('th-TH', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Stat strip — real, derivable numbers only */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'จุดติดตั้งทั้งหมด', value: stats.total.toLocaleString('th-TH'), icon: Video, color: '#38bdf8', tint: 'from-sky-600/15 border-sky-500/30' },
          { label: 'หน่วยงานเจ้าของ', value: stats.agencies, icon: Building2, color: '#a78bfa', tint: 'from-violet-600/15 border-violet-500/30' },
          { label: 'ประเภทกล้อง', value: stats.types, icon: Layers, color: '#34d399', tint: 'from-emerald-600/15 border-emerald-500/30' },
          { label: 'กล้องอัจฉริยะ (LPR/Speed)', value: stats.smart.toLocaleString('th-TH'), icon: Cpu, color: '#fbbf24', tint: 'from-amber-600/15 border-amber-500/30' },
        ].map((s) => (
          <div
            key={s.label}
            className={`glass-panel bg-gradient-to-br to-slate-900/10 border rounded-2xl p-4 flex items-center justify-between ${s.tint}`}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">{s.label}</p>
              <h3 className="text-2xl font-extrabold tabular-nums" style={{ color: s.color }}>
                {s.value}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl border border-white/10 bg-black/20" style={{ color: s.color }}>
              <s.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Control bar */}
      <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mr-1">
            <Building2 className="w-3.5 h-3.5" /> หน่วยงาน:
          </span>
          {agencies.map((a) => (
            <button
              key={a}
              onClick={() => setAgencyFilter(a)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                agencyFilter === a ? 'bg-blue-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Type select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-bold text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === 'ทั้งหมด' ? 'ทุกประเภท' : t}
              </option>
            ))}
          </select>

          {/* Density switch */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {[
              [2, Grid2x2],
              [3, Grid3x3],
              [4, LayoutGrid],
            ].map(([d, Icon]) => {
              const DIcon = Icon as React.FC<{ className?: string }>;
              return (
                <button
                  key={d as number}
                  onClick={() => setDensity(d as 2 | 3 | 4)}
                  title={`${d} คอลัมน์`}
                  className={`p-1.5 rounded-md transition-all ${
                    density === d ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <DIcon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* GIS map — reflects active filters */}
      <div ref={mapRef} className="scroll-mt-24">
        <InteractiveMap
          markers={mapMarkers}
          center={mapCenter}
          zoom={13}
          height="440px"
          enableClustering={true}
          title={`แผนที่จุดติดตั้งกล้อง (${mapMarkers.length.toLocaleString('th-TH')} หมุด)`}
          selectedMarkerId={focusedId || undefined}
          onSelectMarker={(m) => setSelected(m.rawData as CctvItem)}
        />
      </div>

      {/* Main: directory board + agency summary */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Board */}
        <div className="xl:col-span-3 glass-panel bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-400" /> ทะเบียนจุดติดตั้ง
              <span className="text-[11px] font-mono text-slate-500">({filtered.length.toLocaleString('th-TH')} จุด)</span>
            </h3>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setPage((p) => (p - 1 + totalPages) % totalPages)}
                disabled={totalPages <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-400 w-16 text-center">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => (p + 1) % totalPages)}
                disabled={totalPages <= 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Cctv className="w-10 h-10 mb-2" />
              <p className="text-sm font-semibold">ไม่พบจุดติดตั้งตามเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            <div className={`grid ${gridColsClass} gap-3`}>
              {pageItems.map((cam) => (
                <CameraCard key={cam.id} cam={cam} onOpen={() => setSelected(cam)} />
              ))}
            </div>
          )}
        </div>

        {/* Agency summary sidebar */}
        <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
            <Building2 className="w-4 h-4 text-blue-400" /> สรุปตามหน่วยงาน
          </h3>

          <div className="space-y-3">
            {Object.entries(stats.agencyCount)
              .sort((a, b) => b[1] - a[1])
              .map(([agency, count]) => {
                const color = CATEGORY_COLORS[agency] || '#3b82f6';
                const pct = stats.total ? (count / stats.total) * 100 : 0;
                const active = agencyFilter === agency;
                return (
                  <button
                    key={agency}
                    onClick={() => setAgencyFilter(active ? 'ทั้งหมด' : agency)}
                    className={`w-full text-left group ${active ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {agency}
                      </span>
                      <span className="font-mono text-slate-400">
                        {count.toLocaleString('th-TH')} · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${active ? 'ring-1 ring-white/40' : ''}`}
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </button>
                );
              })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">ประเภทกล้อง</h4>
            <div className="space-y-1.5">
              {Object.entries(stats.typeCount)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const info = TYPE_STYLE[type] || { color: '#64748b', short: type };
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(typeFilter === type ? 'ทั้งหมด' : type)}
                      className="w-full flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-slate-800/70 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: info.color }} />
                        {type}
                      </span>
                      <span className="font-mono font-bold text-slate-400">{count}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <StatChart
          title="สัดส่วนจุดติดตั้งแยกตามหน่วยงานสังกัด"
          type="doughnut"
          labels={Object.keys(stats.agencyCount)}
          dataValues={Object.values(stats.agencyCount)}
          customColors={Object.keys(stats.agencyCount).map((a) => CATEGORY_COLORS[a] || '#3b82f6')}
        />
        <StatChart
          title="จำนวนกล้องแยกตามประเภทอุปกรณ์"
          type="bar"
          labels={Object.keys(stats.typeCount)}
          dataValues={Object.values(stats.typeCount)}
          customColors={Object.keys(stats.typeCount).map((t) => TYPE_STYLE[t]?.color || '#64748b')}
        />
      </div>

      {/* Detail modal — honest asset record, no fake feed */}
      {selected && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg glass-panel bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="p-2.5 rounded-xl border border-white/10 bg-black/30 shrink-0"
                  style={{ color: CATEGORY_COLORS[selected.agency] || '#3b82f6' }}
                >
                  <Cctv className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{selected.locationName}</h3>
                  <span className="text-[11px] font-mono text-slate-400">CAM-{String(selected.no).padStart(4, '0')}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">หน่วยงานเจ้าของ</span>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold text-white inline-block"
                    style={{ backgroundColor: CATEGORY_COLORS[selected.agency] || '#3b82f6' }}
                  >
                    {selected.agency}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">ประเภทกล้อง</span>
                  <span className="font-bold text-slate-100">{selected.type}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> ที่ตั้ง
                </span>
                <p className="font-medium text-slate-100">{selected.address}</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Crosshair className="w-3.5 h-3.5 text-blue-400" /> พิกัด GIS
                  </span>
                  <button
                    onClick={() => copyCoords(selected)}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-300"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </button>
                </div>
                <p className="font-mono font-bold text-blue-300 mt-1">
                  {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                </p>
              </div>

              {selected.notes && (
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                  <span className="text-[11px] text-slate-400 font-semibold block mb-1">รายละเอียด</span>
                  <p className="text-slate-200">{selected.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    focusOnMap(selected);
                    setSelected(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <MapPinned className="w-3.5 h-3.5 text-cyan-300" /> โฟกัสบนแผนที่
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Navigation2 className="w-3.5 h-3.5" /> นำทาง (Google Maps)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
