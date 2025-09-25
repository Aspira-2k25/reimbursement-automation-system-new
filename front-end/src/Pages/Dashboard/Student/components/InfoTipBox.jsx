export default function InfoTipBox() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5"></div>
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M2 12a10 10 0 1 1 20 0c0 3-2 5-4 6H6c-2-1-4-3-4-6z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-amber-900">Student Tip</span>
              <div className="h-1 w-1 rounded-full bg-amber-400"></div>
              <span className="text-sm text-amber-700">Pro Tip</span>
            </div>
            <p className="text-amber-800 leading-relaxed">Upload clear receipts and approval letters. If your request shows 'At under Cordinator', watch notifications for any required actions.</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100/50 text-amber-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
