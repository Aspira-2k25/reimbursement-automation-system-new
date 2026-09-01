import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, FileText, UploadCloud, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { studentFormsAPI, facultyFormsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function EditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isStudentForm, setIsStudentForm] = useState(false);

  const nptelFileRef = useRef(null);
  const idCardFileRef = useRef(null);
  const [selectedNptelFile, setSelectedNptelFile] = useState(null);
  const [selectedIdCardFile, setSelectedIdCardFile] = useState(null);

  const navigateToRoleRequests = React.useCallback(() => {
    const userRole = user?.role?.toLowerCase();
    if (userRole === 'coordinator') {
      navigate('/dashboard/coordinator');
      return;
    }
    if (userRole === 'faculty') {
      navigate('/dashboard/faculty/requests');
      return;
    }
    if (userRole === 'hod') {
      navigate('/dashboard/hod/request-status');
      return;
    }
    if (userRole === 'principal') {
      navigate('/dashboard/principal');
      return;
    }
    if (userRole === 'accounts') {
      navigate('/dashboard/accounts');
      return;
    }
    navigate('/dashboard/requests');
  }, [navigate, user?.role]);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const userRole = user?.role?.toLowerCase();
        let api = (userRole === 'student') ? studentFormsAPI : facultyFormsAPI;

        let response;
        try {
          response = await api.getById(id);
        } catch (initialErr) {
          const fallbackApi = api === studentFormsAPI ? facultyFormsAPI : studentFormsAPI;
          response = await fallbackApi.getById(id);
          api = fallbackApi;
        }

        const form = response.form || response;

        // Detect if this is a student reimbursement form
        const isStudent = Boolean(
          form.studentId ||
          form.division ||
          (form.applicationId && String(form.applicationId).startsWith('S-')) ||
          api === studentFormsAPI ||
          userRole === 'student'
        );

        setIsStudentForm(isStudent);

        const sessionDepartment = user?.department || '';
        if (sessionDepartment) {
          form.department = sessionDepartment;
        }

        // Check if the form is still editable based on its status
        let isEditable = false;
        if (isStudent) {
          isEditable = form.status === 'Pending';
        } else if (form.applicantType === 'HOD' || userRole === 'hod') {
          isEditable = form.status === 'Under Principal' || form.status === 'Pending';
        } else {
          isEditable = form.status === 'Under HOD' || form.status === 'Pending';
        }

        if (!isEditable) {
          toast.error('This form can no longer be edited. Once an approver acts on a form, editing is permanently locked.');
          navigateToRoleRequests();
          return;
        }

        setFormData(form);
        setErrors({});
      } catch (err) {
        console.error('Error fetching form:', err);
        toast.error(err.error || 'Failed to fetch form details');
        navigateToRoleRequests();
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchForm();
    }
  }, [id, user, location.pathname, navigateToRoleRequests]);

  const validateFile = (file) => {
    if (!file) return { valid: true };
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File must be a PDF, JPEG, JPG, or PNG' };
    }
    if (file.size > 1 * 1024 * 1024) {
      return { valid: false, error: 'File size must not exceed 1MB' };
    }
    return { valid: true };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    const isFacultyForm = !isStudentForm;
    if (isFacultyForm) {
      if (!formData.facultyId?.trim()) {
        newErrors.facultyId = 'Faculty ID is required';
      }
    } else {
      if (!formData.studentId?.trim()) {
        newErrors.studentId = 'Student ID is required';
      }
      if (!formData.division?.trim()) {
        newErrors.division = 'Division is required';
      }
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.department?.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.academicYear?.trim()) {
      newErrors.academicYear = 'Academic Year is required';
    } else if (!/^\d{4}-\d{4}$/.test(formData.academicYear.trim())) {
      newErrors.academicYear = 'Please enter academic year in format YYYY-YYYY';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      } else if (amountNum > 1500) {
        newErrors.amount = 'Amount cannot exceed ₹1500';
      }
    }

    if (!formData.accountName?.trim()) {
      newErrors.accountName = 'Account Name is required';
    }

    if (!formData.ifscCode?.trim()) {
      newErrors.ifscCode = 'IFSC Code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim())) {
      newErrors.ifscCode = 'Please enter a valid IFSC Code';
    }

    if (!formData.accountNumber?.trim()) {
      newErrors.accountNumber = 'Account Number is required';
    } else if (!/^\d{9,18}$/.test(formData.accountNumber.trim())) {
      newErrors.accountNumber = 'Please enter a valid account number (9-18 digits)';
    }

    if (!formData.courseName?.trim()) {
      newErrors.courseName = 'NPTEL Course Name is required';
    } else if (formData.courseName.trim().length < 3) {
      newErrors.courseName = 'Course name must be at least 3 characters long';
    }

    if (!formData.marks && formData.marks !== 0) {
      newErrors.marks = 'Marks is required';
    } else {
      const marksNum = parseFloat(formData.marks);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
        newErrors.marks = 'Marks must be between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'amount') {
      const numValue = parseFloat(value);
      if (value === '' || (!isNaN(numValue) && numValue > 0 && numValue <= 1500)) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }));
      }
    } else if (name === 'marks') {
      const numValue = parseFloat(value);
      if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`${fileType}: ${validation.error}`);
        e.target.value = '';
        if (fileType === 'NPTEL Result') setSelectedNptelFile(null);
        if (fileType === 'ID Card') setSelectedIdCardFile(null);
        return;
      }
      if (fileType === 'NPTEL Result') setSelectedNptelFile(file);
      if (fileType === 'ID Card') setSelectedIdCardFile(file);
    } else {
      if (fileType === 'NPTEL Result') setSelectedNptelFile(null);
      if (fileType === 'ID Card') setSelectedIdCardFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || saving) return;

    try {
      setSaving(true);

      const { status: _status, _id: _oid, __v: _v, applicantType: _at, applicationId: _aid, userId: _uid, createdAt: _ca, updatedAt: _ua, documents: _docs, rejectedBy: _rb, rejectionRemarks: _rr, ...editableFields } = formData;
      const formDataToSend = { ...editableFields };

      formDataToSend.department = user?.department || formData.department;
      formDataToSend.amount = parseFloat(formData.amount);
      formDataToSend.marks = parseFloat(formData.marks);

      // Handle new file uploads
      if (selectedNptelFile || selectedIdCardFile) {
        const uploadData = new FormData();
        if (selectedNptelFile) uploadData.append('nptelResult', selectedNptelFile);
        if (selectedIdCardFile) uploadData.append('idCard', selectedIdCardFile);

        try {
          if (!isStudentForm) {
            toast.error('Document upload for faculty forms is not available in this flow. Save without new files.');
            setSaving(false);
            return;
          }
          const { documents } = await studentFormsAPI.uploadDocuments(id, uploadData);
          formDataToSend.documents = documents;
        } catch (uploadErr) {
          console.error('Error uploading files:', uploadErr);
          const msg = uploadErr?.error === 'Network error'
            ? 'Cannot reach server. Check that the backend is running and try again.'
            : (uploadErr?.error || uploadErr?.details || 'Failed to upload files.');
          toast.error(msg);
          setSaving(false);
          return;
        }
      }

      // Dispatch to corresponding API
      const api = isStudentForm ? studentFormsAPI : facultyFormsAPI;
      await api.updateById(id, formDataToSend);

      toast.success('Application updated successfully!');
      navigateToRoleRequests();
    } catch (err) {
      console.error('Error updating form:', err);
      const msg = err?.error === 'Network error'
        ? 'Cannot reach server. Check that the backend is running and VITE_API_BASE_URL is correct.'
        : [err?.error, err?.details].filter(Boolean).join('. ') || 'Failed to update form. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading application for editing..." />;
  }

  // Check existing documents
  const existingNptelDoc = formData?.documents?.[0]?.url || formData?.proofOfPayment;
  const existingIdDoc = formData?.documents?.[1]?.url;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#65CCB8]/10 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <button
            onClick={navigateToRoleRequests}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <span className="text-xs font-semibold text-slate-500">
            ID: <span className="text-slate-800 font-mono font-bold">{formData?.applicationId || formData?._id}</span>
          </span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Edit Reimbursement Application
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Update application information and replace supporting documents
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Personal Information */}
          <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200/60 pb-2">
              Personal Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData?.name || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.name ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {!isStudentForm ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Faculty ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="facultyId"
                    value={formData?.facultyId || ''}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-xl border ${
                      errors.facultyId ? 'border-red-500' : 'border-slate-200'
                    } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                  />
                  {errors.facultyId && <p className="mt-1 text-xs text-red-500">{errors.facultyId}</p>}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Student ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={formData?.studentId || ''}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-xl border ${
                        errors.studentId ? 'border-red-500' : 'border-slate-200'
                      } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                    />
                    {errors.studentId && <p className="mt-1 text-xs text-red-500">{errors.studentId}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Division <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="division"
                      value={formData?.division || ''}
                      onChange={handleChange}
                      className={`mt-1 block w-full rounded-xl border ${
                        errors.division ? 'border-red-500' : 'border-slate-200'
                      } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                    />
                    {errors.division && <p className="mt-1 text-xs text-red-500">{errors.division}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData?.email || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.email ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData?.department || ''}
                  disabled
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="academicYear"
                  placeholder="YYYY-YYYY (e.g. 2026-2027)"
                  value={formData?.academicYear || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.academicYear ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.academicYear && <p className="mt-1 text-xs text-red-500">{errors.academicYear}</p>}
              </div>
            </div>
          </div>

          {/* Course Details */}
          <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200/60 pb-2">
              NPTEL Course Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="courseName"
                  value={formData?.courseName || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.courseName ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.courseName && <p className="mt-1 text-xs text-red-500">{errors.courseName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Marks Obtained (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="marks"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData?.marks ?? ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.marks ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.marks && <p className="mt-1 text-xs text-red-500">{errors.marks}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Claim Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  max="1500"
                  value={formData?.amount || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.amount ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
              </div>
            </div>
          </div>

          {/* Banking Details */}
          <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-2xl space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200/60 pb-2">
              Bank Account Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accountName"
                  value={formData?.accountName || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.accountName ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.accountName && <p className="mt-1 text-xs text-red-500">{errors.accountName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData?.accountNumber || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.accountNumber ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {errors.accountNumber && <p className="mt-1 text-xs text-red-500">{errors.accountNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  IFSC Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData?.ifscCode || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-xl border ${
                    errors.ifscCode ? 'border-red-500' : 'border-slate-200'
                  } px-3 py-2 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase`}
                />
                {errors.ifscCode && <p className="mt-1 text-xs text-red-500">{errors.ifscCode}</p>}
              </div>
            </div>
          </div>

          {/* Supporting Documents (Update / Replace Files) */}
          <div className="bg-slate-50/70 border border-slate-100 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Supporting Documents (Update / Replace Files)
              </h2>
              <span className="text-[11px] text-slate-500">PDF, JPG, PNG — Max 1MB</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* NPTEL Result File */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    NPTEL Result / Certificate
                  </label>
                  {existingNptelDoc && (
                    <a
                      href={existingNptelDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> View Current
                    </a>
                  )}
                </div>

                <input
                  type="file"
                  id="nptelResult"
                  ref={nptelFileRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'NPTEL Result')}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />

                {selectedNptelFile ? (
                  <p className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Selected: {selectedNptelFile.name}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    {existingNptelDoc ? 'Choose a file to replace current result' : 'Upload NPTEL scorecard/result'}
                  </p>
                )}
              </div>

              {/* ID Card File */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    {isStudentForm ? 'Student ID Card' : 'Faculty ID Proof'}
                  </label>
                  {existingIdDoc && (
                    <a
                      href={existingIdDoc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" /> View Current
                    </a>
                  )}
                </div>

                <input
                  type="file"
                  id="idCard"
                  ref={idCardFileRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'ID Card')}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />

                {selectedIdCardFile ? (
                  <p className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Selected: {selectedIdCardFile.name}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    {existingIdDoc ? 'Choose a file to replace current ID card' : 'Upload college ID card'}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={navigateToRoleRequests}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B945E] text-xs font-bold text-white hover:bg-[#2e744a] transition shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
