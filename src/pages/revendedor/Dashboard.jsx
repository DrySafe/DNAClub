import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import HeaderStatus from '../../components/revendedor/HeaderStatus'
import GoalProgress from '../../components/revendedor/GoalProgress'
import ReferralSection from '../../components/revendedor/ReferralSection'
import ReferralsTable from '../../components/revendedor/ReferralsTable'

export default function DashboardRevendedor() {
  const { profile, loading: authLoading } = useAuth()
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      fetchReferrals()
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
      {/* Cabeçalho de Status */}
      <HeaderStatus profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-6">
        {/* Termômetro de Metas Semestrais */}
        <GoalProgress 
          currentKg={profile?.total_volume_kg || 0} 
          currentBrl={profile?.total_revenue_brl || 0}
          currentLevel={profile?.level || 'DNA Profissional'}
        />

        {/* Central de Indicações (Link e Código) */}
        <ReferralSection 
          referralCode={profile?.referral_code} 
          currentLevel={profile?.level} 
        />

        {/* Tabela de Indicações Realizada */}
        <ReferralsTable referrals={referrals} />
      </main>
    </div>
  )
}