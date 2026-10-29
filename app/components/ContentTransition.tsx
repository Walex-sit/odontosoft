'use client'

/**
 * app/components/ContentTransition.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Container de transição suave para as páginas do Dashboard.
 * Mantém Topbar e menus 100% estáticos enquanto o conteúdo interno transita
 * com aceleração por hardware (GPU) sem qualquer piscada ou salto de layout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

export default function ContentTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div
      key={pathname}
      className="flex-1 flex flex-col w-full h-full animate-route-fade will-change-transform"
    >
      {children}
    </div>
  )
}
