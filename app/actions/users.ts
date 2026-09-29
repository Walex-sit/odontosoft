'use server'

/**
 * app/actions/users.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciamento de membros da equipe e contas de usuário.
 *
 * Segurança (T001):
 *  ✅ Leitura de equipe via createServerClient() com RLS ativo.
 *  ✅ supabaseAdmin usado EXCLUSIVAMENTE para operações de infraestrutura.
 *  ✅ Verificação estrita de role 'admin' antes de criar ou remover usuários.
 *  ✅ clinica_id herdado automaticamente do admin logado.
 *  ✅ Validação de tenant cruzado em updateUserAccount (P1.7).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'
import { supabaseAdmin } from '@/app/lib/supabase/admin'
import { logAction } from '@/app/lib/logger'
import type { UserRole } from '@/app/lib/database.types'

export interface TeamMember {
  id: string
  nome: string
  email: string | null
  role: string
  especialidade?: string | null
  clinica_id?: string | null
}

// ---------------------------------------------------------------------------
// Cria conta de usuário via Admin API vinculada à clínica do admin logado
// ---------------------------------------------------------------------------
export async function createUserAccount(data: {
  nome: string
  email: string
  password: string
  role: string
  especialidade?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado: faça login como administrador.' }
    }

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('role, clinica_id')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile || profile.role !== 'admin') {
      return { success: false, error: 'Apenas administradores podem cadastrar novos membros.' }
    }

    const clinicaId = profile.clinica_id

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    })

    if (createError) {
      console.error('[users.createUserAccount] Erro no Auth:', createError.message)
      return { success: false, error: createError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Usuário criado no Auth, mas sem dados retornados.' }
    }

    const { error: profileInsertError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        nome: data.nome,
        email: data.email,
        role: data.role as UserRole,
        especialidade: data.especialidade || null,
        clinica_id: clinicaId,
      })

    if (profileInsertError) {
      console.error('[users.createUserAccount] Erro ao criar perfil:', profileInsertError.message)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: 'Erro ao criar perfil do usuário: ' + profileInsertError.message }
    }

    // Log de auditoria (P2.3)
    await logAction(
      user.id,
      'criacao',
      'usuarios',
      {
        created_user_id: authData.user.id,
        created_user_nome: data.nome,
        created_user_email: data.email,
        created_user_role: data.role,
        clinica_id: clinicaId,
      }
    )

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido ao criar usuário.'
    console.error('[users.createUserAccount] Exceção:', msg)
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Lista membros da equipe da clínica do usuário logado via RLS
// ---------------------------------------------------------------------------
export async function fetchTeamMembers(): Promise<{
  success: boolean
  data: TeamMember[]
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, data: [], error: 'Não autorizado.' }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, nome, email, role, especialidade, clinica_id')
      .order('nome', { ascending: true })

    if (error) {
      console.error('[users.fetchTeamMembers] Erro:', error.message)
      return { success: false, data: [], error: error.message }
    }

    return { success: true, data: (data ?? []) as TeamMember[] }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[users.fetchTeamMembers] Exceção:', msg)
    return { success: false, data: [], error: msg }
  }
}

// ---------------------------------------------------------------------------
// Exclui usuário do Auth e da tabela user_profiles com validação de tenant
// ---------------------------------------------------------------------------
export async function deleteUserAccount(
  userId: string,
  actorId?: string,
  actorNome?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' }
    }

    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role, clinica_id')
      .eq('id', user.id)
      .single()

    if (!currentProfile || currentProfile.role !== 'admin') {
      return { success: false, error: 'Apenas administradores podem excluir membros da equipe.' }
    }

    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('id, nome, email, role, clinica_id')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return { success: false, error: 'Usuário não encontrado.' }
    }

    if (currentProfile.clinica_id && targetProfile.clinica_id !== currentProfile.clinica_id) {
      return { success: false, error: 'Acesso negado: usuário pertence a outra clínica.' }
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('[users.deleteUserAccount] Erro ao deletar perfil:', profileError.message)
      return { success: false, error: 'Erro ao remover perfil: ' + profileError.message }
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('[users.deleteUserAccount] Erro ao deletar Auth:', authDeleteError.message)
      return { success: false, error: 'Perfil removido, mas erro ao remover do Auth: ' + authDeleteError.message }
    }

    const effectiveActorId = actorId || user.id
    await logAction(
      effectiveActorId,
      'exclusao',
      'usuarios',
      {
        deleted_user_id: userId,
        deleted_user_nome: targetProfile.nome,
        deleted_user_email: targetProfile.email,
        deleted_user_role: targetProfile.role,
        clinica_id: currentProfile.clinica_id,
      },
      actorNome
    )

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[users.deleteUserAccount] Exceção:', msg)
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Atualiza dados de um membro da equipe com validação estrita de tenant (P1.7)
// ---------------------------------------------------------------------------
export async function updateUserAccount(data: {
  id: string
  nome: string
  role: string
  especialidade?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' }
    }

    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role, clinica_id')
      .eq('id', user.id)
      .single()

    if (!currentProfile || currentProfile.role !== 'admin') {
      return { success: false, error: 'Apenas administradores podem alterar membros da equipe.' }
    }

    // CORREÇÃO P1.7: Verifica se o usuário alvo pertence estritamente à mesma clínica
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('clinica_id')
      .eq('id', data.id)
      .single()

    if (!targetProfile) {
      return { success: false, error: 'Usuário não encontrado.' }
    }

    if (currentProfile.clinica_id && targetProfile.clinica_id !== currentProfile.clinica_id) {
      return { success: false, error: 'Acesso negado: o usuário pertence a outra clínica.' }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        nome: data.nome,
        role: data.role as UserRole,
        especialidade: data.especialidade || null,
      })
      .eq('id', data.id)

    if (error) {
      console.error('[users.updateUserAccount] Erro:', error.message)
      return { success: false, error: error.message }
    }

    await logAction(
      user.id,
      'edicao',
      'usuarios',
      { updated_user_id: data.id, new_role: data.role, clinica_id: currentProfile.clinica_id }
    )

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('[users.updateUserAccount] Exceção:', msg)
    return { success: false, error: msg }
  }
}