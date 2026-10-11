import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Check, Loader2, Info, Sparkles, SlidersHorizontal, Users, Building, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { portalAPI } from '../../../../services/api';

const AVAILABLE_PORTALS = [
  { id: 'nptel', title: 'NPTEL Certification', badge: 'Active' },
  { id: 'lab-materials', title: 'Lab Materials', badge: 'Future Category' },
  { id: 'workshop', title: 'Workshop Training', badge: 'Future Category' },
  { id: 'fdp-program', title: 'FDP Programs', badge: 'Future Category' }
];

const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "CSE AI and ML",
  "CSE Data Science",
  "Civil Engineering",
  "Mechanical Engineering"
];

const YEARS = [
  { id: 'SE', label: 'Second Year (SE)' },
  { id: 'TE', label: 'Third Year (TE)' },
  { id: 'BE', label: 'Final Year (BE)' }
];

export default function PortalManagement() {
  const [selectedPortal, setSelectedPortal] = useState('nptel');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Portal form state
  const [isOpen, setIsOpen] = useState(true);
  const [closedMessage, setClosedMessage] = useState('NPTEL Reimbursement Portal is currently closed for submissions.');
  const [targetRoles, setTargetRoles] = useState(['All']);
  const [targetDepartments, setTargetDepartments] = useState(['All']);
  const [targetYears, setTargetYears] = useState(['All']);
  const [updatedBy, setUpdatedBy] = useState('Admin');
  const [updatedAt, setUpdatedAt] = useState(null);

  // Fetch status of selected portal
  const fetchPortalStatus = useCallback(async (portalKey) => {
    setLoading(true);
    try {
      const res = await portalAPI.getStatus(portalKey);
      if (res?.success && res?.portal) {
        const p = res.portal;
        setIsOpen(p.isOpen !== false);
        setClosedMessage(p.closedMessage || `${AVAILABLE_PORTALS.find(x => x.id === portalKey)?.title || 'This'} Reimbursement Portal is currently closed.`);
        setTargetRoles(Array.isArray(p.targetRoles) && p.targetRoles.length > 0 ? p.targetRoles : ['All']);
        setTargetDepartments(Array.isArray(p.targetDepartments) && p.targetDepartments.length > 0 ? p.targetDepartments : ['All']);
        setTargetYears(Array.isArray(p.targetYears) && p.targetYears.length > 0 ? p.targetYears : ['All']);
        setUpdatedBy(p.updatedBy || 'Admin');
        setUpdatedAt(p.updatedAt ? new Date(p.updatedAt) : null);
      }
    } catch (err) {
      toast.error('Failed to load portal configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortalStatus(selectedPortal);
  }, [selectedPortal, fetchPortalStatus]);

  // Role toggle helper
  const handleRoleToggle = (role) => {
    if (role === 'All') {
      setTargetRoles(['All']);
      return;
    }
    setTargetRoles((prev) => {
      let filtered = prev.filter(r => r !== 'All');
      if (filtered.includes(role)) {
        filtered = filtered.filter(r => r !== role);
      } else {
        filtered.push(role);
      }
      return filtered.length === 0 ? ['All'] : filtered;
    });
  };

  // Department toggle helper
  const handleDeptToggle = (dept) => {
    if (dept === 'All') {
      setTargetDepartments(['All']);
      return;
    }
    setTargetDepartments((prev) => {
      let filtered = prev.filter(d => d !== 'All');
      if (filtered.includes(dept)) {
        filtered = filtered.filter(d => d !== dept);
      } else {
        filtered.push(dept);
      }
      return filtered.length === 0 ? ['All'] : filtered;
    });
  };

  // Year toggle helper
  const handleYearToggle = (year) => {
    if (year === 'All') {
      setTargetYears(['All']);
      return;
    }
    setTargetYears((prev) => {
      let filtered = prev.filter(y => y !== 'All');
      if (filtered.includes(year)) {
        filtered = filtered.filter(y => y !== year);
      } else {
        filtered.push(year);
      }
      return filtered.length === 0 ? ['All'] : filtered;
    });
  };

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const activeInfo = AVAILABLE_PORTALS.find(p => p.id === selectedPortal);
      await portalAPI.updateStatus({
        portalKey: selectedPortal,
        title: activeInfo?.title || 'NPTEL Certification',
        isOpen,
        closedMessage: closedMessage.trim() || `${activeInfo?.title} Reimbursement Portal is currently closed.`,
        targetRoles,
        targetDepartments,
        targetYears
      });
      toast.success(`${activeInfo?.title} settings saved successfully!`);
      // Invalidate session cache
      sessionStorage.removeItem('portal_status_nptel_cache');
      fetchPortalStatus(selectedPortal);
    } catch (err) {
      toast.error(err?.error || err?.message || 'Failed to save portal settings');
    } finally {
      setSaving(false);
    }
  };

  const currentPortalInfo = AVAILABLE_PORTALS.find(p => p.id === selectedPortal);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <motion.div
        className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#3B945E]/15 text-[#3B945E] uppercase tracking-wider">
                Admin Exclusive Control
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium">Reimbursement Automation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1 tracking-tight">
              Reimbursement Portal Controls
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Easily turn portals ON or OFF. Filter closures by role, department, or academic year with zero hassle.
            </p>
          </div>
        </div>

        {/* Portal Category Selector (Extensible Architecture) */}
        <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          {AVAILABLE_PORTALS.map((p) => {
            const isSelected = selectedPortal === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPortal(p.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#3B945E] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>{p.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Configuration Card */}
      <motion.div
        className="bg-white rounded-2xl p-5 sm:p-7 shadow-xs border border-slate-200/80 space-y-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Master ON/OFF Switch */}
        <div
          className={`p-5 sm:p-6 rounded-2xl border transition-all ${
            isOpen
              ? 'bg-emerald-50/60 border-emerald-200/90'
              : 'bg-rose-50/70 border-rose-200/90'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                  isOpen ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {isOpen ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    {currentPortalInfo?.title} Status
                  </h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isOpen
                        ? 'bg-emerald-200/80 text-emerald-900'
                        : 'bg-rose-200/80 text-rose-900'
                    }`}
                  >
                    {isOpen ? '● PORTAL IS OPEN' : '● PORTAL IS CLOSED'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  {isOpen
                    ? 'Eligible students and faculty can submit reimbursement forms.'
                    : 'Submissions are currently suspended based on the filters below.'}
                </p>
              </div>
            </div>

            {/* Quick Toggle Button */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-98 flex items-center justify-center gap-2 ${
                isOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isOpen ? '🔴 Turn OFF / Close Portal' : '🟢 Turn ON / Open Portal'}
            </button>
          </div>
        </div>

        {/* Targeting & Filtering Section (Active and visible when closed or configuring) */}
        <div className={`space-y-6 pt-2 transition-opacity ${!isOpen ? 'opacity-100' : 'opacity-80'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#3B945E]" />
                Targeting & Applicability
              </h3>
              <p className="text-xs text-slate-500">
                Choose who is affected when this portal is closed.
              </p>
            </div>
            {!isOpen && (
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Closure Rules Active
              </span>
            )}
          </div>

          {/* 1. Target Roles */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              1. Apply Closure To Which Role?
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'All', label: 'All Roles (Everyone)' },
                { id: 'Student', label: 'Students Only' },
                { id: 'Faculty', label: 'Faculty Only' }
              ].map((r) => {
                const active = targetRoles.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleToggle(r.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-[#3B945E] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Target Departments */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              2. Apply Closure To Which Department?
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDeptToggle('All')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetDepartments.includes('All')
                    ? 'bg-[#3B945E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {targetDepartments.includes('All') && <Check className="w-3.5 h-3.5" />}
                <span>All Departments</span>
              </button>

              {DEPARTMENTS.map((d) => {
                const active = targetDepartments.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDeptToggle(d)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-[#3B945E] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{d}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Target Academic Years (Students) */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              3. Apply Closure To Which Academic Year? (Students)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleYearToggle('All')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  targetYears.includes('All')
                    ? 'bg-[#3B945E] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {targetYears.includes('All') && <Check className="w-3.5 h-3.5" />}
                <span>All Years</span>
              </button>

              {YEARS.map((y) => {
                const active = targetYears.includes(y.id);
                return (
                  <button
                    key={y.id}
                    type="button"
                    onClick={() => handleYearToggle(y.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-[#3B945E] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{y.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Notice Message */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              4. Notice Message Displayed to Applicants:
            </label>
            <textarea
              value={closedMessage}
              onChange={(e) => setClosedMessage(e.target.value)}
              className="w-full p-3.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#3B945E] focus:border-[#3B945E] transition-colors resize-none leading-relaxed"
              rows={2}
              placeholder="e.g., NPTEL Reimbursement Portal is currently closed for semester review."
            />
          </div>
        </div>

        {/* Live Rule Summary Card */}
        <div className="rounded-xl p-4 bg-slate-50 border border-slate-200/80 text-xs text-slate-700 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#3B945E] mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed">
            <span className="font-bold block text-slate-900">Current Rule Summary:</span>
            {isOpen ? (
              <span className="text-emerald-700 font-medium">
                Portal is currently OPEN. Anyone eligible can apply.
              </span>
            ) : (
              <span className="text-rose-700 font-medium">
                Portal is currently CLOSED for:{' '}
                <strong>{targetRoles.join(', ')}</strong> | Departments:{' '}
                <strong>{targetDepartments.join(', ')}</strong> | Years:{' '}
                <strong>{targetYears.join(', ')}</strong>.
              </span>
            )}
            {updatedAt && (
              <p className="text-[11px] text-slate-400 mt-1">
                Last modified by {updatedBy} on {updatedAt.toLocaleDateString()} at {updatedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => fetchPortalStatus(selectedPortal)}
            disabled={saving || loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            Reset to Last Saved
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#3B945E] hover:bg-[#2e754a] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving Settings...' : 'Save Portal Settings'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
