/**
 * app/lib/cache.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Camada de Cache em Memória com suporte a SWR (Stale-While-Revalidate).
 *
 * Elimina latências perceptíveis ao navegar entre abas do OdontoSoft,
 * mantendo dados consultados frequentemente (perfil, clínica, pacientes)
 * instantaneamente disponíveis no cliente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// Armazenamento em memória (persiste durante a sessão do usuário)
const memoryCache = new Map<string, CacheEntry<any>>()
const subscribers = new Map<string, Set<(data: any) => void>>()

// TTL padrão: 3 minutos (180.000 ms)
export const DEFAULT_CACHE_TTL = 3 * 60 * 1000

/**
 * Obtém um dado do cache se existir e não tiver expirado.
 */
export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null

  const isExpired = Date.now() - entry.timestamp > entry.ttl
  if (isExpired) {
    // Não remove imediatamente para permitir SWR, mas sinaliza como expirado
    return null
  }

  return entry.data as T
}

/**
 * Obtém o dado mesmo se estiver expirado (para padrão Stale-While-Revalidate)
 */
export function getStale<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  return entry ? (entry.data as T) : null
}

/**
 * Salva um dado no cache em memória.
 */
export function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_CACHE_TTL): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  })

  // Notifica assinantes ativos sobre a atualização
  const keySubscribers = subscribers.get(key)
  if (keySubscribers) {
    keySubscribers.forEach((cb) => {
      try {
        cb(data)
      } catch (err) {
        console.error(`[Cache] Erro no assinante de "${key}":`, err)
      }
    })
  }
}

/**
 * Invalida uma chave específica ou todas que comecem com um prefixo.
 * Ex: invalidateCache('pacientes') invalida 'pacientes' e 'pacientes:lista'
 */
export function invalidateCache(keyOrPrefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) {
      memoryCache.delete(key)
    }
  }
}

/**
 * Limpa todo o cache em memória.
 */
export function clearCache(): void {
  memoryCache.clear()
}

/**
 * Assina atualizações de uma chave de cache específica.
 */
export function subscribeCache<T>(key: string, callback: (data: T) => void): () => void {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set())
  }
  const set = subscribers.get(key)!
  set.add(callback)

  return () => {
    set.delete(callback)
    if (set.size === 0) {
      subscribers.delete(key)
    }
  }
}

/**
 * Executa uma busca com cache transparente.
 * Se o cache for válido, retorna imediatamente.
 * Caso contrário, executa o `fetcher`, salva no cache e retorna o resultado.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; forceRefresh?: boolean }
): Promise<T> {
  const ttl = options?.ttlMs ?? DEFAULT_CACHE_TTL

  if (!options?.forceRefresh) {
    const cached = getCached<T>(key)
    if (cached !== null) {
      return cached
    }
  }

  const freshData = await fetcher()
  setCached(key, freshData, ttl)
  return freshData
}
