import React from "react";

export default function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colorClasses = {
    blue: "bg-[color:var(--color-moss-lime)]/25 text-[color:var(--color-moss-olive)] border-[color:var(--color-moss-sage)]/60",
    orange: "bg-[color:var(--color-moss-lime)]/25 text-[color:var(--color-moss-olive)] border-[color:var(--color-moss-sage)]/60",
    green: "bg-[color:var(--color-moss-lime)]/25 text-[color:var(--color-moss-olive)] border-[color:var(--color-moss-sage)]/60",
    red: "bg-red-50 text-red-600 border-red-200",
  };

  const iconColorClasses = {
    blue: "text-[color:var(--color-moss-olive)]",
    orange: "text-[color:var(--color-moss-olive)]",
    green: "text-[color:var(--color-moss-olive)]",
    red: "text-red-600",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">{value}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${colorClasses[color]} flex-shrink-0 ml-2 sm:ml-3`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColorClasses[color]}`} />
        </div>
      </div>
    </div>
  );
}
