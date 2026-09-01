import React from 'react';

/**
 * Modern Loading Spinner with glassmorphism & brand-aligned glowing animations
 */
const LoadingSpinner = ({ message = "Loading portal...", subtext = "Please wait a moment" }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-md transition-all duration-300">
      <div className="relative mx-4 flex max-w-sm flex-col items-center rounded-3xl border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur-xl transition-all dark:border-slate-800/80 dark:bg-slate-900/90">
        
        {/* Glow ambient background */}
        <div className="absolute -top-10 left-1/2 -z-10 h-32 w-32 -translate-x-1/2 rounded-full bg-[#65CCB8]/30 blur-2xl"></div>

        {/* Dual-ring animated spinner */}
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#3B945E] border-r-[#65CCB8]"></div>
          <div className="h-4 w-4 rounded-full bg-[#3B945E]/80 animate-ping"></div>
        </div>

        {/* Text indicators */}
        <h3 className="text-center text-lg font-bold text-slate-800 dark:text-slate-100">
          {message}
        </h3>
        <p className="mt-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {subtext}
        </p>

        {/* Subtle loading dots animation */}
        <div className="mt-4 flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#3B945E] animate-bounce [animation-delay:-0.3s]"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-[#57BA98] animate-bounce [animation-delay:-0.15s]"></div>
          <div className="h-1.5 w-1.5 rounded-full bg-[#65CCB8] animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;