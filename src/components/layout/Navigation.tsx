import React from 'react';
import type { DynamicPageConfig } from '../../types/dashboard';
import {
  Camera,
  MapPin,
  FileText,
  Car,
  ShieldAlert,
  Plus,
  Trash2,
  Table,
  Building2,
  FolderKanban,
  LayoutGrid,
  Gauge,
} from 'lucide-react';

interface NavigationProps {
  pages: DynamicPageConfig[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onOpenAddModal: () => void;
  onDeleteCustomPage?: (id: string) => void;
  canManage?: boolean;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Camera: Camera,
  LayoutGrid: LayoutGrid,
  MapPin: MapPin,
  FileText: FileText,
  Car: Car,
  ShieldAlert: ShieldAlert,
  Table: Table,
  Building: Building2,
  Gauge: Gauge,
};

export const Navigation: React.FC<NavigationProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onOpenAddModal,
  onDeleteCustomPage,
  canManage = true,
}) => {
  const renderIcon = (name?: string) => {
    const IconComponent = (name && ICON_MAP[name]) || FolderKanban;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <nav className="glass-panel border-b border-slate-800 bg-slate-900/80 px-4 lg:px-8 py-2">
      {/* Tabs are horizontally scrollable on mobile to save vertical space, but wrap on desktop */}
      <div className="max-w-7xl mx-auto flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-visible items-center gap-1.5 py-1 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {pages.map((page) => {
          const isActive = page.id === activePageId;
          return (
            <div key={page.id} className="relative group shrink-0">
              <button
                onClick={() => onSelectPage(page.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60'
                }`}
              >
                {renderIcon(page.iconName)}
                <span>{page.title}</span>
                {page.department && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {page.department}
                  </span>
                )}
              </button>

              {/* Option to delete user-added custom pages */}
              {canManage && page.isCustom && onDeleteCustomPage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`คุณต้องการลบหน้า "${page.title}" หรือไม่?`)) {
                      onDeleteCustomPage(page.id);
                    }
                  }}
                  title="ลบหน้านี้"
                  className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-5 h-5 bg-red-600 text-white rounded-full text-xs shadow-md hover:bg-red-500 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Add Dynamic Sheet Page Button (admins only) */}
        {canManage && (
          <button
            onClick={onOpenAddModal}
            className="flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>เพิ่มหน้าแดชบอร์ดใหม่ (Google Sheet)</span>
          </button>
        )}
      </div>
    </nav>
  );
};
