import React from 'react';

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-pulse">
      <div className="h-8 bg-slate-200 rounded-xl mb-4 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-6 bg-slate-100 rounded-lg flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonCards: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-8 w-8 bg-slate-200 rounded-lg" />
          </div>
          <div className="h-7 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
};
