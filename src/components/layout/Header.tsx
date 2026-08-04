import React, { useState, useEffect } from 'react';
import { Shield, Radio, Search, Clock, RefreshCw, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  stationName?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefreshData?: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  stationName = 'สถานีตำรวจภูธรสะท้อน',
  searchQuery,
  onSearchChange,
  onRefreshData,
  isLoading = false,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light') return 'light';
    try {
      return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply & persist theme
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'light') el.setAttribute('data-theme', 'light');
    else el.removeAttribute('data-theme');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        }) +
          ' ' +
          now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-700/60 bg-slate-900/90 backdrop-blur-md px-4 lg:px-8 py-3.5 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Branding & Police Badge */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 border border-blue-400/30 shadow-lg shadow-blue-500/20">
            <Shield className="w-7 h-7 text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md tracking-wider">
                COMMAND CENTER
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE SYNC
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent tracking-tight">
              {stationName}
            </h1>
          </div>
        </div>

        {/* Center: Live Time & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Global Search Bar */}
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหาข้อมูล, พิกัด, สถานที่, เลขคดี..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
            aria-label="สลับธีมสว่าง/มืด"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all active:scale-95"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
          </button>

          {/* Refresh Button */}
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isLoading}
              title="ดึงข้อมูลล่าสุดจาก Google Sheets"
              className={`p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-all ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          )}
        </div>

        {/* Right: Realtime Clock Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 px-3.5 py-1.5 rounded-xl text-slate-300 text-xs shadow-inner">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-slate-200 font-medium">{timeStr}</span>
        </div>
      </div>
    </header>
  );
};
