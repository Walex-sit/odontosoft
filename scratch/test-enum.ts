import { createClient } from '@supabase/supabase-js'

const sb = createClient('https://jabtmplfjwtrfzwlwjax.supabase.co', 'sb_secret_ex4cvgRR7xjMq6yPSeegeA_k318vRPw')

async function main() {
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 10 })
  const user = users?.users?.[0]
  if (!user) return

  console.log('Testing update with role: admin_clinica on user:', user.email)
  const { error: err1 } = await sb.from('user_profiles').update({ role: 'admin_clinica' }).eq('id', user.id)
  console.log('Result for admin_clinica:', err1 ? err1.message : 'SUCCESS!')

  console.log('Testing update with role: admin on user:', user.email)
  const { error: err2 } = await sb.from('user_profiles').update({ role: 'admin' }).eq('id', user.id)
  console.log('Result for admin:', err2 ? err2.message : 'SUCCESS!')
}

main()
