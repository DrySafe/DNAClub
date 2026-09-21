import React from 'react'

export function Badge({ children, variant = 'info', className = '' }) {
  const styles = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200"
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}