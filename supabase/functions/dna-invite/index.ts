import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0'

// Set APP_ORIGIN to the deployed portal origin; never accept arbitrary redirect destinations.
const origin = Deno.env.get('APP_ORIGIN') || ''
const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return response({ error: 'Método não permitido.' }, 405)
  if (!origin) return response({ error: 'Configure APP_ORIGIN na função de convites.' }, 503)
  const token = req.headers.get('Authorization')?.replace(/^Bearer /i, '')
  if (!token) return response({ error: 'Autenticação necessária.' }, 401)
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: auth, error: authError } = await client.auth.getUser(token)
  if (authError || !auth.user) return response({ error: 'Sessão inválida.' }, 401)
  const { data: caller } = await client.from('dna_members').select('role').eq('id', auth.user.id).single()
  if (caller?.role !== 'admin') return response({ error: 'Apenas administradores podem convidar.' }, 403)
  try {
    const body = await req.json()
    if (!['cliente','revendedor','financeiro','admin'].includes(body.role) || !body.full_name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return response({ error: 'Confira nome, e-mail e perfil.' }, 400)
    if (body.role === 'revendedor' && !['DNA Profissional','DNA Referência','DNA Master','DNA MOR'].includes(body.level)) return response({ error: 'Selecione a categoria inicial.' }, 400)
    const { data, error } = await client.auth.admin.inviteUserByEmail(body.email, { data: { full_name: body.full_name.trim() }, redirectTo: `${origin}/recuperar-senha?mode=reset` })
    if (error) return response({ error: 'Não foi possível convidar. Confira se o e-mail já possui conta.' }, 400)
    const { error: updateError } = await client.from('dna_members').update({ role: body.role, level: body.role === 'revendedor' ? body.level : null }).eq('id', data.user.id)
    if (updateError) return response({ error: 'Convite enviado, mas o perfil precisa ser ajustado na tela Pessoas.' }, 409)
    await client.from('dna_audit').insert({ actor_id: auth.user.id, action: 'member_invite', target_id: data.user.id, details: { role: body.role, full_name: body.full_name } })
    return response({ ok: true })
  } catch { return response({ error: 'Dados inválidos para o convite.' }, 400) }
})
