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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-[#0b1a35] to-slate-950 flex items-center justify-center p-4 font-sans antialiased">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-600/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-900/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Card Principal */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[32px] shadow-2xl overflow-hidden">
          {/* Header de Alerta */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 p-6 flex items-center gap-4">
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
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                O período de avaliação gratuita da sua clínica expirou. Para continuar a utilizar o
                <span className="text-white font-semibold"> OdontoSoft</span> sem interrupções,
                active um dos nossos planos — os seus dados estão seguros e preservados.
              </p>
            </div>

            {/* Benefícios a recuperar */}
            <div className="bg-slate-800/50 rounded-2xl p-5 mb-6 border border-slate-700/50">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
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
                    <span className="text-sm text-slate-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preços rápidos */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Essencial</p>
                <p className="text-2xl font-extrabold text-white">
                  R$&thinsp;149<span className="text-sm text-slate-400 font-normal">/mês</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Até 3 profissionais</p>
              </div>
              <div className="p-4 rounded-2xl border border-blue-500/40 bg-blue-500/5 text-center relative">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  RECOMENDADO
                </span>
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Premium</p>
                <p className="text-2xl font-extrabold text-white">
                  R$&thinsp;299<span className="text-sm text-slate-400 font-normal">/mês</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">Ilimitado + LGPD/CFO</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <Link
                href="/planos"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5"
              >
                <CreditCard className="h-5 w-5" />
                Activar Assinatura Agora
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full py-3 px-6 text-sm font-semibold text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:border-slate-600 rounded-2xl transition-all"
              >
                Sair da conta
              </button>
            </div>

            {/* Nota de suporte */}
            <div className="mt-6 flex items-center gap-2 justify-center text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              <span>
                Os seus dados estão seguros. Nenhuma informação foi eliminada.{' '}
                <a href="mailto:suporte@odontosoft.com.br" className="text-blue-500 hover:underline">
                  Precisa de ajuda?
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Badge de segurança */}
        <p className="text-center text-xs text-slate-600 mt-4">
          🔒 OdontoSoft SaaS · Isolamento Multi-Tenant · LGPD Conforme
        </p>
      </div>
    </div>
  )
}
