import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, IndianRupee, Layers, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatCard from '../components/StatCard';
import ReportLineChart from '../components/ReportLineChart';
import ReportPieChart from '../components/ReportPieChart';
import FilterBar from '../components/FilterBar';
import { useHODContext } from './HODLayout';
import { dashboardAPI } from '../../../../services/api';
import apshahLogo from '../../../../assets/images/Apshah_logo.png';
const money = amount => `\u20b9${(amount || 0).toLocaleString('en-IN')}`;
const ReportsAndAnalytics = () => {
  const { allRequests, analytics: dashboardAnalytics, refreshRequests, queuePage, userProfile, user } = useHODContext();
  const [selectedDateRange, setSelectedDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMemberType, setSelectedMemberType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const [analytics, setAnalytics] = useState(dashboardAnalytics);
  const [reportRecords, setReportRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [printRequested, setPrintRequested] = useState(false);
  const generation = useRef(0);
  const params = useMemo(() => ({ ...selectedDateRange, category: selectedCategory,
    applicantType: selectedMemberType, status: selectedStatus,
  }), [selectedDateRange, selectedCategory, selectedMemberType, selectedStatus ]);
  const fetchReport = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError(null);
    try {
      const [analyticsResult, listResult] = await Promise.all([
        dashboardAPI.analytics(params),
        dashboardAPI.list({ ...params, page: 1, limit: 100 })
      ]);
      if (current !== generation.current) return false;
      setAnalytics(analyticsResult);
      setReportRecords(listResult?.forms || []);
      return true;
    } catch (failure) {
      if (current === generation.current) setError(failure.error || failure.message || 'Unable to load report. Please retry.');
      return false;
    } finally { if (current === generation.current) setLoading(false); }
  }, [params]);
  useEffect(() => { fetchReport(); return () => { generation.current += 1; }; }, [fetchReport]);
  const stats = analytics?.summary || {};
  const approved = stats.approved || 0;
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
  const uniqueCategories = useMemo(() => {
    if (selectedMemberType === 'Student') {
      return ['NPTEL'];
    }
    const fromBackend = (dashboardAnalytics?.byCategory || []).map(item => item._id).filter(Boolean);
    const fromReport = (analytics?.byCategory || []).map(item => item._id).filter(Boolean);
    const combined = [...new Set([...fromBackend, ...fromReport])];
    if (selectedMemberType === 'Faculty') {
      return [...new Set(['NPTEL', 'FDP', 'Conference', 'Workshop', ...combined])];
    }
    return [...new Set(['NPTEL', 'FDP', 'Conference', 'Workshop', ...combined])];
  }, [selectedMemberType, dashboardAnalytics, analytics]);

  const handleMemberTypeChange = useCallback((newType) => {
    setSelectedMemberType(newType);
    if (newType === 'Student' && selectedCategory !== 'All' && selectedCategory !== 'NPTEL') {
      setSelectedCategory('All');
    }
  }, [selectedCategory]);

  const uniqueStatuses = ['Under HOD', 'Under Principal', 'Approved', 'Reimbursed', 'Rejected'];
  const details = useMemo(() => allRequests.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (selectedMemberType !== 'All') {
      if (selectedMemberType === 'Faculty' && item.applicantType === 'Student') return false;
      if (selectedMemberType === 'Student' && item.applicantType !== 'Student') return false;
    }
    if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
    const date = item.submittedDate || item.createdAt?.slice(0, 10);
    if (selectedDateRange.startDate && date < selectedDateRange.startDate) return false;
    if (selectedDateRange.endDate && date > selectedDateRange.endDate) return false;

    return true;
  }), [allRequests, selectedCategory, selectedMemberType, selectedStatus, selectedDateRange ]);
  useEffect(() => {
    if (!printRequested) return;
    document.body.classList.add('hod-report-print');
    const cleanup = () => { document.body.classList.remove('hod-report-print'); setPrintRequested(false); };
    window.addEventListener('afterprint', cleanup);
    const fallback = window.setTimeout(cleanup, 120000);
    const frame = window.requestAnimationFrame(() => window.print());
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(fallback);
      window.removeEventListener('afterprint', cleanup); document.body.classList.remove('hod-report-print'); };
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">All authorized requests matching the report filters.</p>
        </div>
        <button
          type="button"
          disabled={loading || !!error || !analytics}
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-40"
        >
          <Download size={16} />
          Export Report
        </button>
      </header>

      <FilterBar
        onDateRangeChange={setSelectedDateRange}
        onCategoryChange={setSelectedCategory}
        onMemberTypeChange={handleMemberTypeChange}
        onStatusChange={setSelectedStatus}
        onExport={handleExport}
        onRefresh={handleRefresh}
        categories={uniqueCategories}
        statuses={uniqueStatuses}
        currentCategory={selectedCategory}
        currentMemberType={selectedMemberType}
        currentStatus={selectedStatus}
        currentDateRange={selectedDateRange}
      />

      {loading && <p role="status" className="text-sm text-gray-500">Loading report aggregates...</p>}
      {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"><p>{error}</p><button type="button" className="underline font-semibold mt-1" onClick={fetchReport}>Retry report</button></div>}

      {!loading && !error && analytics && <>
        {/* Top 4 Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map(card => <StatCard key={card.title} {...card} />)}
        </div>

        {/* 2 Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ReportLineChart data={monthly} title="Monthly submissions and reimbursed amounts" height={350} />
          <ReportPieChart data={statuses} title="Status Distribution" height={350} />
        </div>

        {/* Category Breakdown & Processing Outcomes in Balanced 2-Column Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Category Breakdown */}
          <section className="rounded-xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                  <Layers size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">Category Breakdown</h2>
                  <p className="text-xs text-gray-500">Department claims by category</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
              </span>
            </div>

            {categories.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No category claims recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/70">
                      <th className="py-2.5 px-3 rounded-l-md">Category</th>
                      <th className="py-2.5 px-3 text-center">Requests</th>
                      <th className="py-2.5 px-3 text-right rounded-r-md">Reimbursed amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {categories.map(item => (
                      <tr key={item._id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 font-medium text-gray-900">
                            <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                            <span>{item._id}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {item.count}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-gray-900">
                          {money(item.reimbursedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Processing Outcomes & Department Efficiency */}
          <section className="rounded-xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">Processing Outcomes</h2>
                    <p className="text-xs text-gray-500">Department turnaround quality and decision metrics</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {/* Approval Rate */}
                <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Approval Rate</span>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-emerald-900">{approvalRate}%</div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Completed reviews</p>
                  </div>
                </div>

                {/* Rejected Requests */}
                <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-rose-800 uppercase tracking-wide">Rejected</span>
                    <XCircle size={16} className="text-rose-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-rose-900">{stats.rejected || 0}</div>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      {stats.rejected ? 'Claims declined' : 'Zero rejections'}
                    </p>
                  </div>
                </div>

                {/* Average Completed Reimbursement */}
                <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Avg. Claim</span>
                    <IndianRupee size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-purple-900">
                      {money(stats.reimbursed ? Math.round((stats.reimbursedAmount || 0) / stats.reimbursed) : 0)}
                    </div>
                    <p className="text-[11px] text-purple-700 mt-0.5">Per approved claim</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
              <span>Department: <strong className="text-gray-700">{userProfile?.department || 'Current Department'}</strong></span>
              <span>Total Reimbursed: <strong className="text-gray-900">{money(stats.reimbursedAmount)}</strong></span>
            </div>
          </section>
        </div>
      </>}
    </div>
    {printRequested && (() => {
      const getPeriodText = () => {
        if (selectedDateRange.startDate && selectedDateRange.endDate) {
          const s = new Date(`${selectedDateRange.startDate}T00:00:00Z`);
          const e = new Date(`${selectedDateRange.endDate}T00:00:00Z`);
          if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
            const sMonth = s.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
            const eMonth = e.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
            if (sMonth === eMonth) return sMonth;
            return `${sMonth} - ${eMonth}`;
          }
          return `${selectedDateRange.startDate} to ${selectedDateRange.endDate}`;
        }
        if (selectedDateRange.startDate) {
          const s = new Date(`${selectedDateRange.startDate}T00:00:00Z`);
          return isNaN(s.getTime()) ? `From ${selectedDateRange.startDate}` : `From ${s.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
        }
        if (selectedDateRange.endDate) {
          const e = new Date(`${selectedDateRange.endDate}T00:00:00Z`);
          return isNaN(e.getTime()) ? `Up to ${selectedDateRange.endDate}` : `Up to ${e.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
        }
        if (reportRecords && reportRecords.length > 0) {
          const recordMonths = new Set();
          reportRecords.forEach(r => {
            const dateStr = r.submittedDate || r.createdAt;
            if (dateStr) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                recordMonths.add(d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
              }
            }
          });
          if (recordMonths.size === 1) {
            return Array.from(recordMonths)[0];
          }
        }
        return new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      };

      const periodText = getPeriodText();
      const isNptel = reportRecords.length > 0 && reportRecords.every(r => String(r.reimbursementType || r.category || '').toUpperCase() === 'NPTEL');
      const categoryTitle = selectedCategory !== 'All'
        ? selectedCategory
        : (isNptel ? 'NPTEL' : '');
      const reportTitle = categoryTitle
        ? `${categoryTitle} reimbursement details for ${periodText}`
        : `Reimbursement details for ${periodText}`;
      const courseColumnHeader = (selectedCategory === 'NPTEL' || categoryTitle === 'NPTEL')
        ? 'Nptel course name'
        : selectedCategory !== 'All'
          ? `${selectedCategory} course name`
          : 'Nptel course name';
      const departmentName = userProfile?.department || user?.department || '';
      const hodSignatureName = userProfile?.fullName || user?.fullName || user?.name || 'HoD';
      const principalSignatureName = 'Dr. Uttam D. Kolekar';

      return (
        <div className="hod-print-root aggregate-report-print">
          <style>{`
            @media screen {
              .aggregate-report-print {
                display: none !important;
              }
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm 16mm;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body.hod-report-print * {
                visibility: hidden;
              }
              body.hod-report-print .aggregate-report-print,
              body.hod-report-print .aggregate-report-print * {
                visibility: visible;
              }
              .aggregate-report-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                box-sizing: border-box;
                padding: 6mm 14mm 16mm 14mm;
                background: #fff !important;
                color: #000 !important;
                font-family: 'Times New Roman', Times, serif;
              }
            }
          `}</style>

          {/* Official Institutional Letterhead */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ width: '85px', textAlign: 'center', flexShrink: 0 }}>
              <img src={apshahLogo} alt="APSIT Logo" style={{ width: '80px', height: 'auto', maxHeight: '95px', objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
              <div style={{ fontSize: '13pt', fontWeight: 'bold', letterSpacing: '0.5px', color: '#000', textTransform: 'uppercase' }}>
                PARSHVANATH CHARITABLE TRUST'S
              </div>
              <div style={{ fontSize: '16pt', fontWeight: 'bold', marginTop: '3px', letterSpacing: '0.5px', color: '#000', textTransform: 'uppercase' }}>
                A. P. SHAH INSTITUTE OF TECHNOLOGY
              </div>
              {departmentName ? (
                <div style={{ fontSize: '13pt', fontWeight: 'bold', marginTop: '4px', color: '#000' }}>
                  Department of {departmentName}
                </div>
              ) : null}
              <div style={{ fontSize: '11pt', fontStyle: 'italic', marginTop: '3px', color: '#000' }}>
                (NBA Accredited)
              </div>
            </div>
            <div style={{ width: '85px', textAlign: 'center', flexShrink: 0 }}>
              <img src={apshahLogo} alt="APSIT Logo" style={{ width: '80px', height: 'auto', maxHeight: '95px', objectFit: 'contain' }} />
            </div>
          </div>

          {/* Report Title */}
          <div style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 'bold', margin: '24px 0 16px 0', color: '#000' }}>
            {reportTitle}
          </div>

          {/* Report Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid black', color: '#000', fontFamily: 'Times New Roman, serif' }}>
            <thead>
              <tr style={{ height: '40px', backgroundColor: '#fff' }}>
                <th style={{ border: '1.5px solid black', padding: '8px 4px', textAlign: 'center', width: '8%', fontWeight: 'bold', fontSize: '11pt' }}>Sr. No</th>
                <th style={{ border: '1.5px solid black', padding: '8px 12px', textAlign: 'left', width: '32%', fontWeight: 'bold', fontSize: '11pt' }}>Name of applicant</th>
                <th style={{ border: '1.5px solid black', padding: '8px 12px', textAlign: 'left', width: '36%', fontWeight: 'bold', fontSize: '11pt' }}>{courseColumnHeader}</th>
                <th style={{ border: '1.5px solid black', padding: '8px 4px', textAlign: 'center', width: '10%', fontWeight: 'bold', fontSize: '11pt' }}>Score</th>
                <th style={{ border: '1.5px solid black', padding: '6px 4px', textAlign: 'center', width: '14%', fontWeight: 'bold', fontSize: '11pt', lineHeight: '1.2' }}>
                  <div>Amount</div>
                  <div>in Rs.</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {reportRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ border: '1.5px solid black', textAlign: 'center', padding: '24px', fontStyle: 'italic', color: '#555', fontSize: '11pt' }}>
                    No reimbursement records found matching the selected filters.
                  </td>
                </tr>
              ) : (
                reportRecords.map((item, index) => {
                  const rawAmount = item.amountNum !== undefined ? item.amountNum : (typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount || '0').replace(/[^0-9.]/g, '')) || 0);
                  return (
                    <tr key={item._id || item.id || index} style={{ height: '36px', pageBreakInside: 'avoid' }}>
                      <td style={{ border: '1.5px solid black', padding: '6px 4px', textAlign: 'center', fontSize: '11pt' }}>{index + 1}</td>
                      <td style={{ border: '1.5px solid black', padding: '6px 12px', textAlign: 'left', fontSize: '11pt' }}>{item.name || item.applicantName || 'N/A'}</td>
                      <td style={{ border: '1.5px solid black', padding: '6px 12px', textAlign: 'left', fontSize: '11pt' }}>{item.courseName || item.remarks || item.reimbursementType || item.category || 'N/A'}</td>
                      <td style={{ border: '1.5px solid black', padding: '6px 4px', textAlign: 'center', fontSize: '11pt' }}>{item.marks !== undefined && item.marks !== null && item.marks !== 'N/A' && item.marks !== '' ? item.marks : (item.score || '-')}</td>
                      <td style={{ border: '1.5px solid black', padding: '6px 8px', textAlign: 'center', fontSize: '11pt' }}>{rawAmount}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Signature Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '65px', padding: '0 4px', pageBreakInside: 'avoid', fontFamily: 'Times New Roman, serif' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt', color: '#000' }}>{hodSignatureName}</div>
              <div style={{ fontSize: '11pt', marginTop: '4px', color: '#000' }}>HoD{departmentName ? `, ${departmentName}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', fontSize: '12pt', color: '#000' }}>{principalSignatureName}</div>
              <div style={{ fontSize: '11pt', marginTop: '4px', color: '#000' }}>Principal</div>
            </div>
          </div>
        </div>
      );
    })()}
  </>;
};
export default ReportsAndAnalytics;
