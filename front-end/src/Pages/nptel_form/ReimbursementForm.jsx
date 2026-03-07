import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getCsrfToken, fetchCsrfToken } from '../../services/api';

// Department options
const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "CSE AI and ML",
  "CSE Data Science",
  "Civil Engineering",
  "Mechanical Engineering"
];

// SECURITY: Input sanitization helper
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
};

// SECURITY: Validate file type and size
const validateFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  const maxSize = 500 * 1024; // 500KB

  if (!file) return { valid: true };

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 500KB' };
  }

  return { valid: true };
};

const ReimbursementForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    facultyId: '',
    jobTitle: '',
    department: '',
    email: '',
    amount: '',
    accountName: '',
    ifscCode: '',
    accountNumber: '',
    academicYear: '',
    courseName: '',
    marks: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SECURITY: Use refs for file inputs instead of direct DOM access
  const nptelFileRef = useRef(null);
  const idCardFileRef = useRef(null);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    // Faculty ID validation
    if (!formData.facultyId.trim()) {
      newErrors.facultyId = 'Faculty ID is required';
    }

    // Job Title validation
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job Title is required';
    }

    // Department validation
    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Academic Year validation
    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic Year is required';
    } else if (!/^\d{4}-\d{4}$/.test(formData.academicYear.trim())) {
      newErrors.academicYear = 'Please enter academic year in format YYYY-YYYY';
    }

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      } else if (amountNum > 1500) {
        newErrors.amount = 'Amount cannot exceed ₹1500';
      } else if (amountNum < 1) {
        newErrors.amount = 'Amount must be at least ₹1';
      }
    }

    // Account Name validation
    if (!formData.accountName.trim()) {
      newErrors.accountName = 'Account Name is required';
    }

    // IFSC Code validation
    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC Code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim())) {
      newErrors.ifscCode = 'Please enter a valid IFSC Code';
    }

    // Account Number validation
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account Number is required';
    } else if (!/^\d{9,18}$/.test(formData.accountNumber.trim())) {
      newErrors.accountNumber = 'Please enter a valid account number (9-18 digits)';
    }

    // NPTEL Course Name validation
    if (!formData.courseName.trim()) {
      newErrors.courseName = 'NPTEL Course Name is required';
    } else if (formData.courseName.trim().length < 3) {
      newErrors.courseName = 'Course name must be at least 3 characters long';
    }

    // Marks validation
    if (!formData.marks) {
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

  //handle input change - SECURITY: Sanitize inputs
  const handleChange = (e) => {
    const { name, value } = e.target;

    // SECURITY: Sanitize text inputs
    let sanitizedValue = value;
    if (name !== 'amount' && name !== 'marks') {
      sanitizedValue = sanitizeInput(value);
    }

    //for amount field
    if (name === "amount") {
      const numValue = parseFloat(value);
      if (value === "" || (!isNaN(numValue) && numValue > 0 && numValue <= 1500)) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
    } else if (name === "marks") {
      const numValue = parseFloat(value);
      if (value === "" || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: sanitizedValue,
      });
    }

    //clear errors when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",

      });
    }
  };

  //handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isSubmitting) return;

    if (!validateForm()) return;

    // Disable button immediately
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();

      //append all text fields - SECURITY: Sanitize before sending
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, sanitizeInput(formData[key]));
      });

      // Set applicantType based on user role
      const userRole = user?.role || 'Faculty';
      formDataToSend.append('applicantType', userRole); // Will be HOD, Coordinator, or Faculty

      // SECURITY: Use refs instead of direct DOM access
      const nptelFile = nptelFileRef.current?.files[0];
      const idCardFile = idCardFileRef.current?.files[0];

      // SECURITY: Validate files before appending
      if (nptelFile) {
        const validation = validateFile(nptelFile);
        if (!validation.valid) {
          toast.error(`NPTEL Result: ${validation.error}`);
          setIsSubmitting(false);
          return;
        }
        formDataToSend.append("nptelResult", nptelFile);
      }

      if (idCardFile) {
        const validation = validateFile(idCardFile);
        if (!validation.valid) {
          toast.error(`ID Card: ${validation.error}`);
          setIsSubmitting(false);
          return;
        }
        formDataToSend.append("idCard", idCardFile);
      }

      // CSRF: ensure token is available before submit
      if (!getCsrfToken()) {
        await fetchCsrfToken();
      }
      const headers = {};
      if (getCsrfToken()) {
        headers['X-CSRF-Token'] = getCsrfToken();
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      const doSubmit = () =>
        fetch(`${API_BASE_URL}/forms/submit`, {
          method: "POST",
          credentials: 'include',
          headers,
          body: formDataToSend,
        });

      let res = await doSubmit();
      let data = await res.json();

      // On 403 Invalid CSRF token, refresh token and retry once
      if (res.status === 403 && data?.error === 'Invalid CSRF token') {
        await fetchCsrfToken();
        const newToken = getCsrfToken();
        if (newToken) {
          const retryHeaders = { ...headers, 'X-CSRF-Token': newToken };
          res = await fetch(`${API_BASE_URL}/forms/submit`, {
            method: "POST",
            credentials: 'include',
            headers: retryHeaders,
            body: formDataToSend,
          });
          data = await res.json();
        }
      }

      if (res.ok) {
        toast.success("Application submitted successfully! Your request is now under review.");
        console.log(data);
        // Navigate based on user role after successful submission
        const navRole = user?.role?.toLowerCase();
        if (navRole === 'coordinator') {
          navigate('/dashboard/coordinator');
        } else if (navRole === 'hod') {
          navigate('/dashboard/hod/request-status');
        } else if (navRole === 'principal') {
          navigate('/dashboard/principal');
        } else {
          navigate('/dashboard/faculty/requests');
        }
      } else if (res.status === 413) {
        // File too large — show prominent warning popup
        toast.error(data.message || "File size exceeds 500KB limit. Please upload a smaller file.", {
          duration: 5000,
          icon: '⚠️',
        });
        setIsSubmitting(false);
      } else {
        const message =
          res.status === 403 && data?.error === 'Invalid CSRF token'
            ? 'Invalid CSRF token. Please refresh the page and try again.'
            : (data?.error && `Error: ${data.error}`) || 'Something went wrong.';
        toast.error(message);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      toast.error("Form submission failed. Please try again.");
      // Re-enable button on error so user can retry
      setIsSubmitting(false);
    }
  };




  return (
    <div className="min-h-screen bg-green-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800">
            Department of Information Technology
          </h1>
          <h2 className="text-xl font-semibold text-center text-gray-700 mt-2">
            Application for Faculty Reimbursement
          </h2>
        </div>

        <div className="text-right mb-6 text-gray-600">
          <p>Date: {new Date().toLocaleDateString()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="bg-teal-50 p-4 rounded-md">
              <p className="text-sm text-teal-800 font-medium">
                This is for NPTEL reimbursement application. Please fill all the required details accurately.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Personal Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Faculty ID Field */}
              <div>
                <label htmlFor="facultyId" className="block text-sm font-medium text-gray-700 mb-1">
                  Faculty ID *
                </label>
                <input
                  type="text"
                  id="facultyId"
                  name="facultyId"
                  value={formData.facultyId}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.facultyId
                    ? 'border-red-500'
                    : formData.facultyId.trim()
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-300'
                    }`}
                />
                {errors.facultyId && <p className="text-red-500 text-xs mt-1">{errors.facultyId}</p>}
              </div>

              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.jobTitle ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
              </div>

              {/* Department Field */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Department *
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.department ? 'border-red-500' : 'border-gray-300'
                    }`}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.email
                    ? 'border-red-500'
                    : formData.email.trim()
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-300'
                    }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>



          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Reimbursement Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  id="academicYear"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleChange}
                  placeholder="e.g. 2023-2024"
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.academicYear ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.academicYear && <p className="text-red-500 text-xs mt-1">{errors.academicYear}</p>}
              </div>

              {/* Amount Field */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  onWheel={(e) => e.target.blur()}
                  min="1"
                  max="1500"
                  step="1"
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.amount
                    ? 'border-red-500'
                    : formData.amount
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-300'
                    }`}
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
                <p className="text-xs text-gray-500 mt-1">Amount must be between ₹1 and ₹1500</p>
              </div>
            </div>


            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Type of Reimbursement
              </p>
              <div className="flex items-center bg-gray-100 p-3 rounded-md">
                <input
                  type="radio"
                  id="nptel"
                  name="reimbursementType"
                  value="NPTEL"
                  checked
                  readOnly
                  className="h-4 w-4 text-teal-600 accent-teal-600"
                />
                <label htmlFor="nptel" className="ml-2 text-sm text-gray-700 font-medium">
                  NPTEL
                </label>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Banking Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  id="accountName"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.accountName ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.accountName && <p className="text-red-500 text-xs mt-1">{errors.accountName}</p>}
              </div>

              <div>
                <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  id="ifscCode"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.ifscCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="e.g., SBIN0000123"
                />
                {errors.ifscCode && <p className="text-red-500 text-xs mt-1">{errors.ifscCode}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label htmlFor="courseName" className="block text-sm font-medium text-gray-700 mb-2">
              NPTEL Course Name <span className="text-gray-900 font-bold">*</span>
            </label>
            <input
              type="text"
              id="courseName"
              name="courseName"
              value={formData.courseName}
              onChange={handleChange}
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.courseName ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter NPTEL course name"
            />
            {errors.courseName && <p className="text-red-500 text-xs mt-1">{errors.courseName}</p>}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label htmlFor="marks" className="block text-sm font-medium text-gray-700 mb-2">
              NPTEL Marks (%) <span className="text-gray-900 font-bold">*</span>
            </label>
            <input
              type="number"
              id="marks"
              name="marks"
              value={formData.marks}
              onChange={handleChange}
              onWheel={(e) => e.target.blur()}
              min="0"
              max="100"
              step="0.01"
              required
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.marks ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter your NPTEL course marks"
            />
            {errors.marks && <p className="text-red-500 text-xs mt-1">{errors.marks}</p>}
            <p className="text-xs text-gray-500 mt-1">Enter marks between 0 and 100</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md mt-6">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Please provide all required supporting documents for NPTEL reimbursement.
            </p>
          </div>

          {/* Document Upload Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Supporting Documents (pdf)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NPTEL Result */}
              <div>
                <label
                  htmlFor="nptelResult"
                  className="block text-sm font-semibold text-gray-800 mb-2"
                >
                  Upload NPTEL Result *
                </label>
                <input
                  type="file"
                  id="nptelResult"
                  name="nptelResult"
                  ref={nptelFileRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const validation = validateFile(file);
                      if (!validation.valid) {
                        toast.error(`NPTEL Result: ${validation.error}`);
                        e.target.value = '';
                      }
                    }
                  }}
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-medium
                   file:bg-teal-50 file:text-teal-700
                   hover:file:bg-teal-100"
                />
                <p className="text-xs text-gray-500 mt-1">PDF, JPEG, or PNG — Max 500KB</p>

              </div>

              {/* Faculty ID Card */}
              <div>
                <label
                  htmlFor="idCard"
                  className="block text-sm font-semibold text-gray-800 mb-2"
                >
                  Upload Faculty ID Card *
                </label>
                <input
                  type="file"
                  id="idCard"
                  name="idCard"
                  ref={idCardFileRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const validation = validateFile(file);
                      if (!validation.valid) {
                        toast.error(`Faculty ID Card: ${validation.error}`);
                        e.target.value = '';
                      }
                    }
                  }}
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-medium
                   file:bg-teal-50 file:text-teal-700
                   hover:file:bg-teal-100"
                />
                <p className="text-xs text-gray-500 mt-1">PDF, JPEG, or PNG — Max 500KB</p>

              </div>
            </div>
          </div>


          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-200 flex items-center gap-2
                ${isSubmitting
                  ? 'bg-teal-400 cursor-not-allowed text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
                }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                'Submit NPTEL Reimbursement Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReimbursementForm;