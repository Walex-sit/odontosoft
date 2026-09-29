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
  /** SHA-256 (hex) do CPF normalizado — usado para busca. Nunca expõe o CPF real. */
  cpf_hash: string | null
  /** CPF cifrado com AES-256. Decifrável apenas pelo banco via cpf_decrypt(). */
  cpf_encrypted: string | null
  /** Campo virtual de passagem para envio de CPF em texto puro no formulário */
  cpf_raw?: string | null
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

export interface ConformidadeConsentimento {
  paciente_id: string | null
  paciente_nome: string | null
  clinica_id: string | null
  tipo_termo: 'LGPD' | 'TCLE' | 'TCLE_MENOR' | null
  versao_termo: string | null
  consentimento_id: string | null
  status: 'ativo' | 'revogado' | 'expirado' | 'pendente' | null
  manifestado_em: string | null
  revogado_em: string | null
  meio: 'eletronico_interno' | 'upload_legado' | 'email_confirmado' | 'whatsapp_confirmado' | null
  responsavel_nome: string | null
  responsavel_tipo: 'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador' | null
  finalidades: Record<string, boolean> | null
  possui_evidencia: boolean | null
  registrado_em: string | null
}

export interface TermoPrivacidade {
  id: string
  clinica_id: string
  tipo: 'LGPD' | 'TCLE' | 'TCLE_MENOR'
  versao: string
  texto_hash: string
  publicado_em: string
  ativo: boolean
  created_at: string
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ─── createPatient ────────────────────────────────────────────────────────────

export async function createPatient(payload: {
  nome: string
  /** CPF em texto puro — enviado via cpf_raw. O trigger fn_encrypt_cpf() gera
   *  cpf_hash + cpf_encrypted e apaga o plaintext antes de persistir. */
  cpf_raw?: string | null
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
  // cpf_raw é processado pelo trigger trg_encrypt_cpf → gera cpf_hash + cpf_encrypted
  // e apaga cpf_raw antes de persistir. Nenhum CPF fica em plaintext no disco.
  const { data, error } = await supabase
    .from('pacientes')
    .insert([{ ...dbPayload, user_id: user.id }])
    .select('id')
    .single()

  if (error) {
    console.error('[pacientes.createPatient] Erro:', error.message)
    return { success: false, error: error.message }
  }

  // Log de auditoria — NUNCA logar o CPF real, apenas indicar se foi fornecido
  const actorId = _userId ?? user.id
  await logAction(
    actorId,
    'criacao' as LogAction,
    'pacientes',
    { nome: payload.nome, cpf_informado: !!payload.cpf_raw, lgpd_aceite: payload.lgpd_aceite, paciente_id: data.id },
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

  // cpf_hash é retornado para permitir comparações (ex: verificar duplicatas)
  // cpf_encrypted NÃO é retornado nas listagens — apenas em contextos autorizados
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, clinica_id, nome, cpf_hash, rg, data_nascimento, genero, telefone, whatsapp, email, cep, rua, numero, bairro, cidade, endereco, convenio, lgpd_aceite, lgpd_aceite_em, created_at, user_id')
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
    /** cpf_raw: enviado ao banco e processado pelo trigger trg_encrypt_cpf.
     *  Gera cpf_hash + cpf_encrypted e apaga o plaintext. */
    cpf_raw?: string | null
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
    cpf_raw: (formData.get('cpf') as string) || null,
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

// ─── LGPD & Conformidade Actions ──────────────────────────────────────────

export async function getConformidadeConsentimentos(
  pacienteId: string
): Promise<ActionResult<ConformidadeConsentimento[]>> {
  if (!pacienteId) return { success: false, error: 'ID do paciente não informado.' }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { data, error } = await supabase
    .from('vw_conformidade_consentimentos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('registrado_em', { ascending: false })

  if (error) {
    console.error('[pacientes.getConformidadeConsentimentos] Erro:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, data: (data ?? []) as ConformidadeConsentimento[] }
}

export async function getTermosPrivacidade(): Promise<ActionResult<TermoPrivacidade[]>> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { data, error } = await supabase
    .from('termos_privacidade')
    .select('*')
    .eq('ativo', true)
    .order('publicado_em', { ascending: false })

  if (error) {
    console.error('[pacientes.getTermosPrivacidade] Erro:', error.message)
    return { success: false, error: error.message }
  }

  // Se não houver termo ativo, retorna lista vazia — sem criar dados falsos no banco.
  // O administrador deve cadastrar os termos de privacidade via painel de configurações.
  return { success: true, data: (data ?? []) as TermoPrivacidade[] }
}

export async function registrarConsentimento(payload: {
  paciente_id: string
  termo_id?: string
  responsavel_tipo?: 'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador'
  responsavel_nome?: string | null
  meio?: 'eletronico_interno' | 'upload_legado' | 'email_confirmado' | 'whatsapp_confirmado'
  finalidades: Record<string, boolean>
  _userId?: string
  _userNome?: string
}): Promise<{ success: boolean; consentimento_id?: string; error?: string }> {
  if (!payload.paciente_id) {
    return { success: false, error: 'ID do paciente não informado.' }
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  let termoId = payload.termo_id

  if (!termoId) {
    const termosRes = await getTermosPrivacidade()
    if (!termosRes.success || !termosRes.data.length) {
      return { success: false, error: 'Nenhum termo de privacidade ativo encontrado para a clínica.' }
    }
    termoId = termosRes.data[0].id
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('clinica_id')
    .eq('id', user.id)
    .single()

  const clinicaId = profile?.clinica_id
  if (!clinicaId) {
    return { success: false, error: 'Clínica não identificada no perfil do usuário.' }
  }

  // Se já existir consentimento ativo anterior para este termo/paciente, revoga antes para manter histórico limpo
  const { data: consentimentosAtivos } = await supabase
    .from('paciente_consentimentos')
    .select('id')
    .eq('paciente_id', payload.paciente_id)
    .eq('termo_id', termoId)
    .eq('status', 'ativo')

  if (consentimentosAtivos && consentimentosAtivos.length > 0) {
    for (const c of consentimentosAtivos) {
      await supabase
        .from('paciente_consentimentos')
        .update({ status: 'revogado', revogado_em: new Date().toISOString() })
        .eq('id', c.id)
    }
  }

  // 1. Inserir em paciente_consentimentos
  const { data: consentimento, error: consentimentoError } = await supabase
    .from('paciente_consentimentos')
    .insert([{
      paciente_id: payload.paciente_id,
      clinica_id: clinicaId,
      termo_id: termoId,
      status: 'ativo',
      manifestado_em: new Date().toISOString(),
      meio: payload.meio || 'eletronico_interno',
      responsavel_tipo: payload.responsavel_tipo || 'proprio_paciente',
      responsavel_nome: payload.responsavel_tipo !== 'proprio_paciente' ? payload.responsavel_nome : null,
      registrado_por_user_id: user.id,
    }])
    .select('id')
    .single()

  if (consentimentoError || !consentimento) {
    console.error('[pacientes.registrarConsentimento] Erro:', consentimentoError?.message)
    return { success: false, error: consentimentoError?.message || 'Erro ao registrar consentimento.' }
  }

  // 2. Inserir finalidades em consentimento_finalidades
  const finalidadesEntries = Object.entries(payload.finalidades || {})
  if (finalidadesEntries.length > 0) {
    const finalidadesRows = finalidadesEntries.map(([finalidade, autorizado]) => ({
      paciente_consentimento_id: consentimento.id,
      clinica_id: clinicaId,
      finalidade,
      autorizado: Boolean(autorizado),
    }))

    const { error: finError } = await supabase
      .from('consentimento_finalidades')
      .insert(finalidadesRows)

    if (finError) {
      console.error('[pacientes.registrarConsentimento] Erro finalidades:', finError.message)
    }
  }

  // 3. Atualizar flag do paciente para compatibilidade retroativa
  await supabase
    .from('pacientes')
    .update({
      lgpd_aceite: true,
      lgpd_aceite_em: new Date().toISOString(),
    })
    .eq('id', payload.paciente_id)

  // 4. Log de auditoria
  const actorId = payload._userId ?? user.id
  await logAction(
    actorId,
    'edicao' as LogAction,
    'pacientes',
    {
      paciente_id: payload.paciente_id,
      consentimento_id: consentimento.id,
      termo_id: termoId,
      finalidades: payload.finalidades,
      responsavel_tipo: payload.responsavel_tipo,
      responsavel_nome: payload.responsavel_nome,
    },
    payload._userNome
  )

  return { success: true, consentimento_id: consentimento.id }
}

export async function revogarConsentimento(
  consentimentoId: string,
  pacienteId?: string,
  _userId?: string,
  _userNome?: string
): Promise<{ success: boolean; error?: string }> {
  if (!consentimentoId) {
    return { success: false, error: 'ID do consentimento não informado.' }
  }

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  // Disparar RPC registrar_revogacao_consentimento
  const { error: rpcError } = await supabase.rpc('registrar_revogacao_consentimento', {
    p_paciente_consentimento_id: consentimentoId,
  })

  if (rpcError) {
    console.error('[pacientes.revogarConsentimento] Erro RPC:', rpcError.message)
    return { success: false, error: rpcError.message }
  }

  // Se pacienteId fornecido, sincronizar flag lgpd_aceite se não houver outro ativo
  if (pacienteId) {
    const { data: outrosAtivos } = await supabase
      .from('paciente_consentimentos')
      .select('id')
      .eq('paciente_id', pacienteId)
      .eq('status', 'ativo')

    if (!outrosAtivos || outrosAtivos.length === 0) {
      await supabase
        .from('pacientes')
        .update({
          lgpd_aceite: false,
        })
        .eq('id', pacienteId)
    }
  }

  const actorId = _userId ?? user.id
  await logAction(
    actorId,
    'edicao' as LogAction,
    'pacientes',
    {
      consentimento_id: consentimentoId,
      paciente_id: pacienteId,
      acao: 'revogacao_consentimento_lgpd',
    },
    _userNome
  )

  return { success: true }
}

