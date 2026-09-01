import React from "react"
import { Eye, Pencil, Trash2, X, AlertCircle, Download } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { jsPDF } from "jspdf"
import { studentFormsAPI } from "../../../../services/api"

const modalStyle = "fixed inset-0 z-50 flex items-center justify-center p-4"

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase()

  const pendingStatuses = new Set([
    "pending",
    "at under coordinator",
    "under coordinator",
    "under principal",
  ])

  const cls =
    normalized === "approved"
      ? "badge badge-approved"
      : normalized === "reimbursed"
        ? "badge badge-reimbursed"
        : normalized === "rejected"
          ? "badge badge-rejected"
          : normalized === "under hod"
            ? "badge badge-under-hod"
            : pendingStatuses.has(normalized)
              ? "badge badge-pending"
              : "badge badge-pending"

  return <span className={cls}>{status}</span>
}

/**
 * RequestsTable Component
 * Displays a table of reimbursement requests with search functionality
 * @param {string} search - Search term for filtering requests
 * @param {Array} requests - Array of request objects to display
 */
export default function RequestsTable({ search, requests = [], onDelete }) {
  const navigate = useNavigate();
  const [viewItem, setViewItem] = React.useState(null);
  const [editItem, setEditItem] = React.useState(null);
  const [deleteItem, setDeleteItem] = React.useState(null);

  // Filter requests based on search term
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return requests
    return requests.filter((r) => {
      const hay = `${r.id} ${r.category} ${r.description}`.toLowerCase()
      return hay.includes(q)
    })
  }, [requests, search])

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Application ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Category</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Course Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Marks</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Submitted Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Last Updated</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {filtered.length > 0 ? filtered.map((r) => {
            // Helper function to safely format dates
            const formatDate = (dateValue) => {
              if (!dateValue) return 'N/A';
              try {
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) return 'N/A';
                return date.toLocaleDateString();
              } catch {
                return 'N/A';
              }
            };

            return (
              <tr key={r.id || r._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">{r.id || r._id || 'N/A'}</td>
                <td className="px-4 py-3">{r.category || r.reimbursementType || 'NPTEL'}</td>
                <td className="px-4 py-3">{r.courseName || 'N/A'}</td>
                <td className="px-4 py-3">{r.marks !== undefined && r.marks !== null ? `${r.marks}%` : 'N/A'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-center">
                    <StatusBadge status={r.status || 'Pending'} />
                    {r.status === 'Rejected' && r.accountsRemarks && (
                      <span className="text-xs text-red-600 italic truncate max-w-[150px]" title={r.accountsRemarks}>
                        {r.accountsRemarks}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">₹{(r.amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">{formatDate(r.submittedDate || r.createdAt)}</td>
                <td className="px-4 py-3">{formatDate(r.updatedDate || r.updatedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      className="icon-btn hover:bg-blue-50"
                      onClick={async () => {
                        try {
                          // Fetch latest complete form data from database
                          let formDetails = { ...r };
                          try {
                            const res = await studentFormsAPI.getById(r._id || r.applicationId || r.id);
                            const full = res?.form || res;
                            if (full && typeof full === 'object') {
                              formDetails = { ...formDetails, ...full };
                            }
                          } catch (fetchErr) {
                            console.warn('Could not fetch full details, using table state:', fetchErr);
                          }

                          // Generate Professional Institutional PDF
                          const doc = new jsPDF();
                          const pageWidth = doc.internal.pageSize.getWidth();
                          let y = 16;

                          // Institutional Header
                          doc.setFont('helvetica', 'bold');
                          doc.setFontSize(10);
                          doc.setTextColor(80, 80, 80);
                          doc.text("PARSHVANATH CHARITABLE TRUST'S", pageWidth / 2, y, { align: 'center' });
                          y += 6;

                          doc.setFontSize(14);
                          doc.setTextColor(15, 23, 42);
                          doc.text('A. P. SHAH INSTITUTE OF TECHNOLOGY', pageWidth / 2, y, { align: 'center' });
                          y += 5;

                          doc.setFontSize(9.5);
                          doc.setFont('helvetica', 'italic');
                          doc.setTextColor(71, 85, 105);
                          doc.text('(Approved by AICTE New Delhi & Govt. of Maharashtra, Affiliated to University of Mumbai)', pageWidth / 2, y, { align: 'center' });
                          y += 7;

                          doc.setDrawColor(203, 213, 225);
                          doc.setLineWidth(0.5);
                          doc.line(15, y, pageWidth - 15, y);
                          y += 8;

                          // Document Title
                          doc.setFont('helvetica', 'bold');
                          doc.setFontSize(12);
                          doc.setTextColor(15, 23, 42);
                          doc.text('NPTEL REIMBURSEMENT APPLICATION ACKNOWLEDGMENT', pageWidth / 2, y, { align: 'center' });
                          y += 10;

                          // Application Meta Box
                          doc.setFillColor(248, 250, 252);
                          doc.setDrawColor(226, 232, 240);
                          doc.roundedRect(15, y, pageWidth - 30, 16, 2, 2, 'FD');
                          
                          doc.setFontSize(9.5);
                          doc.setFont('helvetica', 'bold');
                          doc.setTextColor(51, 65, 85);
                          doc.text(`Application ID:`, 20, y + 6);
                          doc.setFont('helvetica', 'normal');
                          doc.text(String(formDetails.applicationId || formDetails._id || formDetails.id || '-'), 50, y + 6);

                          doc.setFont('helvetica', 'bold');
                          doc.text(`Status:`, 120, y + 6);
                          doc.setFont('helvetica', 'normal');
                          doc.text(String(formDetails.status || 'Pending'), 135, y + 6);

                          doc.setFont('helvetica', 'bold');
                          doc.text(`Submitted On:`, 20, y + 12);
                          doc.setFont('helvetica', 'normal');
                          const subDate = formDetails.submittedDate || formDetails.createdAt ? new Date(formDetails.submittedDate || formDetails.createdAt).toLocaleDateString('en-IN') : '-';
                          doc.text(subDate, 50, y + 12);

                          doc.setFont('helvetica', 'bold');
                          doc.text(`Academic Year:`, 120, y + 12);
                          doc.setFont('helvetica', 'normal');
                          doc.text(String(formDetails.academicYear || '2026-2027'), 150, y + 12);
                          y += 24;

                          // Helper function for clean section headers
                          const printSectionHeader = (title) => {
                            doc.setFont('helvetica', 'bold');
                            doc.setFontSize(10.5);
                            doc.setTextColor(59, 148, 94); // APSIT Emerald
                            doc.text(title, 15, y);
                            doc.setDrawColor(59, 148, 94);
                            doc.setLineWidth(0.3);
                            doc.line(15, y + 2, pageWidth - 15, y + 2);
                            y += 8;
                          };

                          // Helper for two-column field rows
                          const printFieldRow = (label1, val1, label2, val2) => {
                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'bold');
                            doc.setTextColor(71, 85, 105);
                            doc.text(label1, 15, y);
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(15, 23, 42);
                            doc.text(String(val1 || '-'), 50, y);

                            if (label2) {
                              doc.setFont('helvetica', 'bold');
                              doc.setTextColor(71, 85, 105);
                              doc.text(label2, 115, y);
                              doc.setFont('helvetica', 'normal');
                              doc.setTextColor(15, 23, 42);
                              doc.text(String(val2 || '-'), 145, y);
                            }
                            y += 6;
                          };

                          // 1. Applicant Details
                          printSectionHeader('1. APPLICANT DETAILS');
                          printFieldRow('Full Name:', formDetails.name || formDetails.studentName || '-', 'Student ID / Roll:', formDetails.studentId || '-');
                          printFieldRow('Department:', formDetails.department || '-', 'Division:', formDetails.division || '-');
                          printFieldRow('Email Address:', formDetails.email || '-', '', '');
                          y += 4;

                          // 2. Course & Reimbursement Details
                          printSectionHeader('2. NPTEL COURSE & REIMBURSEMENT DETAILS');
                          printFieldRow('Course Name:', formDetails.courseName || '-', 'Score / Marks (%):', formDetails.marks !== undefined && formDetails.marks !== null ? `${formDetails.marks}%` : '-');
                          printFieldRow('Claim Amount:', `Rs. ${(formDetails.amount || 0).toLocaleString('en-IN')}`, 'Category:', formDetails.reimbursementType || formDetails.category || 'NPTEL');
                          y += 4;

                          // 3. Bank Account Details
                          printSectionHeader('3. BANK ACCOUNT DETAILS (FOR DISBURSEMENT)');
                          printFieldRow('Account Name:', formDetails.accountName || formDetails.name || '-', 'Account Number:', formDetails.accountNumber || '-');
                          printFieldRow('IFSC Code:', formDetails.ifscCode || '-', '', '');
                          y += 4;

                          // 4. Remarks & Verification
                          printSectionHeader('4. REMARKS & ADMINISTRATIVE STATUS');
                          doc.setFontSize(9);
                          doc.setFont('helvetica', 'normal');
                          doc.setTextColor(51, 65, 85);
                          const remarkText = formDetails.remarks || formDetails.rejectionRemarks || formDetails.accountsRemarks || 'Application submitted successfully for administrative review.';
                          doc.text(remarkText, 15, y, { maxWidth: pageWidth - 30 });
                          y += 18;

                          // Footer note & date
                          doc.setFontSize(8);
                          doc.setTextColor(148, 163, 184);
                          doc.text('This is an auto-generated system acknowledgment from APSIT Reimbursement Automation Portal.', pageWidth / 2, 275, { align: 'center' });
                          doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 280, { align: 'center' });

                          // Save PDF
                          doc.save(`Application_${formDetails.applicationId || formDetails._id || 'form'}.pdf`);
                          toast.success('Application PDF downloaded successfully!');
                        } catch (err) {
                          console.error('PDF generation error:', err);
                          toast.error('Failed to generate PDF document');
                        }
                      }}
                      title="Download Application Form"
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      className="icon-btn hover:bg-blue-50"
                      onClick={() => navigate(`/nptel-form/view/${r._id || r.applicationId || r.id}`)}
                      aria-label="View"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="icon-btn hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => navigate(`/nptel-form/edit/${r._id || r.applicationId || r.id}`)}
                      aria-label="Edit"
                      disabled={r.status !== 'Pending'}
                      title={r.status !== 'Pending' ? 'Editing locked — form has been acted upon' : 'Edit'}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="icon-btn text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setDeleteItem(r)}
                      aria-label="Delete"
                      disabled={r.status !== 'Pending'}
                      title={r.status !== 'Pending' ? 'Deletion locked — form has been acted upon' : 'Delete'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                <div className="text-lg">No requests found</div>
                <div className="text-sm mt-1">Try adjusting your search or check back later</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {
        viewItem && (
          <div className={modalStyle} role="dialog" aria-modal="true">
            <div
              className="fixed inset-0 bg-black/30 transition-opacity duration-200"
              onClick={() => setViewItem(null)}
            ></div>
            <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl transform transition-all duration-200 scale-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Request Details</h3>
                <button
                  className="icon-btn hover:bg-slate-100 active:bg-slate-200 transition-colors duration-150"
                  onClick={() => setViewItem(null)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-medium">
                  <StatusBadge status={viewItem.status} />
                </div>
              </div>
              <div>
                <div className="text-slate-500">Amount</div>
                <div className="font-medium">₹{viewItem.amount.toLocaleString("en-IN")}</div>
              </div>
              <div>
                <div className="text-slate-500">Submitted</div>
                <div className="font-medium">
                  {(() => {
                    const date = viewItem.submittedDate || viewItem.createdAt;
                    if (!date) return 'N/A';
                    try {
                      const d = new Date(date);
                      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                    } catch {
                      return 'N/A';
                    }
                  })()}
                </div>
                <div>
                  <div className="text-slate-500">Category</div>
                  <div className="font-medium">{viewItem.category}</div>
                </div>
                <div>
                  <div className="text-slate-500">Status</div>
                  <div className="font-medium">{viewItem.status}</div>
                </div>
                <div>
                  <div className="text-slate-500">Amount</div>
                  <div className="font-medium">₹{viewItem.amount.toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="text-slate-500">Submitted</div>
                  <div className="font-medium">
                    {(() => {
                      const date = viewItem.submittedDate || viewItem.createdAt;
                      if (!date) return 'N/A';
                      try {
                        const d = new Date(date);
                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                      } catch {
                        return 'N/A';
                      }
                    })()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Updated</div>
                  <div className="font-medium">
                    {(() => {
                      const date = viewItem.updatedDate || viewItem.updatedAt;
                      if (!date) return 'N/A';
                      try {
                        const d = new Date(date);
                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                      } catch {
                        return 'N/A';
                      }
                    })()}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-slate-500">Description</div>
                  <div className="font-medium">{viewItem.description}</div>
                </div>
                {/* Show rejection remarks if rejected by Accounts */}
                {viewItem.status === 'Rejected' && viewItem.accountsRemarks && (
                  <div className="md:col-span-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-600 font-medium text-sm">Rejection Reason</div>
                    <div className="text-red-700 mt-1">{viewItem.accountsRemarks}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        deleteItem && (
          <div className={modalStyle} role="dialog" aria-modal="true">
            <div
              className="fixed inset-0 bg-black/30 transition-opacity duration-200"
              onClick={() => setDeleteItem(null)}
            ></div>
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transform transition-all duration-200 scale-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Confirmation</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this form? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                  onClick={() => setDeleteItem(null)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-150"
                  onClick={async () => {
                    try {
                      await onDelete?.(deleteItem._id);
                      setDeleteItem(null);
                    } catch {
                      toast.error('Failed to delete form. Please try again.');
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        editItem && (
          <div className={modalStyle} role="dialog" aria-modal="true">
            <div
              className="fixed inset-0 bg-black/30 transition-opacity duration-200"
              onClick={() => setEditItem(null)}
            ></div>
            <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl transform transition-all duration-200 scale-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Request</h3>
                <button
                  className="icon-btn hover:bg-slate-100 active:bg-slate-200 transition-colors duration-150"
                  onClick={() => setEditItem(null)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <EditForm
                item={editItem}
                onCancel={() => setEditItem(null)}
                onSave={async (payload) => {
                  try {
                    await studentFormsAPI.updateById(editItem._id || editItem.id, payload);
                    toast.success('Request updated successfully!');
                    setEditItem(null);
                    // Trigger a refetch if parent provided a callback
                    window.location.reload();
                  } catch {
                    toast.error('Failed to update form. Please try again.');
                  }
                }}
              />
            </div>
          </div>
        )
      }
    </div >
  )
}

function EditForm({ item, onSave, onCancel }) {
  const [form, setForm] = React.useState({
    category: item.category,
    description: item.description,
    amount: item.amount,
  })

  const handleSubmit = React.useCallback((e) => {
    e.preventDefault()
    onSave(form)
  }, [form, onSave])

  const handleCancel = React.useCallback(() => {
    onCancel()
  }, [onCancel])

  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={handleSubmit}
    >
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">Category</span>
        <input
          className="input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          required
        />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">Description</span>
        <textarea
          className="input min-h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">Amount (₹)</span>
        <input
          className="input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
          type="number"
          min="1"
          max="1500"
          step="1"
          value={form.amount}
          onChange={(e) => {
            const val = e.target.value;
            const numVal = parseFloat(val);
            if (val === '' || (!isNaN(numVal) && numVal > 0 && numVal <= 1500)) {
              setForm((f) => ({ ...f, amount: val === '' ? '' : numVal }));
            }
          }}
          onWheel={(e) => e.target.blur()}
          required
        />
      </label>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
        <button
          type="button"
          className="btn btn-outline hover:bg-slate-50 active:bg-slate-100 transition-colors duration-150"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all duration-150"
        >
          Save Changes
        </button>
      </div>
    </form>
  )
}