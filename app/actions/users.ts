'use server'

import { createClient } from '@supabase/supabase-js'
import { logAction } from '@/app/lib/logger'

// ---------------------------------------------------------------------------
// Cria conta de usuário via Admin API (não desloga o admin atual)
// ---------------------------------------------------------------------------
export async function createUserAccount(data: {
  nome: string
  email: string
  password: string
  role: string
  especialidade?: string
}) {
  console.log('Verificando se a chave foi lida:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Chave OK' : 'Chave Vazia')
  console.log('URL do Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'URL OK' : 'URL Vazia')

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // 1. Cria no auth.users com email já confirmado
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { nome: data.nome }
  })

  if (authError) {
    console.error('Erro ao criar usuário no Auth:', authError.message)
    return { success: false, error: authError.message }
  }

  if (!authData.user) {
    return { success: false, error: 'Usuário criado no Auth mas nenhum dado retornou.' }
  }

  // 2. Upsert do perfil em public.user_profiles (bypassa RLS e evita erro de chave duplicada)
  const { error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .upsert({
      id: authData.user.id,
      nome: data.nome,
      email: data.email,
      role: data.role,
      especialidade: data.especialidade || null
    })

  if (profileError) {
    console.error('Erro ao inserir perfil:', profileError.message)
    // Rollback: remove o auth criado para manter consistência
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: 'Erro ao criar perfil do usuário: ' + profileError.message }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// Lista membros da equipe via select na public.user_profiles
// Usa o admin client para garantir que o RLS não bloqueie a leitura
// Retorna lista vazia (sem erro) se não houver registros
// ---------------------------------------------------------------------------
export async function fetchTeamMembers(): Promise<{
  success: boolean
  data: { id: string; nome: string; email: string; role: string; especialidade?: string }[]
  error?: string
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('fetchTeamMembers: variáveis de ambiente ausentes');
    return { success: true, data: [] }; // Retorna vazio sem toast de erro
  }

  try {
    const client = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data, error } = await client
      .from('user_profiles')
      .select('id, nome, email, role, especialidade')
      .order('nome', { ascending: true })

    if (error) {
      console.error('fetchTeamMembers error:', error.message)
      // Tabela vazia ou RLS bloqueou — não é um erro crítico para o usuário
      return { success: true, data: [] }
    }

    return { success: true, data: data ?? [] }
  } catch (e: any) {
    console.error('fetchTeamMembers exception:', e.message)
    return { success: true, data: [] }
  }
}

// ---------------------------------------------------------------------------
// Exclui usuário do Auth e da tabela user_profiles
// actorId / actorNome: ID e nome do admin que está realizando a exclusão
// ---------------------------------------------------------------------------
export async function deleteUserAccount(
  userId: string,
  actorId?: string,
  actorNome?: string
): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 0. Busca o nome do usuário ANTES de excluir (para o log de auditoria)
    const { data: profileData } = await supabaseAdmin
      .from('user_profiles')
      .select('nome, email, role')
      .eq('id', userId)
      .single()

    // 1. Remove da tabela pública primeiro
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Erro ao deletar perfil:', profileError.message)
      return { success: false, error: 'Erro ao remover perfil: ' + profileError.message }
    }

    // 2. Remove do Auth do Supabase
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Erro ao deletar usuário do Auth:', authError.message)
      return { success: false, error: 'Perfil removido, mas erro ao remover Auth: ' + authError.message }
    }

    // 3. Registra log de auditoria
    if (actorId) {
      await logAction(
        actorId,
        'exclusao',
        'usuarios',
        {
          deleted_user_id: userId,
          deleted_user_nome: profileData?.nome ?? 'Desconhecido',
          deleted_user_email: profileData?.email ?? null,
          deleted_user_role: profileData?.role ?? null,
        },
        actorNome
      )
    }

    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    console.error('Erro geral ao deletar usuário:', msg)
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------
// Atualiza nome e role de um usuário existente em user_profiles
// ---------------------------------------------------------------------------
export async function updateUserAccount(data: {
  id: string
  nome: string
  role: string
  especialidade?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ nome: data.nome, role: data.role, especialidade: data.especialidade || null })
      .eq('id', data.id)

    if (error) {
      console.error('Erro ao atualizar perfil:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e: any) {
    console.error('Erro geral ao atualizar usuário:', e.message)
    return { success: false, error: e.message }
  }
}

