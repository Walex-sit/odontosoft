import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Segurança] ERRO: Variáveis de ambiente não configuradas.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  // Try querying rpc or raw query if possible
  // In Supabase, postgres functions can be checked via postgres meta if exposed, or rpc
  // Let's check what RPCs exist or inspect clinicas
  console.log('Testing RPC calls...')
  const { data: rpcTest, error: rpcErr } = await supabase.rpc('provisionar_novo_tenant', {
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_nome_clinica: 'Clinica Teste Inspecao'
  })
  console.log('RPC test provisionar_novo_tenant:', rpcTest, rpcErr)
}

main()
