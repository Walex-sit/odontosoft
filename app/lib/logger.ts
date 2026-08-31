"use server";

/**
 * app/lib/logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sistema centralizado de registro de auditoria (system_logs).
 *
 * Segurança (T001):
 *  ✅ Utiliza supabaseAdmin de modo isolado para persistir registros de
 *     auditoria mesmo em contextos sem sessão ativa (ex: logout, login falho).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabaseAdmin } from '@/app/lib/supabase/admin'
import type { Json } from '@/app/lib/database.types'

export type LogAction = 'login' | 'logout' | 'criacao' | 'edicao' | 'exclusao' | 'financeiro'

/**
 * Registra uma ação no sistema de auditoria (system_logs).
 *
 * @param userId   - ID do usuário que realizou a ação (obrigatório)
 * @param action   - Tipo da ação: login, logout, criacao, edicao, exclusao, financeiro
 * @param entity   - Módulo/entidade afetada: pacientes, receitas, despesas, usuarios, auth...
 * @param details  - Objeto com detalhes contextuais (nome, valor, id do registro, etc.)
 * @param userNome - Nome legível do usuário (gravado denormalizado para leitura rápida)
 */
export async function logAction(
  userId: string,
  action: LogAction,
  entity: string,
  details?: Record<string, unknown>,
  userNome?: string
) {
  try {
    await supabaseAdmin.from('system_logs').insert([
      {
        user_id: userId || null,
        user_nome: userNome || null,
        action,
        entity,
        details: (details as unknown as Json) || null,
      },
    ])
  } catch (err) {
    // Silencia erros de log para não interromper o fluxo principal
    console.error('[Logger] Falha ao registrar log:', err)
  }
}
