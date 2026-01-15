import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { studentFormsAPI, facultyFormsAPI } from '../../services/api'; // Import faculty API
import { useAuth } from '../../context/AuthContext'; // Import useAuth   

export default function EditForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateBack = useBackNavigation();
  const { user } = useAuth(); // Get authenticated user
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        // Select API based on user role (Faculty and Coordinator use forms API, Students use student-forms)
        const userRole = user?.role?.toLowerCase();
        const api = (userRole === 'faculty' || userRole === 'coordinator') ? facultyFormsAPI : studentFormsAPI;

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
  }, [id, navigateBack, user]);

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

      const nptelFile = document.getElementById('nptelResult').files[0];
      const idCardFile = document.getElementById('idCard').files[0];

      if (nptelFile || idCardFile) {
        const uploadData = new FormData();
        if (nptelFile) uploadData.append('nptelResult', nptelFile);
        if (idCardFile) uploadData.append('idCard', idCardFile);

        // Upload new files first if provided
        try {
          const uploadResponse = await fetch(`http://localhost:5000/api/student-forms/${id}/documents`, {
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
          return;
        }
      }

      // Select API based on user role (Faculty and Coordinator use forms API)
      const userRole = user?.role?.toLowerCase();
      const api = (userRole === 'faculty' || userRole === 'coordinator') ? facultyFormsAPI : studentFormsAPI;
      await api.updateById(id, formDataToSend);

      toast.success('Form updated successfully!');
      // Navigate based on user role
      if (userRole === 'coordinator') {
        navigate('/dashboard/coordinator');
      } else if (userRole === 'faculty') {
        navigate('/dashboard/faculty/requests');
      } else {
        navigate('/dashboard/student/request-status');
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                className={`mt-1 block w-full rounded-md shadow-sm
                  ${errors.name ? 'border-red-300' : 'border-gray-300'}
                  focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {(user?.role?.toLowerCase() === 'faculty' || user?.role?.toLowerCase() === 'coordinator') ? 'Faculty ID *' : 'Student ID *'}
              </label>
              <input
                type="text"
                name="studentId"
                value={formData?.studentId || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm
                  ${errors.studentId ? 'border-red-300' : 'border-gray-300'}
                  focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
              />
              {errors.studentId && (
                <p className="mt-2 text-sm text-red-600">{errors.studentId}</p>
              )}
            </div>

            {/* Add other form fields here... */}

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
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
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
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={navigateBack}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm
                ${saving ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

