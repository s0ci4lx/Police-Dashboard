import React, { useState, useMemo } from 'react';
import { HAT_YAI_STATION_COORDS } from '../../data/mockInitialData';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { InteractiveMap } from '../map/InteractiveMap';
import type { MapMarkerItem } from '../map/InteractiveMap';
import { Car, AlertOctagon, CheckCircle2, Activity, Radio } from 'lucide-react';

interface TrafficDashboardProps {
  searchQuery: string;
}

interface TrafficJunction {
  id: string;
  name: string;
  status: 'คล่องตัว' | 'ปานกลาง' | 'หนาแน่นสะสม' | 'ติดขัดมาก';
  speed: number; // km/h
  lat: number;
  lng: number;
  officerAssigned: string;
  notes: string;
}

const SAMPLE_TRAFFIC_JUNCTIONS: TrafficJunction[] = [
  { id: 'j-1', name: 'สามแยกคอหงส์ ถ.กาญจนวณิชย์', status: 'หนาแน่นสะสม', speed: 18, lat: 7.0095, lng: 100.4980, officerAssigned: 'ด.ต. สมชาย จราจร', notes: 'รถมุ่งหน้า ม.สงขลานครินทร์ ท้ายแถว 200 เมตร' },
  { id: 'j-2', name: 'สี่แยกวงเวียนน้ำพุ ถ.เพชรเกษม', status: 'ปานกลาง', speed: 32, lat: 7.0125, lng: 100.4690, officerAssigned: 'จ.ส.ต. วิชัย จราจร', notes: 'การจราจรเคลื่อนตัวได้ดีตามสัญญาณไฟ' },
  { id: 'j-3', name: 'สี่แยกคลองเรียน ถ.ศรีภูวนาถ', status: 'คล่องตัว', speed: 45, lat: 6.9985, lng: 100.4812, officerAssigned: 'ส.ต.อ. อภิชาติ จราจร', notes: 'สัญญาณไฟอัตโนมัติทำงานปกติ' },
  { id: 'j-4', name: 'สี่แยกตลาดกิมหยง ถ.ศุภสารรังสรรค์', status: 'หนาแน่นสะสม', speed: 15, lat: 7.0065, lng: 100.4735, officerAssigned: 'ด.ต. ประเสริฐ จราจร', notes: 'ช่วงเวลาซื้อของ ตลาดกิมหยง' },
  { id: 'j-5', name: 'สี่แยกบิ๊กซีคลองแห ถ.ลพบุรีราเมศวร์', status: 'คล่องตัว', speed: 50, lat: 7.0460, lng: 100.4720, officerAssigned: 'จ.ส.ต. ธนา จราจร', notes: 'ทางออกเมืองการจราจรคล่องตัว' },
];

export const TrafficDashboard: React.FC<TrafficDashboardProps> = ({ searchQuery }) => {
  const [junctions] = useState<TrafficJunction[]>(SAMPLE_TRAFFIC_JUNCTIONS);
  const [mapCenter, setMapCenter] = useState(HAT_YAI_STATION_COORDS);

  // Filter junctions
  const filteredJunctions = useMemo(() => {
    if (!searchQuery) return junctions;
    const q = searchQuery.toLowerCase();
    return junctions.filter(
      (j) => j.name.toLowerCase().includes(q) || j.officerAssigned.toLowerCase().includes(q) || j.notes.toLowerCase().includes(q)
    );
  }, [junctions, searchQuery]);

  // Map markers
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredJunctions.map((j) => ({
      id: j.id,
      lat: j.lat,
      lng: j.lng,
      title: j.name,
      category: 'จราจร',
      address: `สถานะ: ${j.status} | ความเร็วเฉลี่ย ${j.speed} km/h`,
      notes: `เจ้าหน้าที่กดไฟ: ${j.officerAssigned}`,
      status: j.status,
      color: j.status === 'หนาแน่นสะสม' || j.status === 'ติดขัดมาก' ? '#ef4444' : j.status === 'ปานกลาง' ? '#f59e0b' : '#10b981',
    }));
  }, [filteredJunctions]);

  // Columns for Table
  const columns: ColumnDef<TrafficJunction>[] = [
    {
      key: 'name',
      header: 'ทางแยกสัญญาณไฟจราจร',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-100">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.notes}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'สภาพการจราจร',
      render: (row) => {
        const isBusy = row.status === 'หนาแน่นสะสม' || row.status === 'ติดขัดมาก';
        return (
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded border inline-block ${
              isBusy
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : row.status === 'ปานกลาง'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'speed',
      header: 'ความเร็วเฉลี่ย',
      render: (row) => <span className="font-mono font-bold text-blue-300">{row.speed} km/h</span>,
    },
    {
      key: 'officerAssigned',
      header: 'เจ้าหน้าที่จราจรประจำจุด',
      render: (row) => (
        <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          {row.officerAssigned}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Banner */}
      <div className="glass-panel bg-gradient-to-r from-amber-600/20 via-blue-900/30 to-slate-950 border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-widest mb-1">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> ศูนย์สั่งการจราจรและจุดเสี่ยงอุบัติเหตุ (Traffic Command)
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              ติดตามงานจราจร สภ.สะท้อน
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              เฝ้าระวังสภาพการจราจรทางแยกหลัก สัญญาณไฟจราจร และสถิติจุดเสี่ยงอุบัติเหตุในพื้นที่
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="ทางแยกสัญญาณไฟจราจร"
          value={junctions.length}
          subtext="ควบคุมผ่านระบบวิทยุ"
          icon={Car}
          colorTheme="blue"
        />
        <KpiCard
          title="จราจรเคลื่อนตัวดี"
          value={junctions.filter((j) => j.status === 'คล่องตัว').length}
          subtext="ไร้ปัญหาการสะสม"
          icon={CheckCircle2}
          colorTheme="emerald"
        />
        <KpiCard
          title="สะสมหนาแน่น"
          value={junctions.filter((j) => j.status === 'หนาแน่นสะสม').length}
          subtext="ต้องการเร่งระบาย"
          icon={AlertOctagon}
          colorTheme="rose"
        />
        <KpiCard
          title="ความเร็วเฉลี่ยเมือง"
          value="32 km/h"
          subtext="สภาวะปกติ"
          icon={Activity}
          colorTheme="amber"
        />
      </div>

      {/* Map */}
      <InteractiveMap
        markers={mapMarkers}
        center={mapCenter}
        zoom={13}
        title="แผนที่พิกัดทางแยกสัญญาณไฟจราจรและสภาพการจราจร"
        height="480px"
        onSelectMarker={(item) => {
          setMapCenter({ lat: item.lat, lng: item.lng, zoom: 16 });
        }}
      />

      {/* Table & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <DataTable
            title="ทะเบียนทางแยกสัญญาณไฟจราจร"
            data={filteredJunctions}
            columns={columns}
            searchPlaceholder="ค้นหาทางแยก, เจ้าหน้าที่..."
            pageSize={6}
            onRowClick={(row) => {
              setMapCenter({ lat: row.lat, lng: row.lng, zoom: 16 });
            }}
          />
        </div>
        <div className="lg:col-span-4">
          <StatChart
            title="สัดส่วนสภาพการจราจรทางแยกหลัก"
            type="pie"
            labels={['คล่องตัว', 'ปานกลาง', 'หนาแน่นสะสม']}
            dataValues={[2, 1, 2]}
            customColors={['#10b981', '#f59e0b', '#ef4444']}
          />
        </div>
      </div>
    </div>
  );
};
