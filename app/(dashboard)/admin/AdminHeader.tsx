'use client'

/**
 * app/(dashboard)/admin/AdminHeader.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cabeçalho executivo e barra de abas de navegação do Super Admin.
 * Navega através das rotas reais do Next.js:
 *  - /admin              -> Visão Geral (Métricas)
 *  - /admin/clinicas     -> Clínicas Cadastradas
 *  - /admin/usuarios     -> Usuários Globais
 *  - /admin/assinaturas  -> Assinaturas & Planos (Stripe)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShieldCheck,
  Activity,
  Building2,
  Users,
  CreditCard,
  RefreshCw,
} from 'lucide-react'

interface AdminHeaderProps {
  title?: string
  subtitle?: string
  onRefresh?: () => void
  refreshing?: boolean
  clinicasCount?: number
  usuariosCount?: number
}

export function AdminHeader({
  title = 'Painel Global da Plataforma',
  subtitle = 'Controle central de clínicas, usuários, assinaturas SaaS e indicadores da infraestrutura OdontoSoft.',
  onRefresh,
  refreshing = false,
  clinicasCount,
  usuariosCount,
}: AdminHeaderProps) {
  const pathname = usePathname()

  const tabs = [
    { id: 'dashboard', label: 'Visão Geral', href: '/admin', icon: Activity },
    {
      id: 'clinicas',
      label: 'Clínicas Cadastradas',
      href: '/admin/clinicas',
      icon: Building2,
      badge: clinicasCount,
    },
    {
      id: 'usuarios',
      label: 'Usuários Globais',
      href: '/admin/usuarios',
      icon: Users,
      badge: usuariosCount,
    },
    {
      id: 'assinaturas',
      label: 'Assinaturas & Planos',
      href: '/admin/assinaturas',
      icon: CreditCard,
    },
  ]

  return (
    <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {onRefresh && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Abas de Navegação — Rotas Reais ── */}
      <div className="max-w-7xl mx-auto mt-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isCurrent =
            tab.href === '/admin'
              ? pathname === '/admin'
              : pathname === tab.href || pathname.startsWith(tab.href + '/')

          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch={true}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                isCurrent
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

