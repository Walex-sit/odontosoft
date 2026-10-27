import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jabtmplfjwtrfzwlwjax.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_ex4cvgRR7xjMq6yPSeegeA_k318vRPw'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  const { data: prontuarios, error: prErr } = await supabase.from('prontuarios').select('*').limit(1)
  console.log('Prontuarios sample:', prontuarios, prErr)

  const { data: despesas, error: despErr } = await supabase.from('despesas').select('*').limit(1)
  console.log('Despesas sample:', despesas, despErr)
}

main()
