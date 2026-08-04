import React, { useState, useMemo } from 'react';
import type { WeaponItem } from '../../types/dashboard';
import { USER_PROVIDED_WEAPONS_SHEET_URL } from '../../data/mockInitialData';
import { StatChart } from '../common/StatChart';
import { KpiCard } from '../common/KpiCard';
import {
  useWeaponsData,
  deriveSegments,
  readinessPct,
  summarizeByCategory,
  firearmSubtype,
  WEAPON_CATEGORIES,
  WEAPON_CAT_COLOR,
  WEAPON_CAT_UNIT,
} from '../../data/weaponsShared';
import {
  Crosshair,
  ShieldAlert,
  Radio,
  RefreshCw,
  AlertTriangle,
  X,
  Trash2,
  CheckCircle2,
  Send,
  Package,
  Info,
} from 'lucide-react';

interface WeaponsDashboardProps {
  searchQuery: string;
}

const readyStyle = (pct: number) => {
  if (pct >= 90) return { text: 'text-emerald-300', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'พร้อมใช้' };
  if (pct >= 60) return { text: 'text-amber-300', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'เฝ้าระวัง' };
  return { text: 'text-rose-300', chip: 'bg-rose-500/15 text-rose-300 border-rose-500/30', label: 'ต้องแก้ไข' };
};

// Condition bar segments: available / issued / unusable / lost
const ConditionRow: React.FC<{ w: WeaponItem; onClick: () => void }> = ({ w, onClick }) => {
  const seg = deriveSegments(w);
  const unit = WEAPON_CAT_UNIT[w.category] || 'รายการ';
  const pct = readinessPct(w);
  const st = readyStyle(pct);
  const pctOf = (n: number) => (w.total > 0 ? (n / w.total) * 100 : 0);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <span className="text-[12px] font-bold text-slate-100 leading-snug pr-2">{w.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[13px] font-extrabold text-white">{w.total.toLocaleString('th-TH')}</span>
          <span className="text-[10px] text-slate-500">{unit}</span>
        </div>
      </div>

      {w.total > 0 ? (
        <>
          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex ring-1 ring-slate-800">
            {seg.available > 0 && <div className="h-full" style={{ width: `${pctOf(seg.available)}%`, backgroundColor: '#10b981' }} title={`พร้อมใช้ในคลัง ${seg.available}`} />}
            {seg.issued > 0 && <div className="h-full" style={{ width: `${pctOf(seg.issued)}%`, backgroundColor: '#f59e0b' }} title={`เบิกจ่าย ${seg.issued}`} />}
            {seg.unusable > 0 && <div className="h-full personnel-hatch" style={{ width: `${pctOf(seg.unusable)}%` }} title={`ชำรุด ${seg.unusable}`} />}
            {seg.lost > 0 && <div className="h-full" style={{ width: `${pctOf(seg.lost)}%`, backgroundColor: '#475569' }} title={`สูญหาย ${seg.lost}`} />}
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
            <span className="text-slate-400 space-x-2">
              {seg.available > 0 && <span className="text-emerald-400">คลัง {seg.available.toLocaleString('th-TH')}</span>}
              {seg.issued > 0 && <span className="text-amber-400">เบิก {seg.issued.toLocaleString('th-TH')}</span>}
              {seg.unusable > 0 && <span className="text-rose-400 font-bold">ชำรุด {seg.unusable.toLocaleString('th-TH')}</span>}
            </span>
            <span className={`px-1.5 py-0.5 rounded border font-bold ${st.chip}`}>{pct.toFixed(0)}% {st.label}</span>
          </div>
        </>
      ) : (
        <div className="text-[10px] text-slate-500 font-mono">— ยังไม่ได้บันทึกจำนวน —</div>
      )}
    </button>
  );
};

