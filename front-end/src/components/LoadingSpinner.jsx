import React from 'react';
import apshahLogo from '../assets/images/Apshah_logo.png';

/**
 * Premium College-Branded Loading Screen
 * Clean, bright aesthetic matching APSIT brand colors (Emerald, Mint, Crisp White)
 */
const LoadingSpinner = ({ 
  message = "Loading Portal...", 
  subtext = "Fetching data, please wait a moment" 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50/90 via-emerald-50/40 to-teal-50/80 backdrop-blur-md transition-all duration-300">
      
      {/* Centered Brand Card */}
      <div className="relative mx-4 flex max-w-sm flex-col items-center rounded-3xl border border-white bg-white/95 p-8 shadow-2xl shadow-emerald-900/10 backdrop-blur-2xl">
        
        {/* Soft emerald background glow */}
        <div className="absolute -top-12 left-1/2 -z-10 h-36 w-36 -translate-x-1/2 rounded-full bg-emerald-300/30 blur-2xl"></div>

        {/* Animated Brand Logo Container */}
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
          
          {/* Outer Orbiting Gradient Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#3B945E] border-r-[#65CCB8] [animation-duration:1.2s]"></div>
          
          {/* Inner College Seal with subtle breathing scale */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md shadow-emerald-500/15 p-2">
            <img 
              src={apshahLogo} 
              alt="APSIT College Logo" 
              className="h-full w-full object-contain drop-shadow-sm animate-pulse" 
            />
          </div>
        </div>

        {/* Title & Status Message */}
        <h3 className="text-center text-base font-bold text-slate-800 tracking-tight">
          {message}
        </h3>
        
        <p className="mt-1 text-center text-xs font-medium text-slate-500 max-w-[220px]">
          {subtext}
        </p>

        {/* Sleek Gradient Loading Indicator */}
        <div className="mt-5 w-36 overflow-hidden rounded-full bg-slate-100 h-1.5 relative">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#3B945E] via-[#57BA98] to-[#65CCB8] animate-progress-pulse"></div>
        </div>

        {/* College Tagline */}
        <span className="mt-4 text-[10px] font-semibold text-emerald-800/60 uppercase tracking-widest">
          A. P. Shah Institute of Technology
        </span>

      </div>
    </div>
  );
};

export default LoadingSpinner;