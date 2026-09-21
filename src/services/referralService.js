import { supabase } from '../config/supabaseClient'

export async function getReferralsByUserId(userId) {
  const { data, error } = await supabase
    .from('referrals')
    .select(`
      id,
      status,
      created_at,
      referrer_level_at_creation,
      profiles!referrals_referred_id_fkey(full_name, cpf_cnpj)
    `)
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}