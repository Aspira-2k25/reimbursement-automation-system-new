import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ViewEditForm = ({ mode = 'view' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE_URL}/student-forms/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setFormData(data.form);
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to fetch form');
          if (response.status === 401) {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error fetching form:', error);
        toast.error('Failed to fetch form. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [id, navigate]);

  const handleBack = () => {
    navigate('/dashboard/requests');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    }

    // Add other validations as needed...

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode !== 'edit' || !validateForm()) return;

    try {
      const token = localStorage.getItem('token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE_URL}/student-forms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Form updated successfully!');
        navigate('/dashboard/requests');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update form');
      }
    } catch (error) {
      console.error('Error updating form:', error);
      toast.error('Failed to update form. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-red-500">Form not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Request Status
          </button>
        </div>

        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800">
            {mode === 'edit' ? 'Edit Student NPTEL Reimbursement' : 'View Student NPTEL Reimbursement'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={mode !== 'edit'}
                className={`w-full px-3 py-2 border rounded-md ${mode === 'edit'
                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-200'
                  }`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                disabled={mode !== 'edit'}
                className={`w-full px-3 py-2 border rounded-md ${mode === 'edit'
                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-gray-50 border-gray-200'
                  }`}
              />
            </div>

            {/* Add other form fields here... */}
          </div>

          {mode === 'edit' && (
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ViewEditForm;