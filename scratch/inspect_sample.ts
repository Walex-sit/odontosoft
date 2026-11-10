import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Segurança] ERRO: Variáveis de ambiente não configuradas.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  const { data: pacientes } = await supabase.from('pacientes').select('*').limit(3)
  console.log('Sample pacientes:', pacientes)

  const { data: agendamentos } = await supabase.from('agendamentos').select('*').limit(3)
  console.log('Sample agendamentos:', agendamentos)

  const { data: receitas } = await supabase.from('receitas').select('*').limit(3)
  console.log('Sample receitas:', receitas)

  const { data: procedimentos } = await supabase.from('procedimentos').select('*').limit(5)
  console.log('Sample procedimentos:', procedimentos)
}

main()
