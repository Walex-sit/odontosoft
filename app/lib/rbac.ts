import 'server-only'

/**
 * app/lib/rbac.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Helpers de autorização e verificação de perfil (RBAC) no servidor.
 *
 * Segurança (T001):
 *  ✅ Utiliza createServerClient() padronizado.
 *  ✅ Verifica sessão e perfil diretamente via RLS.
 *  ✅ Retorna user, profile (com clinica_id) e cliente supabase autenticado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from './supabase/server'
import type { UserRole } from './database.types'

export interface ServerUserProfile {
  id: string
  nome: string
  role: UserRole
  clinica_id: string | null
  email?: string | null
}

export async function checkServerAuth(allowedRoles?: string[]) {
  const supabase = await createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Não autorizado: Sessão inválida ou expirada.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, nome, role, clinica_id, email')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Perfil do usuário não encontrado.')
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(profile.role)) {
      throw new Error(`Acesso negado: Perfil '${profile.role}' sem permissão para esta operação.`)
    }
  }

  return { user, profile: profile as ServerUserProfile, supabase }
}
