"use server"
import { UserRole } from '../components/RequireAuth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function checkServerAuth(allowedRoles?: string[]) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Não autorizado: Sessão inválida ou expirada.')
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !allowedRoles.includes(profile.role)) {
      throw new Error('Acesso negado: Perfil sem permissão para esta operação.')
    }
  }

  return { user, supabase }
}


/**
 * Rotas permitidas por perfil.
 * Fonte única de verdade para Sidebar e RouteGuard.
 * Usar prefixo: /pacientes cobre /pacientes, /pacientes/novo, etc.
 */
export const ROUTE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/overview',
    '/agenda',
    '/pacientes',
    '/patients',
    '/prontuarios',
    '/financeiro',
    '/despesas',
    '/fluxo-caixa',
    '/fornecedores',
    '/compras',
    '/notas-fiscais',
    '/usuarios',
    '/logs',
    '/assinatura',
    '/minha-conta',
    '/messages',
    '/controle-de-protese',
    '/establishment',
    '/configuracoes',
    '/estoque',
    '/comissoes',
    '/regua-cobranca',
    '/planos-tratamento',
  ],
  dentista: [
    '/overview',
    '/agenda',
    '/pacientes',
    '/patients',
    '/prontuarios',
    '/minha-conta',
    '/messages',
    '/controle-de-protese',
  ],
  recepcao: [
    '/overview',
    '/agenda',
    '/pacientes',
    '/patients',
    '/minha-conta',
    '/messages',
  ],
  financeiro: [
    '/overview',
    '/financeiro',
    '/minha-conta',
  ],
}

/**
 * Retorna true se o role tem acesso à rota fornecida.
 * Compara por prefixo para cobrir sub-rotas (ex: /pacientes/123).
 */
export function canAccess(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false
  const allowed = ROUTE_PERMISSIONS[role] ?? []
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
}
