import React, { useState, useEffect } from 'react';
import {
  DATA_SOURCE_META,
  DEFAULT_DATA_SOURCES,
  getAllDataSources,
  setDataSource,
  resetDataSource,
  getStation,
  setStation,
  exportConfig,
  importConfig,
  resetAllConfig,
  type DataSourceKey,
} from '../../config/dataSources';
import { getUsersAsync, upsertUserAsync, removeUserAsync, isCentralStore, type UserAccess, type Role } from '../../config/access';
import { fetchSheetData } from '../../services/googleSheetService';
import {
  Settings,
  X,
  Database,
  Users,
  MapPin,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface PageInfo {
  id: string;
  title: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageInfo[];
  currentEmail: string | null;
  onAccessChanged: () => void; // re-resolve current user's access (live)
}

type Tab = 'sources' | 'users' | 'station' | 'backup';

type TestState = { status: 'idle' | 'loading' | 'ok' | 'error'; msg?: string };

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, pages, currentEmail, onAccessChanged }) => {
  const [tab, setTab] = useState<Tab>('sources');

  // Data sources
  const [sources, setSources] = useState<Record<DataSourceKey, string>>(() => getAllDataSources());
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [savedMsg, setSavedMsg] = useState<string>('');

  // Users
  const [users, setUsersState] = useState<UserAccess[]>([]);
  const reloadUsers = () => getUsersAsync().then(setUsersState);
  useEffect(() => {
    if (isOpen) getUsersAsync().then(setUsersState);
  }, [isOpen]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('user');
  const [newPages, setNewPages] = useState<string[]>([]);

  // Station
  const [station, setStationState] = useState(() => getStation());

  // Backup
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');

  if (!isOpen) return null;

  const testSource = async (key: DataSourceKey) => {
    const url = sources[key];
    if (!url) {
      setTests((t) => ({ ...t, [key]: { status: 'error', msg: 'ยังไม่ได้ใส่ลิงก์' } }));
      return;
    }
    setTests((t) => ({ ...t, [key]: { status: 'loading' } }));
    try {
      const { data, columns } = await fetchSheetData<Record<string, any>>(url);
      setTests((t) => ({ ...t, [key]: { status: 'ok', msg: `พบ ${data.length} แถว · ${columns.length} คอลัมน์` } }));
    } catch (e: any) {
      setTests((t) => ({ ...t, [key]: { status: 'error', msg: e?.message || 'เชื่อมต่อไม่สำเร็จ (ตรวจสอบการแชร์ชีต)' } }));
    }
  };

  const saveSources = () => {
    (Object.keys(sources) as DataSourceKey[]).forEach((k) => setDataSource(k, sources[k]));
    setSavedMsg('บันทึกแหล่งข้อมูลแล้ว — โหลดหน้าใหม่เพื่อดึงข้อมูลชุดใหม่');
  };

  const resetSource = (key: DataSourceKey) => {
    resetDataSource(key);
    setSources((s) => ({ ...s, [key]: DEFAULT_DATA_SOURCES[key] }));
    setTests((t) => ({ ...t, [key]: { status: 'idle' } }));
  };

  const addUser = async () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) {
      setSavedMsg('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }
    await upsertUserAsync({ email, role: newRole, pages: newRole === 'admin' ? [] : newPages });
    await reloadUsers();
    setNewEmail('');
    setNewRole('user');
    setNewPages([]);
    onAccessChanged();
  };

  const deleteUser = async (email: string) => {
    await removeUserAsync(email);
    await reloadUsers();
    onAccessChanged();
  };

  const toggleUserPage = async (email: string, pageId: string) => {
    const u = users.find((x) => x.email === email);
    if (!u) return;
    const has = u.pages.includes(pageId);
    await upsertUserAsync({ ...u, pages: has ? u.pages.filter((p) => p !== pageId) : [...u.pages, pageId] });
    await reloadUsers();
    onAccessChanged();
  };

  const changeUserRole = async (email: string, role: Role) => {
    const u = users.find((x) => x.email === email);
    if (!u) return;
    await upsertUserAsync({ ...u, role });
    await reloadUsers();
    onAccessChanged();
  };

  const saveStation = () => {
    setStation(station);
    setSavedMsg('บันทึกข้อมูลสถานีแล้ว — โหลดหน้าใหม่เพื่อใช้ค่าใหม่');
  };

  const doImport = () => {
    if (importConfig(importText)) {
      setImportMsg('นำเข้าสำเร็จ — โหลดหน้าใหม่เพื่อใช้การตั้งค่าใหม่');
      setSources(getAllDataSources());
      setStationState(getStation());
    } else {
      setImportMsg('รูปแบบ JSON ไม่ถูกต้อง');
    }
  };

  const reloadPage = () => window.location.reload();

  const TABS: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'sources', label: 'แหล่งข้อมูล', icon: Database },
    { key: 'users', label: 'ผู้ใช้และสิทธิ์', icon: Users },
    { key: 'station', label: 'ข้อมูลสถานี', icon: MapPin },
    { key: 'backup', label: 'สำรอง/นำเข้า', icon: Download },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col glass-panel bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ตั้งค่าระบบ (สำหรับผู้ดูแล)</h3>
              <p className="text-[11px] text-slate-400">จัดการแหล่งข้อมูล สิทธิ์ผู้ใช้ และข้อมูลสถานี</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-800 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-bold transition-all border-b-2 ${
                tab === t.key ? 'text-blue-300 border-blue-500' : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ---- Data sources ---- */}
          {tab === 'sources' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400">
                วางลิงก์ Google Sheet ของแต่ละหน้า (ต้องแชร์เป็น "ทุกคนที่มีลิงก์ ดูได้") แล้วกด "ทดสอบ" ก่อนบันทึก
              </p>
              {DATA_SOURCE_META.map((meta) => {
                const test = tests[meta.key] || { status: 'idle' };
                return (
                  <div key={meta.key} className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[12px] font-bold text-slate-100">{meta.label}</span>
                        <span className="text-[10px] text-slate-500 ml-2">→ {meta.page}</span>
                      </div>
                      {meta.optional && <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">ไม่บังคับ</span>}
                    </div>
                    <input
                      type="url"
                      value={sources[meta.key]}
                      onChange={(e) => setSources((s) => ({ ...s, [meta.key]: e.target.value }))}
                      placeholder={meta.hint || 'วางลิงก์ Google Sheet ที่นี่'}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => testSource(meta.key)} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold">
                        {test.status === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} ทดสอบ
                      </button>
                      <button onClick={() => resetSource(meta.key)} className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-[11px] font-bold">
                        <RotateCcw className="w-3 h-3" /> ค่าเริ่มต้น
                      </button>
                      {test.status === 'ok' && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> {test.msg}</span>}
                      {test.status === 'error' && <span className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {test.msg}</span>}
                    </div>
                  </div>
                );
              })}
              <button onClick={saveSources} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold">
                <Save className="w-3.5 h-3.5" /> บันทึกแหล่งข้อมูล
              </button>
            </div>
          )}

          {/* ---- Users & permissions ---- */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className={`text-[11px] px-3 py-2 rounded-lg border ${isCentralStore() ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                {isCentralStore()
                  ? '✓ เก็บสิทธิ์ที่ Firestore (ส่วนกลาง) — เพิ่ม/แก้ที่นี่มีผลกับทุกเครื่องทันที'
                  : '⚠️ เก็บสิทธิ์ในเครื่องนี้เท่านั้น (ยังไม่ได้ตั้ง Firestore) — ผู้ใช้อื่นจะยังเข้าไม่ได้จากเครื่องตัวเอง'}
              </div>
              {/* Add user */}
              <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2.5">
                <h4 className="text-[12px] font-bold text-slate-100 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-emerald-400" /> เพิ่มผู้ใช้</h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="อีเมล Google (เช่น officer@gmail.com)"
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {newRole === 'user' && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5">ติ๊กหน้าที่อนุญาตให้ดู:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {pages.map((p) => (
                        <label key={p.id} className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newPages.includes(p.id)}
                            onChange={() => setNewPages((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))}
                            className="accent-blue-500"
                          />
                          {p.title}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={addUser} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold">
                  <Plus className="w-3.5 h-3.5" /> เพิ่มผู้ใช้
                </button>
              </div>

              {/* Existing users */}
              <div className="space-y-2">
                <h4 className="text-[12px] font-bold text-slate-300">ผู้ใช้ที่มีสิทธิ์ ({users.length})</h4>
                {users.length === 0 && (
                  <p className="text-[11px] text-slate-500 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                    ยังไม่มีผู้ใช้ — เพิ่มอีเมลด้านบน (อีเมลผู้ดูแลตั้งต้นเป็น Admin อยู่แล้วแม้ไม่อยู่ในรายการ)
                  </p>
                )}
                {users.map((u) => (
                  <div key={u.email} className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold text-slate-100 truncate flex items-center gap-1.5">
                        {u.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {u.email}
                        {u.email === currentEmail && <span className="text-[9px] text-blue-300 bg-blue-500/15 px-1.5 rounded">คุณ</span>}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <select value={u.role} onChange={(e) => changeUserRole(u.email, e.target.value as Role)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-bold text-white">
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button onClick={() => deleteUser(u.email)} className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg" title="ลบผู้ใช้">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {u.role === 'admin' ? (
                      <p className="text-[10px] text-amber-300/80">เห็นทุกหน้า + เข้าหน้าตั้งค่าได้</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {pages.map((p) => (
                          <label key={p.id} className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={u.pages.includes(p.id)} onChange={() => toggleUserPage(u.email, p.id)} className="accent-blue-500" />
                            {p.title}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- Station ---- */}
          {tab === 'station' && (
            <div className="space-y-3 max-w-md">
              <label className="block">
                <span className="text-[11px] font-bold text-slate-300">ชื่อสถานี (เต็ม)</span>
                <input value={station.name} onChange={(e) => setStationState((s) => ({ ...s, name: e.target.value }))} className="mt-1 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-300">ชื่อย่อ</span>
                <input value={station.shortName} onChange={(e) => setStationState((s) => ({ ...s, shortName: e.target.value }))} className="mt-1 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white" />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['lat', 'lng', 'zoom'] as const).map((f) => (
                  <label key={f} className="block">
                    <span className="text-[11px] font-bold text-slate-300 uppercase">{f}</span>
                    <input
                      type="number"
                      step="any"
                      value={station.center[f]}
                      onChange={(e) => setStationState((s) => ({ ...s, center: { ...s.center, [f]: Number(e.target.value) } }))}
                      className="mt-1 w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white"
                    />
                  </label>
                ))}
              </div>
              <button onClick={saveStation} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold">
                <Save className="w-3.5 h-3.5" /> บันทึกข้อมูลสถานี
              </button>
            </div>
          )}

          {/* ---- Backup ---- */}
          {tab === 'backup' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-[12px] font-bold text-slate-300 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> ส่งออกการตั้งค่า (คัดลอกเก็บ/ย้ายเครื่อง)</h4>
                <textarea readOnly value={exportConfig()} className="w-full h-28 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-300" />
              </div>
              <div className="space-y-2">
                <h4 className="text-[12px] font-bold text-slate-300 flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> นำเข้าการตั้งค่า</h4>
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="วาง JSON การตั้งค่าที่นี่" className="w-full h-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-mono text-white placeholder-slate-500" />
                <div className="flex items-center gap-2">
                  <button onClick={doImport} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold"><Upload className="w-3.5 h-3.5" /> นำเข้า</button>
                  {importMsg && <span className="text-[10px] text-blue-300">{importMsg}</span>}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    if (confirm('ล้างการตั้งค่าทั้งหมด (แหล่งข้อมูล/สถานี) กลับเป็นค่าเริ่มต้น? (ไม่รวมสิทธิ์ผู้ใช้)')) {
                      resetAllConfig();
                      setSources(getAllDataSources());
                      setStationState(getStation());
                      setSavedMsg('ล้างการตั้งค่าแล้ว — โหลดหน้าใหม่');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ล้างการตั้งค่าแหล่งข้อมูล/สถานี
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {savedMsg && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-blue-500/10 shrink-0">
            <span className="text-[11px] text-blue-200 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {savedMsg}</span>
            <button onClick={reloadPage} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shrink-0">
              <RefreshCw className="w-3.5 h-3.5" /> โหลดหน้าใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
