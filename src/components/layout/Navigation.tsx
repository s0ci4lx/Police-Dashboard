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
} from 'lucide-react';

interface NavigationProps {
  pages: DynamicPageConfig[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onOpenAddModal: () => void;
  onDeleteCustomPage?: (id: string) => void;
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
};

export const Navigation: React.FC<NavigationProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onOpenAddModal,
  onDeleteCustomPage,
}) => {
  const renderIcon = (name?: string) => {
    const IconComponent = (name && ICON_MAP[name]) || FolderKanban;
    return <IconComponent className="w-4 h-4" />;
  };

  return (
    <nav className="glass-panel border-b border-slate-800 bg-slate-900/80 px-4 lg:px-8 py-2 overflow-x-auto scrollbar-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-w-max">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 py-1">
          {pages.map((page) => {
            const isActive = page.id === activePageId;
            return (
              <div key={page.id} className="relative group">
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
                {page.isCustom && onDeleteCustomPage && (
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
        </div>

        {/* Add Dynamic Sheet Page Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 transition-all shadow-md active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>เพิ่มหน้าแดชบอร์ดใหม่ (Google Sheet)</span>
        </button>
      </div>
    </nav>
  );
};
