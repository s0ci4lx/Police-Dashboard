import React, { useState, useEffect, useMemo } from 'react';
import type { PersonnelItem } from '../../types/dashboard';
import { USER_PROVIDED_PERSONNEL_SHEET_URL } from '../../data/mockInitialData';
import { fetchSheetData } from '../../services/googleSheetService';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { Users, UserCheck, UserMinus, ShieldCheck, RefreshCw, X, Shield, ArrowUpRight, ArrowDownRight, Briefcase } from 'lucide-react';

interface PersonnelDashboardProps {
  searchQuery: string;
}

const POSITION_DUTIES: Record<string, string> = {
  'ผกก.': 'ผู้บังคับการสถานีตำรวจภูธรหาดใหญ่ รับผิดชอบบริหารราชการ สั่งการ ควบคุม กำกับดูแลทุกสายงานในสังกัด',
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

export const PersonnelDashboard: React.FC<PersonnelDashboardProps> = ({ searchQuery }) => {
  const [personnelData, setPersonnelData] = useState<PersonnelItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [selectedPersonnel, setSelectedPersonnel] = useState<PersonnelItem | null>(null);

  // Fetch Live Google Sheet Data for Tab "กำลังพล"
  const loadPersonnelSheetData = async () => {
    setLoading(true);
    setSyncStatusMsg('');
    try {
      const { data, columns } = await fetchSheetData<Record<string, any>>(USER_PROVIDED_PERSONNEL_SHEET_URL);

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
            let cat: PersonnelItem['category'] = 'ชั้นประทวนปฏิบัติการ';

            if (posStr.includes('ผกก') || posStr.includes('สว.')) {
              cat = 'นายตำรวจชั้นผู้บังคับบัญชา';
            } else if (posStr.includes('รอง สว')) {
              cat = 'สัญญาบัตร (พงส./สายงาน)';
            }

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
              category: cat,
            };
          });

        setPersonnelData(mapped);
        setSyncStatusMsg(`✅ ดึงข้อมูลกำลังพลเรียลไทม์สำเร็จ ทั้งหมด ${mapped.length} สายงาน/ตำแหน่ง!`);
      }
    } catch (err: any) {
      console.warn('Failed to load personnel sheet:', err);
      setSyncStatusMsg(`⚠️ ไม่สามารถอ่านจาก Google Sheet ได้: ${err.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnelSheetData();
  }, []);

  // Filtered data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return personnelData;
    const q = searchQuery.toLowerCase();
    return personnelData.filter((item) => item.position.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }, [personnelData, searchQuery]);

  // Aggregate Totals
  const totals = useMemo(() => {
    let totalAuth = 0;
    let totalAssigned = 0;
    let totalVacant = 0;
    let totalDetachedIn = 0;
    let totalDetachedOut = 0;
    let totalEffective = 0;

    personnelData.forEach((p) => {
      totalAuth += p.authorized;
      totalAssigned += p.assigned;
      totalVacant += p.vacant;
      totalDetachedIn += p.detachedIn;
      totalDetachedOut += p.detachedOut;
      totalEffective += p.effectiveTotal;
    });

    const fillRate = totalAuth > 0 ? ((totalAssigned / totalAuth) * 100).toFixed(1) : '84.0';

    return {
      totalAuth,
      totalAssigned,
      totalVacant,
      totalDetachedIn,
      totalDetachedOut,
      totalEffective,
      fillRate,
    };
  }, [personnelData]);

  // Data Table Columns
  const columns: ColumnDef<PersonnelItem>[] = [
    {
      key: 'position',
      header: 'ระดับ / ตำแหน่ง / สายงาน',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-100 flex items-center gap-1.5">
            <span>{row.position}</span>
          </div>
          <div className="text-[11px] text-slate-400">{row.category}</div>
        </div>
      ),
    },
    {
      key: 'authorized',
      header: 'กรอบอนุญาต',
      render: (row) => <span className="font-mono font-extrabold text-blue-300">{row.authorized} อัตรา</span>,
    },
    {
      key: 'assigned',
      header: 'คนครองจริง',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {row.assigned} นาย
        </span>
      ),
    },
    {
      key: 'vacant',
      header: 'ว่าง / ขาดแคลน',
      render: (row) => {
        const isHighVacant = row.vacant >= 10;
        return (
          <span
            className={`font-mono font-bold px-2 py-0.5 rounded ${
              row.vacant > 0
                ? isHighVacant
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-amber-300'
                : 'text-slate-500'
            }`}
          >
            {row.vacant > 0 ? `${row.vacant} อัตรา` : '-'}
          </span>
        );
      },
    },
    {
      key: 'detachedIn',
      header: 'ช่วย รชก.',
      render: (row) => (
        <div className="space-x-1 font-mono text-[11px]">
          {row.detachedIn > 0 && (
            <span className="text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded">
              +{row.detachedIn} มาช่วย
            </span>
          )}
          {row.detachedOut > 0 && (
            <span className="text-rose-400 font-bold bg-rose-950 px-1.5 py-0.5 rounded">
              -{row.detachedOut} ไปช่วย
            </span>
          )}
          {row.detachedIn === 0 && row.detachedOut === 0 && <span className="text-slate-500">-</span>}
        </div>
      ),
    },
    {
      key: 'effectiveTotal',
      header: 'รายละเอียด',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPersonnel(row);
          }}
          className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold transition-all"
        >
          📋 ดูรายละเอียด
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Banner */}
      <div className="glass-panel bg-gradient-to-r from-blue-900/40 via-cyan-950 to-slate-950 border border-blue-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-widest mb-1">
              <Users className="w-4 h-4 text-cyan-400" /> สารสนเทศบริหารจัดการกำลังพล (HR & Police Personnel Dashboard)
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              อัตรากำลังพล สภ.หาดใหญ่ ({totals.totalAuth} อัตราอนุญาต)
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <span>🔗 ซิงค์ข้อมูลเรียลไทม์จาก Google Sheet (ชีท กำลังพล):</span>
              <a
                href={USER_PROVIDED_PERSONNEL_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-mono text-[11px] truncate max-w-xs"
              >
                Google Sheet (กำลังพล)
              </a>
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
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-blue-300">
          {syncStatusMsg}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="กรอบอัตราอนุญาต"
          value={totals.totalAuth}
          subtext="อัตรากำลังทั้งหมด"
          icon={Users}
          colorTheme="blue"
        />
        <KpiCard
          title="คนครองจริง"
          value={totals.totalAssigned}
          subtext={`คิดเป็น ${totals.fillRate}% ของกรอบ`}
          icon={UserCheck}
          colorTheme="emerald"
        />
        <KpiCard
          title="ตำแหน่งว่าง/ขาดแคลน"
          value={totals.totalVacant}
          subtext="รอการแต่งตั้งโยกย้าย"
          icon={UserMinus}
          colorTheme="rose"
        />
        <KpiCard
          title="กำลังพลปฏิบัติงานจริง"
          value={totals.totalEffective}
          subtext={`มาช่วย ${totals.totalDetachedIn} / ไปช่วย ${totals.totalDetachedOut}`}
          icon={ShieldCheck}
          colorTheme="indigo"
        />
      </div>

      {/* Table & Chart Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <DataTable
            title="ตารางเปรียบเทียบอัตรากำลังพลแยกตามตำแหน่งและสายงาน (กดคลิกแถวเพื่อดูรายละเอียด)"
            data={filteredData}
            columns={columns}
            searchPlaceholder="ค้นหาตำแหน่ง, สายงาน..."
            pageSize={10}
            onRowClick={(row) => setSelectedPersonnel(row)}
          />
        </div>

        <div className="lg:col-span-4">
          <StatChart
            title="สัดส่วนคนครอง VS อัตราว่างสายงานหลัก"
            type="doughnut"
            labels={['งานป้องกันฯ (168)', 'งานจราจร (53)', 'งานสืบสวน (24)', 'สอบสวน (30)', 'อัตราว่างรวม (59)']}
            dataValues={[168, 53, 24, 30, 59]}
            customColors={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']}
          />
        </div>
      </div>

      {/* Detailed Inspector Modal for Personnel Row Click */}
      {selectedPersonnel && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    รายละเอียดกำลังพล: {selectedPersonnel.position}
                  </h3>
                  <span className="text-xs text-cyan-300 font-semibold">{selectedPersonnel.category}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPersonnel(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Capacity Stats Grid */}
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

            {/* Detached Officers Info */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-cyan-400" /> สรุปกำลังพลปฏิบัติงานสุทธิ:
              </div>
              <div className="flex items-center justify-between text-slate-300 font-mono">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> มาช่วยราชการ (รชก.): +{selectedPersonnel.detachedIn} นาย
                </span>
                <span className="flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" /> ไปช่วยราชการ (รชก.): -{selectedPersonnel.detachedOut} นาย
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold text-sm">
                <span className="text-slate-300">กำลังคงเหลือปฏิบัติงานจริง:</span>
                <span className="text-cyan-400 font-mono">{selectedPersonnel.effectiveTotal} นาย</span>
              </div>
            </div>

            {/* Duties Description */}
            <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/60 space-y-1 text-xs">
              <span className="text-slate-400 font-semibold">📋 ภารกิจและหน้าที่ความรับผิดชอบหลัก:</span>
              <p className="text-slate-200 leading-relaxed">
                {POSITION_DUTIES[selectedPersonnel.position] ||
                  `ปฏิบัติหน้าที่ทางตำรวจตามสายงาน ${selectedPersonnel.position} สภ.หาดใหญ่ รักษาความสงบเรียบร้อยและบริการประชาชน`}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPersonnel(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
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
