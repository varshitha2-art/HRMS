import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  const getStyle = () => {
    switch (normalized) {
      // Attendance & Employment Status
      case 'PRESENT':
      case 'ACTIVE':
      case 'APPROVED':
      case 'PAID':
      case 'VALID':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

      case 'LATE':
      case 'EXPIRING':
      case 'PENDING':
      case 'HALF_DAY':
      case 'ON_LEAVE':
      case 'CALCULATED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';

      case 'ABSENT':
      case 'LOP':
      case 'REJECTED':
      case 'EXPIRED':
      case 'TERMINATED':
      case 'RESIGNED':
      case 'SUSPENDED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';

      case 'WEEK_OFF':
      case 'HOLIDAY':
      case 'ON_DUTY':
      case 'VERIFIED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';

      case 'LEAVE':
      case 'DRAFT':
      case 'MISSING':
      case 'INACTIVE':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getLabel = () => {
    return status.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {getLabel()}
    </span>
  );
};
