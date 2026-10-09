import React from "react"
import { Eye, Pencil, Trash2, X, AlertCircle, Download } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { facultyFormsAPI } from "../../../../services/api"

const modalStyle = "fixed inset-0 z-50 flex items-center justify-center p-4"

function StatusBadge({ status }) {
  const getStatusClass = (status) => {
    switch (status) {
      case "Approved":
        return "badge badge-approved"
      case "Reimbursed":
        return "badge badge-reimbursed"
      case "Pending":
      case "Under HOD":
      case "Under Principal":
        return "badge badge-pending"
      case "Rejected":
        return "badge badge-rejected"
      default:
        return "badge badge-pending"
    }
  }

  return <span className={getStatusClass(status)}>{status}</span>
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
          {filtered.length > 0 ? filtered.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 font-medium text-slate-900">{r.id}</td>
              <td className="px-4 py-3">{r.category}</td>
              <td className="px-4 py-3">{r.courseName || 'N/A'}</td>
              <td className="px-4 py-3">{r.marks !== undefined && r.marks !== null ? `${r.marks}%` : 'N/A'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <StatusBadge status={r.status} />
                  {r.status === 'Rejected' && r.accountsRemarks && (
                    <span className="text-xs text-red-600 italic truncate max-w-[150px]" title={r.accountsRemarks}>
                      {r.accountsRemarks}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">₹{r.amount.toLocaleString("en-IN")}</td>
              <td className="px-4 py-3">{new Date(r.submittedDate).toLocaleDateString()}</td>
              <td className="px-4 py-3">{new Date(r.updatedDate).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    className="icon-btn hover:bg-blue-50 disabled:opacity-50"
                    onClick={() => {
                      const docUrl = r.documents?.[0]?.url;
                      // SECURITY: Validate URL before opening
                      if (docUrl) {
                        const isValidUrl = docUrl.startsWith('https://') || docUrl.startsWith('http://');
                        const isTrustedDomain = docUrl.includes('cloudinary.com') || docUrl.includes('res.cloudinary.com');
                        if (isValidUrl && isTrustedDomain) {
                          window.open(docUrl, '_blank', 'noopener,noreferrer');
                        } else {
                          toast.error('Invalid document URL');
                        }
                      }
                    }}
                    disabled={!r.documents?.[0]?.url}
                    title={r.documents?.[0]?.url ? "Download NPTEL Result" : "No Document"}
                    aria-label="Download NPTEL Result"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => {
                      setViewItem(r);
                      navigate(`/faculty-form/view/${r.id}`);
                    }}
                    aria-label="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    className="icon-btn hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => navigate(`/faculty-form/edit/${r.id}`)}
                    aria-label="Edit"
                    disabled={r.status !== 'Under HOD'}
                    title={r.status !== 'Under HOD' ? 'Editing locked — form has been acted upon' : 'Edit'}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="icon-btn text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setDeleteItem(r)}
                    aria-label="Delete"
                    disabled={r.status !== 'Under HOD'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                <div className="text-lg">No requests found</div>
                <div className="text-sm mt-1">Try adjusting your search or check back later</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {viewItem && (
        <div className={modalStyle} role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/30 transition-opacity duration-200"
            onClick={() => setViewItem(null)}
          ></div>
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl transform transition-all duration-200 scale-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Faculty Request Details</h3>
              <button
                className="icon-btn hover:bg-slate-100 active:bg-slate-200 transition-colors duration-150"
                onClick={() => setViewItem(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Application ID</div>
                <div className="font-medium">{viewItem.id}</div>
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
                <div className="font-medium">{new Date(viewItem.submittedDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-slate-500">Updated</div>
                <div className="font-medium">{new Date(viewItem.updatedDate).toLocaleDateString()}</div>
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
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className={modalStyle} role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/30 transition-opacity duration-200"
            onClick={() => setDeleteItem(null)}
          ></div>
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transform transition-all duration-200 scale-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="shrink-0">
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
                    // SECURITY: Use centralized API service with httpOnly cookies
                    await facultyFormsAPI.deleteById(deleteItem.id);
                    onDelete?.(deleteItem.id);
                    setDeleteItem(null);
                    toast.success('Form deleted successfully');
                  } catch (error) {
                    toast.error(error.error || 'Failed to delete form');
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}