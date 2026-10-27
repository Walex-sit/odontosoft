'use client'

import Link from 'next/link'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    badge: 'Demonstração',
    description: 'Ideal para conhecer a experiência, testar o odontograma e navegar pelo dashboard clínico.',
    price: 'R$ 0',
    period: '/mês',
    popular: false,
    ctaText: 'Começar agora',
    ctaStyle:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 hover:border-slate-300',
    features: [
      'Acesso completo ao Dashboard',
      '50 Pacientes fictícios para testes',
      'Odontograma digital básico',
      'Agenda e marcação de consultas',
      'Exportação de dados em CSV',
      'Suporte via documentação técnica',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    badge: 'Portfólio Completo',
    popularBadge: 'Mais Popular',
    description: 'Para clínicas que exigem produtividade máxima, gestão financeira e múltiplos dentistas.',
    price: 'R$ 197',
    period: '/mês',
    popular: true,
    ctaText: 'Começar agora',
    ctaStyle:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35',
    features: [
      'Pacientes ilimitados',
      'Odontograma digital interativo completo (32 dentes)',
      'Integração e controle financeiro completo',
      'Split automático para dentistas associados',
      'Isolamento multi-tenant avançado (PostgreSQL RLS)',
      'Relatórios gerenciais completos e DRE clínico',
      'Lembretes automáticos via WhatsApp',
      'Suporte prioritário 24/7',
    ],
  },
]

export default function PricingSection() {
  return (
    <section className="py-24 px-6 bg-slate-50/60 border-t border-slate-100" id="preços">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 shadow-2xs">
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-slate-900 tracking-tight mb-4">
            Preços transparentes para cada etapa da sua clínica
          </h2>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed">
            Sem letras miúdas ou taxas ocultas. Escolha o plano perfeito para a sua operação ou explore a demonstração interativa.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'bg-white border-2 border-blue-600 shadow-xl shadow-blue-500/10 ring-4 ring-blue-50'
                  : 'bg-white border border-slate-200/90 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Popular Tag */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-heading font-bold text-slate-900">
                    {plan.name}
                  </h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                    {plan.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                  {plan.description}
                </p>

                {/* Price display */}
                <div className="flex items-baseline gap-1.5 mb-8 pb-6 border-b border-slate-100">
                  <span className="text-4xl sm:text-5xl font-heading font-extrabold text-slate-900 tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm font-medium text-slate-400">
                    {plan.period}
                  </span>
                </div>

                {/* Feature List */}
                <div className="mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    O que está incluído:
                  </p>
                  <ul className="space-y-3.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-xs sm:text-sm text-slate-600"
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
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
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link
                  href="/register"
                  id={`pricing-cta-${plan.id}`}
                  className={`w-full inline-flex items-center justify-center gap-2 font-bold text-sm sm:text-base py-3.5 px-6 rounded-2xl transition-all duration-200 active:scale-95 ${plan.ctaStyle}`}
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

        {/* Demo Disclaimer / Notice */}
        <div className="mt-12 text-center">
          <p className="text-xs sm:text-sm text-slate-400 inline-flex items-center gap-2">
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
            Ambiente de demonstração técnica e portfólio. Nenhuma cobrança financeira é realizada.
          </p>
        </div>
      </div>
    </section>
  )
}
