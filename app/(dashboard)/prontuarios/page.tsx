'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Prontuarios() {
  const [pacientes, setPacientes] = useState<any[]>([])
  const [prontuarios, setProntuarios] = useState<any[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tratamento, setTratamento] = useState('')

  async function carregarDados() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: pacs } = await supabase.from('pacientes').select('*').eq('user_id', userData.user.id)
    setPacientes(pacs || [])

    const { data: prns } = await supabase
      .from('prontuarios')
      .select('*, pacientes(nome)')
      .order('data_registro', { ascending: false })

    setProntuarios(prns || [])
  }

  async function salvarProntuario() {
    if (!pacienteId || !descricao.trim()) return

    const { data: userData } = await supabase.auth.getUser()

    await supabase.from('prontuarios').insert([{
      paciente_id: pacienteId,
      dentista_id: userData.user?.id,
      descricao,
      tratamento
    }])

    setPacienteId('')
    setDescricao('')
    setTratamento('')
    carregarDados()
  }

  useEffect(() => { carregarDados() }, [])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Prontuários</h2>
        <p className="text-slate-400 mt-1">Registros clínicos e evolução dos pacientes</p>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Novo Registro Clínico
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Paciente</label>
            <select className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Selecione o paciente</option>
              {pacientes.map((p) => (<option key={p.id} value={p.id}>{p.nome}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Tratamento</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" placeholder="Ex: Limpeza profilática" value={tratamento} onChange={(e) => setTratamento(e.target.value)} />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-400 mb-1.5">Descrição / Evolução</label>
          <textarea className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all min-h-[100px]" placeholder="Descreva o atendimento realizado..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <button onClick={salvarProntuario} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm border border-blue-500">
          Salvar Prontuário
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Registros Recentes</h3>
        </div>
        {prontuarios.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nenhum prontuário registrado</h3>
            <p className="text-slate-400">Crie o primeiro registro clínico acima.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {prontuarios.map((p) => (
              <div key={p.id} className="p-6 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-white">{p.pacientes?.nome || 'Paciente'}</h4>
                  <span className="text-xs text-slate-500">{new Date(p.data_registro).toLocaleDateString('pt-BR')}</span>
                </div>
                {p.tratamento && <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-400/10 text-blue-400 border border-blue-400/20 mb-2">{p.tratamento}</span>}
                <p className="text-sm text-slate-300">{p.descricao}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
