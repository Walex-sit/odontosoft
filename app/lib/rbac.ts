import { UserRole } from '../components/RequireAuth'

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
  ],
  dentista: [
    '/overview',
    '/agenda',
    '/pacientes',
    '/prontuarios',
    '/minha-conta',
  ],
  recepcao: [
    '/overview',
    '/agenda',
    '/pacientes',
    '/minha-conta',
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
