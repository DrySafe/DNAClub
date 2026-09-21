import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../config/supabaseClient.js'
import { 
  LogOut, Award, Sparkles, Trophy, Copy, Check, 
  Share2, MessageCircle, Users, Clock, CheckCircle2, XCircle 
} from 'lucide-react'

// Subcomponente 1: HeaderStatus
function HeaderStatus({ profile }) {
  const { logout } = useAuth()

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

// Subcomponente 2: GoalProgress
function GoalProgress({ currentKg = 0, currentBrl = 0, currentLevel = 'DNA Profissional' }) {
  const goals = {
    'DNA Profissional': { nextLevel: 'DNA Referência', targetKg: 151, targetBrl: 8000 },
    'DNA Referência': { nextLevel: 'DNA Master', targetKg: 200, targetBrl: 15000 },
    'DNA Master': { nextLevel: 'DNA MOR', targetKg: 301, targetBrl: 25000 },
    'DNA MOR': { nextLevel: 'Nível Máximo Atingido!', targetKg: 300, targetBrl: 25000 }
  }

  const currentGoal = goals[currentLevel] || goals['DNA Profissional']
  const percentKg = Math.min(100, Math.round((currentKg / currentGoal.targetKg) * 100))
  const percentBrl = Math.min(100, Math.round((currentBrl / currentGoal.targetBrl) * 100))

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Progresso Semestral</h3>
            <p className="text-xs text-slate-500">Acompanhe as suas metas para subir de categoria</p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
          Próximo Nível: {currentGoal.nextLevel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Volume em Quilos: {currentKg} kg</span>
            <span>Meta: {currentGoal.targetKg} kg</span>
          </div>
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentKg}%` }}></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-700">
            <span>Faturamento: R$ {Number(currentBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Meta: R$ {Number(currentGoal.targetBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentBrl}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Subcomponente 3: ReferralSection
function ReferralSection({ referralCode = 'MEUCODIGO', currentLevel = 'DNA Profissional' }) {
  const [copied, setCopied] = useState(false)

  const discountRules = {
    'DNA Profissional': { referrer: '3%', referred: '1%' },
    'DNA Referência': { referrer: '4%', referred: '1%' },
    'DNA Master': { referrer: '6%', referred: '2%' },
    'DNA MOR': { referrer: '8%', referred: '2%' },
  }

  const currentRule = discountRules[currentLevel] || discountRules['DNA Profissional']
  const referralLink = `${window.location.origin}/indicacao?ref=${referralCode}`

  function handleCopy() {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(
      `Olá! Estou te indicando para comprar na Depilamor. Use meu código de indicação ${referralCode} ou acesse o link e ganhe ${currentRule.referred} de desconto na sua compra: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
            <Share2 className="w-3.5 h-3.5" />
            Programa Indique e Ganhe
          </div>
          <h3 className="text-xl font-bold">Compartilhe e Ganhe Benefícios</h3>
          <p className="text-slate-300 text-xs max-w-xl">
            Sua categoria <span className="font-bold text-rose-400">{currentLevel}</span> garante <span className="font-bold text-white">{currentRule.referrer}</span> de desconto para você e <span className="font-bold text-white">{currentRule.referred}</span> para a nova cliente indicada no primeiro pedido[cite: 1, 2].
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Seu Código</span>
              <span className="font-mono font-bold text-rose-400 tracking-wider text-base">{referralCode}</span>
            </div>
            <button onClick={handleCopy} className="p-2 hover:bg-slate-700 rounded-xl transition-colors text-slate-300 hover:text-white">
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button onClick={handleWhatsAppShare} className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-xs">
            <MessageCircle className="w-4 h-4 fill-current" />
            Enviar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

// Subcomponente 4: ReferralsTable
function ReferralsTable({ referrals = [] }) {
  const [filter, setFilter] = useState('all')

  const filteredReferrals = referrals.filter((item) => {
    if (filter === 'all') return true
    return item.status === filter
  })

  const statusBadges = {
    pending: { label: 'Pendente', icon: Clock, style: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'Aprovada', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    invalid: { label: 'Inválida', icon: XCircle, style: 'bg-rose-50 text-rose-700 border-rose-200' }
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Histórico de Indicações</h3>
            <p className="text-xs text-slate-500">Acompanhe a validação dos pedidos das suas indicadas</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          {['all', 'pending', 'approved', 'invalid'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                filter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab === 'all' ? 'Todas' : tab === 'pending' ? 'Pendentes' : tab === 'approved' ? 'Aprovadas' : 'Inválidas'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-3 px-2">Cliente Indicada</th>
              <th className="py-3 px-2">Data do Registo</th>
              <th className="py-3 px-2">Nível no Momento</th>
              <th className="py-3 px-2 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredReferrals.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-400">
                  Nenhuma indicação encontrada para este filtro.
                </td>
              </tr>
            ) : (
              filteredReferrals.map((item) => {
                const BadgeIcon = statusBadges[item.status]?.icon || Clock
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-2 font-bold text-slate-800">{item.profiles?.full_name || 'Nova Cliente'}</td>
                    <td className="py-3.5 px-2 text-slate-500">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3.5 px-2 text-slate-600 font-medium">{item.referrer_level_at_creation}</td>
                    <td className="py-3.5 px-2 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusBadges[item.status]?.style}`}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                        {statusBadges[item.status]?.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Componente Principal
export default function DashboardRevendedor() {
  const { profile, loading: authLoading } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchReferrals()
    } else {
      setLoading(false)
    }
  }, [profile])

  async function fetchReferrals() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          created_at,
          referrer_level_at_creation,
          profiles!referrals_referred_id_fkey(full_name, cpf_cnpj)
        `)
        .eq('referrer_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReferrals(data || [])
    } catch (err) {
      console.error('Erro ao carregar indicações:', err.message)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      <HeaderStatus profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">
        <GoalProgress 
          currentKg={profile?.total_volume_kg || 0} 
          currentBrl={profile?.total_revenue_brl || 0}
          currentLevel={profile?.level || 'DNA Profissional'}
        />

        <ReferralSection 
          referralCode={profile?.referral_code} 
          currentLevel={profile?.level} 
        />

        <ReferralsTable referrals={referrals} />
      </main>
    </div>
  )
}