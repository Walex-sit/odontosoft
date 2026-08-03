'use server'

import { supabase } from '@/app/lib/supabaseClient'

export async function createAgendamento(payload: any) {
  // Conflito de Horário
  // Buscar agendamentos do dentista no mesmo dia
  const { data: conflitos, error: conflitoError } = await supabase
    .from('agendamentos')
    .select('id, hora_consulta, hora_fim')
    .eq('dentista_id', payload.dentista_id)
    .eq('data_consulta', payload.data_consulta)
    .neq('status', 'cancelado')

  if (conflitoError) {
    return { success: false, error: 'Erro ao checar disponibilidade: ' + conflitoError.message }
  }

  // Verifica sobreposição de horários localmente (assumindo formato HH:mm)
  if (conflitos && conflitos.length > 0) {
    const newStart = payload.hora_consulta
    const newEnd = payload.hora_fim
    
    for (const ag of conflitos) {
      if (!ag.hora_fim) continue; // Pula legados sem hora fim
      const exStart = ag.hora_consulta
      const exEnd = ag.hora_fim
      
      // Lógica de sobreposição
      if (newStart < exEnd && newEnd > exStart) {
        return { success: false, error: 'Conflito de horário! O dentista selecionado já possui um agendamento neste horário.' }
      }
    }
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .insert([{
      paciente_id: payload.paciente_id,
      dentista_id: payload.dentista_id,
      data_consulta: payload.data_consulta,
      hora_consulta: payload.hora_consulta,
      hora_fim: payload.hora_fim,
      procedimento: payload.procedimento,
      observacoes: payload.observacoes,
      status: payload.status || 'agendado'
    }])
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

export async function updateAgendamentoStatus(id: string, status: string) {
  const { error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id)
    
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

export async function updateAgendamento(id: string, payload: any) {
  // Lógica similar de conflito se alterar data/hora
  const { data: conflitos, error: conflitoError } = await supabase
    .from('agendamentos')
    .select('id, hora_consulta, hora_fim')
    .eq('dentista_id', payload.dentista_id)
    .eq('data_consulta', payload.data_consulta)
    .neq('id', id)
    .neq('status', 'cancelado')

  if (!conflitoError && conflitos && conflitos.length > 0) {
    const newStart = payload.hora_consulta
    const newEnd = payload.hora_fim
    
    for (const ag of conflitos) {
      if (!ag.hora_fim) continue;
      const exStart = ag.hora_consulta
      const exEnd = ag.hora_fim
      
      if (newStart < exEnd && newEnd > exStart) {
        return { success: false, error: 'Conflito de horário na remarcação!' }
      }
    }
  }

  const { error } = await supabase
    .from('agendamentos')
    .update({
      dentista_id: payload.dentista_id,
      data_consulta: payload.data_consulta,
      hora_consulta: payload.hora_consulta,
      hora_fim: payload.hora_fim,
      procedimento: payload.procedimento,
      observacoes: payload.observacoes,
      status: payload.status
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
