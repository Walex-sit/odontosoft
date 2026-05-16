'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { logAction } from '../../lib/logger'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([])

  async function carregarUsuarios() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, nome, role')

    if (error) {
      console.error('Erro ao carregar perfis:', error.message)
    }
    
    setUsuarios(data || [])
  }

  async function alterarRole(userId: string, novaRole: string) {
    await supabase
      .from('user_profiles')
      .update({ role: novaRole })
      .eq('id', userId)

    await logAction('edicao', 'usuarios', { user_id_afetado: userId, nova_role: novaRole })

    carregarUsuarios()
  }

  useEffect(() => { carregarUsuarios() }, [])

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
    dentista: { label: 'Dentista', color: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
    recepcao: { label: 'Recepção', color: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
    financeiro: { label: 'Financeiro', color: 'bg-violet-400/10 text-violet-400 border-violet-400/20' },
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Usuários e Perfis</h2>
        <p className="text-slate-400 mt-1">Gerencie permissões e níveis de acesso</p>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Todos os Usuários
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">{usuarios.length} usuário(s)</span>
        </div>

        {usuarios.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-bold text-white mb-1">Nenhum perfil encontrado</h3>
            <p className="text-slate-400">Execute o script SQL no Supabase para criar a tabela de perfis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Perfil Atual</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Alterar Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {usuarios.map((u) => {
                  const info = roleLabels[u.role] || roleLabels['recepcao']
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                            {(u.nome || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{u.nome || 'Sem Nome'}</div>
                            <div className="text-xs text-slate-500">ID: {u.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${info.color}`}>
                          {info.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          className="appearance-none px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          value={u.role}
                          onChange={(e) => alterarRole(u.id, e.target.value)}
                        >
                          <option value="admin">Administrador</option>
                          <option value="dentista">Dentista</option>
                          <option value="recepcao">Recepção</option>
                          <option value="financeiro">Financeiro</option>
                        </select>
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
