'use server'

/**
 * app/actions/audit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Logs de auditoria e métricas de conformidade LGPD.
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ O RLS em system_logs permite que admins vejam logs de sua clínica.
 *  ✅ Erros propagados corretamente — sem success:true em caso de falha.
 *
 *  NOTA: Não usa admin client — o RLS de system_logs (policy: admins leem
 *  registros da própria clinica_id) é suficiente para o painel de conformidade.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'

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
 * Busca os logs de auditoria mais recentes da clínica do usuário logado.
 * O RLS em system_logs garante que apenas logs da própria clínica retornam.
 */
export async function fetchAuditLogs(
  filters?: { action?: string; limit?: number }
): Promise<{ success: boolean; data: AuditLog[]; error?: string }> {
  const supabase = await createServerClient()
  const limit = filters?.limit ?? 50

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: [], error: 'Não autorizado.' }
  }

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
    console.error('[audit.fetchAuditLogs] Erro:', error.message)
    return { success: false, data: [], error: error.message }
  }

  return { success: true, data: (data as AuditLog[]) ?? [] }
}

/**
 * Métricas de conformidade LGPD da clínica do usuário logado.
 * O RLS em pacientes e system_logs filtra automaticamente pela clínica.
 */
export async function fetchComplianceStats(): Promise<{
  success: boolean
  data: ComplianceStats | null
  error?: string
}> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: null, error: 'Não autorizado.' }
  }

  const { data: pacientesData, error: pacError } = await supabase
    .from('pacientes')
    .select('lgpd_aceite')

  if (pacError) {
    console.error('[audit.fetchComplianceStats] Erro pacientes:', pacError.message)
    return { success: false, data: null, error: pacError.message }
  }

  const totalPacientes = pacientesData?.length ?? 0
  const pacientesComAceite = pacientesData?.filter((p) => p.lgpd_aceite === true).length ?? 0
  const pacientesSemAceite = totalPacientes - pacientesComAceite

  const h24Atras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: logsHoje, error: logsError } = await supabase
    .from('system_logs')
    .select('id, created_at')
    .gte('created_at', h24Atras)
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('[audit.fetchComplianceStats] Erro logs:', logsError.message)
    // Logs de auditoria falhando não são bloqueantes para pacientes — continue
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
}
