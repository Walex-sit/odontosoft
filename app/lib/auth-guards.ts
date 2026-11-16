import 'server-only'

/**
 * app/lib/auth-guards.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Guard de autorização e integridade do estado da clínica (SaaS Billing).
 *
 * Tarefa 3:
 *  ✅ Valida sessão autenticada do usuário.
 *  ✅ Isenção automática para super_admin e contas is_lifetime.
 *  ✅ Consulta de status da clínica com política Fail-Closed:
 *     Em caso de erro ao consultar, BLOQUEIA (não libera).
 *  ✅ Bloqueia se status_assinatura = 'inadimplente' ou 'cancelado'.
 *  ✅ Bloqueia se status_assinatura = 'trial' e trial_ends_at < now().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from './supabase/server'
import type { UserRole } from './database.types'

export interface ActiveClinicContext {
  user: {
    id: string
    email?: string
  }
  profile: {
    id: string
    nome: string
    role: UserRole
    clinica_id: string | null
    is_lifetime: boolean
  }
  clinica: {
    id: string
    nome: string
    status_assinatura: string
    trial_ends_at: string | null
    ativo: boolean
  }
  supabase: any
}

export async function requireActiveClinic(): Promise<ActiveClinicContext> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Não autorizado: Sessão inválida ou expirada.')
  }

  // 1. Consulta o perfil do usuário autenticado
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, nome, role, clinica_id, is_lifetime')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Acesso bloqueado: Perfil do usuário não encontrado.')
  }

  const isSuper = profile.role === 'super_admin'
  const isLifetime = profile.is_lifetime === true

  // super_admin sem clínica vinculada é permitido como operador global ou em contexto
  if (!profile.clinica_id) {
    if (isSuper) {
      // Verificar se o super_admin selecionou um contexto ativo de clínica
      const { data: contextRows } = await (supabase.rpc as any)('get_super_admin_context')
      if (contextRows && contextRows.length > 0) {
        const active = contextRows[0]
        return {
          user: { id: user.id, email: user.email },
          profile: { ...profile, clinica_id: active.clinica_id } as any,
          clinica: {
            id: active.clinica_id,
            nome: active.nome,
            status_assinatura: active.status_assinatura || 'ativo',
            trial_ends_at: null,
            ativo: active.ativo ?? true,
          },
          supabase,
        }
      }

      return {
        user: { id: user.id, email: user.email },
        profile: profile as any,
        clinica: {
          id: '',
          nome: 'Administração Global',
          status_assinatura: 'ativo',
          trial_ends_at: null,
          ativo: true,
        },
        supabase,
      }
    }
    throw new Error('Acesso bloqueado: Usuário não vinculado a nenhuma clínica.')
  }

  // 2. Consulta o status da clínica no banco de dados
  // REGRA: Em caso de erro na consulta, BLOQUEAR (FAIL-CLOSED)
  const { data: clinica, error: clinicaError } = await supabase
    .from('clinicas')
    .select('id, nome, status_assinatura, trial_ends_at, ativo')
    .eq('id', profile.clinica_id)
    .single()

  if (clinicaError || !clinica) {
    throw new Error('Acesso bloqueado: Falha ao consultar o status da clínica.')
  }

  // super_admin e is_lifetime não são bloqueados por trial expirado nem inadimplência
  if (!isSuper && !isLifetime) {
    if (!clinica.ativo) {
      throw new Error('Acesso bloqueado: Esta clínica está desativada no sistema.')
    }

    if (clinica.status_assinatura === 'inadimplente') {
      throw new Error(
        '[OdontoSoft Billing] A clínica encontra-se com pendências financeiras (inadimplente). Regularize a assinatura para realizar novos cadastros.'
      )
    }

    if (clinica.status_assinatura === 'cancelado') {
      throw new Error(
        '[OdontoSoft Billing] A assinatura da clínica está cancelada. Reative para realizar novos cadastros.'
      )
    }

    if (clinica.status_assinatura === 'trial') {
      if (clinica.trial_ends_at && new Date(clinica.trial_ends_at).getTime() < Date.now()) {
        throw new Error(
          '[OdontoSoft Billing] O período de avaliação gratuita (trial) desta clínica expirou. Assine um plano em Configurações > Assinatura para continuar cadastrando.'
        )
      }
    }
  }

  return {
    user: { id: user.id, email: user.email },
    profile: profile as any,
    clinica: clinica as any,
    supabase,
  }
}

/**
 * Resolve e valida estritamente a clínica autorizada para a sessão:
 * 1. Para usuários normais: clinica_id SEMPRE provém de profile.clinica_id (targetClinicaId é ignorado).
 * 2. Para super_admin: clinica_id é obtido exclusivamente do contexto ativo validado no banco
 *    (get_super_admin_context / super_admin_clinic_contexts).
 *    Se o cliente passar targetClinicaId, este DEVE ser idêntico ao contexto ativo no banco.
 *    Caso não coincida ou não haja contexto ativo, a operação é rejeitada (prevenção contra IDOR).
 */
export async function resolveAuthorizedClinicId(
  supabase: any,
  user: { id: string },
  profile: { clinica_id?: string | null; role?: string },
  targetClinicaId?: string
): Promise<{ clinicaId: string | null; error?: string }> {
  // 1. Usuários comuns: SEMPRE restritos à clínica vinculada em seu perfil (imune a IDOR por targetClinicaId)
  if (profile.role !== 'super_admin') {
    return { clinicaId: profile.clinica_id || null }
  }

  // 2. Super Admin: verificar contexto administrativo ativo validado no servidor
  let activeContextClinicaId: string | null = null

  const { data: contextRows } = await (supabase.rpc as any)('get_super_admin_context')
  if (contextRows && contextRows.length > 0 && contextRows[0].clinica_id) {
    activeContextClinicaId = contextRows[0].clinica_id
  } else {
    const { data: ctx } = await supabase
      .from('super_admin_clinic_contexts')
      .select('clinica_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (ctx?.clinica_id) {
      activeContextClinicaId = ctx.clinica_id
    }
  }

  // Se o Super Admin não possui contexto de clínica ativo no servidor
  if (!activeContextClinicaId) {
    return { clinicaId: null }
  }

  // 3. Prevenção estrita contra IDOR: se o cliente enviou targetClinicaId,
  // este OBRIGATORIAMENTE deve ser idêntico ao contexto ativo validado no servidor
  if (targetClinicaId && targetClinicaId !== activeContextClinicaId) {
    return { clinicaId: null, error: 'Acesso negado: Contexto de clínica não autorizado.' }
  }

  return { clinicaId: activeContextClinicaId }
}
