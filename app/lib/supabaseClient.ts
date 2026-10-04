/**
 * app/lib/supabaseClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exporta o cliente de browser padronizado (T001 — Fase 1).
 * Mantido para compatibilidade com imports existentes em Client Components.
 *
 * ⚠️  DEPRECAÇÃO: Prefira importar diretamente de '@/app/lib/supabase/client'.
 *      Este arquivo será removido em futura refatoração gradual dos imports.
 *
 * NUNCA importar supabaseAdmin daqui — use '@/app/lib/supabase/admin' e
 * apenas em Server Actions de infraestrutura auth.admin.*.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getBrowserClient } from './supabase/client'

/**
 * Cliente Supabase singleton para Client Components.
 * Usa ANON KEY — o RLS protege todos os acessos com base no JWT do usuário.
 */
export const supabase = getBrowserClient()