'use server'

import { supabase } from '@/app/lib/supabaseClient'
import { logAction } from '@/app/lib/logger'

export async function createPatient(payload: {
  nome: string
  cpf?: string | null
  rg?: string | null
  data_nascimento?: string | null
  genero?: string | null
  telefone?: string | null
  whatsapp?: boolean
  email?: string | null
  cep?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  lgpd_aceite?: boolean
  lgpd_aceite_em?: string | null
  // userId e userNome são opcionais — passados pelo componente para o log
  _userId?: string
  _userNome?: string
}) {
  // Separar metadados de auditoria do payload do banco
  const { _userId, _userNome, ...dbPayload } = payload

  // Tenta inserir todos os campos solicitados
  const { data, error } = await supabase
    .from('pacientes')
    .insert([dbPayload])
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

      // Log de auditoria — criação via fallback
      if (_userId) {
        await logAction(
          _userId,
          'criacao',
          'pacientes',
          { nome: payload.nome, cpf: payload.cpf, fallback: true },
          _userNome
        )
      }

      return {
        success: true,
        warning: 'Alguns campos estendidos não existem no banco. Salvando dados básicos...',
        id: fallbackRes.data.id,
      }
    }

    return { success: false, error: error.message }
  }

  // Log de auditoria — criação bem-sucedida
  if (_userId) {
    await logAction(
      _userId,
      'criacao',
      'pacientes',
      {
        nome: payload.nome,
        cpf: payload.cpf,
        lgpd_aceite: payload.lgpd_aceite,
        paciente_id: data.id,
      },
      _userNome
    )
  }

  return { success: true, id: data.id }
}
