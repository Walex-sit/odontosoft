/**
 * app/lib/supabase/server.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente Supabase para uso exclusivo no servidor:
 *   - Server Components
 *   - Server Actions ('use server')
 *   - Route Handlers (app/api/)
 *
 * NUNCA importar em Client Components ('use client').
 * O guard `import 'server-only'` garante erro de build caso isso aconteça.
 *
 * Autenticação baseada no JWT do usuário via cookie → RLS funciona corretamente.
 * NUNCA bypassa RLS — o isolamento multi-tenant é garantido pelo banco.
 *
 * USO:
 *   import { createServerClient } from '@/app/lib/supabase/server'
 *   const supabase = await createServerClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'server-only'

import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('[Supabase/server] NEXT_PUBLIC_SUPABASE_URL não está definida.')
}

if (!supabaseAnonKey) {
  throw new Error('[Supabase/server] NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida.')
}

/**
 * Cria um cliente Supabase autenticado pelo contexto do servidor.
 * Lê o JWT do cookie de sessão → RLS aplica o isolamento multi-tenant.
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return _createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components chamam setAll mas não podem escrever cookies.
          // O middleware é responsável por renovar as sessões expiradas.
        }
      },
    },
  })
}

/**
 * Verifica se há uma sessão válida e retorna o usuário autenticado.
 * Lança erro se não houver sessão — use em Server Actions que exigem auth.
 */
export async function requireAuth() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Não autorizado: sessão inválida ou expirada.')
  }

  return { user, supabase }
}

/**
 * Verifica sessão + role do usuário (RBAC no servidor).
 * Lança erro se o perfil não existir ou não tiver a role requerida.
 */
export async function requireRole(allowedRoles: string[]) {
  const { user, supabase } = await requireAuth()

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, nome, role, clinica_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Perfil não encontrado. Contate o administrador.')
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new Error(`Acesso negado: perfil '${profile.role}' não tem permissão para esta operação.`)
  }

  return { user, profile, supabase }
}
