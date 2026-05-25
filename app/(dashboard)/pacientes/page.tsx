'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { logAction } from '../../lib/logger'
import { UserPlus, Users, Eye } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function Pacientes() {
  const { session } = useAuth()
  const [nome, setNome] = useState('')
  const [pacientes, setPacientes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const router = useRouter()

  async function carregarPacientes(userId: string) {
    try {
      const { data } = await supabase
        .from('pacientes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      setPacientes(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function adicionarPaciente() {
    if (!nome.trim() || !session?.user?.id) return

    try {
      await supabase.from('pacientes').insert([
        {
          nome,
          user_id: session.user.id
        }
      ])

      await logAction('criacao', 'pacientes', { nome })

      setNome('')
      carregarPacientes(session.user.id)
    } catch (e) {
      alert('Erro ao adicionar paciente')
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      carregarPacientes(session.user.id)
    } else if (session === null) {
      setCarregando(false)
    }
  }, [session])

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Pacientes</h2>
          <p className="text-slate-400 mt-1 text-sm">Gerencie os prontuários e dados dos pacientes</p>
        </div>
      </div>

      {/* Card de Cadastro Rápido */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-400" />
          Cadastro Rápido
        </h3>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Nome Completo do Paciente
            </label>
            <input
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm"
              placeholder="Ex: João da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <button
            onClick={adicionarPaciente}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl transition-all font-bold text-sm h-[42px] border border-blue-500 shadow-sm flex items-center justify-center shrink-0 active:scale-95"
          >
            Adicionar Paciente
          </button>
        </div>
      </div>

      {/* Lista / Tabela de Pacientes */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            Todos os Pacientes
          </h3>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : pacientes.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-900 text-slate-550 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhum paciente cadastrado</h3>
            <p className="text-slate-400 text-sm">Adicione seu primeiro paciente usando o formulário acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Registro</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Cadastro</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {pacientes.map((p) => (
                  <tr 
                    key={p.id} 
                    className="hover:bg-slate-700/30 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/pacientes/${p.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {p.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-200 group-hover:text-blue-450 transition-colors">{p.nome}</div>
                          <div className="text-xs text-slate-450">Paciente Ativo</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                      #{p.id.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => router.push(`/pacientes/${p.id}`)}
                        className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}