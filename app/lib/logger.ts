import 'server-only'

/**
 * app/lib/logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sistema centralizado de registro de auditoria (system_logs).
 * Biblioteca interna server-only (NÃO exposta como Server Actions públicas).
 *
 * Hardening Multi-Tenant:
 *  ✅ Obtém clinica_id EXCLUSIVAMENTE de user_profiles para usuários autenticados.
 *  ✅ NUNCA aceita details.clinica_id como fallback para usuários autenticados.
 *  ✅ Falha de forma segura se perfil não existir ou houver erro de consulta.
 *  ✅ Trata super_admin sem clínica vinculada sem inventar tenant falso.
 *  ✅ Sobrescreve/sanitiza qualquer clinica_id nos details pelo canônico.
 *  ✅ Chamadas de sistema sem usuário exigem InternalSystemContext validado em runtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabaseAdmin } from '@/app/lib/supabase/admin'
import type { Json } from '@/app/lib/database.types'

export type LogAction = 'login' | 'logout' | 'criacao' | 'edicao' | 'exclusao' | 'financeiro'

export const VALID_SYSTEM_SOURCES = ['stripe_webhook', 'cron_worker', 'migration', 'system_bootstrap'] as const
export type SystemSource = typeof VALID_SYSTEM_SOURCES[number]

export interface InternalSystemContext {
  systemSource: SystemSource
  clinicaId: string
  internalSecret?: string
}

/**
 * Allowlist estrita de metadados para prontuários e evolução (LGPD / CFO 198/2019).
 * Preserva exclusivamente identificadores e metadados estruturais para rastreabilidade,
 * bloqueando dados clínicos sensíveis na raiz e em objetos aninhados.
 */
export const CLINICAL_METADATA_ALLOWLIST = new Set([
  'clinica_id',
  'prontuario_id',
  'adendo_id',
  'evolucao_id',
  'paciente_id',
  'dentista_id',
  'user_id',
  'tipo_registro',
  'tipo_adendo',
  'status',
  'data_registro',
  'data_evolucao',
  'finalizado',
  'finalizado_em',
  'cfo_conformidade',
  'prontuario_origem_id',
  'versao_anterior_id',
  'colunas_inseridas',
  'colunas_alteradas',
])

export function sanitizeClinicalDetails(obj: unknown, depth = 0): unknown {
  if (depth > 5) return undefined
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    // Array de metadados primitivos (ex: lista de nomes de colunas alteradas)
    return obj.filter((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
  }

  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()
    if (CLINICAL_METADATA_ALLOWLIST.has(lowerKey)) {
      if (val !== null && typeof val === 'object') {
        const sanitizedChild = sanitizeClinicalDetails(val, depth + 1)
        if (sanitizedChild !== undefined && (sanitizedChild === null || typeof sanitizedChild !== 'object' || Object.keys(sanitizedChild).length > 0)) {
          result[key] = sanitizedChild
        }
      } else {
        result[key] = val
      }
    }
  }
  return result
}

/**
 * Validador de runtime para InternalSystemContext
 */
export function isValidInternalSystemContext(ctx: unknown): ctx is InternalSystemContext {
  if (!ctx || typeof ctx !== 'object') return false
  const c = ctx as Record<string, unknown>
  if (typeof c.clinicaId !== 'string' || c.clinicaId.trim() === '') return false
  if (typeof c.systemSource !== 'string' || !VALID_SYSTEM_SOURCES.includes(c.systemSource as SystemSource)) return false
  return true
}

/**
 * Registra uma ação no sistema de auditoria (system_logs).
 *
 * @param userId   - ID do usuário autenticado (ou null para chamadas internas de sistema)
 * @param action   - Tipo da ação: login, logout, criacao, edicao, exclusao, financeiro
 * @param entity   - Módulo/entidade afetada: pacientes, receitas, despesas, usuarios, auth...
 * @param details  - Objeto com detalhes contextuais (sem PII sensível)
 * @param userNome - Nome legível do usuário (opcional)
 * @param internalContext - Contexto explícito obrigatório para chamadas de sistema sem userId
 */
export async function logAction(
  userId: string | null | undefined,
  action: LogAction,
  entity: string,
  details?: Record<string, unknown>,
  userNome?: string,
  internalContext?: InternalSystemContext
) {
  try {
    let resolvedClinicaId: string | null = null
    let resolvedUserNome: string | null = userNome || null

    // ── 1 & 2. Para usuários autenticados, clinica_id vem EXCLUSIVAMENTE do banco ──
    if (userId) {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('user_profiles')
        .select('clinica_id, nome, role')
        .eq('id', userId)
        .maybeSingle()

      // ── 4. Erro de consulta: falha de forma segura sem aceitar tenant externo ──
      if (profileErr) {
        console.error(`[Logger] Erro ao consultar perfil para userId '${userId}': ${profileErr.message}`)
        return
      }

      // ── 3. Perfil inexistente: falha de forma segura ──
      if (!profile) {
        console.warn(`[Logger] Perfil inexistente para userId '${userId}'. Log descartado com segurança.`)
        return
      }

      // ── 5. super_admin sem clínica: trata a condição sem inventar tenant ──
      if (profile.role === 'super_admin' && !profile.clinica_id) {
        console.info(`[Logger] Ação de super_admin '${action}'/'${entity}' sem clínica vinculada. Ignorando tenant log.`)
        return
      }

      if (!profile.clinica_id) {
        console.warn(`[Logger] Usuário '${userId}' não possui clinica_id vinculada. Log descartado.`)
        return
      }

      resolvedClinicaId = profile.clinica_id
      if (!resolvedUserNome && profile.nome) {
        resolvedUserNome = profile.nome
      }
    } else if (isValidInternalSystemContext(internalContext)) {
      // ── 7. Chamada de sistema interna explicitamente validada em runtime ──
      resolvedClinicaId = internalContext.clinicaId
      resolvedUserNome = resolvedUserNome || `[Sistema/${internalContext.systemSource}]`
    } else {
      // Chamada sem userId e sem contexto de sistema explícito
      console.warn(`[Logger] Log ignorado para '${action}'/'${entity}': sem userId ou contexto interno confiável.`)
      return
    }

    if (!resolvedClinicaId) {
      console.warn(`[Logger] Log ignorado para '${action}'/'${entity}': clinica_id não identificado.`)
      return
    }

    // ── 6. Sanitização e Proteção LGPD por Allowlist Recursiva ──
    let safeDetails: Record<string, unknown>

    if (entity === 'prontuarios' || entity === 'evolucao') {
      // Allowlist estrita recursiva: descarta sumariamente qualquer campo clínico, inclusive aninhado
      safeDetails = (sanitizeClinicalDetails(details || {}) as Record<string, unknown>) || {}
    } else {
      safeDetails = details ? { ...details } : {}
    }
    safeDetails.clinica_id = resolvedClinicaId

    await supabaseAdmin.from('system_logs').insert([
      {
        clinica_id: resolvedClinicaId,
        user_id: userId || null,
        user_nome: resolvedUserNome,
        action,
        entity,
        details: safeDetails as unknown as Json,
      },
    ])
  } catch (err) {
    // Silencia erros de log para não interromper o fluxo principal
    console.error('[Logger] Falha inesperada ao registrar log:', err)
  }
}
