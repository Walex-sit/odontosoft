/**
 * app/lib/supabaseAdmin.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exporta o cliente admin padronizado (T001 — Fase 1).
 * Mantido para compatibilidade com imports existentes de infraestrutura.
 *
 * USO RESTRITO — Apenas em operações auth.admin.* (criação/deleção de usuários).
 * O guard `server-only` é aplicado via '@/app/lib/supabase/admin'.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export { supabaseAdmin } from './supabase/admin'