'use client'

/**
 * app/(dashboard)/admin/assinaturas/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * GESTÃO DE ASSINATURAS SAAS & STRIPE (SUPER ADMIN)
 * Rota direta: /admin/assinaturas
 *
 * Funcionalidades:
 *  - Visão geral das assinaturas SaaS ativas, em trial e inadimplentes
 *  - Mapeamento direto de identificadores Stripe (Customer ID e Subscription ID)
 *  - Controle de datas limite do período de avaliação (Trial 7 dias)
 *  - Integração com dados reais de clínicas do Supabase
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  CreditCard,
  Building2,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { AdminHeader } from '../AdminHeader'
import {
  getGlobalClinicsList,
  type GlobalClinicaItem,
} from '@/app/actions/admin-global'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function SuperAdminAssinaturasPage() {
  const [clinicas, setClinicas] = useState<GlobalClinicaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const carregarDados = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await getGlobalClinicsList()
      if (res.success && res.data) {
        setClinicas(res.data)
      } else {
        toast.error(res.error || 'Erro ao carregar dados de assinaturas.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao comunicar com o servidor.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Métricas rápidas de assinaturas
  const totalAtivas = clinicas.filter((c) => c.status_assinatura === 'ativo').length
  const totalTrial = clinicas.filter((c) => c.status_assinatura === 'trial').length
  const totalInadimplentes = clinicas.filter((c) => c.status_assinatura === 'inadimplente').length

  return (
    <div className="flex-1 w-full bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 overflow-y-auto min-h-screen">
      <AdminHeader
        title="Assinaturas & Planos SaaS"
        subtitle="Acompanhamento de clientes no Stripe, planos vigentes e ciclos de faturamento."
        onRefresh={() => carregarDados(true)}
        refreshing={refreshing}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Cards Resumo de Assinaturas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Assinaturas Ativas</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {totalAtivas}
              </span>
              <span className="text-xs text-emerald-600 font-bold">pagantes</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Período de Trial</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {totalTrial}
              </span>
              <span className="text-xs text-blue-600 font-bold">em avaliação</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Inadimplentes / Atraso</span>
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {totalInadimplentes}
              </span>
              <span className="text-xs text-red-600 font-bold">pendências</span>
            </div>
          </div>
        </div>

        {/* Tabela de Assinaturas e Dados do Stripe */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            Visão Geral de Faturamento & Gateway Stripe
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Acompanhamento de clientes no Stripe, assinaturas ativas e vencimento de períodos de avaliação (trial 7 dias).
          </p>

          {loading && !refreshing ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-xs text-slate-500 font-medium">Carregando dados de assinaturas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="px-5 py-3">Clínica</th>
                    <th className="px-5 py-3">Plano</th>
                    <th className="px-5 py-3">Status Assinatura</th>
                    <th className="px-5 py-3">Término do Trial</th>
                    <th className="px-5 py-3">Customer Stripe</th>
                    <th className="px-5 py-3 text-right">Subscription Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {clinicas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Nenhuma clínica ou assinatura registrada.
                      </td>
                    </tr>
                  ) : (
                    clinicas.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {c.nome}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                          {c.plano}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              c.status_assinatura === 'ativo'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : c.status_assinatura === 'trial'
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            }`}
                          >
                            {c.status_assinatura}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {c.trial_ends_at ? formatDate(c.trial_ends_at) : '—'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                          {c.stripe_customer_id || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500">
                          {c.stripe_subscription_id || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

