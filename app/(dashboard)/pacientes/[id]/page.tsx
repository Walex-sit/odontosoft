'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'

export default function DetalhePaciente() {
  const router = useRouter()
  const params = useParams()
  const [paciente, setPaciente] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('informacoes')
  const [loading, setLoading] = useState(true)

  async function carregarPaciente() {
    if (!params.id) return

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', params.id)
      .single()

    if (data) {
      setPaciente(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarPaciente()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-white">Paciente não encontrado</h2>
        <button onClick={() => router.push('/pacientes')} className="mt-4 text-blue-400 hover:underline">
          Voltar para a lista
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'informacoes', name: 'Informações do Paciente' },
    { id: 'historico', name: 'Histórico de Consultas' },
    { id: 'proximo', name: 'Próximo Tratamento' },
    { id: 'prontuario', name: 'Prontuário Eletrônico' },
  ]

  return (
    <>
      <div className="mb-6">
        <button 
          onClick={() => router.push('/pacientes')}
          className="flex items-center gap-2 text-slate-400 hover:text-white font-medium text-sm transition-colors mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para lista
        </button>

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-2xl">
            {paciente.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white">{paciente.nome}</h2>
            <p className="text-slate-400 mt-1 font-medium">Paciente Ativo • ID: {paciente.id.substring(0, 8)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-8">
        <div className="border-b border-slate-800 px-6">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'}
                `}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'informacoes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white">Dados Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome Completo</label>
                  <p className="text-white font-medium">{paciente.nome}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Data de Cadastro</label>
                  <p className="text-white font-medium">{new Date(paciente.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Telefone</label>
                  <p className="text-slate-500 italic">Não informado</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                  <p className="text-slate-500 italic">Não informado</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-white font-bold mb-1">Nenhum histórico de consultas</h4>
              <p className="text-slate-400 text-sm">Os agendamentos concluídos aparecerão aqui.</p>
            </div>
          )}

          {activeTab === 'proximo' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-blue-900/30 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h4 className="text-white font-bold mb-1">Planejamento de Tratamento</h4>
              <p className="text-slate-400 text-sm mb-4">Módulo de orçamento e tratamentos em breve.</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-500 transition-colors border border-blue-500">
                Novo Orçamento
              </button>
            </div>
          )}

          {activeTab === 'prontuario' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-emerald-900/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h4 className="text-white font-bold mb-1">Prontuário Eletrônico</h4>
              <p className="text-slate-400 text-sm mb-4">Adicione evoluções clínicas, odontogramas e anamnese.</p>
              <button className="bg-slate-800 border border-slate-700 text-slate-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors">
                Nova Evolução
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
