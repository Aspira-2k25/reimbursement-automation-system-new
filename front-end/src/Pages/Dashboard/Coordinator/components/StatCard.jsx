import React from "react";

export default function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colorClasses = {
    blue: "text-white",
    orange: "text-white", 
    green: "text-white",
    red: "text-white",
  };

  const iconColorClasses = {
    blue: "text-white",
    orange: "text-white",
    green: "text-white", 
    red: "text-white",
  };

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm" style={{border: '1px solid var(--color-light-teal)'}}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate" style={{color: 'var(--color-dark-gray)'}}>{title}</p>
          <p className="text-xl sm:text-2xl font-bold mt-1 sm:mt-2" style={{color: 'var(--color-dark-gray)'}}>{value}</p>
          <p className="text-xs sm:text-sm mt-1 truncate" style={{color: 'var(--color-dark-gray)'}}>{subtitle}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-full ${colorClasses[color]} flex-shrink-0 ml-2 sm:ml-3`} style={{backgroundColor: 'var(--color-medium-teal)'}}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColorClasses[color]}`} />
        </div>
      </div>
    </div>
  );
}
