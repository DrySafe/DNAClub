import React from 'react'

export function ProgressBar({ value = 0, color = 'rose' }) {
  const colors = {
    rose: "from-rose-500 to-pink-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-yellow-500"
  }

  const percentage = Math.min(100, Math.max(0, value))

  return (
    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5">
      <div 
        className={`bg-gradient-to-r ${colors[color] || colors.rose} h-full rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}