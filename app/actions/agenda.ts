'use server'

/**
 * app/actions/agenda.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciamento de agendamentos.
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ clinica_id injetado pelo banco via trigger set_clinica_id().
 *  ✅ Sem fallback de schema — erros de coluna inexistente são propagados.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'

export interface AgendamentoPayload {
  paciente_id: string
  dentista_id: string
  data_consulta: string
  hora_consulta: string
  hora_fim?: string | null
  procedimento?: string | null
  observacoes?: string | null
  status?: string
}

export async function createAgendamento(
  payload: AgendamentoPayload
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado: sessão inválida.' }
  }

  // 1. Checagem de conflito de horário — sem fallback de schema
  const { data: conflitosData, error: conflitoError } = await supabase
    .from('agendamentos')
    .select('id, hora_consulta, hora_fim')
    .eq('dentista_id', payload.dentista_id)
    .eq('data_consulta', payload.data_consulta)
    .neq('status', 'cancelado')

  if (conflitoError) {
    console.error('[agenda.createAgendamento] Erro ao verificar conflitos:', conflitoError.message)
    return { success: false, error: conflitoError.message }
  }

  const conflitos = conflitosData ?? []

  // Verifica sobreposição de horários se hora_fim estiver disponível
  if (conflitos.length > 0 && payload.hora_fim) {
    const newStart = payload.hora_consulta
    const newEnd = payload.hora_fim

    for (const ag of conflitos) {
      if (!ag.hora_fim) continue
      if (newStart < ag.hora_fim && newEnd > ag.hora_consulta) {
        return {
          success: false,
          error: 'Conflito de horário! O dentista selecionado já possui um agendamento neste horário.',
        }
      }
    }
  }

  // 2. Insere o agendamento — clinica_id injetado pelo trigger no banco
  const { data, error } = await supabase
    .from('agendamentos')
    .insert([{
      paciente_id: payload.paciente_id,
      dentista_id: payload.dentista_id,
      data_consulta: payload.data_consulta,
      hora_consulta: payload.hora_consulta,
      hora_fim: payload.hora_fim ?? null,
      procedimento: payload.procedimento ?? null,
      observacoes: payload.observacoes ?? null,
      status: payload.status ?? 'agendado',
    }])
    .select('id')
    .single()

  if (error) {
    console.error('[agenda.createAgendamento] Erro:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

export async function updateAgendamentoStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'ID de agendamento não informado.' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('[agenda.updateAgendamentoStatus] Erro:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateAgendamento(
  id: string,
  payload: AgendamentoPayload
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'ID de agendamento não informado.' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { error } = await supabase
    .from('agendamentos')
    .update({
      dentista_id: payload.dentista_id,
      data_consulta: payload.data_consulta,
      hora_consulta: payload.hora_consulta,
      hora_fim: payload.hora_fim ?? null,
      procedimento: payload.procedimento ?? null,
      observacoes: payload.observacoes ?? null,
      status: payload.status,
    })
    .eq('id', id)

  if (error) {
    console.error('[agenda.updateAgendamento] Erro:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}
