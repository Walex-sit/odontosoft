'use server'

/**
 * app/actions/prontuarios.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Operações do Prontuário Odontológico Eletrônico Imutável.
 *
 * Conformidade Normativa:
 *  ✅ Resolução CFO nº 198/2019 — Prontuário Eletrônico Odontológico:
 *     - Registros finalizados são 100% imutáveis (proibição de UPDATE e DELETE).
 *     - Retificações e correções ocorrem exclusivamente via ADENDOS vinculados
 *       ao registro original (Append-only audit trail).
 *  ✅ RLS e Triggers no PostgreSQL garantem defesa em profundidade.
 *  ✅ Multi-Tenancy: isolamento estrito por clinica_id.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'
import { logAction, LogAction } from '@/app/lib/logger'

export interface ProntuarioRegistro {
  id: string
  clinica_id: string | null
  paciente_id: string | null
  dentista_id: string | null
  descricao: string
  tratamento: string | null
  data_registro: string
  finalizado: boolean
  finalizado_em: string | null
  tipo_registro: 'registro_clinico' | 'adendo_retificativo' | 'adendo_esclarecimento'
  prontuario_origem_id: string | null
  versao_anterior_id: string | null
  status: 'registrada' | 'retificada' | 'cancelada'
  motivo_alteracao: string | null
  pacientes?: {
    id: string
    nome: string
  } | null
  dentista?: {
    nome: string
  } | null
  adendos?: ProntuarioRegistro[]
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Cria um novo registro de prontuário clínico.
 * Conforme Res. CFO 198/2019, o registro nasce finalizado e imutável.
 */
export async function criarProntuario(payload: {
  paciente_id: string
  descricao: string
  tratamento?: string | null
  _userId?: string
  _userNome?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!payload.paciente_id) {
    return { success: false, error: 'Identificador do paciente é obrigatório.' }
  }

  if (!payload.descricao?.trim()) {
    return { success: false, error: 'A evolução ou descrição clínica é obrigatória.' }
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado: faça login novamente.' }
  }

  const { data, error } = await supabase
    .from('prontuarios')
    .insert([{
      paciente_id: payload.paciente_id,
      dentista_id: user.id,
      descricao: payload.descricao.trim(),
      tratamento: payload.tratamento?.trim() || null,
      data_registro: new Date().toISOString(),
      finalizado: true,
      finalizado_em: new Date().toISOString(),
      tipo_registro: 'registro_clinico',
      status: 'registrada',
    }])
    .select('id')
    .single()

  if (error) {
    console.error('[prontuarios.criarProntuario] Erro:', error.message)
    return { success: false, error: error.message }
  }

  const actorId = payload._userId ?? user.id
  await logAction(
    actorId,
    'criacao' as LogAction,
    'prontuarios',
    {
      prontuario_id: data.id,
      paciente_id: payload.paciente_id,
      tratamento: payload.tratamento,
      cfo_conformidade: 'Res_198_2019',
    },
    payload._userNome
  )

  return { success: true, id: data.id }
}

/**
 * Cria um Adendo Clínico (retificativo ou de esclarecimento) vinculado a um
 * prontuário já existente, preservando 100% o registro histórico prévio (CFO).
 */
export async function criarAdendoProntuario(payload: {
  prontuario_origem_id: string
  descricao: string
  tipo_adendo?: 'adendo_retificativo' | 'adendo_esclarecimento'
  tratamento?: string | null
  _userId?: string
  _userNome?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!payload.prontuario_origem_id) {
    return { success: false, error: 'ID do prontuário original não informado.' }
  }

  if (!payload.descricao || payload.descricao.trim().length < 10) {
    return {
      success: false,
      error: 'A justificativa/descrição do adendo deve conter pelo menos 10 caracteres (CFO 198/2019).',
    }
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  // Executa a função RPC segura no PostgreSQL
  const { data: novoId, error: rpcError } = await supabase.rpc('criar_adendo_prontuario', {
    p_prontuario_origem_id: payload.prontuario_origem_id,
    p_descricao: payload.descricao.trim(),
    p_tipo_adendo: payload.tipo_adendo || 'adendo_retificativo',
    p_tratamento: payload.tratamento?.trim() || null,
  })

  if (rpcError) {
    console.error('[prontuarios.criarAdendoProntuario] Erro RPC:', rpcError.message)
    return { success: false, error: rpcError.message }
  }

  const actorId = payload._userId ?? user.id
  await logAction(
    actorId,
    'edicao' as LogAction,
    'prontuarios',
    {
      adendo_id: novoId,
      prontuario_origem_id: payload.prontuario_origem_id,
      tipo_adendo: payload.tipo_adendo || 'adendo_retificativo',
    },
    payload._userNome
  )

  return { success: true, id: novoId as string }
}

/**
 * Lista todos os prontuários da clínica, agrupando adendos sob os registros originais.
 */
export async function fetchProntuarios(
  pacienteId?: string
): Promise<ActionResult<ProntuarioRegistro[]>> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  let query = supabase
    .from('prontuarios')
    .select(`
      id,
      clinica_id,
      paciente_id,
      dentista_id,
      descricao,
      tratamento,
      data_registro,
      finalizado,
      finalizado_em,
      tipo_registro,
      prontuario_origem_id,
      versao_anterior_id,
      status,
      motivo_alteracao,
      pacientes ( id, nome )
    `)
    .order('data_registro', { ascending: false })

  if (pacienteId) {
    query = query.eq('paciente_id', pacienteId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[prontuarios.fetchProntuarios] Erro:', error.message)
    return { success: false, error: error.message }
  }

  const registros = (data || []) as unknown as ProntuarioRegistro[]

  // Separa os registros originais dos adendos
  const originaisMap = new Map<string, ProntuarioRegistro>()
  const adendosList: ProntuarioRegistro[] = []

  for (const reg of registros) {
    if (reg.prontuario_origem_id) {
      adendosList.push(reg)
    } else {
      originaisMap.set(reg.id, { ...reg, adendos: [] })
    }
  }

  // Anexa cada adendo ao seu respectivo original
  for (const adendo of adendosList) {
    if (adendo.prontuario_origem_id && originaisMap.has(adendo.prontuario_origem_id)) {
      originaisMap.get(adendo.prontuario_origem_id)!.adendos?.push(adendo)
    } else {
      // Se não encontrou o pai imediato, exibe na lista principal
      originaisMap.set(adendo.id, { ...adendo, adendos: [] })
    }
  }

  return { success: true, data: Array.from(originaisMap.values()) }
}
