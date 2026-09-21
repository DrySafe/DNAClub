import { createClient } from '@supabase/supabase-js'

// Substitua pelas chaves do seu projeto no painel do Supabase
const supabaseUrl = 'https://gptofnrdirvycesycidw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdG9mbnJkaXJ2eWNlc3ljaWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODY0MzAsImV4cCI6MjEwNTU2MjQzMH0.cQ3hoBiMUZUPh9twUxjFlCl5yu9rQ6WJs8VdsCv2_XQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)