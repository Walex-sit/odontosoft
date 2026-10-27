'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/RequireAuth'

interface ClinicaData {
  id: string
  nome: string
  logo_url: string | null
  /** Nome visual exibido na Topbar — desacoplado da Razão Social */
  nome_exibido: string | null
}

interface ClinicaContextType {
  clinica: ClinicaData | null
  loading: boolean
  refreshClinica: () => Promise<void>
}

const ClinicaContext = createContext<ClinicaContextType>({
  clinica: null,
  loading: true,
  refreshClinica: async () => {},
})

export const useClinica = () => useContext(ClinicaContext)

export function ClinicaProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [clinica, setClinica] = useState<ClinicaData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function fetchClinicaData() {
      if (!session) {
        if (mounted) setLoading(false)
        return
      }

      try {
        // 1. Obter clinica_id do perfil do usuário autenticado
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('clinica_id')
          .eq('id', session.user.id)
          .maybeSingle()

        const targetClinicaId = profile?.clinica_id

        // 2. Buscar dados da clínica específica do usuário
        let clinicaQuery = supabase.from('clinicas').select('id, nome')
        if (targetClinicaId) {
          clinicaQuery = clinicaQuery.eq('id', targetClinicaId)
        }
        const { data: clinicaData } = await clinicaQuery.limit(1).maybeSingle()

        // 3. Buscar configurações da clínica do usuário
        let settingsQuery = supabase.from('clinica_settings').select('logo_url, nome_exibido')
        if (targetClinicaId) {
          settingsQuery = settingsQuery.eq('clinica_id', targetClinicaId)
        }
        const { data: settingsData } = await settingsQuery.limit(1).maybeSingle()

        if (mounted) {
          setClinica({
            id: clinicaData?.id || '',
            nome: clinicaData?.nome || '',
            logo_url: settingsData?.logo_url || null,
            nome_exibido: settingsData?.nome_exibido || null,
          })
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro ao buscar dados da clínica:', error)
        if (mounted) setLoading(false)
      }
    }

    fetchClinicaData()

    // Monitorar mudanças em clinicas
    const channelClinicas = supabase
      .channel('clinicas_changes_ctx')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clinicas' },
        (payload: any) => {
          if (payload.new && payload.new.nome !== undefined) {
            setClinica((prev) => {
              // Só atualiza se for a mesma clínica do utilizador
              if (prev?.id && payload.new.id && payload.new.id !== prev.id) {
                return prev
              }
              return {
                id: payload.new.id || prev?.id || '',
                nome: payload.new.nome,
                logo_url: prev?.logo_url || null,
                nome_exibido: prev?.nome_exibido || null,
              }
            })
          }
        }
      )
      .subscribe()

    // Monitorar mudanças em clinica_settings
    const channelSettings = supabase
      .channel('clinica_settings_changes_ctx')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinica_settings' },
        (payload: any) => {
          if (payload.new) {
            setClinica((prev) => {
              if (prev?.id && payload.new.clinica_id && payload.new.clinica_id !== prev.id) {
                return prev
              }
              return {
                id: prev?.id || '',
                nome: prev?.nome || '',
                logo_url: payload.new.logo_url !== undefined ? payload.new.logo_url : (prev?.logo_url || null),
                nome_exibido: payload.new.nome_exibido !== undefined ? payload.new.nome_exibido : (prev?.nome_exibido || null),
              }
            })
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channelClinicas)
      supabase.removeChannel(channelSettings)
    }
  }, [session])

  const refreshClinica = async () => {
    if (!session) return
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('clinica_id')
        .eq('id', session.user.id)
        .maybeSingle()

      const targetClinicaId = profile?.clinica_id

      let clinicaQuery = supabase.from('clinicas').select('id, nome')
      if (targetClinicaId) {
        clinicaQuery = clinicaQuery.eq('id', targetClinicaId)
      }
      const { data: clinicaData } = await clinicaQuery.limit(1).maybeSingle()

      let settingsQuery = supabase.from('clinica_settings').select('logo_url, nome_exibido')
      if (targetClinicaId) {
        settingsQuery = settingsQuery.eq('clinica_id', targetClinicaId)
      }
      const { data: settingsData } = await settingsQuery.limit(1).maybeSingle()

      setClinica({
        id: clinicaData?.id || '',
        nome: clinicaData?.nome || '',
        logo_url: settingsData?.logo_url || null,
        nome_exibido: settingsData?.nome_exibido || null,
      })
    } catch (err) {
      console.error('Erro no refreshClinica:', err)
    }
  }

  return (
    <ClinicaContext.Provider value={{ clinica, loading, refreshClinica }}>
      {children}
    </ClinicaContext.Provider>
  )
}
