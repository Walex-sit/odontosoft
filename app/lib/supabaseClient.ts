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
    'Verifique as variáveis de ambiente na Vercel.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    '[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida. ' +
    'Verifique as variáveis de ambiente na Vercel.'
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
type Database = any

let _supabase: SupabaseClient<Database> | null = null
let _supabaseAdmin: SupabaseClient<Database> | null = null

function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return _supabase
}

function getSupabaseAdmin(): SupabaseClient<Database> {
  if (!supabaseServiceKey) {
    return null as unknown as SupabaseClient<Database>
  }

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient<Database>(supabaseUrl!, supabaseServiceKey, {
      auth: {
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