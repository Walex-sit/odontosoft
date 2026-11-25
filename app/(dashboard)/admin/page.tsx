'use client'

/**
 * app/(dashboard)/admin/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PAINEL GLOBAL DA PLATAFORMA (SUPER ADMIN) — VISÃO GERAL
 * Rota: /admin
 *
 * Módulos integrados:
 *  1. Dashboard executivo da plataforma com indicadores consolidados (MRR, Clínicas, Usuários, Pacientes).
 *  2. Distribuição por Plano SaaS e Situação Operacional das Clínicas.
 *  3. Abas de navegação direta para rotas reais (/admin/clinicas, /admin/usuarios, /admin/assinaturas).
 *  4. Compatibilidade regressiva com query params (?tab=clinicas -> /admin/clinicas, etc.).
 *
 * Segurança:
 *  ✅ Protegido por proxy (Next.js 16) e RouteGuard (role 'super_admin').
 *  ✅ Server Actions com checkServerAuth(['super_admin']).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Building2,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { AdminHeader } from './AdminHeader'
import { DB_PLAN_CATALOG } from '@/app/lib/plans'
import {
  getGlobalPlatformMetrics,
  getGlobalClinicsList,
  getGlobalUsersList,
  type GlobalMetrics,
} from '@/app/actions/admin-global'

function formatCurrency(val?: number | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0)
}

export default function SuperAdminGlobalPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Compatibilidade com links antigos que usavam ?tab=...
  const tabParam = searchParams.get('tab')
  useEffect(() => {
    if (tabParam === 'clinicas') {
      router.replace('/admin/clinicas')
    } else if (tabParam === 'usuarios') {
      router.replace('/admin/usuarios')
    } else if (tabParam === 'assinaturas') {
      router.replace('/admin/assinaturas')
    }
  }, [tabParam, router])

  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null)
  const [clinicasCount, setClinicasCount] = useState<number | undefined>(undefined)
  const [usuariosCount, setUsuariosCount] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [metricsRes, clinicasRes, usuariosRes] = await Promise.all([
        getGlobalPlatformMetrics(),
        getGlobalClinicsList(),
        getGlobalUsersList(),
      ])

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data)
      } else if (metricsRes.error) {
        toast.error(`Métricas: ${metricsRes.error}`)
      }

      if (clinicasRes.success && clinicasRes.data) {
        setClinicasCount(clinicasRes.data.length)
      }

      if (usuariosRes.success && usuariosRes.data) {
        setUsuariosCount(usuariosRes.data.length)
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar dados do painel global.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex-1 w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto min-h-screen">
      <AdminHeader
        title="Painel Global da Plataforma"
        subtitle="Controle central de clínicas, usuários, assinaturas SaaS e indicadores da infraestrutura OdontoSoft."
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
        clinicasCount={clinicasCount}
        usuariosCount={usuariosCount}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {loading && !refreshing ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
            <p className="text-xs text-[var(--text-secondary)] font-medium">Carregando métricas da plataforma...</p>
          </div>
        ) : metrics ? (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* 4 Cards Principais de Indicadores Globais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Clínicas */}
              <Link
                href="/admin/clinicas"
                className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs hover:border-[var(--primary)] transition-all group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
                    Total de Clínicas
                  </span>
                  <div className="p-2 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                    {metrics.totalClinicas}
                  </span>
                  <span className="text-xs text-[var(--success)] font-bold">
                    {metrics.clinicasAtivas} ativas
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Trial: <b>{metrics.clinicasTrial}</b></span>
                  <span>Inadimplentes: <b className="text-[var(--error)]">{metrics.clinicasInadimplentes}</b></span>
                </div>
              </Link>

              {/* MRR Estimado */}
              <Link
                href="/admin/assinaturas"
                className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs hover:border-[var(--primary)] transition-all group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
                    MRR Estimado (SaaS)
                  </span>
                  <div className="p-2 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                    {formatCurrency(metrics.mrrEstimado)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Recorrente mensal</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--primary)]" />
                </div>
              </Link>

              {/* Usuários Globais */}
              <Link
                href="/admin/usuarios"
                className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs hover:border-[var(--primary)] transition-all group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
                    Usuários Ativos
                  </span>
                  <div className="p-2 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                    {metrics.totalUsuarios}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    na rede
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Dentistas: <b>{metrics.usuariosPorRole.dentista}</b></span>
                  <span>Admins: <b>{metrics.usuariosPorRole.admin_clinica}</b></span>
                </div>
              </Link>

              {/* Volume de Pacientes */}
              <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)]">Pacientes na Base</span>
                  <div className="p-2 rounded-xl bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                    {metrics.totalPacientes}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    em {metrics.totalClinicas} clínicas
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  Consultas registradas: <b>{metrics.totalConsultas}</b>
                </div>
              </div>
            </div>

            {/* Distribuição de Planos e Status Operacional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Planos */}
              <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Distribuição por Plano de Assinatura
                  </h3>
                  <Link
                    href="/admin/assinaturas"
                    className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'profissional' as const, opacity: '', count: metrics.planosDistribuicao.profissional },
                    { key: 'enterprise' as const, opacity: 'opacity-75', count: metrics.planosDistribuicao.enterprise },
                    { key: 'basico' as const, opacity: 'opacity-55', count: metrics.planosDistribuicao.basico },
                  ].map((item) => {
                    const planInfo = DB_PLAN_CATALOG[item.key]
                    return (
                      <div key={item.key}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-[var(--text-secondary)]">
                            {planInfo.nome} (R$ {planInfo.precoMensal}/mês)
                          </span>
                          <span className="font-bold">{item.count} clínicas</span>
                        </div>
                        <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
                          <div
                            className={`bg-[var(--primary-fill)] h-full rounded-full ${item.opacity}`}
                            style={{
                              width: `${(item.count / (metrics.totalClinicas || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Situação Operacional */}
              <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Situação Operacional das Clínicas
                  </h3>
                  <Link
                    href="/admin/clinicas"
                    className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    <span>Gerenciar clínicas</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--success)]/45">
                    <span className="text-[var(--success)] font-semibold block">Ativas & Pagantes</span>
                    <span className="text-2xl font-black text-[var(--success)] mt-1 block">
                      {metrics.clinicasAtivas}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--primary)]/45">
                    <span className="text-[var(--primary)] font-semibold block">Período de Trial</span>
                    <span className="text-2xl font-black text-[var(--primary)] mt-1 block">
                      {metrics.clinicasTrial}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--error)]/45">
                    <span className="text-[var(--error)] font-semibold block">Inadimplentes</span>
                    <span className="text-2xl font-black text-[var(--error)] mt-1 block">
                      {metrics.clinicasInadimplentes}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                    <span className="text-[var(--text-secondary)] font-semibold block">Canceladas / Inativas</span>
                    <span className="text-2xl font-black text-[var(--text-primary)] mt-1 block">
                      {metrics.clinicasCanceladas}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-[var(--text-secondary)]">
            Nenhum dado encontrado para exibição.
          </div>
        )}
      </div>
    </div>
  )
}
