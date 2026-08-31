'use server'

/**
 * app/actions/permissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciamento de permissões por perfil (RBAC).
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ Sem fallbacks silenciosos que mascarem falhas de infraestrutura.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'
import type { Json } from '@/app/lib/database.types'

export interface RolePermissions {
  agenda: boolean
  pacientes: boolean
  financeiro: boolean
  configuracoes: boolean
}

export async function getRolePermissions(
  roleName: string
): Promise<{ success: boolean; data?: RolePermissions; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' }
    }

    const { data, error } = await supabase
      .from('roles')
      .select('permissions')
      .eq('role_name', roleName)
      .maybeSingle()

    if (error) {
      console.error('[permissions.getRolePermissions] Erro:', error.message)
      return { success: false, error: error.message }
    }

    if (data?.permissions) {
      return { success: true, data: data.permissions as unknown as RolePermissions }
    }

    // Padrão default estrito caso não haja override no banco
    const defaultPermissions: Record<string, RolePermissions> = {
      admin: { agenda: true, pacientes: true, financeiro: true, configuracoes: true },
      dentista: { agenda: true, pacientes: true, financeiro: false, configuracoes: false },
      recepcao: { agenda: true, pacientes: true, financeiro: false, configuracoes: false },
      financeiro: { agenda: false, pacientes: false, financeiro: true, configuracoes: false },
    }

    return {
      success: true,
      data: defaultPermissions[roleName] || {
        agenda: false,
        pacientes: false,
        financeiro: false,
        configuracoes: false,
      },
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao buscar permissões'
    console.error('[permissions.getRolePermissions] Exceção:', msg)
    return { success: false, error: msg }
  }
}

export async function updateRolePermissions(
  roleName: string,
  permissions: RolePermissions
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Não autorizado.' }
    }

    // Apenas admin pode alterar permissões de roles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Apenas administradores podem atualizar permissões.' }
    }

    const { error } = await supabase
      .from('roles')
      .upsert(
        {
          role_name: roleName,
          permissions: permissions as unknown as Json,
        },
        { onConflict: 'role_name' }
      )

    if (error) {
      console.error('[permissions.updateRolePermissions] Erro:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro geral ao atualizar permissões'
    console.error('[permissions.updateRolePermissions] Exceção:', msg)
    return { success: false, error: msg }
  }
}
