'use client'

/**
 * app/components/RequireAuth.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provedor de autenticação e RBAC no lado do cliente.
 *
 * Segurança (T001):
 *  ✅ Role e clinica_id obtidos estritamente da tabela user_profiles via RLS.
 *  ✅ Sem bypass ou criação silenciosa de perfis admin não autorizados.
 *  ✅ Expõe isSuperAdmin / isLifetime para isenção do Trial Guard.
 *  ✅ Expõe trialInfo (diasRestantes, expirado) para banners no dashboard.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { Session } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'admin_clinica' | 'dentista' | 'recepcao' | 'financeiro' | 'super_admin'

export interface UserProfile {
  id: string
  nome: string
  role: UserRole
  clinica_id?: string | null
  is_lifetime?: boolean
}

export interface TrialInfo {
  isTrial: boolean
  diasRestantes: number
  expirado: boolean
  trialEndsAt: string | null
}

interface AuthContextType {
  session: Session | null
  profile: UserProfile | null
  trialInfo: TrialInfo | null
  isSuperAdmin: boolean
  isLifetime: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  trialInfo: null,
  isSuperAdmin: false,
  isLifetime: false,
  refreshProfile: async () => {}
})

export const useAuth = () => useContext(AuthContext)

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  // R-004 (Auditoria Etapa 4): fallback hardcoded 'testealex@gmail.com' removido.
  // No cliente, NEXT_PUBLIC_OWNER_EMAIL é opcional. Sem a variável configurada,
  // isOwnerExactMatch é sempre false e o acesso especial depende apenas de
  // is_lifetime=true ou role='super_admin' vindos do banco de dados.
  const configuredOwnerEmail = (process.env.NEXT_PUBLIC_OWNER_EMAIL || '').toLowerCase().trim()
  const isOwnerExactMatch = Boolean(
    configuredOwnerEmail &&
    session?.user?.email &&
    session.user.email.toLowerCase().trim() === configuredOwnerEmail &&
    (profile?.role === 'super_admin' || profile?.is_lifetime === true)
  )
  const isSuperAdmin = profile?.role === 'super_admin'
  const isLifetime = profile?.is_lifetime === true || isOwnerExactMatch

  async function refreshProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('id, nome, role, clinica_id, is_lifetime')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileData) {
      setProfile(profileData as UserProfile)
      await fetchTrialInfo(profileData.clinica_id)
    }
  }

  async function fetchTrialInfo(clinicaId?: string | null) {
    if (!clinicaId) {
      setTrialInfo(null)
      return
    }

    const { data: clinica } = await supabase
      .from('clinicas')
      .select('status_assinatura, trial_ends_at')
      .eq('id', clinicaId)
      .maybeSingle()

    if (!clinica) {
      setTrialInfo(null)
      return
    }

    if (clinica.status_assinatura === 'trial' && clinica.trial_ends_at) {
      const agora = new Date()
      const fimTrial = new Date(clinica.trial_ends_at)
      const diffMs = fimTrial.getTime() - agora.getTime()
      const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      const expirado = diffMs <= 0

      setTrialInfo({
        isTrial: true,
        diasRestantes,
        expirado,
        trialEndsAt: clinica.trial_ends_at,
      })
    } else {
      setTrialInfo({
        isTrial: false,
        diasRestantes: 0,
        expirado: false,
        trialEndsAt: null,
      })
    }
  }

  useEffect(() => {
    let mounted = true

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      if (!session) {
        router.replace('/login')
        return
      }

      setSession(session)

      // Fetch user profile from public.user_profiles (RBAC) via RLS
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, nome, role, clinica_id, is_lifetime')
        .eq('id', session.user.id)
        .maybeSingle()

      if (mounted) {
        if (profileError) {
          console.error('[RequireAuth] Erro ao buscar perfil:', profileError.message)
        }

        if (profileData) {
          setProfile(profileData as UserProfile)
          await fetchTrialInfo(profileData.clinica_id)
        } else {
          console.error('[RequireAuth] Perfil não encontrado no banco para o ID:', session.user.id)
          setProfile(null)
        }
        setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace('/login')
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Aviso claro se o perfil não for encontrado
  if (!profile) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="bg-slate-900 p-8 rounded-lg border border-slate-800 max-w-md shadow-xl">
          <div className="text-amber-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-slate-400 mb-6">
            Seu usuário está autenticado, mas não encontramos um perfil ativo associado em nosso sistema (user_profiles).
            Por favor, entre em contato com o administrador da sua clínica para habilitar seu acesso.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
          >
            Sair e tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ session, profile, trialInfo, isSuperAdmin, isLifetime, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