export const WeaponsDashboard: React.FC<WeaponsDashboardProps> = ({ searchQuery }) => {
  const { data, loading, syncMsg, reload } = useWeaponsData();
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [selected, setSelected] = useState<WeaponItem | null>(null);

  const filtered = useMemo(() => {
    return data.filter((w) => {
      if (selectedCategory !== 'ทั้งหมด' && w.category !== selectedCategory) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return w.name.toLowerCase().includes(q) || w.category.toLowerCase().includes(q);
    });
  }, [data, selectedCategory, searchQuery]);

  const summary = useMemo(() => summarizeByCategory(data), [data]);
  const catOf = (c: string) => summary.find((s) => s.category === c);
  const guns = catOf('อาวุธปืน');
  const ammo = catOf('เครื่องกระสุน');
  const comms = catOf('อุปกรณ์สื่อสาร');

  // Firearms by sub-type for the chart
  const firearmBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    data.filter((w) => w.category === 'อาวุธปืน').forEach((w) => {
      const key = firearmSubtype(w.name);
      map.set(key, (map.get(key) || 0) + w.total);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const grouped = useMemo(() => {
    return WEAPON_CATEGORIES.map((cat) => ({
      category: cat,
      items: filtered.filter((w) => w.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel bg-gradient-to-r from-red-900/40 via-amber-950 to-slate-950 border border-red-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-300 uppercase tracking-widest mb-1">
              <Crosshair className="w-4 h-4 text-red-400" /> งานส่งกำลังบำรุง (กบ.) · บัญชีคุมยุทธภัณฑ์ สภ.สะท้อน
            </div>
            <h2 className="text-xl lg:text-3xl font-extrabold text-white tracking-tight">
              บัญชีคุมอาวุธปืน เครื่องกระสุน และสิ่งของหลวง
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 flex-wrap">
              <span>🔗 ซิงค์เรียลไทม์จาก</span>
              <a href={USER_PROVIDED_WEAPONS_SHEET_URL} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-mono text-[11px]">
                Google Sheet (อาวุธปืนสิ่งของหลวง)
              </a>
            </p>
          </div>
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ซิงค์คลังเรียลไทม์</span>
          </button>
        </div>

        {/* Category filter */}
        <div className="pt-3 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="text-slate-400 font-semibold text-[11px] shrink-0">เลือกหมวด:</span>
          {['ทั้งหมด', ...WEAPON_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-red-600 text-white shadow-md' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {syncMsg && <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-blue-300">{syncMsg}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="อาวุธปืนทั้งหมด"
          value={guns?.total || 0}
          subtext={`เบิกจ่าย ${guns?.issued || 0} / คงคลัง ${guns?.available || 0} กระบอก`}
          icon={Crosshair}
          colorTheme="rose"
        />
        <KpiCard
          title="กระสุนพร้อมใช้งาน"
          value={(ammo?.available || 0).toLocaleString('th-TH')}
          subtext={`คิดเป็น ${(ammo?.readiness || 0).toFixed(0)}% ของคลังกระสุน`}
          icon={CheckCircle2}
          colorTheme="emerald"
        />
        <KpiCard
          title="กระสุนชำรุด/รอทำลาย"
          value={(ammo?.unusable || 0).toLocaleString('th-TH')}
          subtext="ควรเสนอทำลายตามระเบียบ"
          icon={Trash2}
          colorTheme="amber"
        />
        <KpiCard
          title="วิทยุสื่อสารดิจิทัล"
          value={comms?.total || 0}
          subtext={`เบิกจ่ายใช้งาน ${comms?.issued || 0} เครื่อง`}
          icon={Radio}
          colorTheme="blue"
        />
      </div>

      {/* Unusable ammo alert */}
      {ammo && ammo.unusable > 0 && (
        <div className="glass-panel bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <p className="font-bold text-rose-200">
              พบเครื่องกระสุน {ammo.unusable.toLocaleString('th-TH')} นัด อยู่ในสภาพชำรุด/เสื่อมสภาพ (คิดเป็น{' '}
              {((ammo.unusable / ammo.total) * 100).toFixed(0)}% ของคลังกระสุนทั้งหมด)
            </p>
            <p className="text-[12px] text-rose-300/80 mt-0.5">
              ส่วนใหญ่เป็นกระสุน 5.56 มม. (M193) และ .30 คาบิน — ควรจัดทำบัญชีเสนอคณะกรรมการตรวจสอบเพื่อทำลายตามระเบียบสำนักงานตำรวจแห่งชาติ
            </p>
          </div>
        </div>
      )}

      {/* Main: condition ledger + category readiness */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Condition ledger */}
        <div className="xl:col-span-2 glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" /> บัญชีคุมรายการยุทธภัณฑ์
              <span className="text-[11px] font-mono text-slate-500">({filtered.length} รายการ)</span>
            </h3>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-500" /> พร้อมใช้ในคลัง</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-500" /> เบิกจ่ายให้ ตร.</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm personnel-hatch" /> ชำรุด/เสื่อม</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-slate-600" /> สูญหาย</span>
          </div>

          <div className="space-y-5">
            {grouped.map((g) => (
              <div key={g.category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: WEAPON_CAT_COLOR[g.category] }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: WEAPON_CAT_COLOR[g.category] }}>
                    {g.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">({g.items.length})</span>
                </div>
                <div className="space-y-2">
                  {g.items.map((w) => (
                    <ConditionRow key={w.id} w={w} onClick={() => setSelected(w)} />
                  ))}
                </div>
              </div>
            ))}
            {grouped.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">ไม่พบรายการตามเงื่อนไข</div>}
          </div>
        </div>

        {/* Right: category readiness + chart */}
        <div className="space-y-6">
          <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> ความพร้อมใช้แยกตามหมวด
            </h3>
            <div className="space-y-3.5">
              {summary.filter((s) => WEAPON_CATEGORIES.includes(s.category as any)).map((s) => {
                const st = readyStyle(s.readiness);
                return (
                  <button key={s.category} onClick={() => setSelectedCategory(s.category)} className="w-full text-left">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: WEAPON_CAT_COLOR[s.category] }} />
                        {s.category}
                      </span>
                      <span className={`font-mono font-bold ${st.text}`}>{s.readiness.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.readiness}%`, backgroundColor: WEAPON_CAT_COLOR[s.category] }} />
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                      รวม {s.total.toLocaleString('th-TH')} · ชำรุด {s.unusable.toLocaleString('th-TH')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[320px]">
            <StatChart
              title="สัดส่วนอาวุธปืนแยกตามชนิด"
              type="doughnut"
              labels={firearmBreakdown.map(([k]) => k)}
              dataValues={firearmBreakdown.map(([, v]) => v)}
              customColors={['#ef4444', '#f97316', '#f59e0b', '#eab308', '#a855f7']}
            />
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: `${WEAPON_CAT_COLOR[selected.category]}22`, color: WEAPON_CAT_COLOR[selected.category] }}>
                  <Crosshair className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white leading-snug">{selected.name}</h3>
                  <span className="text-[11px] font-bold" style={{ color: WEAPON_CAT_COLOR[selected.category] }}>{selected.category}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const seg = deriveSegments(selected);
              const unit = WEAPON_CAT_UNIT[selected.category] || 'รายการ';
              const items = [
                { label: 'พร้อมใช้ในคลัง', value: seg.available, color: 'text-emerald-300', icon: Package },
                { label: 'เบิกจ่ายให้ ตร.', value: seg.issued, color: 'text-amber-300', icon: Send },
                { label: 'ชำรุด/เสื่อมสภาพ', value: seg.unusable, color: 'text-rose-300', icon: Trash2 },
              ];
              return (
                <>
                  <div className="text-center p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <div className="text-3xl font-extrabold text-white">{selected.total.toLocaleString('th-TH')}</div>
                    <div className="text-[11px] text-slate-400">ยอดทั้งหมด ({unit})</div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {items.map((it) => (
                      <div key={it.label} className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-center">
                        <it.icon className={`w-4 h-4 mx-auto mb-1 ${it.color}`} />
                        <div className={`text-lg font-extrabold ${it.color}`}>{it.value.toLocaleString('th-TH')}</div>
                        <span className="text-[10px] text-slate-400">{it.label}</span>
                      </div>
                    ))}
                  </div>
                  {selected.notes && selected.notes !== '-' && (
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 text-xs flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                      <span className="text-slate-200">{selected.notes}</span>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="pt-1 flex justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
