import React, { useState, useEffect, useMemo } from 'react';
import type { PoiItem } from '../../types/dashboard';
import { SAMPLE_POI_DATA, HAT_YAI_STATION_COORDS, USER_PROVIDED_POI_SHEET_URL } from '../../data/mockInitialData';
import { fetchSheetData, detectLatLongColumns, parseRowLatLng } from '../../services/googleSheetService';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { InteractiveMap, CATEGORY_COLORS, centerOfMarkers } from '../map/InteractiveMap';
import type { MapMarkerItem } from '../map/InteractiveMap';
import {
  MapPin,
  School,
  Landmark,
  Fuel,
  ShoppingBag,
  Hospital,
  Building2,
  RefreshCw,
  Layers,
  Shield,
  ExternalLink,
  CheckCircle2,
  Send,
  X,
} from 'lucide-react';

interface LocalPoiDashboardProps {
  searchQuery: string;
}

const CATEGORY_META: Record<string, { icon: any; theme: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate'; label: string }> = {
  'ธนาคาร': { icon: Building2, theme: 'emerald', label: 'จุดเสี่ยงการเงิน' },
  'ร้านสะดวกซื้อ': { icon: ShoppingBag, theme: 'rose', label: 'ร้านค้า 24 ชั่วโมง' },
  '7-11': { icon: ShoppingBag, theme: 'rose', label: 'ร้านค้า 24 ชั่วโมง' },
  'ปั๊มน้ำมัน': { icon: Fuel, theme: 'amber', label: 'จุดตรวจสายตรวจ' },
  'วัด / มัสยิด': { icon: Landmark, theme: 'purple', label: 'ศาสนสถานสำคัญ' },
  'โรงเรียน': { icon: School, theme: 'blue', label: 'สถานศึกษา' },
  'โรงพยาบาล': { icon: Hospital, theme: 'indigo', label: 'การแพทย์/ฉุกเฉิน' },
};

