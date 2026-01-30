import React from 'react'

/**
 * PrintableForm - A properly formatted printable version of a reimbursement form
 * This component is designed to be printed as a PDF with all form details
 */
const PrintableForm = ({ request }) => {
  if (!request) return null

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0
    return `₹${num.toLocaleString('en-IN')}`
  }

  return (
    <div className="print-form bg-white text-black" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-form, .print-form * {
            visibility: visible;
          }
          .print-form {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          A.P. Shah Institute of Technology
        </h1>
        <p className="text-sm mt-1">Thane, Maharashtra</p>
        <h2 className="text-lg font-bold mt-4 uppercase">
          Reimbursement Application Form
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          (For {request.reimbursementType || 'NPTEL'} Course Certification)
        </p>
      </div>

      {/* Application Details */}
      <div className="mb-6">
        <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4">
          <div>
            <span className="font-semibold">Application ID: </span>
            <span className="font-mono">{request.id || request.applicationId || 'N/A'}</span>
          </div>
          <div>
            <span className="font-semibold">Date: </span>
            <span>{formatDate(request.submittedDate || request.createdAt)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <span className="font-semibold">Status: </span>
            <span className={`font-medium ${
              request.status === 'Approved' ? 'text-green-700' :
              request.status === 'Disbursed' ? 'text-amber-700' :
              'text-gray-700'
            }`}>{request.status}</span>
          </div>
          <div>
            <span className="font-semibold">Applicant Type: </span>
            <span>{request.applicantType || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Applicant Information */}
      <div className="mb-6">
        <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-3 uppercase">
          1. Applicant Information
        </h3>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold w-1/3">Full Name:</td>
              <td className="py-2">{request.applicantName || request.name || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">Email:</td>
              <td className="py-2">{request.email || request.applicantEmail || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">
                {request.applicantType === 'Student' ? 'Student ID:' : 'Employee ID:'}
              </td>
              <td className="py-2">{request.studentId || request.applicantId || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">Department:</td>
              <td className="py-2">{request.department || 'N/A'}</td>
            </tr>
            {request.applicantType === 'Student' && (
              <>
                <tr className="border-b border-gray-200">
                  <td className="py-2 font-semibold">Division:</td>
                  <td className="py-2">{request.division || 'N/A'}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 font-semibold">Academic Year:</td>
                  <td className="py-2">{request.academicYear || request.year || 'N/A'}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Course Details */}
      <div className="mb-6">
        <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-3 uppercase">
          2. Course Details
        </h3>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold w-1/3">Course Type:</td>
              <td className="py-2">{request.reimbursementType || request.category || 'NPTEL'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">Course Description:</td>
              <td className="py-2">{request.description || request.remarks || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Financial Details */}
      <div className="mb-6">
        <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-3 uppercase">
          3. Financial Details
        </h3>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold w-1/3">Reimbursement Amount:</td>
              <td className="py-2 font-bold text-lg">{request.amount || formatCurrency(request.amountNum)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bank Details */}
      <div className="mb-6">
        <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-3 uppercase">
          4. Bank Account Details
        </h3>
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold w-1/3">Account Holder Name:</td>
              <td className="py-2">{request.accountHolderName || request.applicantName || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">Bank Name:</td>
              <td className="py-2">{request.bankName || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">Account Number:</td>
              <td className="py-2 font-mono">{request.accountNumber || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">IFSC Code:</td>
              <td className="py-2 font-mono">{request.ifscCode || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Approval History */}
      <div className="mb-6">
        <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-3 uppercase">
          5. Approval History
        </h3>
        <table className="w-full border-collapse">
          <tbody>
            {request.hodComments && (
              <tr className="border-b border-gray-200">
                <td className="py-2 font-semibold w-1/3">HOD Comments:</td>
                <td className="py-2">{request.hodComments}</td>
              </tr>
            )}
            {request.principalComments && (
              <tr className="border-b border-gray-200">
                <td className="py-2 font-semibold">Principal Comments:</td>
                <td className="py-2">{request.principalComments}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">Submitted Date:</td>
              <td className="py-2">{formatDate(request.submittedDate || request.createdAt)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 font-semibold">Last Updated:</td>
              <td className="py-2">{formatDate(request.lastUpdated || request.updatedAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="mt-12 pt-6 border-t border-gray-400">
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="border-b border-black mb-2 h-12"></div>
            <p className="text-sm font-semibold">Applicant Signature</p>
            <p className="text-xs text-gray-500">Date: ____________</p>
          </div>
          <div>
            <div className="border-b border-black mb-2 h-12"></div>
            <p className="text-sm font-semibold">Verified By (Accounts)</p>
            <p className="text-xs text-gray-500">Date: ____________</p>
          </div>
          <div>
            <div className="border-b border-black mb-2 h-12"></div>
            <p className="text-sm font-semibold">Authorized Signatory</p>
            <p className="text-xs text-gray-500">Date: ____________</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>This is a computer-generated document. Please verify all details before processing.</p>
        <p className="mt-1">Generated on: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Office Use Only Section */}
      <div className="mt-6 p-4 border-2 border-dashed border-gray-400">
        <h4 className="text-sm font-bold mb-3">FOR OFFICE USE ONLY</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Cheque/Transaction No.: </span>
            <span className="border-b border-dotted border-gray-400 inline-block min-w-[150px]">&nbsp;</span>
          </div>
          <div>
            <span className="font-semibold">Date of Disbursement: </span>
            <span className="border-b border-dotted border-gray-400 inline-block min-w-[150px]">&nbsp;</span>
          </div>
          <div className="col-span-2">
            <span className="font-semibold">Remarks: </span>
            <span className="border-b border-dotted border-gray-400 inline-block w-full">&nbsp;</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrintableForm
