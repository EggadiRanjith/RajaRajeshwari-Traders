import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'sky';
  badge?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
  trend,
  onClick,
}) => {
  const variantStyles = {
    default: {
      card: 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700/80 shadow-slate-950/40',
      iconBox: 'bg-slate-800 text-slate-300 border-slate-700/60',
      valColor: 'text-white',
      glow: 'from-slate-500/5 to-transparent',
    },
    emerald: {
      card: 'bg-slate-900/90 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-950/20',
      iconBox: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      valColor: 'text-emerald-400',
      glow: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
    },
    amber: {
      card: 'bg-slate-900/90 border-amber-500/20 hover:border-amber-500/40 shadow-amber-950/20',
      iconBox: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      valColor: 'text-amber-400',
      glow: 'from-amber-500/10 via-amber-500/5 to-transparent',
    },
    rose: {
      card: 'bg-slate-900/90 border-rose-500/20 hover:border-rose-500/40 shadow-rose-950/20',
      iconBox: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      valColor: 'text-rose-400',
      glow: 'from-rose-500/10 via-rose-500/5 to-transparent',
    },
    indigo: {
      card: 'bg-slate-900/90 border-indigo-500/20 hover:border-indigo-500/40 shadow-indigo-950/20',
      iconBox: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      valColor: 'text-indigo-300',
      glow: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
    },
    sky: {
      card: 'bg-slate-900/90 border-sky-500/20 hover:border-sky-500/40 shadow-sky-950/20',
      iconBox: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      valColor: 'text-sky-300',
      glow: 'from-sky-500/10 via-sky-500/5 to-transparent',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  const handleClick = () => {
    if (typeof onClick === 'function') {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group relative overflow-hidden rounded-2xl p-5 border backdrop-blur-md transition-all duration-300 ${
        style.card
      } ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl' : ''
      }`}
    >
      {/* Subtle radial corner glow */}
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${style.glow} blur-2xl transition-opacity group-hover:opacity-100 opacity-60`}
      />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h4 className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums font-mono ${style.valColor}`}>
              {value}
            </h4>
            {trend && (
              <span
                className={`text-[10px] font-bold tracking-tight ${
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400/90 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div
            className={`p-2.5 rounded-xl border transition-transform duration-300 group-hover:scale-105 shrink-0 ${style.iconBox}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {badge && (
        <div className="relative mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>{badge}</span>
        </div>
      )}
    </div>
  );
};
