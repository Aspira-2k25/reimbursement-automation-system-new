import React, { useState } from "react"
import { Eye, Pencil, Trash2, X, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

const modalStyle = "fixed inset-0 z-50 flex items-center justify-center p-4"

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase()

  const pendingStatuses = new Set([
    "pending",
    "at under cordinator",
    "under coordinator",
    "under principal",
  ])

  const cls =
    normalized === "approved"
      ? "badge badge-approved"
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
              } catch (e) {
                return 'N/A';
              }
            };

            return (
              <tr key={r.id || r._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">{r.id || r._id || 'N/A'}</td>
                <td className="px-4 py-3">{r.category || r.reimbursementType || 'NPTEL'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status || 'Pending'} />
                </td>
                <td className="px-4 py-3">₹{(r.amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">{formatDate(r.submittedDate || r.createdAt)}</td>
                <td className="px-4 py-3">{formatDate(r.updatedDate || r.updatedAt)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    className="icon-btn hover:bg-blue-50"
                    onClick={() => navigate(`/nptel-form/view/${r._id || r.applicationId || r.id}`)}
                    aria-label="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    className="icon-btn hover:bg-green-50 disabled:opacity-50"
                    onClick={() => navigate(`/nptel-form/edit/${r._id || r.applicationId || r.id}`)}
                    aria-label="Edit"
                    disabled={r.status !== 'Pending'}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="icon-btn text-red-600 hover:bg-red-50 disabled:opacity-50"
                    onClick={() => setDeleteItem(r)}
                    aria-label="Delete"
                    disabled={r.status !== 'Pending'}
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

      {viewItem && (
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
                  } catch (error) {
                    console.error('Error deleting form:', error);
                    alert('Failed to delete form. Please try again.');
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
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
              onSave={(payload) => {
                // TODO: Implement actual save logic
                console.log('Saving request:', payload)
                setEditItem(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EditForm({ item, onSave, onCancel }) {
  const [form, setForm] = React.useState({
    category: item.category,
    description: item.description,
    status: item.status,
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
        <span className="text-sm text-slate-600">Status</span>
        <select
          className="input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          required
        >
          {["Approved", "Pending", "Rejected"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">Amount (₹)</span>
        <input
          className="input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value || 0) }))}
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