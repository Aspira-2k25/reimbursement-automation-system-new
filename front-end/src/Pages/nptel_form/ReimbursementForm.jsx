import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const ReimbursementForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    jobTitle: '',
    email: '',
    amount: '',
    accountName: '',
    ifscCode: '',
    accountNumber: '',
    academicYear: '',
    remarks: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    // ID validation
    if (!formData.id.trim()) {
      newErrors.id = 'ID is required';
    }

    // Job Title validation
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job Title is required';
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  //handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    //for amount field
    if (name === "amount") {
      if (value === "" || (value > 0 && value <= 1500)) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    //clear errors when user sttarts typing
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
    if (!validateForm()) return;

    try {
      const formDataToSend = new FormData();

      //append all text fields
      Object.keys(formData).forEach((key) => {
        formDataToSend.append(key, formData[key]);
      });

      // Set applicantType based on user role
      const userRole = user?.role || 'Faculty';
      formDataToSend.append('applicantType', userRole); // Will be HOD, Coordinator, or Faculty

      // Add department from user profile
      if (user?.department) {
        formDataToSend.append('department', user.department);
      }

      //append files
      const nptelFile = document.getElementById("nptelResult").files[0];
      const idCardFile = document.getElementById("idCard").files[0];
      if (nptelFile) formDataToSend.append("nptelResult", nptelFile);
      if (idCardFile) formDataToSend.append("idCard", idCardFile);

      //get jwt tocken from login
      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/forms/submit", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,  // add tocken for authorization
        },
        body: formDataToSend,
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Form submitted successfully!");
        console.log(data);
        // Navigate based on user role after successful submission
        const userRole = user?.role?.toLowerCase();
        if (userRole === 'coordinator') {
          navigate('/dashboard/coordinator');
        } else if (userRole === 'hod') {
          navigate('/dashboard/hod/request-status');
        } else if (userRole === 'principal') {
          navigate('/dashboard/principal');
        } else {
          navigate('/dashboard/faculty/requests');
        }
      } else {
        toast.error("Error: " + data.error);
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      toast.error("Form submission failed. Try Again");
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
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800 font-medium">
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* ID Field */}
              <div>
                <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
                  ID *
                </label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.id
                    ? 'border-red-500'
                    : formData.id.trim()
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300'
                    }`}
                />
                {errors.id && <p className="text-red-500 text-xs mt-1">{errors.id}</p>}
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.id ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email
                    ? 'border-red-500'
                    : formData.email.trim()
                      ? 'border-blue-500 bg-blue-50'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.academicYear ? 'border-red-500' : 'border-gray-300'
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
                  min="1"
                  max="1500"
                  step="0.01"
                  required
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.amount
                    ? 'border-red-500'
                    : formData.amount
                      ? 'border-blue-500 bg-blue-50'
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
                  className="h-4 w-4 text-blue-600"
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.accountName ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.ifscCode ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
              Remarks (Optional)
            </label>
            <textarea
              id="remarks"
              name="remarks"
              rows="3"
              value={formData.remarks}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional remarks or notes..."
            ></textarea>
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
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-medium
                   file:bg-blue-50 file:text-blue-700
                   hover:file:bg-blue-100"
                />

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
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                   file:rounded-md file:border-0
                   file:text-sm file:font-medium
                   file:bg-blue-50 file:text-blue-700
                   hover:file:bg-blue-100"
                />

              </div>
            </div>
          </div>


          <div className="flex justify-center mt-8">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200"
            >
              Submit NPTEL Reimbursement Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReimbursementForm;