import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Link as LinkIcon, AlertCircle, Settings2, BarChart2, CheckCircle2, ListFilter, Eye, X, Download } from 'lucide-react';
import { fetchSheetData } from '../../services/googleSheetService';

interface ArrestItem {
  name: string;
  count: number;
}

interface ReportRow {
  date: string;
  relcp: number;
  popup: number;
  car: number;
  mc: number;
  person: number;
  ccar: number;
  cmc: number;
  cperson: number;
  dna: number;
  profile: number;
  s1mc: number;
  s1car: number;
  s2mc: number;
  s2car: number;
  rent: number;
  arrests: ArrestItem[];
  officer?: string;
  role?: string;
  updatedAt?: string;
}

interface ReportDashboardProps {
  searchQuery: string;
}

const THMONTH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function thDate(iso: string) {
  if (!iso) return "..........";
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${THMONTH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function getLocalYMD(d: Date = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

const STORE_KEY = "sathon_reports";
const URL_KEY = "sathon_apiurl";

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ searchQuery: _searchQuery }) => {
  const [dataMap, setDataMap] = useState<Record<string, ReportRow>>({});
  const [preset, setPreset] = useState<'today' | '7' | '30' | 'month' | 'all'>('30');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);

  useEffect(() => {
    // Load config (use the provided Google Sheet link as default)
    const defaultUrl = 'https://docs.google.com/spreadsheets/d/1Cri1olPyS5x_zzMOyRSCAyDmGVhbfkweYhg6molwWQs/edit?gid=1998218474#gid=1998218474';
    const savedUrl = localStorage.getItem(URL_KEY) || (window as any).WEBAPP_URL || defaultUrl;
    setApiUrl(savedUrl);

    // Load initial data from local storage
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      if (Object.keys(stored).length > 0) {
        setDataMap(stored);
      } else {
        // Mock data if completely empty so we can see the dashboard
        const todayStr = getLocalYMD();
        const mock: Record<string, ReportRow> = {
          [todayStr]: {
            date: todayStr,
            relcp: 2, popup: 1, car: 12, mc: 24, person: 36, ccar: 0, cmc: 0, cperson: 0,
            dna: 2, profile: 1, s1mc: 1, s1car: 0, s2mc: 0, s2car: 0, rent: 2,
            arrests: [{ name: 'ยาเสพติด', count: 1 }, { name: 'ตามหมายจับ', count: 1 }]
          }
        };
        setDataMap(mock);
      }
    } catch (e) {
      console.error("Failed to parse report data", e);
    }

    applyPreset('30');
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const saveUrl = (val: string) => {
    setApiUrl(val);
    localStorage.setItem(URL_KEY, val);
  };

  const syncFromSheet = async () => {
    if (!apiUrl) {
      showToast("⚠️ กรุณาตั้งค่า Web App URL ก่อน");
      setShowSettings(true);
      return;
    }
    setIsSyncing(true);
    showToast("กำลังซิงก์ข้อมูลจากชีท...");
    try {
      let rowsData: any[] = [];
      
      // Check if it's a direct Google Sheet URL
      if (apiUrl.includes('/d/') || apiUrl.includes('spreadsheets')) {
        const result = await fetchSheetData<any>(apiUrl);
        rowsData = result.data;
      } else {
        // Fallback to Web App JSON
        const res = await fetch(apiUrl + "?t=" + Date.now());
        const j = await res.json();
        if (j && j.rows) {
          rowsData = j.rows;
        }
      }

      if (rowsData && rowsData.length > 0) {
        const d: Record<string, ReportRow> = {};
        rowsData.forEach((r: any) => {
          const row: ReportRow = { ...r };
          ['relcp','popup','car','mc','person','ccar','cmc','cperson','dna','profile','s1mc','s1car','s2mc','s2car','rent'].forEach(f => {
            (row as any)[f] = parseInt(r[f] || '0', 10) || 0;
          });
          try {
            row.arrests = typeof r.arrests === "string" ? JSON.parse(r.arrests || "[]") : (Array.isArray(r.arrests) ? r.arrests : []);
          } catch (e) {
            // Handle unescaped quotes in CSV string if any
            try {
              let cleaned = r.arrests.replace(/""/g, '"');
              if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.substring(1, cleaned.length - 1);
              }
              row.arrests = JSON.parse(cleaned);
            } catch (err) {
              row.arrests = [];
            }
          }
          if (r.date) {
            d[r.date] = row;
          }
        });
        setDataMap(d);
        localStorage.setItem(STORE_KEY, JSON.stringify(d));
        showToast("ซิงก์ข้อมูลสำเร็จ (" + Object.keys(d).length + " วัน)");
      } else {
        showToast("⚠️ ไม่พบข้อมูลในลิงก์ที่ระบุ");
      }
    } catch (e: any) {
      console.error(e);
      showToast("⚠️ ซิงก์ไม่สำเร็จ — " + (e.message || "ตรวจสอบ URL หรืออินเทอร์เน็ต"));
    } finally {
      setIsSyncing(false);
    }
  };

  const applyPreset = (p: typeof preset) => {
    setPreset(p);
    const d = new Date();
    const today = getLocalYMD(d);
    if (p === 'today') {
      setFromDate(today); setToDate(today);
    } else if (p === '7') {
      d.setDate(d.getDate() - 6);
      setFromDate(getLocalYMD(d)); setToDate(today);
    } else if (p === '30') {
      d.setDate(d.getDate() - 29);
      setFromDate(getLocalYMD(d)); setToDate(today);
    } else if (p === 'month') {
      d.setDate(1);
      setFromDate(getLocalYMD(d)); setToDate(today);
    } else if (p === 'all') {
      setFromDate(''); setToDate('');
    }
  };

  // Filter Data
  const rows = useMemo(() => {
    return Object.values(dataMap)
      .filter(r => (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [dataMap, fromDate, toDate]);

  // Derived KPIs
  const sum = (field: keyof ReportRow) => rows.reduce((s, r) => s + ((r[field] as number) || 0), 0);
  const arrestTotal = (r: ReportRow) => (r.arrests || []).reduce((s, a) => s + (a.count || 0), 0);
  
  const cp = sum("relcp") + sum("popup");
  const veh = sum("car") + sum("mc") + sum("ccar") + sum("cmc");
  const ppl = sum("person") + sum("cperson");
  const seiz = sum("s1mc") + sum("s1car") + sum("s2mc") + sum("s2car");
  const arrAll = rows.reduce((s, r) => s + arrestTotal(r), 0);

  const rangeLabel = rows.length
    ? `${thDate(rows[0].date)} – ${thDate(rows[rows.length - 1].date)} · ${rows.length} วันที่มีรายงาน`
    : "ยังไม่มีข้อมูลในช่วงที่เลือก";

  // Categories
  const cats = [
    { label: "ตรวจรถยนต์", val: sum("car") + sum("ccar") },
    { label: "ตรวจรถ จยย.", val: sum("mc") + sum("cmc") },
    { label: "ตรวจค้นบุคคล", val: ppl },
    { label: "ตรวจบ้านเช่า", val: sum("rent") },
    { label: "ตรวจยึด", val: seiz },
    { label: "ทำประวัติเสี่ยง", val: sum("profile") },
    { label: "เก็บ DNA", val: sum("dna") },
    { label: "จับกุม", val: arrAll },
  ].sort((a, b) => b.val - a.val);

  const hmax = Math.max(1, ...cats.map(c => c.val));

  // Arrests Map
  const amap: Record<string, number> = {};
  rows.forEach(r => (r.arrests || []).forEach(a => { if (a.count > 0) amap[a.name] = (amap[a.name] || 0) + a.count; }));
  const aitems = Object.entries(amap).map(([label, val]) => ({ label, val })).sort((a, b) => b.val - a.val);
  const amax = Math.max(1, ...aitems.map(x => x.val));

  // Time Series (Last 30 rows in current filter)
  const tsRows = rows.slice(-30);
  const vmax = Math.max(1, ...tsRows.map(r => (r.relcp || 0) + (r.popup || 0)));

  // Aggregate summary row for currently selected range filter
  const summaryRow = useMemo<ReportRow>(() => {
    const sRelcp = sum("relcp");
    const sPopup = sum("popup");
    const sCar = sum("car");
    const sMc = sum("mc");
    const sPerson = sum("person");
    const sCcar = sum("ccar");
    const sCmc = sum("cmc");
    const sCperson = sum("cperson");
    const sDna = sum("dna");
    const sProfile = sum("profile");
    const sS1mc = sum("s1mc");
    const sS1car = sum("s1car");
    const sS2mc = sum("s2mc");
    const sS2car = sum("s2car");
    const sRent = sum("rent");

    const arrestMap: Record<string, number> = {};
    rows.forEach(r => {
      (r.arrests || []).forEach(a => {
        if (a.count > 0) {
          arrestMap[a.name] = (arrestMap[a.name] || 0) + a.count;
        }
      });
    });
    const summaryArrests: ArrestItem[] = Object.entries(arrestMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const rangeStr = rows.length
      ? `${thDate(rows[0].date)} – ${thDate(rows[rows.length - 1].date)}`
      : 'ยังไม่มีข้อมูลช่วงที่เลือก';

    return {
      date: rangeStr,
      relcp: sRelcp,
      popup: sPopup,
      car: sCar,
      mc: sMc,
      person: sPerson,
      ccar: sCcar,
      cmc: sCmc,
      cperson: sCperson,
      dna: sDna,
      profile: sProfile,
      s1mc: sS1mc,
      s1car: sS1car,
      s2mc: sS2mc,
      s2car: sS2car,
      rent: sRent,
      arrests: summaryArrests,
      officer: `ผลรวมจาก ${rows.length} รายงานประจำวัน`,
      role: `ช่วงเวลาที่เลือก: ${rangeStr}`,
    };
  }, [rows]);

  const exportCSV = () => {
    if (rows.length === 0) {
      showToast("⚠️ ไม่มีข้อมูลส่งออก");
      return;
    }
    const FIELDS = ["relcp", "popup", "car", "mc", "person", "ccar", "cmc", "cperson", "dna", "profile", "s1mc", "s1car", "s2mc", "s2car", "rent"];
    const head = ["date", ...FIELDS, "arrests_total", "arrests_detail", "officer", "role", "updatedAt"];
    const cell = (v: any) => {
      const str = String(v ?? "");
      return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
    };
    const csv = ["\uFEFF" + head.map(cell).join(",")].concat(rows.map(r => {
      const detail = (r.arrests || []).filter(a => a.count > 0).map(a => `${a.name}=${a.count}`).join(", ");
      return [r.date, ...FIELDS.map(f => (r as any)[f] ?? 0), arrestTotal(r), detail, r.officer || "", r.role || "", r.updatedAt || ""].map(cell).join(",");
    })).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `รายงานจุดตรวจ_${fromDate || 'ทั้งหมด'}_ถึง_${toDate || 'ทั้งหมด'}.csv`;
    link.click();
    showToast("ส่งออก CSV สำเร็จ");
  };

  const exportJSON = () => {
    if (rows.length === 0) {
      showToast("⚠️ ไม่มีข้อมูลส่งออก");
      return;
    }
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `รายงานจุดตรวจ_${fromDate || 'ทั้งหมด'}_ถึง_${toDate || 'ทั้งหมด'}.json`;
    link.click();
    showToast("ส่งออก JSON สำเร็จ");
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-xl transition-all duration-300 z-50 flex items-center gap-2 ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
        <CheckCircle2 className="w-5 h-5" />
        {toastMsg}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60">
        <div>
          <div className="text-xs font-bold text-blue-400 mb-1 tracking-wider uppercase">สภ.สะท้อน · งานสื่อสาร</div>
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" /> รายงานผลการปฏิบัติ จุดตรวจ/จุดสกัด
          </h2>
          <div className="text-xs text-slate-400">{rangeLabel}</div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSelectedRow(summaryRow)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            title="ดูสรุปรายละเอียดผลรวมทุกฟิลด์ของช่วงเวลาที่เลือก"
          >
            <Eye className="w-4 h-4" /> สรุปช่วงเวลา
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            title="ส่งออกไฟล์ CSV"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            title="ส่งออกไฟล์ JSON"
          >
            <Download className="w-4 h-4" /> JSON
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-all"
          >
            <Settings2 className="w-4 h-4" /> ตั้งค่าข้อมูล
          </button>
          <button
            onClick={syncFromSheet}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> ซิงก์ล่าสุด
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="glass-panel bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-400" /> เชื่อมต่อแหล่งข้อมูล (Google Sheet)
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            นำลิงก์ Google Sheet หรือ Web App URL จากระบบรายงานมาวางที่นี่ เพื่อดึงข้อมูลอัตโนมัติ
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => saveUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button onClick={syncFromSheet} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 shrink-0">
              บันทึกและซิงก์
            </button>
          </div>
          <div className="mt-2 text-[11px] text-amber-400/80 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> หากไม่มีข้อมูลจะแสดงข้อมูลจำลองเพื่อการทดสอบ
          </div>
        </div>
      )}

      {/* Filter Presets */}
      <div className="glass-panel bg-white/90 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 overflow-x-auto shadow-sm">
        <div className="flex items-center gap-2 shrink-0">
          <ListFilter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">ช่วงเวลา:</span>
        </div>
        <div className="flex gap-2 shrink-0">
          {[
            { id: 'today', label: 'วันนี้' },
            { id: '7', label: '7 วัน' },
            { id: '30', label: '30 วัน' },
            { id: 'month', label: 'เดือนนี้' },
            { id: 'all', label: 'ทั้งหมด' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id as any)}
              style={{
                backgroundColor: preset === p.id ? '#2563eb' : '#ffffff',
                color: preset === p.id ? '#ffffff' : '#1e293b',
                borderColor: preset === p.id ? '#2563eb' : '#cbd5e1',
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${
                preset === p.id ? 'shadow-blue-500/20' : 'hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-slate-300 hidden md:block shrink-0"></div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <input 
            type="date" 
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPreset('all' as any); }}
            style={{ backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#cbd5e1' }}
            className="border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 shadow-sm font-medium"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input 
            type="date" 
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPreset('all' as any); }}
            style={{ backgroundColor: '#ffffff', color: '#1e293b', borderColor: '#cbd5e1' }}
            className="border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 shadow-sm font-medium"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon="🚧" val={cp} label="ครั้ง · ตั้งจุดตรวจ/สกัด" color="text-blue-400" />
        <KpiCard icon="🚗" val={veh} label="คัน · ตรวจยานพาหนะ" color="text-emerald-400" />
        <KpiCard icon="👤" val={ppl} label="คน · ตรวจค้นบุคคล" color="text-indigo-400" />
        <KpiCard icon="🏠" val={sum("rent")} label="แห่ง · ตรวจบ้านเช่า" color="text-emerald-400" />
        <KpiCard icon="🚔" val={arrAll} label="ราย · จับกุม" color="text-amber-400" />
        <KpiCard icon="🧬" val={sum("dna")} label="ราย · เก็บ DNA" color="text-pink-400" />
        <KpiCard icon="📋" val={sum("profile")} label="ราย · ทำประวัติกลุ่มเสี่ยง" color="text-blue-400" />
        <KpiCard icon="🔒" val={seiz} label="คัน · ตรวจยึด" color="text-orange-400" />
        <KpiCard icon="🗓️" val={rows.length} label="วัน · มีรายงาน" color="text-slate-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <div className="glass-panel bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60 flex flex-col">
          <div className="text-sm font-bold text-white mb-1">แนวโน้มการตั้งจุดตรวจ/จุดสกัด</div>
          <div className="text-[11px] text-slate-400 mb-6">ครั้ง/วัน (สูงสุด 30 วันล่าสุด)</div>
          
          <div className="relative flex-1 min-h-[220px] flex items-end gap-1 border-b border-slate-700 pb-6 mt-4">
            <div className="absolute top-0 right-0 text-[10px] text-slate-500">สูงสุด {vmax} ครั้ง</div>
            {/* Background grid lines */}
            <div className="absolute inset-0 bottom-6 border-b border-slate-700/50" style={{ background: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '100% 33.34%' }}></div>
            
            {tsRows.length > 0 ? tsRows.map((r, i) => {
              const v = (r.relcp || 0) + (r.popup || 0);
              const pct = vmax > 0 ? (v / vmax) * 100 : 0;
              const d = new Date(r.date + "T00:00:00");
              const showLabel = tsRows.length <= 15 || i % Math.ceil(tsRows.length / 8) === 0;
              return (
                <div key={r.date} className="relative flex-1 h-full flex items-end group z-10">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all group-hover:brightness-125"
                    style={{ height: `${Math.max(1, pct)}%` }}
                  ></div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow-lg border border-slate-700">
                    {thDate(r.date)}<br/>{v} ครั้ง
                  </div>
                  {showLabel && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap">
                      {d.getDate()}/{d.getMonth()+1}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="w-full text-center text-sm text-slate-500 pb-10 z-10">ไม่มีข้อมูล</div>
            )}
          </div>
        </div>

        {/* Categories Chart */}
        <div className="glass-panel bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60">
          <div className="text-sm font-bold text-white mb-1">ผลการปฏิบัติแยกประเภท</div>
          <div className="text-[11px] text-slate-400 mb-6">รวมทั้งช่วง</div>
          
          <div className="flex flex-col gap-3">
            {cats.map(c => (
              <div key={c.label} className="grid grid-cols-[100px_1fr_40px] items-center gap-3">
                <div className="text-xs text-slate-300 truncate" title={c.label}>{c.label}</div>
                <div className="h-5 bg-slate-800/80 rounded-md overflow-hidden relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-md transition-all duration-700 ease-out"
                    style={{ width: `${hmax > 0 ? (c.val / hmax) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-xs font-bold text-white text-right font-mono">{c.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arrests Breakdown */}
        {aitems.length > 0 && (
          <div className="glass-panel bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60">
            <div className="text-sm font-bold text-white mb-1">การจับกุมแยกประเภท</div>
            <div className="text-[11px] text-slate-400 mb-6">รวมทั้งช่วง</div>
            
            <div className="flex flex-col gap-3">
              {aitems.map(a => (
                <div key={a.label} className="grid grid-cols-[100px_1fr_40px] items-center gap-3">
                  <div className="text-xs text-slate-300 truncate" title={a.label}>{a.label}</div>
                  <div className="h-5 bg-slate-800/80 rounded-md overflow-hidden relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-md transition-all duration-700 ease-out"
                      style={{ width: `${amax > 0 ? (a.val / amax) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs font-bold text-white text-right font-mono">{a.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className={`glass-panel bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60 ${aitems.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-white">ตารางข้อมูลรายวัน</div>
            <button
              onClick={() => setSelectedRow(summaryRow)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-white rounded-lg text-xs font-bold border border-blue-500/30 transition-all"
              title="ดูสรุปรายละเอียดรวมตามฟิลด์ทั้งหมดของช่วงเวลาที่เลือก"
            >
              <Eye className="w-3.5 h-3.5" /> สรุปภาพรวมช่วงเวลา
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 bg-slate-800/50">
                  <th className="p-2 text-left rounded-tl-lg font-medium">วันที่</th>
                  <th className="p-2 font-medium">จุดตรวจ</th>
                  <th className="p-2 font-medium">รถยนต์</th>
                  <th className="p-2 font-medium">จยย.</th>
                  <th className="p-2 font-medium">บุคคล</th>
                  <th className="p-2 font-medium text-emerald-400">บ้านเช่า</th>
                  <th className="p-2 font-medium text-amber-400">จับกุม</th>
                  <th className="p-2 font-medium">ตรวจยึด</th>
                  <th className="p-2 rounded-tr-lg font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rows.length > 0 ? rows.slice().reverse().map(r => {
                  const tCp = (r.relcp || 0) + (r.popup || 0);
                  const tCar = (r.car || 0) + (r.ccar || 0);
                  const tMc = (r.mc || 0) + (r.cmc || 0);
                  const tPpl = (r.person || 0) + (r.cperson || 0);
                  const tArr = arrestTotal(r);
                  const tSeiz = (r.s1mc || 0) + (r.s1car || 0) + (r.s2mc || 0) + (r.s2car || 0);
                  
                  return (
                    <tr key={r.date} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-2 text-left font-medium text-slate-300">{thDate(r.date)}</td>
                      <td className={`p-2 font-mono ${tCp > 0 ? 'text-white' : 'text-slate-600'}`}>{tCp || '-'}</td>
                      <td className={`p-2 font-mono ${tCar > 0 ? 'text-white' : 'text-slate-600'}`}>{tCar || '-'}</td>
                      <td className={`p-2 font-mono ${tMc > 0 ? 'text-white' : 'text-slate-600'}`}>{tMc || '-'}</td>
                      <td className={`p-2 font-mono ${tPpl > 0 ? 'text-white' : 'text-slate-600'}`}>{tPpl || '-'}</td>
                      <td className={`p-2 font-mono ${(r.rent || 0) > 0 ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>{r.rent || '-'}</td>
                      <td className={`p-2 font-mono ${tArr > 0 ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>{tArr || '-'}</td>
                      <td className={`p-2 font-mono ${tSeiz > 0 ? 'text-white' : 'text-slate-600'}`}>{tSeiz || '-'}</td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => setSelectedRow(r)}
                          className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded-lg transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">ไม่มีข้อมูล</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                {selectedRow.date.startsWith('20') ? (
                  `รายละเอียดวันที่ ${thDate(selectedRow.date)}`
                ) : (
                  `รายละเอียดผลรวมช่วงเวลา (${selectedRow.date})`
                )}
              </h3>
              <button 
                onClick={() => setSelectedRow(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6">
              {/* จุดตรวจ */}
              <div>
                <div className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">🚧 ตั้งจุดตรวจ/จุดสกัด</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">จุดตรวจ ว.43:</span>
                    <span className="text-white font-mono">{selectedRow.relcp || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">จุดสกัด (Popup):</span>
                    <span className="text-white font-mono">{selectedRow.popup || 0}</span>
                  </div>
                </div>
              </div>

              {/* ยานพาหนะ */}
              <div>
                <div className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">🚗 ตรวจยานพาหนะ</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถยนต์:</span>
                    <span className="text-white font-mono">{selectedRow.car || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถ จยย.:</span>
                    <span className="text-white font-mono">{selectedRow.mc || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถยนต์ (ประวัติ):</span>
                    <span className="text-white font-mono">{selectedRow.ccar || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถ จยย. (ประวัติ):</span>
                    <span className="text-white font-mono">{selectedRow.cmc || 0}</span>
                  </div>
                </div>
              </div>

              {/* บุคคล */}
              <div>
                <div className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">👤 ตรวจบุคคล</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">บุคคลทั่วไป:</span>
                    <span className="text-white font-mono">{selectedRow.person || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">บุคคล (ประวัติ):</span>
                    <span className="text-white font-mono">{selectedRow.cperson || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">เก็บ DNA:</span>
                    <span className="text-pink-400 font-mono">{selectedRow.dna || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">ทำประวัติเสี่ยง:</span>
                    <span className="text-white font-mono">{selectedRow.profile || 0}</span>
                  </div>
                </div>
              </div>

              {/* ตรวจบ้านเช่า */}
              <div>
                <div className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">🏠 ตรวจบ้านเช่า/Support site</div>
                <div className="bg-slate-800/50 p-2.5 rounded-lg text-sm flex justify-between items-center">
                  <span className="text-slate-400">ตรวจบ้านเช่า/Support site:</span>
                  <span className="text-emerald-400 font-bold font-mono">{selectedRow.rent || 0} แห่ง</span>
                </div>
              </div>

              {/* ตรวจยึด */}
              <div>
                <div className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">🔒 ตรวจยึด</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถยนต์ (มาตรา 44):</span>
                    <span className="text-white font-mono">{selectedRow.s1car || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถ จยย. (มาตรา 44):</span>
                    <span className="text-white font-mono">{selectedRow.s1mc || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถยนต์ (ตรวจสอบ):</span>
                    <span className="text-white font-mono">{selectedRow.s2car || 0}</span>
                  </div>
                  <div className="flex justify-between bg-slate-800/50 p-2 rounded-lg">
                    <span className="text-slate-400">รถ จยย. (ตรวจสอบ):</span>
                    <span className="text-white font-mono">{selectedRow.s2mc || 0}</span>
                  </div>
                </div>
              </div>

              {/* จับกุม */}
              <div>
                <div className="text-sm font-bold text-amber-400 mb-2 border-b border-slate-800 pb-1">🚔 ผลการจับกุม</div>
                {selectedRow.arrests && selectedRow.arrests.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRow.arrests.filter(a => a.count > 0).map((a, i) => (
                      <div key={i} className="flex justify-between bg-amber-900/20 border border-amber-900/50 p-2 rounded-lg text-sm">
                        <span className="text-amber-200">{a.name}</span>
                        <span className="text-amber-400 font-bold font-mono">{a.count} ราย</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-slate-500 py-2">ไม่มีการจับกุมในวันนี้</div>
                )}
              </div>

              {/* เจ้าหน้าที่ */}
              {(selectedRow.officer || selectedRow.role) && (
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div>ผู้รายงาน: <span className="text-slate-400">{selectedRow.officer || '-'}</span></div>
                  <div>หน้าที่: <span className="text-slate-400">{selectedRow.role || '-'}</span></div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <button 
                onClick={() => setSelectedRow(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-all"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Sub-component for KPI
const KpiCard = ({ icon, val, label, color }: { icon: string, val: number, label: string, color: string }) => (
  <div className="glass-panel border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 transition-all hover:border-blue-500/50 shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-lg shadow-inner">{icon}</div>
      <div className="text-xs text-slate-600 dark:text-slate-400 flex-1 leading-tight font-medium">{label}</div>
    </div>
    <div className={`text-2xl font-bold tracking-tight font-mono ${color}`}>
      {val.toLocaleString()}
    </div>
  </div>
);
