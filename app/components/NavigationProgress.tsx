'use client'

/**
 * app/components/NavigationProgress.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Barra de progresso ultra-fina e micro-transição no topo do Dashboard.
 * Fornece feedback tátil imediato em qualquer clique de navegação,
 * garantindo a sensação de software desktop nativo.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const currentPathRef = useRef(pathname)

  // Quando o pathname muda, encerra a animação com sucesso instantâneo
  useEffect(() => {
    if (currentPathRef.current !== pathname) {
      currentPathRef.current = pathname
      setProgress(100)
      const timeout = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 160)
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  // Escuta cliques em links internos para disparo antecipado e responsivo
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.target === '_blank'
      ) {
        return
      }

      const isInternal = href.startsWith('/') || href.startsWith(window.location.origin)
      if (isInternal && href !== pathname) {
        setIsNavigating(true)
        setProgress(25)

        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) {
              if (timerRef.current) clearInterval(timerRef.current)
              return 85
            }
            return prev + (85 - prev) * 0.3
          })
        }, 80)
      }
    }

    document.addEventListener('click', handleLinkClick, { capture: true })
    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true })
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pathname])

  if (!isNavigating && progress === 0) return null

  return (
    <div
      className="fixed top-16 left-0 right-0 z-50 h-[2.5px] pointer-events-none overflow-hidden bg-transparent"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.8)] transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  )
}
