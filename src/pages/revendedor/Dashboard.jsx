import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../config/supabaseClient.js'
import { 
  LogOut, Award, Sparkles, Trophy, Copy, Check, 
  Share2, MessageCircle, Users, Clock, CheckCircle2, XCircle,
  PlusCircle, ShoppingBag, Zap, RefreshCw
} from 'lucide-react'

export default function DashboardRevendedor() {
  const { profile, logout } = useAuth()
  
  // Listas de dados
  const [referrals, setReferrals] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [referralFilter, setReferralFilter] = useState('all')

  // Modal para informar compra
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)
  const [saleForm, setSaleForm] = useState({ order_number: '', volume_kg: '', revenue_brl: '' })
  const [saleMessage, setSaleMessage] = useState({ type: '', text: '' })

  // Dados do perfil (com fallback para exibição)
  const userLevel = profile?.level || 'DNA Profissional'
  const currentKg = profile?.total_volume_kg || 0
  const currentBrl = profile?.total_revenue_brl || 0
  const referralCode = profile?.referral_code || 'DNA-REV'

  // Regras e Metas por Nível
  const levelConfigs = {
    'DNA Profissional': {
      nextLevel: 'DNA Referência',
      targetKg: 151,
      targetBrl: 8000,
      badgeColor: 'from-slate-700 to-slate-900 border-slate-600 text-slate-100',
      discReferrer: '3%',
      discReferred: '1%'
    },
    'DNA Referência': {
      nextLevel: 'DNA Master',
      targetKg: 200,
      targetBrl: 15000,
      badgeColor: 'from-blue-800 to-indigo-950 border-blue-700 text-blue-100',
      discReferrer: '4%',
      discReferred: '1%'
    },
    'DNA Master': {
      nextLevel: 'DNA MOR',
      targetKg: 301,
      targetBrl: 25000,
      badgeColor: 'from-amber-800 to-amber-950 border-amber-700 text-amber-100',
      discReferrer: '6%',
      discReferred: '2%'
    },
    'DNA MOR': {
      nextLevel: 'Nível Máximo Atingido!',
      targetKg: 300,
      targetBrl: 25000,
      badgeColor: 'from-rose-800 to-pink-950 border-rose-700 text-rose-100',
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
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [profile])

  async function fetchDashboardData() {
    setLoading(true)
    await Promise.all([fetchReferrals(), fetchSales()])
    setLoading(false)
  }

  async function fetchReferrals() {
    try {
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
    }
  }

  async function fetchSales() {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('revendedor_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (err) {
      console.error('Erro ao carregar histórico de compras:', err.message)
    }
  }

  // Registrar nova compra realizada pela revendedora
  async function handleRegisterSale(e) {
    e.preventDefault()
    setSaleMessage({ type: '', text: '' })

    try {
      const { error } = await supabase.from('sales').insert({
        revendedor_id: profile.id,
        order_number: saleForm.order_number,
        volume_kg: parseFloat(saleForm.volume_kg),
        revenue_brl: parseFloat(saleForm.revenue_brl),
        status: 'pending' // Fica pendente para validação do financeiro
      })

      if (error) throw error

      setSaleMessage({ 
        type: 'success', 
        text: 'Compra informada com sucesso! Aguardando validação da equipe financeira.' 
      })
      setSaleForm({ order_number: '', volume_kg: '', revenue_brl: '' })
      setIsNewSaleOpen(false)
      fetchSales()
    } catch (err) {
      setSaleMessage({ type: 'error', text: 'Erro ao registrar compra: ' + err.message })
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
    if (referralFilter === 'all') return true
    return item.status === referralFilter
  })

  const statusBadges = {
    pending: { label: 'Pendente', icon: Clock, style: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'Aprovada', icon: CheckCircle2, style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejeitada', icon: XCircle, style: 'bg-rose-50 text-rose-700 border-rose-200' },
    invalid: { label: 'Inválida', icon: XCircle, style: 'bg-rose-50 text-rose-700 border-rose-200' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
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
              Acompanhe seu progresso semestral e informe novas compras
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão de Informar Nova Compra */}
            <button
              onClick={() => setIsNewSaleOpen(true)}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Informar Compra
            </button>

            {/* Badge do Nível */}
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

        {/* Mensagens de Ação */}
        {saleMessage.text && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg ${
            saleMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <span>{saleMessage.text}</span>
            <button onClick={() => setSaleMessage({ type: '', text: '' })} className="underline font-black">Fechar</button>
          </div>
        )}

        {/* 2. Termômetro de Metas Semestrais */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Progresso Semestral</h3>
                <p className="text-xs text-slate-500">Métricas acumuladas a partir de compras validadas</p>
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
                <span>Volume Total: <strong className="text-rose-600 font-black">{currentKg} kg</strong></span>
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
                <span>Faturamento: <strong className="text-emerald-600 font-black">R$ {Number(currentBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
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

        {/* 3. Tabela do Histórico de Compras/Pedidos Informados */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Histórico de Compras Informadas</h3>
                <p className="text-xs text-slate-500">Acompanhe a validação dos seus lançamentos de compras pelo financeiro</p>
              </div>
            </div>
            <button onClick={fetchSales} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl" title="Atualizar">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-2">Nº do Pedido</th>
                  <th className="py-3 px-2">Data do Lançamento</th>
                  <th className="py-3 px-2">Volume (kg)</th>
                  <th className="py-3 px-2">Valor (R$)</th>
                  <th className="py-3 px-2 text-right">Status da Validação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Nenhuma compra informada ainda. Clique em "Informar Compra" acima para lançar seu pedido.
                    </td>
                  </tr>
                ) : (
                  sales.map((item) => {
                    const BadgeIcon = statusBadges[item.status]?.icon || Clock
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-2 font-mono font-bold text-slate-800">{item.order_number || '---'}</td>
                        <td className="py-3.5 px-2 text-slate-500">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3.5 px-2 font-bold text-rose-600">{item.volume_kg} kg</td>
                        <td className="py-3.5 px-2 font-bold text-emerald-600">R$ {Number(item.revenue_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-2 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-black ${statusBadges[item.status]?.style}`}>
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

        {/* 4. Banner Indique e Ganhe */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-700/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                <Share2 className="w-3.5 h-3.5" />
                Programa Indique e Ganhe
              </div>
              <h3 className="text-xl font-black">Indique Novas Clientes e Ganhe Descontos</h3>
              <p className="text-slate-300 text-xs max-w-xl">
                Sua categoria <strong className="text-rose-400 font-extrabold">{userLevel}</strong> garante <strong className="text-white font-black">{currentConfig.discReferrer}</strong> de desconto no seu próximo pedido e <strong className="text-white font-black">{currentConfig.discReferred}</strong> para a nova cliente no primeiro pedido.
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

        {/* 5. Tabela do Histórico de Indicações */}
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
                  onClick={() => setReferralFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                    referralFilter === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
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

      {/* MODAL: INFORMAR COMPRA/PEDIDO */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">Informar Nova Compra / Pedido</h3>
              <button 
                onClick={() => setIsNewSaleOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Digite os dados da sua compra efetuada na Depilamor. A equipe financeira irá conferir e aprovar para somar na sua meta semestral.
            </p>

            <form onSubmit={handleRegisterSale} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nº do Pedido / Nota Fiscal</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PED-1042"
                  value={saleForm.order_number}
                  onChange={(e) => setSaleForm({ ...saleForm, order_number: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume em Quilos (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 12.5"
                    value={saleForm.volume_kg}
                    onChange={(e) => setSaleForm({ ...saleForm, volume_kg: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor em Reais (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 650.00"
                    value={saleForm.revenue_brl}
                    onChange={(e) => setSaleForm({ ...saleForm, revenue_brl: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewSaleOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl shadow-lg active:scale-95"
                >
                  Enviar para Análise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}