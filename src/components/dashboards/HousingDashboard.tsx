import React, { useState, useEffect, useMemo } from 'react';
import { fetchSheetData, detectLatLongColumns, parseRowLatLng } from '../../services/googleSheetService';
import { InteractiveMap, getCategoryColor } from '../map/InteractiveMap';
import type { MapMarkerItem } from '../map/InteractiveMap';
import { Home, Users, Car, Phone, MapPin } from 'lucide-react';
import { getStation, getDataSource } from '../../config/dataSources';
import { USER_PROVIDED_HOUSING_SHEET_URL } from '../../data/mockInitialData';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import type { HousingItem } from '../../types/dashboard';

interface HousingDashboardProps {
  searchQuery: string;
}

const INSIDE_SUBDISTRICTS = ['สะท้อน', 'ทับช้าง', 'ประกอบ'];

export const HousingDashboard: React.FC<HousingDashboardProps> = ({ searchQuery }) => {
  const [data, setData] = useState<HousingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ทั้งหมด');
  const [mapCenter, setMapCenter] = useState(getStation().center);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const sheetUrl = getDataSource('housing') || USER_PROVIDED_HOUSING_SHEET_URL;
      if (!sheetUrl) throw new Error('ไม่พบลิงก์ Google Sheet สำหรับบ้านพักตำรวจ');
      const { data: rawData, columns } = await fetchSheetData<Record<string, any>>(sheetUrl);
      const { latCol, lngCol, combinedCol } = detectLatLongColumns(columns);

      if (rawData && rawData.length > 0) {
        const rankCol = columns.find((c) => c.includes('ยศ')) || '';
        const fNameCol = columns.find((c) => c === 'ชื่อ' || c.includes('ชื่อ')) || '';
        const lNameCol = columns.find((c) => c.includes('สกลุ') || c.includes('สกุล')) || '';
        const posCol = columns.find((c) => c.includes('ตำแหน่ง')) || '';
        const agencyCol = columns.find((c) => c.includes('สังกัด')) || '';
        const addrCol = columns.find((c) => c.includes('ที่พัก')) || '';
        const subDistCol = columns.find((c) => c.includes('ตำบล')) || '';
        const distCol = columns.find((c) => c.includes('อำเภอ')) || '';
        const provCol = columns.find((c) => c.includes('จังหวัด')) || '';
        const vehicleCol = columns.find((c) => c.includes('ยานพาหนะ')) || '';
        const phoneCol = columns.find((c) => c.includes('เบอร์โทร')) || '';

        const parsedData: HousingItem[] = rawData.map((row, idx) => {
          const { lat, lng } = parseRowLatLng(row, latCol, lngCol, combinedCol);
          return {
            id: `housing-${idx + 1}`,
            no: idx + 1,
            rank: String(row[rankCol] || '').trim(),
            firstName: String(row[fNameCol] || '').trim(),
            lastName: String(row[lNameCol] || '').trim(),
            position: String(row[posCol] || '-').trim(),
            agency: String(row[agencyCol] || '-').trim(),
            address: String(row[addrCol] || '-').trim(),
            subdistrict: String(row[subDistCol] || 'ไม่ระบุ').trim(),
            district: String(row[distCol] || 'ไม่ระบุ').trim(),
            province: String(row[provCol] || 'ไม่ระบุ').trim(),
            lat: lat || getStation().center.lat,
            lng: lng || getStation().center.lng,
            vehicle: String(row[vehicleCol] || '-').trim(),
            phone: String(row[phoneCol] || '-').trim(),
          };
        }).filter(item => item.firstName && item.lastName); // Ensure valid entries
        
        setData(parsedData);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Data based on selected Filter and Search Query
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const isWelfare = item.address.includes('บ้านพัก') || item.address.includes('แฟลต') || item.address.includes('สภ.');
      const hasVehicle = item.vehicle && item.vehicle !== '-' && item.vehicle.trim().length > 2;

      if (selectedFilter === 'ในเขตพื้นที่') {
        if (!INSIDE_SUBDISTRICTS.includes(item.subdistrict)) return false;
      } else if (selectedFilter === 'นอกเขตพื้นที่') {
        if (INSIDE_SUBDISTRICTS.includes(item.subdistrict)) return false;
      } else if (selectedFilter === 'บ้านพักหลวง') {
        if (!isWelfare) return false;
      } else if (selectedFilter === 'บ้านพักส่วนตัว') {
        if (isWelfare) return false;
      } else if (selectedFilter === 'มียานพาหนะ') {
        if (!hasVehicle) return false;
      } else if (selectedFilter !== 'ทั้งหมด' && item.subdistrict !== selectedFilter) {
        return false;
      }

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.firstName.toLowerCase().includes(q) ||
        item.lastName.toLowerCase().includes(q) ||
        item.position.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.vehicle.toLowerCase().includes(q)
      );
    });
  }, [data, selectedFilter, searchQuery]);

  // Center Map dynamically based on filtered data
  useEffect(() => {
    if (filteredData.length > 0 && selectedFilter !== 'ทั้งหมด') {
      const validPoints = filteredData.filter((p) => p.lat !== getStation().center.lat || p.lng !== getStation().center.lng);
      if (validPoints.length > 0) {
        const sumLat = validPoints.reduce((sum, p) => sum + p.lat, 0);
        const sumLng = validPoints.reduce((sum, p) => sum + p.lng, 0);
        setMapCenter({
          lat: sumLat / validPoints.length,
          lng: sumLng / validPoints.length,
          zoom: 13,
        });
      }
    } else {
      setMapCenter(getStation().center);
    }
  }, [filteredData, selectedFilter]);

  // KPI breakdown
  const kpiStats = useMemo(() => {
    let inside = 0, outside = 0, welfare = 0, privateHouse = 0, vehicle = 0;
    data.forEach((item) => {
      const isWelfare = item.address.includes('บ้านพัก') || item.address.includes('แฟลต') || item.address.includes('สภ.');
      const hasVehicle = item.vehicle && item.vehicle !== '-' && item.vehicle.trim().length > 2;

      if (INSIDE_SUBDISTRICTS.includes(item.subdistrict)) inside++;
      else outside++;

      if (isWelfare) welfare++;
      else privateHouse++;

      if (hasVehicle) vehicle++;
    });
    return { inside, outside, welfare, privateHouse, vehicle };
  }, [data]);

  // Inside/Outside Breakdown for Doughnut Chart
  const inOutBreakdown = useMemo(() => {
    return [
      { label: 'ในเขตพื้นที่', count: kpiStats.inside, color: '#10b981' },
      { label: 'นอกเขตพื้นที่', count: kpiStats.outside, color: '#f43f5e' }
    ];
  }, [kpiStats]);

  // Map Markers
  const getSubdistrictColor = (sd: string) => getCategoryColor(sd);
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredData.map((item) => ({
      id: item.id,
      lat: item.lat,
      lng: item.lng,
      title: `${item.rank}${item.firstName} ${item.lastName}`,
      category: item.subdistrict,
      address: item.address,
      notes: `ตำแหน่ง: ${item.position}`,
      type: item.vehicle !== '-' ? `รถ: ${item.vehicle}` : undefined,
      status: `โทร: ${item.phone}`,
      color: getSubdistrictColor(item.subdistrict),
      rawData: item,
    }));
  }, [filteredData]);

  // Data Table Columns
  const columns: ColumnDef<HousingItem>[] = [
    {
      key: 'name',
      header: 'ชื่อ - นามสกุล',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-100">{`${row.rank}${row.firstName} ${row.lastName}`}</div>
          <div className="text-[11px] text-blue-300 font-semibold">{row.position}</div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'ที่พักอาศัย',
      render: (row) => (
        <div>
          <div className="text-slate-200 text-[13px]">{row.address}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">ต.{row.subdistrict} อ.{row.district} จ.{row.province}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'ติดต่อ / พาหนะ',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] text-slate-200">
            <Phone className="w-3.5 h-3.5 text-emerald-400" /> {row.phone}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Car className="w-3.5 h-3.5 text-amber-400" /> {row.vehicle}
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-rose-400 space-y-3 bg-slate-900/50 rounded-2xl border border-rose-500/20 p-8">
        <div className="p-3 bg-rose-500/10 rounded-full">
          <Home className="w-8 h-8" />
        </div>
        <p className="font-medium text-center">{errorMsg}</p>
        <button onClick={loadData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors">
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard
          title="บุคลากรทั้งหมด"
          value={data.length}
          subtext="ที่มีข้อมูลที่พัก"
          icon={Users}
          colorTheme="blue"
          isActive={selectedFilter === 'ทั้งหมด'}
          onClick={() => setSelectedFilter('ทั้งหมด')}
        />
        <KpiCard
          title="ในเขตพื้นที่"
          value={kpiStats.inside}
          subtext="รับผิดชอบ สภ."
          icon={MapPin}
          colorTheme="emerald"
          isActive={selectedFilter === 'ในเขตพื้นที่'}
          onClick={() => setSelectedFilter('ในเขตพื้นที่')}
        />
        <KpiCard
          title="นอกเขตพื้นที่"
          value={kpiStats.outside}
          subtext="นอกเขต สภ."
          icon={MapPin}
          colorTheme="rose"
          isActive={selectedFilter === 'นอกเขตพื้นที่'}
          onClick={() => setSelectedFilter('นอกเขตพื้นที่')}
        />
        <KpiCard
          title="บ้านพักหลวง"
          value={kpiStats.welfare}
          subtext="สวัสดิการ / แฟลต"
          icon={Home}
          colorTheme="amber"
          isActive={selectedFilter === 'บ้านพักหลวง'}
          onClick={() => setSelectedFilter('บ้านพักหลวง')}
        />
        <KpiCard
          title="บ้านส่วนตัว"
          value={kpiStats.privateHouse}
          subtext="ที่อยู่อาศัยส่วนตัว"
          icon={Home}
          colorTheme="purple"
          isActive={selectedFilter === 'บ้านพักส่วนตัว'}
          onClick={() => setSelectedFilter('บ้านพักส่วนตัว')}
        />
        <KpiCard
          title="มียานพาหนะ"
          value={kpiStats.vehicle}
          subtext="ส่วนตัวพร้อมใช้"
          icon={Car}
          colorTheme="indigo"
          isActive={selectedFilter === 'มียานพาหนะ'}
          onClick={() => setSelectedFilter('มียานพาหนะ')}
        />
      </div>

      {/* Interactive Map */}
      <InteractiveMap
        markers={mapMarkers}
        center={mapCenter}
        zoom={selectedFilter === 'ทั้งหมด' ? 12 : 13}
        title={`แผนที่บ้านพักตำรวจ (${mapMarkers.length.toLocaleString('th-TH')} ตำแหน่ง)`}
        height="500px"
        enableClustering={true}
        selectedMarkerId={selectedMarkerId || undefined}
        onSelectMarker={(m) => setSelectedMarkerId(m.id)}
        onClearSelection={() => setSelectedMarkerId(null)}
      />

      {/* Data Table & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <DataTable
            title="บัญชีรายชื่อบ้านพักและพาหนะ"
            data={filteredData}
            columns={columns}
            searchPlaceholder="ค้นหาชื่อ, ตำแหน่ง, ที่อยู่, ทะเบียนรถ..."
            pageSize={10}
            onRowClick={(row) => {
              setSelectedMarkerId(row.id);
              setMapCenter({ lat: row.lat, lng: row.lng, zoom: 16 });
            }}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <StatChart
            title="สัดส่วนบ้านพัก (ในเขต / นอกเขต)"
            type="doughnut"
            labels={inOutBreakdown.map((d) => d.label)}
            dataValues={inOutBreakdown.map((d) => d.count)}
            customColors={inOutBreakdown.map((d) => d.color)}
            onSegmentClick={(label) => setSelectedFilter(label)}
          />
        </div>
      </div>
    </div>
  );
};
