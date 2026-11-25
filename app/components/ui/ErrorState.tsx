'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Não foi possível carregar os dados',
  message = 'Ocorreu uma instabilidade momentânea na conexão. Os dados da sua clínica estão seguros.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-10 bg-[var(--bg-surface)] border border-red-200/70 dark:border-red-950/70 rounded-3xl shadow-xs ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/40 flex items-center justify-center mb-3.5 shadow-2xs">
        <AlertTriangle size={26} />
      </div>
      <h3 className="text-base font-heading font-extrabold text-[var(--text-primary)] tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-md leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
        >
          <RefreshCw size={13} />
          Tentar Novamente
        </button>
      )}
    </div>
  )
}
