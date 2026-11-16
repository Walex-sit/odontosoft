'use client'

/**
 * app/components/RoutePrefetcher.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Prefetcher global inteligente de rotas e dados para o OdontoSoft.
 *
 * Ao autenticar o usuário, pré-carrega os chunks JS e dados de rotas do Next.js
 * de forma assíncrona/idle, garantindo que as trocas de abas sejam instantâneas
 * e com 0ms de espera perceptível.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './RequireAuth'
import { canAccess } from '../lib/rbac-client'
import { supabase } from '../lib/supabaseClient'
import { setCached, getCached } from '../lib/cache'

// Rotas de alta prioridade no dashboard
const PRIMARY_ROUTES = [
  '/overview',
  '/agenda',
  '/pacientes',
  '/financeiro',
  '/prontuarios',
  '/estoque',
  '/planos-tratamento',
  '/configuracoes',
  '/minha-conta',
]

export default function RoutePrefetcher() {
  const router = useRouter()
  const { profile } = useAuth()
  const prefetchedRef = useRef(false)

  useEffect(() => {
    if (!profile || prefetchedRef.current) return
    prefetchedRef.current = true

    // Identifica as rotas permitidas para o papel do usuário
    const allowedRoutes = PRIMARY_ROUTES.filter((r) => canAccess(profile.role, r))

    const runPrefetch = () => {
      // 1. Pré-carregamento escalonado de rotas do Next.js
      allowedRoutes.forEach((route, index) => {
        window.setTimeout(() => {
          try {
            router.prefetch(route)
          } catch (e) {
            // Silencioso em caso de erro menor de prefetch
          }
        }, index * 80)
      })

      // 2. Pré-aquecimento de dados em cache (Pacientes frequentes)
      if (canAccess(profile.role, '/pacientes') && !getCached('pacientes:lista')) {
        window.setTimeout(async () => {
          try {
            const { data } = await supabase
              .from('pacientes')
              .select('id, clinica_id, nome, telefone, cpf_mascarado, rg, email, data_nascimento, endereco, convenio, lgpd_aceite, lgpd_aceite_em, created_at, user_id, cep, rua, numero, bairro, cidade, genero, whatsapp')
              .order('nome', { ascending: true })

            if (data) {
              setCached('pacientes:lista', data, 4 * 60 * 1000)
            }
          } catch (err) {
            // Background pre-warm gracioso
          }
        }, 600)
      }
    }

    // Usa requestIdleCallback quando disponível para não impactar a CPU do carregamento inicial
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(runPrefetch, { timeout: 2500 })
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(handle)
        }
      }
    } else {
      const timer = setTimeout(runPrefetch, 400)
      return () => clearTimeout(timer)
    }
  }, [profile, router])

  return null
}
