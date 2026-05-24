'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { ChevronLeft, Info, Calendar, DollarSign, FileText } from 'lucide-react'

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
        <h2 className="text-2xl font-bold text-slate-100">Paciente não encontrado</h2>
        <button onClick={() => router.push('/pacientes')} className="mt-4 text-blue-400 hover:underline">
          Voltar para a lista
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'informacoes', name: 'Informações', icon: Info },
    { id: 'historico', name: 'Consultas', icon: Calendar },
    { id: 'proximo', name: 'Tratamentos', icon: DollarSign },
    { id: 'prontuario', name: 'Prontuário', icon: FileText },
  ]

  return (
    <>
      <div className="mb-6">
        <button 
          onClick={() => router.push('/pacientes')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 font-medium text-sm transition-colors mb-4 active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para lista
        </button>

        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl shadow-sm">
            {paciente.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100">{paciente.nome}</h2>
            <p className="text-slate-450 mt-0.5 text-xs sm:text-sm font-medium">Paciente Ativo • ID: {paciente.id.substring(0, 8)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden mb-8">
        <div className="border-b border-slate-700/50 px-4 sm:px-6">
          <nav className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-450'
                      : 'border-transparent text-slate-400 hover:text-slate-205 hover:border-slate-600'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'informacoes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-100 border-b border-slate-700/50 pb-2">Dados Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</label>
                  <p className="text-slate-300 font-medium text-sm sm:text-base">{paciente.nome}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Data de Cadastro</label>
                  <p className="text-slate-300 font-medium text-sm sm:text-base">{new Date(paciente.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Telefone</label>
                  <p className="text-slate-550 italic text-sm">Não informado</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <p className="text-slate-550 italic text-sm">Não informado</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-slate-900 border border-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="text-slate-100 font-bold mb-1 text-base">Nenhum histórico de consultas</h4>
              <p className="text-slate-400 text-sm">Os agendamentos concluídos aparecerão aqui.</p>
            </div>
          )}

          {activeTab === 'proximo' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-5 w-5" />
              </div>
              <h4 className="text-slate-100 font-bold mb-1 text-base">Planejamento de Tratamento</h4>
              <p className="text-slate-400 text-sm mb-4">Módulo de orçamento e tratamentos em breve.</p>
              <button className="bg-blue-600 hover:bg-blue-505 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all border border-blue-500 shadow-sm active:scale-95">
                Novo Orçamento
              </button>
            </div>
          )}

          {activeTab === 'prontuario' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="text-slate-100 font-bold mb-1 text-base">Prontuário Eletrônico</h4>
              <p className="text-slate-400 text-sm mb-4">Adicione evoluções clínicas, odontogramas e anamnese.</p>
              <button className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95">
                Nova Evolução
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
