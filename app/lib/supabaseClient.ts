import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Validação de variáveis de ambiente
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL não está definida. ' +
    'Verifique o arquivo .env.local na raiz do projeto.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida. ' +
    'Verifique o arquivo .env.local na raiz do projeto.'
  )
}

if (typeof window === 'undefined' && !supabaseServiceKey) {
  console.warn(
    '[Supabase] SUPABASE_SERVICE_ROLE_KEY não está definida. ' +
    'Server Actions que exigem privilégios de admin podem falhar.'
  )
}

// ---------------------------------------------------------------------------
// Singletons — garante uma única instância dos clientes em toda a aplicação
// ---------------------------------------------------------------------------
// Tipagem do banco (gerada pelo Supabase CLI: `supabase gen types typescript`)
// Por ora usada como `unknown` até a geração dos tipos automáticos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = any

let _supabase: SupabaseClient<Database> | null = null
let _supabaseAdmin: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // Persiste a sessão no localStorage (padrão para apps web)
        persistSession: true,
        // Detecta a sessão na URL após redirecionamentos de auth
        detectSessionInUrl: true,
      },
    })
  }
  return _supabase
}

function getSupabaseAdmin(): SupabaseClient<Database> {
  // Trava de segurança crucial: impede o crash se o código for executado no navegador
  if (!supabaseServiceKey) {
    return null as unknown as SupabaseClient<Database>
  }

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient<Database>(supabaseUrl!, supabaseServiceKey, {
      auth: {
        // Desativado pois o servidor não usa localStorage (Server Actions)
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  return _supabaseAdmin
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Instância singleton do cliente Supabase padrão. Use em Client Components e Hooks. */
export const supabase = getSupabaseClient()

/** Instância singleton do cliente Admin. Use APENAS no lado do servidor (Server Actions). */
export const supabaseAdmin = getSupabaseAdmin()

/** Alternativas funcionais — retornam sempre as mesmas instâncias singleton. */
export { getSupabaseClient as getSupabase }