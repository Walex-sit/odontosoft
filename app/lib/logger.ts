"use server";
import { createClient } from '@supabase/supabase-js'

export type LogAction = 'login' | 'logout' | 'criacao' | 'edicao' | 'exclusao' | 'financeiro'

/**
 * Cria um cliente Supabase com a service role key para garantir que os logs
 * sejam sempre gravados, independentemente das políticas de RLS.
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('[Logger] Variáveis de ambiente Supabase ausentes.')
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Registra uma ação no sistema de auditoria (system_logs).
 *
 * @param userId   - ID do usuário que realizou a ação (obrigatório)
 * @param action   - Tipo da ação: login, logout, criacao, edicao, exclusao, financeiro
 * @param entity   - Módulo/entidade afetada: pacientes, receitas, despesas, usuarios, auth...
 * @param details  - Objeto com detalhes contextuais (nome, valor, id do registro, etc.)
 * @param userNome - Nome legível do usuário (gravado denormalizado para leitura rápida)
 *
 * Exemplo:
 *   await logAction(userId, 'criacao', 'pacientes', { nome: 'João Silva' }, 'Dra. Ana')
 *   await logAction(userId, 'financeiro', 'receitas', { descricao: 'Implante', valor: 3500 })
 */
export async function logAction(
  userId: string,
  action: LogAction,
  entity: string,
  details?: Record<string, unknown>,
  userNome?: string
) {
  try {
    const supabaseAdmin = getAdminClient()
    await supabaseAdmin.from('system_logs').insert([
      {
        user_id: userId || null,
        user_nome: userNome || null,
        action,
        entity,
        details: details || null,
      },
    ])
  } catch (err) {
    // Silencia erros de log para não quebrar o fluxo principal
    console.error('[Logger] Falha ao registrar log:', err)
  }
}
