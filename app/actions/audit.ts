'use server'

import { createClient } from '@supabase/supabase-js'

/**
 * Cria um cliente Supabase Admin com service role para bypassing RLS.
 * Necessário para que o painel de conformidade leia todos os logs da clínica.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('[Audit] Variáveis de ambiente Supabase ausentes.')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_nome: string | null
  action: string
  entity: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface ComplianceStats {
  totalPacientes: number
  pacientesComAceite: number
  pacientesSemAceite: number
  totalLogsHoje: number
  ultimoEvento: string | null
}

/**
 * Busca os logs de auditoria mais recentes, com filtro opcional por ação.
 *
 * @param filters.action - Tipo de ação para filtrar (ex: 'exclusao')
 * @param filters.limit  - Quantidade máxima de registros (padrão: 50)
 */
export async function fetchAuditLogs(
  filters?: { action?: string; limit?: number }
): Promise<{ success: boolean; data: AuditLog[]; error?: string }> {
  const supabase = getAdminClient()
  const limit = filters?.limit ?? 50

  try {
    let query = supabase
      .from('system_logs')
      .select('id, user_id, user_nome, action, entity, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters?.action) {
      query = query.eq('action', filters.action)
    }

    const { data, error } = await query

    if (error) {
      console.error('[fetchAuditLogs] Erro:', error.message)
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: (data as AuditLog[]) ?? [] }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[fetchAuditLogs] Exceção:', msg)
    return { success: false, data: [], error: msg }
  }
}

/**
 * Busca as métricas de conformidade LGPD para o painel de gestão:
 * - Total de pacientes cadastrados
 * - Pacientes com aceite LGPD registrado
 * - Pacientes sem consentimento (pendentes)
 * - Total de logs gerados nas últimas 24h
 * - Data/hora do último evento registrado
 */
export async function fetchComplianceStats(): Promise<{
  success: boolean
  data: ComplianceStats | null
  error?: string
}> {
  const supabase = getAdminClient()

  try {
    // Contagem total de pacientes e com aceite LGPD
    const { data: pacientesData, error: pacError } = await supabase
      .from('pacientes')
      .select('lgpd_aceite')

    if (pacError) {
      console.error('[fetchComplianceStats] Erro pacientes:', pacError.message)
      return { success: false, data: null, error: pacError.message }
    }

    const totalPacientes = pacientesData?.length ?? 0
    const pacientesComAceite = pacientesData?.filter((p) => p.lgpd_aceite === true).length ?? 0
    const pacientesSemAceite = totalPacientes - pacientesComAceite

    // Logs das últimas 24 horas
    const agora = new Date()
    const h24Atras = new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const { data: logsHoje, error: logsError } = await supabase
      .from('system_logs')
      .select('id, created_at')
      .gte('created_at', h24Atras)
      .order('created_at', { ascending: false })

    if (logsError) {
      console.error('[fetchComplianceStats] Erro logs:', logsError.message)
    }

    const totalLogsHoje = logsHoje?.length ?? 0
    const ultimoEvento = logsHoje && logsHoje.length > 0 ? logsHoje[0].created_at : null

    return {
      success: true,
      data: {
        totalPacientes,
        pacientesComAceite,
        pacientesSemAceite,
        totalLogsHoje,
        ultimoEvento,
      },
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[fetchComplianceStats] Exceção:', msg)
    return { success: false, data: null, error: msg }
  }
}
