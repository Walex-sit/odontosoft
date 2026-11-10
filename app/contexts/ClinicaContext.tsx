'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/RequireAuth'
import { getCached, setCached, invalidateCache } from '../lib/cache'

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
  const cachedClinica = getCached<ClinicaData>('clinica:info')
  const [clinica, setClinica] = useState<ClinicaData | null>(cachedClinica)
  const [loading, setLoading] = useState(cachedClinica === null)

  const fetchClinicaData = async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }

    try {
      // 1. Obter clinica_id do perfil do usuário autenticado (isolamento multi-tenant obrigatório)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('clinica_id')
        .eq('id', session.user.id)
        .maybeSingle()

      const targetClinicaId = profile?.clinica_id

      if (!targetClinicaId) {
        setClinica(null)
        setLoading(false)
        return
      }

      // 2. Buscar em paralelo os dados da clínica e as configurações de visualização
      const [clinicaRes, settingsRes] = await Promise.all([
        supabase
          .from('clinicas')
          .select('id, nome')
          .eq('id', targetClinicaId)
          .maybeSingle(),
        supabase
          .from('clinica_settings')
          .select('logo_url, nome_exibido')
          .eq('clinica_id', targetClinicaId)
          .maybeSingle(),
      ])

      const clinicInfo: ClinicaData = {
        id: clinicaRes.data?.id || targetClinicaId,
        nome: clinicaRes.data?.nome || '',
        logo_url: settingsRes.data?.logo_url || null,
        nome_exibido: settingsRes.data?.nome_exibido || null,
      }

      setCached('clinica:info', clinicInfo)
      setClinica(clinicInfo)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao buscar dados da clínica:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    fetchClinicaData()

    // Monitorar mudanças em clinicas
    const channelClinicas = supabase
      .channel('clinicas_changes_ctx')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'clinicas' },
        (payload: any) => {
          if (payload.new && mounted) {
            setClinica((prev) => {
              // Só atualiza se for a mesma clínica do usuário
              if (prev?.id && payload.new.id && payload.new.id !== prev.id) {
                return prev
              }
              const updated: ClinicaData = {
                id: payload.new.id || prev?.id || '',
                nome: payload.new.nome !== undefined ? payload.new.nome : (prev?.nome || ''),
                logo_url: prev?.logo_url || null,
                nome_exibido: prev?.nome_exibido || null,
              }
              setCached('clinica:info', updated)
              return updated
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
          if (payload.new && mounted) {
            setClinica((prev) => {
              if (prev?.id && payload.new.clinica_id && payload.new.clinica_id !== prev.id) {
                return prev
              }
              const updated: ClinicaData = {
                id: prev?.id || payload.new.clinica_id || '',
                nome: prev?.nome || '',
                logo_url: payload.new.logo_url !== undefined ? payload.new.logo_url : (prev?.logo_url || null),
                nome_exibido: payload.new.nome_exibido !== undefined ? payload.new.nome_exibido : (prev?.nome_exibido || null),
              }
              setCached('clinica:info', updated)
              return updated
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
  }, [session?.user?.id])

  const refreshClinica = async () => {
    invalidateCache('clinica:info')
    await fetchClinicaData()
  }

  return (
    <ClinicaContext.Provider value={{ clinica, loading, refreshClinica }}>
      {children}
    </ClinicaContext.Provider>
  )
}
