'use client'

import { useRef, useEffect } from 'react'

// ─── 4 Pilares estratégicos de Segurança & LGPD ───────────────────────────────
const securityPillars = [
  {
    id: 'lgpd',
    badge: 'LGPD',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    title: 'Conformidade Total com a LGPD',
    subtitle:
      'Criptografia de ponta a ponta e gestão segura de dados sensíveis de saúde — em conformidade rigorosa com a Lei Geral de Proteção de Dados.',
    accentColor: '#059669',
    bgGradient: 'from-emerald-50/60 to-white',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    stats: [
      { label: 'Criptografia', value: 'AES-256' },
      { label: 'Dados sensíveis', value: 'Protegidos' },
    ],
  },
  {
    id: 'multitenant',
    badge: 'Multi-Tenant',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/60',
    title: 'Isolamento Absoluto de Dados',
    subtitle:
      'Arquitetura multi-tenant com privacidade total entre clínicas — os prontuários e dados da sua clínica nunca são acessados por terceiros.',
    accentColor: '#2563eb',
    bgGradient: 'from-blue-50/60 to-white',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="5" rx="2" />
        <rect x="2" y="11" width="9" height="5" rx="2" />
        <rect x="13" y="11" width="9" height="5" rx="2" />
        <rect x="2" y="19" width="9" height="2.5" rx="1.25" />
        <rect x="13" y="19" width="9" height="2.5" rx="1.25" />
      </svg>
    ),
    stats: [
      { label: 'Isolamento', value: 'Nível de Linha (RLS)' },
      { label: 'Compartilhamento', value: 'Zero' },
    ],
  },
  {
    id: 'uptime',
    badge: 'Infraestrutura',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200/60',
    title: 'Disponibilidade e Backups Automáticos',
    subtitle:
      'Infraestrutura em nuvem de nível empresarial com 99.9% de uptime e rotinas automáticas de backups contínuos de todas as suas informações.',
    accentColor: '#7c3aed',
    bgGradient: 'from-violet-50/60 to-white',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
    stats: [
      { label: 'Disponibilidade', value: '99.9%' },
      { label: 'Rotina de Backups', value: 'Contínuos' },
    ],
  },
  {
    id: 'rbac',
    badge: 'Controle de Acesso',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/60',
    title: 'Auditoria e Controle de Acesso',
    subtitle:
      'Permissões granulares por função (recepcionista, dentista, administrador) com registro completo de logs e rastreabilidade total.',
    accentColor: '#d97706',
    bgGradient: 'from-amber-50/60 to-white',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    stats: [
      { label: 'Níveis de Permissão', value: 'Granulares' },
      { label: 'Logs de Auditoria', value: 'Completos' },
    ],
  },
]

// ─── Selos de conformidade / trust signals ─────────────────────────────────────
const trustBadges = [
  { label: 'Conformidade LGPD' },
  { label: 'Criptografia Ponta a Ponta' },
  { label: 'Isolamento Multi-Tenant' },
  { label: 'Backups Automáticos Diários' },
  { label: 'Auditoria e Logs de Acesso' },
  { label: 'Alta Disponibilidade (99.9%)' },
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
      id="seguranca"
      className="relative py-24 px-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden"
    >
      {/* Âncora retrocompatível com #tecnologias */}
      <div id="tecnologias" className="absolute -top-24" />

      <div className="max-w-7xl mx-auto">

        {/* ── Título da seção ── */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-4 text-center mb-12"
          style={{ '--delay': '0ms' } as React.CSSProperties}
        >
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 border border-emerald-200/60 shadow-2xs">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Segurança de Classe Empresarial &amp; LGPD
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-slate-900 tracking-tight">
            Segurança de Classe Empresarial, LGPD e{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Confiabilidade da Informação
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-4 max-w-2xl mx-auto leading-relaxed">
            Desenvolvido com padrões rigorosos de segurança e proteção de dados em saúde para que você gerencie sua clínica com total tranquilidade jurídica e operacional.
          </p>
        </div>

        {/* ── Selos de confiança (Trust Signals) ── */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-4 flex flex-wrap justify-center gap-2.5 mb-14"
          style={{ '--delay': '60ms' } as React.CSSProperties}
        >
          {trustBadges.map((badge) => (
            <span
              key={badge.label}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200/80 text-slate-700 text-[11px] sm:text-xs font-semibold px-3.5 py-1.5 rounded-xl shadow-2xs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {badge.label}
            </span>
          ))}
        </div>

        {/* ── 4 Pilares Estratégicos ── */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          style={{ '--delay': '120ms' } as React.CSSProperties}
        >
          {securityPillars.map((pillar) => (
            <div
              key={pillar.id}
              className="group flex flex-col items-start p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 text-left relative overflow-hidden"
            >
              {/* Fundo decorativo sutil no hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${pillar.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
              />

              {/* Ícone */}
              <div className="relative w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shrink-0 shadow-2xs">
                {pillar.icon}
              </div>

              {/* Badge */}
              <span className={`relative text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border mb-3 ${pillar.badgeColor}`}>
                {pillar.badge}
              </span>

              {/* Título */}
              <h3 className="relative text-base font-heading font-extrabold text-slate-900 mb-2 leading-snug">
                {pillar.title}
              </h3>

              {/* Descrição */}
              <p className="relative text-xs sm:text-[13px] text-slate-500 leading-relaxed mb-6 flex-1">
                {pillar.subtitle}
              </p>

              {/* Mini métricas */}
              <div className="relative flex items-center justify-between gap-2 w-full pt-4 border-t border-slate-100 mt-auto">
                {pillar.stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <span
                      className="text-xs sm:text-sm font-extrabold"
                      style={{ color: pillar.accentColor }}
                    >
                      {stat.value}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Card de Compromisso Institucional "Privacy by Design" ── */}
        <div
          data-animate-sp
          className="opacity-0 translate-y-6 mt-12"
          style={{ '--delay': '200ms' } as React.CSSProperties}
        >
          <div className="max-w-3xl mx-auto rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/60 p-7 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <h4 className="text-base font-bold text-slate-900">
                    Segurança e Privacidade por Princípio (Privacy by Design)
                  </h4>
                  <span className="text-[10px] font-semibold bg-emerald-100/70 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                    Padrão de Saúde
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                  A proteção dos dados dos seus pacientes e o sigilo profissional odontológico estão no centro de cada linha de código. O OdontoSoft aplica políticas de isolamento estrito para assegurar conformidade legal incondicional.
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  {['LGPD em Saúde', 'Sigilo Odontológico', 'Backups Redundantes', 'Isolamento de Base', 'Trilhas de Auditoria'].map((tag) => (
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
      `}</style>
    </section>
  )
}
