import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { ShieldCheck, LogOut, Users, CheckCircle, Package } from 'lucide-react'

export default function DashboardGerente() {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header Admin */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm">Painel do Gerente</h1>
            <p className="text-xs text-slate-400">{profile?.full_name || 'Administrador'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Revendedores</p>
              <h3 className="text-xl font-extrabold text-slate-900">Módulos Ativos</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Validações</p>
              <h3 className="text-xl font-extrabold text-slate-900">Indicações</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Premiações</p>
              <h3 className="text-xl font-extrabold text-slate-900">Kits e Placas</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center py-12">
          <h2 className="text-lg font-bold text-slate-800">Painel Administrativo Carregado</h2>
          <p className="text-xs text-slate-500 mt-1">Sua estrutura de rotas e autenticação está 100% operacional no Vercel.</p>
        </div>
      </main>
    </div>
  )
}