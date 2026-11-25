'use client'

import Link from 'next/link'
import { PLANOS_SAAS_CATALOG, TRIAL_PLAN } from '@/app/lib/plans'
import { IS_NON_PRODUCTION_ENV } from '@/app/lib/env'

interface LandingPlanCard {
  id: string
  name: string
  badge: string
  popularBadge?: string
  description: string
  price: string
  period: string
  limitNote: string
  popular: boolean
  ctaHref: string
  ctaText: string
  features: string[]
  limitations?: string[]
}

const plans: LandingPlanCard[] = [
  {
    id: TRIAL_PLAN.id,
    name: TRIAL_PLAN.nome,
    badge: TRIAL_PLAN.badge,
    description: TRIAL_PLAN.descricao,
    price: TRIAL_PLAN.precoLabel,
    period: TRIAL_PLAN.periodo,
    limitNote: TRIAL_PLAN.limites.resumoCurto,
    popular: false,
    ctaHref: '/register',
    ctaText: TRIAL_PLAN.ctaText,
    features: TRIAL_PLAN.recursos,
    limitations: TRIAL_PLAN.limitacoes,
  },
  {
    id: PLANOS_SAAS_CATALOG.essencial.id,
    name: PLANOS_SAAS_CATALOG.essencial.nomeCompleto,
    badge: PLANOS_SAAS_CATALOG.essencial.badge,
    description: PLANOS_SAAS_CATALOG.essencial.descricao,
    price: `R$ ${PLANOS_SAAS_CATALOG.essencial.precoMensal}`,
    period: '/mês',
    limitNote: `${PLANOS_SAAS_CATALOG.essencial.limites.dentistas} · ${PLANOS_SAAS_CATALOG.essencial.limites.armazenamento}`,
    popular: false,
    ctaHref: '/planos',
    ctaText: PLANOS_SAAS_CATALOG.essencial.ctaText,
    features: PLANOS_SAAS_CATALOG.essencial.recursos,
  },
  {
    id: PLANOS_SAAS_CATALOG.premium.id,
    name: PLANOS_SAAS_CATALOG.premium.nomeCompleto,
    badge: PLANOS_SAAS_CATALOG.premium.badge,
    popularBadge: PLANOS_SAAS_CATALOG.premium.popularBadge,
    description: PLANOS_SAAS_CATALOG.premium.descricao,
    price: `R$ ${PLANOS_SAAS_CATALOG.premium.precoMensal}`,
    period: '/mês',
    limitNote: `${PLANOS_SAAS_CATALOG.premium.limites.dentistas} · ${PLANOS_SAAS_CATALOG.premium.limites.armazenamento}`,
    popular: true,
    ctaHref: '/planos',
    ctaText: PLANOS_SAAS_CATALOG.premium.ctaText,
    features: PLANOS_SAAS_CATALOG.premium.recursos,
  },
]

export default function PricingSection() {
  return (
    <section className="relative py-24 px-6 bg-[var(--bg-base)] border-t border-[var(--border)]" id="preços">
      <div id="precos" className="absolute -top-24" />
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-[var(--primary-subtle)] border border-[var(--primary)]/40 text-[var(--primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Planos &amp; Preços
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
            Preços transparentes para cada etapa da sua clínica
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
            Sem letras miúdas ou taxas ocultas. Escolha o plano ideal para a sua equipe ou comece com 7 dias gratuitos.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-7 sm:p-8 flex flex-col justify-between bg-[var(--bg-surface)] transition-colors ${plan.popular
                ? 'border-2 border-[var(--primary)]'
                : 'border border-[var(--border)]'
                }`}
            >
              {/* Recommended Tag */}
              {plan.popular && plan.popularBadge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-[var(--primary-fill)] text-[var(--on-primary)] text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    {plan.popularBadge}
                  </span>
                </div>
              )}

              <div>
                {/* Header card info */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h3 className="text-xl font-heading font-bold text-[var(--text-primary)]">
                    {plan.name}
                  </h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
                    {plan.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                  {plan.description}
                </p>

                {/* Price display */}
                <div className="mb-6 pb-6 border-b border-[var(--border)]">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-heading font-extrabold text-[var(--text-primary)] tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--primary)] mt-2">
                    {plan.limitNote}
                  </p>
                </div>

                {/* Included Feature List */}
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
                    O que está incluído:
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-xs sm:text-sm text-[var(--text-primary)]"
                      >
                        <div className="w-5 h-5 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center shrink-0 mt-0.5">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limitations (separated with neutral dash icon — never check) */}
                {plan.limitations && plan.limitations.length > 0 && (
                  <div className="mb-8 pt-5 border-t border-[var(--border)]">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                      Limitações do período de teste:
                    </p>
                    <ul className="space-y-2.5">
                      {plan.limitations.map((limitation) => (
                        <li
                          key={limitation}
                          className="flex items-start gap-3 text-xs sm:text-sm text-[var(--text-secondary)]"
                        >
                          <div className="w-5 h-5 rounded-full bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 mt-0.5">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </div>
                          <span className="leading-snug">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  href={plan.ctaHref}
                  id={`pricing-cta-${plan.id}`}
                  className={`w-full inline-flex items-center justify-center gap-2 font-bold text-sm sm:text-base py-3.5 px-6 rounded-2xl transition-colors active:scale-95 ${plan.popular
                    ? 'bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)]'
                    : 'bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-medium)]'
                    }`}
                >
                  {plan.ctaText}
                  <svg
                    width="15"
                    height="15"
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
          ))}
        </div>

        {/* Demo Disclaimer / Notice — apenas desenvolvimento/staging, nunca em produção */}
        {IS_NON_PRODUCTION_ENV && (
          <div className="mt-12 text-center">
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] inline-flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Ambiente de demonstração técnica. Nenhuma cobrança automática é realizada sem confirmação.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
