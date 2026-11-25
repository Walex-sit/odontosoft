'use client'

/**
 * app/trial-expirado/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página de Paywall — exibida quando o trial de 7 dias expirou e a clínica
 * não possui assinatura ativa. Redireciona para /planos para retomar o acesso.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AlertTriangle, Clock, CreditCard, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { PLANOS_SAAS_CATALOG } from '@/app/lib/plans'

export default function TrialExpiradoPage() {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] flex items-center justify-center p-4 font-sans antialiased">
      <div className="relative z-10 w-full max-w-2xl">
        {/* Card Principal */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[32px] overflow-hidden">
          {/* Header de Alerta */}
          <div className="bg-[var(--bg-surface)] border-b border-[var(--border)] p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[var(--bg-base)] border border-[var(--warning)]/45 shrink-0">
              <Clock className="h-6 w-6 text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--warning)]">
                OdontoSoft
              </p>
              <h1 className="text-lg font-extrabold text-[var(--text-primary)] leading-tight mt-0.5">
                Período de Avaliação Encerrado
              </h1>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[var(--bg-base)] border border-[var(--warning)]/45 mb-5">
                <AlertTriangle className="h-8 w-8 text-[var(--warning)]" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] leading-tight mb-3">
                Os seus 7 dias gratuitos terminaram
              </h2>
              <p className="text-[var(--text-secondary)] text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                O período de avaliação gratuita da sua clínica expirou. Para continuar a utilizar o{' '}
                <span className="text-[var(--text-primary)] font-semibold">OdontoSoft</span> sem interrupções,
                ative um dos nossos planos — todos os dados da sua clínica estão preservados.
              </p>
            </div>

            {/* Benefícios a recuperar */}
            <div className="bg-[var(--bg-base)] rounded-2xl p-5 mb-6 border border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                O que você recupera ao assinar
              </p>
              <div className="space-y-2.5">
                {[
                  'Acesso completo à Agenda e confirmações de consultas',
                  'Prontuários eletrônicos e odontograma dos pacientes',
                  'Controle financeiro e relatórios da clínica',
                  'Gestão de equipe e permissões de acesso',
                  'Conformidade LGPD e histórico de alterações protegido',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)] font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preços rápidos (fonte compartilhada) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] text-center">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  {PLANOS_SAAS_CATALOG.essencial.nome}
                </p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                  R$&thinsp;{PLANOS_SAAS_CATALOG.essencial.precoMensal}
                  <span className="text-sm text-[var(--text-secondary)] font-normal">/mês</span>
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {PLANOS_SAAS_CATALOG.essencial.limites.resumoCurto}
                </p>
              </div>
              <div className="p-4 rounded-2xl border-2 border-[var(--primary)] bg-[var(--bg-surface)] text-center relative">
                {PLANOS_SAAS_CATALOG.premium.popularBadge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[var(--primary-fill)] text-[var(--on-primary)] text-xs font-extrabold uppercase tracking-wider">
                    {PLANOS_SAAS_CATALOG.premium.popularBadge}
                  </span>
                )}
                <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1">
                  {PLANOS_SAAS_CATALOG.premium.nome}
                </p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                  R$&thinsp;{PLANOS_SAAS_CATALOG.premium.precoMensal}
                  <span className="text-sm text-[var(--text-secondary)] font-normal">/mês</span>
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {PLANOS_SAAS_CATALOG.premium.limites.resumoCurto}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <Link
                href="/planos"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] font-extrabold text-sm rounded-2xl transition-colors"
              >
                <CreditCard className="h-5 w-5" />
                Ativar Assinatura Agora
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full py-3 px-6 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl transition-colors"
              >
                Sair da conta
              </button>
            </div>

            {/* Nota de suporte */}
            <div className="mt-6 flex items-center gap-2 justify-center text-xs text-[var(--text-secondary)]">
              <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
              <span>
                Os seus dados estão seguros. Nenhuma informação foi eliminada.{' '}
                <a href="mailto:suporte@odontosoft.com.br" className="text-[var(--primary)] hover:underline">
                  Precisa de ajuda?
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Badge de segurança */}
        <p className="text-center text-xs text-[var(--text-secondary)] mt-4">
          OdontoSoft · Dados da sua clínica isolados e protegidos · LGPD Conforme
        </p>
      </div>
    </div>
  )
}
