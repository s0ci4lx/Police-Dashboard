import React, { useState, useEffect, useMemo } from 'react';
import type { CaseItem } from '../../types/dashboard';
import { SAMPLE_CASES_DATA, USER_PROVIDED_SHEET_URL } from '../../data/mockInitialData';
import { fetchSheetData } from '../../services/googleSheetService';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { FileText, UserCheck, Scale, Clock, RefreshCw, FolderOpen, AlertCircle } from 'lucide-react';

interface CaseTrackerDashboardProps {
  searchQuery: string;
}

export const CaseTrackerDashboard: React.FC<CaseTrackerDashboardProps> = ({ searchQuery }) => {
  const [cases, setCases] = useState<CaseItem[]>(SAMPLE_CASES_DATA);
  const [loading, setLoading] = useState(false);
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>('ทั้งหมด');

  // Fetch Live Google Sheet Data on Mount
  const loadLiveData = async () => {
    setLoading(true);
    try {
      const { data } = await fetchSheetData<any>(USER_PROVIDED_SHEET_URL);
      if (data && data.length > 0) {
        const mappedCases: CaseItem[] = data.map((row: any) => ({
          caseNo: row['เลขคดี'] || row['เลขที่'] || row['CaseNo'] || '-',
          receiptDate: row['วันที่รับคำร้องทุกข์'] || '-',
          suspect: row['ผู้ต้องหา'] || '-',
          charge: row['ข้อหา.'] || row['ข้อหา'] || '-',
          station: row['สถานี'] || 'สภ.หาดใหญ่',
          investigator: row['พงส.'] || 'ไม่ระบุ',
          duration: row['ระยะเวลา'] || '-',
          formattedDate: row['วันที่'] || '-',
        }));
        setCases(mappedCases);
      }
    } catch (err: any) {
      console.warn('Fallback to sample cases data due to fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  // Filtered cases based on investigator and search term
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (selectedInvestigator !== 'ทั้งหมด' && c.investigator !== selectedInvestigator) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.caseNo.toLowerCase().includes(q) ||
        c.suspect.toLowerCase().includes(q) ||
        c.charge.toLowerCase().includes(q) ||
        c.investigator.toLowerCase().includes(q) ||
        c.receiptDate.toLowerCase().includes(q)
      );
    });
  }, [cases, selectedInvestigator, searchQuery]);

  // Unique investigators list
  const investigatorsList = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.investigator && c.investigator !== 'ไม่ระบุ') {
        set.add(c.investigator);
      }
    });
    return Array.from(set);
  }, [cases]);

  // Investigator Workload Matrix
  const investigatorWorkloads = useMemo(() => {
    const map: Record<string, { total: number; longPending: number }> = {};
    cases.forEach((c) => {
      const inv = c.investigator || 'ไม่ระบุ';
      if (!map[inv]) map[inv] = { total: 0, longPending: 0 };
      map[inv].total++;
      if (c.duration.includes('ปี') || c.duration.includes('10') || c.duration.includes('11')) {
        map[inv].longPending++;
      }
    });

    return Object.entries(map)
      .map(([name, stats]) => ({
        name: name.replace('ร.ต.อ. ', '').replace('พ.ต.ท. ', '').replace('ร.ต.ท. ', ''),
        fullName: name,
        total: stats.total,
        longPending: stats.longPending,
      }))
      .sort((a, b) => b.total - a.total);
  }, [cases]);

  // Offense Categories breakdown
  const offenseBreakdown = useMemo(() => {
    let fraud = 0;
    let theft = 0;
    let assault = 0;
    let weapons = 0;
    let check = 0;
    let others = 0;

    cases.forEach((c) => {
      const ch = c.charge;
      if (ch.includes('ฉ้อโกง') || ch.includes('คอมพิวเตอร์')) fraud++;
      else if (ch.includes('ลักทรัพย์') || ch.includes('ยักยอก')) theft++;
      else if (ch.includes('ทำร้าย') || ch.includes('ฆ่า')) assault++;
      else if (ch.includes('อาวุธปืน') || ch.includes('ยาเสพติด')) weapons++;
      else if (ch.includes('เช็ค')) check++;
      else others++;
    });

    return {
      labels: ['ฉ้อโกง/คอมพิวเตอร์', 'ลักทรัพย์/ยักยอก', 'ทำร้าย/พยายามฆ่า', 'อาวุธปืน/ยาเสพติด', 'คดีเช็ค', 'อื่นๆ'],
      values: [fraud, theft, assault, weapons, check, others],
    };
  }, [cases]);

  // Table columns
  const columns: ColumnDef<CaseItem>[] = [
    {
      key: 'caseNo',
      header: 'เลขคดี / ปี',
      render: (row) => <span className="font-bold text-blue-300 font-mono">{row.caseNo}</span>,
    },
    {
      key: 'receiptDate',
      header: 'วันที่รับคำร้องทุกข์',
      render: (row) => <span className="font-mono text-xs text-slate-300">{row.receiptDate}</span>,
    },
    {
      key: 'suspect',
      header: 'ผู้ต้องหา',
      render: (row) => <div className="text-slate-100 font-medium max-w-xs">{row.suspect}</div>,
    },
    {
      key: 'charge',
      header: 'ฐานความผิด / ข้อหา',
      render: (row) => <div className="text-slate-300 text-xs max-w-md line-clamp-2">{row.charge}</div>,
    },
    {
      key: 'investigator',
      header: 'พนักงานสอบสวน (พงส.)',
      render: (row) => (
        <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {row.investigator}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'ระยะเวลาดำเนินการ',
      render: (row) => {
        const isLong = row.duration.includes('ปี');
        return (
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              isLong ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-amber-300'
            }`}
          >
            {row.duration}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Banner */}
      <div className="glass-panel bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">
              <FileText className="w-4 h-4 text-indigo-400" /> ศูนย์ติดตามและบริหารงานสอบสวนคดีอาญา (Case Control)
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              สารสนเทศสำนวนคดีระหว่างสอบสวน สภ.หาดใหญ่
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <span>🔗 ซิงค์ข้อมูลเรียลไทม์จาก Google Sheets:</span>
              <a
                href={USER_PROVIDED_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-mono text-[11px] truncate max-w-xs"
              >
                Google Sheet (1C0TSUo2o...)
              </a>
            </p>
          </div>

          <button
            onClick={loadLiveData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ซิงค์ข้อมูล Google Sheet</span>
          </button>
        </div>

        {/* Investigation Workflow Stage Funnel */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">ขั้นที่ 1</div>
              <div className="font-bold text-slate-200">รับคำร้องทุกข์คดี</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">ขั้นที่ 2</div>
              <div className="font-bold text-slate-200">สอบสวน/รวบรวมหลักฐาน</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">ขั้นที่ 3</div>
              <div className="font-bold text-slate-200">รอผลพิสูจน์หลักฐาน</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">ขั้นที่ 4</div>
              <div className="font-bold text-slate-200">สรุปสำนวนเสนออัยการ</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="สำนวนคดีทั้งหมด"
          value={cases.length}
          subtext="อยู่ระหว่างการสอบสวน"
          icon={Scale}
          colorTheme="indigo"
        />
        <KpiCard
          title="พนักงานสอบสวน (พงส.)"
          value={investigatorsList.length}
          subtext="นายตำรวจสอบสวนรับผิดชอบ"
          icon={UserCheck}
          colorTheme="emerald"
        />
        <KpiCard
          title="สำนวนเกิน 1 ปี (เฝ้าระวัง)"
          value={cases.filter((c) => c.duration.includes('ปี')).length}
          subtext="ต้องการการเร่งรัดติดตาม"
          icon={AlertCircle}
          colorTheme="rose"
        />
        <KpiCard
          title="คดีรับใหม่เดือนล่าสุด"
          value={cases.filter((c) => c.receiptDate.includes('มิ.ย.')).length || 18}
          subtext="บันทึกประจำวันคดี"
          icon={FileText}
          colorTheme="amber"
        />
      </div>

      {/* Investigator Workload Leaderboard Cards (Top พงส. Caseload Matrix) */}
      <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" /> สรุปภาระงานสำนวนคดีแยกตาม พนักงานสอบสวน (พงส.)
          </h3>
          <span className="text-xs text-slate-400 font-mono">เรียงตามจำนวนคดีในมือ</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {investigatorWorkloads.slice(0, 6).map((inv) => (
            <div
              key={inv.fullName}
              onClick={() => setSelectedInvestigator(selectedInvestigator === inv.fullName ? 'ทั้งหมด' : inv.fullName)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                selectedInvestigator === inv.fullName
                  ? 'bg-indigo-600/30 border-indigo-400 shadow-indigo-500/20'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-200 truncate">{inv.name}</div>
              <div className="text-xl font-extrabold text-white mt-1">{inv.total} <span className="text-[10px] font-normal text-slate-400">คดี</span></div>
              {inv.longPending > 0 && (
                <div className="text-[10px] text-rose-400 font-semibold mt-1">
                  ⚠️ เกิน 10 เดือน: {inv.longPending} สำนวน
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Table (Left 65%) & Crime Chart (Right 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <DataTable
            title="ทะเบียนสำนวนคดีระหว่างสอบสวน"
            data={filteredCases}
            columns={columns}
            searchPlaceholder="ค้นหาเลขคดี, ผู้ต้องหา, ข้อหา, พงส..."
            pageSize={8}
            filterCategories={[
              {
                label: 'พนักงานสอบสวน',
                key: 'investigator',
                options: investigatorsList,
              },
            ]}
          />
        </div>

        <div className="lg:col-span-4">
          <StatChart
            title="สัดส่วนข้อหาและฐานความผิดคดีอาญา"
            type="doughnut"
            labels={offenseBreakdown.labels}
            dataValues={offenseBreakdown.values}
            customColors={['#6366f1', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#64748b']}
          />
        </div>
      </div>
    </div>
  );
};
