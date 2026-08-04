import { useState, useEffect, useMemo } from 'react';
import type { DynamicPageConfig } from './types/dashboard';
import { DEFAULT_PAGES } from './data/mockInitialData';
import { getSavedDynamicPages, saveDynamicPage, removeDynamicPage } from './services/storageService';
import { getStation } from './config/dataSources';
import { canViewPage } from './config/access';
import { useAuth } from './auth/useAuth';

// Layout Components
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DynamicPageModal } from './components/layout/DynamicPageModal';
import { SettingsModal } from './components/layout/SettingsModal';

// Dashboard Views
import { CctvDashboard } from './components/dashboards/CctvDashboard';
import { CctvWallDashboard } from './components/dashboards/CctvWallDashboard';
import { LocalPoiDashboard } from './components/dashboards/LocalPoiDashboard';
import { CaseTrackerDashboard } from './components/dashboards/CaseTrackerDashboard';
import { PersonnelDashboard } from './components/dashboards/PersonnelDashboard';
import { TrafficDashboard } from './components/dashboards/TrafficDashboard';
import { WeaponsDashboard } from './components/dashboards/WeaponsDashboard';
import { WeaponsReadinessDashboard } from './components/dashboards/WeaponsReadinessDashboard';
import { GenericSheetDashboard } from './components/dashboards/GenericSheetDashboard';

import { Shield, Radio, MapPin, Loader2, ShieldAlert, LogOut } from 'lucide-react';

export function App() {
  const { loading, email, access, isDev, refreshAccess, setDevEmail, logout } = useAuth();

  const [customPages, setCustomPages] = useState<DynamicPageConfig[]>([]);
  const [activePageId, setActivePageId] = useState<string>('cctv');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [devEmailInput, setDevEmailInput] = useState<string>('');

  const station = getStation();

  useEffect(() => {
    setCustomPages(getSavedDynamicPages());
  }, []);

  const allPages = useMemo(() => [...DEFAULT_PAGES, ...customPages], [customPages]);

  // Pages the signed-in user is allowed to see
  const visiblePages = useMemo(() => allPages.filter((p) => canViewPage(access, p.id)), [allPages, access]);

  // Keep the active page within the allowed set
  useEffect(() => {
    if (loading || !access.known) return;
    if (visiblePages.length && !visiblePages.some((p) => p.id === activePageId)) {
      setActivePageId(visiblePages[0].id);
    }
  }, [loading, access, visiblePages, activePageId]);

  const activePageConfig = useMemo(
    () => allPages.find((p) => p.id === activePageId) || DEFAULT_PAGES[0],
    [allPages, activePageId],
  );

  const handleSavePage = (newPageData: any) => {
    const saved = saveDynamicPage(newPageData);
    setCustomPages((prev) => [...prev, saved]);
    setActivePageId(saved.id);
  };

  const handleDeleteCustomPage = (id: string) => {
    const updated = removeDynamicPage(id);
    setCustomPages(updated);
    if (activePageId === id) setActivePageId('cctv');
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const roleLabel = access.isAdmin ? 'ผู้ดูแลระบบ (Admin)' : access.role === 'user' ? 'ผู้ใช้งาน (User)' : '';

  // ---- Loading gate ----
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-sm">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </div>
    );
  }

  // ---- No access gate ----
  if (!access.known || visiblePages.length === 0) {
    const noPages = access.known && visiblePages.length === 0;
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-white mb-1">
            {noPages ? 'ยังไม่ได้รับสิทธิ์เข้าดูหน้าใด ๆ' : 'ไม่มีสิทธิ์เข้าใช้งาน'}
          </h1>
          <p className="text-xs text-slate-400 mb-4">
            {email ? (
              <>
                บัญชี <b className="text-slate-200">{email}</b> {noPages ? 'ยังไม่ได้รับมอบหมายหน้าที่ดูได้' : 'ยังไม่อยู่ในรายชื่อผู้มีสิทธิ์'}
                <br />
                กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์
              </>
            ) : (
              'กรุณาเข้าสู่ระบบด้วยบัญชี Google ที่ได้รับอนุญาต'
            )}
          </p>

          {isDev && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-left space-y-2">
              <p className="text-[10px] font-bold text-amber-400 uppercase">โหมดพัฒนา (Dev) — จำลองอีเมล</p>
              <div className="flex gap-2">
                <input
                  value={devEmailInput}
                  onChange={(e) => setDevEmailInput(e.target.value)}
                  placeholder="พิมพ์อีเมลเพื่อทดสอบสิทธิ์"
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
                <button onClick={() => devEmailInput && setDevEmail(devEmailInput)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">
                  ใช้
                </button>
              </div>
            </div>
          )}

          <button onClick={logout} className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold">
            <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ / เข้าใหม่
          </button>
        </div>
      </div>
    );
  }

  const activeAllowed = canViewPage(access, activePageId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <Header
        stationName={station.name}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefreshData={handleRefreshData}
        isLoading={isRefreshing}
        userEmail={email}
        roleLabel={roleLabel}
        isAdmin={access.isAdmin}
        isDev={isDev}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={logout}
      />

      <Navigation
        pages={visiblePages}
        activePageId={activePageId}
        onSelectPage={setActivePageId}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onDeleteCustomPage={handleDeleteCustomPage}
        canManage={access.isAdmin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {activeAllowed && activePageId === 'cctv' && <CctvDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'cctv-wall' && <CctvWallDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'poi' && <LocalPoiDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'cases' && <CaseTrackerDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'personnel' && <PersonnelDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'traffic' && <TrafficDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'weapons' && <WeaponsDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'weapons-readiness' && <WeaponsReadinessDashboard searchQuery={searchQuery} />}
        {activeAllowed &&
          activePageId !== 'cctv' &&
          activePageId !== 'cctv-wall' &&
          activePageId !== 'poi' &&
          activePageId !== 'cases' &&
          activePageId !== 'personnel' &&
          activePageId !== 'traffic' &&
          activePageId !== 'weapons' &&
          activePageId !== 'weapons-readiness' && (
            <GenericSheetDashboard pageConfig={activePageConfig} searchQuery={searchQuery} />
          )}
      </main>

      <DynamicPageModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSavePage={handleSavePage} />

      {access.isAdmin && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          pages={allPages.map((p) => ({ id: p.id, title: p.title }))}
          currentEmail={email}
          onAccessChanged={refreshAccess}
        />
      )}

      <footer className="border-t border-slate-800/80 bg-slate-900/90 py-6 px-4 lg:px-8 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-slate-200">ระบบศูนย์แดชบอร์ดสารสนเทศ {station.shortName}</p>
              <p className="text-[11px] text-slate-400">ROYAL THAI POLICE COMMAND &amp; CONTROL GIS SYSTEM &copy; 2026 All rights reserved.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" /> ONLINE
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-400" /> {station.center.lat.toFixed(4)} N, {station.center.lng.toFixed(4)} E
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
