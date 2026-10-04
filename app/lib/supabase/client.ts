/**
 * app/lib/supabase/client.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente Supabase para uso em Client Components ('use client').
 * Criado com ANON KEY — nunca expõe a SERVICE_ROLE_KEY ao browser.
 * O isolamento de dados é garantido pelo RLS + JWT do usuário logado.
 *
 * USO: import { createBrowserClient } from '@/app/lib/supabase/client'
 *      const supabase = createBrowserClient()
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import type { Database } from '../database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('[Supabase/client] NEXT_PUBLIC_SUPABASE_URL não está definida.')
}

if (!supabaseAnonKey) {
  throw new Error('[Supabase/client] NEXT_PUBLIC_SUPABASE_ANON_KEY não está definida.')
}

/**
 * Retorna um cliente Supabase para uso em Client Components.
 * Usa ANON KEY — o RLS protege todos os acessos com base no JWT do usuário.
 */
export function createBrowserClient() {
  return _createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}

/**
 * Singleton para componentes que precisam de acesso fora de hooks.
 * @deprecated Prefira chamar createBrowserClient() localmente para garantir
 *             que o estado de sessão esteja sempre atualizado.
 */
let _singleton: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (!_singleton) {
    _singleton = createBrowserClient()
  }
  return _singleton
}
