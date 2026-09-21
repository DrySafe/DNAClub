import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabaseClient'
import { ShieldCheck, UserCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [isManagerTab, setIsManagerTab] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw new Error('E-mail ou palavra-passe incorretos.')

      // Procura o perfil no Supabase para redirecionar corretamente
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        throw new Error('Perfil de utilizador não encontrado.')
      }

      // Redireciona com base no perfil (role)
      if (profile.role === 'admin' || profile.role === 'financeiro') {
        navigate('/gerente')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo / Header */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 mb-4">
          <span className="font-extrabold text-2xl tracking-wider">DNA</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Clube DNA Depilamor
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Aceda à sua conta para gerir os seus benefícios e indicações
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100">
          
          {/* Tabs de Seleção de Perfil */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setIsManagerTab(false); setErrorMessage(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                !isManagerTab
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Revendedora
            </button>
            <button
              type="button"
              onClick={() => { setIsManagerTab(true); setErrorMessage(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                isManagerTab
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Gestão / Admin
            </button>
          </div>

          {/* Alerta de Erro */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário de Autenticação */}
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isManagerTab ? "admin@depilamor.com.br" : "seu@email.com"}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Palavra-passe
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-rose-500 focus:ring-rose-400 mr-2" />
                Lembrar-me
              </label>
              <a href="#" className="font-semibold text-rose-600 hover:text-rose-700">
                Esqueceu a palavra-passe?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white shadow-lg transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                isManagerTab
                  ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Entrar na Plataforma
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
        
        {/* Footer Auxiliar */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Ainda não faz parte do clube? Contacte o suporte da Depilamor.
        </p>
      </div>
    </div>
  )
}