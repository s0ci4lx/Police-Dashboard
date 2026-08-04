import React, { useState, useMemo, useEffect } from 'react';
import type { CctvItem } from '../../types/dashboard';
import { SAMPLE_CCTV_DATA, HAT_YAI_STATION_COORDS, USER_PROVIDED_CCTV_SHEET_URL } from '../../data/mockInitialData';
import { fetchCctvFromSheet } from '../../data/cctvShared';
import { fetchSheetData, detectLatLongColumns } from '../../services/googleSheetService';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { InteractiveMap, CATEGORY_COLORS, centerOfMarkers } from '../map/InteractiveMap';
import type { MapMarkerItem } from '../map/InteractiveMap';
import {
  Camera,
  Building,
  ShieldCheck,
  Server,
  Radio,
  ExternalLink,
  Link2,
  RefreshCw,
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
} from 'lucide-react';

interface CctvDashboardProps {
  searchQuery: string;
}

export const CctvDashboard: React.FC<CctvDashboardProps> = ({ searchQuery }) => {
  const [cctvData, setCctvData] = useState<CctvItem[]>(SAMPLE_CCTV_DATA);
  const [selectedAgencyFilter, setSelectedAgencyFilter] = useState<string>('ทั้งหมด');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ทั้งหมด');
  const [activeViewMode, setActiveViewMode] = useState<'map-split' | 'map-full' | 'grid'>('map-split');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState(HAT_YAI_STATION_COORDS);
  const [sheetUrlInput, setSheetUrlInput] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [inspectCam, setInspectCam] = useState<CctvItem | null>(null);

  // Pagination for Grid View
  const [gridPage, setGridPage] = useState<number>(1);
  const gridPageSize = 12;

  // Auto-load real CCTV points from a configured sheet on mount (falls back to sample)
  useEffect(() => {
    if (!USER_PROVIDED_CCTV_SHEET_URL) return;
    fetchCctvFromSheet(USER_PROVIDED_CCTV_SHEET_URL)
      .then((rows) => {
        if (rows.length) setCctvData(rows);
      })
      .catch((e) => console.warn('โหลดชีต CCTV ไม่สำเร็จ:', e));
  }, []);

  // Center the map on the middle of the actual camera pins when data changes
  useEffect(() => {
    setMapCenter(centerOfMarkers(cctvData, HAT_YAI_STATION_COORDS));
  }, [cctvData]);

  // Sync custom Google Sheet for CCTV if provided by user
  const handleSyncCustomCctvSheet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetUrlInput.trim()) return;

    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      const { data, columns } = await fetchSheetData<Record<string, any>>(sheetUrlInput.trim());
      const { latCol, lngCol } = detectLatLongColumns(columns);

      if (data && data.length > 0) {
        const agencyCol = columns.find((c) => c.includes('หน่วยงาน') || c.includes('สังกัด')) || columns[0];
        const locationCol = columns.find((c) => c.includes('ชื่อ') || c.includes('สถานที่') || c.includes('จุด')) || columns[1] || columns[0];
        const addressCol = columns.find((c) => c.includes('ที่อยู่') || c.includes('ทำเล')) || columns[2] || '';
        const notesCol = columns.find((c) => c.includes('หมายเหตุ') || c.includes('รายละเอียด')) || '';

        const mapped: CctvItem[] = data.map((row, idx) => {
          const latVal = latCol ? parseFloat(String(row[latCol])) : 7.0084 + (Math.random() - 0.5) * 0.05;
          const lngVal = lngCol ? parseFloat(String(row[lngCol])) : 100.4767 + (Math.random() - 0.5) * 0.05;

          return {
            id: `sheet-cam-${idx + 1}`,
            no: idx + 1,
            agency: String(row[agencyCol] || 'หน่วยงาน').trim(),
            locationName: String(row[locationCol] || `จุดกล้องที่ ${idx + 1}`),
            address: String(row[addressCol] || 'ต.สะท้อน อ.นาทวี จ.สงขลา'),
            notes: String(row[notesCol] || ''),
            lat: isNaN(latVal) ? 7.0084 : latVal,
            lng: isNaN(lngVal) ? 100.4767 : lngVal,
            type: 'Fixed Camera',
            status: 'ออนไลน์ (ปกติ)',
          };
        });

        setCctvData(mapped);
        setSyncStatusMsg(`✅ ดึงข้อมูลจาก Google Sheet สำเร็จ ทั้งหมด ${mapped.length} จุดกล้อง!`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`❌ เกิดข้อผิดพลาดในการโหลด Sheet: ${err.message || 'โปรดเปิดสิทธิ์เป็นสาธารณะ'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter CCTV items based on global search, agency & status dropdown
  const filteredData = useMemo(() => {
    return cctvData.filter((item) => {
      if (selectedAgencyFilter !== 'ทั้งหมด' && item.agency !== selectedAgencyFilter) {
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
        item.notes.toLowerCase().includes(q)
      );
    });
  }, [cctvData, selectedAgencyFilter, selectedStatusFilter, searchQuery]);

  // Reset grid pagination when filters change
  useEffect(() => {
    setGridPage(1);
  }, [selectedAgencyFilter, selectedStatusFilter, searchQuery]);

  // Grid view pagination calculation
  const totalGridPages = Math.ceil(filteredData.length / gridPageSize) || 1;
  const paginatedGridData = useMemo(() => {
    const start = (gridPage - 1) * gridPageSize;
    return filteredData.slice(start, start + gridPageSize);
  }, [filteredData, gridPage]);

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
      color: CATEGORY_COLORS[item.agency] || '#3b82f6',
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
          style={{ backgroundColor: CATEGORY_COLORS[row.agency] || '#3b82f6' }}
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
          <div className="text-[11px] text-slate-400">{row.notes}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'ประเภทกล้อง',
      render: (row) => (
        <span className="text-[11px] font-semibold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
          {row.type}
        </span>
      ),
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

      {/* Live Google Sheet Input Sync Bar */}
      <form
        onSubmit={handleSyncCustomCctvSheet}
        className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
          <Link2 className="w-4 h-4 text-blue-400" />
          <span>เชื่อมต่อ Google Sheet กล้องวงจรปิด:</span>
        </div>
        <input
          type="url"
          value={sheetUrlInput}
          onChange={(e) => setSheetUrlInput(e.target.value)}
          placeholder="วางลิงก์ Google Sheet CCTV ของคุณที่นี่ (https://docs.google.com/spreadsheets/...)"
          className="flex-1 w-full px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>ซิงค์พิกัด Sheet</span>
        </button>
      </form>

      {syncStatusMsg && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-blue-300">
          {syncStatusMsg}
        </div>
      )}

      {/* KPI Cards Row (Exact Looker Studio Numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard
          title="กล้องทั้งหมด"
          value={agencyCounts.total}
          subtext="ครอบคลุมทุกสังกัด"
          icon={Camera}
          colorTheme="rose"
          isActive={selectedAgencyFilter === 'ทั้งหมด'}
          onClick={() => setSelectedAgencyFilter('ทั้งหมด')}
        />
        <KpiCard
          title="อบจ.สงขลา"
          value={agencyCounts.bkk}
          subtext="สัดส่วน 41.1%"
          icon={Building}
          colorTheme="purple"
          isActive={selectedAgencyFilter === 'อบจ.สงขลา'}
          onClick={() => setSelectedAgencyFilter('อบจ.สงขลา')}
        />
        <KpiCard
          title="มหาดไทย"
          value={agencyCounts.moi}
          subtext="สัดส่วน 40.2%"
          icon={ShieldCheck}
          colorTheme="blue"
          isActive={selectedAgencyFilter === 'มหาดไทย'}
          onClick={() => setSelectedAgencyFilter('มหาดไทย')}
        />
        <KpiCard
          title="เอกชน"
          value={agencyCounts.private}
          subtext="สัดส่วน 10.3%"
          icon={Server}
          colorTheme="emerald"
          isActive={selectedAgencyFilter === 'เอกชน'}
          onClick={() => setSelectedAgencyFilter('เอกชน')}
        />
        <KpiCard
          title="รฟท. / สภ.หมู"
          value={agencyCounts.srt}
          subtext="สัดส่วน 5.1%"
          icon={Camera}
          colorTheme="amber"
          isActive={selectedAgencyFilter === 'รฟท./สภ.'}
          onClick={() => setSelectedAgencyFilter('รฟท./สภ.')}
        />
        <KpiCard
          title="หน่วยงานอื่นๆ"
          value={agencyCounts.others}
          subtext="สัดส่วน 3.3%"
          icon={Building}
          colorTheme="indigo"
          isActive={selectedAgencyFilter === 'หน่วยงานอื่นๆ'}
          onClick={() => setSelectedAgencyFilter('หน่วยงานอื่นๆ')}
        />
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
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-8">
              <DataTable
                title="รายการพิกัดและรายละเอียดกล้องวงจรปิด"
                data={filteredData}
                columns={columns}
                searchPlaceholder="ค้นหาจุดติดตั้ง, ที่อยู่, พิกัด..."
                pageSize={7}
                onRowClick={(row) => {
                  setSelectedMarkerId(row.id);
                  setMapCenter({ lat: row.lat, lng: row.lng, zoom: 17 });
                }}
              />
            </div>

            <div className="lg:col-span-4">
              <StatChart
                title="สัดส่วนกล้องวงจรปิดแยกตามหน่วยงานสังกัด"
                type="pie"
                labels={['อบจ.สงขลา', 'มหาดไทย', 'เอกชน', 'รฟท. / สภ.', 'หน่วยงานอื่นๆ']}
                dataValues={[agencyCounts.bkk, agencyCounts.moi, agencyCounts.private, agencyCounts.srt, agencyCounts.others]}
                customColors={['#ec4899', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6']}
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
