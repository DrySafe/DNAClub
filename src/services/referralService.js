import { supabase } from '../config/supabaseClient'

// Registar nova indicação
export async function createReferral(referredId, referralCode) {      
  const { data: referrer, error: refError } = await supabase
    .from('profiles')
    .select('id, level')
    .eq('referral_code', referralCode)
    .single()

  if (refError || !referrer) throw new Error('Código de indicação inválido.')

  const { data, error } = await supabase
    .from('referrals')
    .insert([{
      referrer_id: referrer.id,
      referred_id: referredId,
      referrer_level_at_creation: referrer.level,
      status: 'pending'
    }])

  if (error) throw new Error('Erro ao registar indicação.')
  return data
}