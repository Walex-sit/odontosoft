'use client'

import { useState } from 'react'
import { Check, Minus, ArrowRight, ShieldCheck, CreditCard, HelpCircle } from 'lucide-react'
import { PLANOS_SAAS_CATALOG, TRIAL_PLAN, formatPlanPriceBRL } from '@/app/lib/plans'

const plans = [
  {
    id: TRIAL_PLAN.id,
    name: TRIAL_PLAN.nome,
    price: TRIAL_PLAN.precoMensal,
    annualPrice: 0,
    period: TRIAL_PLAN.periodo,
    description: TRIAL_PLAN.descricao,
    features: TRIAL_PLAN.recursos,
    limitations: TRIAL_PLAN.limitacoes,
    popular: false,
    buttonStyle: 'bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--border)] border border-[var(--border)]'
  },
  {
    id: PLANOS_SAAS_CATALOG.essencial.id,
    name: PLANOS_SAAS_CATALOG.essencial.nome,
    price: PLANOS_SAAS_CATALOG.essencial.precoMensal,
    annualPrice: PLANOS_SAAS_CATALOG.essencial.precoAnualMensalizado,
    period: '/mês',
    description: PLANOS_SAAS_CATALOG.essencial.descricao,
    features: PLANOS_SAAS_CATALOG.essencial.recursos,
    limitations: undefined,
    popular: false,
    buttonStyle: 'bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--border)] border border-[var(--border)]'
  },
  {
    id: PLANOS_SAAS_CATALOG.premium.id,
    name: PLANOS_SAAS_CATALOG.premium.nome,
    price: PLANOS_SAAS_CATALOG.premium.precoMensal,
    annualPrice: PLANOS_SAAS_CATALOG.premium.precoAnualMensalizado,
    period: '/mês',
    description: PLANOS_SAAS_CATALOG.premium.descricao,
    features: PLANOS_SAAS_CATALOG.premium.recursos,
    limitations: undefined,
    popular: true,
    popularBadge: PLANOS_SAAS_CATALOG.premium.popularBadge || 'Recomendado',
    buttonStyle: 'bg-[var(--primary-fill)] text-[var(--on-primary)] hover:bg-[var(--primary-fill-hover)] border border-transparent'
  }
]

export default function SubscriptionPage() {
  const [step, setStep] = useState(1) // 1: Plans, 2: Checkout, 3: Success
  const [selectedPlan, setSelectedPlan] = useState(plans[2])
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan)
    setStep(2)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[var(--bg-base)] dark:bg-[var(--bg-base)]">

      {/* Container Centralizado */}
      <div className="max-w-6xl mx-auto w-full px-6 py-12">

        {/* Banner Informativo de Auditoria e Desativação Segura do Gateway */}
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-600 dark:text-amber-400">
              Pagamentos Online Temporariamente Desabilitados para Auditoria Técnica
            </p>
            <p className="text-amber-700/80 dark:text-amber-400/80 mt-1">
              O processamento automatizado via gateway Stripe encontra-se em fase de auditoria de prontidão e aguarda reconciliação no banco de dados remoto (Migration 20261115000009). Os fluxos da clínica operam normalmente em período de avaliação, sem cobranças fictícias ou simulações.
            </p>
          </div>
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header de Planos */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4">
                Escolha o plano ideal para a sua clínica
              </h1>
              <p className="text-[var(--text-muted)] font-medium text-lg mb-8">
                Preços transparentes, sem taxas ocultas. Altere ou cancele quando quiser.
              </p>

              {/* Toggle Mensal/Anual */}
              <div className="inline-flex bg-[var(--border)]/60 p-1 rounded-2xl items-center shadow-inner">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                >
                  Anual
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs uppercase tracking-wider">-20%</span>
                </button>
              </div>
            </div>

            {/* Grid de Planos */}
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-[var(--bg-surface)] rounded-[32px] p-8 flex flex-col relative transition-all duration-300 hover:shadow-xl ${plan.popular ? 'ring-2 ring-[var(--primary)]  scale-105 z-10' : 'border border-[var(--border)]  shadow-sm'}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <span className="bg-[var(--primary-fill)] text-[var(--on-primary)] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        {plan.popularBadge}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-extrabold text-[var(--text-primary)] mb-2">{plan.name}</h3>
                    <p className="text-[var(--text-secondary)] text-sm font-medium min-h-[40px]">{plan.description}</p>
                  </div>

                  <div className="mb-8 flex items-baseline">
                    <span className="text-[var(--text-secondary)] font-bold text-2xl mr-1">R$</span>
                    <span className="text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">
                      {plan.price === 0 ? 0 : formatPlanPriceBRL(billingCycle === 'annual' ? plan.annualPrice : plan.price)}
                    </span>
                    <span className="text-[var(--text-secondary)] font-bold ml-1">{plan.period}</span>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-4 rounded-xl font-bold transition-all mb-8 ${plan.buttonStyle}`}
                  >
                    Assinar {plan.name}
                  </button>

                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">O que está incluso:</h4>
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 bg-[var(--primary-subtle)] p-1 rounded-full text-[var(--primary)] shrink-0">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span className="text-sm font-medium text-[var(--text-secondary)]">{feature}</span>
                        </li>
                      ))}
                      {plan.limitations?.map((limitation, i) => (
                        <li key={`lim-${i}`} className="flex items-start gap-3">
                          <div className="mt-0.5 bg-[var(--bg-base)] border border-[var(--border)] p-1 rounded-full text-[var(--text-secondary)] shrink-0">
                            <Minus className="h-3 w-3 stroke-[2.5]" />
                          </div>
                          <span className="text-sm font-medium text-[var(--text-secondary)]">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 border-t border-[var(--border)]  pt-12">
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span className="text-sm font-bold">Pagamento 100% Seguro</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <CreditCard className="h-5 w-5 text-[var(--primary)]" />
                <span className="text-sm font-bold">Cancele quando quiser</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <HelpCircle className="h-5 w-5 text-[var(--primary)]" />
                <span className="text-sm font-bold">Suporte Dedicado</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
            <button
              onClick={() => setStep(1)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-sm mb-6 flex items-center gap-2 transition-colors"
            >
              &larr; Voltar para os planos
            </button>

            <div className="bg-[var(--bg-surface)] rounded-[32px] p-8 md:p-12 shadow-sm border border-[var(--border)]  text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-6">
                <CreditCard className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-[var(--text-primary)] mb-3 tracking-tight">
                Contratação Temporariamente Desativada
              </h2>
              <p className="text-[var(--text-secondary)] mb-6 max-w-lg mx-auto text-sm leading-relaxed">
                O fluxo de checkout e faturamento via cartão de crédito para o plano <strong className="text-[var(--text-primary)]">{selectedPlan.name}</strong> está temporariamente suspenso para auditoria técnica e isolamento das dependências pendentes no banco remoto (Migration 20261115000009).
              </p>
              <div className="p-4 bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  mb-8 text-left text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] space-y-2">
                <p className="font-semibold text-[var(--text-secondary)]">Garantias durante o período de avaliação:</p>
                <p>• O acesso de todos os colaboradores da sua clínica permanece 100% liberado.</p>
                <p>• Prontuários, pacientes, agenda e módulo financeiro funcionam com integridade plena.</p>
                <p>• Nenhuma cobrança real ou cobrança fictícia é gerada sem liquidação bancária.</p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] font-bold text-sm rounded-xl py-3.5 transition-colors shadow-md"
              >
                Retornar à Seleção de Planos
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
