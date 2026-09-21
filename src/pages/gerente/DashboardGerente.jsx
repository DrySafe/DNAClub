import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../config/supabaseClient.js'
import { 
  Users, UserPlus, Key, ShieldCheck, CheckCircle2, XCircle, 
  Clock, Search, LogOut, RefreshCw, DollarSign, ShoppingBag, PlusCircle
} from 'lucide-react'

export default function DashboardGerente() {
  const { profile, logout } = useAuth()
  
  const isFinanceiro = profile?.role === 'financeiro'
  const [activeTab, setActiveTab] = useState(isFinanceiro ? 'sales' : 'users') // 'users', 'referrals', 'sales'
  
  // Listas de dados
  const [usersList, setUsersList] = useState([])
  const [referralsList, setReferralsList] = useState([])
  const [salesList, setSalesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modais
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false)

  // Formulário de Novo Usuário
  const [newUser, setNewUser] = useState({
    email: '', password: '', full_name: '', cpf_cnpj: '', role: 'revendedor', level: 'DNA Profissional'
  })

  // Formulário de Lançamento de Venda Direta
  const [newSale, setNewSale] = useState({
    revendedor_id: '', order_number: '', volume_kg: '', revenue_brl: ''
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
          id, order_number, volume_kg, revenue_brl, status, created_at, revendedor_id,
          profiles:revendedor_id(full_name, cpf_cnpj)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setSalesList(data || [])
    } catch (err) {
      console.error('Erro ao buscar vendas:', err.message)
    }
  }

  // Criar Usuário (Admin)
  async function handleCreateUser(e) {
    e.preventDefault()
    if (isFinanceiro) return
    setActionMessage({ type: '', text: '' })

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      })

      if (authError) throw authError

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: newUser.full_name,
            cpf_cnpj: newUser.cpf_cnpj,
            role: newUser.role,
            level: newUser.level,
            referral_code: `DNA-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
          })

        if (profileError) throw profileError

        setActionMessage({ type: 'success', text: 'Usuário cadastrado com sucesso!' })
        setNewUser({ email: '', password: '', full_name: '', cpf_cnpj: '', role: 'revendedor', level: 'DNA Profissional' })
        setIsCreateUserOpen(false)
        fetchUsers()
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Erro ao criar usuário.' })
    }
  }

  // Lançar Venda Direta (Aprovada Automaticamente)
  async function handleCreateDirectSale(e) {
    e.preventDefault()
    try {
      // 1. Inserir a venda como 'approved'
      const { error: saleError } = await supabase.from('sales').insert({
        revendedor_id: newSale.revendedor_id,
        order_number: newSale.order_number,
        volume_kg: parseFloat(newSale.volume_kg),
        revenue_brl: parseFloat(newSale.revenue_brl),
        status: 'approved',
        approved_by: profile.id,
        approved_at: new Date()
      })

      if (saleError) throw saleError

      // 2. Atualizar acumulado da revendedora
      const revProfile = usersList.find(u => u.id === newSale.revendedor_id)
      const newKg = (parseFloat(revProfile?.total_volume_kg) || 0) + parseFloat(newSale.volume_kg)
      const newBrl = (parseFloat(revProfile?.total_revenue_brl) || 0) + parseFloat(newSale.revenue_brl)

      await supabase.from('profiles').update({ total_volume_kg: newKg, total_revenue_brl: newBrl }).eq('id', newSale.revendedor_id)

      setActionMessage({ type: 'success', text: 'Venda lançada e computada com sucesso!' })
      setIsNewSaleOpen(false)
      setNewSale({ revendedor_id: '', order_number: '', volume_kg: '', revenue_brl: '' })
      fetchSales()
      fetchUsers()
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message })
    }
  }

  // Aprovar Venda Pendente enviada por Revendedora
  async function handleApproveSale(sale) {
    try {
      const { error: saleError } = await supabase
        .from('sales')
        .update({ status: 'approved', approved_by: profile.id, approved_at: new Date() })
        .eq('id', sale.id)

      if (saleError) throw saleError

      const { data: revProfile } = await supabase
        .from('profiles')
        .select('total_volume_kg, total_revenue_brl')
        .eq('id', sale.revendedor_id)
        .single()

      const newKg = (parseFloat(revProfile?.total_volume_kg) || 0) + parseFloat(sale.volume_kg)
      const newBrl = (parseFloat(revProfile?.total_revenue_brl) || 0) + parseFloat(sale.revenue_brl)

      await supabase
        .from('profiles')
        .update({ total_volume_kg: newKg, total_revenue_brl: newBrl })
        .eq('id', sale.revendedor_id)

      setActionMessage({ type: 'success', text: 'Venda aprovada! O progresso da revendedora foi atualizado.' })
      fetchSales()
      fetchUsers()
    } catch (err) {
      alert('Erro ao aprovar venda: ' + err.message)
    }
  }

  // Rejeitar Venda
  async function handleRejectSale(saleId) {
    try {
      await supabase.from('sales').update({ status: 'rejected' }).eq('id', saleId)
      fetchSales()
    } catch (err) {
      alert('Erro ao rejeitar venda: ' + err.message)
    }
  }

  const filteredUsers = usersList.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.cpf_cnpj?.includes(searchTerm)
  )

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
            <h1 className="text-2xl sm:text-3xl font-extrabold">Painel do Gestor</h1>
            <p className="text-xs text-slate-400">Controle de usuários, vendas e validações financeiras</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewSaleOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl text-xs transition-all shadow-lg active:scale-95"
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
                Novo Usuário
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

        {/* Abas */}
        <div className="bg-white rounded-2xl p-1.5 shadow-lg border border-slate-100 inline-flex gap-1 text-xs font-bold">
          {!isFinanceiro && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                activeTab === 'users' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Usuários ({usersList.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'sales' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Vendas / Compras ({salesList.length})
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

        {/* MENSAGEM */}
        {actionMessage.text && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
            actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage({ type: '', text: '' })} className="underline">Fechar</button>
          </div>
        )}

        {/* TAB VENDAS */}
        {activeTab === 'sales' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-900">Aprovação de Compras / Vendas</h3>
                <p className="text-xs text-slate-500">Confira e aprove os lançamentos para somar nas metas das revendedoras</p>
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
                    <th className="py-3 px-2">Nº Pedido</th>
                    <th className="py-3 px-2">Volume (kg)</th>
                    <th className="py-3 px-2">Valor (R$)</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {salesList.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-400">Nenhuma venda registrada.</td></tr>
                  ) : (
                    salesList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-2 font-bold text-slate-800">{sale.profiles?.full_name || 'Revendedora'}</td>
                        <td className="py-3.5 px-2 font-mono text-slate-600">{sale.order_number || '---'}</td>
                        <td className="py-3.5 px-2 font-bold text-rose-600">{sale.volume_kg} kg</td>
                        <td className="py-3.5 px-2 font-bold text-emerald-600">R$ {Number(sale.revenue_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            sale.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            sale.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {sale.status === 'approved' ? 'Aprovada' : sale.status === 'rejected' ? 'Rejeitada' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right space-x-2">
                          {sale.status === 'pending' && (
                            <>
                              <button onClick={() => handleApproveSale(sale)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg" title="Aprovar">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleRejectSale(sale.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg" title="Rejeitar">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
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

        {/* TAB USUÁRIOS */}
        {activeTab === 'users' && !isFinanceiro && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <input
                type="text"
                placeholder="Buscar revendedora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-2.5 bg-slate-50 border rounded-2xl text-xs w-full max-w-xs"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-slate-400 font-extrabold uppercase">
                    <th className="py-3 px-2">Nome</th>
                    <th className="py-3 px-2">CPF/CNPJ</th>
                    <th className="py-3 px-2">Perfil</th>
                    <th className="py-3 px-2">Categoria</th>
                    <th className="py-3 px-2">Volume Total</th>
                    <th className="py-3 px-2">Faturamento Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-bold">{u.full_name}</td>
                      <td className="py-3 px-2 text-slate-500 font-mono">{u.cpf_cnpj}</td>
                      <td className="py-3 px-2"><span className="px-2 py-0.5 rounded bg-slate-100 font-bold uppercase">{u.role}</span></td>
                      <td className="py-3 px-2 font-bold text-rose-600">{u.level}</td>
                      <td className="py-3 px-2 font-bold">{u.total_volume_kg || 0} kg</td>
                      <td className="py-3 px-2 font-bold text-emerald-600">R$ {Number(u.total_revenue_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB INDICAÇÕES */}
        {activeTab === 'referrals' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black">Validação de Cupons das Indicações</h3>
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

      {/* MODAL: LANÇAR VENDA DIRETA */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <h3 className="text-base font-black text-slate-900">Lançar Venda Direta</h3>
            <form onSubmit={handleCreateDirectSale} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Selecione a Revendedora</label>
                <select
                  required
                  value={newSale.revendedor_id}
                  onChange={(e) => setNewSale({ ...newSale, revendedor_id: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl font-bold"
                >
                  <option value="">Selecione...</option>
                  {usersList.filter(u => u.role === 'revendedor').map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.cpf_cnpj})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Nº do Pedido / Nota Fiscal</label>
                <input
                  type="text"
                  required
                  value={newSale.order_number}
                  onChange={(e) => setNewSale({ ...newSale, order_number: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl"
                  placeholder="Ex: PED-9982"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Volume em Quilos (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSale.volume_kg}
                    onChange={(e) => setNewSale({ ...newSale, volume_kg: e.target.value })}
                    className="w-full p-3 bg-slate-50 border rounded-2xl"
                    placeholder="Ex: 15.5"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Valor em Reais (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSale.revenue_brl}
                    onChange={(e) => setNewSale({ ...newSale, revenue_brl: e.target.value })}
                    className="w-full p-3 bg-slate-50 border rounded-2xl"
                    placeholder="Ex: 850.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsNewSaleOpen(false)} className="px-4 py-2 bg-slate-100 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-lg">Lançar e Somar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR USUÁRIO */}
      {isCreateUserOpen && !isFinanceiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <h3 className="text-base font-black text-slate-900">Cadastrar Novo Usuário</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    required
                    value={newUser.cpf_cnpj}
                    onChange={(e) => setNewUser({ ...newUser, cpf_cnpj: e.target.value })}
                    className="w-full p-3 bg-slate-50 border rounded-2xl"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Perfil (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full p-3 bg-slate-50 border rounded-2xl font-bold"
                  >
                    <option value="revendedor">Revendedor</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="admin">Gestor / Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full p-3 bg-slate-50 border rounded-2xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsCreateUserOpen(false)} className="px-4 py-2 bg-slate-100 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-slate-900 text-white font-bold rounded-2xl">Criar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}