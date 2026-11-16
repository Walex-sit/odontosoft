'use server'

/**
 * app/actions/admin-global.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions para o Painel Administrativo Global e Gestão de Contexto
 * exclusivo para usuários com papel 'super_admin'.
 *
 * Segurança:
 *  ✅ checkServerAuth(['super_admin']) em 100% das operações.
 *  ✅ Validação de IDs e parâmetros via UUID e sanitização.
 *  ✅ Isolamento total: nunca altera user_profiles.role ou user_profiles.clinica_id.
 *  ✅ Auditoria de entrada/saída de contexto em system_logs.
 *  ✅ Gerenciamento seguro de cookies HttpOnly no servidor (Next.js 16).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { cookies } from 'next/headers'
import { checkServerAuth } from '@/app/lib/rbac'
import { supabaseAdmin } from '@/app/lib/supabase/admin'

const CONTEXT_COOKIE_NAME = 'odontosoft_admin_context'

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface GlobalMetrics {
  totalClinicas: number
  clinicasAtivas: number
  clinicasTrial: number
  clinicasInadimplentes: number
  clinicasCanceladas: number
  totalUsuarios: number
  usuariosPorRole: {
    super_admin: number
    admin_clinica: number
    dentista: number
    recepcao: number
    financeiro: number
  }
  totalPacientes: number
  totalConsultas: number
  mrrEstimado: number
  planosDistribuicao: {
    basico: number
    profissional: number
    enterprise: number
  }
  novasClinicasUltimos30Dias: number
}

export interface GlobalClinicaItem {
  id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  plano: 'basico' | 'profissional' | 'enterprise'
  status_assinatura: 'trial' | 'ativo' | 'inadimplente' | 'cancelado' | 'pendente'
  trial_ends_at: string | null
  ativo: boolean
  criado_em: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  totalUsuarios?: number
  totalPacientes?: number
}

export interface GlobalUserItem {
  id: string
  nome: string
  email: string | null
  role: string
  especialidade: string | null
  clinica_id: string | null
  clinica_nome?: string | null
  is_lifetime: boolean
  created_at: string
}

// ─── 1. Indicadores Globais da Plataforma ────────────────────────────────────

export async function getGlobalPlatformMetrics(): Promise<{
  success: boolean
  data?: GlobalMetrics
  error?: string
}> {
  try {
    const { supabase } = await checkServerAuth(['super_admin'])

    // 1. Clínicas (usando supabaseAdmin com autorização prévia de super_admin para garantir leitura global)
    const { data: clinicas, error: clinicasErr } = await supabaseAdmin
      .from('clinicas')
      .select('id, status_assinatura, plano, ativo, criado_em')

    if (clinicasErr) throw new Error(clinicasErr.message)

    const list = clinicas || []
    const totalClinicas = list.length
    const clinicasAtivas = list.filter((c: any) => c.status_assinatura === 'ativo' && c.ativo).length
    const clinicasTrial = list.filter((c: any) => c.status_assinatura === 'trial').length
    const clinicasInadimplentes = list.filter((c: any) => c.status_assinatura === 'inadimplente').length
    const clinicasCanceladas = list.filter((c: any) => c.status_assinatura === 'cancelado' || !c.ativo).length

    // MRR Estimado por plano (Básico: R$ 97, Profissional: R$ 197, Enterprise: R$ 397)
    const PRECOS_PLANO: Record<string, number> = {
      basico: 97,
      profissional: 197,
      enterprise: 397,
    }

    const mrrEstimado = list
      .filter((c: any) => c.status_assinatura === 'ativo' && c.ativo)
      .reduce((sum: number, c: any) => sum + (PRECOS_PLANO[c.plano] || 197), 0)

    const planosDistribuicao = {
      basico: list.filter((c: any) => c.plano === 'basico').length,
      profissional: list.filter((c: any) => c.plano === 'profissional').length,
      enterprise: list.filter((c: any) => c.plano === 'enterprise').length,
    }

    const d30DiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const novasClinicasUltimos30Dias = list.filter(
      (c: any) => new Date(c.criado_em) >= d30DiasAtras
    ).length

    // 2. Usuários (leitura global consolidada)
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, role')

    if (profErr) throw new Error(profErr.message)

    const pList = profiles || []
    const totalUsuarios = pList.length
    const usuariosPorRole = {
      super_admin: pList.filter((p: any) => p.role === 'super_admin').length,
      admin_clinica: pList.filter((p: any) => p.role === 'admin_clinica' || p.role === 'admin').length,
      dentista: pList.filter((p: any) => p.role === 'dentista').length,
      recepcao: pList.filter((p: any) => p.role === 'recepcao').length,
      financeiro: pList.filter((p: any) => p.role === 'financeiro').length,
    }

    // 3. Contagem global de Pacientes e Consultas via supabaseAdmin (bypass seguro do tenant guard apenas para agregação numérica)
    const [{ count: totalPacientes }, { count: totalConsultas }] = await Promise.all([
      supabaseAdmin.from('pacientes').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('agendamentos').select('*', { count: 'exact', head: true }),
    ])

    return {
      success: true,
      data: {
        totalClinicas,
        clinicasAtivas,
        clinicasTrial,
        clinicasInadimplentes,
        clinicasCanceladas,
        totalUsuarios,
        usuariosPorRole,
        totalPacientes: totalPacientes || 0,
        totalConsultas: totalConsultas || 0,
        mrrEstimado,
        planosDistribuicao,
        novasClinicasUltimos30Dias,
      },
    }
  } catch (err: any) {
    console.error('[admin-global.getGlobalPlatformMetrics] Erro:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── 2. Listagem de Clínicas Cadastradas ──────────────────────────────────────

export async function getGlobalClinicsList(filters?: {
  search?: string
  status?: string
  plano?: string
}): Promise<{
  success: boolean
  data?: GlobalClinicaItem[]
  error?: string
}> {
  try {
    const { supabase } = await checkServerAuth(['super_admin'])

    let query = supabaseAdmin
      .from('clinicas')
      .select('id, nome, cnpj, telefone, email, plano, status_assinatura, trial_ends_at, ativo, criado_em, stripe_customer_id, stripe_subscription_id')
      .order('criado_em', { ascending: false })

    const validStatuses = ['trial', 'ativo', 'inadimplente', 'cancelado', 'pendente']
    if (filters?.status && filters.status !== 'todos' && validStatuses.includes(filters.status)) {
      query = query.eq('status_assinatura', filters.status as any)
    }

    const validPlanos = ['basico', 'profissional', 'enterprise']
    if (filters?.plano && filters.plano !== 'todos' && validPlanos.includes(filters.plano)) {
      query = query.eq('plano', filters.plano as any)
    }

    if (filters?.search && filters.search.trim()) {
      // Sanitização de caracteres especiais de controle do PostgREST
      const sanitized = filters.search.trim().replace(/[,()]/g, '')
      if (sanitized) {
        const term = `%${sanitized}%`
        query = query.or(`nome.ilike.${term},cnpj.ilike.${term},email.ilike.${term}`)
      }
    }

    const { data: clinicas, error } = await query

    if (error) throw new Error(error.message)

    // Agregação de contagem de usuários por clínica
    const { data: userCounts } = await supabaseAdmin
      .from('user_profiles')
      .select('clinica_id')

    const userCountMap: Record<string, number> = {}
    ;(userCounts || []).forEach((u: any) => {
      if (u.clinica_id) {
        userCountMap[u.clinica_id] = (userCountMap[u.clinica_id] || 0) + 1
      }
    })

    const enrichedClinicas: GlobalClinicaItem[] = (clinicas || []).map((c: any) => ({
      ...c,
      totalUsuarios: userCountMap[c.id] || 0,
    }))

    return { success: true, data: enrichedClinicas }
  } catch (err: any) {
    console.error('[admin-global.getGlobalClinicsList] Erro:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── 3. Listagem Global de Usuários ──────────────────────────────────────────

export async function getGlobalUsersList(filters?: {
  search?: string
  role?: string
  clinicaId?: string
}): Promise<{
  success: boolean
  data?: GlobalUserItem[]
  error?: string
}> {
  try {
    const { supabase } = await checkServerAuth(['super_admin'])

    let query = supabaseAdmin
      .from('user_profiles')
      .select('id, nome, email, role, especialidade, clinica_id, is_lifetime, created_at')
      .order('created_at', { ascending: false })

    const validRoles = ['super_admin', 'admin', 'admin_clinica', 'dentista', 'recepcao', 'financeiro']
    if (filters?.role && filters.role !== 'todos' && validRoles.includes(filters.role)) {
      query = query.eq('role', filters.role as any)
    }

    if (filters?.clinicaId && filters.clinicaId !== 'todos' && /^[0-9a-f-]{36}$/i.test(filters.clinicaId)) {
      query = query.eq('clinica_id', filters.clinicaId)
    }

    if (filters?.search && filters.search.trim()) {
      // Sanitização de caracteres especiais de controle do PostgREST
      const sanitized = filters.search.trim().replace(/[,()]/g, '')
      if (sanitized) {
        const term = `%${sanitized}%`
        query = query.or(`nome.ilike.${term},email.ilike.${term}`)
      }
    }

    const { data: users, error } = await query
    if (error) throw new Error(error.message)

    // Buscar nomes de clínicas para exibição amigável
    const { data: clinicas } = await supabaseAdmin
      .from('clinicas')
      .select('id, nome')

    const clinicaMap: Record<string, string> = {}
    ;(clinicas || []).forEach((c: any) => {
      clinicaMap[c.id] = c.nome
    })

    const enrichedUsers: GlobalUserItem[] = (users || []).map((u: any) => ({
      ...u,
      clinica_nome: u.clinica_id ? (clinicaMap[u.clinica_id] || 'Clínica Desconhecida') : 'Super Admin (Sem Clínica)',
    }))

    return { success: true, data: enrichedUsers }
  } catch (err: any) {
    console.error('[admin-global.getGlobalUsersList] Erro:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── 4. Atualizar Situação da Clínica (Ativar/Desativar ou Status) ───────────

export async function updateClinicStatusAdmin(
  clinicaId: string,
  updates: {
    ativo?: boolean
    status_assinatura?: 'trial' | 'ativo' | 'inadimplente' | 'cancelado' | 'pendente'
    plano?: 'basico' | 'profissional' | 'enterprise'
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, supabase } = await checkServerAuth(['super_admin'])

    if (!clinicaId || !/^[0-9a-f-]{36}$/i.test(clinicaId)) {
      throw new Error('ID de clínica inválido.')
    }

    // Whitelist e sanitização estrita de campos permitidos
    const allowedUpdates: {
      ativo?: boolean
      status_assinatura?: 'trial' | 'ativo' | 'inadimplente' | 'cancelado' | 'pendente'
      plano?: 'basico' | 'profissional' | 'enterprise'
    } = {}

    if (typeof updates.ativo === 'boolean') {
      allowedUpdates.ativo = updates.ativo
    }

    if (
      updates.status_assinatura &&
      ['trial', 'ativo', 'inadimplente', 'cancelado', 'pendente'].includes(updates.status_assinatura)
    ) {
      allowedUpdates.status_assinatura = updates.status_assinatura
    }

    if (
      updates.plano &&
      ['basico', 'profissional', 'enterprise'].includes(updates.plano)
    ) {
      allowedUpdates.plano = updates.plano
    }

    if (Object.keys(allowedUpdates).length === 0) {
      throw new Error('Nenhum campo válido fornecido para atualização.')
    }

    const { error } = await supabaseAdmin
      .from('clinicas')
      .update(allowedUpdates)
      .eq('id', clinicaId)

    if (error) throw new Error(error.message)

    // Auditoria com dados sanitizados
    await supabase.from('system_logs').insert([
      {
        clinica_id: clinicaId,
        user_id: user.id,
        action: 'edicao',
        entity: 'clinicas',
        details: {
          admin_action: 'update_clinic_status',
          updates: allowedUpdates,
        },
      },
    ])

    return { success: true }
  } catch (err: any) {
    console.error('[admin-global.updateClinicStatusAdmin] Erro:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── 5. Seleção Segura de Contexto de Clínica (Acessar Clínica) ─────────────

export async function selectClinicContextAction(clinicaId: string): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    const { user, supabase } = await checkServerAuth(['super_admin'])

    if (!clinicaId || !/^[0-9a-f-]{36}$/i.test(clinicaId)) {
      throw new Error('Identificador da clínica inválido.')
    }

    // 1. Invocar RPC segura no banco que valida super_admin, existência da clínica e grava log
    const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)(
      'set_super_admin_context',
      { p_clinica_id: clinicaId }
    )

    if (rpcErr) {
      throw new Error(rpcErr.message)
    }

    // 2. Persistir contexto no cookie HttpOnly com expiração segura de 8 horas
    const cookieStore = await cookies()
    cookieStore.set(CONTEXT_COOKIE_NAME, clinicaId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 horas
    })

    return {
      success: true,
      data: rpcRes,
    }
  } catch (err: any) {
    console.error('[admin-global.selectClinicContextAction] Erro:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── 6. Retorno ao Painel Global (Limpar Contexto) ───────────────────────────

export async function exitClinicContextAction(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase } = await checkServerAuth(['super_admin'])

    // 1. Limpar no banco via RPC
    const { error: rpcErr } = await (supabase.rpc as any)('clear_super_admin_context')
    if (rpcErr) {
      console.warn('[admin-global.exitClinicContextAction] RPC warning:', rpcErr.message)
    }

    // 2. Excluir cookie HttpOnly
    const cookieStore = await cookies()
    cookieStore.delete(CONTEXT_COOKIE_NAME)

    return { success: true }
  } catch (err: any) {
    console.error('[admin-global.exitClinicContextAction] Erro:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── 7. Consultar Contexto Ativo ─────────────────────────────────────────────

export async function getActiveClinicContextAction(): Promise<{
  hasActiveContext: boolean
  clinica?: {
    id: string
    nome: string
    status_assinatura: string
    plano: string
    ativo: boolean
    selected_at: string
  } | null
  error?: string
}> {
  try {
    const { supabase } = await checkServerAuth(['super_admin'])

    const { data, error } = await (supabase.rpc as any)('get_super_admin_context')
    if (error) throw new Error(error.message)

    if (data && data.length > 0) {
      const row = data[0]
      return {
        hasActiveContext: true,
        clinica: {
          id: row.clinica_id,
          nome: row.nome,
          status_assinatura: row.status_assinatura,
          plano: row.plano,
          ativo: row.ativo,
          selected_at: row.selected_at,
        },
      }
    }

    return {
      hasActiveContext: false,
      clinica: null,
    }
  } catch (err: any) {
    return {
      hasActiveContext: false,
      clinica: null,
      error: err.message,
    }
  }
}

