'use client'

import { useRouter } from 'next/navigation'
import { ShieldOff } from 'lucide-react'

export default function AcessoNegado() {
  const router = useRouter()

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="flex flex-col items-center text-center max-w-md px-6">
        <div className="h-20 w-20 rounded-2xl bg-[var(--error-bg)] border border-[var(--error)]/30 flex items-center justify-center mb-6">
          <ShieldOff className="h-10 w-10 text-[var(--error)]" strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] mb-3">
          Acesso Negado
        </h1>

        <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-8">
          Você não possui permissão para acessar esta área.
          <br />
          Se acredita que isso é um erro, entre em contato com o administrador.
        </p>

        <button
          onClick={() => router.replace('/overview')}
          className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] text-sm font-bold rounded-xl transition-all border border-[var(--primary)] active:scale-95"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}
