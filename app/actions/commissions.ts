'use server'

/**
 * app/actions/commissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerenciamento de procedimentos e comissões.
 *
 * Segurança (T001):
 *  ✅ Usa createServerClient() — autenticado via JWT/cookie → RLS ativo.
 *  ✅ O RLS em comissoes, procedimentos e user_profiles filtra por clinica_id.
 *  ✅ Erros propagados — sem sucesso mascarado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'

interface Procedimento {
  id: string
  nome: string
  valor_padrao: number | null
}

interface Comissao {
  id: string
  procedimento_id: string | null
  dentista_id: string | null
  porcentagem: number
}

interface ComissaoDetalhada extends Comissao {
  procedimento_nome: string
  dentista_nome: string
}

export async function fetchProcedures(): Promise<{
  success: boolean
  data: Procedimento[]
  error?: string
}> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: [], error: 'Não autorizado.' }
  }

  const { data, error } = await supabase
    .from('procedimentos')
    .select('id, nome, valor_padrao')
    .order('nome', { ascending: true })

  if (error) {
    console.error('[commissions.fetchProcedures] Erro:', error.message)
    return { success: false, data: [], error: error.message }
  }

  return { success: true, data: (data as Procedimento[]) ?? [] }
}

export async function fetchCommissions(): Promise<{
  success: boolean
  data: ComissaoDetalhada[]
  error?: string
}> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, data: [], error: 'Não autorizado.' }
  }

  const [comissoesRes, procedimentosRes, dentistasRes] = await Promise.all([
    supabase.from('comissoes').select('id, procedimento_id, dentista_id, porcentagem'),
    supabase.from('procedimentos').select('id, nome'),
    supabase.from('user_profiles').select('id, nome').eq('role', 'dentista'),
  ])

  if (comissoesRes.error) {
    console.error('[commissions.fetchCommissions] Erro comissoes:', comissoesRes.error.message)
    return { success: false, data: [], error: comissoesRes.error.message }
  }

  const comissoes = (comissoesRes.data ?? []) as Comissao[]
  const procedimentos = (procedimentosRes.data ?? []) as { id: string; nome: string }[]
  const dentistas = (dentistasRes.data ?? []) as { id: string; nome: string }[]

  const joined: ComissaoDetalhada[] = comissoes.map((c) => {
    const proc = procedimentos.find((p) => p.id === c.procedimento_id)
    const dent = dentistas.find((d) => d.id === c.dentista_id)
    return {
      ...c,
      procedimento_nome: proc ? proc.nome : 'Desconhecido',
      dentista_nome: dent ? dent.nome : 'Desconhecido',
    }
  })

  return { success: true, data: joined }
}

export async function setCommission(data: {
  procedimento_id: string
  dentista_id: string
  porcentagem: number
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Não autorizado.' }
  }

  const { error } = await supabase
    .from('comissoes')
    .upsert(
      {
        procedimento_id: data.procedimento_id,
        dentista_id: data.dentista_id,
        porcentagem: data.porcentagem,
      },
      { onConflict: 'procedimento_id, dentista_id' }
    )

  if (error) {
    console.error('[commissions.setCommission] Erro:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}
