'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { History, Search } from 'lucide-react'

const actionColors: Record<string, string> = {
  criacao: 'bg-green-50 text-green-700 border-green-200',
  edicao: 'bg-blue-50 text-blue-700 border-blue-200',
  exclusao: 'bg-red-50 text-red-700 border-red-200',
  login: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  logout: 'bg-slate-700 text-slate-300 border-slate-600',
  financeiro: 'bg-amber-50 text-amber-700 border-amber-200',
}

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([])
  const [filtroAction, setFiltroAction] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregarLogs() {
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtroAction) {
      query = query.eq('action', filtroAction)
    }

    try {
      const { data } = await query
      setLogs(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarLogs() }, [filtroAction])

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Column 2: Context/Filters */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-600">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Filtros</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Ação</label>
          <select
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={filtroAction}
            onChange={(e) => setFiltroAction(e.target.value)}
          >
            <option value="">Todas as Ações</option>
            <option value="criacao">Criação</option>
            <option value="edicao">Edição</option>
            <option value="exclusao">Exclusão</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="financeiro">Financeiro</option>
          </select>
        </div>
      </aside>

      {/* Column 3: Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <header className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0 gap-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar logs..." 
            className="bg-transparent border-none focus:outline-none text-sm text-slate-100 w-full placeholder-slate-400" 
          />
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-100">Logs do Sistema</h1>
              <p className="text-xs text-slate-400 mt-0.5">Auditoria de ações realizadas no sistema.</p>
            </div>
            <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-600">
              {logs.length} registros
            </span>
          </div>

          <div className="border border-slate-600 rounded-md overflow-hidden bg-slate-700">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead className="bg-slate-700/50 border-b border-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Data/Hora</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Ação</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Entidade</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Detalhes</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {carregando ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                      Nenhum log encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => {
                    const color = actionColors[l.action] || 'bg-slate-700 text-slate-300 border-slate-600'
                    return (
                      <tr key={l.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-300">
                          {new Date(l.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${color}`}>
                            {l.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-100 text-xs">{l.entity}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                          {l.details ? JSON.stringify(l.details) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400 font-mono">
                          {l.user_id ? l.user_id.substring(0, 8) : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
