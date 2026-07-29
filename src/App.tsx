import { useState, useEffect, useMemo } from 'react';
import type { DynamicPageConfig } from './types/dashboard';
import { DEFAULT_PAGES } from './data/mockInitialData';
import { getSavedDynamicPages, saveDynamicPage, removeDynamicPage } from './services/storageService';

// Layout Components
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DynamicPageModal } from './components/layout/DynamicPageModal';

// Dashboard Views
import { CctvDashboard } from './components/dashboards/CctvDashboard';
import { LocalPoiDashboard } from './components/dashboards/LocalPoiDashboard';
import { CaseTrackerDashboard } from './components/dashboards/CaseTrackerDashboard';
import { PersonnelDashboard } from './components/dashboards/PersonnelDashboard';
import { TrafficDashboard } from './components/dashboards/TrafficDashboard';
import { WeaponsDashboard } from './components/dashboards/WeaponsDashboard';
import { GenericSheetDashboard } from './components/dashboards/GenericSheetDashboard';

import { Shield, Radio, MapPin } from 'lucide-react';

export function App() {
  const [customPages, setCustomPages] = useState<DynamicPageConfig[]>([]);
  const [activePageId, setActivePageId] = useState<string>('cctv');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load custom pages from localStorage
  useEffect(() => {
    const saved = getSavedDynamicPages();
    setCustomPages(saved);
  }, []);

  // Combined pages list
  const allPages = useMemo(() => {
    return [...DEFAULT_PAGES, ...customPages];
  }, [customPages]);

  // Current active page config
  const activePageConfig = useMemo(() => {
    return allPages.find((p) => p.id === activePageId) || DEFAULT_PAGES[0];
  }, [allPages, activePageId]);

  // Save new custom dynamic page
  const handleSavePage = (newPageData: any) => {
    const saved = saveDynamicPage(newPageData);
    setCustomPages((prev) => [...prev, saved]);
    setActivePageId(saved.id);
  };

  // Delete custom dynamic page
  const handleDeleteCustomPage = (id: string) => {
    const updated = removeDynamicPage(id);
    setCustomPages(updated);
    if (activePageId === id) {
      setActivePageId('cctv');
    }
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Main Command Center Header */}
      <Header
        stationName="สถานีตำรวจภูธรหาดใหญ่ (สภ.หาดใหญ่)"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefreshData={handleRefreshData}
        isLoading={isRefreshing}
      />

      {/* Navigation Bar for Dynamic Pages & Police Sections */}
      <Navigation
        pages={allPages}
        activePageId={activePageId}
        onSelectPage={setActivePageId}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onDeleteCustomPage={handleDeleteCustomPage}
      />

      {/* Main Dashboard Canvas Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {activePageId === 'cctv' && <CctvDashboard searchQuery={searchQuery} />}

        {activePageId === 'poi' && <LocalPoiDashboard searchQuery={searchQuery} />}

        {activePageId === 'cases' && <CaseTrackerDashboard searchQuery={searchQuery} />}

        {activePageId === 'personnel' && <PersonnelDashboard searchQuery={searchQuery} />}

        {activePageId === 'traffic' && <TrafficDashboard searchQuery={searchQuery} />}

        {activePageId === 'weapons' && <WeaponsDashboard searchQuery={searchQuery} />}

        {activePageId !== 'cctv' &&
          activePageId !== 'poi' &&
          activePageId !== 'cases' &&
          activePageId !== 'personnel' &&
          activePageId !== 'traffic' &&
          activePageId !== 'weapons' && (
            <GenericSheetDashboard pageConfig={activePageConfig} searchQuery={searchQuery} />
          )}
      </main>

      {/* Dynamic Page Addition Modal */}
      <DynamicPageModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSavePage={handleSavePage}
      />

      {/* Police Station Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/90 py-6 px-4 lg:px-8 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-slate-200">
                ระบบศูนย์แดชบอร์ดสารสนเทศ สถานีตำรวจภูธรหาดใหญ่
              </p>
              <p className="text-[11px] text-slate-400">
                ROYAL THAI POLICE COMMAND & CONTROL GIS SYSTEM &copy; 2026 All rights reserved.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" /> ONLINE
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-400" /> 7.0084 N, 100.4767 E
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
