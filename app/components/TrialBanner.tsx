'use client'

/**
 * app/components/TrialBanner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Banner de aviso do período de trial exibido no topo do dashboard.
 *
 * Regras:
 *  ✅ Oculto para super_admin e contas is_lifetime.
 *  ✅ Amarelo urgente quando restam ≤ 3 dias.
 *  ✅ Vermelho crítico quando o trial expirou.
 *  ✅ Azul informativo quando restam > 3 dias.
 *  ✅ Completamente oculto se não for trial ou se assinatura estiver ativa.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Clock, AlertTriangle, X, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from './RequireAuth'

export function TrialBanner() {
  const { trialInfo, isSuperAdmin, isLifetime } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // Ocultar para admins vitalícios e super admins
  if (isSuperAdmin || isLifetime) return null

  // Ocultar se não está em trial ou se já foi descartado
  if (!trialInfo?.isTrial || dismissed) return null

  const { diasRestantes, expirado } = trialInfo

  // Determina o nível de urgência
  const isUrgente = diasRestantes <= 3 && !expirado
  const isCritico = expirado

  // Paleta de cores por urgência (chapada e WCAG AA nos dois temas)
  const paleta = isCritico
    ? {
        bg: 'bg-[var(--error-bg)] border-[var(--error)]/40',
        icon: 'text-[var(--error)]',
        texto: 'text-[var(--text-primary)]',
        subtexto: 'text-[var(--text-secondary)]',
        cta: 'bg-[var(--error)] hover:opacity-90 text-white',
        fechar: 'text-[var(--error)] hover:text-[var(--text-primary)]',
      }
    : isUrgente
    ? {
        bg: 'bg-[var(--warning-bg)] border-[var(--warning)]/40',
        icon: 'text-[var(--warning)]',
        texto: 'text-[var(--text-primary)]',
        subtexto: 'text-[var(--text-secondary)]',
        cta: 'bg-[var(--super-bg)] hover:bg-[var(--super-surface)] text-[var(--super-text)]',
        fechar: 'text-[var(--warning)] hover:text-[var(--text-primary)]',
      }
    : {
        bg: 'bg-[var(--primary-subtle)] border-[var(--primary)]/30',
        icon: 'text-[var(--primary)]',
        texto: 'text-[var(--text-primary)]',
        subtexto: 'text-[var(--text-secondary)]',
        cta: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)]',
        fechar: 'text-[var(--primary)] hover:text-[var(--text-primary)]',
      }

  const mensagem = isCritico
    ? 'O seu período de avaliação expirou. Active um plano para continuar.'
    : isUrgente
    ? `Apenas ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''} no seu trial gratuito.`
    : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''} no período de avaliação gratuita.`

  const IconComponent = isCritico || isUrgente ? AlertTriangle : Clock

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        relative w-full border-b px-4 py-2.5
        ${paleta.bg}
       
        transition-all duration-300 ease-in-out
      `}
    >
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <IconComponent className={`h-4 w-4 shrink-0 ${paleta.icon}`} />
          <p className={`text-sm font-semibold truncate ${paleta.texto}`}>
            {mensagem}
          </p>
          <span className={`hidden sm:inline text-xs ${paleta.subtexto}`}>
            {isCritico
              ? 'Os seus dados estão preservados.'
              : 'Sem cartão necessário durante o trial.'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/planos"
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs font-extrabold transition-all
              ${paleta.cta}
            `}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Activar Plano
          </Link>

          {/* Permitir dispensar o banner apenas quando não crítico */}
          {!isCritico && (
            <button
              onClick={() => setDismissed(true)}
              aria-label="Fechar banner de trial"
              className={`p-1.5 rounded-lg transition-colors ${paleta.fechar}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
