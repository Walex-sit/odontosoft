'use client'

import { useState } from 'react'
import { Check, ArrowRight, ShieldCheck, CreditCard, HelpCircle } from 'lucide-react'

const plans = [
  {
    id: 'essencial',
    name: 'Essencial',
    price: '99',
    period: '/mês',
    description: 'Perfeito para dentistas independentes começando a digitalizar a clínica.',
    features: [
      'Agenda inteligente',
      'Até 500 pacientes ativos',
      'Prontuário eletrônico básico',
      'Emissão de atestados e receitas',
      'Suporte via email'
    ],
    popular: false,
    buttonStyle: 'bg-slate-100 text-slate-800 dark:text-slate-100 hover:bg-slate-200 border border-slate-200 dark:border-slate-700'
  },
  {
    id: 'controle',
    name: 'Controle',
    price: '199',
    period: '/mês',
    description: 'Ideal para clínicas em crescimento que precisam de gestão financeira.',
    features: [
      'Tudo do plano Essencial',
      'Pacientes ilimitados',
      'Controle Financeiro completo',
      'Gestão de orçamentos e comissões',
      'Odontograma digital completo',
      'Suporte prioritário via WhatsApp'
    ],
    popular: true,
    buttonStyle: 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_12px_rgba(37,99,235,0.2)] border border-transparent'
  },
  {
    id: 'avancado',
    name: 'Avançado',
    price: '349',
    period: '/mês',
    description: 'A solução definitiva para grandes clínicas com múltiplos profissionais.',
    features: [
      'Tudo do plano Controle',
      'Múltiplos profissionais (até 10)',
      'Campanhas de marketing SMS/Email',
      'Central de Mensagens (WhatsApp API)',
      'Gestão de Laboratório/Próteses',
      'API Aberta para integrações'
    ],
    popular: false,
    buttonStyle: 'bg-slate-800 text-white hover:bg-slate-900 shadow-md border border-transparent'
  }
]

export default function SubscriptionPage() {
  const [step, setStep] = useState(1) // 1: Plans, 2: Checkout, 3: Success
  const [selectedPlan, setSelectedPlan] = useState(plans[1])
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan)
    setStep(2)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      
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
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-4">
                Escolha o plano ideal para a sua clínica
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mb-8">
                Preços transparentes, sem taxas ocultas. Altere ou cancele quando quiser.
              </p>
              
              {/* Toggle Mensal/Anual */}
              <div className="inline-flex bg-slate-200/60 p-1 rounded-2xl items-center shadow-inner">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                >
                  Mensal
                </button>
                <button 
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'annual' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200'}`}
                >
                  Anual
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">-20%</span>
                </button>
              </div>
            </div>

            {/* Grid de Planos */}
            <div className="grid md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`bg-white dark:bg-slate-800 rounded-[32px] p-8 flex flex-col relative transition-all duration-300 hover:shadow-xl ${plan.popular ? 'ring-2 ring-blue-500 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.15)] scale-105 z-10' : 'border border-slate-200 dark:border-slate-700 shadow-sm'}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-md uppercase tracking-wider">
                        Mais Escolhido
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">{plan.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium min-h-[40px]">{plan.description}</p>
                  </div>
                  
                  <div className="mb-8 flex items-baseline">
                    <span className="text-slate-400 font-bold text-2xl mr-1">R$</span>
                    <span className="text-5xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                      {billingCycle === 'annual' ? (parseInt(plan.price) * 0.8).toFixed(0) : plan.price}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-bold ml-1">{plan.period}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-4 rounded-xl font-bold transition-all mb-8 ${plan.buttonStyle}`}
                  >
                    Assinar {plan.name}
                  </button>
                  
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">O que está incluso:</h4>
                    <ul className="space-y-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className="mt-0.5 bg-blue-50 p-1 rounded-full text-blue-600 shrink-0">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Trust Badges */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 border-t border-slate-200 dark:border-slate-700 pt-12">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span className="text-sm font-bold">Pagamento 100% Seguro</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <CreditCard className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-bold">Cancele quando quiser</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <HelpCircle className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-bold">Suporte Dedicado</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
            <button 
              onClick={() => setStep(1)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 font-bold text-sm mb-6 flex items-center gap-2 transition-colors"
            >
              &larr; Voltar para os planos
            </button>
            
            <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-6">
                <CreditCard className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
                Contratação Temporariamente Desativada
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-lg mx-auto text-sm leading-relaxed">
                O fluxo de checkout e faturamento via cartão de crédito para o plano <strong className="text-slate-800 dark:text-slate-100">{selectedPlan.name}</strong> está temporariamente suspenso para auditoria técnica e isolamento das dependências pendentes no banco remoto (Migration 20261115000009).
              </p>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8 text-left text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Garantias durante o período de avaliação:</p>
                <p>• O acesso de todos os colaboradores da sua clínica permanece 100% liberado.</p>
                <p>• Prontuários, pacientes, agenda e módulo financeiro funcionam com integridade plena.</p>
                <p>• Nenhuma cobrança real ou cobrança fictícia é gerada sem liquidação bancária.</p>
              </div>
              <button 
                onClick={() => setStep(1)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl py-3.5 transition-colors shadow-md"
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
