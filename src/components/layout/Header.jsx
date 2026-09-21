import React from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { LogOut, ShieldCheck } from 'lucide-react'

export function Header() {
  const { profile, logout } = useAuth()

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white font-extrabold flex items-center justify-center shadow-md shadow-rose-500/20">
          DNA
        </div>
        <div>
          <h1 className="font-extrabold text-sm text-slate-900">Clube DNA Depilamor</h1>
          <p className="text-xs text-slate-500">{profile?.full_name || 'Usuário'}</p>
        </div>
      </div>

      <button
        onClick={logout}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </button>
    </header>
  )
}