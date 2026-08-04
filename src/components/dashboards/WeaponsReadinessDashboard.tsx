import React, { useMemo } from 'react';
import {
  useWeaponsData,
  deriveSegments,
  summarizeByCategory,
  ammoLabel,
  WEAPON_CAT_COLOR,
  WEAPON_CAT_UNIT,
} from '../../data/weaponsShared';
import {
  Gauge,
  RefreshCw,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Send,
  Warehouse,
  Crosshair,
  Radio,
  ShieldAlert,
  Boxes,
} from 'lucide-react';

interface Props {
  searchQuery: string;
}

const CAT_ICON: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  'อาวุธปืน': Crosshair,
  'เครื่องกระสุน': Boxes,
  'อุปกรณ์สื่อสาร': Radio,
  'ยุทธภัณฑ์ป้องกัน': ShieldAlert,
};

const ringColor = (pct: number) => (pct >= 90 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e');

// Circular readiness gauge
const ReadyGauge: React.FC<{ label: string; pct: number; total: number; unit: string; unusable: number; color: string; Icon: React.FC<{ className?: string; style?: React.CSSProperties }> }> = ({
  label,
  pct,
  total,
  unit,
  unusable,
  color,
  Icon,
}) => {
  const r = 46;
  const circ = 2 * Math.PI * r;
  return (
    <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 mb-2 text-center">
        <Icon className="w-3.5 h-3.5" style={{ color }} /> {label}
      </div>
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="11" />
          <circle cx="60" cy="60" r={r} fill="none" stroke={ringColor(pct)} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(pct / 100) * circ} ${circ}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{pct.toFixed(0)}%</span>
          <span className="text-[9px] text-slate-400">พร้อมใช้</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="text-[11px] font-mono text-slate-300">
          รวม {total.toLocaleString('th-TH')} {unit}
        </div>
        {unusable > 0 && <div className="text-[10px] font-mono text-rose-400">ชำรุด {unusable.toLocaleString('th-TH')}</div>}
      </div>
    </div>
  );
};

