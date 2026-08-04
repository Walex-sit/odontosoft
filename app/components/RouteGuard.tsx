'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './RequireAuth'
import { canAccess } from '../lib/rbac-client'

/**
 * RouteGuard — protege rotas com base no role do usuário.
 * Deve envolver o conteúdo dentro do DashboardLayout, após o RequireAuth.
 * Redireciona para /acesso-negado se o perfil não tiver permissão.
 */
export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Aguarda o profile ser carregado
    if (!profile) return

    if (!canAccess(profile.role, pathname)) {
      router.replace('/acesso-negado')
    }
  }, [profile, pathname, router])

  // Se o profile ainda não carregou, deixa o layout renderizar normalmente
  // (o RequireAuth já exibe spinner enquanto carrega)
  if (!profile) return null

  // Acesso negado — não renderiza conteúdo enquanto redireciona
  if (!canAccess(profile.role, pathname)) return null

  return <>{children}</>
}
