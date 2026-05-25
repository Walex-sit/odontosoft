'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { FileText, Plus, ClipboardList } from 'lucide-react'
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
        .order('data_registro', { ascending: false })

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
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-101">Prontuários</h2>
        <p className="text-slate-400 mt-1 text-sm">Registros clínicos e evolução dos pacientes</p>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-105 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-400" />
          Novo Registro Clínico
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paciente</label>
            <select className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="" className="bg-slate-900 text-slate-400">Selecione o paciente</option>
              {pacientes.map((p) => (<option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">{p.nome}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tratamento</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" placeholder="Ex: Limpeza profilática" value={tratamento} onChange={(e) => setTratamento(e.target.value)} />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Descrição / Evolução</label>
          <textarea className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm min-h-[100px] resize-y" placeholder="Descreva o atendimento realizado..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <button onClick={salvarProntuario} className="bg-blue-600 hover:bg-blue-505 text-white px-6 py-2.5 rounded-xl transition-all font-bold text-sm border border-blue-500 shadow-sm active:scale-95">
          Salvar Prontuário
        </button>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-105">Registros Recentes</h3>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : prontuarios.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-900 text-slate-550 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhum prontuário registrado</h3>
            <p className="text-slate-400 text-sm">Crie o primeiro registro clínico acima.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {prontuarios.map((p) => (
              <div key={p.id} className="p-6 hover:bg-slate-700/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-1">
                  <h4 className="font-bold text-slate-200">{p.pacientes?.nome || 'Paciente'}</h4>
                  <span className="text-xs text-slate-500">{new Date(p.data_registro).toLocaleDateString('pt-BR')}</span>
                </div>
                {p.tratamento && <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">{p.tratamento}</span>}
                <p className="text-sm text-slate-350 leading-relaxed">{p.descricao}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
