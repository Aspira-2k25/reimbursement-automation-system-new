import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 to-[#65CCB8]/10">
      <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center space-y-4 border border-slate-100">
        {/* Animated spinner with brand colors */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200"></div>
          <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-transparent border-t-[#3B945E] animate-spin"></div>
        </div>
        <p className="text-lg font-medium text-slate-700">Loading...</p>
        <p className="text-sm text-slate-500">Please wait</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;