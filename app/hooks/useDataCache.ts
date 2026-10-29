'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getStale, setCached, subscribeCache, DEFAULT_CACHE_TTL } from '../lib/cache'

interface UseDataCacheOptions {
  ttlMs?: number
  enabled?: boolean
  revalidateOnMount?: boolean
}

/**
 * Hook para consumo de dados com estratégia Stale-While-Revalidate (SWR).
 * Retorna dados instantaneamente se já existirem no cache em memória,
 * eliminando spinners de carregamento em trocas de rota.
 */
export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseDataCacheOptions = {}
) {
  const {
    ttlMs = DEFAULT_CACHE_TTL,
    enabled = true,
    revalidateOnMount = true,
  } = options

  // Inicialização síncrona: se já existir em memória, carrega sem spinner (loading: false)
  const initialData = enabled ? getStale<T>(key) : null
  const [data, setData] = useState<T | null>(initialData)
  const [loading, setLoading] = useState<boolean>(enabled && initialData === null)
  const [error, setError] = useState<Error | null>(null)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const loadData = useCallback(async (isBackground = false) => {
    if (!enabled) return

    if (!isBackground) {
      const existing = getStale<T>(key)
      if (!existing) {
        setLoading(true)
      }
    }

    try {
      setError(null)
      const fresh = await fetcherRef.current()
      setCached(key, fresh, ttlMs)
      setData(fresh)
    } catch (err: any) {
      console.error(`[useDataCache] Erro ao carregar "${key}":`, err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [key, enabled, ttlMs])

  useEffect(() => {
    if (!enabled) return

    // Assina atualizações em tempo real feitas por outras partes do app
    const unsubscribe = subscribeCache<T>(key, (updatedData) => {
      setData(updatedData)
      setLoading(false)
    })

    const currentCached = getStale<T>(key)
    if (currentCached) {
      setData(currentCached)
      setLoading(false)
      if (revalidateOnMount) {
        // Revalida em segundo plano sem travar a UI
        loadData(true)
      }
    } else {
      loadData(false)
    }

    return () => {
      unsubscribe()
    }
  }, [key, enabled, revalidateOnMount, loadData])

  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    setData((prev) => {
      const resolved = typeof newData === 'function' ? (newData as any)(prev) : newData
      setCached(key, resolved, ttlMs)
      return resolved
    })
  }, [key, ttlMs])

  const refresh = useCallback(() => loadData(false), [loadData])

  return {
    data,
    loading,
    error,
    refresh,
    mutate,
  }
}
