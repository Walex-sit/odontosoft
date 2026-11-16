'use server'

/**
 * app/actions/odontograma.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server Actions para o Odontograma Interativo.
 *
 * Segurança:
 *  ✅ RLS no Supabase garante isolamento multi-tenant por clinica_id.
 *  ✅ Upsert atómico: cria ou actualiza o único registo por (paciente, clinica, tipo).
 *  ✅ dentista_id preenchido a partir do JWT — sem confiança no cliente.
 *
 * Nota de tipos:
 *  A tabela `odontograma_registros` é nova e ainda não está reflectida em
 *  database.types.ts. Após aplicar a migration, regenere os tipos com:
 *    supabase gen types typescript --project-id <id> > app/lib/database.types.ts
 *  e remova o cast `as any` daqui.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'
import { requireActiveClinic } from '@/app/lib/auth-guards'
import type { SupabaseClient } from '@supabase/supabase-js'

export type StatusDente =
  | 'saudavel'
  | 'carie'
  | 'restaurado'
  | 'ausente'
  | 'extrair'
  | 'canal'
  | 'implante'
  | 'fraturado'
  | 'coroa'

export type TipoArcada = 'permanente' | 'deciduo'

export interface OdontogramaRegistro {
  id: string
  paciente_id: string
  clinica_id: string
  dentista_id: string | null
  tipo: TipoArcada
  status_map: Record<string, StatusDente>
  observacao: string | null
  atualizado_em: string
  created_at: string
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// Helper: acesso à tabela usando `any` até os tipos gerados serem actualizados
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const odontogramaTable = (sb: SupabaseClient<any>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (sb as any).from('odontograma_registros')

// ─── Carregar odontograma do paciente ────────────────────────────────────────

export async function carregarOdontograma(
  pacienteId: string,
  tipo: TipoArcada,
): Promise<ActionResult<OdontogramaRegistro | null>> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await odontogramaTable(supabase)
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('tipo', tipo)
      .maybeSingle()

    if (error) return { success: false, error: error.message }

    return { success: true, data: data as OdontogramaRegistro | null }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado ao carregar odontograma'
    return { success: false, error: msg }
  }
}

// ─── Salvar odontograma (upsert) ─────────────────────────────────────────────

export async function salvarOdontograma(payload: {
  pacienteId: string
  tipo: TipoArcada
  statusMap: Record<string, StatusDente>
  observacao: string
}): Promise<ActionResult<OdontogramaRegistro>> {
  try {
    let ctx: Awaited<ReturnType<typeof requireActiveClinic>>
    try { ctx = await requireActiveClinic() } catch (guardErr: any) { return { success: false, error: guardErr.message } }
    const supabase = ctx.supabase
    const user = ctx.user

    // clinica_id é preenchido automaticamente pelo trigger set_clinica_id
    // no INSERT. No upsert via conflito o UPDATE mantém o clinica_id existente.
    const { data, error } = await odontogramaTable(supabase)
      .upsert(
        {
          paciente_id: payload.pacienteId,
          tipo:        payload.tipo,
          status_map:  payload.statusMap,
          observacao:  payload.observacao.trim() || null,
          dentista_id: user.id,
          // clinica_id será preenchido pelo trigger no INSERT;
          // no UPDATE o RLS já garante o isolamento.
        },
        {
          onConflict: 'paciente_id,clinica_id,tipo',
          ignoreDuplicates: false,
        },
      )
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    return { success: true, data: data as OdontogramaRegistro }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado ao salvar odontograma'
    return { success: false, error: msg }
  }
}
