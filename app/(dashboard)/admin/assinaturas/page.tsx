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
import { getDbPlanInfo } from '@/app/lib/plans'
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
    <div className="flex-1 w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto min-h-screen">
      <AdminHeader
        title="Assinaturas & Planos SaaS"
        subtitle="Acompanhamento de clientes no Stripe, planos vigentes e ciclos de faturamento."
        onRefresh={() => carregarDados(true)}
        refreshing={refreshing}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Cards Resumo de Assinaturas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)]">Assinaturas Ativas</span>
              <div className="p-2 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                {totalAtivas}
              </span>
              <span className="text-xs text-[var(--success)] font-bold">pagantes</span>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)]">Período de Trial</span>
              <div className="p-2 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                {totalTrial}
              </span>
              <span className="text-xs text-[var(--primary)] font-bold">em avaliação</span>
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-secondary)]">Inadimplentes / Atraso</span>
              <div className="p-2 rounded-xl bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                {totalInadimplentes}
              </span>
              <span className="text-xs text-[var(--error)] font-bold">pendências</span>
            </div>
          </div>
        </div>

        {/* Tabela de Assinaturas e Dados do Stripe */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-2xs">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">
            Visão Geral de Faturamento & Gateway Stripe
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mb-6">
            Acompanhamento de clientes no Stripe, assinaturas ativas e vencimento de períodos de avaliação (trial 7 dias).
          </p>

          {loading && !refreshing ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
              <p className="text-xs text-[var(--text-secondary)] font-medium">Carregando dados de assinaturas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-base)] text-xs font-extrabold uppercase text-[var(--text-secondary)] tracking-wider">
                    <th className="px-5 py-3">Clínica</th>
                    <th className="px-5 py-3">Plano</th>
                    <th className="px-5 py-3">Status Assinatura</th>
                    <th className="px-5 py-3">Término do Trial</th>
                    <th className="px-5 py-3">Customer Stripe</th>
                    <th className="px-5 py-3 text-right">Subscription Stripe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {clinicas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                        Nenhuma clínica ou assinatura registrada.
                      </td>
                    </tr>
                  ) : (
                    clinicas.map((c) => (
                      <tr key={c.id} className="hover:bg-[var(--bg-base)]">
                        <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">
                          {c.nome}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-[var(--text-secondary)]">
                          {getDbPlanInfo(c.plano).nome}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold uppercase border ${
                              c.status_assinatura === 'ativo'
                                ? 'bg-[var(--bg-surface)] text-[var(--success)] border-[var(--success)]/45'
                                : c.status_assinatura === 'trial'
                                ? 'bg-[var(--bg-surface)] text-[var(--primary)] border-[var(--primary)]/45'
                                : 'bg-[var(--bg-surface)] text-[var(--error)] border-[var(--error)]/45'
                            }`}
                          >
                            {c.status_assinatura}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--text-secondary)] text-xs">
                          {c.trial_ends_at ? formatDate(c.trial_ends_at) : '—'}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-[var(--text-secondary)]">
                          {c.stripe_customer_id || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-[var(--text-secondary)]">
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
