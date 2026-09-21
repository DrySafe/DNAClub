import React from 'react'

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 ${className}`}>
      {children}
    </div>
  )
}