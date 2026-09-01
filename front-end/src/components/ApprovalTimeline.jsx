import React from 'react';
import { CheckCircle2, Clock, XCircle, ChevronRight, AlertCircle } from 'lucide-react';

/**
 * Visual Workflow / Approval Timeline Stepper
 * Maps approval stages: Student/Faculty -> Coordinator -> HOD -> Principal -> Accounts (Disbursed)
 */
export const ApprovalTimeline = ({ 
  status = 'Pending', 
  applicantType = 'Student',
  rejectedBy = null,
  rejectionRemarks = '',
  accountsRemarks = '',
  updatedAt = null
}) => {
  // Steps definition based on applicant type (Faculty bypasses Coordinator)
  const isStudent = applicantType?.toLowerCase() === 'student';

  const studentSteps = [
    { key: 'submission', label: 'Submitted', role: 'Applicant' },
    { key: 'coordinator', label: 'Coordinator', role: 'Review' },
    { key: 'hod', label: 'HOD', role: 'Verification' },
    { key: 'principal', label: 'Principal', role: 'Sanction' },
    { key: 'accounts', label: 'Accounts', role: 'Disbursement' }
  ];

  const facultySteps = [
    { key: 'submission', label: 'Submitted', role: 'Applicant' },
    { key: 'hod', label: 'HOD', role: 'Verification' },
    { key: 'principal', label: 'Principal', role: 'Sanction' },
    { key: 'accounts', label: 'Accounts', role: 'Disbursement' }
  ];

  const steps = isStudent ? studentSteps : facultySteps;

  // Determine current active step index (0-based)
  const getStepIndex = (currentStatus) => {
    const s = (currentStatus || '').toLowerCase();
    if (s.includes('rejected')) return -1;
    if (s.includes('reimbursed')) return steps.length;
    if (s.includes('approved')) return steps.length - 1; // At accounts desk
    if (s.includes('principal')) return isStudent ? 3 : 2;
    if (s.includes('hod')) return isStudent ? 2 : 1;
    if (s.includes('coordinator')) return 1;
    return 0;
  };

  const isRejected = (status || '').toLowerCase().includes('rejected');
  const currentStepIdx = getStepIndex(status);

  return (
    <div className="w-full rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Approval Pipeline</h4>
          <p className="text-xs text-slate-500">Live administrative tracking status</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          isRejected 
            ? 'bg-rose-50 text-rose-600 border border-rose-200' 
            : status === 'Reimbursed'
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : 'bg-teal-50 text-teal-700 border border-teal-200'
        }`}>
          {isRejected ? (
            <><XCircle className="h-3.5 w-3.5" /> Rejected by {rejectedBy || 'Authority'}</>
          ) : status === 'Reimbursed' ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Payment Disbursed</>
          ) : (
            <><Clock className="h-3.5 w-3.5 animate-pulse" /> {status}</>
          )}
        </span>
      </div>

      {/* Stepper Bar */}
      <div className="relative flex items-center justify-between">
        {/* Connecting Line */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-100 -z-0">
          <div 
            className={`h-full transition-all duration-500 ${isRejected ? 'bg-rose-400' : 'bg-gradient-to-r from-[#3B945E] to-[#65CCB8]'}`}
            style={{ 
              width: isRejected 
                ? '100%' 
                : `${Math.min(100, Math.max(0, (currentStepIdx / (steps.length - 1)) * 100))}%` 
            }}
          />
        </div>

        {/* Step Nodes */}
        {steps.map((step, idx) => {
          const isPassed = !isRejected && idx < currentStepIdx;
          const isCurrent = !isRejected && (idx === currentStepIdx || (status === 'Reimbursed' && idx === steps.length - 1));
          const isStepRejected = isRejected && rejectedBy?.toLowerCase() === step.label.toLowerCase();

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div 
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isPassed
                    ? 'border-[#3B945E] bg-[#3B945E] text-white shadow-md shadow-[#3B945E]/20'
                    : isCurrent
                    ? 'border-[#3B945E] bg-white text-[#3B945E] ring-4 ring-[#65CCB8]/30 animate-pulse'
                    : isStepRejected
                    ? 'border-rose-500 bg-rose-500 text-white ring-4 ring-rose-200'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isStepRejected ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              <span className={`mt-2 text-xs font-semibold text-center ${
                isCurrent ? 'text-[#3B945E]' : isPassed ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
              <span className="text-[10px] text-slate-400 text-center">{step.role}</span>
            </div>
          );
        })}
      </div>

      {/* Remarks or Rejection Message Note */}
      {(rejectionRemarks || accountsRemarks) && (
        <div className={`mt-4 rounded-xl p-3 text-xs ${
          isRejected 
            ? 'border border-rose-200 bg-rose-50/70 text-rose-800' 
            : 'border border-teal-100 bg-teal-50/50 text-slate-700'
        }`}>
          <div className="flex items-start gap-2">
            <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${isRejected ? 'text-rose-500' : 'text-teal-600'}`} />
            <div>
              <p className="font-semibold">{isRejected ? 'Rejection Reason:' : 'Administrative Remarks:'}</p>
              <p className="mt-0.5">{rejectionRemarks || accountsRemarks}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalTimeline;
