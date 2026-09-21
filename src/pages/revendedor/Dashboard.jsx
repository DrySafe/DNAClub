import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../config/supabaseClient.js'
import { 
  LogOut, Award, Sparkles, Trophy, Copy, Check, 
  Share2, MessageCircle, Users, Clock, CheckCircle2, XCircle,
  HelpCircle, ChevronRight, Zap
} from 'lucide-react'

export default function DashboardRevendedor() {
  const { profile, logout } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('all')

  // Se o perfil do banco não tiver dados ainda, usa valores padrão para exibição visual
  const userLevel = profile?.level || 'DNA Profissional'
  const currentKg = profile?.total_volume_kg || 120
  const currentBrl = profile?.total_revenue_brl || 5400
  const referralCode = profile?.referral_code || 'DNA-REV123'

  // Configuração dos Níveis do Regulamento
  const levelConfigs = {
    'DNA Profissional': {
      nextLevel: 'DNA Referência',
      targetKg: 151,
      targetBrl: 8000,
      badgeColor: 'from-slate-700 to-slate-900 border-slate-600 text-slate-100',
      tagColor: 'bg-slate-800 text-slate-200 border-slate-700',
      discReferrer: '3%',
      discReferred: '1%'
    },
    'DNA Referência': {
      nextLevel: 'DNA Master',
      targetKg: 200,
      targetBrl: 15000,
      badgeColor: 'from-blue-800 to-indigo-950 border-blue-700 text-blue-100',
      tagColor: 'bg-blue-900 text-blue-200 border-blue-800',
      discReferrer: '4%',
      discReferred: '1%'
    },
    'DNA Master': {
      nextLevel: 'DNA MOR',
      targetKg: 301,
      targetBrl: 25000,
      badgeColor: 'from-amber-800 to-amber-950 border-amber-700 text-amber-100',
      tagColor: 'bg-amber-900 text-amber-200 border-amber-800',
      discReferrer: '6%',
      discReferred: '2%'
    },
    'DNA MOR': {
      nextLevel: 'Nível Máximo Atingido!',
      targetKg: 300,
      targetBrl: 25000,
      badgeColor: 'from-rose-800 to-pink-950 border-rose-700 text-rose-100',
      tagColor: 'bg-rose-900 text-rose-200 border-rose-800',
      discReferrer: '8%',
      discReferred: '2%'
    }
  }

  const currentConfig = levelConfigs[userLevel] || levelConfigs['DNA Profissional']
  const percentKg = Math.min(100, Math.round((currentKg / currentConfig.targetKg) * 100))
  const percentBrl = Math.min(100, Math.round((currentBrl / currentConfig.targetBrl) * 100))

  const referralLink = `${window.location.origin}/indicacao?ref=${referralCode}`

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

  function handleCopy() {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(
      `Olá! Estou te indicando para comprar na Depilamor. Use meu código de indicação ${referralCode} ou acesse o link e ganhe ${currentConfig.discReferred} de desconto na sua compra: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

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
    <div className="min-h-screen bg-slate-50 pb-16 font-sans">
      
      {/* 1. Header de Status Principal */}
      <header className={`bg-gradient-to-r ${currentConfig.badgeColor} pt-8 pb-20 px-4 sm:px-6 lg:px-8 border-b transition-all shadow-xl`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Clube DNA Depilamor</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Olá, {profile?.full_name || 'Revendedora'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Gerencie suas metas semestrais e acompanhe seus cupons de indicação
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Badge Digital */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
              <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shadow-rose-500/30">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-300 tracking-wider">
                  Nível Atual
                </span>
                <span className="font-black text-base text-white">
                  {userLevel}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl transition-all active:scale-95"
              title="Encerrar Sessão"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 space-y-6">
        
        {/* 2. Termômetro de Metas Semestrais */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Progresso Semestral</h3>
                <p className="text-xs text-slate-500">Meta de compras para subida de categoria</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
              Próximo Nível: {currentConfig.nextLevel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metrica Quilos */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>Volume Total: <strong className="text-rose-600">{currentKg} kg</strong></span>
                <span className="text-slate-500">Meta: {currentConfig.targetKg} kg</span>
              </div>
              <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentKg}%` }}
                ></div>
              </div>
            </div>

            {/* Metrica Faturamento */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>Faturamento: <strong className="text-emerald-600">R$ {Number(currentBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                <span className="text-slate-500">Meta: R$ {Number(currentConfig.targetBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentBrl}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Banner Indique e Ganhe */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-700/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                <Share2 className="w-3.5 h-3.5" />
                Programa Indique e Ganhe
              </div>
              <h3 className="text-xl font-black">Indique Novas Clientes e Ganhe Descontos</h3>
              <p className="text-slate-300 text-xs max-w-xl">
                Sua categoria <strong className="text-rose-400 font-extrabold">{userLevel}</strong> garante <strong className="text-white font-black">{currentConfig.discReferrer}</strong> de desconto no seu próximo pedido e <strong className="text-white font-black">{currentConfig.discReferred}</strong> para a nova cliente no primeiro pedido[cite: 1, 2].
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Seu Código</span>
                  <span className="font-mono font-black text-rose-400 tracking-wider text-lg">{referralCode}</span>
                </div>
                <button 
                  onClick={handleCopy} 
                  className="p-2.5 bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-colors text-slate-300 hover:text-white"
                  title="Copiar Link"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <button 
                onClick={handleWhatsAppShare} 
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 font-extrabold text-slate-950 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-xs active:scale-95"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                Compartilhar no WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* 4. Tabela do Histórico de Indicações */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Suas Indicações</h3>
                <p className="text-xs text-slate-500">Histórico de indicações e validações do regulamento</p>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              {['all', 'pending', 'approved', 'invalid'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
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
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-2">Cliente Indicada</th>
                  <th className="py-3 px-2">Data do Registro</th>
                  <th className="py-3 px-2">Sua Categoria no Momento</th>
                  <th className="py-3 px-2 text-right">Status do Pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400">
                      Nenhuma indicação registrada nesta categoria ainda.
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map((item) => {
                    const BadgeIcon = statusBadges[item.status]?.icon || Clock
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-2 font-black text-slate-800">
                          {item.profiles?.full_name || 'Nova Cliente'}
                        </td>
                        <td className="py-4 px-2 text-slate-500 font-medium">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-2 text-slate-600 font-bold">
                          {item.referrer_level_at_creation}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-black ${statusBadges[item.status]?.style}`}>
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

      </main>
    </div>
  )
}