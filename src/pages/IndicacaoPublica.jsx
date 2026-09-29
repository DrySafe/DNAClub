import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabaseClient.js'
import { Sparkles, CheckCircle2, Gift, ArrowRight } from 'lucide-react'

export default function IndicacaoPublica() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const referralCode = searchParams.get('ref') || ''

  const [referrer, setReferrer] = useState(null)
  const [loadingReferrer, setLoadingReferrer] = useState(true)

  const [formData, setFormData] = useState({
    full_name: '',
    cpf_cnpj: '',
    email: '',
    phone: '',
    password: ''
  })

  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (referralCode) {
      fetchReferrerInfo()
    } else {
      setLoadingReferrer(false)
    }
  }, [referralCode])

  useEffect(() => {
    let timer
    if (submitted) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            navigate('/dashboard')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [submitted, navigate])

  async function fetchReferrerInfo() {
    setLoadingReferrer(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, level, referral_code')
        .eq('referral_code', referralCode)
        .single()

      if (error) throw error
      setReferrer(data)
    } catch (err) {
      console.error('Revendedora não encontrada:', err.message)
      setReferrer(null)
    } finally {
      setLoadingReferrer(false)
    }
  }

  async function fetchClientSales() {
  const activeUserId = profile?.id
  if (!activeUserId) return

  try {
    const { data, error } = await supabase
      .from('sales')
      .select('id, order_number, volume_kg, revenue_brl, status, created_at')
      .eq('cliente_id', activeUserId)
      .order('created_at', { ascending: false })

    if (error) throw error
    setClientSales(data || [])
  } catch (err) {
    console.error('Erro ao carregar histórico do cliente:', err.message)
  }
}

  async function handleSubmit(e) {
  e.preventDefault()
  setSubmitting(true)
  setStatusMessage({ type: '', text: '' })

  try {
    // 1. Cria o utilizador no Supabase Auth com e-mail e senha definidos pelo cliente
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (authError) throw authError

    if (authData?.user) {
      // 2. Cria o perfil do cliente na tabela profiles com role 'cliente'
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: formData.full_name,
        cpf_cnpj: formData.cpf_cnpj,
        phone: formData.phone,
        role: 'cliente',
        level: 'DNA Profissional'
      })

      if (profileError) throw profileError

      // 3. Se houver revendedora vinculada pelo link ref, cria a indicação em 'referrals'
      if (referrer?.id) {
        const { error: refError } = await supabase.from('referrals').insert({
          referrer_id: referrer.id,
          referred_id: authData.user.id,
          referrer_level_at_creation: referrer.level || 'DNA Profissional',
          status: 'pending'
        })

        if (refError) throw refError
      }

      setSubmitted(true)
    }
  } catch (err) {
    setStatusMessage({ type: 'error', text: 'Erro ao cadastrar indicação: ' + err.message })
  } finally {
    setSubmitting(false)
  }
}

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Clube DNA Depilamor
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Você recebeu uma indicação especial!</h1>
          <p className="text-xs text-slate-400">
            Cadastre-se para garantir seu desconto exclusivo no primeiro pedido
          </p>
        </div>

        {loadingReferrer ? (
          <div className="bg-slate-800/80 p-4 rounded-2xl animate-pulse text-center text-xs text-slate-400">
            Validando código de indicação...
          </div>
        ) : referrer ? (
          <div className="bg-gradient-to-r from-rose-900/40 via-slate-800 to-slate-800 border border-rose-500/30 p-4 rounded-3xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-rose-500 text-white rounded-2xl">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-rose-300 tracking-wider">
                Indicada por
              </span>
              <span className="font-black text-sm text-white">
                {referrer.full_name}
              </span>
              <span className="block text-[11px] text-slate-400 font-mono">
                Código: {referrer.referral_code}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-300 text-center">
            Código de indicação não informado ou não encontrado, mas você ainda pode se cadastrar normalmente!
          </div>
        )}

        <div className="bg-slate-800/90 border border-slate-700/80 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-4">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-white">Cadastro Realizado com Sucesso!</h2>
              <p className="text-xs text-slate-300">
                Seu desconto foi vinculado! Redirecionando para seu painel em:
              </p>
              <div className="py-2">
                <span className="text-3xl font-black text-rose-500 font-mono bg-rose-500/10 px-4 py-2 rounded-2xl border border-rose-500/20 inline-block">
                  {countdown}s
                </span>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95"
              >
                Acessar Meu Painel Agora
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {statusMessage.text && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl font-bold">
                  {statusMessage.text}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Ex: Maria Silva"
                  className="w-full p-3 bg-slate-900/80 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  required
                  value={formData.cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  placeholder="Apenas números"
                  className="w-full p-3 bg-slate-900/80 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 90000-0000"
                  className="w-full p-3 bg-slate-900/80 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full p-3 bg-slate-900/80 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Criar Senha de Acesso</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full p-3 bg-slate-900/80 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-rose-500/20 active:scale-95 disabled:opacity-50 pt-2"
              >
                {submitting ? 'Cadastrando...' : 'Garantir Meu Desconto e Criar Conta'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
