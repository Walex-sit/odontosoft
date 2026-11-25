'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClinica } from '../contexts/ClinicaContext'
import { exitClinicContextAction } from '@/app/actions/admin-global'
import { toast } from 'sonner'
import { ArrowLeft, Building2 } from 'lucide-react'

export function AdminContextBanner() {
  const { clinica, isSuperAdminContext, refreshClinica } = useClinica()
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  if (!isSuperAdminContext || !clinica) {
    return null
  }

  async function handleVoltarPainelGlobal() {
    setSaindo(true)
    try {
      const res = await exitClinicContextAction()
      if (res.success) {
        toast.success('Retornando ao Painel Administrativo Global.')
        await refreshClinica()
        router.push('/admin')
      } else {
        toast.error(res.error || 'Erro ao sair do contexto administrativo.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao retornar ao painel global.')
    } finally {
      setSaindo(false)
    }
  }

  return (
    <div
      role="region"
      aria-label="Contexto Administrativo de Clínica"
      className="w-full bg-[var(--super-bg)] text-[var(--super-text)] border-b border-[var(--super-border)] sticky top-0 z-40 transition-all"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Identificação da Clínica */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className="p-1 rounded-md border border-[var(--super-text)]/40 text-[var(--super-text)] shrink-0">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <span className="font-extrabold uppercase tracking-wider text-[11px] bg-black/25 px-2 py-0.5 rounded text-[var(--super-text)] border border-[var(--super-text)]/30 shrink-0">
            Super Admin • Contexto de Clínica
          </span>
          <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs text-xs sm:text-sm" title={clinica.nome}>
            {clinica.nome || 'Clínica Selecionada'}
          </span>
          <span className="text-[11px] text-[var(--super-text)]/85 font-mono truncate">
            ID: {clinica.id}
          </span>
        </div>

        {/* Botão de Retorno */}
        <button
          onClick={handleVoltarPainelGlobal}
          disabled={saindo}
          className="flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-950 font-bold px-3 py-1 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-60 text-xs cursor-pointer shrink-0 ml-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-amber-700" />
          <span>{saindo ? 'Saindo...' : 'Voltar ao Painel Global'}</span>
        </button>
      </div>
    </div>
  )
}

