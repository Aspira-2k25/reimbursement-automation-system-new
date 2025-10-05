import React from "react"

export default function InfoTipBox() {
  const title = "Faculty Tip"
  const message = "Submit FDP certificates and research documentation within 7 days of submission to ensure faster processing."
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm" style={{backgroundColor: 'var(--color-light-teal)', border: '1px solid var(--color-medium-teal)'}}>
      <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, var(--color-light-teal)/20, var(--color-medium-teal)/20)'}}></div>
      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{backgroundColor: 'var(--color-medium-teal)'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M2 12a10 10 0 1 1 20 0c0 3-2 5-4 6H6c-2-1-4-3-4-6z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold" style={{color: 'var(--color-dark-gray)'}}>{title}</span>
              <div className="h-1 w-1 rounded-full" style={{backgroundColor: 'var(--color-dark-gray)'}}></div>
              <span className="text-sm" style={{color: 'var(--color-dark-gray)'}}>Faculty Pro Tip</span>
            </div>
            <p className="leading-relaxed" style={{color: 'var(--color-dark-gray)'}}>{message}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{backgroundColor: 'var(--color-medium-teal)'}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
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