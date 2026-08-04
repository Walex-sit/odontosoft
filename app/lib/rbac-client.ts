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
