'use client'

/**
 * app/components/CookieConsentBanner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Aviso e Consentimento de Cookies em conformidade com a LGPD (Lei nº 13.709/18).
 *
 * Características:
 *  - Discreto, não intrusivo e elegante na parte inferior da tela.
 *  - Esclarece o uso de cookies estritamente necessários para autenticação/sessão.
 *  - Persiste a preferência do titular no localStorage ('odontosoft_cookie_consent').
 *  - Link direto para a Política de Privacidade (/privacidade).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, Shield, X } from 'lucide-react'

export default function CookieConsentBanner() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    // Verifica se o usuário já consentiu anteriormente
    const consent = localStorage.getItem('odontosoft_cookie_consent')
    if (!consent) {
      // Delay suave para não competir com a renderização inicial
      const timer = setTimeout(() => setVisivel(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  function aceitar() {
    localStorage.setItem('odontosoft_cookie_consent', 'accepted_' + new Date().toISOString())
    setVisivel(false)
  }

  function fechar() {
    // Marca como dispensado temporariamente
    localStorage.setItem('odontosoft_cookie_consent', 'dismissed_' + new Date().toISOString())
    setVisivel(false)
  }

  if (!visivel) return null

  return (
    <aside
      aria-label="Aviso de cookies e privacidade"
      role="region"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-sm text-[var(--text-secondary)]">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 flex items-center justify-center shrink-0 text-[var(--primary)] mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>

          <div className="flex-1 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                Privacidade & Cookies
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                  <Shield className="w-3 h-3" />
                  LGPD
                </span>
              </h3>
              <button
                type="button"
                onClick={fechar}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]  transition-colors p-1"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-1.5 text-[var(--text-muted)] text-xs leading-relaxed">
              Utilizamos cookies essenciais para manter a segurança da sua sessão e proteger os dados clínicos da sua clínica. Saiba mais na nossa{' '}
              <Link
                href="/privacidade"
                className="text-[var(--primary)] font-semibold underline underline-offset-2 hover:text-[var(--primary)] "
              >
                Política de Privacidade
              </Link>.
            </p>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={aceitar}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] active:scale-[0.98] text-[var(--on-primary)] text-xs font-bold transition-all"
              >
                Entendi e Aceito
              </button>
              <Link
                href="/termos"
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] transition-colors"
              >
                Termos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
