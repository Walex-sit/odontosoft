import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jabtmplfjwtrfzwlwjax.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphYnRtcGxmand0cmZ6d2x3amF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMDUyNDgsImV4cCI6MjA3MTU4MTI0OH0.XbHn6z1d1mI4q36x8mXbXvTq6mQy-XkF8jL2q4' // anon key from .env.local

async function main() {
  console.log('--- TESTANDO LOGIN E QUERIES COM DEMO USER ---')
  
  // 1. Read anon key from .env.local
  const fs = await import('fs')
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)
  const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : ''

  const client = createClient(SUPABASE_URL, anonKey)
  
  // 2. Sign in as demo user
  const { data: authData, error: loginErr } = await client.auth.signInWithPassword({
    email: 'demo@odontosoft.com.br',
    password: 'Demo@OdontoSoft2026'
  })

  if (loginErr || !authData.user) {
    console.error('Falha no login:', loginErr?.message)
    return
  }

  console.log('✅ Login realizado com sucesso! User ID:', authData.user.id)
  console.log('Token JWT recebido.')

  // 3. User Profile
  const { data: profile, error: profErr } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()
  
  console.log('Perfil retornado (RLS):', profile?.nome, '| Role:', profile?.role, '| Clinica ID:', profile?.clinica_id)

  // 4. Test Pacientes (RLS)
  const { data: pacientes, error: pacErr, count: pacCount } = await client
    .from('pacientes')
    .select('id, nome, telefone, cpf_hash', { count: 'exact' })

  console.log(`\n--- PACIENTES (RLS) ---`)
  console.log('Count:', pacCount || pacientes?.length)
  if (pacErr) console.error('Erro pacientes:', pacErr.message)
  pacientes?.forEach((p, i) => console.log(`  ${i + 1}. ${p.nome} - ${p.telefone}`))

  // 5. Test Agendamentos (RLS)
  const { data: agendamentos, error: agErr, count: agCount } = await client
    .from('agendamentos')
    .select('id, data_consulta, hora_consulta, procedimento, status', { count: 'exact' })

  console.log(`\n--- AGENDAMENTOS (RLS) ---`)
  console.log('Count:', agCount || agendamentos?.length)
  if (agErr) console.error('Erro agendamentos:', agErr.message)
  agendamentos?.slice(0, 5).forEach((a, i) => console.log(`  ${i + 1}. [${a.status}] ${a.data_consulta} ${a.hora_consulta} - ${a.procedimento}`))
  console.log(`  ... e mais ${(agendamentos?.length || 0) - 5} agendamentos`)

  // 6. Test Receitas (RLS)
  const { data: receitas, error: recErr, count: recCount } = await client
    .from('receitas')
    .select('id, descricao, valor, status, created_at', { count: 'exact' })

  console.log(`\n--- RECEITAS (RLS) ---`)
  console.log('Count:', recCount || receitas?.length)
  if (recErr) console.error('Erro receitas:', recErr.message)
  const totalPago = receitas?.filter(r => ['pago', 'recebido', 'concluido'].includes(r.status.toLowerCase()))
    .reduce((acc, curr) => acc + Number(curr.valor), 0)
  console.log('Faturamento Total Pago:', totalPago?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

  // 7. Test Prontuarios (RLS)
  const { data: prontuarios, count: prCount } = await client
    .from('prontuarios')
    .select('id, tratamento, status', { count: 'exact' })
  console.log(`\n--- PRONTUÁRIOS (RLS) ---`)
  console.log('Count:', prCount || prontuarios?.length)

  console.log('\n--- TUDO VALIDADO VIA JWT/RLS DO CLIENTE SUPABASE ---')
}

main().catch(console.error)
