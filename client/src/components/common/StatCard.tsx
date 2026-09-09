import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'gold' | 'emerald' | 'rose' | 'cyan' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  trendType = 'neutral',
  color = 'gold',
  onClick,
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'gold':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'emerald':
        return 'text-emerald-800 bg-emerald-50 border-emerald-200';
      case 'rose':
        return 'text-rose-800 bg-rose-50 border-rose-200';
      case 'cyan':
        return 'text-teal-800 bg-teal-50 border-teal-200';
      case 'slate':
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md hover:border-amber-400 ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl border ${getColorClasses()}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-black text-slate-900 tracking-tight">{value}</span>
        {trend && (
          <span
            className={`text-xs font-bold ${
              trendType === 'positive'
                ? 'text-emerald-700'
                : trendType === 'negative'
                ? 'text-rose-700'
                : 'text-slate-500'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
