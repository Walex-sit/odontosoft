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
    <div className="flex-1 w-full bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 overflow-y-auto min-h-screen">
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-xs text-slate-500 font-medium">Carregando métricas da plataforma...</p>
          </div>
        ) : metrics ? (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* 4 Cards Principais de Indicadores Globais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Clínicas */}
              <Link
                href="/admin/clinicas"
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-all group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Total de Clínicas
                  </span>
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {metrics.totalClinicas}
                  </span>
                  <span className="text-xs text-emerald-600 font-bold">
                    {metrics.clinicasAtivas} ativas
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Trial: <b>{metrics.clinicasTrial}</b></span>
                  <span>Inadimplentes: <b className="text-red-500">{metrics.clinicasInadimplentes}</b></span>
                </div>
              </Link>

              {/* MRR Estimado */}
              <Link
                href="/admin/assinaturas"
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    MRR Estimado (SaaS)
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(metrics.mrrEstimado)}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Recorrente mensal</span>
                  <ArrowRight className="h-3 w-3 text-emerald-600" />
                </div>
              </Link>

              {/* Usuários Globais */}
              <Link
                href="/admin/usuarios"
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Usuários Ativos
                  </span>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {metrics.totalUsuarios}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    na rede
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Dentistas: <b>{metrics.usuariosPorRole.dentista}</b></span>
                  <span>Admins: <b>{metrics.usuariosPorRole.admin_clinica}</b></span>
                </div>
              </Link>

              {/* Volume de Pacientes */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pacientes na Base</span>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {metrics.totalPacientes}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    em {metrics.totalClinicas} clínicas
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500">
                  Consultas registradas: <b>{metrics.totalConsultas}</b>
                </div>
              </div>
            </div>

            {/* Distribuição de Planos e Status Operacional */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Planos */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Distribuição por Plano de Assinatura
                  </h3>
                  <Link
                    href="/admin/assinaturas"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Profissional (R$ 197/mês)</span>
                      <span className="font-bold">{metrics.planosDistribuicao.profissional} clínicas</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{
                          width: `${(metrics.planosDistribuicao.profissional / (metrics.totalClinicas || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Enterprise (R$ 397/mês)</span>
                      <span className="font-bold">{metrics.planosDistribuicao.enterprise} clínicas</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{
                          width: `${(metrics.planosDistribuicao.enterprise / (metrics.totalClinicas || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600 dark:text-slate-400">Básico (R$ 97/mês)</span>
                      <span className="font-bold">{metrics.planosDistribuicao.basico} clínicas</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full"
                        style={{
                          width: `${(metrics.planosDistribuicao.basico / (metrics.totalClinicas || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Situação Operacional */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Situação Operacional das Clínicas
                  </h3>
                  <Link
                    href="/admin/clinicas"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>Gerenciar clínicas</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold block">Ativas & Pagantes</span>
                    <span className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1 block">
                      {metrics.clinicasAtivas}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
                    <span className="text-blue-700 dark:text-blue-300 font-semibold block">Período de Trial</span>
                    <span className="text-2xl font-black text-blue-800 dark:text-blue-200 mt-1 block">
                      {metrics.clinicasTrial}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40">
                    <span className="text-red-700 dark:text-red-300 font-semibold block">Inadimplentes</span>
                    <span className="text-2xl font-black text-red-800 dark:text-red-200 mt-1 block">
                      {metrics.clinicasInadimplentes}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold block">Canceladas / Inativas</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1 block">
                      {metrics.clinicasCanceladas}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">
            Nenhum dado encontrado para exibição.
          </div>
        )}
      </div>
    </div>
  )
}
