import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jabtmplfjwtrfzwlwjax.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_ex4cvgRR7xjMq6yPSeegeA_k318vRPw'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  for (const table of ['pacientes', 'agendamentos', 'prontuarios', 'receitas', 'despesas', 'procedimentos', 'procedimentos_realizados']) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    console.log(`Table ${table}: ${count} rows (err: ${error?.message || 'none'})`)
  }
}

main()
