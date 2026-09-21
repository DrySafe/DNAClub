import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../config/supabaseClient.js'
import { 
  Users, UserPlus, Key, ShieldCheck, CheckCircle2, XCircle, 
  Clock, Package, Search, Award, LogOut, RefreshCw, AlertCircle
} from 'lucide-react'

export default function DashboardGerente() {
  const { profile, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('users') // 'users', 'referrals', 'kits'
  
  // Estados de dados
  const [usersList, setUsersList] = useState([])
  const [referralsList, setReferralsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modais e Formulários
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Formulário de Novo Usuário
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    cpf_cnpj: '',
    role: 'revendedor',
    level: 'DNA Profissional'
  })

  // Formulário de Nova Senha
  const [newPassword, setNewPassword] = useState('')
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    await Promise.all([fetchUsers(), fetchReferrals()])
    setLoading(false)
  }

  // Busca lista de perfis/usuários
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

  // Busca histórico de indicações
  async function fetchReferrals() {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          created_at,
          referrer_level_at_creation,
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

  // Handler para Criar Novo Usuário no Supabase Auth + Profiles
  async function handleCreateUser(e) {
    e.preventDefault()
    setActionMessage({ type: '', text: '' })

    try {
      // 1. Cria a conta no Supabase Auth usando signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      })

      if (authError) throw authError

      if (authData?.user) {
        // 2. Insere/Atualiza o perfil na tabela profiles
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

  // Handler para Atualizar Nível do Revendedor
  async function handleUpdateLevel(userId, newLevel) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ level: newLevel })
        .eq('id', userId)

      if (error) throw error
      fetchUsers()
    } catch (err) {
      alert('Erro ao atualizar nível: ' + err.message)
    }
  }

  // Handler para Atualizar Status da Indicação (Aprovar / Invalidar)
  async function handleUpdateReferralStatus(referralId, newStatus) {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ status: newStatus })
        .eq('id', referralId)

      if (error) throw error
      fetchReferrals()
    } catch (err) {
      alert('Erro ao atualizar indicação: ' + err.message)
    }
  }

  const filteredUsers = usersList.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.cpf_cnpj?.includes(searchTerm)
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
      
      {/* Header do Gestor */}
      <header className="bg-slate-900 text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Painel Administrativo
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">Portal de Gestão Depilamor</h1>
            <p className="text-xs text-slate-400">Gerencie usuários, permissões e aprovação de indicações do Clube DNA</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateUserOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl text-xs transition-all shadow-lg shadow-rose-500/20 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </button>

            <button
              onClick={logout}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">

        {/* Abas de Navegação */}
        <div className="bg-white rounded-2xl p-1.5 shadow-lg border border-slate-100 inline-flex gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'users' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários & Permissões ({usersList.length})
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeTab === 'referrals' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Validação de Indicações ({referralsList.length})
          </button>
        </div>

        {/* MENSAGEM DE FEEDBACK */}
        {actionMessage.text && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
            actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage({ type: '', text: '' })} className="underline">Fechar</button>
          </div>
        )}

        {/* TAB 1: GESTÃO DE USUÁRIOS */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button 
                onClick={fetchUsers}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar Lista
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-2">Nome Completo</th>
                    <th className="py-3 px-2">CPF/CNPJ</th>
                    <th className="py-3 px-2">Role (Perfil)</th>
                    <th className="py-3 px-2">Categoria Atual</th>
                    <th className="py-3 px-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-2 font-bold text-slate-800">{user.full_name || 'Sem nome'}</td>
                      <td className="py-3.5 px-2 text-slate-500 font-mono">{user.cpf_cnpj || '---'}</td>
                      <td className="py-3.5 px-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-2">
                        <select
                          value={user.level || 'DNA Profissional'}
                          onChange={(e) => handleUpdateLevel(user.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 focus:outline-none"
                        >
                          <option value="DNA Profissional">DNA Profissional</option>
                          <option value="DNA Referência">DNA Referência</option>
                          <option value="DNA Master">DNA Master</option>
                          <option value="DNA MOR">DNA MOR</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(user)
                            setIsResetPasswordOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                          title="Alterar Senha"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Senha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: VALIDAÇÃO DE INDICAÇÕES */}
        {activeTab === 'referrals' && (
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">Aprovação do Primeiro Pedido</h3>
            <p className="text-xs text-slate-500">Valide as compras realizadas por clientes indicadas para liberar o cupom da revendedora[cite: 1, 2].</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-2">Revendedora (Quem Indicou)</th>
                    <th className="py-3 px-2">Cliente Indicada</th>
                    <th className="py-3 px-2">Data do Pedido</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {referralsList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">Nenhuma indicação registrada.</td>
                    </tr>
                  ) : (
                    referralsList.map((ref) => (
                      <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-2 font-bold text-slate-800">{ref.referrer?.full_name || 'Revendedora'}</td>
                        <td className="py-3.5 px-2 text-slate-700">{ref.referred?.full_name || 'Nova Cliente'}</td>
                        <td className="py-3.5 px-2 text-slate-500">{new Date(ref.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3.5 px-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            ref.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            ref.status === 'invalid' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {ref.status === 'approved' ? 'Aprovada' : ref.status === 'invalid' ? 'Inválida' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-right space-x-2">
                          <button
                            onClick={() => handleUpdateReferralStatus(ref.id, 'approved')}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                            title="Aprovar Pedido"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateReferralStatus(ref.id, 'invalid')}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                            title="Invalidar Pedido"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: CRIAR NOVO USUÁRIO */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-black text-slate-900">Cadastrar Novo Usuário</h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    required
                    value={newUser.cpf_cnpj}
                    onChange={(e) => setNewUser({ ...newUser, cpf_cnpj: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perfil de Acesso (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="revendedor">Revendedor</option>
                    <option value="admin">Gestor / Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail de Acesso</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Senha Inicial</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-2xl shadow-lg active:scale-95"
                >
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}