'use client'

import Link from 'next/link'

const plans = [
  {
    id: 'starter',
    name: 'Avaliação de 7 Dias',
    badge: 'Trial Restrito',
    description: 'Período de teste de 7 dias com limitações de recursos essenciais. Exige upgrade para desbloqueio completo após o prazo.',
    price: 'R$ 0',
    period: '/ 7 dias',
    popular: false,
    ctaText: 'Iniciar Teste de 7 Dias',
    ctaStyle:
      'bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-medium)]',
    features: [
      '7 dias de teste gratuito',
      'Até 50 pacientes cadastrados',
      'Odontograma digital essencial',
      'Agenda para 1 profissional',
      'Recursos avançados e DRE bloqueados',
      'Exige plano pago para continuidade',
    ],
  },
  {
    id: 'premium',
    name: 'Plano Profissional Completo',
    badge: 'Desbloqueio Total',
    popularBadge: 'Mais Escolhido',
    description: 'Acesso irrestrito a todos os módulos clínicos, relatórios financeiros DRE, conformidade LGPD e múltiplos profissionais.',
    price: 'R$ 197',
    period: '/mês',
    popular: true,
    ctaText: 'Desbloquear Acesso Completo',
    ctaStyle:
      'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] shadow-lg  hover:',
    features: [
      'Pacientes e prontuários ilimitados',
      'Odontograma interativo completo (32 dentes)',
      'Controle financeiro e DRE analítico liberados',
      'Múltiplos dentistas e divisão de comissões',
      'Lembretes de consulta via WhatsApp',
      'Auditoria de segurança e conformidade LGPD',
      'Isolamento multi-tenant de banco de dados',
      'Suporte prioritário e backups automáticos',
    ],
  },
]

export default function PricingSection() {
  return (
    <section className="relative py-24 px-6 bg-[var(--bg-base)] border-t border-[var(--border)]" id="preços">
      <div id="precos" className="absolute -top-24" />
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-[var(--primary-subtle)] border border-[var(--primary)]/40 text-[var(--primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4 shadow-2xs">
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
          <p className="text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
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
                  ? 'bg-white border-2 border-[var(--primary)]/40 shadow-xl  ring-4 ring-[var(--primary)]'
                  : 'bg-white border border-[var(--border)]/90 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Popular Tag */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-[var(--primary)] text-[var(--on-primary)] text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
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
                  <h3 className="text-xl font-heading font-bold text-[var(--text-primary)]">
                    {plan.name}
                  </h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]/60">
                    {plan.badge}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed mb-6">
                  {plan.description}
                </p>

                {/* Price display */}
                <div className="flex items-baseline gap-1.5 mb-8 pb-6 border-b border-[var(--border)]">
                  <span className="text-4xl sm:text-5xl font-heading font-extrabold text-[var(--text-primary)] tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-muted)]">
                    {plan.period}
                  </span>
                </div>

                {/* Feature List */}
                <div className="mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
                    O que está incluído:
                  </p>
                  <ul className="space-y-3.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-xs sm:text-sm text-[var(--text-secondary)]"
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
          <p className="text-xs sm:text-sm text-[var(--text-muted)] inline-flex items-center gap-2">
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
