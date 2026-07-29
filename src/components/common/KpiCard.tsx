import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  icon?: LucideIcon;
  colorTheme?: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  isActive?: boolean;
  onClick?: () => void;
}

const THEME_CLASSES = {
  blue: {
    bg: 'from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-400',
    iconBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    valueColor: 'text-blue-200',
    activeBg: 'bg-blue-600/30 border-blue-400 shadow-blue-500/20',
  },
  indigo: {
    bg: 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30 text-indigo-400',
    iconBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    valueColor: 'text-indigo-200',
    activeBg: 'bg-indigo-600/30 border-indigo-400 shadow-indigo-500/20',
  },
  emerald: {
    bg: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    valueColor: 'text-emerald-200',
    activeBg: 'bg-emerald-600/30 border-emerald-400 shadow-emerald-500/20',
  },
  amber: {
    bg: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
    iconBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    valueColor: 'text-amber-200',
    activeBg: 'bg-amber-600/30 border-amber-400 shadow-amber-500/20',
  },
  rose: {
    bg: 'from-rose-600/20 to-rose-900/10 border-rose-500/30 text-rose-400',
    iconBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    valueColor: 'text-rose-200',
    activeBg: 'bg-rose-600/30 border-rose-400 shadow-rose-500/20',
  },
  purple: {
    bg: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-400',
    iconBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    valueColor: 'text-purple-200',
    activeBg: 'bg-purple-600/30 border-purple-400 shadow-purple-500/20',
  },
  slate: {
    bg: 'from-slate-700/30 to-slate-900/20 border-slate-700/50 text-slate-400',
    iconBg: 'bg-slate-700/30 text-slate-300 border-slate-600/40',
    valueColor: 'text-slate-200',
    activeBg: 'bg-slate-700/40 border-slate-500 shadow-slate-500/10',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  colorTheme = 'blue',
  isActive = false,
  onClick,
}) => {
  const theme = THEME_CLASSES[colorTheme] || THEME_CLASSES.blue;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden glass-panel bg-gradient-to-br border rounded-2xl p-4 lg:p-5 transition-all duration-300 shadow-lg ${
        isActive ? theme.activeBg : theme.bg
      } ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">{title}</p>
          <h3 className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${theme.valueColor}`}>
            {typeof value === 'number' ? value.toLocaleString('th-TH') : value}
          </h3>
          {subtext && <p className="text-[11px] font-medium text-slate-400">{subtext}</p>}
        </div>

        {Icon && (
          <div className={`p-2.5 rounded-xl border ${theme.iconBg} shadow-inner shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Subtle corner indicator glow */}
      <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none" />
    </div>
  );
};
