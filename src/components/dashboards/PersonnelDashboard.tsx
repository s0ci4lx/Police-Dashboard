import React, { useState, useEffect, useMemo } from 'react';
import type { PersonnelItem } from '../../types/dashboard';
import { USER_PROVIDED_PERSONNEL_SHEET_URL } from '../../data/mockInitialData';
import { getDataSource } from '../../config/dataSources';
import { fetchSheetData } from '../../services/googleSheetService';
import { KpiCard } from '../common/KpiCard';
import { StatChart } from '../common/StatChart';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import {
  Users,
  UserCheck,
  UserMinus,
  ShieldCheck,
  RefreshCw,
  X,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  AlertTriangle,
  Gauge,
  ListFilter,
  Layers,
  Info,
  Table as TableIcon,
} from 'lucide-react';

interface PersonnelDashboardProps {
  searchQuery: string;
}

const POSITION_DUTIES: Record<string, string> = {
  'ผกก.': 'ผู้บังคับการสถานีตำรวจภูธรสะท้อน รับผิดชอบบริหารราชการ สั่งการ ควบคุม กำกับดูแลทุกสายงานในสังกัด',
  'รอง ผกก.ป.': 'ผู้ช่วยผู้บังคับการสายงานป้องกันปราบปราม บริหารตู้ยาม สายตรวจรถยนต์/รถจักรยานยนต์ แผนระงับเหตุฉุกเฉิน',
  'รอง ผกก.(สอบสวน)': 'ควบคุม กำกับดูแล คดีอาญา คดีจราจร ตรวจสอบความถูกต้องของสำนวนสอบสวนเสนออัยการ',
  'รอง ผกก.สส.': 'บริหารงานสืบสวน การข่าวกรอง ติดตามจับกุมผู้ต้องหาตามหมายจับ และคดีอาชญากรรมร้ายแรง',
  'สว.อก.': 'หัวหน้างานอำนวยการ/ธุรการ บริหารงานเอกสาร สารบรรณ งบประมาณ กำลังพล และงานสวัสดิการ',
  'สวป.': 'ผู้บังคับบัญชาสายตรวจ จัดชุดปฏิบัติการตรวจพื้นที่เสี่ยง ตั้งจุดตรวจ/จุดสกัด รักษาความสงบเรียบร้อย',
  'สว.สส.': 'หัวหน้าชุดสืบสวน แกะรอยกล้องวงจรปิด วิเคราะห์พฤติการณ์ผู้กระทำผิด ค้นหาทรัพย์สินคืนผู้เสียหาย',
  'สว.จร.': 'หัวหน้างานจราจร กรองและบริหารไฟสัญญาณจราจรทางแยกหลัก การแก้ไขปัญหาจราจรติดขัดสะสม',
  'สว.สอบสวน': 'พนักงานสอบสวนผู้มีอำนาจสอบสวนคดีอาญา รับคำร้องทุกข์ รวบรวมหลักฐาน ทำความเห็นทางคดี',
  'รอง สวป.': 'นายตำรวจสายตรวจสัญญาบัตร ควบคุมการปฏิบัติของสายตรวจรถยนต์/จักรยานยนต์ เข้าระงับเหตุ 191',
  'รอง สว.(สอบสวน)': 'พนักงานสอบสวน รับแจ้งความ บันทึกประจำวัน รวบรวมพยานหลักฐาน สอบปากคำผู้เสียหาย/ผู้ต้องหา',
  'งานป้องกันฯ': 'กำลังพลสายตรวจปฏิบัติการ 24 ชั่วโมง เฝ้าระวังจุดเสี่ยง ตรวจตู้แดง และระงับเหตุการณ์ฉุกเฉิน',
  'งานจราจร': 'เจ้าหน้าที่จราจรประจำจุดกดไฟทางแยก ควบคุมการจราจรหน้าโรงเรียน/ตลาดกิมหยง บังคับใช้กฎหมาย',
  'งานสืบสวน': 'เจ้าหน้าที่สืบสวนภาคสนาม ลงพื้นที่หาข่าว ตรวจสอบกล้อง CCTV รวบรวมพยานหลักฐานคดีอาญา',
  'งานธุรการ': 'เจ้าหน้าที่งานสารบรรณ พัฒนาระบบสารสนเทศ ออกหนังสือราชการ บริหารกำลังพล และพัสดุ',
  'ผู้ช่วยพนักงานสอบสวน': 'สนับสนุนงานสอบสวน จัดเตรียมเอกสาร คีย์ข้อมูลระบบสารสนเทศคดี ประสานงานพิสูจน์หลักฐาน',
};

