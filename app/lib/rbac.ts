"use server"

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
