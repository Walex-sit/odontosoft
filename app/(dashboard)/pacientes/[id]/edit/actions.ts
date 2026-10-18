'use server'

import { supabase } from '@/app/lib/supabaseClient'

export interface Patient {
  id: string
  clinica_id?: string
  nome: string
  telefone?: string | null
  email?: string | null
  data_nascimento?: string | null
  observacoes?: string | null
  cpf_hash?: string | null
  cpf_encrypted?: string | null
  lgpd_aceite?: boolean | null
  lgpd_aceite_em?: string | null
  created_at?: string
  user_id?: string | null
  cep?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  genero?: string | null
  whatsapp?: string | null
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, clinica_id, nome, telefone, email, data_nascimento, observacoes, cpf_hash, cpf_encrypted, lgpd_aceite, lgpd_aceite_em, created_at, user_id, cep, rua, numero, bairro, cidade, genero, whatsapp')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching patient:', error.message, error.details)
    return null
  }

  return data as Patient
}