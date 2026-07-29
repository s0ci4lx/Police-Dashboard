import React, { useState, useEffect, useMemo } from 'react';
import type { DynamicPageConfig } from '../../types/dashboard';
import { fetchSheetData, detectLatLongColumns } from '../../services/googleSheetService';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { InteractiveMap } from '../map/InteractiveMap';
import type { MapMarkerItem } from '../map/InteractiveMap';
import { Table, RefreshCw, MapPin, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface GenericSheetDashboardProps {
  pageConfig: DynamicPageConfig;
  searchQuery: string;
}

export const GenericSheetDashboard: React.FC<GenericSheetDashboardProps> = ({
  pageConfig,
  searchQuery,
}) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latCol, setLatCol] = useState<string | undefined>();
  const [lngCol, setLngCol] = useState<string | undefined>();

  // Fetch sheet data
  const loadSheetData = async () => {
    if (!pageConfig.sheetUrl) {
      setError('ไม่พบบันทึก URL ของ Google Sheet');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchSheetData<Record<string, any>>(pageConfig.sheetUrl);
      setData(result.data);
      setColumns(result.columns);

      // Auto detect lat/lng
      const detected = detectLatLongColumns(result.columns);
      setLatCol(pageConfig.latColumn || detected.latCol);
      setLngCol(pageConfig.lngColumn || detected.lngCol);
    } catch (err: any) {
      console.error('Error fetching sheet:', err);
      setError(err.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ โปรดตรวจสอบการแชร์สิทธิ์');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheetData();
  }, [pageConfig.sheetUrl]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((val) =>
        String(val || '')
          .toLowerCase()
          .includes(q)
      )
    );
  }, [data, searchQuery]);

  // Generate Map Markers if Lat/Lng exist
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    if (!latCol || !lngCol) return [];
    const markers: MapMarkerItem[] = [];

    filteredRows.forEach((row, idx) => {
      const lat = parseFloat(String(row[latCol]));
      const lng = parseFloat(String(row[lngCol]));
      if (!isNaN(lat) && !isNaN(lng)) {
        const titleKey = columns.find((c) => c !== latCol && c !== lngCol) || columns[0];
        const title = String(row[titleKey] || `รายการ #${idx + 1}`);

        markers.push({
          id: `row-${idx}`,
          lat,
          lng,
          title,
          category: pageConfig.title,
          address: String(row[columns[1]] || ''),
          notes: String(row[columns[2]] || ''),
          color: '#3b82f6',
          rawData: row,
        });
      }
    });

    return markers;
  }, [filteredRows, latCol, lngCol, columns, pageConfig.title]);

  // Dynamic Column Definitions
  const tableColumns: ColumnDef<Record<string, any>>[] = useMemo(() => {
    return columns.slice(0, 7).map((col) => ({
      key: col,
      header: col,
      render: (row) => {
        const val = row[col];
        if (col === latCol || col === lngCol) {
          return <span className="font-mono text-blue-400 text-xs">{val || '-'}</span>;
        }
        return <span className="text-slate-200 text-xs">{String(val ?? '-')}</span>;
      },
    }));
  }, [columns, latCol, lngCol]);

  // Category breakdown for Chart
  const categoryChartData = useMemo(() => {
    if (!columns.length) return { labels: [], dataValues: [] };
    const firstNonKeyCol = columns.find((c) => c !== latCol && c !== lngCol) || columns[0];
    const map: Record<string, number> = {};

    data.forEach((row) => {
      const cat = String(row[firstNonKeyCol] || 'อื่นๆ').trim();
      if (cat) map[cat] = (map[cat] || 0) + 1;
    });

    const entries = Object.entries(map).slice(0, 6);
    return {
      labels: entries.map((e) => e[0]),
      dataValues: entries.map((e) => e[1]),
    };
  }, [data, columns, latCol, lngCol]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Banner */}
      <div className="glass-panel bg-gradient-to-r from-blue-600/20 via-slate-800 to-slate-900 border border-blue-500/30 rounded-2xl p-4 lg:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-widest mb-1">
            <FileSpreadsheet className="w-4 h-4 text-blue-400" /> แดชบอร์ดนำเข้า Google Sheet สายงาน {pageConfig.department}
          </div>
          <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
            {pageConfig.title}
          </h2>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
            <span>🔗 แหล่งข้อมูล:</span>
            <a
              href={pageConfig.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline font-mono text-[11px] truncate max-w-sm"
            >
              {pageConfig.sheetUrl}
            </a>
          </p>
        </div>

        <button
          onClick={loadSheetData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>ดึงข้อมูลล่าสุด</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="จำนวนข้อมูลทั้งหมด"
          value={data.length}
          subtext="รายการจาก Google Sheet"
          icon={Table}
          colorTheme="blue"
        />
        <KpiCard
          title="คอลัมน์ข้อมูล"
          value={columns.length}
          subtext="ตรวจพบโครงสร้างฟิลด์"
          icon={FileSpreadsheet}
          colorTheme="indigo"
        />
        <KpiCard
          title="หมุดพิกัด GIS"
          value={mapMarkers.length}
          subtext={latCol && lngCol ? `ละติจูด/ลองจิจูด (${latCol}, ${lngCol})` : 'ไม่พบพิกัด Lat/Lng'}
          icon={MapPin}
          colorTheme={mapMarkers.length > 0 ? 'emerald' : 'slate'}
        />
        <KpiCard
          title="สายงานรับผิดชอบ"
          value={pageConfig.department}
          subtext="หน้าแดชบอร์ด custom"
          icon={Table}
          colorTheme="purple"
        />
      </div>

      {/* Render Map if markers exist */}
      {mapMarkers.length > 0 && (
        <InteractiveMap
          markers={mapMarkers}
          center={{ lat: mapMarkers[0].lat, lng: mapMarkers[0].lng }}
          zoom={13}
          title={`แผนที่หมุดปักพิกัด (${pageConfig.title})`}
          height="450px"
        />
      )}

      {/* Table & Chart Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className={categoryChartData.labels.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <DataTable
            title={`ตารางข้อมูล (${pageConfig.title})`}
            data={filteredRows}
            columns={tableColumns}
            searchPlaceholder="ค้นหาในทุกคอลัมน์..."
            pageSize={8}
          />
        </div>

        {categoryChartData.labels.length > 0 && (
          <div className="lg:col-span-4">
            <StatChart
              title="สัดส่วนสรุปข้อมูล"
              type="pie"
              labels={categoryChartData.labels}
              dataValues={categoryChartData.dataValues}
            />
          </div>
        )}
      </div>
    </div>
  );
};
