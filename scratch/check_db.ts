import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Segurança] ERRO: Variáveis de ambiente não configuradas.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Querying clinicas...')
  const { data: clinicas, error: clinicasErr } = await supabase.from('clinicas').select('*')
  console.log('Clinicas:', clinicas, clinicasErr)

  console.log('Querying user_profiles...')
  const { data: profiles, error: profErr } = await supabase.from('user_profiles').select('*')
  console.log('Profiles:', profiles, profErr)

  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers()
  console.log('Auth users count:', users?.users?.length, usersErr)
  if (users?.users) {
    console.log('Users:', users.users.map(u => ({ id: u.id, email: u.email })))
  }
}

main()
