'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/app/components/RequireAuth'
import ModalNovaEvolucao from '@/app/components/ModalNovaEvolucao'
import {
  ChevronLeft, Info, Calendar, DollarSign, FileText,
  Plus, ClipboardList, Loader2,
} from 'lucide-react'

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

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {value ? (
        <p className="text-slate-300 font-medium text-sm">{value}</p>
      ) : (
        <p className="text-slate-600 italic text-sm">Não informado</p>
      )}
    </div>
  )
}

// ─── Skeleton para linha de evolução ─────────────────────────────────────────

function EvolucaoSkeleton() {
  return (
    <div className="p-6 border-b border-slate-700/50 space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-slate-700/60 rounded animate-pulse" />
        <div className="h-4 w-20 bg-slate-700/60 rounded animate-pulse" />
      </div>
      <div className="h-3 w-full bg-slate-700/60 rounded animate-pulse" />
      <div className="h-3 w-3/4 bg-slate-700/60 rounded animate-pulse" />
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
  const [activeTab, setActiveTab] = useState('informacoes')
  const [loadingPaciente, setLoadingPaciente] = useState(true)

  // Prontuário
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [loadingEvolucoes, setLoadingEvolucoes] = useState(false)
  const [erroEvolucoes, setErroEvolucoes] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)

  // ── Carrega paciente ──────────────────────────────────────────────────────

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

  // ── Carrega evoluções ─────────────────────────────────────────────────────

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

  // Carrega evoluções ao entrar na aba prontuário
  useEffect(() => {
    if (activeTab === 'prontuario' && session) {
      carregarEvolucoes()
    }
  }, [activeTab, session, carregarEvolucoes])

  // ── Loading / Not found ───────────────────────────────────────────────────

  if (loadingPaciente) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-slate-100">Paciente não encontrado</h2>
        <button
          onClick={() => router.push('/pacientes')}
          className="mt-4 text-blue-400 hover:underline text-sm"
        >
          Voltar para a lista
        </button>
      </div>
    )
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'informacoes', name: 'Informações', icon: Info },
    { id: 'historico',   name: 'Consultas',   icon: Calendar },
    { id: 'proximo',     name: 'Tratamentos', icon: DollarSign },
    { id: 'prontuario',  name: 'Prontuário',  icon: FileText },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Cabeçalho do paciente */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/pacientes')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 font-medium text-sm transition-colors mb-4 active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para lista
        </button>

        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl shadow-sm shrink-0">
            {paciente.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100">{paciente.nome}</h2>
            <p className="text-slate-500 mt-0.5 text-xs sm:text-sm font-medium">
              Paciente Ativo · ID: {paciente.id.substring(0, 8)}
            </p>
          </div>
        </div>
      </div>

      {/* Card com tabs */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden mb-8">

        {/* Tab bar */}
        <div className="border-b border-slate-700/50 px-4 sm:px-6">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm
                  transition-colors flex items-center gap-2
                  ${activeTab === id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'}
                `}
              >
                <Icon className="h-4 w-4" />
                {name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">

          {/* ── Informações ────────────────────────────────────────────────── */}
          {activeTab === 'informacoes' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-slate-100 border-b border-slate-700/50 pb-2">
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField label="Nome Completo" value={paciente.nome} />
                <InfoField label="Data de Cadastro" value={new Date(paciente.created_at).toLocaleDateString('pt-BR')} />
                <InfoField label="Telefone" value={formatarTelefone(paciente.telefone)} />
                <InfoField label="Email" value={paciente.email} />
                <InfoField label="CPF" value={formatarCPF(paciente.cpf)} />
              </div>
            </div>
          )}

          {/* ── Consultas ─────────────────────────────────────────────────── */}
          {activeTab === 'historico' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-slate-900 border border-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="text-slate-100 font-bold mb-1 text-base">Nenhum histórico de consultas</h4>
              <p className="text-slate-400 text-sm">Os agendamentos concluídos aparecerão aqui.</p>
            </div>
          )}

          {/* ── Tratamentos ───────────────────────────────────────────────── */}
          {activeTab === 'proximo' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-5 w-5" />
              </div>
              <h4 className="text-slate-100 font-bold mb-1 text-base">Planejamento de Tratamento</h4>
              <p className="text-slate-400 text-sm mb-4">Módulo de orçamento e tratamentos em breve.</p>
              <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all border border-blue-500 shadow-sm active:scale-95">
                Novo Orçamento
              </button>
            </div>
          )}

          {/* ── Prontuário ────────────────────────────────────────────────── */}
          {activeTab === 'prontuario' && (
            <div>
              {/* Header da aba com botão Nova Evolução */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-slate-400" />
                  <h3 className="text-base font-bold text-slate-100">
                    Evoluções Clínicas
                  </h3>
                  {!loadingEvolucoes && (
                    <span className="text-xs font-bold text-slate-500 bg-slate-900 border border-slate-700/50 px-2 py-0.5 rounded-full">
                      {evolucoes.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setModalAberto(true)}
                  className="
                    flex items-center gap-2 text-sm font-bold
                    text-white bg-blue-600 hover:bg-blue-500
                    border border-blue-500 px-4 py-2 rounded-xl
                    shadow-sm shadow-blue-500/20
                    transition-all active:scale-95
                  "
                >
                  <Plus className="h-4 w-4" />
                  Nova Evolução
                </button>
              </div>

              {/* Loading skeleton */}
              {loadingEvolucoes && (
                <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                  {Array.from({ length: 3 }).map((_, i) => <EvolucaoSkeleton key={i} />)}
                </div>
              )}

              {/* Erro */}
              {!loadingEvolucoes && erroEvolucoes && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
                  <p className="text-sm font-bold text-red-400 mb-1">Erro ao carregar evoluções</p>
                  <p className="text-xs text-slate-400 mb-3">{erroEvolucoes}</p>
                  <button
                    onClick={carregarEvolucoes}
                    className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 transition-all active:scale-95"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* Vazio */}
              {!loadingEvolucoes && !erroEvolucoes && evolucoes.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h4 className="text-slate-100 font-bold mb-1 text-base">Nenhuma evolução registrada</h4>
                  <p className="text-slate-400 text-sm mb-4">
                    Clique em{' '}
                    <button
                      onClick={() => setModalAberto(true)}
                      className="text-blue-400 hover:underline font-semibold"
                    >
                      Nova Evolução
                    </button>{' '}
                    para criar o primeiro registro clínico.
                  </p>
                </div>
              )}

              {/* Lista de evoluções */}
              {!loadingEvolucoes && !erroEvolucoes && evolucoes.length > 0 && (
                <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                  {evolucoes.map((ev, index) => (
                    <div
                      key={ev.id}
                      className={`
                        p-5 sm:p-6 hover:bg-slate-700/20 transition-colors
                        ${index < evolucoes.length - 1 ? 'border-b border-slate-700/50' : ''}
                      `}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-200">
                            {new Date(ev.data_evolucao + 'T00:00:00').toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'long', year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono pl-4 sm:pl-0">
                          Registrado: {new Date(ev.created_at).toLocaleString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap pl-4">
                        {ev.descricao}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal Nova Evolução ─────────────────────────────────────────────── */}
      {modalAberto && session?.user?.id && (
        <ModalNovaEvolucao
          pacienteId={pacienteId}
          dentistaId={session.user.id}
          onClose={() => setModalAberto(false)}
          onSaved={carregarEvolucoes}
        />
      )}
    </>
  )
}
