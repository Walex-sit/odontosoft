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
import { requireActiveClinic } from '@/app/lib/auth-guards'
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
    let ctx: Awaited<ReturnType<typeof requireActiveClinic>>
    try { ctx = await requireActiveClinic() } catch (guardErr: any) { return { success: false, error: guardErr.message } }
    const { supabase, user } = ctx

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('role, clinica_id')
      .eq('id', user.id)
      .single()

    const callerRole = profile?.role as string
    if (profileErr || !profile || !['admin', 'admin_clinica', 'super_admin'].includes(callerRole)) {
      return { success: false, error: 'Apenas administradores podem cadastrar novos membros.' }
    }

    if (data.role === 'super_admin' && callerRole !== 'super_admin') {
      return { success: false, error: 'Apenas Super Administradores podem cadastrar usuários com esta função.' }
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
// Convida novo membro da equipe associando clinica_id e cargo (T001 Multi-tenant)
// ---------------------------------------------------------------------------
export async function inviteTeamMember(data: {
  nome: string
  email: string
  role: string
  especialidade?: string
}): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
  try {
    let ctx: Awaited<ReturnType<typeof requireActiveClinic>>
    try { ctx = await requireActiveClinic() } catch (guardErr: any) { return { success: false, error: guardErr.message } }
    const { supabase, user } = ctx

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('role, clinica_id, nome')
      .eq('id', user.id)
      .single()

    const callerRole = profile?.role as string
    if (profileErr || !profile || !['admin', 'admin_clinica', 'super_admin'].includes(callerRole)) {
      return { success: false, error: 'Apenas administradores podem convidar novos membros.' }
    }

    if (data.role === 'super_admin' && callerRole !== 'super_admin') {
      return { success: false, error: 'Apenas Super Administradores podem convidar membros com esta função.' }
    }

    const clinicaId = profile.clinica_id
    if (!clinicaId) {
      return { success: false, error: 'Clínica não identificada no perfil do administrador.' }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectUrl = `${baseUrl}/definir-senha`
    const cleanEmail = data.email.trim().toLowerCase()

    let invitedUserId: string | null = null
    let generatedInviteLink: string | undefined = undefined

    // 1. Gera link de convite oficial criptograficamente seguro via Supabase Auth Admin.
    // Esse fluxo utiliza OTP controlado pelo Supabase, com expiração automática e uso único,
    // eliminando COMPLETAMENTE qualquer senha na URL ou parâmetro 'temp'.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: cleanEmail,
      options: {
        redirectTo: redirectUrl,
        data: {
          nome: data.nome.trim(),
          role: data.role,
          clinica_id: clinicaId,
        },
      },
    })

    if (linkError) {
      console.warn('[users.inviteTeamMember] Supabase generateLink erro/aviso:', linkError.message)
      if (
        linkError.message.toLowerCase().includes('already') ||
        linkError.message.toLowerCase().includes('registered')
      ) {
        return { success: false, error: 'Este e-mail já possui uma conta no sistema.' }
      }

      // Se falhar a geração de link, tenta envio oficial direto de convite por e-mail (sem senhas expostas)
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        cleanEmail,
        {
          data: {
            nome: data.nome.trim(),
            role: data.role,
            clinica_id: clinicaId,
          },
          redirectTo: redirectUrl,
        }
      )

      if (inviteError) {
        return { success: false, error: 'Erro ao gerar convite seguro: ' + (inviteError.message || linkError.message) }
      }

      invitedUserId = inviteData?.user?.id || null
      generatedInviteLink = `${redirectUrl}?email=${encodeURIComponent(cleanEmail)}`
    } else {
      invitedUserId = linkData.user?.id || null
      // Utiliza o link oficial seguro gerado pelo Supabase (action_link com token seguro de uso único)
      generatedInviteLink = linkData.properties?.action_link || `${redirectUrl}?email=${encodeURIComponent(cleanEmail)}`
    }

    if (invitedUserId) {
      // Garante que o registro em user_profiles receba o clinica_id e role correto
      await supabaseAdmin.from('user_profiles').upsert({
        id: invitedUserId,
        nome: data.nome.trim(),
        email: cleanEmail,
        role: data.role as UserRole,
        especialidade: data.especialidade || null,
        clinica_id: clinicaId,
      })
    }

    // Registra trilha de auditoria LGPD/Compliance SEM expor tokens ou credenciais
    await logAction(
      user.id,
      'criacao',
      'usuarios',
      {
        tipo: 'convite_membro_seguro',
        convidado_email: cleanEmail,
        convidado_nome: data.nome,
        role: data.role,
        clinica_id: clinicaId,
      },
      profile.nome
    )

    return { success: true, inviteLink: generatedInviteLink }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar convite.'
    console.error('[users.inviteTeamMember] Exceção:', msg)
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
    let ctx: Awaited<ReturnType<typeof requireActiveClinic>>
    try { ctx = await requireActiveClinic() } catch (guardErr: any) { return { success: false, error: guardErr.message } }
    const { supabase, user } = ctx

    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role, clinica_id')
      .eq('id', user.id)
      .single()

    const callerRole = currentProfile?.role as string
    if (!currentProfile || !['admin', 'admin_clinica', 'super_admin'].includes(callerRole)) {
      return { success: false, error: 'Apenas administradores podem excluir membros da equipe.' }
    }

    if (userId === user.id) {
      return { success: false, error: 'Auto-exclusão de conta não é permitida.' }
    }

    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('id, nome, email, role, clinica_id')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return { success: false, error: 'Usuário não encontrado.' }
    }

    if (targetProfile.role === 'super_admin' && callerRole !== 'super_admin') {
      return { success: false, error: 'Apenas Super Administradores podem excluir contas de Super Administrador.' }
    }

    if (callerRole !== 'super_admin') {
      if (!currentProfile.clinica_id || targetProfile.clinica_id !== currentProfile.clinica_id) {
        return { success: false, error: 'Acesso negado: usuário pertence a outra clínica.' }
      }
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
    let ctx: Awaited<ReturnType<typeof requireActiveClinic>>
    try { ctx = await requireActiveClinic() } catch (guardErr: any) { return { success: false, error: guardErr.message } }
    const { supabase, user } = ctx

    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role, clinica_id')
      .eq('id', user.id)
      .single()

    const callerRole = currentProfile?.role as string
    if (!currentProfile || !['admin', 'admin_clinica', 'super_admin'].includes(callerRole)) {
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

    // Proteção contra elevação indevida de privilégios para super_admin
    if (data.role === 'super_admin' && callerRole !== 'super_admin') {
      return { success: false, error: 'Apenas o Super Admin pode atribuir a função de Super Admin.' }
    }

    // Impedir auto-promoção de perfil
    if (data.id === user.id && data.role !== currentProfile.role && callerRole !== 'super_admin') {
      return { success: false, error: 'Auto-alteração de nível de permissão não permitida.' }
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