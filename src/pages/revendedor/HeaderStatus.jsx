import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { LogOut, Award, Shield, Sparkles } from 'lucide-react'

export default function HeaderStatus({ profile }) {
  const { logout } = useAuth()

  // Cores do selo e card com base na categoria
  const levelStyles = {
    'DNA Profissional': 'from-slate-800 to-slate-900 border-slate-700 text-slate-200',
    'DNA Referência': 'from-blue-900 to-indigo-950 border-blue-800 text-blue-200',
    'DNA Master': 'from-amber-900 to-slate-900 border-amber-800 text-amber-200',
    'DNA MOR': 'from-rose-900 to-pink-950 border-rose-800 text-rose-200'
  }

  const currentLevel = profile?.level || 'DNA Profissional'
  const currentStyle = levelStyles[currentLevel] || levelStyles['DNA Profissional']

  return (
    <header className={`bg-gradient-to-r ${currentStyle} pt-8 pb-16 px-4 sm:px-6 lg:px-8 border-b transition-all`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Identificação e Saudação */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <Sparkles className="w-4 h-4" />
            <span>Programa Revenda Depilamor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Olá, {profile?.full_name || 'Revendedora'}!
          </h1>
          <p className="text-xs text-slate-300">
            Acompanhe seus benefícios e seu crescimento semestral
          </p>
        </div>

        {/* Badge do Nível + Botão Sair */}
        <div className="flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl text-white">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                Categoria Atual
              </span>
              <span className="font-extrabold text-sm text-white">
                {currentLevel}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl transition-all"
            title="Encerrar Sessão"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

      </div>
    </header>
  )
}