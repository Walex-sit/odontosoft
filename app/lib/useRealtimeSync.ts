'use client'

import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabaseClient'

export function useRealtimeSync(onUpdate: () => void) {
  useEffect(() => {
    let channel: any = null

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      channel = supabase
        .channel('public-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agendamentos', // Mude para a tabela que deseja monitorar (ex: 'pacientes', 'financeiro')
          },
          (payload) => {
            console.log('Alteração em tempo real:', payload)
            onUpdate()
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [onUpdate])
}