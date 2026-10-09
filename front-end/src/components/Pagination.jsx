import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page = 1, totalPages = 1, total, pageSize, noun = 'results', onPageChange, busy = false, label = 'Result pages' }) {
  const pages = Math.max(1, Number(totalPages) || 1);
  const current = Math.max(1, Math.min(pages, Number(page) || 1));
  const numbered = [...new Set([1, current - 1, current, current + 1, pages].filter(value => value >= 1 && value <= pages))].sort((a,b) => a-b);
  const button = 'inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-40';
  const summary = total === 0 ? `No ${noun}` : total != null && pageSize ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} of ${total} ${noun}` : total != null ? `${total} ${noun}` : `Page ${current} of ${pages}`;
  return <nav aria-label={label} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
    <p className="text-sm text-slate-600" aria-live="polite">{summary}<span className="block text-xs">Page {current} of {pages}</span></p>
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={button} disabled={busy || current === 1} onClick={() => onPageChange(current - 1)}><ChevronLeft size={16} aria-hidden="true" />Previous</button>
      {numbered.map((value, index) => <span key={value} className="hidden sm:contents">{index > 0 && value - numbered[index - 1] > 1 && <span className="px-1 text-slate-500" aria-hidden="true">…</span>}
        <button type="button" aria-label={`Go to page ${value}`} aria-current={current === value ? 'page' : undefined} disabled={busy} onClick={() => onPageChange(value)} className={`${button} ${current === value ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : ''}`}>{value}</button></span>)}
      <button type="button" className={button} disabled={busy || current === pages} onClick={() => onPageChange(current + 1)}>Next<ChevronRight size={16} aria-hidden="true" /></button>
    </div>
  </nav>;
}
