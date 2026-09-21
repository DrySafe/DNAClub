import React from 'react'

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = "font-bold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
  
  const variants = {
    primary: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25",
    secondary: "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20",
    outline: "bg-transparent border border-slate-200 hover:bg-slate-100 text-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600"
  }

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-xs sm:text-sm",
    lg: "px-6 py-3.5 text-sm"
  }

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}