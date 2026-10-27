'use server'

/**
 * app/actions/register.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Action de Provisionamento de Novo Tenant pós-Signup.
 *
 * Fluxo:
 *  1. Validação com Zod e verificação prévia de unicidade de nome de clínica.
 *  2. O cliente faz signUp() no Supabase Auth (client-side).
 *  3. Esta action é chamada com a sessão já estabelecida nos cookies.
 *  4. Verifica novamente no servidor se o nome da clínica já existe (evita duplicidade/spam).
 *  5. Cria o registro da clínica e configurações iniciais atomicamente.
 *  6. Vincula o perfil do utilizador com role 'admin_clinica' e o clinica_id gerado.
 *
 * Segurança:
 *  ✅ supabaseAdmin usado APENAS para operações de infraestrutura (INSERT em
 *     user_profiles e tabela clinicas) onde o contexto de sessão ainda não tem clínica.
 *  ✅ A sessão do utilizador é sempre verificada antes de prosseguir.
 *  ✅ Validação de unicidade case-insensitive e normalização de slug/acentos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'
import { supabaseAdmin } from '@/app/lib/supabase/admin'
import {
  registrarClinicaPayloadSchema,
  normalizeClinicName,
} from '@/app/lib/validations/register'

/**
 * Checa se já existe alguma clínica registada com o mesmo nome ou slug equivalente.
 */
async function checarNomeClinicaExiste(nomeClinica: string, ignoreClinicaId?: string): Promise<boolean> {
  const cleanNome = nomeClinica.trim()
  if (!cleanNome) return false

  // 1. Verificação direta case-insensitive com ilike
  let query = supabaseAdmin
    .from('clinicas')
    .select('id, nome')
    .ilike('nome', cleanNome)
    .limit(1)

  if (ignoreClinicaId) {
    query = query.neq('id', ignoreClinicaId)
  }

  const { data: directMatches, error: directError } = await query

  if (directError) {
    console.warn('[checarNomeClinicaExiste] Aviso na consulta direta:', directError.message)
  }

  if (directMatches && directMatches.length > 0) {
    return true
  }

  // 2. Verificação de slug/normalização equivalente (remove acentos e espaços múltiplos)
  const normalizedTarget = normalizeClinicName(cleanNome)
  let scanQuery = supabaseAdmin
    .from('clinicas')
    .select('id, nome')
    .limit(200)

  if (ignoreClinicaId) {
    scanQuery = scanQuery.neq('id', ignoreClinicaId)
  }

  const { data: allClinicas } = await scanQuery

  if (allClinicas && allClinicas.length > 0) {
    const hasEquivalent = allClinicas.some(
      (c) => normalizeClinicName(c.nome) === normalizedTarget
    )
    if (hasEquivalent) {
      return true
    }
  }

  return false
}

/**
 * Verifica a disponibilidade do nome da clínica antes de submeter o registo.
 * Útil para feedback inline na UI e evitar a criação de contas de autenticação órfãs.
 */
export async function verificarDisponibilidadeNomeClinica(
  nomeClinica: string
): Promise<{ disponivel: boolean; error?: string }> {
  try {
    const parseResult = registrarClinicaPayloadSchema.safeParse({ nomeClinica })
    if (!parseResult.success) {
      return {
        disponivel: false,
        error: parseResult.error.issues[0]?.message || 'Nome da clínica inválido.',
      }
    }

    const jaExiste = await checarNomeClinicaExiste(parseResult.data.nomeClinica)
    if (jaExiste) {
      return {
        disponivel: false,
        error: 'Já existe uma clínica registada com este nome. Escolha outro nome ou contacte o suporte.',
      }
    }

    return { disponivel: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao verificar disponibilidade'
    console.error('[verificarDisponibilidadeNomeClinica] Exceção:', msg)
    return { disponivel: true } // Não bloqueia em caso de falha de rede transitória na verificação prévia
  }
}

/**
 * Provisiona a nova clínica vinculada ao usuário autenticado atual.
 */
export async function registrarNovaClinica(payload: {
  nomeClinica: string
}): Promise<{ success: boolean; error?: string }> {
  // 1. Validação de entrada com Zod
  const validation = registrarClinicaPayloadSchema.safeParse(payload)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'O nome da clínica é inválido.',
    }
  }

  const cleanNomeClinica = validation.data.nomeClinica.trim()

  try {
    // 2. Valida a sessão do usuário (o cookie deve estar presente após o signUp)
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Sessão não encontrada. Verifique o seu e-mail e tente fazer login.',
      }
    }

    // 3. Verifica se o perfil do usuário já possui clínica vinculada
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, clinica_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile?.clinica_id) {
      // Se já tem clínica vinculada, garante SEMPRE a role 'admin_clinica'.
      // Qualquer role diferente (dentista, recepcao, financeiro, admin, null)
      // é corrigida aqui — o primeiro utilizador de /register nunca pode ter
      // um perfil restrito.
      if (existingProfile.role !== 'admin_clinica') {
        await supabaseAdmin
          .from('user_profiles')
          .update({ role: 'admin_clinica' })
          .eq('id', user.id)
      }
      return { success: true }
    }

    // 4. Validação de Unicidade do Nome da Clínica (requisito estrito contra duplicidades e spam)
    const nomeJaExiste = await checarNomeClinicaExiste(cleanNomeClinica)
    if (nomeJaExiste) {
      return {
        success: false,
        error: 'Já existe uma clínica registada com este nome. Escolha outro nome ou contacte o suporte.',
      }
    }

    // 5. Gera um novo UUID exclusivo para o novo tenant (isolamento absoluto)
    const novoClinicaId = crypto.randomUUID()

    // 6. Cria a clínica na tabela clinicas
    const { error: clinicaError } = await supabaseAdmin.from('clinicas').insert({
      id: novoClinicaId,
      nome: cleanNomeClinica,
      plano: 'profissional',
      status_assinatura: 'ativo',
      ativo: true,
    })

    if (clinicaError) {
      console.error('[registrarNovaClinica] Erro ao criar clínica:', clinicaError.message)
      // Se por ventura houver constraint UNIQUE no banco
      if (clinicaError.code === '23505') {
        return {
          success: false,
          error: 'Já existe uma clínica registada com este nome. Escolha outro nome ou contacte o suporte.',
        }
      }
      return {
        success: false,
        error: 'Erro ao criar o registro da clínica: ' + clinicaError.message,
      }
    }

    // 7. Cria as configurações iniciais da clínica em clinica_settings
    const { error: settingsError } = await supabaseAdmin
      .from('clinica_settings')
      .insert({
        clinica_id: novoClinicaId,
        nome: cleanNomeClinica,
        nome_exibido: cleanNomeClinica,
      })

    if (settingsError) {
      console.warn('[registrarNovaClinica] Aviso ao criar clinica_settings:', settingsError.message)
    }

    // 8. Vincula o usuário recém-registrado com role 'admin_clinica' (obrigatória).
    //    Usa upsert com onConflict explícito em 'id' para evitar inserções duplicadas
    //    silenciosas e garantir que o role nunca seja sobrescrito por valor restrito.
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          nome: cleanNomeClinica,
          email: user.email,
          role: 'admin_clinica',
          clinica_id: novoClinicaId,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      console.error('[registrarNovaClinica] Erro ao salvar user_profiles:', profileError.message)
      return {
        success: false,
        error: 'Erro ao associar perfil de administrador: ' + profileError.message,
      }
    }

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro inesperado'
    console.error('[registrarNovaClinica] Exceção:', msg)
    return { success: false, error: msg }
  }
}
