export default function MobileTableSort({ fields, sort, onSort }) {
  return <div className="mobile-table-sort">
    <label className="flex-1 min-w-0 text-sm text-slate-600">Sort by
      <select aria-label="Sort records by" value={sort.key || ''} onChange={event => onSort(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
        <option value="" disabled>Choose field</option>
        {fields.map(field => <option key={field.key} value={field.key}>{field.label}</option>)}
      </select>
    </label>
    <button type="button" disabled={!sort.key} onClick={() => onSort(sort.key)} aria-label={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 disabled:opacity-40">{sort.direction === 'asc' ? 'Ascending ↑' : 'Descending ↓'}</button>
  </div>;
}
