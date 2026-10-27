'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2C8.5 2 5 5.5 5 9c0 3 2 5.5 4 7l1 5h4l1-5c2-1.5 4-4 4-7 0-3.5-3.5-7-7-7z" />
              <path d="M9 9h6M12 6v6" />
            </svg>
          </div>
          <span className="font-heading font-bold text-slate-800 text-lg tracking-tight">
            OdontoSoft
          </span>
        </div>

        {/* Links centrais - apenas desktop */}
        <div className="hidden md:flex items-center gap-8">
          {['Funcionalidades', 'Preços', 'Tecnologias'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            id="nav-cta-btn"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
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
