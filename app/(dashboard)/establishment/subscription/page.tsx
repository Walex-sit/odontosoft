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
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
            <button 
              onClick={() => setStep(1)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 font-bold text-sm mb-6 flex items-center gap-2 transition-colors"
            >
              &larr; Voltar para os planos
            </button>
            
            <div className="bg-white dark:bg-slate-800 rounded-[32px] p-8 md:p-12 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-200 dark:border-slate-700">
              <div className="grid md:grid-cols-2 gap-12">
                
                {/* Formulário de Checkout */}
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-6 tracking-tight">Dados de Pagamento</h2>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Nome no Cartão</label>
                      <input 
                        type="text" 
                        placeholder="Como impresso no cartão"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Número do Cartão</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="0000 0000 0000 0000"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <CreditCard className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Validade</label>
                        <input 
                          type="text" 
                          placeholder="MM/AA"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">CVC</label>
                        <input 
                          type="text" 
                          placeholder="123"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">CPF / CNPJ</label>
                      <input 
                        type="text" 
                        placeholder="Para emissão da nota fiscal"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setStep(3)}
                    className="w-full bg-blue-600 text-white font-bold text-lg rounded-xl py-4 mt-8 hover:bg-blue-700 transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex justify-center items-center gap-2"
                  >
                    Confirmar Assinatura <ArrowRight className="h-5 w-5" />
                  </button>
                  <p className="text-center text-xs font-semibold text-slate-400 mt-4 flex items-center justify-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> Pagamento processado de forma segura.
                  </p>
                </div>

                {/* Resumo da Compra */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-[24px] border border-slate-200 dark:border-slate-700 h-fit">
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">Resumo da Assinatura</h3>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">Plano {selectedPlan.name}</p>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Cobrança {billingCycle === 'monthly' ? 'Mensal' : 'Anual'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">
                        R$ {billingCycle === 'annual' ? (parseInt(selectedPlan.price) * 0.8 * 12).toFixed(2) : selectedPlan.price}
                      </p>
                    </div>
                  </div>
                  
                  {billingCycle === 'annual' && (
                    <div className="flex justify-between items-center mb-4 text-green-600 text-sm font-bold bg-green-50 p-2 rounded-lg">
                      <span>Desconto Plano Anual (20%)</span>
                      <span>- R$ {(parseInt(selectedPlan.price) * 0.2 * 12).toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-slate-200 dark:border-slate-700 my-6"></div>
                  
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Total hoje</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-2xl">
                       R$ {billingCycle === 'annual' ? (parseInt(selectedPlan.price) * 0.8 * 12).toFixed(2) : selectedPlan.price}
                    </span>
                  </div>
                  
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-green-500" /> Renovação automática
                    </li>
                    <li className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-green-500" /> Cancele a qualquer momento
                    </li>
                    <li className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-green-500" /> Garantia de 7 dias
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-xl mx-auto text-center py-20 animate-in zoom-in-95 duration-500">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">Assinatura Confirmada!</h1>
            <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-8">
              Sua clínica agora tem acesso ao Plano {selectedPlan.name}. Bem-vindo à nova era da gestão odontológica!
            </p>
            <button 
              onClick={() => window.location.href = '/overview'}
              className="px-8 py-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-md"
            >
              Ir para o Dashboard Principal
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
