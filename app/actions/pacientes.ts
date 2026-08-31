'use server'

/**
 * app/actions/pacientes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * FONTE ÚNICA DA VERDADE para operações de pacientes (T001 — Consolidação).
 *
 * Regras de segurança:
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ clinica_id NUNCA é confiado do frontend — o banco injeta via trigger
 *     set_clinica_id() e o RLS garante que cada usuário só vê/escreve na
 *     própria clínica.
 *  ✅ Erros são sempre propagados — nunca mascarados com success:true falso.
 *  ✅ Sem fallbacks silenciosos de schema (violação de T001).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'
import { logAction, LogAction } from '@/app/lib/logger'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Paciente {
  id: string
  clinica_id: string | null
  nome: string
  cpf: string | null
  rg: string | null
  data_nascimento: string | null
  genero: string | null
  telefone: string | null
  whatsapp: boolean | null
  email: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  endereco: string | null
  convenio: string | null
  lgpd_aceite: boolean | null
  lgpd_aceite_em: string | null
  created_at: string
  user_id: string | null
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── createPatient ────────────────────────────────────────────────────────────

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
  // Metadados de auditoria — não vão para o banco
  _userId?: string
  _userNome?: string
}): Promise<{ success: boolean; id?: string; error?: string; warning?: string }> {
  const { _userId, _userNome, ...dbPayload } = payload

  if (!dbPayload.nome?.trim()) {
    return { success: false, error: 'Nome do paciente é obrigatório.' }
  }

  const supabase = await createServerClient()

  // Verifica sessão — lança se não autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado: sessão inválida.' }
  }

  // clinica_id NÃO é enviado — o trigger set_clinica_id() no banco injeta
  // automaticamente o clinica_id do usuário logado. Segurança garantida.
  const { data, error } = await supabase
    .from('pacientes')
    .insert([{ ...dbPayload, user_id: user.id }])
    .select('id')
    .single()

  if (error) {
    console.error('[pacientes.createPatient] Erro:', error.message)
    return { success: false, error: error.message }
  }

  // Log de auditoria
  const actorId = _userId ?? user.id
  await logAction(
    actorId,
    'criacao' as LogAction,
    'pacientes',
    { nome: payload.nome, cpf: payload.cpf, lgpd_aceite: payload.lgpd_aceite, paciente_id: data.id },
    _userNome
  )

  return { success: true, id: data.id }
}

// ─── fetchPatients ─────────────────────────────────────────────────────────

export async function fetchPatients(): Promise<ActionResult<Paciente[]>> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { data, error } = await supabase
    .from('pacientes')
    .select('id, clinica_id, nome, cpf, rg, data_nascimento, genero, telefone, whatsapp, email, cep, rua, numero, bairro, cidade, endereco, convenio, lgpd_aceite, lgpd_aceite_em, created_at, user_id')
    .order('nome', { ascending: true })

  if (error) {
    console.error('[pacientes.fetchPatients] Erro:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, data: (data ?? []) as Paciente[] }
}

// ─── getPatientById ───────────────────────────────────────────────────────

export async function getPatientById(id: string): Promise<ActionResult<Paciente>> {
  if (!id) return { success: false, error: 'ID do paciente não informado.' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[pacientes.getPatientById] Erro:', error.message)
    return { success: false, error: error.message }
  }

  if (!data) {
    return { success: false, error: 'Paciente não encontrado.' }
  }

  return { success: true, data: data as Paciente }
}

// ─── updatePatient ────────────────────────────────────────────────────────

export async function updatePatient(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'ID do paciente não informado.' }

  const nome = (formData.get('nome') as string | null) ?? ''
  if (!nome.trim()) {
    return { success: false, error: 'Nome é obrigatório.' }
  }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const rawLgpdAceite = formData.get('lgpd_aceite')
  let lgpd_aceite: boolean | undefined = undefined
  let lgpd_aceite_em: string | null | undefined = undefined

  if (rawLgpdAceite !== null) {
    lgpd_aceite = rawLgpdAceite === 'true' || rawLgpdAceite === 'on' || rawLgpdAceite === '1'
    lgpd_aceite_em = lgpd_aceite ? new Date().toISOString() : null
  }

  const updatePayload: {
    nome: string
    cpf?: string | null
    rg?: string | null
    data_nascimento?: string | null
    genero?: string | null
    telefone?: string | null
    email?: string | null
    cep?: string | null
    rua?: string | null
    numero?: string | null
    bairro?: string | null
    cidade?: string | null
    endereco?: string | null
    convenio?: string | null
    lgpd_aceite?: boolean | null
    lgpd_aceite_em?: string | null
  } = {
    nome,
    cpf: (formData.get('cpf') as string) || null,
    rg: (formData.get('rg') as string) || null,
    data_nascimento: (formData.get('data_nascimento') as string) || null,
    genero: (formData.get('genero') as string) || null,
    telefone: (formData.get('telefone') as string) || null,
    email: (formData.get('email') as string) || null,
    cep: (formData.get('cep') as string) || null,
    rua: (formData.get('rua') as string) || null,
    numero: (formData.get('numero') as string) || null,
    bairro: (formData.get('bairro') as string) || null,
    cidade: (formData.get('cidade') as string) || null,
    endereco: (formData.get('endereco') as string) || null,
    convenio: (formData.get('convenio') as string) || null,
    ...(lgpd_aceite !== undefined ? { lgpd_aceite, lgpd_aceite_em } : {}),
  }

  const { error } = await supabase
    .from('pacientes')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    console.error('[pacientes.updatePatient] Erro:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ─── regularizarLgpd ───────────────────────────────────────────────────────

export async function regularizarLgpd(
  id: string,
  aceito: boolean = true,
  _userId?: string,
  _userNome?: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'ID do paciente não informado.' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const payload = {
    lgpd_aceite: aceito,
    lgpd_aceite_em: aceito ? new Date().toISOString() : null,
  }

  const { error } = await supabase
    .from('pacientes')
    .update(payload)
    .eq('id', id)

  if (error) {
    console.error('[pacientes.regularizarLgpd] Erro:', error.message)
    return { success: false, error: error.message }
  }

  const actorId = _userId ?? user.id
  await logAction(
    actorId,
    'edicao' as LogAction,
    'pacientes',
    { paciente_id: id, lgpd_aceite: aceito, regularizacao: true },
    _userNome
  )

  return { success: true }
}

// ─── deletePatient ────────────────────────────────────────────────────────

export async function deletePatient(
  id: string,
  actorId?: string,
  actorNome?: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: 'ID do paciente não informado.' }

  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  // Verificação de role no servidor — apenas admin pode excluir
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Apenas administradores podem excluir pacientes.' }
  }

  const { error } = await supabase
    .from('pacientes')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[pacientes.deletePatient] Erro:', error.message)
    return { success: false, error: error.message }
  }

  if (actorId) {
    await logAction(actorId, 'exclusao', 'pacientes', { paciente_id: id }, actorNome)
  }

  return { success: true }
}
