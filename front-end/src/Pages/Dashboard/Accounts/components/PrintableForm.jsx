import React from 'react'
import apshahLogo from '../../../../assets/images/Apshah_logo.png'

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
    <div id="print-section" className="print-form bg-white text-black" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff;
          }

          body.accounts-reimbursement-print #root {
            height: 0 !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          body.accounts-reimbursement-print * {
            visibility: hidden;
          }

          body.accounts-reimbursement-print #print-section,
          body.accounts-reimbursement-print #print-section * {
            visibility: visible;
          }

          body.accounts-reimbursement-print .print-modal-overlay {
            display: block !important;
            position: static !important;
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
          }

          body.accounts-reimbursement-print .print-modal-shell {
            max-width: none !important;
            width: 100%;
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            transform: none !important;
          }

          body.accounts-reimbursement-print .print-modal-header {
            display: none !important;
          }

          body.accounts-reimbursement-print .print-form-host {
            padding: 0 !important;
            margin: 0 !important;
            height: auto !important;
          }

          body.accounts-reimbursement-print #print-section {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-size: 11.5px;
            line-height: 1.12;
            color: #000;
            background: #fff;
            page-break-before: avoid;
            break-after: avoid-page;
            page-break-after: avoid;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          body.accounts-reimbursement-print #print-section table,
          body.accounts-reimbursement-print #print-section tr,
          body.accounts-reimbursement-print #print-section td,
          body.accounts-reimbursement-print #print-section th {
            page-break-before: avoid;
            page-break-after: avoid;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          body.accounts-reimbursement-print .print-form {
            max-width: 190mm;
          }
        }
      `}</style>

      {/* Header */}
      <div className="border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center justify-center gap-2">
          <img
            src={apshahLogo}
            alt="AP Shah Institute Logo"
            className="w-14 h-14 object-contain"
          />
          <div className="text-center">
            <h1 className="text-xl font-bold uppercase tracking-wide">
              A.P. Shah Institute of Technology
            </h1>
            <p className="text-sm mt-0.5">Thane, Maharashtra</p>
          </div>
        </div>
        <h2 className="text-base font-bold mt-2 uppercase text-center">
          Reimbursement Application Form
        </h2>
        <p className="text-sm text-gray-600 mt-0.5 text-center">
          (For {request.reimbursementType || 'NPTEL'} Course Certification)
        </p>
      </div>

      {/* Application Details */}
      <div className="mb-3">
        <div className="flex justify-between items-center border-b border-gray-300 pb-1 mb-2">
          <div>
            <span className="font-semibold">Application ID: </span>
            <span className="font-mono">{request.applicationId || request.id || 'N/A'}</span>
          </div>
          <div>
            <span className="font-semibold">Date: </span>
            <span>{formatDate(request.submittedDate || request.createdAt)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <span className="font-semibold">Status: </span>
            <span className={`font-medium ${request.status === 'Approved' ? 'text-[#57BA98]' :
                request.status === 'Reimbursed' ? 'text-[#3B945E]' :
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
      <div className="mb-1.5">
        <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-1 uppercase">
          1. Applicant Information
        </h3>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold w-1/3">Full Name:</td>
              <td className="py-1">{request.applicantName || request.name || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">Email:</td>
              <td className="py-1">{request.email || request.applicantEmail || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">
                {request.applicantType === 'Student' ? 'Student ID:' : 'Faculty ID:'}
              </td>
              <td className="py-1">{request.facultyId || request.studentId || request.applicantId || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">Department:</td>
              <td className="py-1">{request.department || 'N/A'}</td>
            </tr>
            {request.applicantType === 'Student' && (
              <>
                <tr className="border-b border-gray-200">
                  <td className="py-1 font-semibold">Division:</td>
                  <td className="py-1">{request.division || 'N/A'}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1 font-semibold">Academic Year:</td>
                  <td className="py-1">{request.academicYear || request.year || 'N/A'}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Course Details */}
      <div className="mb-1.5">
        <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-1 uppercase">
          2. Course Details
        </h3>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold w-1/3">Course Type:</td>
              <td className="py-1">{request.reimbursementType || request.category || 'NPTEL'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">Course Description:</td>
              <td className="py-1">{request.description || request.remarks || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Financial Details */}
      <div className="mb-1.5">
        <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-1 uppercase">
          3. Financial Details
        </h3>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold w-1/3">Reimbursement Amount:</td>
              <td className="py-1 font-bold text-base">{request.amount || formatCurrency(request.amountNum)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bank Details */}
      <div className="mb-1.5">
        <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-1 uppercase">
          4. Bank Account Details
        </h3>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold w-1/3">Account Holder Name:</td>
              <td className="py-1">{request.accountHolderName || request.applicantName || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">Account Number:</td>
              <td className="py-1 font-mono">{request.accountNumber || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">IFSC Code:</td>
              <td className="py-1 font-mono">{request.ifscCode || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Approval History */}
      <div className="mb-1.5">
        <h3 className="text-sm font-bold border-b border-gray-400 pb-1 mb-1 uppercase">
          5. Approval History
        </h3>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {request.hodComments && (
              <tr className="border-b border-gray-200">
                <td className="py-1 font-semibold w-1/3">HOD Comments:</td>
                <td className="py-1">{request.hodComments}</td>
              </tr>
            )}
            {request.principalComments && (
              <tr className="border-b border-gray-200">
                <td className="py-1 font-semibold">Principal Comments:</td>
                <td className="py-1">{request.principalComments}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">Submitted Date:</td>
              <td className="py-1">{formatDate(request.submittedDate || request.createdAt)}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-1 font-semibold">Last Updated:</td>
              <td className="py-1">{formatDate(request.lastUpdated || request.updatedAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}

export default PrintableForm
