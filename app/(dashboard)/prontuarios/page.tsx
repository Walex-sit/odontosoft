'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Search } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function Prontuarios() {
  const { session } = useAuth()
  const [pacientes, setPacientes] = useState<any[]>([])
  const [prontuarios, setProntuarios] = useState<any[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tratamento, setTratamento] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregarDados(userId: string) {
    try {
      const { data: pacs } = await supabase.from('pacientes').select('*').eq('user_id', userId)
      setPacientes(pacs || [])

      const { data: prns } = await supabase
        .from('prontuarios')
        .select('*, pacientes(nome)')
        .order('created_at', { ascending: false })

      setProntuarios(prns || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarProntuario() {
    if (!pacienteId || !descricao.trim() || !session?.user?.id) return

    await supabase.from('prontuarios').insert([{
      paciente_id: pacienteId,
      dentista_id: session.user.id,
      descricao,
      tratamento
    }])

    setPacienteId('')
    setDescricao('')
    setTratamento('')
    carregarDados(session.user.id)
  }

  useEffect(() => {
    if (session?.user?.id) {
      carregarDados(session.user.id)
    } else if (session === null) {
      setCarregando(false)
    }
  }, [session])

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Column 2: Context/Filters */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700/50 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-600 bg-slate-700">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Novo Registro</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Paciente</label>
            <select 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" 
              value={pacienteId} 
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">Selecione um paciente...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Tratamento</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" 
              placeholder="Ex: Limpeza profilática" 
              value={tratamento} 
              onChange={(e) => setTratamento(e.target.value)} 
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Descrição / Evolução</label>
            <textarea 
              className="w-full flex-1 min-h-[120px] px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors resize-y" 
              placeholder="Descreva o atendimento realizado..." 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)} 
            />
          </div>
          <div className="pt-2">
            <button 
              onClick={salvarProntuario} 
              disabled={!pacienteId || !descricao.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-md font-bold text-sm transition-colors"
            >
              Salvar Registro
            </button>
          </div>
        </div>
      </aside>

      {/* Column 3: Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <header className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0 gap-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar prontuários..." 
            className="bg-transparent border-none focus:outline-none text-sm text-slate-100 w-full placeholder-slate-400" 
          />
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-100">Registros Clínicos</h1>
              <p className="text-xs text-slate-400 mt-0.5">Histórico e evolução dos pacientes.</p>
            </div>
          </div>

          <div className="border border-slate-600 rounded-md overflow-hidden bg-slate-700">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead className="bg-slate-700/50 border-b border-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider w-32">Data</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider w-48">Paciente</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider w-48">Tratamento</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-xs uppercase tracking-wider">Evolução / Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {carregando ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : prontuarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                      Nenhum prontuário registrado.
                    </td>
                  </tr>
                ) : (
                  prontuarios.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-700/50 transition-colors align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-300 font-medium">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-100">
                        {p.pacientes?.nome || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {p.tratamento ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700 text-slate-100 border border-slate-600">
                            {p.tratamento}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {p.descricao}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
