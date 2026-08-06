import { useState, useEffect, useMemo } from 'react';
import type { DynamicPageConfig } from './types/dashboard';
import { DEFAULT_PAGES } from './data/mockInitialData';
import { getSavedDynamicPages, saveDynamicPage, removeDynamicPage } from './services/storageService';
import { getStation, isPageVisible, loadConfigFromFirebase } from './config/dataSources';
import { canViewPage } from './config/access';
import { useAuth } from './auth/useAuth';

// Layout Components
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DynamicPageModal } from './components/layout/DynamicPageModal';
import { SettingsModal } from './components/layout/SettingsModal';

// Dashboard Views
import { CctvDashboard } from './components/dashboards/CctvDashboard';

import { LocalPoiDashboard } from './components/dashboards/LocalPoiDashboard';
import { CaseTrackerDashboard } from './components/dashboards/CaseTrackerDashboard';
import { PersonnelDashboard } from './components/dashboards/PersonnelDashboard';
import { TrafficDashboard } from './components/dashboards/TrafficDashboard';
import { WeaponsDashboard } from './components/dashboards/WeaponsDashboard';
import { WeaponsReadinessDashboard } from './components/dashboards/WeaponsReadinessDashboard';
import { HousingDashboard } from './components/dashboards/HousingDashboard';
import { ReportDashboard } from './components/dashboards/ReportDashboard';
import { GenericSheetDashboard } from './components/dashboards/GenericSheetDashboard';

import { Shield, Radio, MapPin, Loader2, ShieldAlert, LogOut } from 'lucide-react';

export function App() {
  const { loading, email, access, source, firebaseEnabled, needsManualLogin, signInWithGoogle, refreshAccess, submitEmail, logout } =
    useAuth();

  const [customPages, setCustomPages] = useState<DynamicPageConfig[]>([]);
  const [activePageId, setActivePageId] = useState<string>('cctv');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);

  const station = getStation();

  useEffect(() => {
    setCustomPages(getSavedDynamicPages());
  }, []);

  useEffect(() => {
    if (firebaseEnabled) {
      loadConfigFromFirebase().finally(() => {
        setConfigLoaded(true);
      });
    } else {
      setConfigLoaded(true);
    }
  }, [firebaseEnabled]);

  const allPages = useMemo(() => [...DEFAULT_PAGES, ...customPages], [customPages]);

  // Pages the signed-in user is allowed to see (permission + not hidden; dev host sees hidden too)
  const visiblePages = useMemo(
    () => allPages.filter((p) => canViewPage(access, p.id) && isPageVisible(p.id)),
    [allPages, access, configLoaded],
  );

  // Keep the active page within the allowed set
  useEffect(() => {
    if (loading || !configLoaded || !access.known) return;
    if (visiblePages.length && !visiblePages.some((p) => p.id === activePageId)) {
      setActivePageId(visiblePages[0].id);
    }
  }, [loading, configLoaded, access, visiblePages, activePageId]);

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
  if (loading || !configLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-sm">กำลังโหลดการตั้งค่าระบบ...</p>
      </div>
    );
  }

  // ---- Sign-in screen (not authenticated yet) ----
  if (!email) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-7 text-center shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <Shield className="w-8 h-8 text-amber-400 drop-shadow" />
          </div>
          <h1 className="text-lg font-bold text-white mb-1">ระบบศูนย์แดชบอร์ดสารสนเทศ</h1>
          <p className="text-sm font-semibold text-blue-300 mb-1">{station.name}</p>
          <p className="text-xs text-slate-400 mb-5">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>

          {firebaseEnabled && (
            <button
              onClick={signInWithGoogle}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white text-[#1f2937] rounded-xl text-sm font-bold shadow hover:bg-[#f1f5f9] transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
              </svg>
              เข้าสู่ระบบด้วย Google
            </button>
          )}

          {needsManualLogin && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-left space-y-2">
              <p className="text-[10px] font-bold text-amber-400 uppercase">ล็อกอินชั่วคราว (ยังไม่ได้ตั้งระบบยืนยันตัวตน)</p>
              <div className="flex gap-2">
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && emailInput && submitEmail(emailInput)}
                  placeholder="พิมพ์อีเมลที่ได้รับสิทธิ์"
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
                <button onClick={() => emailInput && submitEmail(emailInput)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold">
                  เข้าใช้งาน
                </button>
              </div>
            </div>
          )}

          <p className="mt-5 text-[10px] text-slate-500">เฉพาะบัญชี Google ที่ได้รับอนุญาตเท่านั้น</p>
        </div>
      </div>
    );
  }

  // ---- Access-denied screen (signed in but not authorized / no pages assigned) ----
  if (!access.known || visiblePages.length === 0) {
    const noPages = access.known && visiblePages.length === 0;
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-white mb-1">
            {noPages ? 'ยังไม่ได้รับสิทธิ์เข้าดูหน้าใด ๆ' : 'บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งาน'}
          </h1>
          <p className="text-xs text-slate-400 mb-4">
            เข้าสู่ระบบด้วย <b className="text-slate-200">{email}</b>
            <br />
            {noPages ? 'แต่ยังไม่ได้รับมอบหมายหน้าที่ดูได้ — กรุณาติดต่อผู้ดูแลระบบ' : 'แต่ยังไม่อยู่ในรายชื่อผู้มีสิทธิ์ — กรุณาติดต่อผู้ดูแลระบบ'}
          </p>

          <button onClick={logout} className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold">
            <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ / เข้าด้วยบัญชีอื่น
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
        isTemporary={source === 'manual'}
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

        {activeAllowed && activePageId === 'poi' && <LocalPoiDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'cases' && <CaseTrackerDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'personnel' && <PersonnelDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'traffic' && <TrafficDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'weapons' && <WeaponsDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'weapons-readiness' && <WeaponsReadinessDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'reports' && <ReportDashboard searchQuery={searchQuery} />}
        {activeAllowed && activePageId === 'housing' && <HousingDashboard searchQuery={searchQuery} />}
        {activeAllowed &&
          activePageId !== 'cctv' &&
          activePageId !== 'cctv-wall' &&
          activePageId !== 'poi' &&
          activePageId !== 'cases' &&
          activePageId !== 'personnel' &&
          activePageId !== 'traffic' &&
          activePageId !== 'weapons' &&
          activePageId !== 'weapons-readiness' &&
          activePageId !== 'reports' &&
          activePageId !== 'housing' && (
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