// Horizontal stacked distribution bar
const StackBar: React.FC<{ segments: Array<{ value: number; color: string; hatch?: boolean }>; total: number }> = ({ segments, total }) => (
  <div className="h-3.5 w-full rounded-full bg-slate-800 overflow-hidden flex ring-1 ring-slate-800">
    {segments.map((s, i) =>
      s.value > 0 ? (
        <div
          key={i}
          className={`h-full ${s.hatch ? 'personnel-hatch' : ''}`}
          style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%`, backgroundColor: s.hatch ? undefined : s.color }}
        />
      ) : null,
    )}
  </div>
);

export const WeaponsReadinessDashboard: React.FC<Props> = ({ searchQuery: _searchQuery }) => {
  const { data, loading, syncMsg, reload } = useWeaponsData();
  const summary = useMemo(() => summarizeByCategory(data), [data]);
  const catOf = (c: string) => summary.find((s) => s.category === c);

  const ammoRows = useMemo(
    () =>
      data
        .filter((w) => w.category === 'เครื่องกระสุน')
        .map((w) => ({ w, seg: deriveSegments(w) }))
        .sort((a, b) => b.w.total - a.w.total),
    [data],
  );

  const guns = catOf('อาวุธปืน');
  const comms = catOf('อุปกรณ์สื่อสาร');
  const ammo = catOf('เครื่องกระสุน');

  const gaugeCats = ['อาวุธปืน', 'เครื่องกระสุน', 'อุปกรณ์สื่อสาร', 'ยุทธภัณฑ์ป้องกัน'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel bg-gradient-to-r from-slate-950 via-red-950/40 to-amber-950/30 border border-amber-500/25 rounded-2xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 shadow-inner">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300 uppercase tracking-widest mb-1">
                <ShieldAlert className="w-3.5 h-3.5" /> LOGISTICS READINESS · ภาพรวมความพร้อมยุทธภัณฑ์
              </div>
              <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">ภาพรวมความพร้อมคลังยุทธภัณฑ์ สภ.สะท้อน</h2>
              <p className="text-xs text-slate-400 mt-0.5">สรุปสำหรับผู้บังคับบัญชา — ความพร้อมใช้ การเบิกจ่าย และรายการที่ต้องเร่งแก้ไข</p>
            </div>
          </div>
          <button
            onClick={reload}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>ซิงค์เรียลไทม์</span>
          </button>
        </div>
      </div>

      {syncMsg && <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-blue-300">{syncMsg}</div>}

      {/* Readiness gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {gaugeCats.map((cat) => {
          const s = catOf(cat);
          if (!s) return null;
          return (
            <ReadyGauge
              key={cat}
              label={cat}
              pct={s.readiness}
              total={s.total}
              unit={WEAPON_CAT_UNIT[cat] || 'รายการ'}
              unusable={s.unusable}
              color={WEAPON_CAT_COLOR[cat]}
              Icon={CAT_ICON[cat] || ShieldAlert}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
        {/* Ammunition spotlight */}
        <div className="xl:col-span-3 glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1 pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-amber-400" /> สภาพเครื่องกระสุนรายขนาด
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded-sm bg-emerald-500" /> พร้อมใช้</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2 rounded-sm personnel-hatch" /> ชำรุด</span>
            </span>
          </div>

          {/* Expired callout */}
          {ammo && ammo.unusable > 0 && (
            <div className="my-3 flex items-center gap-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30">
              <Trash2 className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <div className="text-2xl font-extrabold text-rose-300 leading-none">{ammo.unusable.toLocaleString('th-TH')} <span className="text-sm font-bold">นัด</span></div>
                <div className="text-[11px] text-rose-300/80">เสื่อมสภาพ/รอทำลาย — {((ammo.unusable / ammo.total) * 100).toFixed(0)}% ของคลังกระสุน</div>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-3">
            {ammoRows.map(({ w, seg }) => {
              const usablePct = w.total > 0 ? (seg.available / w.total) * 100 : 0;
              return (
                <div key={w.id}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-200">{ammoLabel(w.name)}</span>
                    <span className="font-mono text-slate-400">
                      {w.total.toLocaleString('th-TH')} นัด ·{' '}
                      <span className={usablePct >= 50 ? 'text-emerald-300' : 'text-rose-300'}>{usablePct.toFixed(0)}% พร้อม</span>
                    </span>
                  </div>
                  <StackBar total={w.total} segments={[{ value: seg.available, color: '#10b981' }, { value: seg.unusable, color: '#f43f5e', hatch: true }]} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribution */}
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Send className="w-4 h-4 text-amber-400" /> การเบิกจ่าย vs คงคลัง
            </h3>

            {/* Firearms */}
            {guns && (
              <div className="mb-5">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5"><Crosshair className="w-3.5 h-3.5 text-rose-400" /> อาวุธปืน</span>
                  <span className="font-mono text-slate-400">{guns.total.toLocaleString('th-TH')} กระบอก</span>
                </div>
                <StackBar total={guns.total} segments={[{ value: guns.issued, color: '#f59e0b' }, { value: guns.available, color: '#3b82f6' }, { value: guns.unusable, color: '#f43f5e', hatch: true }]} />
                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono">
                  <span className="text-amber-400 flex items-center gap-1"><Send className="w-3 h-3" /> เบิกจ่าย {guns.issued}</span>
                  <span className="text-blue-400 flex items-center gap-1"><Warehouse className="w-3 h-3" /> คงคลัง {guns.available}</span>
                </div>
              </div>
            )}

            {/* Comms */}
            {comms && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-blue-400" /> วิทยุสื่อสาร</span>
                  <span className="font-mono text-slate-400">{comms.total.toLocaleString('th-TH')} เครื่อง</span>
                </div>
                <StackBar total={comms.total} segments={[{ value: comms.issued, color: '#f59e0b' }, { value: comms.available, color: '#3b82f6' }, { value: comms.unusable, color: '#f43f5e', hatch: true }]} />
                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono">
                  <span className="text-amber-400 flex items-center gap-1"><Send className="w-3 h-3" /> เบิกจ่าย {comms.issued}</span>
                  <span className="text-blue-400 flex items-center gap-1"><Warehouse className="w-3 h-3" /> คงคลัง {comms.available}</span>
                  {comms.unusable > 0 && <span className="text-rose-400">ชำรุด {comms.unusable}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Readiness verdict */}
          <div className="glass-panel bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ประเด็นสำคัญ
            </h3>
            <div className="flex items-start gap-2 text-[12px] text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>อาวุธปืนอยู่ในสภาพพร้อมใช้ {guns ? guns.readiness.toFixed(0) : '-'}% ({guns?.total.toLocaleString('th-TH')} กระบอก)</span>
            </div>
            <div className="flex items-start gap-2 text-[12px] text-slate-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span>เครื่องกระสุนพร้อมใช้เพียง {ammo ? ammo.readiness.toFixed(0) : '-'}% — เร่งเสนอทำลายกระสุนเสื่อมสภาพ {ammo?.unusable.toLocaleString('th-TH')} นัด</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
