import NptelFormWizard from '../../components/NptelFormWizard';
import { selectFormErrors } from '../../utils/nptelReview';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { studentFormsAPI, facultyFormsAPI } from '../../services/api'; // Import faculty API
import { useAuth } from '../../context/AuthContext'; // Import useAuth

export default function EditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Get authenticated user
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [, setIsStudentForm] = useState(false);

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
        // Detect form type from URL path first (for Accounts role viewing different form types)
        // Only /student-form/ paths are student forms; /faculty-form/ and /nptel-form/ use role-based detection
        const isStudent = location.pathname.includes('/student-form/');
        setIsStudentForm(isStudent);

        // Select API based on URL path or user role
        // URL path takes precedence (allows Accounts to edit both types)
        const userRole = user?.role?.toLowerCase();
        let api;

        if (isStudent) {
          api = studentFormsAPI;
        } else if (userRole === 'faculty' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'principal' || userRole === 'accounts') {
          api = facultyFormsAPI;
        } else {
          api = studentFormsAPI;
        }

        const response = await api.getById(id);
        const form = response.form || response; // Handle both structures

        const sessionDepartment = user?.department || '';
        if (sessionDepartment) {
          form.department = sessionDepartment;
        }

        // Check if the form is still editable based on its status
        // Student forms: editable only at "Pending"
        // Faculty/Coordinator forms: editable only at "Under HOD"
        // HOD forms: editable only at "Under Principal"
        const editableStatuses = {
          'Student': 'Pending',
          'Faculty': 'Under HOD',
          'Coordinator': 'Under HOD',
          'HOD': 'Under Principal',
        };
        const applicantType = form.applicantType || (isStudent ? 'Student' : 'Faculty');
        const requiredStatus = editableStatuses[applicantType] || (isStudent ? 'Pending' : 'Under HOD');

        if (form.status !== requiredStatus) {
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

  const validateForm = (fields) => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    // For faculty forms: validate facultyId
    // For student forms: validate studentId and division
    const isFacultyForm = formData?.applicantType && formData.applicantType !== 'Student';
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

    // Marks validation
    if (!formData.marks && formData.marks !== 0) {
      newErrors.marks = 'Marks is required';
    } else {
      const marksNum = parseFloat(formData.marks);
      if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
        newErrors.marks = 'Marks must be between 0 and 100';
      }
    }

    for (const field of ['nptelResult', 'idCard']) {
      const file = document.getElementById(field)?.files[0];
      if (file && file.size > 1024 * 1024) newErrors[field] = 'File must be 1 MB or smaller';
      else if (file && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) newErrors[field] = 'Choose a PDF, JPEG or PNG file';
    }
    const relevantErrors = selectFormErrors(newErrors, fields);
    setErrors(relevantErrors);
    const firstInvalidField = Object.keys(relevantErrors)[0];
    if (firstInvalidField) document.getElementById(['nptelResult', 'idCard'].includes(firstInvalidField) ? firstInvalidField : `edit-${firstInvalidField}`)?.focus();
    return Object.keys(relevantErrors).length === 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || saving) return;

    try {
      setSaving(true);

      // Handle file updates if needed
      // Only send editable fields — strip status, _id, applicantType, etc.
      const fields = ['name', 'email', 'facultyId', 'studentId', 'division', 'academicYear', 'amount', 'accountName', 'ifscCode', 'accountNumber', 'courseName', 'marks', 'reimbursementType', 'remark', 'remarks'];
      const formDataToSend = Object.fromEntries(fields.filter(field => formData[field] !== undefined).map(field => [field, formData[field]]));

      // Enforce trusted session-derived department in update payload.
      formDataToSend.department = user?.department || formData.department;

      // Convert amount to number explicitly
      formDataToSend.amount = parseFloat(formData.amount);

      // Convert marks to number explicitly
      formDataToSend.marks = parseFloat(formData.marks);

      const nptelFile = document.getElementById('nptelResult')?.files[0];
      const idCardFile = document.getElementById('idCard')?.files[0];

      if (nptelFile || idCardFile) {
        const uploadData = new FormData();
        if (nptelFile) uploadData.append('nptelResult', nptelFile);
        if (idCardFile) uploadData.append('idCard', idCardFile);

        try {
          const userRole = user?.role?.toLowerCase();
          const isFacultyType = ['faculty', 'coordinator', 'hod', 'principal'].includes(userRole);
          if (isFacultyType) {
            for (const [field, value] of Object.entries(formDataToSend)) uploadData.append(field, String(value));
            await facultyFormsAPI.updateById(id, uploadData);
            toast.success('Changes saved successfully!');
            navigate(-1);
            return;
          }
          await studentFormsAPI.uploadDocuments(id, uploadData);
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

      // Select API based on user role (Faculty, Coordinator, HOD, Principal use forms API)
      const userRole = user?.role?.toLowerCase();
      const isFacultyType = ['faculty', 'coordinator', 'hod', 'principal'].includes(userRole);
      const api = isFacultyType ? facultyFormsAPI : studentFormsAPI;
      await api.updateById(id, formDataToSend);

      toast.success('Changes saved successfully!');
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
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <button
            onClick={navigateToRoleRequests}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800">
            Edit NPTEL Reimbursement Application
          </h1>
        </div>

        <NptelFormWizard sections={[<div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'edit-name-error' : undefined}
                id="edit-name"
                type="text"
                name="name"
                value={formData?.name || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.name ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.name && (
                <p id="edit-name-error" role="alert" className="mt-2 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
{(formData?.applicantType && formData.applicantType !== 'Student') ? (
              <>
                <div>
                  <label htmlFor="edit-facultyId" className="block text-sm font-medium text-gray-700">Faculty ID *</label>
              <input
                aria-invalid={Boolean(errors.facultyId)}
                aria-describedby={errors.facultyId ? 'edit-facultyId-error' : undefined}
                id="edit-facultyId"
                    type="text"
                    name="facultyId"
                    value={formData?.facultyId || ''}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                      ${errors.facultyId ? 'border-red-300' : 'border-gray-300'}
                      focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                  />
                  {errors.facultyId && (
                    <p id="edit-facultyId-error" role="alert" className="mt-2 text-sm text-red-600">{errors.facultyId}</p>
                  )}
                </div>

              </>
            ) : (
              <>
                <div>
                  <label htmlFor="edit-studentId" className="block text-sm font-medium text-gray-700">Student ID *</label>
              <input
                aria-invalid={Boolean(errors.studentId)}
                aria-describedby={errors.studentId ? 'edit-studentId-error' : undefined}
                id="edit-studentId"
                    type="text"
                    name="studentId"
                    value={formData?.studentId || ''}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                      ${errors.studentId ? 'border-red-300' : 'border-gray-300'}
                      focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                  />
                  {errors.studentId && (
                    <p id="edit-studentId-error" role="alert" className="mt-2 text-sm text-red-600">{errors.studentId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="edit-division" className="block text-sm font-medium text-gray-700">Division *</label>
              <input
                aria-invalid={Boolean(errors.division)}
                aria-describedby={errors.division ? 'edit-division-error' : undefined}
                id="edit-division"
                    type="text"
                    name="division"
                    value={formData?.division || ''}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                      ${errors.division ? 'border-red-300' : 'border-gray-300'}
                      focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                  />
                  {errors.division && (
                    <p id="edit-division-error" role="alert" className="mt-2 text-sm text-red-600">{errors.division}</p>
                  )}
                </div>
              </>
            )}
<div>
              <label htmlFor="edit-department" className="block text-sm font-medium text-gray-700">Department *</label>
              <input
                aria-invalid={Boolean(errors.department)}
                aria-describedby={errors.department ? 'edit-department-error' : undefined}
                id="edit-department"
                type="text"
                name="department"
                value={formData?.department || ''}
                readOnly
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.department ? 'border-red-300' : 'border-gray-300'}
                  bg-gray-100 text-gray-600 cursor-not-allowed sm:text-sm`}
              />
              {errors.department && (
                <p id="edit-department-error" role="alert" className="mt-2 text-sm text-red-600">{errors.department}</p>
              )}
            </div>
<div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'edit-email-error' : undefined}
                id="edit-email"
                type="email"
                name="email"
                value={formData?.email || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.email ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.email && (
                <p id="edit-email-error" role="alert" className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div></div>,
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div>
              <label htmlFor="edit-academicYear" className="block text-sm font-medium text-gray-700">Academic Year *</label>
              <input
                aria-invalid={Boolean(errors.academicYear)}
                aria-describedby={errors.academicYear ? 'edit-academicYear-error' : undefined}
                id="edit-academicYear"
                type="text"
                name="academicYear"
                placeholder="e.g., 2025-2026"
                value={formData?.academicYear || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.academicYear ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.academicYear && (
                <p id="edit-academicYear-error" role="alert" className="mt-2 text-sm text-red-600">{errors.academicYear}</p>
              )}
            </div>
<div>
              <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700">Amount (₹) *</label>
              <input
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={errors.amount ? 'edit-amount-error' : undefined}
                id="edit-amount"
                type="number"
                name="amount"
                min="1"
                max="1500"
                step="0.01"
                value={formData?.amount || ''}
                onChange={handleChange}
                onWheel={(e) => e.target.blur()}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.amount ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.amount && (
                <p id="edit-amount-error" role="alert" className="mt-2 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>
<div>
                <label htmlFor="edit-courseName" className="block text-sm font-medium text-gray-700">NPTEL Course Name <span className="text-gray-900 font-bold">*</span></label>
              <input
                aria-invalid={Boolean(errors.courseName)}
                aria-describedby={errors.courseName ? 'edit-courseName-error' : undefined}
                id="edit-courseName"
                  type="text"
                  name="courseName"
                  value={formData?.courseName || ''}
                  onChange={handleChange}
                  required
                  placeholder="Enter NPTEL course name"
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm
                    ${errors.courseName ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.courseName && (
                  <p id="edit-courseName-error" role="alert" className="mt-2 text-sm text-red-600">{errors.courseName}</p>
                )}
              </div>
<div>
                <label htmlFor="edit-marks" className="block text-sm font-medium text-gray-700">NPTEL Marks (%) <span className="text-gray-900 font-bold">*</span></label>
              <input
                aria-invalid={Boolean(errors.marks)}
                aria-describedby={errors.marks ? 'edit-marks-error' : undefined}
                id="edit-marks"
                  type="number"
                  name="marks"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData?.marks ?? ''}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  required
                  placeholder="Enter NPTEL marks"
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm
                    ${errors.marks ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.marks && (
                  <p id="edit-marks-error" role="alert" className="mt-2 text-sm text-red-600">{errors.marks}</p>
                )}
              </div></div>,
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div>
                <label htmlFor="edit-accountName" className="block text-sm font-medium text-gray-700">Account Holder Name *</label>
              <input
                aria-invalid={Boolean(errors.accountName)}
                aria-describedby={errors.accountName ? 'edit-accountName-error' : undefined}
                id="edit-accountName"
                  type="text"
                  name="accountName"
                  value={formData?.accountName || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                    ${errors.accountName ? 'border-red-300' : 'border-gray-300'}
                    focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                />
                {errors.accountName && (
                  <p id="edit-accountName-error" role="alert" className="mt-2 text-sm text-red-600">{errors.accountName}</p>
                )}
              </div>
<div>
                <label htmlFor="edit-ifscCode" className="block text-sm font-medium text-gray-700">IFSC Code *</label>
              <input
                aria-invalid={Boolean(errors.ifscCode)}
                aria-describedby={errors.ifscCode ? 'edit-ifscCode-error' : undefined}
                id="edit-ifscCode"
                  type="text"
                  name="ifscCode"
                  value={formData?.ifscCode || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                    ${errors.ifscCode ? 'border-red-300' : 'border-gray-300'}
                    focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                />
                {errors.ifscCode && (
                  <p id="edit-ifscCode-error" role="alert" className="mt-2 text-sm text-red-600">{errors.ifscCode}</p>
                )}
              </div>
<div>
                <label htmlFor="edit-accountNumber" className="block text-sm font-medium text-gray-700">Account Number *</label>
              <input
                aria-invalid={Boolean(errors.accountNumber)}
                aria-describedby={errors.accountNumber ? 'edit-accountNumber-error' : undefined}
                id="edit-accountNumber"
                  type="text"
                  name="accountNumber"
                  value={formData?.accountNumber || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                    ${errors.accountNumber ? 'border-red-300' : 'border-gray-300'}
                    focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                />
                {errors.accountNumber && (
                  <p id="edit-accountNumber-error" role="alert" className="mt-2 text-sm text-red-600">{errors.accountNumber}</p>
                )}
              </div></div>,
<div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nptelResult" className="block text-sm font-medium text-gray-700">
                  NPTEL Result
                </label>
              <input
                aria-invalid={Boolean(errors.nptelResult)}
                aria-describedby={errors.nptelResult ? 'nptelResult-help nptelResult-error' : 'nptelResult-help'}
                  type="file"
                  id="nptelResult"
                  name="nptelResult"
                  onChange={() => setErrors(previous => ({ ...previous, nptelResult: '' }))}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-teal-50 file:text-teal-700
                    hover:file:bg-teal-100"
                />
                <p id="nptelResult-help" className="mt-2 text-sm text-gray-600">PDF, JPEG or PNG. Maximum 1 MB per file.</p>
                {errors.nptelResult && <p id="nptelResult-error" role="alert" className="mt-2 text-sm text-red-600">{errors.nptelResult}</p>}
              </div>

              <div>
                <label htmlFor="idCard" className="block text-sm font-medium text-gray-700">
                  {(formData?.applicantType && formData.applicantType !== 'Student') ? 'Faculty ID Card' : 'Student ID Card'}
                </label>
              <input
                aria-invalid={Boolean(errors.idCard)}
                aria-describedby={errors.idCard ? 'idCard-help idCard-error' : 'idCard-help'}
                  type="file"
                  id="idCard"
                  name="idCard"
                  onChange={() => setErrors(previous => ({ ...previous, idCard: '' }))}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-teal-50 file:text-teal-700
                    hover:file:bg-teal-100"
                />
                <p id="idCard-help" className="mt-2 text-sm text-gray-600">PDF, JPEG or PNG. Maximum 1 MB per file.</p>
                {errors.idCard && <p id="idCard-error" role="alert" className="mt-2 text-sm text-red-600">{errors.idCard}</p>}
              </div>
            </div>
          </div>]} values={formData} applicantType={formData.applicantType || user?.role} existingDocuments={formData.documents || []} editing validate={validateForm} onSubmit={handleSubmit} busy={saving} onCancel={navigateToRoleRequests} />
      </div>
    </div>
  );
}
