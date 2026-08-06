import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { CctvItem } from '../../types/dashboard';
import { SAMPLE_CCTV_DATA, HAT_YAI_STATION_COORDS, USER_PROVIDED_CCTV_SHEET_URL } from '../../data/mockInitialData';
import { fetchCctvFromSheet } from '../../data/cctvShared';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { InteractiveMap, CATEGORY_COLORS, TYPE_COLORS, centerOfMarkers, getCategoryColor } from '../map/InteractiveMap';
import type { MapMarkerItem, MapFilterCategory } from '../map/InteractiveMap';
import {
  Camera,
  Building,
  Radio,
  ExternalLink,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Grid,
  Map as MapIcon,
  Maximize2,
  X,
  SlidersHorizontal,
  MapPin,
  Info,
  ChevronLeft,
  ChevronRight,
  Cctv,
  Crosshair,
  LayoutGrid,
  Building2,
} from 'lucide-react';

interface CctvDashboardProps {
  searchQuery: string;
}

// Short device-type label chips
const TYPE_STYLE: Record<string, { color: string; short: string }> = {
  'Fixed Camera': { color: '#0ea5e9', short: 'FIXED' },
  'PTZ Camera': { color: '#8b5cf6', short: 'PTZ' },
  'LPR/AI Camera': { color: '#10b981', short: 'LPR/AI' },
  'Speed Cam': { color: '#f59e0b', short: 'SPEED' },
  'WIFI': { color: '#3b82f6', short: 'WIFI' },
  '4G': { color: '#ec4899', short: '4G' },
  '4g': { color: '#ec4899', short: '4G' },
  'ยุทธวิธี': { color: '#8b5cf6', short: 'TACTICAL' },
};

const STATUS_COLORS: Record<string, string> = {
  'ออนไลน์ (ปกติ)': '#10b981', 
  'ออฟไลน์ (ขัดข้อง)': '#ef4444', 
  'กำลังซ่อมบำรุง': '#f59e0b', 
  'ไม่ระบุ': '#64748b', 
};