export const LocalPoiDashboard: React.FC<LocalPoiDashboardProps> = ({ searchQuery }) => {
  const [poiData, setPoiData] = useState<PoiItem[]>(SAMPLE_POI_DATA);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [selectedZone, setSelectedZone] = useState<string>('ทั้งหมด');
  const [mapCenter, setMapCenter] = useState(HAT_YAI_STATION_COORDS);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [inspectPoi, setInspectPoi] = useState<PoiItem | null>(null);
  const [dispatchAlertMsg, setDispatchAlertMsg] = useState<string>('');

  // Fetch Live Google Sheet Data for Tab "ข้อมูลท้องถิ่น" (gid=1578849502)
  const loadLivePoiSheetData = async () => {
    setLoading(true);
    setSyncStatusMsg('');
    try {
      const { data, columns } = await fetchSheetData<Record<string, any>>(USER_PROVIDED_POI_SHEET_URL);
      const { latCol, lngCol, combinedCol } = detectLatLongColumns(columns);

      if (data && data.length > 0) {
        const nameCol = columns.find((c) => c.includes('ชื่อ') || c.includes('สถานที่')) || columns[1] || columns[0];
        const categoryCol = columns.find((c) => c.includes('ประเภท') || c.includes('หมวด')) || columns[3] || columns[0];
        const notesCol = columns.find((c) => c.includes('หมายเหตุ') || c.includes('รายละเอียด')) || '';
        const zoneCol = columns.find((c) => c.includes('เขต') || c.includes('พื้นที่')) || '';

        const mappedPoi: PoiItem[] = data.map((row, idx) => {
          const { lat, lng } = parseRowLatLng(row, latCol, lngCol, combinedCol);
          const rawCat = String(row[categoryCol] || 'อื่นๆ').trim();

          let cat = rawCat;
          if (rawCat.toLowerCase().includes('7-11') || rawCat.toLowerCase().includes('สะดวกซื้อ')) {
            cat = 'ร้านสะดวกซื้อ';
          } else if (rawCat.includes('ธนาคาร')) {
            cat = 'ธนาคาร';
          } else if (rawCat.includes('วัด') || rawCat.includes('มัสยิด') || rawCat.includes('โบสถ์')) {
            cat = 'วัด / มัสยิด';
          } else if (rawCat.includes('ปั๊ม') || rawCat.includes('ปตท')) {
            cat = 'ปั๊มน้ำมัน';
          } else if (rawCat.includes('โรงเรียน') || rawCat.includes('วิทยาลัย') || rawCat.includes('มหาลัย')) {
            cat = 'โรงเรียน';
          } else if (rawCat.includes('โรงพยาบาล') || rawCat.includes('รพ')) {
            cat = 'โรงพยาบาล';
          }

          const zoneVal = row[zoneCol] ? String(row[zoneCol]).trim() : `เขต ${(idx % 4) + 1}`;

          return {
            id: `poi-live-${idx + 1}`,
            no: idx + 1,
            category: cat,
            name: String(row[nameCol] || `สถานที่ #${idx + 1}`),
            address: String(row[notesCol] || 'ต.สะท้อน อ.นาทวี จ.สงขลา'),
            contactPerson: String(row[zoneCol] ? `เขตพื้นที่ ${row[zoneCol]}` : 'เจ้าหน้าที่ดูแล'),
            phone: '074-200000',
            lat: lat || 7.0084,
            lng: lng || 100.4767,
            riskLevel: cat === 'ธนาคาร' || cat === 'ร้านสะดวกซื้อ' ? 'สูง' : 'ปกติ',
            policeSubstation: zoneVal.includes('เขต') ? zoneVal : `สายตรวจเขต ${zoneVal}`,
          };
        });

        setPoiData(mappedPoi);
        setSyncStatusMsg(`✅ ดึงข้อมูลท้องถิ่นเรียลไทม์สำเร็จ รวมทั้งหมด ${mappedPoi.length.toLocaleString('th-TH')} รายการ!`);
      }
    } catch (err: any) {
      console.warn('Fallback to sample POI data:', err);
      setSyncStatusMsg(`⚠️ ไม่สามารถอ่านจาก Google Sheet ได้ กำลังใช้ข้อมูลตัวอย่าง`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLivePoiSheetData();
  }, []);

  // Center the map on the middle of the actual pins whenever the data changes
  useEffect(() => {
    setMapCenter(centerOfMarkers(poiData, HAT_YAI_STATION_COORDS));
  }, [poiData]);

  // Filter POI items based on selected category, zone & global search
  const filteredData = useMemo(() => {
    return poiData.filter((item) => {
      if (selectedCategory !== 'ทั้งหมด' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedZone !== 'ทั้งหมด' && item.policeSubstation !== selectedZone) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.policeSubstation && item.policeSubstation.toLowerCase().includes(q))
      );
    });
  }, [poiData, selectedCategory, selectedZone, searchQuery]);

  // Dynamic Category counts from actual dataset
  const activeCategoryCards = useMemo(() => {
    const map: Record<string, number> = {};
    poiData.forEach((item) => {
      if (item.category) {
        map[item.category] = (map[item.category] || 0) + 1;
      }
    });

    return Object.entries(map)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([catName, count]) => {
        const meta = CATEGORY_META[catName] || { icon: MapPin, theme: 'indigo', label: 'สถานที่สำคัญ' };
        return {
          name: catName,
          count,
          icon: meta.icon,
          theme: meta.theme,
          label: meta.label,
        };
      });
  }, [poiData]);

  // Patrol Sectors breakdown
  const sectorList = useMemo(() => {
    const map: Record<string, number> = {};
    poiData.forEach((item) => {
      const z = item.policeSubstation || 'สายตรวจเขต';
      map[z] = (map[z] || 0) + 1;
    });
    return Object.entries(map).slice(0, 5);
  }, [poiData]);

  // Map Markers format
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredData.map((item) => ({
      id: item.id,
      lat: item.lat,
      lng: item.lng,
      title: item.name,
      category: item.category,
      address: item.address,
      notes: `สายตรวจ: ${item.policeSubstation || '-'} | ข้อมูล: ${item.contactPerson || '-'}`,
      status: `หมวดหมู่: ${item.category}`,
      color: CATEGORY_COLORS[item.category] || '#3b82f6',
      rawData: item,
    }));
  }, [filteredData]);

  // Handle Patrol Dispatch Simulation
  const handleDispatchPatrol = (poi: PoiItem) => {
    setDispatchAlertMsg(`🚓 วิทยุสั่งการสายตรวจ (${poi.policeSubstation || 'เขต 1'}) เข้าตรวจสอบจุด "${poi.name}" เรียบร้อยแล้ว!`);
    setTimeout(() => setDispatchAlertMsg(''), 4000);
  };

  // Columns for Data Table
  const columns: ColumnDef<PoiItem>[] = [
    {
      key: 'category',
      header: 'หมวดหมู่สถานที่',
      render: (row) => (
        <span
          className="px-2.5 py-0.5 rounded text-[11px] font-bold text-white shadow-sm inline-block"
          style={{ backgroundColor: CATEGORY_COLORS[row.category] || '#3b82f6' }}
        >
          {row.category}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'ชื่อสถานที่ / จุดสำคัญ',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-100">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.contactPerson || '-'}</div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'ที่อยู่ / หมายเหตุ',
    },
    {
      key: 'policeSubstation',
      header: 'สายตรวจรับผิดชอบ',
      render: (row) => (
        <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          {row.policeSubstation || 'สายตรวจเขต'}
        </span>
      ),
    },
    {
      key: 'lat',
      header: 'จัดการ',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedMarkerId(row.id);
            setMapCenter({ lat: row.lat, lng: row.lng, zoom: 16 });
          }}
          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold"
        >
          📍 พิกัดแผนที่
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Banner */}
      <div className="glass-panel bg-gradient-to-r from-blue-900/40 via-indigo-950 to-slate-950 border border-blue-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">
              <Shield className="w-4 h-4 text-blue-400" /> ภูมิสารสนเทศป้องกันปราบปราม & จุดเสี่ยงเฝ้าระวัง (GIS Police Patrol)
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              ฐานข้อมูลสถานที่สำคัญ ท้องที่ สภ.สะท้อน ({poiData.length.toLocaleString('th-TH')} รายการ)
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <span>🔗 ซิงค์ข้อมูลเรียลไทม์จาก Google Sheet (ชีท ข้อมูลท้องถิ่น):</span>
              <a
                href={USER_PROVIDED_POI_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-mono text-[11px] truncate max-w-xs"
              >
                Google Sheet (gid=1578849502)
              </a>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ทั้งหมด">หมวดหมู่ทั้งหมด ({poiData.length})</option>
              {activeCategoryCards.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>

            <button
              onClick={loadLivePoiSheetData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>ซิงค์ข้อมูล Google Sheet</span>
            </button>
          </div>
        </div>

        {/* Patrol Sectors Quick Filter Strip */}
        <div className="pt-3 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="text-slate-400 font-semibold text-[11px] shrink-0">🚔 กรองพื้นที่สายตรวจ:</span>
          <button
            onClick={() => setSelectedZone('ทั้งหมด')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedZone === 'ทั้งหมด' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ทุกพื้นที่สายตรวจ
          </button>
          {sectorList.map(([zone, count]) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(selectedZone === zone ? 'ทั้งหมด' : zone)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedZone === zone
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {zone} ({count} จุด)
            </button>
          ))}
        </div>
      </div>

      {dispatchAlertMsg && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{dispatchAlertMsg}</span>
          </div>
          <button onClick={() => setDispatchAlertMsg('')} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {syncStatusMsg && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-blue-300">
          {syncStatusMsg}
        </div>
      )}

      {/* 100% Dynamic KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard
          title="สถานที่ทั้งหมด"
          value={poiData.length}
          subtext="รวมทุกหมวดในชีท"
          icon={Layers}
          colorTheme="blue"
          isActive={selectedCategory === 'ทั้งหมด'}
          onClick={() => setSelectedCategory('ทั้งหมด')}
        />

        {activeCategoryCards.map((cat) => (
          <KpiCard
            key={cat.name}
            title={cat.name}
            value={cat.count}
            subtext={cat.label}
            icon={cat.icon}
            colorTheme={cat.theme}
            isActive={selectedCategory === cat.name}
            onClick={() => setSelectedCategory(cat.name)}
          />
        ))}
      </div>

      {/* Interactive Map - Pure Leaflet Popup over pins (No Modal Overlay) */}
      <InteractiveMap
        markers={mapMarkers}
        center={mapCenter}
        zoom={13}
        title={`แผนที่ตำแหน่งสถานที่สำคัญในพื้นที่ (${mapMarkers.length.toLocaleString('th-TH')} หมุดปัก)`}
        height="500px"
        enableClustering={true}
        selectedMarkerId={selectedMarkerId || undefined}
      />

      {/* Table & Chart Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <DataTable
            title="รายละเอียดพิกัดสถานที่และสายตรวจรับผิดชอบ"
            data={filteredData}
            columns={columns}
            searchPlaceholder="ค้นหาชื่อสถานที่, ที่อยู่, สายตรวจ..."
            pageSize={8}
            onRowClick={(row) => {
              setSelectedMarkerId(row.id);
              setMapCenter({ lat: row.lat, lng: row.lng, zoom: 16 });
            }}
          />
        </div>

        <div className="lg:col-span-4">
          <StatChart
            title="สัดส่วนหมวดหมู่สถานที่สำคัญที่มีในชีท"
            type="doughnut"
            labels={activeCategoryCards.map((c) => c.name)}
            dataValues={activeCategoryCards.map((c) => c.count)}
            customColors={['#10b981', '#ec4899', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#64748b']}
          />
        </div>
      </div>

      {/* Slide-Over POI Inspector Modal (Used only if triggered explicitly) */}
      {inspectPoi && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[inspectPoi.category] || '#3b82f6' }}
                >
                  {inspectPoi.category}
                </span>
                <h3 className="text-base font-bold text-white truncate max-w-[200px]">
                  {inspectPoi.name}
                </h3>
              </div>
              <button onClick={() => setInspectPoi(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
                <span className="text-slate-400 font-semibold">📍 ที่อยู่ / ตำแหน่ง:</span>
                <p className="text-slate-100 font-medium">{inspectPoi.address}</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1">
                <span className="text-slate-400 font-semibold">🚔 สายตรวจผู้รับผิดชอบ:</span>
                <p className="text-indigo-300 font-bold">{inspectPoi.policeSubstation || 'สายตรวจเขต สภ.สะท้อน'}</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1 font-mono">
                <span className="text-slate-400 font-semibold">🌐 พิกัดภูมิศาสตร์ GIS:</span>
                <p className="text-blue-300">{inspectPoi.lat.toFixed(6)}, {inspectPoi.lng.toFixed(6)}</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => handleDispatchPatrol(inspectPoi)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Send className="w-3.5 h-3.5" /> วิทยุสั่งการสายตรวจ
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${inspectPoi.lat},${inspectPoi.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Google Maps
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
