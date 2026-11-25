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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[var(--primary)] selection:text-[var(--on-primary)]">
      {/* Header / Navegação Pública */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-base)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg ">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              Odonto<span className="text-[var(--primary)]">Soft</span>
            </span>
            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--primary-subtle)]/10 text-[var(--primary)] border border-[var(--primary)]/30 tracking-wider uppercase">
              B2B SaaS
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
            <a href="#planos" className="hover:text-[var(--primary)] transition-colors">Planos & Preços</a>
            <a href="#conformidade" className="hover:text-[var(--primary)] transition-colors">Conformidade CFO & LGPD</a>
            <a href="#faq" className="hover:text-[var(--primary)] transition-colors">Perguntas Frequentes</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-white px-3.5 py-2 rounded-lg transition-colors"
            >
              Entrar
            </Link>
            <button
              onClick={() => abrirCheckout('premium')}
              className="text-sm font-bold bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-[var(--on-primary)] px-4 py-2 rounded-lg transition-all  flex items-center gap-1.5"
            >
              Começar Agora
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 overflow-hidden border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4" />
            O Único Software com Blindagem Jurídica CFO nº 198/2019 e LGPD
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
            Gestão odontológica com <br />
            <span className="text-[var(--primary)]">
              segurança jurídica inabalável
            </span>
          </h1>

          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Elimine riscos de processos éticos e multas da ANPD. Prontuários append-only imutáveis,
            assinatura digital e criptografia militar de dados de pacientes.
          </p>

          {/* Toggle Mensal / Anual */}
          <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-inner">
            <button
              type="button"
              onClick={() => setAnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                !anual ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setAnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                anual ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] p-8 flex flex-col justify-between hover:border-[var(--border)] transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-surface)] px-3 py-1 rounded-md">
                  {PLANOS_SAAS.essencial.nome}
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {PLANOS_SAAS.essencial.limites.dentistas}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Plano Essencial</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                {PLANOS_SAAS.essencial.descricao}
              </p>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-[var(--text-primary)]">
                  R$ {anual ? PLANOS_SAAS.essencial.precoAnualMensalizado : PLANOS_SAAS.essencial.precoMensal}
                </span>
                <span className="text-sm text-[var(--text-secondary)] font-medium">/mês</span>
                {anual && (
                  <span className="text-xs text-[var(--success)] ml-2 font-medium">
                    (Faturado R$ {PLANOS_SAAS.essencial.precoAnual}/ano)
                  </span>
                )}
              </div>

              <div className="border-t border-[var(--border)] pt-6 mb-8 space-y-3">
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  O que está incluso:
                </div>
                {PLANOS_SAAS.essencial.recursos.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => abrirCheckout('essencial')}
              className="w-full py-3.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold text-sm transition-all text-center flex items-center justify-center gap-2 hover:border-[var(--border-medium)]"
            >
              Assinar Plano Essencial
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Plano Premium (Destaque) */}
          <div className="rounded-2xl border-2 border-[var(--primary)]/40 bg-[var(--bg-surface)] p-8 flex flex-col justify-between shadow-md dark:shadow-none relative">
            <div className="absolute -top-3.5 right-8 bg-[var(--primary)] text-[var(--on-primary)] text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Recomendado para Clínicas
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary)]/30 px-3 py-1 rounded-md">
                  {PLANOS_SAAS.premium.nome}
                </span>
                <span className="text-xs font-semibold text-[var(--primary)]">
                  {PLANOS_SAAS.premium.limites.dentistas}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Premium & Compliance</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                {PLANOS_SAAS.premium.descricao}
              </p>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-black text-[var(--text-primary)]">
                  R$ {anual ? PLANOS_SAAS.premium.precoAnualMensalizado : PLANOS_SAAS.premium.precoMensal}
                </span>
                <span className="text-sm text-[var(--text-secondary)] font-medium">/mês</span>
                {anual && (
                  <span className="text-xs text-[var(--success)] ml-2 font-medium">
                    (Faturado R$ {PLANOS_SAAS.premium.precoAnual}/ano)
                  </span>
                )}
              </div>

              <div className="border-t border-[var(--primary)]/30 pt-6 mb-8 space-y-3">
                <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-2">
                  Conformidade Integral CFO & LGPD:
                </div>
                {PLANOS_SAAS.premium.recursos.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                    <Check className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => abrirCheckout('premium')}
              className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:scale-95 text-[var(--on-primary)] font-bold text-sm transition-all text-center flex items-center justify-center gap-2 shadow-lg "
            >
              Contratar com Blindagem Total
              <Zap className="w-4 h-4 fill-white" />
            </button>
          </div>
        </div>
      </section>

      {/* Destaque das Frentes Regulatórias */}
      <section id="conformidade" className="py-16 border-t border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-4">
              Por que clínicas líderes escolhem o OdontoSoft?
            </h2>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              Diferente de sistemas genéricos de consultório, nossa arquitetura foi construída
              com base nas exigências legais estritas do CFO e da Lei Geral de Proteção de Dados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Prontuário Imutável (CFO 198/2019)</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Operações de DELETE ou alteração direta de histórico clínico são bloqueadas por RLS e triggers.
                Correções são registradas estritamente via Adendos vinculados.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Trilha de Auditoria Privada (LGPD)</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Log imutável de todas as modificações no schema privado, gravando diff de dados anteriores (OLD)
                e novos (NEW), usuário autor e IP da operação.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Anonimização Dissociada (Art. 18)</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Atendimento ao direito ao esquecimento sem corromper a obrigação de guarda documental de
                20 anos exigida pela ética odontológica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 max-w-4xl mx-auto px-4 sm:px-6 w-full">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-[var(--primary)]" />
          Perguntas Frequentes
        </h2>

        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">Como funciona a criação da clínica após o pagamento?</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              O processo é 100% automático. Assim que o pagamento for confirmado pelo Stripe,
              nosso webhook provisiona a sua clínica no Supabase e vincula sua conta como Administrador,
              redirecionando para o onboarding de personalização.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">Posso cancelar ou alterar de plano a qualquer momento?</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Sim, sem contratos de fidelidade. Você pode gerenciar sua assinatura ou solicitar cancelamento diretamente no portal de cobrança a qualquer momento.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
            <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">O que acontece se a fatura atrasar?</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Você terá acesso de leitura aos prontuários para atender pacientes já em tratamento, mas novas inserções ficam bloqueadas até a regularização do pagamento.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--bg-base)] py-10 mt-auto text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--primary)]" />
            <span className="font-bold text-[var(--text-secondary)]">OdontoSoft SaaS Tecnologia Ltda.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/termos-de-uso" className="hover:text-[var(--text-primary)] transition-colors">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="hover:text-[var(--text-primary)] transition-colors">
              Política de Privacidade
            </Link>
            <span>© 2026 Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>

      {/* Modal de Criação de Conta & Checkout */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl max-w-md w-full p-6 relative shadow-md">
            <button
              onClick={() => setModalAberto(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                Contratação {planoSelecionado === 'premium' ? 'Plano Premium' : 'Plano Essencial'}
              </span>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">Crie sua conta para prosseguir</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Após criar a conta, você será redirecionado para o checkout seguro.
              </p>
            </div>

            {erro && (
              <div className="p-3 mb-4 rounded-lg bg-[var(--error-bg)] border border-[var(--error)]/30 text-[var(--error)] text-xs">
                {erro}
              </div>
            )}

            <form onSubmit={handleFinalizarContratacao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Dra. Mariana Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">E-mail Profissional</label>
                <input
                  type="email"
                  required
                  placeholder="mariana@clinicaodonto.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={carregandoCheckout}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-[var(--on-primary)] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg "
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

              <p className="text-[11px] text-[var(--text-muted)] text-center pt-2">
                Ao continuar, você concorda com nossos{' '}
                <Link href="/termos-de-uso" target="_blank" className="text-[var(--primary)] hover:underline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link href="/politica-de-privacidade" target="_blank" className="text-[var(--primary)] hover:underline">
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
