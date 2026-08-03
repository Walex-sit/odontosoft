'use server'

import { createClient } from '@supabase/supabase-js'
import { supabase as defaultClient } from '@/app/lib/supabaseClient'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return defaultClient
}

export async function createAgendamento(payload: any) {
  const supabase = getClient()

  // 1. Checagem de Conflito de Horário resiliente a colunas faltantes
  let conflitos: any[] = []
  const { data: conflitosData, error: conflitoError } = await supabase
    .from('agendamentos')
    .select('id, hora_consulta, hora_fim')
    .eq('dentista_id', payload.dentista_id)
    .eq('data_consulta', payload.data_consulta)
    .neq('status', 'cancelado')

  if (conflitoError && (conflitoError.message.includes('hora_fim') || conflitoError.message.includes('column'))) {
    // Se a coluna hora_fim ainda não existe no banco, busca sem ela
    const { data: fallbackData } = await supabase
      .from('agendamentos')
      .select('id, hora_consulta')
      .eq('dentista_id', payload.dentista_id)
      .eq('data_consulta', payload.data_consulta)
      .neq('status', 'cancelado')
    conflitos = fallbackData || []
  } else {
    conflitos = conflitosData || []
  }

  // Verifica sobreposição de horários localmente se hora_fim estiver disponível
  if (conflitos.length > 0 && payload.hora_fim) {
    const newStart = payload.hora_consulta
    const newEnd = payload.hora_fim
    
    for (const ag of conflitos) {
      if (!ag.hora_fim) continue
      const exStart = ag.hora_consulta
      const exEnd = ag.hora_fim
      
      if (newStart < exEnd && newEnd > exStart) {
        return { success: false, error: 'Conflito de horário! O dentista selecionado já possui um agendamento neste horário.' }
      }
    }
  }

  // 2. Tenta inserir todos os campos
  const insertData: any = {
    paciente_id: payload.paciente_id,
    dentista_id: payload.dentista_id,
    data_consulta: payload.data_consulta,
    hora_consulta: payload.hora_consulta,
    hora_fim: payload.hora_fim,
    procedimento: payload.procedimento,
    observacoes: payload.observacoes,
    status: payload.status || 'agendado'
  }

  const { data, error } = await supabase
    .from('agendamentos')
    .insert([insertData])
    .select('id')
    .single()

  if (error) {
    // Se falhar por causa de coluna inexistente no Supabase, tenta sem as colunas novas
    if (error.message.includes('hora_fim') || error.message.includes('observacoes') || error.message.includes('column')) {
      delete insertData.hora_fim
      delete insertData.observacoes
      
      const { data: fbData, error: fbError } = await supabase
        .from('agendamentos')
        .insert([insertData])
        .select('id')
        .single()

      if (fbError) {
        return { success: false, error: fbError.message }
      }
      return { success: true, id: fbData.id }
    }

    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}

export async function updateAgendamentoStatus(id: string, status: string) {
  const supabase = getClient()
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
  const supabase = getClient()
  const updateData: any = {
    dentista_id: payload.dentista_id,
    data_consulta: payload.data_consulta,
    hora_consulta: payload.hora_consulta,
    hora_fim: payload.hora_fim,
    procedimento: payload.procedimento,
    observacoes: payload.observacoes,
    status: payload.status
  }

  const { error } = await supabase
    .from('agendamentos')
    .update(updateData)
    .eq('id', id)

  if (error) {
    if (error.message.includes('hora_fim') || error.message.includes('observacoes') || error.message.includes('column')) {
      delete updateData.hora_fim
      delete updateData.observacoes

      const { error: fbError } = await supabase
        .from('agendamentos')
        .update(updateData)
        .eq('id', id)

      if (fbError) {
        return { success: false, error: fbError.message }
      }
      return { success: true }
    }

    return { success: false, error: error.message }
  }
  return { success: true }
}
