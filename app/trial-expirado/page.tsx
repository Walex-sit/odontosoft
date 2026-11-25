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

export default function TrialExpiradoPage() {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg-base)] flex items-center justify-center p-4 font-sans antialiased">
      <div className="relative z-10 w-full max-w-2xl">
        {/* Card Principal */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[32px] shadow-md overflow-hidden">
          {/* Header de Alerta */}
          <div className="bg-[var(--warning-bg)] border-b border-[var(--warning)]/30 p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/20 shrink-0">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80">
                OdontoSoft SaaS
              </p>
              <h1 className="text-lg font-extrabold text-white leading-tight mt-0.5">
                Período de Avaliação Encerrado
              </h1>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 mb-5">
                <AlertTriangle className="h-10 w-10 text-amber-400" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
                Os seus 7 dias gratuitos terminaram
              </h2>
              <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                O período de avaliação gratuita da sua clínica expirou. Para continuar a utilizar o
                <span className="text-white font-semibold"> OdontoSoft</span> sem interrupções,
                active um dos nossos planos — os seus dados estão seguros e preservados.
              </p>
            </div>

            {/* Benefícios a recuperar */}
            <div className="bg-[var(--bg-surface)] rounded-2xl p-5 mb-6 border border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                O que você recupera ao assinar
              </p>
              <div className="space-y-2.5">
                {[
                  'Acesso completo à Agenda e agendamentos',
                  'Prontuários eletrônicos dos pacientes',
                  'Controle financeiro e relatórios',
                  'Gestão de equipe e permissões',
                  'Conformidade LGPD e auditoria',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)] font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preços rápidos */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-base)] text-center">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Essencial</p>
                <p className="text-2xl font-extrabold text-white">
                  R$&thinsp;149<span className="text-sm text-[var(--text-muted)] font-normal">/mês</span>
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Até 3 profissionais</p>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 text-center relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-[10px] font-extrabold uppercase tracking-wider">
                  RECOMENDADO
                </span>
                <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-1">Premium</p>
                <p className="text-2xl font-extrabold text-white">
                  R$&thinsp;299<span className="text-sm text-[var(--text-muted)] font-normal">/mês</span>
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Ilimitado + LGPD/CFO</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <Link
                href="/planos"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] font-extrabold text-sm rounded-2xl transition-all shadow-lg  hover: hover:-translate-y-0.5"
              >
                <CreditCard className="h-5 w-5" />
                Activar Assinatura Agora
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full py-3 px-6 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border)] rounded-2xl transition-all"
              >
                Sair da conta
              </button>
            </div>

            {/* Nota de suporte */}
            <div className="mt-6 flex items-center gap-2 justify-center text-xs text-[var(--text-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
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
          🔒 OdontoSoft SaaS · Isolamento Multi-Tenant · LGPD Conforme
        </p>
      </div>
    </div>
  )
}
