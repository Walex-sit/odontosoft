'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/app/components/BrandLogo'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 border-b border-[var(--border)] shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <BrandLogo size="sm" />

        {/* Links centrais - apenas desktop */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Funcionalidades', href: '#funcionalidades' },
            { label: 'Preços', href: '#preços' },
            { label: 'Segurança & LGPD', href: '#seguranca' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors duration-200"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-2"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            id="nav-cta-btn"
            className="inline-flex items-center gap-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
          >
            Testar OdontoSoft Grátis
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  )
}
