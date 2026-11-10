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

  // Paleta de cores por urgência
  const paleta = isCritico
    ? {
        bg: 'bg-red-950/60 border-red-500/30',
        icon: 'text-red-400',
        texto: 'text-red-100',
        subtexto: 'text-red-300',
        cta: 'bg-red-600 hover:bg-red-700 text-white',
        fechar: 'text-red-400 hover:text-red-200',
      }
    : isUrgente
    ? {
        bg: 'bg-amber-950/60 border-amber-500/30',
        icon: 'text-amber-400',
        texto: 'text-amber-100',
        subtexto: 'text-amber-300',
        cta: 'bg-amber-500 hover:bg-amber-600 text-white',
        fechar: 'text-amber-400 hover:text-amber-200',
      }
    : {
        bg: 'bg-blue-950/60 border-blue-500/20',
        icon: 'text-blue-400',
        texto: 'text-blue-100',
        subtexto: 'text-blue-300',
        cta: 'bg-blue-600 hover:bg-blue-700 text-white',
        fechar: 'text-blue-400 hover:text-blue-200',
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
        backdrop-blur-sm
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
