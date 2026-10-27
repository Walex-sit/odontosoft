'use client'

import { useRef, useEffect } from 'react'

const technologies = [
  {
    name: 'Next.js 16',
    category: 'App Router & SSR',
    color: '#000000',
    icon: (
      <svg width="22" height="22" viewBox="0 0 180 180" fill="none">
        <circle cx="90" cy="90" r="90" fill="#000000" />
        <path
          d="M149.508 157.438L69.1478 54H54V125.97H66.2952V69.3831L139.99 164.845C143.333 162.614 146.509 160.137 149.508 157.438Z"
          fill="url(#next_grad)"
        />
        <rect x="115" y="54" width="12" height="72" fill="url(#next_grad2)" />
        <defs>
          <linearGradient id="next_grad" x1="109" y1="116.5" x2="144.5" y2="160.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="next_grad2" x1="121" y1="54" x2="120.799" y2="106.875" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    name: 'Supabase',
    category: 'PostgreSQL & RLS',
    color: '#3ecf8e',
    icon: (
      <svg width="22" height="22" viewBox="0 0 109 113" fill="none">
        <path
          d="M63.7076 110.284C60.848 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0632L99.1936 40.0632C106.034 40.0632 109.919 47.8344 105.733 53.2389L63.7076 110.284Z"
          fill="url(#supabase_grad1)"
        />
        <path
          d="M45.317 2.71617C48.1766 -0.884877 53.9744 1.08803 54.0433 5.68603L54.3475 72.9368H9.83109C2.99049 72.9368 -0.894376 65.1656 3.29177 59.7611L45.317 2.71617Z"
          fill="#3ECF8E"
        />
        <defs>
          <linearGradient id="supabase_grad1" x1="53.9738" y1="54.9782" x2="94.4632" y2="70.923" gradientUnits="userSpaceOnUse">
            <stop stopColor="#249361" />
            <stop offset="1" stopColor="#3ECF8E" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    name: 'Tailwind CSS',
    category: 'Design System',
    color: '#06b6d4',
    icon: (
      <svg width="22" height="22" viewBox="0 0 54 33" fill="none">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M27 0C18.9 0 13.5 5.4 10.8 16.2C13.5 10.8 17.55 8.1 22.95 8.1C31.05 8.1 35.1 13.5 35.1 24.3C35.1 27 34.2 29.7 32.4 32.4C40.5 32.4 45.9 27 48.6 16.2C45.9 21.6 41.85 24.3 36.45 24.3C28.35 24.3 24.3 18.9 24.3 8.1C24.3 5.4 25.2 2.7 27 0ZM10.8 16.2C2.7 16.2 -2.7 21.6 -5.4 32.4C-2.7 27 1.35 24.3 6.75 24.3C14.85 24.3 18.9 29.7 18.9 40.5C18.9 43.2 18 45.9 16.2 48.6C24.3 48.6 29.7 43.2 32.4 32.4C29.7 37.8 25.65 40.5 20.25 40.5C12.15 40.5 8.1 35.1 8.1 24.3C8.1 21.6 9 18.9 10.8 16.2Z"
          fill="#38BDF8"
        />
      </svg>
    ),
  },
  {
    name: 'TypeScript',
    category: 'Strict Type Safety',
    color: '#3178c6',
    icon: (
      <svg width="22" height="22" viewBox="0 0 128 128" fill="none">
        <rect width="128" height="128" rx="20" fill="#3178C6" />
        <path
          d="M68.5 73.5C70.6 77.2 73.7 80.2 78.4 80.2C82.8 80.2 85.5 77.9 85.5 74.4C85.5 70.4 82.5 68.8 77.1 66.4C69.4 63.1 62.8 59.4 62.8 50.8C62.8 42.4 69.3 36 79.1 36C86.3 36 91.5 39 95 44.7L86.4 50.4C84.7 47.3 82.3 45.7 78.9 45.7C75.6 45.7 73.3 47.7 73.3 50.5C73.3 53.8 75.7 55.2 81.3 57.6C89.4 61.1 96 64.9 96 73.7C96 83.1 88.5 89.9 78 89.9C68.3 89.9 62.2 85.4 58.7 78.5L68.5 73.5ZM24 45.5H38.5V90H49.5V45.5H64V36H24V45.5Z"
          fill="white"
        />
      </svg>
    ),
  },
  {
    name: 'Vercel',
    category: 'Edge & Serverless',
    color: '#000000',
    icon: (
      <svg width="20" height="20" viewBox="0 0 1155 1000" fill="none">
        <path d="M577.346 0L1154.69 1000H0L577.346 0Z" fill="#000000" />
      </svg>
    ),
  },
]

const architectureHighlights = [
  {
    title: 'Multi-tenant',
    subtitle: 'Isolamento total de dados por clínica (RLS).',
    badge: 'Arquitetura',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/60',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
  },
  {
    title: 'Pronto para LGPD',
    subtitle: 'Criptografia de dados sensíveis e conformidade.',
    badge: 'Segurança',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Alta Performance',
    subtitle: 'Construído com Next.js 16 e Supabase.',
    badge: 'Stack Moderna',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'Uptime 99.9%',
    subtitle: 'Infraestrutura serverless na Vercel.',
    badge: 'Resiliência',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200/60',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
  },
]

export default function SocialProofSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      { threshold: 0.05, rootMargin: '80px 0px' }
    )
    const el = sectionRef.current
    if (el) {
      el.querySelectorAll('[data-animate-sp]').forEach((child) => observer.observe(child))
    }
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="tecnologias"
      className="py-20 px-6 bg-gradient-to-b from-white to-slate-50 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section title */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-4 text-center mb-10"
          style={{ '--delay': '0ms' } as React.CSSProperties}
        >
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-3">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Stack & Infraestrutura
          </div>
          <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-900 tracking-tight">
            Tecnologias utilizadas na plataforma
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xl mx-auto">
            Ecossistema robusto para alta disponibilidade, segurança de dados em saúde e experiência fluida.
          </p>
        </div>

        {/* Tech Logos Marquee */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-6"
          style={{ '--delay': '80ms' } as React.CSSProperties}
        >
          <div className="relative">
            {/* Gradient edge masks */}
            <div className="absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
            
            <div className="flex gap-4 overflow-hidden py-2">
              <div className="flex gap-4 animate-marquee shrink-0">
                {[...technologies, ...technologies, ...technologies].map((tech, i) => (
                  <div
                    key={`${tech.name}-${i}`}
                    className="shrink-0 flex items-center gap-3.5 bg-white border border-slate-200/90 rounded-2xl px-5 py-3 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-100 p-1.5">
                      {tech.icon}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800 whitespace-nowrap block">
                        {tech.name}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap block">
                        {tech.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Technical Architecture Highlights Grid */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-6 mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ '--delay': '160ms' } as React.CSSProperties}
        >
          {architectureHighlights.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-start p-6 rounded-3xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left relative overflow-hidden group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border mb-2 ${item.badgeColor}`}>
                {item.badge}
              </span>
              <div className="text-lg font-heading font-extrabold text-slate-900 mb-1">
                {item.title}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {item.subtitle}
              </div>
            </div>
          ))}
        </div>

        {/* Engineering & Portfolio Showcase Card */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-6 mt-12"
          style={{ '--delay': '240ms' } as React.CSSProperties}
        >
          <div className="max-w-3xl mx-auto rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-slate-50/80 p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <h4 className="text-base font-bold text-slate-900">
                    Demonstração Técnica &amp; Portfólio de Engenharia
                  </h4>
                  <span className="text-[10px] font-semibold bg-blue-100/70 text-blue-700 px-2.5 py-0.5 rounded-full">
                    SaaS Completo
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  O OdontoSoft foi concebido para ilustrar a implementação prática de uma aplicação SaaS corporativa moderna no segmento de saúde odontológica: segurança em nível de linha (RLS) no banco de dados, fluxo de autenticação robusto e tipagem estrita de ponta a ponta.
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  {['PostgreSQL RLS', 'Next.js App Router', 'TypeScript', 'Server Actions', 'Turbopack'].map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        [data-animate-sp] {
          transition: opacity 0.7s ease, transform 0.7s ease;
          transition-delay: var(--delay, 0ms);
        }
        [data-animate-sp].animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
