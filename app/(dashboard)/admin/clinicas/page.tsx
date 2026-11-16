'use client'

/**
 * app/(dashboard)/admin/clinicas/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * GESTÃO GLOBAL DE CLÍNICAS (SUPER ADMIN)
 * Rota direta: /admin/clinicas
 *
 * Funcionalidades:
 *  - Listagem completa de clínicas cadastradas via Server Action getGlobalClinicsList()
 *  - Busca em tempo real por nome, CNPJ ou e-mail
 *  - Filtros por situação da assinatura (ativo, trial, inadimplente, cancelado) e plano
 *  - Alternância imediata de bloqueio operacional (Ativo / Bloqueada) via updateClinicStatusAdmin()
 *  - Acesso contextual com modal seguro para operar dentro do tenant
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Building2,
} from 'lucide-react'
import { AdminHeader } from '../AdminHeader'
import { ModalAcessoClinica } from '../ModalAcessoClinica'
import {
  getGlobalClinicsList,
  updateClinicStatusAdmin,
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

export default function SuperAdminClinicasPage() {
  const [clinicas, setClinicas] = useState<GlobalClinicaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPlano, setFiltroPlano] = useState('todos')

  // Modal Contextual
  const [selectedClinicaModal, setSelectedClinicaModal] = useState<GlobalClinicaItem | null>(null)

  const carregarClinicas = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await getGlobalClinicsList()
      if (res.success && res.data) {
        setClinicas(res.data)
      } else {
        toast.error(res.error || 'Erro ao carregar lista de clínicas.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao comunicar com o servidor.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    carregarClinicas()
  }, [carregarClinicas])

  async function handleToggleAtivo(clinica: GlobalClinicaItem) {
    const novoStatus = !clinica.ativo
    try {
      const res = await updateClinicStatusAdmin(clinica.id, { ativo: novoStatus })
      if (res.success) {
        toast.success(`Clínica ${clinica.nome} ${novoStatus ? 'ativada' : 'desativada'} com sucesso.`)
        setClinicas((prev) =>
          prev.map((c) => (c.id === clinica.id ? { ...c, ativo: novoStatus } : c))
        )
      } else {
        toast.error(res.error || 'Erro ao alterar situação da clínica.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro na operação.')
    }
  }

  const clinicasFiltradas = useMemo(() => {
    return clinicas.filter((c) => {
      const matchBusca =
        !busca ||
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (c.cnpj && c.cnpj.includes(busca)) ||
        (c.email && c.email.toLowerCase().includes(busca.toLowerCase()))

      const matchStatus =
        filtroStatus === 'todos' || c.status_assinatura === filtroStatus

      const matchPlano =
        filtroPlano === 'todos' || c.plano === filtroPlano

      return matchBusca && matchStatus && matchPlano
    })
  }, [clinicas, busca, filtroStatus, filtroPlano])

  return (
    <div className="flex-1 w-full bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 overflow-y-auto min-h-screen">
      <AdminHeader
        title="Clínicas Cadastradas"
        subtitle="Gerenciamento operacional, permissões de acesso e monitoramento dos tenants OdontoSoft."
        onRefresh={() => carregarClinicas(true)}
        refreshing={refreshing}
        clinicasCount={clinicas.length}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Barra de Filtros e Busca */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome da clínica, CNPJ ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="trial">Trial</option>
              <option value="inadimplente">Inadimplente</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <select
              value={filtroPlano}
              onChange={(e) => setFiltroPlano(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos os Planos</option>
              <option value="basico">Básico</option>
              <option value="profissional">Profissional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Tabela de Clínicas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          {loading && !refreshing ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-xs text-slate-500 font-medium">Carregando lista de clínicas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="px-5 py-3.5">Clínica / CNPJ</th>
                    <th className="px-5 py-3.5">Plano & Status</th>
                    <th className="px-5 py-3.5">Usuários</th>
                    <th className="px-5 py-3.5">Cadastro</th>
                    <th className="px-5 py-3.5">Situação</th>
                    <th className="px-5 py-3.5 text-right">Ação Contextual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {clinicasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Nenhuma clínica encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    clinicasFiltradas.map((c) => {
                      const isAtivo = c.status_assinatura === 'ativo' && c.ativo
                      const isTrial = c.status_assinatura === 'trial'
                      const isInadimplente = c.status_assinatura === 'inadimplente'

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {c.nome}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {c.cnpj || c.email || c.id}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {c.plano}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                                  isAtivo
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : isTrial
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                    : isInadimplente
                                    ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200'
                                }`}
                              >
                                {c.status_assinatura}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {c.totalUsuarios ?? 0} membros
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-slate-500 text-xs">
                            {formatDate(c.criado_em)}
                          </td>

                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => handleToggleAtivo(c)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                c.ativo
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                  : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100'
                              }`}
                              title="Clique para alternar o bloqueio operacional"
                            >
                              {c.ativo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              <span>{c.ativo ? 'Operando' : 'Bloqueada'}</span>
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => setSelectedClinicaModal(c)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Acessar clínica</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Contextual Seguro */}
      <ModalAcessoClinica
        clinica={selectedClinicaModal}
        onClose={() => setSelectedClinicaModal(null)}
      />
    </div>
  )
}

