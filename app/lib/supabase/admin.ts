/**
 * app/lib/supabase/admin.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente Supabase Admin com SERVICE_ROLE_KEY.
 *
 * ⚠️  USO RESTRITO — Permitido APENAS em operações de infraestrutura que
 *     NUNCA possuem contexto de sessão de usuário comum:
 *       ✅ auth.admin.createUser()
 *       ✅ auth.admin.deleteUser()
 *       ✅ Escrita em system_logs (audit) sem contexto de sessão
 *
 *     PROIBIDO em:
 *       ❌ Qualquer leitura ou escrita de pacientes, agenda, prontuário,
 *          financeiro, estoque, receitas, comissões ou qualquer entidade
 *          de clínica — essas operações DEVEM usar server.ts com RLS.
 *
 * O guard `import 'server-only'` garante erro de build em Client Components.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('[Supabase/admin] NEXT_PUBLIC_SUPABASE_URL não está definida.')
}

if (!supabaseServiceKey) {
  throw new Error(
    '[Supabase/admin] SUPABASE_SERVICE_ROLE_KEY não está definida. ' +
    'Esta variável é obrigatória para operações administrativas de autenticação.'
  )
}

/**
 * Singleton do cliente admin.
 * Bypass total de RLS — use com extremo cuidado e apenas nos casos listados acima.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})
