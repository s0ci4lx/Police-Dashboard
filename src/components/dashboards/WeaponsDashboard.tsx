import React, { useState, useEffect, useMemo } from 'react';
import type { WeaponItem } from '../../types/dashboard';
import { USER_PROVIDED_WEAPONS_SHEET_URL } from '../../data/mockInitialData';
import { fetchSheetData } from '../../services/googleSheetService';
import { KpiCard } from '../common/KpiCard';
import { DataTable } from '../common/DataTable';
import type { ColumnDef } from '../common/DataTable';
import { StatChart } from '../common/StatChart';
import { ShieldAlert, Radio, RefreshCw, Crosshair, Box } from 'lucide-react';

interface WeaponsDashboardProps {
  searchQuery: string;
}

export const WeaponsDashboard: React.FC<WeaponsDashboardProps> = ({ searchQuery }) => {
  const [weaponsData, setWeaponsData] = useState<WeaponItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // Fetch Live Google Sheet Data for Tab "อาวุธปืนสิ่งของหลวง"
  const loadWeaponsSheetData = async () => {
    setLoading(true);
    setSyncStatusMsg('');
    try {
      const { data, columns } = await fetchSheetData<Record<string, any>>(USER_PROVIDED_WEAPONS_SHEET_URL);

      if (data && data.length > 0) {
        const typeCol = columns.find((c) => c.includes('ประเภท') || c.includes('ชนิด')) || columns[1] || columns[0];
        const totalCol = columns.find((c) => c.includes('ทั้งหมด') || c.includes('จำนวน')) || columns[2];
        const issuedCol = columns.find((c) => c.includes('เบิกจ่าย')) || columns[3];
        const stockCol = columns.find((c) => c.includes('คงคลัง')) || columns[4];
        const unusableCol = columns.find((c) => c.includes('ใช้งานไม่ได้')) || columns[6];
        const usableCol = columns.find((c) => c.includes('ใช้งานได้') && !c.includes('ไม่ได้')) || columns[5];
        const lostCol = columns.find((c) => c.includes('สูญหาย')) || columns[7];
        const notesCol = columns.find((c) => c.includes('หมายเหตุ')) || columns[8] || '';

        const parseNum = (val: any): number => {
          if (!val) return 0;
          const cleaned = String(val).replace(/,/g, '').trim();
          const n = parseInt(cleaned, 10);
          return isNaN(n) ? 0 : n;
        };

        const mapped: WeaponItem[] = data
          .filter((row) => row[typeCol] && String(row[typeCol]).trim() !== '')
          .map((row, idx) => {
            const nameStr = String(row[typeCol]).trim();
            let cat: WeaponItem['category'] = 'อื่นๆ';

            if (nameStr.includes('ปืน') && !nameStr.includes('ช๊อต') && !nameStr.includes('กระสุน')) {
              cat = 'อาวุธปืน';
            } else if (nameStr.includes('กระสุน')) {
              cat = 'เครื่องกระสุน';
            } else if (nameStr.includes('วิทยุ')) {
              cat = 'อุปกรณ์สื่อสาร';
            } else if (nameStr.includes('เกราะ') || nameStr.includes('โล่') || nameStr.includes('ช๊อต')) {
              cat = 'ยุทธภัณฑ์ป้องกัน';
            }

            return {
              id: `wep-${idx + 1}`,
              no: idx + 1,
              category: cat,
              name: nameStr,
              total: parseNum(row[totalCol]),
              issued: parseNum(row[issuedCol]),
              inStock: parseNum(row[stockCol]),
              usable: parseNum(row[usableCol]),
              unusable: parseNum(row[unusableCol]),
              lost: parseNum(row[lostCol]),
              notes: String(row[notesCol] || '-'),
            };
          });

        setWeaponsData(mapped);
        setSyncStatusMsg(`✅ ดึงข้อมูลทะเบียน "อาวุธปืนสิ่งของหลวง" สำเร็จ ทั้งหมด ${mapped.length} หมวดรายการ!`);
      }
    } catch (err: any) {
      console.warn('Failed to load weapons sheet:', err);
      setSyncStatusMsg(`⚠️ ไม่สามารถอ่านจาก Google Sheet ได้: ${err.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeaponsSheetData();
  }, []);

  // Filtered data based on selected category & global search
  const filteredData = useMemo(() => {
    return weaponsData.filter((item) => {
      if (selectedCategory !== 'ทั้งหมด' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.notes.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    });
  }, [weaponsData, selectedCategory, searchQuery]);

  // Aggregate Stats
  const totals = useMemo(() => {
    let gunsTotal = 0;
    let gunsIssued = 0;
    let ammoTotal = 0;
    let commsTotal = 0;
    let gearTotal = 0;

    weaponsData.forEach((w) => {
      if (w.category === 'อาวุธปืน') {
        gunsTotal += w.total;
        gunsIssued += w.issued;
      } else if (w.category === 'เครื่องกระสุน') {
        ammoTotal += w.total || w.usable;
      } else if (w.category === 'อุปกรณ์สื่อสาร') {
        commsTotal += w.total;
      } else if (w.category === 'ยุทธภัณฑ์ป้องกัน') {
        gearTotal += w.total;
      }
    });

    return {
      gunsTotal,
      gunsIssued,
      ammoTotal,
      commsTotal,
      gearTotal,
    };
  }, [weaponsData]);

  // Data Table Columns
  const columns: ColumnDef<WeaponItem>[] = [
    {
      key: 'category',
      header: 'ประเภททรัพย์สิน',
      render: (row) => {
        const catColors: Record<string, string> = {
          อาวุธปืน: '#ef4444',
          เครื่องกระสุน: '#f59e0b',
          อุปกรณ์สื่อสาร: '#3b82f6',
          ยุทธภัณฑ์ป้องกัน: '#10b981',
          อื่นๆ: '#64748b',
        };
        return (
          <span
            className="px-2.5 py-0.5 rounded text-[11px] font-bold text-white shadow-sm inline-block"
            style={{ backgroundColor: catColors[row.category] || '#3b82f6' }}
          >
            {row.category}
          </span>
        );
      },
    },
    {
      key: 'name',
      header: 'รายการ / ยี่ห้อ / รุ่น',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-100">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.notes !== '-' ? row.notes : ''}</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'จำนวนทั้งหมด',
      render: (row) => <span className="font-mono font-extrabold text-white">{row.total > 0 ? row.total.toLocaleString('th-TH') : '-'}</span>,
    },
    {
      key: 'issued',
      header: 'เบิกจ่ายให้ ตร.',
      render: (row) => (
        <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {row.issued > 0 ? row.issued.toLocaleString('th-TH') : '-'}
        </span>
      ),
    },
    {
      key: 'inStock',
      header: 'คงคลัง',
      render: (row) => (
        <span className="font-mono font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
          {row.inStock > 0 ? row.inStock.toLocaleString('th-TH') : '-'}
        </span>
      ),
    },
    {
      key: 'usable',
      header: 'พร้อมใช้งาน',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          {row.usable > 0 ? row.usable.toLocaleString('th-TH') : '-'}
        </span>
      ),
    },
    {
      key: 'unusable',
      header: 'ชำรุด',
      render: (row) => (
        <span className="font-mono font-bold text-rose-300">
          {row.unusable > 0 ? `${row.unusable.toLocaleString('th-TH')} รายการ` : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Banner */}
      <div className="glass-panel bg-gradient-to-r from-red-900/40 via-amber-950 to-slate-950 border border-red-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-300 uppercase tracking-widest mb-1">
              <Crosshair className="w-4 h-4 text-red-400 animate-pulse" /> ศูนย์คลังทะเบียนยุทธภัณฑ์ & อาวุธปืนสิ่งของหลวง สภ.หาดใหญ่
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              สารสนเทศคลังอาวุธปืน เครื่องกระสุน และสิ่งของหลวง
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <span>🔗 ซิงค์ข้อมูลเรียลไทม์จาก Google Sheet (ชีท อาวุธปืนสิ่งของหลวง):</span>
              <a
                href={USER_PROVIDED_WEAPONS_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline font-mono text-[11px] truncate max-w-xs"
              >
                Google Sheet (อาวุธปืนสิ่งของหลวง)
              </a>
            </p>
          </div>

          <button
            onClick={loadWeaponsSheetData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ซิงค์คลังอาวุธเรียลไทม์</span>
          </button>
        </div>

        {/* Category Tabs Strip */}
        <div className="pt-3 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="text-slate-400 font-semibold text-[11px] shrink-0">เลือกหมวดคลัง:</span>
          {['ทั้งหมด', 'อาวุธปืน', 'เครื่องกระสุน', 'อุปกรณ์สื่อสาร', 'ยุทธภัณฑ์ป้องกัน'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-blue-300">
          {syncStatusMsg}
        </div>
      )}

      {/* KPI Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          title="อาวุธปืนประจำกาย/กลม"
          value={totals.gunsTotal}
          subtext={`เบิกจ่าย ตร. ${totals.gunsIssued} กระบอก`}
          icon={Crosshair}
          colorTheme="rose"
        />
        <KpiCard
          title="กระสุนปืนคงคลัง"
          value={totals.ammoTotal.toLocaleString('th-TH')}
          subtext="ขนาด 9mm, .38, 5.56mm"
          icon={ShieldAlert}
          colorTheme="amber"
        />
        <KpiCard
          title="วิทยุสื่อสารดิจิตอล"
          value={totals.commsTotal}
          subtext="HUAWEI EP821 & EP682"
          icon={Radio}
          colorTheme="blue"
        />
        <KpiCard
          title="ยุทธภัณฑ์ป้องกันตัว"
          value={totals.gearTotal}
          subtext="เสื้อเกราะ / Taser / โล่"
          icon={Box}
          colorTheme="emerald"
        />
      </div>

      {/* Table & Chart Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <DataTable
            title="ทะเบียนยอดครุภัณฑ์ อาวุธปืน และสิ่งของหลวง"
            data={filteredData}
            columns={columns}
            searchPlaceholder="ค้นหาชื่ออาวุธ, ยี่ห้อ, กระสุน, วิทยุ..."
            pageSize={8}
          />
        </div>

        <div className="lg:col-span-4">
          <StatChart
            title="สัดส่วนยุทธภัณฑ์สิ่งของหลวงในคลัง"
            type="doughnut"
            labels={['อาวุธปืน', 'อุปกรณ์สื่อสารดิจิตอล', 'ยุทธภัณฑ์ป้องกัน']}
            dataValues={[totals.gunsTotal, totals.commsTotal, totals.gearTotal]}
            customColors={['#ef4444', '#3b82f6', '#10b981']}
          />
        </div>
      </div>
    </div>
  );
};
