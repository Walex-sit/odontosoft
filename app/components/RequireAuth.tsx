'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { Session } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'dentista' | 'recepcao' | 'financeiro'

export interface UserProfile {
  id: string
  nome: string
  role: UserRole
}

interface AuthContextType {
  session: Session | null
  profile: UserProfile | null
}

const AuthContext = createContext<AuthContextType>({ session: null, profile: null })

export const useAuth = () => useContext(AuthContext)

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

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

      // Fetch user profile from public.user_profiles (RBAC)
      // Usando maybeSingle() para evitar erros se não houver perfil
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, nome, role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (mounted) {
        if (profileError) {
          console.error('[RequireAuth] Erro ao buscar perfil:', profileError.message)
        }

        const isDev = process.env.NODE_ENV === 'development'

        if (profileData) {
          setProfile(profileData as UserProfile)
        } else {
          // Tratar perfil nulo sem quebrar
          if (isDev) {
            console.warn('[RequireAuth] Perfil não encontrado no banco. Usando role padrão "admin" por estar em ambiente Local/Dev.')
            setProfile({
              id: session.user.id,
              nome: session.user.user_metadata?.full_name || session.user.email || 'Usuário Local',
              role: 'admin' 
            })
          } else {
            console.error('[RequireAuth] Perfil não encontrado no banco para o ID:', session.user.id)
            setProfile(null)
          }
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
  }, [router])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Aviso claro se o perfil não for encontrado em produção
  if (!profile && process.env.NODE_ENV !== 'development') {
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
            Seu usuário está autenticado, mas não encontramos um perfil associado em nosso sistema (user_profiles).
            Por favor, entre em contato com o administrador para habilitar seu acesso.
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
    <AuthContext.Provider value={{ session, profile }}>
      {children}
    </AuthContext.Provider>
  )
}
