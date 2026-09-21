import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../config/supabaseClient.js'
import { 
  Users, UserPlus, Key, ShieldCheck, CheckCircle2, XCircle, 
  Search, LogOut, RefreshCw, DollarSign, ShoppingBag, PlusCircle,
  UserCheck, ArrowRightLeft, Briefcase, User
} from 'lucide-react'

export default function DashboardGerente() {
  const { profile, logout } = useAuth()
  
  const isFinanceiro = profile?.role === 'financeiro'
  const [activeTab, setActiveTab] = useState('sales') // 'users', 'sales', 'referrals'
  const [userSubTab, setUserSubTab] = useState('revendedora') // 'revendedora', 'colaborador', 'cliente'
  
  // Listas de dados
  const [usersList, setUsersList] = useState([])
  const [referralsList, setReferralsList] = useState([])
  const [salesList, setSalesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modais
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false)
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)

  // Formulário de Novo Usuário Geral
  const [newUser, setNewUser] = useState({
    email: '', password: '', full_name: '', cpf_cnpj: '', role: 'revendedor', level: 'DNA Profissional'
  })

  // Formulário Rápido de Novo Cliente
  const [quickClient, setQuickClient] = useState({
    full_name: '', cpf_cnpj: '', email: ''
  })

  // Formulário de Lançamento de Venda
  const [newSale, setNewSale] = useState({
    revendedor_id: '', cliente_id: '', order_number: '', volume_kg: '', revenue_brl: ''
  })

  const [actionMessage, setActionMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    await Promise.all([fetchUsers(), fetchReferrals(), fetchSales()])
    setLoading(false)
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsersList(data || [])
    } catch (err) {
      console.error('Erro ao buscar usuários:', err.message)
    }
  }

  async function fetchReferrals() {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id, status, created_at, referrer_level_at_creation,
          referrer:referrer_id(full_name, referral_code),
          referred:referred_id(full_name, cpf_cnpj)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setReferralsList(data || [])
    } catch (err) {
      console.error('Erro ao buscar indicações:', err.message)
    }
  }

  async function fetchSales() {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, order_number, volume_kg, revenue_brl, status, created_at, revendedor_id, cliente_id,
          revendedor:revendedor_id(full_name, cpf_cnpj),
          cliente:cliente_id(full_name, cpf_cnpj)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setSalesList(data || [])
    } catch (err) {
      console.error('Erro ao buscar vendas:', err.message)
    }
  }

  // Alterar Perfil (Cliente <-> Revendedora)
  async function handleToggleRole(userId, currentRole) {
    const targetRole = currentRole === 'cliente' ? 'revendedor' : 'cliente'
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: targetRole })
        .eq('id', userId)

      if (error) throw error
      setActionMessage({ type: 'success', text: `Perfil alterado para ${targetRole === 'revendedor' ? 'Revendedora' : 'Cliente'} com sucesso!` })
      fetchUsers()
    } catch (err) {
      alert('Erro ao alterar perfil: ' + err.message)
    }
  }

  // Cadastrar Cliente Rápido no Modal da Venda
  async function handleCreateQuickClient(e) {
    e.preventDefault()
    try {
      const tempEmail = quickClient.email || `cliente_${Date.now()}@depilamor.com`
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: 'ClientPassword123!',
      })

      if (authError) throw authError

      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: quickClient.full_name,
          cpf_cnpj: quickClient.cpf_cnpj,
          role: 'cliente',
          level: 'DNA Profissional'
        })

        if (profileError) throw profileError

        setActionMessage({ type: 'success', text: 'Cliente cadastrado com sucesso!' })
        setIsQuickClientOpen(false)
        await fetchUsers()
        
        // Seleciona o cliente recém-criado na venda
        setNewSale(prev => ({ ...prev, cliente_id: authData.user.id }))
        setQuickClient({ full_name: '', cpf_cnpj: '', email: '' })
      }
    } catch (err) {
      alert('Erro ao cadastrar cliente rápido: ' + err.message)
    }
  }

  // Lançar Venda Direta
  async function handleCreateDirectSale(e) {
    e.preventDefault()
    try {
      const { error: saleError } = await supabase.from('sales').insert({
        revendedor_id: newSale.revendedor_id || profile.id,
        cliente_id: newSale.cliente_id || null,
        order_number: newSale.order_number,
        volume_kg: parseFloat(newSale.volume_kg),
        revenue_brl: parseFloat(newSale.revenue_brl),
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date()
      })

      if (saleError) throw saleError

      // Se for selecionada uma revendedora, soma na meta dela
      if (newSale.revendedor_id) {
        const revProfile = usersList.find(u => u.id === newSale.revendedor_id)
        const newKg = (parseFloat(revProfile?.total_volume_kg) || 0) + parseFloat(newSale.volume_kg)
        const newBrl = (parseFloat(revProfile?.total_revenue_brl) || 0) + parseFloat(newSale.revenue_brl)
        await supabase.from('profiles').update({ total_volume_kg: newKg, total_revenue_brl: newBrl }).eq('id', newSale.revendedor_id)
      }

      setActionMessage({ type: 'success', text: 'Venda lançada e processada com sucesso!' })
      setIsNewSaleOpen(false)
      setNewSale({ revendedor_id: '', cliente_id: '', order_number: '', volume_kg: '', revenue_brl: '' })
      fetchSales()
      fetchUsers()
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message })
    }
  }

  // Aprovar Venda Pendente
  async function handleApproveSale(sale) {
    try {
      const { error: saleError } = await supabase
        .from('sales')
        .update({ status: 'approved', approved_by: profile.id, approved_at: new Date() })
        .eq('id', sale.id)

      if (saleError) throw saleError

      if (sale.revendedor_id) {
        const { data: revProfile } = await supabase
          .from('profiles')
          .select('total_volume_kg, total_revenue_brl')
          .eq('id', sale.revendedor_id)
          .single()

        const newKg = (parseFloat(revProfile?.total_volume_kg) || 0) + parseFloat(sale.volume_kg)
        const newBrl = (parseFloat(revProfile?.total_revenue_brl) || 0) + parseFloat(sale.revenue_brl)

        await supabase.from('profiles').update({ total_volume_kg: newKg, total_revenue_brl: newBrl }).eq('id', sale.revendedor_id)
      }

      setActionMessage({ type: 'success', text: 'Venda aprovada com sucesso!' })
      fetchSales()
      fetchUsers()
    } catch (err) {
      alert('Erro ao aprovar venda: ' + err.message)
    }
  }

  // Filtros por Perfil
  const revendedoras = usersList.filter(u => u.role === 'revendedor')
  const colaboradores = usersList.filter(u => u.role === 'admin' || u.role === 'financeiro')
  const clientes = usersList.filter(u => u.role === 'cliente')

  const getFilteredUsers = () => {
    let list = userSubTab === 'revendedora' ? revendedoras : userSubTab === 'colaborador' ? colaboradores : clientes
    return list.filter(u => 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.cpf_cnpj?.includes(searchTerm)
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      
      {/* Header */}
      <header className="bg-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Portal de Gestão Depilamor
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Painel de Gestão & Finanças</h1>
            <p className="text-xs text-slate-400">Controle unificado de vendas, clientes, revendedoras e permissões</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewSaleOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Lançar Venda
            </button>

            {!isFinanceiro && (
              <button
                onClick={() => setIsCreateUserOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs transition-all shadow-lg active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                Novo Cadastro
              </button>
            )}

            <button onClick={logout} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all" title="Sair">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">

        {/* Abas Principais */}
        <div className="bg-white rounded-2xl p-1.5 shadow-lg border border-slate-100 inline-flex gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'sales' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Vendas & Compras ({salesList.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'users' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Gestão de Pessoas ({usersList.length})
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'referrals' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Indicações ({referralsList.length})
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {actionMessage.text && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg ${
            actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage({ type: '', text: '' })} className="underline font-black">Fechar</button>
          </div>
        )}

        {/* TAB 1: GESTÃO DE PESSOAS (Revendedoras, Colaboradores, Clientes) */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
            
            {/* Sub-abas de Categorias de Pessoas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-black">
                <button
                  onClick={() => setUserSubTab('revendedora')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    userSubTab === 'revendedora' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Revendedoras ({revendedoras.length})
                </button>

                <button
                  onClick={() => setUserSubTab('cliente')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    userSubTab === 'cliente' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Clientes ({clientes.length})
                </button>

                <button
                  onClick={() => setUserSubTab('colaborador')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    userSubTab === 'colaborador' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Colaboradores ({colaboradores.length})
                </button>
              </div>

              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-2.5 bg-slate-50 border rounded-2xl text-xs w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-2">Nome Completo</th>
                    <th className="py-3 px-2">CPF/CNPJ</th>
                    <th className="py-3 px-2">Perfil Atual</th>
                    {userSubTab === 'revendedora' && <th className="py-3 px-2">Categoria DNA</th>}
                    {userSubTab === 'revendedora' && <th className="py-3 px-2">Acumulado (kg / R$)</th>}
                    <th className="py-3 px-2 text-right">Mudar Perfil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {getFilteredUsers().length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-400">Nenhum cadastro encontrado nesta categoria.</td></tr>
                  ) : (
                    getFilteredUsers().map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-2 font-black text-slate-800">{u.full_name || 'Sem Nome'}</td>
                        <td className="py-3.5 px-2 text-slate-500 font-mono">{u.cpf_cnpj || '---'}</td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            u.role === 'revendedor' ? 'bg-rose-100 text-rose-800' :
                            u.role === 'cliente' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        {userSubTab === 'revendedora' && (
                          <td className="py-3.5 px-2 font-extrabold text-rose-600">{u.level || 'DNA Profissional'}</td>
                        )}
                        {userSubTab === 'revendedora' && (
                          <td className="py-3.5 px-2 font-bold text-slate-700">
                            {u.total_volume_kg || 0} kg / R$ {Number(u.total_revenue_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        )}
                        <td className="py-3.5 px-2 text-right">
                          {u.role !== 'admin' && u.role !== 'financeiro' && (
                            <button
                              onClick={() => handleToggleRole(u.id, u.role)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition-all"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-rose-500" />
                              {u.role === 'cliente' ? 'Mudar p/ Revendedora' : 'Mudar p/ Cliente'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VENDAS E COMPRAS */}
        {activeTab === 'sales' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-900">Histórico de Vendas & Compras</h3>
                <p className="text-xs text-slate-500">Valide os lançamentos das revendedoras ou cadastre vendas diretas</p>
              </div>
              <button onClick={fetchSales} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-2">Revendedora</th>
                    <th className="py-3 px-2">Cliente Comprador</th>
                    <th className="py-3 px-2">Nº Pedido</th>
                    <th className="py-3 px-2">Volume (kg)</th>
                    <th className="py-3 px-2">Valor (R$)</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {salesList.length === 0 ? (
                    <tr><td colSpan="7" className="py-8 text-center text-slate-400">Nenhuma venda registrada.</td></tr>
                  ) : (
                    salesList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-2 font-bold text-slate-800">{sale.revendedor?.full_name || 'Venda Direta'}</td>
                        <td className="py-3.5 px-2 font-bold text-slate-600">{sale.cliente?.full_name || 'Cliente Final'}</td>
                        <td className="py-3.5 px-2 font-mono text-slate-500">{sale.order_number || '---'}</td>
                        <td className="py-3.5 px-2 font-bold text-rose-600">{sale.volume_kg} kg</td>
                        <td className="py-3.5 px-2 font-bold text-emerald-600">R$ {Number(sale.revenue_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            sale.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {sale.status === 'approved' ? 'Aprovada' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right">
                          {sale.status === 'pending' && (
                            <button onClick={() => handleApproveSale(sale)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INDICAÇÕES */}
        {activeTab === 'referrals' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black">Validação de Indicações</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-extrabold uppercase">
                    <th className="py-3 px-2">Revendedora</th>
                    <th className="py-3 px-2">Cliente Indicada</th>
                    <th className="py-3 px-2">Data</th>
                    <th className="py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {referralsList.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-2 font-bold">{r.referrer?.full_name}</td>
                      <td className="py-3 px-2">{r.referred?.full_name}</td>
                      <td className="py-3 px-2 text-slate-500">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-2"><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: LANÇAR VENDA (Com seleção de Cliente e Botão Novo Cliente) */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">Lançar Nova Venda</h3>
              <button onClick={() => setIsNewSaleOpen(false)} className="text-slate-400 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateDirectSale} className="space-y-3 text-xs">
              
              {/* Seleção do Cliente + Botão Novo Cliente Rápido */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">Cliente Comprador</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickClientOpen(true)}
                    className="text-rose-600 font-black hover:underline flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Novo Cliente
                  </button>
                </div>
                <select
                  value={newSale.cliente_id}
                  onChange={(e) => setNewSale({ ...newSale, cliente_id: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione o Cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.cpf_cnpj || 'Sem CPF'})</option>
                  ))}
                </select>
              </div>

              {/* Seleção da Revendedora (Opcional se for Venda Direta da Depilamor) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Revendedora (Para pontuar na Meta)</label>
                <select
                  value={newSale.revendedor_id}
                  onChange={(e) => setNewSale({ ...newSale, revendedor_id: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Sem Revendedora (Venda Direta Depilamor)</option>
                  {revendedoras.map(r => (
                    <option key={r.id} value={r.id}>{r.full_name} ({r.level})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nº do Pedido / Nota Fiscal</label>
                <input
                  type="text"
                  required
                  value={newSale.order_number}
                  onChange={(e) => setNewSale({ ...newSale, order_number: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl"
                  placeholder="Ex: PED-8890"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Volume (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSale.volume_kg}
                    onChange={(e) => setNewSale({ ...newSale, volume_kg: e.target.value })}
                    className="w-full p-3 bg-slate-50 border rounded-2xl"
                    placeholder="Ex: 10.5"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSale.revenue_brl}
                    onChange={(e) => setNewSale({ ...newSale, revenue_brl: e.target.value })}
                    className="w-full p-3 bg-slate-50 border rounded-2xl"
                    placeholder="Ex: 550.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsNewSaleOpen(false)} className="px-4 py-2 bg-slate-100 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-lg">Processar Venda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CADASTRO RÁPIDO DE CLIENTE */}
      {isQuickClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border space-y-3 text-xs">
            <h3 className="text-base font-black text-slate-900">Cadastro Rápido de Cliente</h3>
            <form onSubmit={handleCreateQuickClient} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={quickClient.full_name}
                  onChange={(e) => setQuickClient({ ...quickClient, full_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-2xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">CPF ou CNPJ</label>
                <input
                  type="text"
                  required
                  value={quickClient.cpf_cnpj}
                  onChange={(e) => setQuickClient({ ...quickClient, cpf_cnpj: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-2xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">E-mail (Opcional)</label>
                <input
                  type="email"
                  value={quickClient.email}
                  onChange={(e) => setQuickClient({ ...quickClient, email: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-2xl"
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsQuickClientOpen(false)} className="px-3 py-2 bg-slate-100 font-bold rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl shadow-md">Salvar e Selecionar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}