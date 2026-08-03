'use server'

import { supabase } from '@/app/lib/supabaseClient'

export async function createPatient(payload: any) {
  // Tenta inserir todos os campos solicitados
  const { data, error } = await supabase
    .from('pacientes')
    .insert([payload])
    .select('id')
    .single()

  if (error) {
    // Se der erro de coluna inexistente, fazemos fallback apenas para as colunas originais conhecidas
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      const fallbackPayload = {
        nome: payload.nome,
        cpf: payload.cpf || null,
        telefone: payload.telefone || null,
        email: payload.email || null,
      }
      
      const fallbackRes = await supabase
        .from('pacientes')
        .insert([fallbackPayload])
        .select('id')
        .single()
        
      if (fallbackRes.error) {
        return { success: false, error: fallbackRes.error.message }
      }
      return { success: true, warning: 'Alguns campos estendidos não existem no banco. Salvando dados básicos...', id: fallbackRes.data.id }
    }
    
    return { success: false, error: error.message }
  }

  return { success: true, id: data.id }
}
