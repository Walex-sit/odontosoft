'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabaseClient'
import LoginView from './components/LoginView'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/overview')
      }
    })
  }, [router])

  return <LoginView />
}
