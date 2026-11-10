/**
 * scripts/check-dashboard.ts
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Segurança] ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no ambiente.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

const CLINICA_ID = '78733a3f-708c-4f08-8af3-94d0929707e4'
const DEMO_EMAIL = 'demo@odontosoft.com.br'
const DEMO_PASSWORD = 'Demo@OdontoSoft2026'

async function main() {
  console.log('\n=== OdontoSoft — Diagnostico do Dashboard ===\n')

  const { data: clinicas } = await supabase.from('clinicas').select('id, nome, plano').eq('id', CLINICA_ID)
  console.log('Clinica:', clinicas?.[0]?.nome || 'NAO ENCONTRADA')

  const { count: numPacientes, data: pacs } = await supabase.from('pacientes').select('id, nome', { count: 'exact' }).eq('clinica_id', CLINICA_ID).limit(3)
  console.log('Pacientes:', numPacientes || 0, 'total. Primeiros:', pacs?.map(p => p.nome).join(', ') || 'nenhum')

  const { count: numAgend } = await supabase.from('agendamentos').select('id', { count: 'exact' }).eq('clinica_id', CLINICA_ID)
  console.log('Agendamentos:', numAgend || 0, 'total')

  const { count: numRec } = await supabase.from('receitas').select('id', { count: 'exact' }).eq('clinica_id', CLINICA_ID)
  console.log('Receitas:', numRec || 0, 'total')

  const { count: numDesp } = await supabase.from('despesas').select('id', { count: 'exact' }).eq('clinica_id', CLINICA_ID)
  console.log('Despesas:', numDesp || 0, 'total')

  const { data: profiles } = await supabase.from('user_profiles').select('id, nome, role, email, user_id').eq('clinica_id', CLINICA_ID)
  console.log('User Profiles:', profiles?.length || 0)
  profiles?.forEach(p => console.log('  -', p.role, p.nome, p.email || ''))

  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (listErr) { console.log('Erro ao listar users:', listErr.message); return }

  const demoUser = users?.find(u => u.email === DEMO_EMAIL)
  if (demoUser) {
    console.log('\nUtilizador demo EXISTE:', demoUser.email, '(id:', demoUser.id + ')')
    const { data: prof } = await supabase.from('user_profiles').select('role, clinica_id').eq('user_id', demoUser.id).maybeSingle()
    if (prof) {
      console.log('  Perfil: role=', prof.role, 'clinica_id=', prof.clinica_id)
      const ok = prof.clinica_id === CLINICA_ID
      console.log('  Clinica correcta:', ok ? 'SIM' : 'NAO — vai corrigir...')
      if (!ok) {
        await supabase.from('user_profiles').update({ clinica_id: CLINICA_ID }).eq('user_id', demoUser.id)
        console.log('  Corrigido!')
      }
    } else {
      console.log('  SEM PERFIL — a criar...')
      const { error: profErr } = await supabase.from('user_profiles').upsert({ user_id: demoUser.id, clinica_id: CLINICA_ID, nome: 'Dr. Demo OdontoSoft', role: 'admin', email: DEMO_EMAIL, ativo: true }, { onConflict: 'user_id' })
      console.log(profErr ? '  ERRO: ' + profErr.message : '  Perfil criado!')
    }
  } else {
    console.log('\nUtilizador demo NAO existe — a criar...')
    const { data: newUser, error: ce } = await supabase.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { nome: 'Dr. Demo OdontoSoft' } })
    if (ce) { console.log('Erro:', ce.message); return }
    console.log('Criado:', newUser.user?.email)
    const { error: profErr } = await supabase.from('user_profiles').upsert({ user_id: newUser.user!.id, clinica_id: CLINICA_ID, nome: 'Dr. Demo OdontoSoft', role: 'admin', email: DEMO_EMAIL, ativo: true }, { onConflict: 'user_id' })
    console.log(profErr ? 'Erro perfil: ' + profErr.message : 'Perfil admin criado!')
  }

  console.log('\n=== CREDENCIAIS DE ACESSO ===')
  console.log('URL:', 'http://localhost:3000/login')
  console.log('Email:', DEMO_EMAIL)
  console.log('Password:', DEMO_PASSWORD)
  console.log('===========================\n')
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