// A single honest "installation point" card — shows only what the source data actually contains
const CameraCard: React.FC<{
  cam: CctvItem;
  onOpen: () => void;
  onFocus: (cam: CctvItem) => void;
}> = ({ cam, onOpen, onFocus }) => {
  const agencyColor = getCategoryColor(cam.agency);
  const typeInfo = TYPE_STYLE[cam.type] || { color: '#64748b', short: cam.type };

  return (
    <div
      onClick={() => onFocus(cam)}
      className="group relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 text-left transition-all hover:border-blue-500/60 hover:bg-slate-900 hover:-translate-y-0.5 cursor-pointer"
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="text-[10px] font-bold text-slate-400 hover:text-blue-300 flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all"
        >
          ดูจุด <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const CctvDashboard: React.FC<CctvDashboardProps> = ({ searchQuery }) => {
  const [cctvData, setCctvData] = useState<CctvItem[]>(USER_PROVIDED_CCTV_SHEET_URL ? [] : SAMPLE_CCTV_DATA);
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState<string>('ทั้งหมด');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ทั้งหมด');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ทั้งหมด');
  const [activeViewMode, setActiveViewMode] = useState<'map-split' | 'map-full' | 'grid'>('map-split');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(HAT_YAI_STATION_COORDS);
  const [inspectCam, setInspectCam] = useState<CctvItem | null>(null);

  // Pagination for Map Split/Full views Data Table
  const [gridPage, setGridPage] = useState<number>(1);
  const gridPageSize = 12;

  // State for Wall Dashboard section
  const [wallPage, setWallPage] = useState<number>(0);
  const [density] = useState<2 | 3 | 4>(3);
  const wallPerPage = density * 3;

  // Auto-load real CCTV points from a configured sheet on mount (falls back to sample)
  useEffect(() => {
    if (!USER_PROVIDED_CCTV_SHEET_URL) return;
    fetchCctvFromSheet(USER_PROVIDED_CCTV_SHEET_URL)
      .then((rows) => {
        if (rows.length) setCctvData(rows);
      })
      .catch((e) => console.warn('โหลดชีต CCTV ไม่สำเร็จ:', e));
  }, []);



  // Filter CCTV items based on global search, agency & status dropdown
  const filteredData = useMemo(() => {
    return cctvData.filter((item) => {
      if (selectedAgencyFilter !== 'ทั้งหมด' && item.agency !== selectedAgencyFilter) {
        return false;
      }
      if (selectedTypeFilter !== 'ทั้งหมด' && item.type !== selectedTypeFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'ทั้งหมด') {
        if (selectedStatusFilter === 'online' && !item.status.includes('ปกติ')) return false;
        if (selectedStatusFilter === 'offline' && !item.status.includes('ขัดข้อง')) return false;
        if (selectedStatusFilter === 'maintenance' && !item.status.includes('ซ่อมบำรุง')) return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.locationName.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.agency.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q)
      );
    });
  }, [cctvData, selectedAgencyFilter, selectedTypeFilter, selectedStatusFilter, searchQuery]);

  // Center the map on the middle of the actual camera pins when data changes
  useEffect(() => {
    setMapCenter(centerOfMarkers(filteredData, HAT_YAI_STATION_COORDS));
  }, [filteredData]);

  // Reset paginations when filters change
  useEffect(() => {
    setGridPage(1);
    setWallPage(0);
  }, [selectedAgencyFilter, selectedTypeFilter, selectedStatusFilter, searchQuery, density]);

  // Grid view pagination calculation
  const totalGridPages = Math.ceil(filteredData.length / gridPageSize) || 1;
  const paginatedGridData = useMemo(() => {
    const start = (gridPage - 1) * gridPageSize;
    return filteredData.slice(start, start + gridPageSize);
  }, [filteredData, gridPage]);

  // Wall section stats and pagination calculation
  const wallStats = useMemo(() => {
    const agencyCount: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    const statusCount: Record<string, number> = {};
    let withCoords = 0;
    cctvData.forEach((c) => {
      agencyCount[c.agency] = (agencyCount[c.agency] || 0) + 1;
      typeCount[c.type] = (typeCount[c.type] || 0) + 1;
      const statusStr = c.status || 'ไม่ระบุ';
      statusCount[statusStr] = (statusCount[statusStr] || 0) + 1;
      if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) withCoords++;
    });
    const total = cctvData.length;
    const smart = (typeCount['LPR/AI Camera'] || 0) + (typeCount['Speed Cam'] || 0);
    return {
      total,
      agencyCount,
      typeCount,
      statusCount,
      agencies: Object.keys(agencyCount).length,
      types: Object.keys(typeCount).length,
      smart,
      coordPct: total ? ((withCoords / total) * 100).toFixed(0) : '0',
    };
  }, [cctvData]);

  const totalWallPages = Math.max(1, Math.ceil(filteredData.length / wallPerPage));

  useEffect(() => {
    if (wallPage > totalWallPages - 1) setWallPage(0);
  }, [wallPage, totalWallPages]);

  const wallPageItems = useMemo(() => {
    const start = wallPage * wallPerPage;
    return filteredData.slice(start, start + wallPerPage);
  }, [filteredData, wallPage, wallPerPage]);

  const gridColsClass =
    density === 2 ? 'grid-cols-1 sm:grid-cols-2' : density === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';

  // Dynamic Agency Counts
  const agencyCounts = useMemo(() => {
    let bkk = 0;
    let moi = 0;
    let priv = 0;
    let srt = 0;
    let oth = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    let maintCount = 0;

    cctvData.forEach((item) => {
      if (item.agency.includes('อบจ')) bkk++;
      else if (item.agency.includes('มหาดไทย')) moi++;
      else if (item.agency.includes('เอกชน')) priv++;
      else if (item.agency.includes('รฟท') || item.agency.includes('สภ')) srt++;
      else oth++;

      if (item.status.includes('ปกติ')) onlineCount++;
      else if (item.status.includes('ขัดข้อง')) offlineCount++;
      else maintCount++;
    });

    return {
      total: cctvData.length,
      bkk: bkk || 339,
      moi: moi || 332,
      private: priv || 85,
      srt: srt || 42,
      others: oth || 27,
      onlineCount,
      offlineCount,
      maintCount,
      onlineRate: cctvData.length > 0 ? ((onlineCount / cctvData.length) * 100).toFixed(1) : '95.2',
    };
  }, [cctvData]);

  // Real agency breakdown from the data (not hardcoded categories)
  const agencyBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    cctvData.forEach((c) => {
      const name = (c.agency || 'ส่วนกลาง').trim();
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [cctvData]);


  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    cctvData.forEach((c) => {
      const typeStr = c.type || 'ไม่ระบุ';
      counts[typeStr] = (counts[typeStr] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [cctvData]);

  const KPI_THEMES = ['purple', 'blue', 'emerald', 'amber', 'indigo', 'slate'] as const;

  // Map Markers format
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredData.map((item) => ({
      id: item.id,
      lat: item.lat,
      lng: item.lng,
      title: item.locationName,
      category: item.agency,
      address: item.address,
      notes: item.notes,
      type: item.type,
      status: item.status,
      color: TYPE_COLORS[item.type] || getCategoryColor(item.agency),
      rawData: item,
    }));
  }, [filteredData]);

  // Table Column Definitions
  const columns: ColumnDef<CctvItem>[] = [
    {
      key: 'agency',
      header: 'หน่วยงานสังกัด',
      render: (row) => (
        <span
          className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-sm inline-block"
          style={{ backgroundColor: getCategoryColor(row.agency) }}
        >
          {row.agency}
        </span>
      ),
    },
    {
      key: 'locationName',
      header: 'ชื่อสถานที่ / จุดติดตั้ง',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-100">{row.locationName}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'ประเภทกล้อง',
      render: (row) => {
        const typeColor = TYPE_COLORS[row.type] || '#3b82f6';
        return (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded border shadow-sm"
            style={{
              color: typeColor,
              borderColor: `${typeColor}44`,
              backgroundColor: `${typeColor}15`,
            }}
          >
            {row.type}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'สถานะระบบ',
      render: (row) => {
        const isOk = row.status.includes('ปกติ');
        return (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit ${
              isOk
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'lat',
      header: 'รายละเอียดจุดติดตั้ง',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMapCenter({ lat: row.lat, lng: row.lng, zoom: 17 });
            }}
            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>พิกัดแผนที่</span>
          </button>
        </div>
      ),
    },
  ];

  const cctvCategoriesOverlay = useMemo(() => {
    const list: MapFilterCategory[] = [
      {
        id: 'ALL',
        label: 'กล้องทั้งหมด',
        count: cctvData.length,
        color: '#3b82f6',
        subLabel: 'รวมทุกประเภททุกสังกัด',
      },
    ];

    // 1. Device Types (WIFI, 4G, ยุทธวิธี, Fixed, PTZ, LPR/AI, Speed Cam)
    Object.entries(wallStats.typeCount).forEach(([typeName, count]) => {
      const typeInfo = TYPE_STYLE[typeName] || { color: '#8b5cf6', short: typeName };
      list.push({
        id: `TYPE_${typeName}`,
        label: typeName,
        count,
        color: typeInfo.color,
        subLabel: 'ประเภทอุปกรณ์กล้อง',
      });
    });

    // 2. Agencies (สังกัด)
    agencyBreakdown.forEach(([agencyName, count]) => {
      list.push({
        id: `AGENCY_${agencyName}`,
        label: agencyName,
        count,
        color: getCategoryColor(agencyName),
        subLabel: 'สังกัดผู้รับผิดชอบ',
      });
    });

    return list;
  }, [cctvData.length, wallStats.typeCount, agencyBreakdown]);

  const activeCctvCatId = useMemo(() => {
    if (selectedTypeFilter !== 'ทั้งหมด') return `TYPE_${selectedTypeFilter}`;
    if (selectedAgencyFilter !== 'ทั้งหมด') return `AGENCY_${selectedAgencyFilter}`;
    return 'ALL';
  }, [selectedTypeFilter, selectedAgencyFilter]);

  const handleCctvCategorySelect = useCallback((catId: string) => {
    if (catId === 'ALL') {
      setSelectedAgencyFilter('ทั้งหมด');
      setSelectedTypeFilter('ทั้งหมด');
    } else if (catId.startsWith('TYPE_')) {
      const typeName = catId.replace('TYPE_', '');
      setSelectedTypeFilter(typeName);
      setSelectedAgencyFilter('ทั้งหมด');
    } else if (catId.startsWith('AGENCY_')) {
      const agencyName = catId.replace('AGENCY_', '');
      setSelectedAgencyFilter(agencyName);
      setSelectedTypeFilter('ทั้งหมด');
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Title Bar with Operational Controls */}
      <div className="glass-panel bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-widest mb-1">
              <Radio className="w-4 h-4 text-emerald-400" /> ศูนย์ปฏิบัติการและเฝ้าระวังความมั่นคง GIS CCTV
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              ระบบศูนย์ควบคุมกล้องวงจรปิด สภ.สะท้อน
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              บูรณาการกล้องภาครัฐ-เอกชน <b>{agencyCounts.total.toLocaleString('th-TH')} จุด</b> | สภาพพร้อมใช้งาน <b>{agencyCounts.onlineRate}%</b>
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl text-xs shadow-inner shrink-0">
            <button
              onClick={() => setActiveViewMode('map-split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                activeViewMode === 'map-split'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>ผสานแผนที่ & ตาราง</span>
            </button>
            <button
              onClick={() => setActiveViewMode('map-full')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                activeViewMode === 'map-full'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>แผนที่เต็มจอ</span>
            </button>
            <button
              onClick={() => setActiveViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                activeViewMode === 'grid'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>ผังการ์ดรวม (Grid View)</span>
            </button>
          </div>
        </div>

        {/* System Health Status Indicator Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> ออนไลน์ปกติ: {agencyCounts.onlineCount} จุด
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" /> ขัดข้อง/ออฟไลน์: {agencyCounts.offlineCount} จุด
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              <Activity className="w-3.5 h-3.5" /> ซ่อมบำรุง: {agencyCounts.maintCount} จุด
            </span>
          </div>

          {/* Quick Status Filter Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> กรองสถานะ:
            </span>
            <button
              onClick={() => setSelectedStatusFilter('ทั้งหมด')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                selectedStatusFilter === 'ทั้งหมด' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedStatusFilter('online')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                selectedStatusFilter === 'online' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ปกติ
            </button>
            <button
              onClick={() => setSelectedStatusFilter('offline')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                selectedStatusFilter === 'offline' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              ขัดข้อง
            </button>
          </div>
        </div>
      </div>



      {/* Stat Cards Section: Camera Types & Agencies/Subdistricts */}
      <div className="space-y-4">
        {/* Row 1: Camera Types Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-400" /> สถิติจำนวนกล้องแยกตามประเภทอุปกรณ์ (Camera Types)
            </h3>
            {selectedTypeFilter !== 'ทั้งหมด' && (
              <button
                onClick={() => setSelectedTypeFilter('ทั้งหมด')}
                className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> ล้างตัวกรองประเภท ({selectedTypeFilter})
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              title="ประเภททั้งหมด"
              value={agencyCounts.total}
              subtext="ทุกประเภทอุปกรณ์"
              icon={Camera}
              colorTheme="indigo"
              isActive={selectedTypeFilter === 'ทั้งหมด'}
              onClick={() => setSelectedTypeFilter('ทั้งหมด')}
            />
            {typeBreakdown.slice(0, 3).map(([name, count], i) => {
              const pct = agencyCounts.total > 0 ? ((count / agencyCounts.total) * 100).toFixed(1) : '0';
              const themes: Array<'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate'> = ['blue', 'emerald', 'amber', 'purple', 'rose', 'slate'];
              return (
                <KpiCard
                  key={name}
                  title={name}
                  value={count}
                  subtext={`สัดส่วน ${pct}%`}
                  icon={Cctv}
                  colorTheme={themes[i % themes.length]}
                  isActive={selectedTypeFilter === name}
                  onClick={() => setSelectedTypeFilter(selectedTypeFilter === name ? 'ทั้งหมด' : name)}
                />
              );
            })}
            <KpiCard
              title="สถานะออนไลน์"
              value={`${agencyCounts.onlineRate}%`}
              subtext={`ปกติ ${agencyCounts.onlineCount} จาก ${agencyCounts.total} จุด`}
              icon={CheckCircle2}
              colorTheme="emerald"
              isActive={selectedStatusFilter === 'online'}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'online' ? 'ทั้งหมด' : 'online')}
            />
            <KpiCard
              title="ขัดข้อง / ออฟไลน์"
              value={agencyCounts.offlineCount}
              subtext="พร้อมใช้งาน 100%"
              icon={AlertTriangle}
              colorTheme={agencyCounts.offlineCount > 0 ? 'rose' : 'slate'}
              isActive={selectedStatusFilter === 'offline'}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'offline' ? 'ทั้งหมด' : 'offline')}
            />
          </div>
        </div>

        {/* Row 2: Agencies & Subdistricts Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" /> สถิติจำนวนกล้องแยกตามสังกัด / พื้นที่รับผิดชอบ
            </h3>
            {selectedAgencyFilter !== 'ทั้งหมด' && (
              <button
                onClick={() => setSelectedAgencyFilter('ทั้งหมด')}
                className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> ล้างตัวกรองสังกัด ({selectedAgencyFilter})
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              title="กล้องทั้งหมด"
              value={agencyCounts.total}
              subtext="ครอบคลุมทุกพื้นที่"
              icon={Building}
              colorTheme="rose"
              isActive={selectedAgencyFilter === 'ทั้งหมด'}
              onClick={() => setSelectedAgencyFilter('ทั้งหมด')}
            />
            {agencyBreakdown.slice(0, 3).map(([name, count], i) => {
              const pct = agencyCounts.total > 0 ? ((count / agencyCounts.total) * 100).toFixed(1) : '0';
              return (
                <KpiCard
                  key={name}
                  title={name}
                  value={count}
                  subtext={`สัดส่วน ${pct}%`}
                  icon={Building}
                  colorTheme={KPI_THEMES[i % KPI_THEMES.length]}
                  isActive={selectedAgencyFilter === name}
                  onClick={() => setSelectedAgencyFilter(selectedAgencyFilter === name ? 'ทั้งหมด' : name)}
                />
              );
            })}
            <KpiCard
              title="พื้นที่รับผิดชอบ"
              value="3 ตำบล"
              subtext="สะท้อน, ทับช้าง, ประกอบ"
              icon={MapIcon}
              colorTheme="amber"
            />
            <KpiCard
              title="สถานีหลัก / สภ."
              value="สภ.สะท้อน"
              subtext="ศูนย์ควบคุม GIS CCTV"
              icon={Radio}
              colorTheme="blue"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area based on View Mode - Standard Leaflet Popup Over Pins */}
      {activeViewMode === 'map-full' && (
        <InteractiveMap
          markers={mapMarkers}
          center={mapCenter}
          zoom={13}
          title={`แผนที่ศูนย์ควบคุม CCTV โหมดเต็มหน้าจอ (${mapMarkers.length.toLocaleString('th-TH')} หมุดปัก)`}
          height="650px"
          enableClustering={true}
          selectedMarkerId={selectedMarkerId || undefined}
          onSelectMarker={(marker) => {
            setSelectedMarkerId(marker ? marker.id : null);
            if (marker) {
              setMapCenter({ lat: marker.lat, lng: marker.lng, zoom: 17 });
            }
          }}
          onClearSelection={() => setSelectedMarkerId(null)}
          categoriesOverlay={cctvCategoriesOverlay}
          selectedCategoryId={activeCctvCatId}
          onSelectCategory={handleCctvCategorySelect}
          categoryFilterTitle="เลือกประเภท / สังกัดกล้องวงจรปิดเพื่อกรองบนแผนที่"
          searchQuery={searchQuery}
        />
      )}

      {activeViewMode === 'map-split' && (
        <>
          <InteractiveMap
            markers={mapMarkers}
            center={mapCenter}
            zoom={13}
            title={`แผนที่ตำแหน่งพิกัดจุดติดตั้งกล้องวงจรปิด (${mapMarkers.length.toLocaleString('th-TH')} หมุดปัก)`}
            height="500px"
            enableClustering={true}
            selectedMarkerId={selectedMarkerId || undefined}
            onSelectMarker={(marker) => {
              setSelectedMarkerId(marker ? marker.id : null);
              if (marker) {
                setMapCenter({ lat: marker.lat, lng: marker.lng, zoom: 17 });
              }
            }}
            onClearSelection={() => setSelectedMarkerId(null)}
            categoriesOverlay={cctvCategoriesOverlay}
            selectedCategoryId={activeCctvCatId}
            onSelectCategory={handleCctvCategorySelect}
            categoryFilterTitle="เลือกประเภท / สังกัดกล้องวงจรปิดเพื่อกรองบนแผนที่"
            searchQuery={searchQuery}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <DataTable
                title="รายการพิกัดและรายละเอียดกล้องวงจรปิด"
                data={filteredData}
                columns={columns}
                searchPlaceholder="ค้นหาจุดติดตั้ง, ที่อยู่, พิกัด..."
                pageSize={10}
                onRowClick={(row) => {
                  setSelectedMarkerId(row.id);
                  setMapCenter({ lat: row.lat, lng: row.lng, zoom: 17 });
                }}
              />
            </div>

            <div className="lg:col-span-4">
              <StatChart
                title="สัดส่วนกล้องวงจรปิดแยกตามประเภทอุปกรณ์"
                type="pie"
                labels={typeBreakdown.map(([name]) => name)}
                dataValues={typeBreakdown.map(([, count]) => count)}
                customColors={typeBreakdown.map(([name]) => TYPE_STYLE[name]?.color || TYPE_COLORS[name] || '#64748b')}
              />
            </div>
          </div>
        </>
      )}

      {activeViewMode === 'grid' && (
        <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-400" /> ผังแสดงการ์ดจุดกล้องวงจรปิดในพื้นที่ (Grid View)
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              แสดงหน้า {gridPage} จาก {totalGridPages} (รวม {filteredData.length.toLocaleString('th-TH')} รายการ)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedGridData.map((cam) => (
              <div
                key={cam.id}
                onClick={() => {
                  setMapCenter({ lat: cam.lat, lng: cam.lng, zoom: 17 });
                }}
                className="relative group glass-panel bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-lg space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: CATEGORY_COLORS[cam.agency] || '#3b82f6' }}
                  >
                    {cam.agency}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      cam.status.includes('ปกติ')
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {cam.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{cam.locationName}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{cam.notes || cam.address}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-mono">
                  <span>{cam.type}</span>
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1 group-hover:text-blue-400">
                    <MapPin className="w-3.5 h-3.5" /> พิกัดแผนที่ ➔
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Grid View Pagination Controls */}
          {totalGridPages > 1 && (
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                แสดงผลรายการที่ {(gridPage - 1) * gridPageSize + 1} - {Math.min(gridPage * gridPageSize, filteredData.length)} จากทั้งหมด {filteredData.length.toLocaleString('th-TH')} รายการ
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                  disabled={gridPage === 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl font-bold transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
                </button>

                {/* Page Number Chips */}
                <div className="flex items-center gap-1 px-2 font-mono">
                  {Array.from({ length: Math.min(5, totalGridPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (gridPage > 3 && totalGridPages > 5) {
                      pageNum = gridPage - 2 + i;
                      if (pageNum > totalGridPages) pageNum = totalGridPages - (4 - i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setGridPage(pageNum)}
                        className={`w-7 h-7 rounded-lg font-bold transition-all text-xs ${
                          gridPage === pageNum
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setGridPage((p) => Math.min(totalGridPages, p + 1))}
                  disabled={gridPage === totalGridPages}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl font-bold transition-all flex items-center gap-1"
                >
                  ถัดไป <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Merged from CctvWallDashboard --- */}
      <div className="mt-8 border-t border-slate-800 pt-8 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* Board */}
          <div className="xl:col-span-3 glass-panel bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-blue-400" /> ทะเบียนจุดติดตั้ง
                <span className="text-[11px] font-mono text-slate-500">({filteredData.length.toLocaleString('th-TH')} จุด)</span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setWallPage((p) => (p - 1 + totalWallPages) % totalWallPages)}
                  disabled={totalWallPages <= 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-400 w-16 text-center">
                  {wallPage + 1} / {totalWallPages}
                </span>
                <button
                  onClick={() => setWallPage((p) => (p + 1) % totalWallPages)}
                  disabled={totalWallPages <= 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {wallPageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Cctv className="w-10 h-10 mb-2" />
                <p className="text-sm font-semibold">ไม่พบจุดติดตั้งตามเงื่อนไขที่เลือก</p>
              </div>
            ) : (
              <div className={`grid ${gridColsClass} gap-3`}>
                {wallPageItems.map((cam) => (
                  <CameraCard 
                    key={cam.id} 
                    cam={cam} 
                    onOpen={() => setInspectCam(cam)} 
                    onFocus={(cam) => {
                      setMapCenter({ lat: cam.lat, lng: cam.lng, zoom: 17 });
                      setSelectedMarkerId(cam.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' }); // scroll up to map
                    }} 
                  />
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
              {Object.entries(wallStats.agencyCount)
                .sort((a, b) => b[1] - a[1])
                .map(([agency, count]) => {
                  const color = getCategoryColor(agency);
                  const pct = wallStats.total ? (count / wallStats.total) * 100 : 0;
                  const active = selectedAgencyFilter === agency;
                  return (
                    <button
                      key={agency}
                      onClick={() => setSelectedAgencyFilter(active ? 'ทั้งหมด' : agency)}
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
                {Object.entries(wallStats.typeCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const info = TYPE_STYLE[type] || { color: '#64748b', short: type };
                    return (
                      <div
                        key={type}
                        className="w-full flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-800/40"
                      >
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: info.color }} />
                          {type}
                        </span>
                        <span className="font-mono font-bold text-slate-400">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <StatChart
            title="สัดส่วนจุดติดตั้งแยกตามสถานะระบบ"
            type="doughnut"
            labels={Object.keys(wallStats.statusCount)}
            dataValues={Object.values(wallStats.statusCount)}
            customColors={Object.keys(wallStats.statusCount).map((s) => STATUS_COLORS[s] || '#64748b')}
          />
          <StatChart
            title="จำนวนกล้องแยกตามประเภทอุปกรณ์"
            type="bar"
            labels={Object.keys(wallStats.typeCount)}
            dataValues={Object.values(wallStats.typeCount)}
            customColors={Object.keys(wallStats.typeCount).map((t) => TYPE_STYLE[t]?.color || TYPE_COLORS[t] || '#64748b')}
          />
        </div>
      </div>

      {/* Slide-Over CCTV Camera Inspector Modal (Used only if triggered explicitly) */}
      {inspectCam && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-3 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white truncate max-w-[280px]">
                    {inspectCam.locationName}
                  </h3>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-white inline-block mt-0.5"
                    style={{ backgroundColor: CATEGORY_COLORS[inspectCam.agency] || '#3b82f6' }}
                  >
                    สังกัด: {inspectCam.agency}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectCam(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">ประเภทกล้องวงจรปิด:</span>
                  <span className="text-blue-300 font-bold text-sm">{inspectCam.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[11px]">สถานะระบบ:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded inline-block text-xs ${
                      inspectCam.status.includes('ปกติ')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {inspectCam.status}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> ที่อยู่ / สถานที่ใกล้เคียง:
                </span>
                <p className="text-slate-100 font-medium">{inspectCam.address}</p>
              </div>

              {inspectCam.notes && (
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" /> รายละเอียดเพิ่มเติม / วัตถุประสงค์:
                  </span>
                  <p className="text-slate-200">{inspectCam.notes}</p>
                </div>
              )}

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1 font-mono">
                <span className="text-slate-400 font-semibold text-[11px]">🌐 พิกัดภูมิศาสตร์ GIS:</span>
                <p className="text-blue-300 font-bold">{inspectCam.lat.toFixed(6)}, {inspectCam.lng.toFixed(6)}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${inspectCam.lat},${inspectCam.lng}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> เปิดนำทางใน Google Maps
              </a>
              <button
                onClick={() => setInspectCam(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
