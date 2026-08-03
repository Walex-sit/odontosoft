'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/app/components/RequireAuth'
import ModalNovaEvolucao from '@/app/components/ModalNovaEvolucao'
import Odontograma from '@/app/components/Odontograma'
import {
  ChevronLeft, Loader2, Pencil, Trash2, Search, Plus, AlertCircle, FileText, CheckCircle2, AlertTriangle, MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Paciente {
  id: string
  nome: string
  telefone: string | null
  cpf: string | null
  email: string | null
  created_at: string
}

interface Evolucao {
  id: string
  data_evolucao: string
  descricao: string
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarCPF(cpf: string | null) {
  if (!cpf) return null
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf
}

function formatarTelefone(tel: string | null) {
  if (!tel) return null
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel
}

function InfoDense({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col mb-4">
      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value || 'Não informado'}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DetalhePaciente() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [activeTab, setActiveTab] = useState('visao_geral')
  const [loadingPaciente, setLoadingPaciente] = useState(true)
  const [busca, setBusca] = useState('')

  // Evoluções (Prontuário)
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [loadingEvolucoes, setLoadingEvolucoes] = useState(false)
  const [erroEvolucoes, setErroEvolucoes] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [evolucaoSelecionada, setEvolucaoSelecionada] = useState<Evolucao | null>(null)

  useEffect(() => {
    async function carregarPaciente() {
      if (!pacienteId) return
      const { data } = await supabase
        .from('pacientes')
        .select('id, nome, telefone, cpf, email, created_at')
        .eq('id', pacienteId)
        .single()
      setPaciente(data as Paciente | null)
      setLoadingPaciente(false)
    }

    if (session) {
      carregarPaciente()
    } else if (session === null) {
      setLoadingPaciente(false)
    }
  }, [pacienteId, session])

  const carregarEvolucoes = useCallback(async () => {
    if (!pacienteId) return
    setLoadingEvolucoes(true)
    setErroEvolucoes(null)

    const { data, error } = await supabase
      .from('evolucao')
      .select('id, data_evolucao, descricao, created_at')
      .eq('paciente_id', pacienteId)
      .order('data_evolucao', { ascending: false })

    if (error) {
      setErroEvolucoes(error.message)
    } else {
      setEvolucoes((data ?? []) as Evolucao[])
    }

    setLoadingEvolucoes(false)
  }, [pacienteId])

  useEffect(() => {
    if (activeTab === 'evolucoes' && session) {
      carregarEvolucoes()
    }
  }, [activeTab, session, carregarEvolucoes])

  async function excluirEvolucao(id: string) {
    if (!window.confirm('Excluir esta evolução?')) return
    const { error } = await supabase.from('evolucao').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      toast.success('Excluída com sucesso!')
      carregarEvolucoes()
    }
  }

  if (loadingPaciente) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 h-full">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 h-full">
        <h2 className="text-xl font-bold text-slate-800">Paciente não encontrado</h2>
        <button onClick={() => router.push('/patients')} className="mt-4 text-blue-600 font-bold hover:underline">
          Voltar para Lista
        </button>
      </div>
    )
  }

  const navItems = [
    { id: 'visao_geral', label: 'Visão Geral' },
    { id: 'anamneses', label: 'Anamneses' },
    { id: 'orcamentos', label: 'Orçamentos' },
    { id: 'tratamentos', label: 'Tratamentos' },
    { id: 'pagamentos', label: 'Pagamentos' },
    { id: 'evolucoes', label: 'Evoluções' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'arquivos', label: 'Arquivos' },
  ]

  const evolucoesFiltradas = evolucoes.filter(ev => 
    ev.descricao.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-slate-50 text-slate-800 overflow-hidden absolute inset-0">
      
      {/* Coluna Esquerda: Contexto do Paciente */}
      <aside className="w-full md:w-80 border-r border-slate-200 bg-white flex flex-col h-full shrink-0 overflow-y-auto shadow-sm z-10">
        
        <div className="p-6 border-b border-slate-100 flex flex-col items-center">
          <div className="w-full flex justify-start mb-6">
            <button 
              onClick={() => router.push('/patients')}
              className="flex items-center gap-1.5 text-slate-400 hover:text-blue-600 text-sm font-semibold transition-colors bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
          
          <div className="relative">
            <div className="h-28 w-28 rounded-[32px] bg-blue-50 border-4 border-white shadow-md flex items-center justify-center text-blue-600 text-5xl font-extrabold mb-4 overflow-hidden">
              {paciente.nome.charAt(0).toUpperCase()}
            </div>
            {/* Badge de Alerta */}
            <div className="absolute -bottom-2 -right-2 bg-red-100 text-red-600 border-2 border-white px-2 py-1 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1 group cursor-help">
              <AlertTriangle className="h-3.5 w-3.5" />
              Hipertenso
              
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-xs rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50">
                <p className="font-bold mb-1">Atenção Médica</p>
                <p className="text-slate-300 font-medium leading-relaxed">Paciente relatou hipertensão controlada. Evitar vasoconstritores em excesso.</p>
                <div className="absolute -bottom-1 right-4 w-3 h-3 bg-slate-800 rotate-45"></div>
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-extrabold text-slate-800 leading-tight text-center mt-2">{paciente.nome}</h2>
          <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">Cod: {paciente.id.substring(0, 6)}</span>

          <div className="mt-6 flex gap-2 w-full">
            <button 
              onClick={() => router.push(`/pacientes/${paciente.id}/edit`)}
              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
            >
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-green-200">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
          </div>
        </div>

        <div className="p-6 border-b border-slate-100">
          <InfoDense label="Cadastro" value={new Date(paciente.created_at).toLocaleDateString('pt-BR')} />
          <InfoDense label="CPF" value={formatarCPF(paciente.cpf)} />
          <InfoDense label="Celular" value={formatarTelefone(paciente.telefone)} />
          <InfoDense label="E-mail" value={paciente.email} />
        </div>

      </aside>

      {/* Coluna Direita: Área de Conteúdo */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        
        <header className="px-8 pt-8 pb-0 shrink-0">
          <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-200">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-5 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === item.id 
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-xl'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* ABA: VISÃO GERAL */}
          {activeTab === 'visao_geral' && (
            <div className="max-w-5xl space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-2 hover:border-blue-200 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h3 className="font-bold text-sm">Status do Tratamento</h3>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-800">Em andamento</p>
                  <p className="text-sm font-semibold text-slate-400">Última evolução há 15 dias</p>
                </div>
                
                <div className="bg-white p-6 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-2 hover:border-blue-200 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <h3 className="font-bold text-sm">Próximo Retorno</h3>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-800">12 Out, 2024</p>
                  <p className="text-sm font-semibold text-slate-400">Limpeza semestral</p>
                </div>

                <div className="bg-white p-6 rounded-[24px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-2 hover:border-blue-200 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <h3 className="font-bold text-sm">Financeiro</h3>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-800">Em dia</p>
                  <p className="text-sm font-semibold text-slate-400">Nenhum débito pendente</p>
                </div>
              </div>

              {/* Tabela Resumo Recente */}
              <div className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Últimas Atividades</h3>
                <div className="text-sm font-medium text-slate-500 text-center py-8">
                  O painel de visão geral reúne os resumos das outras abas. Navegue nas guias acima para ações detalhadas.
                </div>
              </div>

            </div>
          )}

          {/* ABA: ANAMNESES */}
          {activeTab === 'anamneses' && (
            <div className="max-w-3xl">
              <div className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Questionários de Saúde</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    Nova Anamnese
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Anamnese Padrão - Hipertensão Relatada</h4>
                        <p className="text-sm font-semibold text-slate-400">Respondida em 15/01/2024</p>
                      </div>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-slate-300 rotate-180" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: ORÇAMENTOS */}
          {activeTab === 'orcamentos' && (
            <div className="max-w-4xl">
              <div className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Orçamentos</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    Novo Orçamento
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">Aprovado</span>
                        <h4 className="font-bold text-slate-800 text-lg">Tratamento Ortodôntico</h4>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">Criado em 10/02/2024 • Dr. Administrador</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Valor Total</p>
                        <p className="text-lg font-extrabold text-slate-800">R$ 2.450,00</p>
                      </div>
                      <button className="text-blue-600 font-bold hover:underline text-sm">Ver Detalhes</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: TRATAMENTOS (Odontograma Interativo) */}
          {activeTab === 'tratamentos' && (
            <div className="max-w-5xl">
              <div className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Plano de Tratamento</h3>
                    <p className="text-sm text-slate-500 font-medium">Odontograma Interativo (Permanentes e Decíduos)</p>
                  </div>
                </div>
                <Odontograma />
              </div>
            </div>
          )}

          {/* ABA: PAGAMENTOS */}
          {activeTab === 'pagamentos' && (
            <div className="max-w-4xl">
              <div className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Histórico Financeiro</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    Lançar Recebimento
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="p-5 bg-white border border-red-200 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                    <div className="pl-3">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">Atrasado (5 dias)</span>
                        <h4 className="font-bold text-slate-800">Manutenção Aparelho (Parcela 2/12)</h4>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">Vencimento: 10/10/2024</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-extrabold text-slate-800">R$ 150,00</p>
                      <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                        Cobrar
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
                     <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                    <div className="pl-3">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">Pago</span>
                        <h4 className="font-bold text-slate-800">Manutenção Aparelho (Parcela 1/12)</h4>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">Pago em: 10/09/2024</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-extrabold text-slate-800">R$ 150,00</p>
                      <button className="text-slate-500 hover:text-blue-600 font-bold text-sm">
                        Recibo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: EVOLUÇÕES (Prontuário) */}
          {activeTab === 'evolucoes' && (
            <div className="max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center w-full max-w-sm bg-white rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
                  <Search className="h-5 w-5 text-slate-400 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar evolução..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="bg-transparent border-none outline-none text-sm w-full text-slate-800 placeholder-slate-400 font-medium"
                  />
                </div>
                
                <button
                  onClick={() => {
                    setEvolucaoSelecionada(null)
                    setModalAberto(true)
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" strokeWidth={3} /> Registrar Evolução
                </button>
              </div>

              {loadingEvolucoes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              ) : erroEvolucoes ? (
                <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm">
                  Erro ao carregar evoluções: {erroEvolucoes}
                </div>
              ) : evolucoesFiltradas.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum registro encontrado</h3>
                  <p className="text-slate-500 font-medium text-sm">
                    O prontuário deste paciente está vazio.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evolucoesFiltradas.map(ev => (
                    <div key={ev.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row gap-4 sm:gap-6 hover:border-blue-200 transition-colors group relative">
                      
                      <div className="w-full sm:w-48 shrink-0 flex flex-col gap-1 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-4">
                        <span className="text-sm font-extrabold text-blue-600">
                          {new Date(ev.data_evolucao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-xs font-bold text-slate-400">Dr. Administrador</span>
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {ev.descricao}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-start gap-2 pt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEvolucaoSelecionada(ev)
                            setModalAberto(true)
                          }}
                          className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => excluirEvolucao(ev.id)}
                          className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA: DOCUMENTOS */}
          {activeTab === 'documentos' && (
            <div className="max-w-4xl">
              <div className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Documentos e Prescrições</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    Gerar Documento
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Receituário de Antibiótico</h4>
                        <p className="text-sm font-semibold text-slate-400">Gerado em 12/03/2024</p>
                      </div>
                    </div>
                    <button className="text-blue-600 font-bold text-sm hover:underline">Imprimir</button>
                  </div>
                  
                  <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Atestado Odontológico (1 dia)</h4>
                        <p className="text-sm font-semibold text-slate-400">Gerado em 12/03/2024</p>
                      </div>
                    </div>
                    <button className="text-blue-600 font-bold text-sm hover:underline">Imprimir</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: ARQUIVOS */}
          {activeTab === 'arquivos' && (
            <div className="max-w-4xl">
              <div className="bg-white p-8 rounded-[32px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Galeria de Arquivos</h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    Fazer Upload
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group">
                    <FileText className="h-10 w-10 mb-2 group-hover:text-blue-600" />
                    <span className="text-xs font-bold">Panorâmica.jpg</span>
                  </div>
                  <div className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group">
                    <FileText className="h-10 w-10 mb-2 group-hover:text-blue-600" />
                    <span className="text-xs font-bold">Raio-X_Periapical.png</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal Nova Evolução */}
      {modalAberto && session?.user?.id && (
        <ModalNovaEvolucao
          pacienteId={pacienteId}
          dentistaId={session.user.id}
          evolucaoParaEditar={evolucaoSelecionada}
          onClose={() => setModalAberto(false)}
          onSaved={carregarEvolucoes}
        />
      )}
    </div>
  )
}