// Fallback data (mirror of the live sheet) so the page always renders if the fetch fails
const FALLBACK_PERSONNEL: Array<[string, number, number, number, number, number, number]> = [
  // position, authorized, assigned, vacant, detachedIn, detachedOut, effective
  ['ผกก.', 1, 1, 0, 0, 0, 1],
  ['รอง ผกก.ป.', 1, 1, 0, 0, 0, 1],
  ['รอง ผกก.(สอบสวน)', 4, 4, 0, 0, 0, 4],
  ['รอง ผกก.สส.', 1, 1, 0, 0, 0, 1],
  ['สว.อก.', 1, 1, 0, 0, 0, 1],
  ['สวป.', 3, 3, 0, 0, 0, 3],
  ['สว.สส.', 2, 2, 0, 0, 0, 2],
  ['สว.จร.', 1, 1, 0, 0, 0, 1],
  ['สว.สอบสวน', 9, 8, 1, 1, 0, 9],
  ['รอง สว.ธร.', 1, 1, 0, 0, 0, 1],
  ['รอง สวป.', 21, 10, 11, 0, 0, 10],
  ['รอง สว.สส.', 6, 3, 3, 0, 0, 3],
  ['รอง สว.จร.', 3, 2, 1, 0, 0, 2],
  ['รอง สว.(สอบสวน)', 33, 12, 21, 0, 0, 12],
  ['งานธุรการ', 5, 1, 4, 0, 0, 1],
  ['งานป้องกันฯ', 179, 168, 11, 2, 0, 170],
  ['งานจราจร', 53, 53, 0, 0, 1, 52],
  ['งานสืบสวน', 28, 24, 4, 0, 0, 24],
  ['ผู้ช่วยพนักงานสอบสวน', 17, 14, 3, 0, 0, 14],
];

const buildFallback = (): PersonnelItem[] =>
  FALLBACK_PERSONNEL.map(([position, authorized, assigned, vacant, detachedIn, detachedOut, effectiveTotal], idx) => ({
    id: `fb-${idx + 1}`,
    no: idx + 1,
    position,
    authorized,
    assigned,
    vacant,
    detachedIn,
    detachedOut,
    effectiveTotal,
    category: groupOf(position).label,
  }));

// Meaningful grouping (checks "รอง สว" BEFORE "สว." so junior officers aren't mis-grouped)
type GroupKey = 'command' | 'deputy' | 'operational';
function groupOf(position: string): { key: GroupKey; label: string } {
  if (position.includes('รอง สว')) return { key: 'deputy', label: 'รองสารวัตร (สัญญาบัตร)' };
  if (position.includes('ผกก') || position.includes('สว')) return { key: 'command', label: 'ผู้บังคับบัญชา / สารวัตร' };
  return { key: 'operational', label: 'สายปฏิบัติการ (ชั้นประทวน)' };
}

const GROUP_ORDER: GroupKey[] = ['command', 'deputy', 'operational'];
const GROUP_META: Record<GroupKey, { label: string; color: string }> = {
  command: { label: 'ผู้บังคับบัญชา / สารวัตร', color: '#6366f1' },
  deputy: { label: 'รองสารวัตร (สัญญาบัตร)', color: '#0ea5e9' },
  operational: { label: 'สายปฏิบัติการ (ชั้นประทวน)', color: '#10b981' },
};

