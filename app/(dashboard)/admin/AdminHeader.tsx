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
    <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 sm:px-8 py-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Ícone com cor amber — contexto super admin */}
          <div className="h-12 w-12 rounded-2xl bg-[var(--super-bg)] text-[var(--super-text)] border border-[var(--super-border)] flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                {title}
              </h1>
              {/* Badge amber — identidade super admin */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-600/30">
                Super Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        {onRefresh && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[var(--primary)]' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Abas de Navegação — Rotas Reais ── */}
      <div className="max-w-7xl mx-auto mt-6 flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto">
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
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5 rounded-t-xl'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                    isCurrent
                      ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                      : 'bg-[var(--border)] text-[var(--text-secondary)]'
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
