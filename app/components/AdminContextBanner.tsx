'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClinica } from '../contexts/ClinicaContext'
import { exitClinicContextAction } from '@/app/actions/admin-global'
import { toast } from 'sonner'
import {
  ShieldAlert,
  ArrowLeft,
  Calendar,
  Users,
  FileText,
  DollarSign,
  Package,
  Settings,
  Building2,
  ExternalLink,
} from 'lucide-react'

export function AdminContextBanner() {
  const { clinica, isSuperAdminContext, refreshClinica } = useClinica()
  const pathname = usePathname()
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

  const modules = [
    { name: 'Agenda', path: '/agenda', icon: Calendar },
    { name: 'Pacientes', path: '/pacientes', icon: Users },
    { name: 'Prontuários', path: '/prontuarios', icon: FileText },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign },
    { name: 'Estoque', path: '/estoque', icon: Package },
    { name: 'Configurações', path: '/configuracoes', icon: Settings },
  ]

  return (
    <div
      role="region"
      aria-label="Contexto Administrativo de Clínica"
      className="w-full bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white shadow-md border-b border-amber-500/40 sticky top-0 z-40 transition-all"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Identificação da Clínica */}
        <div className="flex items-center gap-2.5 w-full md:w-auto min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-900/60 border border-amber-400/40 text-amber-200 shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold uppercase tracking-wider text-[10px] bg-black/30 px-2 py-0.5 rounded text-amber-200 border border-amber-400/30">
                Super Admin • Contexto de Clínica
              </span>
              <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs" title={clinica.nome}>
                {clinica.nome || 'Clínica Selecionada'}
              </span>
            </div>
            <span className="text-[10px] text-amber-100/80 font-mono truncate">
              ID: {clinica.id}
            </span>
          </div>
        </div>

        {/* Módulos de Acesso Rápido */}
        <div className="hidden lg:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10 overflow-x-auto">
          {modules.map((m) => {
            const Icon = m.icon
            const isActive = pathname.startsWith(m.path)
            return (
              <Link
                key={m.name}
                href={m.path}
                prefetch={true}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-amber-900 shadow-sm'
                    : 'text-amber-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{m.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Botão de Retorno */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleVoltarPainelGlobal}
            disabled={saindo}
            className="flex items-center gap-2 bg-white hover:bg-amber-50 text-amber-950 font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-60 text-xs sm:text-sm cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4 text-amber-700" />
            <span>{saindo ? 'Saindo...' : 'Voltar ao Painel Global'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

