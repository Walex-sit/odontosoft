'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([])
  const [filtroAction, setFiltroAction] = useState('')

  async function carregarLogs() {
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filtroAction) {
      query = query.eq('action', filtroAction)
    }

    const { data } = await query
    setLogs(data || [])
  }

  useEffect(() => { carregarLogs() }, [filtroAction])

  const actionColors: Record<string, string> = {
    criacao: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    edicao: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    exclusao: 'bg-red-400/10 text-red-400 border-red-400/20',
    login: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20',
    logout: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
    financeiro: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Logs do Sistema</h2>
          <p className="text-slate-400 mt-1">Auditoria de ações realizadas no sistema</p>
        </div>
        <div>
          <select
            className="appearance-none px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Registros de Auditoria
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{logs.length} registro(s)</span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nenhum log registrado</h3>
            <p className="text-slate-400">Os logs aparecerão conforme ações forem realizadas no sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ação</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Entidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Detalhes</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((l) => {
                  const color = actionColors[l.action] || 'bg-slate-700 text-slate-400 border-slate-600'
                  return (
                    <tr key={l.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                        {new Date(l.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${color}`}>
                          {l.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-white text-sm">{l.entity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden md:table-cell max-w-[200px] truncate">
                        {l.details ? JSON.stringify(l.details) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden sm:table-cell">
                        {l.user_id ? l.user_id.substring(0, 8) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
