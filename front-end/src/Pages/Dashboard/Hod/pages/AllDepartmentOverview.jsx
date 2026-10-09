import { useState, useEffect, useCallback, useRef } from 'react';
import { Building } from 'lucide-react';
import { useHODContext } from './HODLayout';
import { dashboardAPI } from '../../../../services/api';

const AllDepartmentOverview = () => {
  const { userProfile } = useHODContext();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError(null);
    try {
      const data = await dashboardAPI.analytics();
      if (current === generation.current) setAnalytics(data);
    } catch (failure) {
      if (current === generation.current) setError(failure.error || failure.message || 'Unable to load department overview.');
    } finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { refresh(); return () => { generation.current += 1; }; }, [refresh]);
  const counts = analytics?.summary || {};
  return <div className="space-y-6">
    <header className="rounded-xl border border-green-200 bg-green-50 p-6"><div className="flex items-center gap-3"><Building className="text-green-600" /><h1 className="text-2xl font-bold">Your department overview</h1></div>
      <p className="mt-2">{userProfile?.department || 'Assigned department'}: all applications visible to your HOD account.</p>
      <p className="mt-2 text-sm text-gray-600">Other department statistics are not available to this account.</p>
      <button type="button" disabled={loading} onClick={refresh} className="mt-3 rounded border px-3 py-2 disabled:opacity-40">Refresh overview</button></header>
    {loading && <p role="status">Loading department statistics...</p>}
    {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-4"><p>{error}</p><button type="button" onClick={refresh} className="underline">Retry overview</button></div>}
    {!loading && !error && analytics && <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[
        ['Total Requests', counts.total || 0], ['Pending review', counts.pending || 0],
        ['Approved or reimbursed', (counts.approved || 0) + (counts.reimbursed || 0)], ['Rejected', counts.rejected || 0],
      ].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-2xl font-bold">{value}</p><p>{label}</p></div>)}</div>
      <section className="rounded-xl border bg-white p-6"><h2 className="text-lg font-semibold">Authorized department totals</h2>
        {(analytics.byDepartment || []).map(item => <div key={item._id} className="mt-3 flex flex-wrap justify-between gap-3 rounded bg-green-50 p-4"><span>{item._id}</span><span>{item.count} requests</span><span>Reimbursed: INR {(item.reimbursedAmount || 0).toLocaleString('en-IN')}</span></div>)}
        {!analytics.byDepartment?.length && <p className="mt-3">No authorized applications found.</p>}</section>
      <section className="rounded-xl border bg-white p-6"><h2 className="text-lg font-semibold">Workflow distribution</h2>{(analytics.byStatus || []).map(item => <div key={item._id} className="flex justify-between border-b py-3"><span>{item._id}</span><span>{item.count}</span></div>)}</section>
    </>}
  </div>;
};
export default AllDepartmentOverview;
