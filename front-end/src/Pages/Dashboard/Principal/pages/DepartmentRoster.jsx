import Pagination from '../../../../components/Pagination'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Download, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { userAPI } from '../../../../services/api';
import { serializeCsv } from '../../../../utils/csv';
import { normalizeDepartment } from '../../../../utils/departmentNormalization';

const DepartmentRoster = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [role, setRole] = useState('All');
  const [page, setPage] = useState(1);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError(null);
    try {
      const data = await userAPI.getAllUsers();
      if (current !== generation.current) return;
      const records = data.staff || data.users || (Array.isArray(data) ? data : []);
      setUsers(records.filter(user => user.role !== 'Student').map(user => ({ ...user,
        department: normalizeDepartment(user.department) || 'Unassigned',
      })));
      setPage(1);
    } catch (failure) {
      if (current === generation.current) setError(failure.error || failure.message || 'Unable to load staff roster.');
    } finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { refresh(); return () => { generation.current += 1; }; }, [refresh]);
  const departments = useMemo(() => [...new Set(users.map(user => user.department))].sort(), [users]);
  const roles = useMemo(() => [...new Set(users.map(user => user.role).filter(Boolean))].sort(), [users]);
  const filtered = useMemo(() => users.filter(user => {
    const query = search.toLowerCase();
    return (department === 'All' || user.department === department) && (role === 'All' || user.role === role) &&
      (!query || [user.name, user.username, user.email, user.department, user.role].some(value => String(value || '').toLowerCase().includes(query)));
  }), [users, search, department, role]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 25));
  const pageNumber = Math.min(page, totalPages);
  const rows = filtered.slice((pageNumber - 1) * 25, pageNumber * 25);
  const exportRoster = () => {
    if (!filtered.length) { toast.error('No staff members to export.'); return; }
    const csvRows = [['Name', 'Email', 'Department', 'Role', 'Active', 'Join Date'], ...filtered.map(user => [
      user.name || user.username, user.email, user.department, user.role,
      user.is_active === false ? 'No' : 'Yes', user.created_at || user.createdAt || '',
    ])];
    const blob = new Blob(['\uFEFF', serializeCsv(csvRows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'department_staff_roster.csv'; document.body.appendChild(link);
    link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><Users />Department staff roster</h1><p>Registered staff accounts across departments.</p><p className="mt-2 text-sm text-gray-600">Student enrollment and Google student account totals are not available from the staff directory.</p></div>
      <div className="flex gap-3"><button type="button" disabled={loading} onClick={refresh} className="rounded border px-3 py-2 disabled:opacity-40">Refresh</button><button type="button" disabled={loading || !!error || !filtered.length} onClick={exportRoster} className="flex items-center gap-2 rounded bg-green-600 px-3 py-2 text-white disabled:opacity-40"><Download size={16} />Export staff</button></div></header>
    {loading && <p role="status">Loading staff roster...</p>}
    {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-4"><p>{error}</p><button type="button" onClick={refresh} className="underline">Retry roster</button></div>}
    {!loading && !error && <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[
        ['Registered staff', users.length], ['Active staff', users.filter(user => user.is_active !== false).length],
        ['Teaching staff', users.filter(user => ['Faculty', 'Coordinator', 'HOD'].includes(user.role)).length], ['Departments represented', departments.length],
      ].map(([label, value]) => <div key={label} className="rounded border bg-white p-4"><p className="text-2xl font-bold">{value}</p><p>{label}</p></div>)}</div>
      <div className="flex flex-wrap gap-4 rounded border bg-white p-4"><label>Search staff<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="ml-2 rounded border p-2" /></label>
        <label>Department<select value={department} onChange={event => { setDepartment(event.target.value); setPage(1); }} className="ml-2 rounded border p-2"><option value="All">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Role<select value={role} onChange={event => { setRole(event.target.value); setPage(1); }} className="ml-2 rounded border p-2"><option value="All">All roles</option>{roles.map(value => <option key={value}>{value}</option>)}</select></label></div>
      <div className="overflow-x-auto rounded border bg-white"><table className="min-w-full"><thead><tr>{['Name', 'Email', 'Department', 'Role', 'Status'].map(label => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{rows.map(user => <tr key={user.id || user._id || user.email} className="border-t"><td className="p-3">{user.name || user.username || 'Not provided'}</td><td className="p-3">{user.email || 'Not provided'}</td><td className="p-3">{user.department}</td><td className="p-3">{user.role}</td><td className="p-3">{user.is_active === false ? 'Inactive' : 'Active'}</td></tr>)}</tbody></table>{!rows.length && <p className="p-4">No matching staff accounts.</p>}</div>
      <Pagination page={pageNumber} totalPages={totalPages} total={filtered.length} pageSize={25} noun="staff accounts" busy={false} onPageChange={setPage} />
    </>}
  </div>;
};
export default DepartmentRoster;
