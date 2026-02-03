import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { studentFormsAPI, facultyFormsAPI } from '../../services/api'; // Import faculty API
import { useAuth } from '../../context/AuthContext'; // Import useAuth   

export default function EditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigateBack = useBackNavigation();
  const { user } = useAuth(); // Get authenticated user
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isStudentForm, setIsStudentForm] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        // Detect form type from URL path first (for Accounts role viewing different form types)
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

        setFormData(form);
        setErrors({});
      } catch (err) {
        console.error('Error fetching form:', err);
        toast.error(err.error || 'Failed to fetch form details');
        navigateBack();
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchForm();
    }
  }, [id, navigateBack, user, location.pathname]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.studentId?.trim()) {
      newErrors.studentId = 'Student ID is required';
    }

    if (!formData.division?.trim()) {
      newErrors.division = 'Division is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'amount') {
      if (value === '' || (value > 0 && value <= 1500)) {
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
      const formDataToSend = { ...formData };

      // Convert amount to number explicitly
      formDataToSend.amount = parseFloat(formData.amount);

      const nptelFile = document.getElementById('nptelResult')?.files[0];
      const idCardFile = document.getElementById('idCard')?.files[0];

      if (nptelFile || idCardFile) {
        const uploadData = new FormData();
        if (nptelFile) uploadData.append('nptelResult', nptelFile);
        if (idCardFile) uploadData.append('idCard', idCardFile);

        // Upload new files first if provided - use correct API path based on user role
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
          const userRole = user?.role?.toLowerCase();
          const isFacultyType = ['faculty', 'coordinator', 'hod', 'principal'].includes(userRole);
          const uploadPath = isFacultyType ? 'forms' : 'student-forms';
          
          const uploadResponse = await fetch(`${API_BASE_URL}/${uploadPath}/${id}/documents`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: uploadData,
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload files');
          }

          const { documents } = await uploadResponse.json();
          formDataToSend.documents = documents;
        } catch (error) {
          console.error('Error uploading files:', error);
          toast.error('Failed to upload files. Please try again.');
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
      // Navigate based on user role
      if (userRole === 'coordinator') {
        navigate('/dashboard/coordinator');
      } else if (userRole === 'faculty') {
        navigate('/dashboard/faculty/requests');
      } else {
        navigate('/dashboard/requests');
      }
    } catch (err) {
      console.error('Error updating form:', err);
      toast.error(err.error || 'Failed to update form. Please try again.');
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
            onClick={navigateBack}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                name="name"
                value={formData?.name || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.name ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {(['faculty', 'coordinator', 'hod', 'principal'].includes(user?.role?.toLowerCase())) ? 'Faculty ID *' : 'Student ID *'}
              </label>
              <input
                type="text"
                name="studentId"
                value={formData?.studentId || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.studentId ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.studentId && (
                <p className="mt-2 text-sm text-red-600">{errors.studentId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Division *</label>
              <input
                type="text"
                name="division"
                value={formData?.division || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.division ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.division && (
                <p className="mt-2 text-sm text-red-600">{errors.division}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                value={formData?.email || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.email ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Academic Year *</label>
              <input
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
                <p className="mt-2 text-sm text-red-600">{errors.academicYear}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (₹) *</label>
              <input
                type="number"
                name="amount"
                min="1"
                max="1500"
                value={formData?.amount || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                  ${errors.amount ? 'border-red-300' : 'border-gray-300'}
                  focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
              />
              {errors.amount && (
                <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Holder Name *</label>
                <input
                  type="text"
                  name="accountName"
                  value={formData?.accountName || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                    ${errors.accountName ? 'border-red-300' : 'border-gray-300'}
                    focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                />
                {errors.accountName && (
                  <p className="mt-2 text-sm text-red-600">{errors.accountName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">IFSC Code *</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData?.ifscCode || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                    ${errors.ifscCode ? 'border-red-300' : 'border-gray-300'}
                    focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                />
                {errors.ifscCode && (
                  <p className="mt-2 text-sm text-red-600">{errors.ifscCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Account Number *</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData?.accountNumber || ''}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm
                    ${errors.accountNumber ? 'border-red-300' : 'border-gray-300'}
                    focus:border-teal-500 focus:ring-teal-500 sm:text-sm`}
                />
                {errors.accountNumber && (
                  <p className="mt-2 text-sm text-red-600">{errors.accountNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">NPTEL Course Name <span className="text-gray-900 font-bold">*</span></label>
                <input
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
                  <p className="mt-2 text-sm text-red-600">{errors.courseName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">NPTEL Marks (%) <span className="text-gray-900 font-bold">*</span></label>
                <input
                  type="number"
                  name="marks"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData?.marks || ''}
                  onChange={handleChange}
                  required
                  placeholder="Enter NPTEL marks"
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm
                    ${errors.marks ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.marks && (
                  <p className="mt-2 text-sm text-red-600">{errors.marks}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Update Documents (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  NPTEL Result
                </label>
                <input
                  type="file"
                  id="nptelResult"
                  name="nptelResult"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-teal-50 file:text-teal-700
                    hover:file:bg-teal-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {(user?.role?.toLowerCase() === 'faculty' || user?.role?.toLowerCase() === 'coordinator') ? 'Faculty ID Card' : 'Student ID Card'}
                </label>
                <input
                  type="file"
                  id="idCard"
                  name="idCard"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-teal-50 file:text-teal-700
                    hover:file:bg-teal-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={navigateBack}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm flex items-center gap-2 transition-colors
                ${saving ? 'bg-teal-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
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

