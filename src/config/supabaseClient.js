import { createClient } from '@supabase/supabase-js'

// Substitua pelas chaves do seu projeto no painel do Supabase
const supabaseUrl = 'https://gptofnrdirvycesycidw.supabase.co'
const supabaseAnonKey = 'sb_publishable_BvhlrisJoysWz9NnzvrpMw__Px2W_RJ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)