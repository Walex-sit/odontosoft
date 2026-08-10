'use client'

import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabaseClient'

export function useRealtimeSync(onUpdate: () => void) {
  useEffect(() => {
    let channel: any = null

    const setupRealtime = async () => {
      // Verifica se existe uma sessão ativa antes de abrir o WebSocket
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      // Cria a escuta em tempo real para a tabela desejada
      channel = supabase
        .channel('public-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Escuta INSERT, UPDATE e DELETE
            schema: 'public',
            table: 'agendamentos', // Altere para a tabela que deseja monitorar (ex: 'pacientes')
          },
          (payload) => {
            console.log('Alteração em tempo real detectada:', payload)
            onUpdate() // Executa a função para atualizar os dados na tela
          }
        )
        .subscribe()
    }

    setupRealtime()

    // Limpa o canal quando o componente for fechado
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [onUpdate])
}