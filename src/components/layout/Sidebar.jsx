import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Users, Gift, Shield } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-slate-100 min-h-screen p-4 space-y-2 hidden md:block">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        Navegação
      </div>
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
            isActive ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'
          }`
        }
      >
        <Home className="w-4 h-4" />
        Painel Principal
      </NavLink>
    </aside>
  )
}