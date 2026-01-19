import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { studentFormsAPI, facultyFormsAPI } from '../../services/api'; // Import faculty API
import { useAuth } from '../../context/AuthContext'; // Import useAuth

export default function ViewForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Get authenticated user
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        // Select API based on user role (Faculty, Coordinator, HOD, Principal use forms API, Students use student-forms)
        const userRole = user?.role?.toLowerCase();
        const api = (userRole === 'faculty' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'principal')
          ? facultyFormsAPI
          : studentFormsAPI;

        // Note: facultyFormsAPI might return the form directly or wrapped. 
        // Student API returns { form: ... }, let's handle both.
        const response = await api.getById(id);
        const form = response.form || response; // Handle both structures if they differ

        setFormData(form);
        setError(null);
      } catch (err) {
        console.error('Error fetching form:', err);
        setError(err.error || 'Failed to fetch form details');
      } finally {
        setLoading(false);
      }
    };

    if (user) { // Only fetch if user is loaded
      fetchForm();
    }
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => navigate('/dashboard/requests')}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
        >
          Back to Request Status
        </button>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <div className="text-gray-500 mb-4">Form not found</div>
        <button
          onClick={() => navigate('/dashboard/requests')}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
        >
          Back to Request Status
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <button
            onClick={() => {
              const userRole = user?.role?.toLowerCase();
              if (userRole === 'coordinator') {
                navigate('/dashboard/coordinator');
              } else if (userRole === 'hod') {
                navigate('/dashboard/hod/request-status');
              } else if (userRole === 'principal') {
                navigate('/dashboard/principal');
              } else if (userRole === 'faculty') {
                navigate('/dashboard/faculty/requests');
              } else {
                navigate('/dashboard/requests');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Request Status
          </button>
        </div>

        <div className="border-b border-gray-200 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800">
            NPTEL Reimbursement Application Details
          </h1>
          <div className="mt-2 text-center text-sm text-gray-500">
            Submitted on {new Date(formData.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600">Name</label>
              <div className="mt-1 text-gray-900">{formData.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">
                {(user?.role?.toLowerCase() === 'faculty' || user?.role?.toLowerCase() === 'coordinator') ? 'Faculty ID' : 'Student ID'}
              </label>
              <div className="mt-1 text-gray-900">{formData.studentId}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Division</label>
              <div className="mt-1 text-gray-900">{formData.division}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Email</label>
              <div className="mt-1 text-gray-900">{formData.email}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Reimbursement Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-600">Amount</label>
              <div className="mt-1 text-gray-900">₹{formData.amount.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Academic Year</label>
              <div className="mt-1 text-gray-900">{formData.academicYear}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Status</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${formData.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    formData.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                  {formData.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Banking Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600">Account Name</label>
              <div className="mt-1 text-gray-900">{formData.accountName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">IFSC Code</label>
              <div className="mt-1 text-gray-900">{formData.ifscCode}</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-600">Account Number</label>
              <div className="mt-1 text-gray-900">{formData.accountNumber}</div>
            </div>
          </div>
        </div>

        {formData.remarks && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900">Remarks</h3>
            <div className="mt-2 text-gray-700 whitespace-pre-wrap">{formData.remarks}</div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Documents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.documents?.map((doc, index) => (
              <a
                key={index}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors duration-150"
              >
                <span className="text-sm">
                  {index === 0 ? 'NPTEL Result' : ((user?.role?.toLowerCase() === 'faculty' || user?.role?.toLowerCase() === 'coordinator') ? 'Faculty ID Card' : 'Student ID Card')}
                </span>
                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {formData.status === 'Rejected' && formData.rejectionReason && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <h3 className="text-lg font-medium text-red-800">Rejection Reason</h3>
            <div className="mt-2 text-red-700">{formData.rejectionReason}</div>
          </div>
        )}
      </div>
    </div>
  );
}