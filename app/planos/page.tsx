'use client'

/**
 * app/planos/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página Pública de Planos e Preços do OdontoSoft SaaS B2B.
 *
 * Apresenta a proposta de valor, tabela comparativa com conformidade CFO/LGPD
 * e modal integrado de criação de conta e checkout Stripe.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
  ArrowRight,
  Lock,
  FileText,
  Clock,
  HelpCircle,
  Activity,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { PLANOS_SAAS } from '@/app/lib/stripe'
import { supabase } from '@/app/lib/supabaseClient'

export default function PlanosPage() {
  const [anual, setAnual] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [planoSelecionado, setPlanoSelecionado] = useState<'essencial' | 'premium'>('premium')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregandoCheckout, setCarregandoCheckout] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function abrirCheckout(planoId: 'essencial' | 'premium') {
    setPlanoSelecionado(planoId)
    setErro(null)
    setModalAberto(true)
  }

  async function handleFinalizarContratacao(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregandoCheckout(true)

    try {
      // 1. Tenta verificar se já existe sessão ativa
      const { data: { session } } = await supabase.auth.getSession()
      let userId = session?.user?.id

      // 2. Se não estiver logado, cria a conta no Supabase Auth
      if (!userId) {
        if (!email.trim() || !senha.trim()) {
          setErro('Preencha seu e-mail e uma senha para criar sua conta.')
          setCarregandoCheckout(false)
          return
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              nome: nome.trim() || 'Cirurgião-Dentista',
            },
          },
        })

        if (signUpError) {
          // Se já existir, tenta login
          if (signUpError.message.toLowerCase().includes('already') || signUpError.message.toLowerCase().includes('registered')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password: senha,
            })
            if (signInError) {
              setErro('Usuário já cadastrado com esta senha. Verifique seus dados ou faça login.')
              setCarregandoCheckout(false)
              return
            }
            userId = signInData.user?.id
          } else {
            setErro(signUpError.message)
            setCarregandoCheckout(false)
            return
          }
        } else {
          userId = signUpData.user?.id
        }
      }

      // 3. Chama a rota de checkout do Stripe
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planoId: planoSelecionado,
          intervalo: anual ? 'anual' : 'mensal',
          userEmail: email.trim(),
        }),
      })

      const data = await res.json()

      if (data.url) {
        // Redireciona para o Stripe Checkout (ou tela de onboarding em mock)
        window.location.href = data.url
      } else {
        setErro(data.error || 'Não foi possível iniciar o checkout de pagamento.')
      }
    } catch (err: any) {
      console.error('Erro na contratação:', err)
      setErro(err?.message || 'Erro inesperado ao processar a contratação.')
    } finally {
      setCarregandoCheckout(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header / Navegação Pública */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Odonto<span className="text-blue-500">Soft</span>
            </span>
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider uppercase">
              B2B SaaS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#planos" className="hover:text-blue-400 transition-colors">Planos & Preços</a>
            <a href="#conformidade" className="hover:text-blue-400 transition-colors">Conformidade CFO & LGPD</a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">Perguntas Frequentes</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-lg transition-colors"
            >
              Entrar
            </Link>
            <button
              onClick={() => abrirCheckout('premium')}
              className="text-sm font-bold bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              Começar Agora
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 overflow-hidden border-b border-slate-800/60">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4" />
            O Único Software com Blindagem Jurídica CFO nº 198/2019 e LGPD
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Gestão odontológica com <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400">
              segurança jurídica inabalável
            </span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Elimine riscos de processos éticos e multas da ANPD. Prontuários append-only imutáveis,
            assinatura digital e criptografia militar de dados de pacientes.
          </p>

          {/* Toggle Mensal / Anual */}
          <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => setAnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                !anual ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setAnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                anual ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Anual
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-extrabold">
                20% OFF
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Cards de Preços */}
      <section id="planos" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Plano Essencial */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-3 py-1 rounded-md">
                  {PLANOS_SAAS.essencial.nome}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {PLANOS_SAAS.essencial.limites.dentistas}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Plano Essencial</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                {PLANOS_SAAS.essencial.descricao}
              </p>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">
                  R$ {anual ? PLANOS_SAAS.essencial.precoAnualMensalizado : PLANOS_SAAS.essencial.precoMensal}
                </span>
                <span className="text-sm text-slate-400 font-medium">/mês</span>
                {anual && (
                  <span className="text-xs text-emerald-400 ml-2 font-medium">
                    (Faturado R$ {PLANOS_SAAS.essencial.precoAnual}/ano)
                  </span>
                )}
              </div>

              <div className="border-t border-slate-800 pt-6 mb-8 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  O que está incluso:
                </div>
                {PLANOS_SAAS.essencial.recursos.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => abrirCheckout('essencial')}
              className="w-full py-3.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all text-center flex items-center justify-center gap-2 hover:border-slate-600"
            >
              Assinar Plano Essencial
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Plano Premium (Destaque) */}
          <div className="rounded-2xl border-2 border-blue-500 bg-gradient-to-b from-blue-950/40 via-slate-900/90 to-slate-900 p-8 flex flex-col justify-between shadow-2xl shadow-blue-500/10 relative">
            <div className="absolute -top-3.5 right-8 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Recomendado para Clínicas
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-md">
                  {PLANOS_SAAS.premium.nome}
                </span>
                <span className="text-xs font-semibold text-blue-300">
                  {PLANOS_SAAS.premium.limites.dentistas}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Premium & Compliance</h2>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                {PLANOS_SAAS.premium.descricao}
              </p>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  R$ {anual ? PLANOS_SAAS.premium.precoAnualMensalizado : PLANOS_SAAS.premium.precoMensal}
                </span>
                <span className="text-sm text-slate-400 font-medium">/mês</span>
                {anual && (
                  <span className="text-xs text-emerald-400 ml-2 font-medium">
                    (Faturado R$ {PLANOS_SAAS.premium.precoAnual}/ano)
                  </span>
                )}
              </div>

              <div className="border-t border-blue-500/20 pt-6 mb-8 space-y-3">
                <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                  Conformidade Integral CFO & LGPD:
                </div>
                {PLANOS_SAAS.premium.recursos.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-slate-200">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => abrirCheckout('premium')}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-sm transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              Contratar com Blindagem Total
              <Zap className="w-4 h-4 fill-white" />
            </button>
          </div>
        </div>
      </section>

      {/* Destaque das Frentes Regulatórias */}
      <section id="conformidade" className="py-16 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Por que clínicas líderes escolhem o OdontoSoft?
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Diferente de sistemas genéricos de consultório, nossa arquitetura foi construída
              com base nas exigências legais estritas do CFO e da Lei Geral de Proteção de Dados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white mb-2">Prontuário Imutável (CFO 198/2019)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Operações de DELETE ou alteração direta de histórico clínico são bloqueadas por RLS e triggers.
                Correções são registradas estritamente via Adendos vinculados.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white mb-2">Trilha de Auditoria Privada (LGPD)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Log imutável de todas as modificações no schema privado, gravando diff de dados anteriores (OLD)
                e novos (NEW), usuário autor e IP da operação.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white mb-2">Anonimização Dissociada (Art. 18)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Atendimento ao direito ao esquecimento sem corromper a obrigação de guarda documental de
                20 anos exigida pela ética odontológica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 max-w-4xl mx-auto px-4 sm:px-6 w-full">
        <h2 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          Perguntas Frequentes
        </h2>

        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="font-bold text-sm text-slate-200 mb-1">Como funciona a criação da clínica após o pagamento?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O processo é 100% automático. Assim que o pagamento for confirmado pelo Stripe,
              nosso webhook provisiona a sua clínica no Supabase e vincula sua conta como Administrador,
              redirecionando para o onboarding de personalização.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="font-bold text-sm text-slate-200 mb-1">Posso cancelar ou alterar de plano a qualquer momento?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sim, sem contratos de fidelidade. Você pode gerenciar sua assinatura ou solicitar cancelamento diretamente no portal de cobrança a qualquer momento.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
            <h3 className="font-bold text-sm text-slate-200 mb-1">O que acontece se a fatura atrasar?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você terá acesso de leitura aos prontuários para atender pacientes já em tratamento, mas novas inserções ficam bloqueadas até a regularização do pagamento.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 mt-auto text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-slate-300">OdontoSoft SaaS Tecnologia Ltda.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/termos-de-uso" className="hover:text-slate-200 transition-colors">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-slate-200 transition-colors">
              Política de Privacidade
            </Link>
            <span>© 2026 Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      {/* Modal de Criação de Conta & Checkout */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setModalAberto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                Contratação {planoSelecionado === 'premium' ? 'Plano Premium' : 'Plano Essencial'}
              </span>
              <h3 className="text-xl font-bold text-white mt-1">Crie sua conta para prosseguir</h3>
              <p className="text-xs text-slate-400 mt-1">
                Após criar a conta, você será redirecionado para o checkout seguro.
              </p>
            </div>

            {erro && (
              <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {erro}
              </div>
            )}

            <form onSubmit={handleFinalizarContratacao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Dra. Mariana Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">E-mail Profissional</label>
                <input
                  type="email"
                  required
                  placeholder="mariana@clinicaodonto.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={carregandoCheckout}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                >
                  {carregandoCheckout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Iniciando Checkout Seguro...
                    </>
                  ) : (
                    <>
                      Ir para Pagamento Seguro
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center pt-2">
                Ao continuar, você concorda com nossos{' '}
                <Link href="/termos-de-uso" target="_blank" className="text-blue-400 hover:underline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link href="/politica-de-privacidade" target="_blank" className="text-blue-400 hover:underline">
                  Política de Privacidade
                </Link>.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