// Colour scale for how full a position is
function fillStyle(pct: number) {
  if (pct >= 95) return { bar: '#10b981', text: 'text-emerald-300', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'เต็มอัตรา' };
  if (pct >= 80) return { bar: '#38bdf8', text: 'text-sky-300', chip: 'bg-sky-500/15 text-sky-300 border-sky-500/30', label: 'เพียงพอ' };
  if (pct >= 60) return { bar: '#f59e0b', text: 'text-amber-300', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'ควรเติม' };
  return { bar: '#f43f5e', text: 'text-rose-300', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30', label: 'วิกฤต' };
}

const pctOf = (p: PersonnelItem) => (p.authorized > 0 ? (p.assigned / p.authorized) * 100 : 100);

// One position rendered as a proportional staffing bar
const StaffingRow: React.FC<{ p: PersonnelItem; onClick: () => void }> = ({ p, onClick }) => {
  const pct = pctOf(p);
  const st = fillStyle(pct);
  const net = p.detachedIn - p.detachedOut;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition-all group"
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[13px] font-bold text-slate-100 truncate">{p.position}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[12px] text-slate-300">
            <span className={st.text + ' font-extrabold'}>{p.assigned}</span>
            <span className="text-slate-500"> / {p.authorized}</span>
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${st.chip}`}>{pct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Proportional bar: filled (assigned) + vacant remainder */}
      <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex ring-1 ring-slate-800">
        <div
          className="h-full rounded-l-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: st.bar }}
          title={`คนครอง ${p.assigned}`}
        />
        {p.vacant > 0 && (
          <div
            className="h-full personnel-hatch"
            style={{ width: `${100 - pct}%` }}
            title={`ว่าง ${p.vacant}`}
          />
        )}
      </div>

      {/* Sub-line: vacancy + secondment flow → effective */}
      <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] font-mono">
        <span className="text-slate-400">
          {p.vacant > 0 ? <span className="text-rose-400 font-bold">ว่าง {p.vacant}</span> : <span className="text-emerald-400">ครบอัตรา</span>}
          {(p.detachedIn > 0 || p.detachedOut > 0) && (
            <>
              {p.detachedIn > 0 && <span className="text-emerald-400"> · +{p.detachedIn} มาช่วย</span>}
              {p.detachedOut > 0 && <span className="text-rose-400"> · −{p.detachedOut} ไปช่วย</span>}
            </>
          )}
        </span>
        <span className="text-slate-300">
          ปฏิบัติจริง <span className="font-bold text-cyan-300">{p.effectiveTotal}</span>
          {net !== 0 && <span className={net > 0 ? 'text-emerald-400' : 'text-rose-400'}> ({net > 0 ? '+' : ''}{net})</span>}
        </span>
      </div>
    </button>
  );
};

export const PersonnelDashboard: React.FC<PersonnelDashboardProps> = ({ searchQuery }) => {
  const [personnelData, setPersonnelData] = useState<PersonnelItem[]>(buildFallback());
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelItem | null>(null);
  const [sortMode, setSortMode] = useState<'structure' | 'shortage'>('structure');
  const [viewMode, setViewMode] = useState<'table' | 'board'>('table');

  const loadPersonnelSheetData = async () => {
    setLoading(true);
    setSyncStatusMsg('');
    try {
      const sheetUrl = getDataSource('personnel') || USER_PROVIDED_PERSONNEL_SHEET_URL;
      const { data, columns } = await fetchSheetData<Record<string, any>>(sheetUrl);

      if (data && data.length > 0) {
        const posCol = columns.find((c) => c.includes('ระดับ') || c.includes('ตำแหน่ง')) || columns[1] || columns[0];
        const authCol = columns.find((c) => c.includes('อนุญาต')) || columns[2];
        const assignedCol = columns.find((c) => c.includes('คนครอง')) || columns[3];
        const vacantCol = columns.find((c) => c.includes('ว่าง')) || columns[4];
        const inCol = columns.find((c) => c.includes('มาช่วย')) || columns[5];
        const outCol = columns.find((c) => c.includes('ไปช่วย')) || columns[6];
        const effCol = columns.find((c) => c.includes('กำลังคงเหลือ') || c.includes('คงเหลือ')) || columns[7];

        const parseNum = (val: any): number => {
          if (!val) return 0;
          const cleaned = String(val).replace(/,/g, '').trim();
          const n = parseInt(cleaned, 10);
          return isNaN(n) ? 0 : n;
        };

        const mapped: PersonnelItem[] = data
          .filter((row) => row[posCol] && String(row[posCol]).trim() !== '')
          .map((row, idx) => {
            const posStr = String(row[posCol]).trim();
            return {
              id: `p-${idx + 1}`,
              no: idx + 1,
              position: posStr,
              authorized: parseNum(row[authCol]),
              assigned: parseNum(row[assignedCol]),
              vacant: parseNum(row[vacantCol]),
              detachedIn: parseNum(row[inCol]),
              detachedOut: parseNum(row[outCol]),
              effectiveTotal: parseNum(row[effCol]),
              category: groupOf(posStr).label,
            };
          });

        setPersonnelData(mapped);
        setSyncStatusMsg(`✅ ดึงข้อมูลกำลังพลเรียลไทม์สำเร็จ ทั้งหมด ${mapped.length} สายงาน/ตำแหน่ง!`);
      }
    } catch (err: any) {
      console.warn('Failed to load personnel sheet:', err);
      setSyncStatusMsg('⚠️ ไม่สามารถอ่านจาก Google Sheet ได้ — กำลังแสดงชุดข้อมูลสำรองล่าสุด');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnelSheetData();
  }, []);

  // Search filter
  const filteredData = useMemo(() => {
    if (!searchQuery) return personnelData;
    const q = searchQuery.toLowerCase();
    return personnelData.filter((item) => item.position.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }, [personnelData, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    const t = { totalAuth: 0, totalAssigned: 0, totalVacant: 0, totalDetachedIn: 0, totalDetachedOut: 0, totalEffective: 0 };
    personnelData.forEach((p) => {
      t.totalAuth += p.authorized;
      t.totalAssigned += p.assigned;
      t.totalVacant += p.vacant;
      t.totalDetachedIn += p.detachedIn;
      t.totalDetachedOut += p.detachedOut;
      t.totalEffective += p.effectiveTotal;
    });
    return { ...t, fillRate: t.totalAuth > 0 ? (t.totalAssigned / t.totalAuth) * 100 : 0 };
  }, [personnelData]);

  // Grouped for the staffing list
  const grouped = useMemo(() => {
    return GROUP_ORDER.map((key) => {
      let items = filteredData.filter((p) => groupOf(p.position).key === key);
      if (sortMode === 'shortage') items = [...items].sort((a, b) => pctOf(a) - pctOf(b));
      const auth = items.reduce((s, p) => s + p.authorized, 0);
      const assigned = items.reduce((s, p) => s + p.assigned, 0);
      return { key, meta: GROUP_META[key], items, auth, assigned, vacant: auth - assigned };
    }).filter((g) => g.items.length > 0);
  }, [filteredData, sortMode]);

  // Critical shortages (worst fill rates with real vacancies)
  const critical = useMemo(() => {
    return personnelData
      .filter((p) => p.vacant > 0)
      .sort((a, b) => pctOf(a) - pctOf(b))
      .slice(0, 6);
  }, [personnelData]);

  // Chart data — where the manpower actually sits, by rank group
  const assignedByGroup = useMemo(() => {
    const acc: Record<GroupKey, number> = { command: 0, deputy: 0, operational: 0 };
    personnelData.forEach((p) => {
      acc[groupOf(p.position).key] += p.assigned;
    });
    return acc;
  }, [personnelData]);

  // Columns for the overview table
  const columns: ColumnDef<PersonnelItem>[] = [
    {
      key: 'position',
      header: 'ตำแหน่ง / สายงาน',
      render: (p) => (
        <div>
          <div className="font-bold text-slate-100">{p.position}</div>
          <div className="text-[10px] text-slate-500">{groupOf(p.position).label}</div>
        </div>
      ),
    },
    { key: 'authorized', header: 'กรอบ', render: (p) => <span className="font-mono font-bold text-blue-300">{p.authorized}</span> },
    { key: 'assigned', header: 'ครองจริง', render: (p) => <span className="font-mono font-bold text-emerald-300">{p.assigned}</span> },
    {
      key: 'vacant',
      header: 'ว่าง',
      render: (p) => <span className={`font-mono font-bold ${p.vacant > 0 ? 'text-rose-300' : 'text-slate-500'}`}>{p.vacant > 0 ? p.vacant : '-'}</span>,
    },
    {
      key: 'detachedIn',
      header: 'ช่วย รชก.',
      render: (p) => (
        <span className="font-mono text-[11px]">
          {p.detachedIn > 0 && <span className="text-emerald-400">+{p.detachedIn}</span>}
          {p.detachedIn > 0 && p.detachedOut > 0 && ' / '}
          {p.detachedOut > 0 && <span className="text-rose-400">−{p.detachedOut}</span>}
          {p.detachedIn === 0 && p.detachedOut === 0 && <span className="text-slate-500">-</span>}
        </span>
      ),
    },
    { key: 'effectiveTotal', header: 'ปฏิบัติจริง', render: (p) => <span className="font-mono font-bold text-cyan-300">{p.effectiveTotal}</span> },
    {
      key: 'fill',
      header: '% ครอง',
      render: (p) => {
        const pct = pctOf(p);
        const st = fillStyle(pct);
        return <span className={`px-2 py-0.5 rounded border font-bold text-[11px] ${st.chip}`}>{pct.toFixed(0)}%</span>;
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Banner */}
      <div className="glass-panel bg-gradient-to-r from-blue-900/40 via-cyan-950 to-slate-950 border border-blue-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-widest mb-1">
              <Users className="w-4 h-4 text-cyan-400" /> สารสนเทศบริหารจัดการกำลังพล (Police Personnel Dashboard)
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              อัตรากำลังพล สภ.สะท้อน
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              กรอบอนุญาต <b className="text-blue-300">{totals.totalAuth} อัตรา</b> · บรรจุจริง{' '}
              <b className="text-emerald-300">{totals.totalAssigned} นาย</b> · ว่าง{' '}
              <b className="text-rose-300">{totals.totalVacant} อัตรา</b>
            </p>
          </div>

          <button
            onClick={loadPersonnelSheetData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ซิงค์กำลังพลเรียลไทม์</span>
          </button>
        </div>

        {/* How-to-read formula strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-bold text-slate-300">
            <Info className="w-3.5 h-3.5 text-cyan-400" /> วิธีอ่าน:
          </span>
          <span className="font-mono">
            <b className="text-blue-300">กรอบอนุญาต</b> = <span className="text-emerald-300">คนครอง</span> +{' '}
            <span className="text-rose-300">ว่าง</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono">
            <b className="text-cyan-300">ปฏิบัติจริง</b> = <span className="text-emerald-300">คนครอง</span> +{' '}
            <span className="text-emerald-400">มาช่วยราชการ</span> − <span className="text-rose-400">ไปช่วยราชการ</span>
          </span>
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-blue-300">{syncStatusMsg}</div>
      )}

      {/* KPI Cards + overall fill gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <KpiCard title="กรอบอัตราอนุญาต" value={totals.totalAuth} subtext="อัตรากำลังทั้งหมด" icon={Users} colorTheme="blue" />
          <KpiCard
            title="คนครองจริง"
            value={totals.totalAssigned}
            subtext={`คิดเป็น ${totals.fillRate.toFixed(1)}% ของกรอบ`}
            icon={UserCheck}
            colorTheme="emerald"
          />
          <KpiCard title="ตำแหน่งว่าง / ขาดแคลน" value={totals.totalVacant} subtext="รอการแต่งตั้งโยกย้าย" icon={UserMinus} colorTheme="rose" />
          <KpiCard
            title="ปฏิบัติงานจริงสุทธิ"
            value={totals.totalEffective}
            subtext={`มาช่วย +${totals.totalDetachedIn} / ไปช่วย −${totals.totalDetachedOut}`}
            icon={ShieldCheck}
            colorTheme="indigo"
          />
        </div>

        {/* Overall fill gauge */}
        <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            <Gauge className="w-4 h-4 text-cyan-400" /> อัตราการบรรจุกำลังพลรวม
          </div>
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="12" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={fillStyle(totals.fillRate).bar}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(totals.fillRate / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-white">{totals.fillRate.toFixed(0)}%</span>
              <span className="text-[10px] text-slate-400">{totals.totalAssigned}/{totals.totalAuth} อัตรา</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 text-center">
            ยังขาดอีก <b className="text-rose-300">{totals.totalVacant} อัตรา</b> จึงจะเต็มกรอบ
          </p>
        </div>
      </div>

      {/* Main: staffing bars (grouped) + critical shortage panel */}
      {/* View toggle */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400 font-mono">{filteredData.length} ตำแหน่ง/สายงาน</span>
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'table' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <TableIcon className="w-3.5 h-3.5" /> ตาราง
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${viewMode === 'board' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Layers className="w-3.5 h-3.5" /> แถบกำลังพล
          </button>
        </div>
      </div>

      {/* Item listing: table (default) or staffing bars */}
      {viewMode === 'table' ? (
        <DataTable
          title="ตารางสรุปอัตรากำลังพล (คลิกแถวเพื่อดูรายละเอียด)"
          data={filteredData}
          columns={columns}
          searchPlaceholder="ค้นหาตำแหน่ง / สายงาน..."
          pageSize={25}
          onRowClick={(row) => setSelectedPersonnel(row)}
          showActionColumn={false}
        />
      ) : (
        <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> ผังอัตรากำลังรายตำแหน่ง
            </h3>
            {/* Sort toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setSortMode('structure')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${
                  sortMode === 'structure' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListFilter className="w-3 h-3" /> ตามโครงสร้าง
              </button>
              <button
                onClick={() => setSortMode('shortage')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${
                  sortMode === 'shortage' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3 h-3" /> ขาดมากสุด
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-500" /> คนครอง</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm personnel-hatch" /> อัตราว่าง</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-300">≥95% เต็ม</span>
            <span className="text-sky-300">80–95% พอ</span>
            <span className="text-amber-300">60–80% ควรเติม</span>
            <span className="text-rose-300">&lt;60% วิกฤต</span>
          </div>

          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: g.meta.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.meta.color }} />
                    {g.meta.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {g.assigned}/{g.auth} อัตรา · ว่าง {g.vacant}
                  </span>
                </div>
                <div className="space-y-2">
                  {g.items.map((p) => (
                    <StaffingRow key={p.id} p={p} onClick={() => setSelectedPersonnel(p)} />
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">ไม่พบตำแหน่งตามคำค้นหา</div>
            )}
          </div>
        </div>
      )}

      {/* Analytics — always shown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Critical shortage */}
        <div className="glass-panel bg-slate-900/90 border border-rose-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> จุดวิกฤตต้องเติมกำลังด่วน
            </h3>
            <div className="space-y-2.5">
              {critical.map((p) => {
                const pct = pctOf(p);
                const st = fillStyle(pct);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersonnel(p)}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="w-11 text-center shrink-0">
                      <div className={`text-lg font-extrabold ${st.text}`}>{pct.toFixed(0)}%</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-100 truncate">{p.position}</p>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-1">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: st.bar }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-rose-300">−{p.vacant}</div>
                      <div className="text-[9px] text-slate-500">อัตรา</div>
                    </div>
                  </button>
                );
              })}
              {critical.length === 0 && (
                <div className="text-center py-6 text-emerald-400 text-sm flex flex-col items-center gap-1">
                  <ShieldCheck className="w-8 h-8" /> บรรจุครบทุกตำแหน่ง
                </div>
              )}
            </div>
          </div>

          {/* Manpower distribution chart (height-locked so it can't over-expand) */}
          <div className="h-[320px]">
            <StatChart
              title="กำลังพลบรรจุจริงแยกตามระดับ"
              type="doughnut"
              labels={GROUP_ORDER.map((k) => GROUP_META[k].label)}
              dataValues={GROUP_ORDER.map((k) => assignedByGroup[k])}
              customColors={GROUP_ORDER.map((k) => GROUP_META[k].color)}
            />
          </div>
      </div>

      {/* Detail Modal */}
      {selectedPersonnel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedPersonnel(null)}>
          <div className="w-full max-w-lg glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-3 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">รายละเอียดกำลังพล: {selectedPersonnel.position}</h3>
                  <span className="text-xs text-cyan-300 font-semibold">{groupOf(selectedPersonnel.position).label}</span>
                </div>
              </div>
              <button onClick={() => setSelectedPersonnel(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Staffing bar in modal */}
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400 font-semibold">การบรรจุอัตรา</span>
                <span className={`font-bold ${fillStyle(pctOf(selectedPersonnel)).text}`}>
                  {pctOf(selectedPersonnel).toFixed(0)}% · {fillStyle(pctOf(selectedPersonnel)).label}
                </span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-800 overflow-hidden flex ring-1 ring-slate-800">
                <div className="h-full" style={{ width: `${pctOf(selectedPersonnel)}%`, backgroundColor: fillStyle(pctOf(selectedPersonnel)).bar }} />
                {selectedPersonnel.vacant > 0 && <div className="h-full personnel-hatch" style={{ width: `${100 - pctOf(selectedPersonnel)}%` }} />}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">กรอบอนุญาต</span>
                <div className="text-xl font-extrabold text-blue-300 mt-0.5">{selectedPersonnel.authorized}</div>
                <span className="text-[10px] text-slate-400">อัตรา</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">คนครองจริง</span>
                <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{selectedPersonnel.assigned}</div>
                <span className="text-[10px] text-slate-400">นาย</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">ว่าง/ขาดแคลน</span>
                <div className={`text-xl font-extrabold mt-0.5 ${selectedPersonnel.vacant > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {selectedPersonnel.vacant}
                </div>
                <span className="text-[10px] text-slate-400">อัตรา</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-cyan-400" /> สรุปกำลังพลปฏิบัติงานสุทธิ:
              </div>
              <div className="flex items-center justify-between text-slate-300 font-mono">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> มาช่วยราชการ: +{selectedPersonnel.detachedIn} นาย
                </span>
                <span className="flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" /> ไปช่วยราชการ: −{selectedPersonnel.detachedOut} นาย
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-sm">
                <span className="text-slate-300">กำลังคงเหลือปฏิบัติงานจริง:</span>
                <span className="text-cyan-400 font-mono">{selectedPersonnel.effectiveTotal} นาย</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60 space-y-1 text-xs">
              <span className="text-slate-400 font-semibold">📋 ภารกิจและหน้าที่ความรับผิดชอบหลัก:</span>
              <p className="text-slate-200 leading-relaxed">
                {POSITION_DUTIES[selectedPersonnel.position] ||
                  `ปฏิบัติหน้าที่ทางตำรวจตามสายงาน ${selectedPersonnel.position} สภ.สะท้อน รักษาความสงบเรียบร้อยและบริการประชาชน`}
              </p>
            </div>

            <div className="pt-1 flex justify-end">
              <button onClick={() => setSelectedPersonnel(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
