'use client'

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

interface SmoothScrollProps {
  children: React.ReactNode
  className?: string
}

export default function SmoothScroll({ children, className = '' }: SmoothScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only initialize Lenis if we're wrapping a specific scrollable container
    // or if we want it to control the window scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  return (
    <div ref={scrollRef} className={className}>
      {children}
    </div>
  )
}
