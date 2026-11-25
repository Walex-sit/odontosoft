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
  ArrowRight,
  Lock,
  FileText,
  Clock,
  HelpCircle,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { PLANOS_SAAS } from '@/app/lib/stripe'
import { formatPlanPriceBRL } from '@/app/lib/plans'
import { supabase } from '@/app/lib/supabaseClient'
import { BrandMark } from '@/app/components/BrandLogo'

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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-[var(--primary-fill)] selection:text-[var(--on-primary)]">
      {/* Header / Navegação Pública */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-base)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size="md" className="rounded-xl" />
            <span className="text-xl font-black tracking-tight text-[var(--text-primary)]">
              Odonto<span className="text-[var(--primary)]">Soft</span>
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
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3.5 py-2 rounded-lg transition-colors"
            >
              Entrar
            </Link>
            <button
              onClick={() => abrirCheckout('premium')}
              className="text-sm font-bold bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] active:scale-95 text-[var(--on-primary)] px-4 py-2 rounded-lg transition-all  flex items-center gap-1.5"
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
            Recursos de Apoio à Conformidade CFO e LGPD
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] mb-6 leading-tight">
            Gestão odontológica com <br />
            <span className="text-[var(--primary)]">
              segurança e apoio à conformidade
            </span>
          </h1>

          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Organize prontuários com histórico imutável de evoluções, registro de consentimento e proteção dos dados dos pacientes da sua clínica.
          </p>

          {/* Toggle Mensal / Anual */}
          <div className="inline-flex items-center gap-3 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-inner">
            <button
              type="button"
              onClick={() => setAnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!anual ? 'bg-[var(--primary-fill)] text-[var(--on-primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setAnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${anual ? 'bg-[var(--primary-fill)] text-[var(--on-primary)] shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
            >
              Anual
              <span className="text-xs bg-[var(--bg-surface)] text-[var(--success)] border border-[var(--success)]/45 px-2 py-0.5 rounded-full font-extrabold">
                20% de desconto
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Cards de Preços */}
      <section id="planos" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Plano Essencial */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between mb-4 lg:min-h-[32px]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border)] px-3 py-1 rounded-md">
                  {PLANOS_SAAS.essencial.badge}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{PLANOS_SAAS.essencial.nome}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed lg:min-h-[48px]">
                {PLANOS_SAAS.essencial.descricao}
              </p>

              <div className="mb-6 lg:min-h-[92px]">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-[var(--text-primary)]">
                    R$ {formatPlanPriceBRL(anual ? PLANOS_SAAS.essencial.precoAnualMensalizado : PLANOS_SAAS.essencial.precoMensal)}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] font-medium">/mês</span>
                </div>
                {anual && (
                  <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                    R$ {formatPlanPriceBRL(PLANOS_SAAS.essencial.precoAnual)} cobrados por ano
                  </p>
                )}
                <p className="text-xs font-semibold text-[var(--primary)] mt-1.5">
                  {PLANOS_SAAS.essencial.limites.resumoCurto}
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-6 mb-8 space-y-3">
                <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  O que está incluído:
                </div>
                {PLANOS_SAAS.essencial.recursos.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                    <Check className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={() => abrirCheckout('essencial')}
                className="w-full py-3.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] font-bold text-sm transition-all text-center flex items-center justify-center gap-2 hover:border-[var(--border-medium)]"
              >
                {PLANOS_SAAS.essencial.ctaText}
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-center text-[var(--text-secondary)] mt-2.5">
                <Link href="/politica-cancelamento" className="hover:text-[var(--primary)] underline-offset-2 hover:underline">
                  Política de cancelamento e reembolso
                </Link>
              </p>
            </div>
          </div>

          {/* Plano Premium (Destaque) */}
          <div className="rounded-2xl border-2 border-[var(--primary)] bg-[var(--bg-surface)] p-8 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 right-8 bg-[var(--primary-fill)] text-[var(--on-primary)] text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
              {PLANOS_SAAS.premium.popularBadge || 'Recomendado'}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 lg:min-h-[32px]">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary)]/30 px-3 py-1 rounded-md">
                  {PLANOS_SAAS.premium.badge}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{PLANOS_SAAS.premium.nome}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed lg:min-h-[48px]">
                {PLANOS_SAAS.premium.descricao}
              </p>

              <div className="mb-6 lg:min-h-[92px]">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-[var(--text-primary)]">
                    R$ {formatPlanPriceBRL(anual ? PLANOS_SAAS.premium.precoAnualMensalizado : PLANOS_SAAS.premium.precoMensal)}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] font-medium">/mês</span>
                </div>
                {anual && (
                  <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                    R$ {formatPlanPriceBRL(PLANOS_SAAS.premium.precoAnual)} cobrados por ano
                  </p>
                )}
                <p className="text-xs font-semibold text-[var(--primary)] mt-1.5">
                  {PLANOS_SAAS.premium.limites.resumoCurto}
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-6 mb-8 space-y-3">
                <div className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-2">
                  O que está incluído:
                </div>
                {PLANOS_SAAS.premium.recursos.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                    <Check className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={() => abrirCheckout('premium')}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] active:scale-95 text-[var(--on-primary)] font-bold text-sm transition-all text-center flex items-center justify-center gap-2"
              >
                {PLANOS_SAAS.premium.ctaText}
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-xs text-center text-[var(--text-secondary)] mt-2.5">
                <Link href="/politica-cancelamento" className="hover:text-[var(--primary)] underline-offset-2 hover:underline">
                  Política de cancelamento e reembolso
                </Link>
              </p>
            </div>
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
              Recursos de apoio técnico projetados para auxiliar clínicas na organização documental e boas práticas de proteção de dados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Apoio à Conformidade CFO</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Bloqueio de exclusão ou alteração direta de prontuários finalizados, com registro de correções via adendos vinculados.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Trilha de Auditoria (Apoio LGPD)</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Registro histórico das modificações realizadas em cadastros e prontuários, com data, autor e histórico antes/depois.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">Anonimização de Dados (Apoio LGPD)</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Recurso para anonimizar dados pessoais de identificação do paciente mantendo o histórico assistencial preservado.
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
            <BrandMark size="sm" />
            <span className="font-bold text-[var(--text-secondary)]">OdontoSoft</span>
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
              className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
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
                  className="w-full py-3 px-4 rounded-xl bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] disabled:opacity-50 text-[var(--on-primary)] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg "
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

              <p className="text-xs text-[var(--text-muted)] text-center pt-2">
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
