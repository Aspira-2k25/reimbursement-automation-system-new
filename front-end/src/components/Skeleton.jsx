import React from 'react';

/**
 * Base animated skeleton loader element
 */
export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200';
  const roundedClass = variant === 'circle' ? 'rounded-full' : variant === 'card' ? 'rounded-2xl' : 'rounded-lg';

  return (
    <div className={`${baseClasses} ${roundedClass} ${className}`} />
  );
};

/**
 * Metric/Summary Card Skeleton loader (matches dashboard StatCard layout)
 */
export const CardSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="h-10 w-10" variant="circle" />
          </div>
          <div className="mt-3">
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Table Skeleton Loader for dashboard request tables
 */
export const TableSkeleton = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {/* Table Header Placeholder */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-50 bg-slate-50/50 p-3.5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8" variant="circle" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="hidden h-4 w-28 sm:block" />
            <Skeleton className="hidden h-4 w-20 md:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Form Field Skeleton Loader for forms
 */
export const FormSkeleton = ({ fields = 4 }) => {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <Skeleton className="h-6 w-48 mb-4" />
      {Array.from({ length: fields }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <div className="pt-2">
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    </div>
  );
};

export default Skeleton;
