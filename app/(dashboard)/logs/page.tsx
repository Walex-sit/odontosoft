'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useAuth } from '@/app/components/RequireAuth'
import {
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  Lock,
  User,
  Activity,
  FileText,
  AlertTriangle,
  Eye,
  X,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { TableSkeleton } from '@/app/components/ui/Skeleton'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ErrorState } from '@/app/components/ui/ErrorState'

const ACTION_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  criacao: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200/70 dark:border-emerald-800/60', label: 'Criação' },
  edicao: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200/70 dark:border-blue-800/60', label: 'Edição' },
  exclusao: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200/70 dark:border-red-800/60', label: 'Exclusão' },
  financeiro: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200/70 dark:border-amber-800/60', label: 'Financeiro' },
  login: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200/70 dark:border-indigo-800/60', label: 'Acesso (Login)' },
  logout: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', label: 'Logout' },
}

export default function LogsPage() {
  const { profile } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroAction, setFiltroAction] = useState('')
  const [filtroEntidade, setFiltroEntidade] = useState('')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'admin_clinica'

  async function carregarLogs() {
    if (!profile?.clinica_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setErro(null)

    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .eq('clinica_id', profile.clinica_id)
        .order('created_at', { ascending: false })
        .limit(150)

      if (filtroAction) {
        query = query.eq('action', filtroAction)
      }

      if (filtroEntidade) {
        query = query.eq('entity', filtroEntidade)
      }

      const { data, error } = await query

      if (error) {
        console.error('[Logs] Erro:', error.message)
        setErro('Falha ao carregar a trilha de auditoria da clínica.')
      } else {
        setLogs(data || [])
      }
    } catch (e: any) {
      console.error('[Logs] Exceção:', e)
      setErro('Ocorreu um erro ao consultar os registros de conformidade.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin && profile?.clinica_id) {
      carregarLogs()
    } else if (profile && !isAdmin) {
      setLoading(false)
    }
  }, [profile?.clinica_id, filtroAction, filtroEntidade, isAdmin])

  const logsFiltrados = useMemo(() => {
    if (!busca.trim()) return logs
    const q = busca.toLowerCase()
    return logs.filter((l) => {
      const user = (l.user_nome || '').toLowerCase()
      const entity = (l.entity || '').toLowerCase()
      const details = JSON.stringify(l.details || '').toLowerCase()
      return user.includes(q) || entity.includes(q) || details.includes(q)
    })
  }, [logs, busca])

  // Verificação de permissão estrita: Apenas administradores
  if (profile && !isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#F8FAFC] dark:bg-[#0B1120]">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/50">
            <Lock size={26} />
          </div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
            Acesso Restrito ao Administrador
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            A trilha de auditoria LGPD e os logs de ações críticas são restritos a gestores e administradores da clínica.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1120]">
      
      {/* ── Header ── */}
      <div className="px-6 sm:px-8 pt-7 pb-4 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Conformidade LGPD &amp; Rastreabilidade
            </div>
            <h1 className="text-2xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
              Logs de Auditoria da Clínica
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Registro imutável de alterações em prontuários, exclusões financeiras e acessos sensíveis
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => carregarLogs()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Filtros e Busca */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por usuário, entidade ou detalhes do log..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
              />
            </div>

            <div className="flex gap-2.5 flex-wrap sm:flex-nowrap">
              <select
                value={filtroAction}
                onChange={(e) => setFiltroAction(e.target.value)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shadow-2xs cursor-pointer"
              >
                <option value="">Todas as Ações</option>
                <option value="criacao">Criação</option>
                <option value="edicao">Edição</option>
                <option value="exclusao">Exclusão Crítica</option>
                <option value="financeiro">Financeiro</option>
                <option value="login">Acesso / Login</option>
                <option value="logout">Logout</option>
              </select>

              <select
                value={filtroEntidade}
                onChange={(e) => setFiltroEntidade(e.target.value)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shadow-2xs cursor-pointer"
              >
                <option value="">Todas as Entidades</option>
                <option value="pacientes">Pacientes</option>
                <option value="prontuarios">Prontuários &amp; Evoluções</option>
                <option value="financeiro">Receitas / Despesas</option>
                <option value="usuarios">Membros da Equipe</option>
                <option value="estoque">Estoque</option>
                <option value="lembretes_whatsapp">Lembretes WhatsApp</option>
              </select>
            </div>
          </div>

          {/* Conteúdo: Tabela / Erro / Vazio */}
          {erro ? (
            <ErrorState title="Erro ao carregar auditoria" message={erro} onRetry={carregarLogs} />
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Exibindo {logsFiltrados.length} evento(s) auditado(s)
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                  RLS Ativo por Clínica
                </span>
              </div>

              {loading ? (
                <div className="p-6">
                  <TableSkeleton rows={6} cols={5} />
                </div>
              ) : logsFiltrados.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<ShieldCheck size={32} />}
                    title={busca ? 'Nenhum log com os filtros selecionados' : 'Nenhuma ação registrada recentemente'}
                    description={
                      busca
                        ? 'Tente buscar por outro termo ou limpe os filtros de ação e entidade.'
                        : 'Ações críticas, mutações em prontuários e movimentações financeiras serão exibidas aqui.'
                    }
                    actionLabel={busca ? 'Limpar busca' : undefined}
                    onAction={() => {
                      setBusca('')
                      setFiltroAction('')
                      setFiltroEntidade('')
                    }}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200/70 dark:border-slate-800">
                        <th className="px-5 py-3.5 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Data / Hora</th>
                        <th className="px-5 py-3.5 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Ação</th>
                        <th className="px-5 py-3.5 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Entidade</th>
                        <th className="px-5 py-3.5 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">Usuário Responsável</th>
                        <th className="px-5 py-3.5 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider text-right">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {logsFiltrados.map((log) => {
                        const style = ACTION_STYLES[log.action] || {
                          bg: 'bg-slate-100 dark:bg-slate-800',
                          text: 'text-slate-700 dark:text-slate-300',
                          border: 'border-slate-200 dark:border-slate-700',
                          label: log.action,
                        }
                        return (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${style.bg} ${style.text} ${style.border}`}
                              >
                                {style.label}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                              {log.entity}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 font-medium">
                              {log.user_nome || log.user_id ? (
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {log.user_nome || `ID: ${log.user_id.slice(0, 8)}`}
                                </span>
                              ) : (
                                <span className="text-slate-400">Sistema Automático</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-right">
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/50 text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-xl text-xs font-bold transition-colors"
                              >
                                <Eye size={13} />
                                Inspecionar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal Inspecionar Detalhes do Log ── */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl border border-blue-100 dark:border-blue-900/50">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-extrabold text-slate-800 dark:text-slate-100">
                    Detalhes do Log de Auditoria
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Ação</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Entidade</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">{selectedLog.entity}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Data / Hora</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] block">Usuário</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedLog.user_nome || 'Sistema'}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[11px] block mb-2">
                  Metadados e Carga Útil (Payload JSON)
                </span>
                <pre className="p-4 bg-slate-950 text-slate-200 rounded-2xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
