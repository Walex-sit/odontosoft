import { UserRole } from '../components/RequireAuth'

/**
 * Rotas permitidas por perfil.
 * Fonte única de verdade para Sidebar e RouteGuard.
 * Usar prefixo: /pacientes cobre /pacientes, /pacientes/novo, etc.
 */
export const ROUTE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    '/admin',
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
  admin_clinica: [
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
    '/estoque',
    '/planos-tratamento',
  ],
  recepcao: [
    '/overview',
    '/agenda',
    '/pacientes',
    '/patients',
    '/minha-conta',
    '/messages',
    '/estoque',
    '/planos-tratamento',
  ],
  financeiro: [
    '/overview',
    '/financeiro',
    '/comissoes',
    '/regua-cobranca',
    '/minha-conta',
  ],
}

/**
 * Retorna true se o role tem acesso à rota fornecida.
 * Compara por prefixo para cobrir sub-rotas (ex: /pacientes/123).
 * Suporta também o prefixo /dashboard (ex: /dashboard/pacientes -> /pacientes).
 */
export function canAccess(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false
  const allowed = ROUTE_PERMISSIONS[role] ?? []
  const pathWithoutQuery = (pathname || '').split('?')[0]
  const normalizedPath = pathWithoutQuery === '/dashboard'
    ? '/overview'
    : pathWithoutQuery.startsWith('/dashboard/')
      ? pathWithoutQuery.replace(/^\/dashboard/, '')
      : pathWithoutQuery

  return allowed.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(prefix + '/'))
}
