import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, IndianRupee } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatCard from '../components/StatCard';
import ReportLineChart from '../components/ReportLineChart';
import ReportPieChart from '../components/ReportPieChart';
import FilterBar from '../components/FilterBar';
import { usePrincipalContext } from './PrincipalLayout';
import { dashboardAPI } from '../../../../services/api';
const money = amount => `\u20b9${(amount || 0).toLocaleString('en-IN')}`;
const ReportsAndAnalytics = () => {
  const { allRequests, analytics: dashboardAnalytics, refreshRequests, queuePage, departments } = usePrincipalContext();
  const [selectedDateRange, setSelectedDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMemberType, setSelectedMemberType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [analytics, setAnalytics] = useState(dashboardAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [printRequested, setPrintRequested] = useState(false);
  const generation = useRef(0);
  const params = useMemo(() => ({ ...selectedDateRange, category: selectedCategory,
    applicantType: selectedMemberType, status: selectedStatus, department: selectedDepartment,
  }), [selectedDateRange, selectedCategory, selectedMemberType, selectedStatus , selectedDepartment]);
  const fetchReport = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError(null);
    try {
      const result = await dashboardAPI.analytics(params);
      if (current !== generation.current) return false;
      setAnalytics(result); return true;
    } catch (failure) {
      if (current === generation.current) setError(failure.error || failure.message || 'Unable to load report. Please retry.');
      return false;
    } finally { if (current === generation.current) setLoading(false); }
  }, [params]);
  useEffect(() => { fetchReport(); return () => { generation.current += 1; }; }, [fetchReport]);
  const stats = analytics?.summary || {};
  const approved = (stats.approved || 0) + (stats.reimbursed || 0);
  const processed = approved + (stats.rejected || 0);
  const approvalRate = processed ? Math.round(approved / processed * 100) : 0;
  const cards = [
    { title: 'Total Requests', value: String(stats.total || 0), subtitle: `${approvalRate}% approval rate`, icon: BarChart3, color: 'blue' },
    { title: 'Approved', value: String(approved), subtitle: 'Includes reimbursed requests', icon: TrendingUp, color: 'green' },
    { title: 'Pending', value: String(stats.pending || 0), subtitle: 'Awaiting workflow review', icon: Calendar, color: 'orange' },
    { title: 'Reimbursed Amount', value: money(stats.reimbursedAmount), subtitle: 'Completed reimbursements', icon: IndianRupee, color: 'purple' },
  ];
  const statuses = (analytics?.byStatus || []).map(item => ({ name: item._id, value: stats.total ? Number((item.count / stats.total * 100).toFixed(2)) : 0, count: item.count }));
  const categories = analytics?.byCategory || [];
  const monthly = useMemo(() => {
    const candidate = selectedDateRange.endDate ? new Date(`${selectedDateRange.endDate}T00:00:00Z`) : new Date();
    const anchor = Number.isFinite(candidate.getTime()) ? candidate : new Date();
    const buckets = new Map((analytics?.monthly || []).map(item => [item._id, item]));
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 5 + index, 1));
      const item = buckets.get(date.toISOString().slice(0, 7));
      return { month: date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        requests: item?.count || 0, amount: item?.reimbursedAmount || 0 };
    });
  }, [analytics, selectedDateRange.endDate]);
  const uniqueCategories = [...new Set(['NPTEL', 'FDP', 'Conference', 'Workshop', 'Travel', 'Lab Materials', ...(dashboardAnalytics?.byCategory || []).map(item => item._id)])];
  const uniqueStatuses = ['Under HOD', 'Under Principal', 'Approved', 'Reimbursed', 'Rejected'];
  const details = useMemo(() => allRequests.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (selectedMemberType !== 'All' && item.applicantType !== selectedMemberType) return false;
    if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
    const date = item.submittedDate || item.createdAt?.slice(0, 10);
    if (selectedDateRange.startDate && date < selectedDateRange.startDate) return false;
    if (selectedDateRange.endDate && date > selectedDateRange.endDate) return false;
    if (selectedDepartment !== 'All' && item.department !== selectedDepartment) return false;
    return true;
  }), [allRequests, selectedCategory, selectedMemberType, selectedStatus, selectedDateRange , selectedDepartment]);
  useEffect(() => {
    if (!printRequested) return;
    document.body.classList.add('principal-report-print');
    const cleanup = () => { document.body.classList.remove('principal-report-print'); setPrintRequested(false); };
    window.addEventListener('afterprint', cleanup);
    const fallback = window.setTimeout(cleanup, 120000);
    const frame = window.requestAnimationFrame(() => window.print());
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(fallback);
      window.removeEventListener('afterprint', cleanup); document.body.classList.remove('principal-report-print'); };
  }, [printRequested]);
  const handleExport = () => { if (!loading && !error && analytics) setPrintRequested(true); };
  const handleRefresh = async () => {
    const [updated] = await Promise.all([fetchReport(), refreshRequests()]);
    if (updated) toast.success('Report refreshed.');
  };
  const statusTable = <table className="w-full"><thead><tr><th>Status</th><th>Requests</th></tr></thead><tbody>{statuses.map(item => <tr key={item.name}><td>{item.name}</td><td>{item.count}</td></tr>)}</tbody></table>;
  const categoryTable = <table className="w-full"><thead><tr><th>Category</th><th>Requests</th><th>Reimbursed amount</th></tr></thead><tbody>{categories.map(item => <tr key={item._id}><td>{item._id}</td><td>{item.count}</td><td>{money(item.reimbursedAmount)}</td></tr>)}</tbody></table>;
  const monthlyTable = <table className="w-full"><thead><tr><th>Month</th><th>Requests</th><th>Reimbursed amount</th></tr></thead><tbody>{monthly.map(item => <tr key={item.month}><td>{item.month}</td><td>{item.requests}</td><td>{money(item.amount)}</td></tr>)}</tbody></table>;
  return <>
    <div className="reports-screen space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p>All authorized requests matching the report filters.</p></div>
        <button type="button" disabled={loading || !!error || !analytics} onClick={handleExport} className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"><Download size={16} />Export Report</button></header>
      <FilterBar onDateRangeChange={setSelectedDateRange} onCategoryChange={setSelectedCategory} onMemberTypeChange={setSelectedMemberType} onStatusChange={setSelectedStatus}
        onExport={handleExport} onRefresh={handleRefresh} categories={uniqueCategories} statuses={uniqueStatuses} onDepartmentChange={setSelectedDepartment} departments={departments.map(dept => dept.name)} />
      {loading && <p role="status">Loading report aggregates...</p>}
      {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-red-800"><p>{error}</p><button type="button" className="underline" onClick={fetchReport}>Retry report</button></div>}
      {!loading && !error && analytics && <>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">{cards.map(card => <StatCard key={card.title} {...card} />)}</div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ReportLineChart data={monthly} title="Monthly submissions and reimbursed amounts" height={350} /><ReportPieChart data={statuses} title="Status Distribution" height={350} /></div>
        <section className="overflow-x-auto rounded border bg-white p-6"><h2 className="mb-4 text-lg font-semibold">Category Breakdown</h2>{categoryTable}</section>
        <section className="rounded border bg-white p-6"><h2 className="mb-4 text-lg font-semibold">Department Breakdown</h2>{(analytics.byDepartment || []).map(item => <div key={item._id} className="flex justify-between border-b py-3"><span>{item._id}</span><span>{item.count} requests; {money(item.reimbursedAmount)} reimbursed</span></div>)}</section>
        <section className="rounded border bg-white p-6"><h2 className="mb-4 text-lg font-semibold">Processing outcomes</h2><p>{stats.rejected || 0} rejected requests. {approvalRate}% approval rate among completed decisions.</p><p>Average completed reimbursement: {money(stats.reimbursed ? Math.round((stats.reimbursedAmount || 0) / stats.reimbursed) : 0)}.</p></section>
      </>}
    </div>
    {printRequested && <div className="principal-print-root aggregate-report-print">
      <style>{`@media screen {.aggregate-report-print {display:none}} @media print {
        @page {size:A4;margin:12mm} body.principal-report-print * {visibility:hidden}
        body.principal-report-print .aggregate-report-print,body.principal-report-print .aggregate-report-print * {visibility:visible}
        .aggregate-report-print {position:absolute;left:0;top:0;width:100%;background:white;color:black;font-size:11pt}
        .aggregate-report-print table {width:100%;border-collapse:collapse;margin:12px 0}
        .aggregate-report-print td,.aggregate-report-print th {border:1px solid #ccc;padding:6px;text-align:left}
        .aggregate-report-print tr {break-inside:avoid}
      }`}</style>
      <h1>Reimbursement aggregate report</h1><p>{selectedDepartment === 'All' ? 'All authorized departments' : selectedDepartment}</p>
      <p>Dates: {selectedDateRange.startDate || 'All dates'} to {selectedDateRange.endDate || 'Present'}. Category: {selectedCategory}. Applicant type: {selectedMemberType}. Status: {selectedStatus}.</p>
      <p>All {stats.total || 0} matching authorized requests. Pending: {stats.pending || 0}; Approved: {approved}; Rejected: {stats.rejected || 0}; Reimbursed: {stats.reimbursed || 0}.</p>
      <p>Requested amount: {money(stats.totalAmount)}; Reimbursed amount: {money(stats.reimbursedAmount)}.</p>
      <h2>Status totals</h2>{statusTable}<h2>Category totals</h2>{categoryTable}<h2>Monthly submissions and reimbursed amounts</h2>{monthlyTable}
      <h2>Current queue page {queuePage || 1}: {details.length} matching detail rows</h2><p>This appendix contains only the current queue page. Aggregate totals above include every authorized matching request.</p>
      <table><thead><tr><th>Application</th><th>Applicant</th><th>Status</th><th>Requested amount</th></tr></thead><tbody>{details.map(item => <tr key={item.id}><td>{item.applicationId || item.id}</td><td>{item.applicantName}</td><td>{item.status}</td><td>{item.amount}</td></tr>)}</tbody></table>
    </div>}
  </>;
};
export default ReportsAndAnalytics;
