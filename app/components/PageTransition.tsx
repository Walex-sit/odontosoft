'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    const elements = container.current.children

    gsap.fromTo(
      elements,
      { 
        y: 20, 
        opacity: 0 
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        stagger: 0.05,
        ease: "power3.out",
        clearProps: "all"
      }
    )
  }, [])

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  )
}
