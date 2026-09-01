import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { studentFormsAPI, facultyFormsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ApprovalTimeline from '../../components/ApprovalTimeline';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ViewForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const isStudentForm = location.pathname.includes('/student-form/');
        const userRole = user?.role?.toLowerCase();
        let api;

        if (isStudentForm) {
          api = studentFormsAPI;
        } else if (userRole === 'faculty' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'principal' || userRole === 'accounts') {
          api = facultyFormsAPI;
        } else {
          api = studentFormsAPI;
        }

        const response = await api.getById(id);
        const form = response.form || response;

        setFormData(form);
        setError(null);
      } catch (err) {
        console.error('Error fetching form:', err);
        setError(err.error || 'Failed to fetch form details');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchForm();
    }
  }, [id, user, location.pathname]);

  if (loading) {
    return <LoadingSpinner message="Loading application details..." />;
  }

  if (error || !formData) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-sm text-center max-w-md">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Application Error</h3>
          <p className="text-xs text-slate-500 mb-6">{error || 'Form not found or unavailable'}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full rounded-xl bg-[#3B945E] py-2.5 text-xs font-semibold text-white shadow hover:bg-[#2e744a] transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const applicantType = formData.applicantType || (formData.studentId ? 'Student' : 'Faculty');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Header Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const userRole = user?.role?.toLowerCase();
              if (userRole === 'coordinator') navigate('/dashboard/coordinator');
              else if (userRole === 'hod') navigate('/dashboard/hod/request-status');
              else if (userRole === 'principal') navigate('/dashboard/principal');
              else if (userRole === 'faculty') navigate('/dashboard/faculty/requests');
              else if (userRole === 'accounts') navigate('/dashboard/accounts');
              else navigate('/dashboard/requests');
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <span className="text-xs font-semibold text-slate-500">
            ID: <span className="text-slate-800 font-mono">{formData.applicationId || formData._id}</span>
          </span>
        </div>

        {/* Live Approval Stepper */}
        <ApprovalTimeline
          status={formData.status}
          applicantType={applicantType}
          rejectedBy={formData.rejectedBy}
          rejectionRemarks={formData.rejectionRemarks || formData.rejectionReason}
          accountsRemarks={formData.accountsRemarks}
          updatedAt={formData.updatedAt}
        />

        {/* Main Details Card */}
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-8">
          
          {/* Header */}
          <div className="border-b border-slate-100 pb-5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              {formData.reimbursementType || 'NPTEL'} Reimbursement Application
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Submitted on {new Date(formData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Form Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Applicant Details */}
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200/60 pb-2">
                Applicant Information
              </h3>
              
              <div>
                <label className="text-xs font-medium text-slate-500">Full Name</label>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.name}</div>
              </div>

              {applicantType !== 'Student' ? (
                <div>
                  <label className="text-xs font-medium text-slate-500">Faculty ID</label>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.facultyId || 'N/A'}</div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Student ID</label>
                    <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.studentId}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">Division</label>
                    <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.division || 'N/A'}</div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500">Email Address</label>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.email}</div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">Department</label>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.department || 'N/A'}</div>
              </div>
            </div>

            {/* Academic & Claim Details */}
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200/60 pb-2">
                Claim & Academic Details
              </h3>

              <div>
                <label className="text-xs font-medium text-slate-500">Claim Amount</label>
                <div className="text-xl font-bold text-[#3B945E] mt-0.5">
                  ₹{Number(formData.amount || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500">Course / Expense Name</label>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.courseName || 'N/A'}</div>
              </div>

              {(formData.marks !== undefined && formData.marks !== null) && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Score / Percentage</label>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.marks}%</div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-500">Academic Year</label>
                <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.academicYear || 'Current'}</div>
              </div>
            </div>
          </div>

          {/* Banking Details (Restricted to Accounts and Applicant) */}
          {(user?.role?.toLowerCase() === 'accounts' || user?.userId === formData.userId || user?.email === formData.email || formData.userId === (user?.userId || user?.email)) && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200/60 pb-2">
                Disbursement & Bank Account Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-medium text-slate-500">Account Holder Name</label>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5">{formData.accountName || 'N/A'}</div>
                </div>
                <div>
                  <label className="font-medium text-slate-500">IFSC Code</label>
                  <div className="text-sm font-semibold text-slate-800 font-mono mt-0.5">{formData.ifscCode || 'N/A'}</div>
                </div>
                <div>
                  <label className="font-medium text-slate-500">Account Number</label>
                  <div className="text-sm font-semibold text-slate-800 font-mono mt-0.5">{formData.accountNumber || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Uploaded Documents */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Attached Proof Documents ({formData.documents?.length || 0})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {formData.documents?.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#3B945E] hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-[#3B945E]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#3B945E]">
                        {idx === 0 ? 'Course Certificate' : 'ID Card Proof'}
                      </p>
                      <p className="text-[10px] text-slate-400">Click to view in high resolution</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-[#3B945E]" />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}