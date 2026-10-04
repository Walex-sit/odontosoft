'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/app/components/RequireAuth'
import ModalNovaEvolucao from '@/app/components/ModalNovaEvolucao'
import AnamneseDigitalModal from '@/app/components/AnamneseDigitalModal'
import ModalNovoOrcamento from '@/app/components/ModalNovoOrcamento'
import ModalNovaCobranca from '@/app/components/ModalNovaCobranca'
import ModalConsentimentoLGPD from '@/app/components/ModalConsentimentoLGPD'
import {
  ChevronLeft, Info, Calendar, DollarSign, FileText,
  Plus, ClipboardList, Loader2, Pencil, Trash2, CreditCard, HeartPulse,
  ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, XCircle,
  Smartphone, Mail, Camera, HeartHandshake, Microscope, RefreshCw, Lock
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getConformidadeConsentimentos,
  revogarConsentimento,
  type ConformidadeConsentimento,
} from '@/app/actions/pacientes'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Paciente {
  id: string
  nome: string
  telefone: string | null
  cpf: string | null
  email: string | null
  created_at: string
  lgpd_aceite: boolean | null
  lgpd_aceite_em: string | null
}

interface Evolucao {
  id: string
  data_evolucao: string
  descricao: string
  created_at: string
}

interface Cobranca {
  id: string
  valor: number
  descricao: string
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO'
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

function formatarMeio(meio: string | null | undefined) {
  switch (meio) {
    case 'eletronico_interno':
      return 'Eletrônico Interno (Consultório / Tablet)'
    case 'whatsapp_confirmado':
      return 'WhatsApp Confirmado'
    case 'email_confirmado':
      return 'E-mail Confirmado'
    case 'upload_legado':
      return 'Ficha Digitalizada / Upload Legado'
    default:
      return meio || 'Eletrônico'
  }
}

function formatarResponsavel(tipo: string | null | undefined, nome: string | null | undefined) {
  if (!tipo || tipo === 'proprio_paciente') return 'O Próprio Paciente (Titular)'
  const tiposMap: Record<string, string> = {
    pai_mae: 'Pai/Mãe',
    tutor_legal: 'Tutor Legal',
    curador: 'Curador',
  }
  const label = tiposMap[tipo] || tipo
  return nome ? `${label} (${nome})` : label
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </label>
      {value ? (
        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">{value}</p>
      ) : (
        <p className="text-slate-600 dark:text-slate-300 italic text-sm">Não informado</p>
      )}
    </div>
  )
}

function EvolucaoSkeleton() {
  return (
    <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-slate-700/60 rounded animate-pulse" />
        <div className="h-4 w-20 bg-slate-700/60 rounded animate-pulse" />
      </div>
      <div className="h-3 w-full bg-slate-700/60 rounded animate-pulse" />
      <div className="h-3 w-3/4 bg-slate-700/60 rounded animate-pulse" />
    </div>
  )
}

// ─── Finalidades Meta Config ─────────────────────────────────────────────────

const FINALIDADES_META: Record<
  string,
  { label: string; descricao: string; icon: React.ComponentType<{ className?: string }> }
> = {
  whatsapp: {
    label: 'Lembretes e Avisos via WhatsApp',
    descricao: 'Confirmações de consulta, orientações pós-atendimento e avisos operacionais.',
    icon: Smartphone,
  },
  email_marketing: {
    label: 'E-mails e Documentos Digitais',
    descricao: 'Receituários digitais, notas fiscais, recibos e informativos da clínica.',
    icon: Mail,
  },
  imagens_redes_sociais: {
    label: 'Uso de Imagens Clínicas (Antes/Depois)',
    descricao: 'Fotografias e exames para acompanhamento do caso e eventual uso educativo.',
    icon: Camera,
  },
  compartilhamento_plano_saude: {
    label: 'Compartilhamento com Convênios / Planos',
    descricao: 'Envio de laudos, guias TISS e relatórios para auditoria das operadoras.',
    icon: HeartHandshake,
  },
  pesquisa_clinica: {
    label: 'Pesquisa Clínica e Estatística Interna',
    descricao: 'Dados estritamente anonimizados para aprimoramento de protocolos assistenciais.',
    icon: Microscope,
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DetalhePaciente() {
  const { session } = useAuth()
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [activeTab, setActiveTab] = useState('informacoes')
  const [anamneseOpen, setAnamneseOpen] = useState(false)
  const [loadingPaciente, setLoadingPaciente] = useState(true)

  // LGPD & Privacidade (vw_conformidade_consentimentos)
  const [consentimentos, setConsentimentos] = useState<ConformidadeConsentimento[]>([])
  const [loadingConsentimentos, setLoadingConsentimentos] = useState(true)
  const [modalLgpdOpen, setModalLgpdOpen] = useState(false)
  const [revogandoLgpd, setRevogandoLgpd] = useState(false)

  // Prontuário
  const [evolucoes, setEvolucoes] = useState<Evolucao[]>([])
  const [loadingEvolucoes, setLoadingEvolucoes] = useState(false)
  const [erroEvolucoes, setErroEvolucoes] = useState<string | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [evolucaoSelecionada, setEvolucaoSelecionada] = useState<Evolucao | null>(null)

  // Financeiro
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [loadingCobrancas, setLoadingCobrancas] = useState(false)
  const [erroCobrancas, setErroCobrancas] = useState<string | null>(null)
  const [cobrancaModalOpen, setCobrancaModalOpen] = useState(false)

  // Orçamento
  const [orcamentoModalOpen, setOrcamentoModalOpen] = useState(false)

  // ── Carrega paciente ──────────────────────────────────────────────────────

  const carregarPaciente = useCallback(async () => {
    if (!pacienteId) return

    const { data } = await supabase
      .from('pacientes')
      .select('id, nome, telefone, cpf, email, created_at, lgpd_aceite, lgpd_aceite_em')
      .eq('id', pacienteId)
      .single()

    setPaciente(data as Paciente | null)
    setLoadingPaciente(false)
  }, [pacienteId])

  // ── Carrega consentimentos da view vw_conformidade_consentimentos ─────────

  const carregarConsentimentos = useCallback(async () => {
    if (!pacienteId) return
    setLoadingConsentimentos(true)

    const res = await getConformidadeConsentimentos(pacienteId)
    if (res.success && res.data && res.data.length > 0) {
      setConsentimentos(res.data)
    } else {
      const { data } = await supabase
        .from('vw_conformidade_consentimentos')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('registrado_em', { ascending: false })

      if (data && data.length > 0) {
        setConsentimentos(data as ConformidadeConsentimento[])
      } else if (res.success) {
        setConsentimentos(res.data || [])
      }
    }
    setLoadingConsentimentos(false)
  }, [pacienteId])

  useEffect(() => {
    if (session) {
      carregarPaciente()
      carregarConsentimentos()
    } else if (session === null) {
      setLoadingPaciente(false)
      setLoadingConsentimentos(false)
    }
  }, [session, carregarPaciente, carregarConsentimentos])

  // Consentimento mais relevante (ativo ou o mais recente)
  const consentimentoAtivo =
    consentimentos.find(c => c.status === 'ativo') || consentimentos[0] || null

  // ── Revogação de consentimento ────────────────────────────────────────────

  async function handleRevogarConsentimento(consentimentoId: string) {
    if (
      !window.confirm(
        'Tem certeza que deseja revogar este consentimento? Esta ação será auditada no sistema e suspenderá as autorizações de tratamento de dados associadas.'
      )
    ) {
      return
    }

    setRevogandoLgpd(true)
    try {
      const res = await revogarConsentimento(
        consentimentoId,
        pacienteId,
        session?.user?.id,
        session?.user?.email
      )

      if (res.success) {
        toast.success('Consentimento revogado com sucesso!')
        await carregarConsentimentos()
        await carregarPaciente()
      } else {
        toast.error('Erro ao revogar consentimento: ' + (res.error || 'Erro inesperado'))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao revogar consentimento'
      toast.error(msg)
    } finally {
      setRevogandoLgpd(false)
    }
  }

  // ── Excluir evolução ──────────────────────────────────────────────────────

  async function excluirEvolucao(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta evolução?')) {
      return
    }

    const { error } = await supabase.from('evolucao').delete().eq('id', id)

    if (error) {
      toast.error('Erro ao excluir a evolução: ' + error.message)
    } else {
      toast.success('Evolução excluída com sucesso!')
      carregarEvolucoes()
    }
  }

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

  useEffect(() => {
    if (activeTab === 'prontuario' && session) {
      carregarEvolucoes()
    }
  }, [activeTab, session, carregarEvolucoes])

  // ── Carrega cobranças ─────────────────────────────────────────────────────

  const carregarCobrancas = useCallback(async () => {
    if (!pacienteId) return
    setLoadingCobrancas(true)
    setErroCobrancas(null)

    const { data, error } = await supabase
      .from('cobrancas')
      .select('id, valor, descricao, status, created_at')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })

    if (error) {
      setErroCobrancas(error.message)
    } else {
      setCobrancas((data ?? []) as Cobranca[])
    }

    setLoadingCobrancas(false)
  }, [pacienteId])

  useEffect(() => {
    if (activeTab === 'financeiro' && session) {
      carregarCobrancas()
    }
  }, [activeTab, session, carregarCobrancas])

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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Paciente não encontrado</h2>
        <button
          onClick={() => router.push('/pacientes')}
          className="mt-4 text-blue-500 hover:underline text-sm font-semibold"
        >
          Voltar para a lista
        </button>
      </div>
    )
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'informacoes', name: 'Informações', icon: Info },
    { id: 'privacidade',  name: 'Privacidade & LGPD', icon: ShieldCheck },
    { id: 'historico',    name: 'Consultas',    icon: Calendar },
    { id: 'proximo',      name: 'Tratamentos', icon: DollarSign },
    { id: 'financeiro',   name: 'Financeiro',   icon: CreditCard },
    { id: 'prontuario',   name: 'Prontuário',   icon: FileText },
    { id: 'anamnese',     name: 'Anamnese',     icon: HeartPulse },
  ]

  // Status LGPD badge helper
  const isLgpdAtivo = consentimentoAtivo?.status === 'ativo'
  const isLgpdRevogado = consentimentoAtivo?.status === 'revogado'

  return (
    <>
      {/* Cabeçalho do paciente */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/pacientes')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 font-medium text-sm transition-colors mb-4 active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para lista
          </button>

          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl shadow-sm shrink-0">
              {paciente.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                  {paciente.nome}
                </h2>

                {/* Badge Dinâmica com base em vw_conformidade_consentimentos */}
                {loadingConsentimentos ? (
                  <span className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                ) : isLgpdAtivo ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Conforme LGPD (v{consentimentoAtivo?.versao_termo || '2024.1'})
                  </span>
                ) : isLgpdRevogado ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    <AlertOctagon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    Consentimento Revogado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Pendente LGPD
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-xs sm:text-sm font-medium">
                Paciente Cadastrado · ID: {paciente.id.substring(0, 8)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalLgpdOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <ShieldCheck className="h-4 w-4" />
            {isLgpdAtivo ? 'Atualizar Aceite LGPD' : 'Registrar Aceite LGPD'}
          </button>

          <button
            onClick={() => router.push(`/pacientes/${paciente.id}/edit`)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar Cadastro
          </button>
        </div>
      </div>

      {/* Card com tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden mb-8">

        {/* Tab bar */}
        <div className="border-b border-slate-200 dark:border-slate-700/50 px-4 sm:px-6">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm
                  transition-colors flex items-center gap-2
                  ${activeTab === id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}
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
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700/50 pb-2">
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField label="Nome Completo" value={paciente.nome} />
                <InfoField label="Data de Cadastro" value={new Date(paciente.created_at).toLocaleDateString('pt-BR')} />
                <InfoField label="Telefone" value={formatarTelefone(paciente.telefone)} />
                <InfoField label="Email" value={paciente.email} />
                <InfoField label="CPF" value={formatarCPF(paciente.cpf)} />
              </div>

              {/* Seção LGPD Dinâmica na aba Informações */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Conformidade LGPD & CFO (Proteção de Dados)
                  </h3>
                  <button
                    onClick={() => setActiveTab('privacidade')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Ver detalhes completos →
                  </button>
                </div>

                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    isLgpdAtivo
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : isLgpdRevogado
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {isLgpdAtivo
                            ? `✓ Termo de Privacidade Ativo (${consentimentoAtivo?.tipo_termo || 'LGPD'} v${consentimentoAtivo?.versao_termo || '2024.1'})`
                            : isLgpdRevogado
                            ? '🚫 Consentimento Revogado pelo Titular'
                            : '⚠️ Termo de Consentimento LGPD Pendente'}
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {isLgpdAtivo && consentimentoAtivo?.manifestado_em
                          ? `Manifestado em ${new Date(consentimentoAtivo.manifestado_em).toLocaleString('pt-BR')} via ${formatarMeio(consentimentoAtivo.meio)}.`
                          : isLgpdRevogado && consentimentoAtivo?.revogado_em
                          ? `Revogado formalmente em ${new Date(consentimentoAtivo.revogado_em).toLocaleString('pt-BR')}.`
                          : 'O paciente ainda não possui registro formal de consentimento conforme a Lei 13.709/2018.'}
                      </p>

                      {/* Resumo das finalidades autorizadas */}
                      {isLgpdAtivo && consentimentoAtivo?.finalidades && (
                        <div className="pt-2 flex items-center gap-2 flex-wrap">
                          {Object.entries(consentimentoAtivo.finalidades).map(([fin, aut]) => (
                            <span
                              key={fin}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                aut
                                  ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                  : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700 line-through opacity-70'
                              }`}
                            >
                              {FINALIDADES_META[fin]?.label || fin}: {aut ? 'Autorizado' : 'Negado'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setModalLgpdOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {isLgpdAtivo ? 'Atualizar Aceite' : 'Registrar Aceite'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA: PRIVACIDADE & LGPD DEDICADA ─────────────────────────── */}
          {activeTab === 'privacidade' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Gestão de Privacidade & Conformidade LGPD
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Histórico imutável de consentimentos, finalidades autorizadas e comprovação de conformidade legal.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={carregarConsentimentos}
                    disabled={loadingConsentimentos}
                    className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition-all"
                    title="Atualizar dados"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingConsentimentos ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={() => setModalLgpdOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {isLgpdAtivo ? 'Atualizar Consentimento' : 'Registrar Novo Aceite'}
                  </button>
                </div>
              </div>

              {loadingConsentimentos ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              ) : !consentimentoAtivo ? (
                <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
                  <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-7 w-7" />
                  </div>
                  <h4 className="text-slate-800 dark:text-slate-100 font-bold mb-1 text-base">
                    Nenhum consentimento formal registrado
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-5">
                    De acordo com os artigos 7º e 8º da LGPD e as normas do CFO, é recomendável coletar e documentar o consentimento do paciente para o tratamento e comunicação de seus dados.
                  </p>
                  <button
                    onClick={() => setModalLgpdOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Registrar Aceite Eletrônico Agora
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Card Status do Consentimento Ativo / Atual */}
                  <div className="bg-slate-50/80 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                            isLgpdAtivo
                              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                              : isLgpdRevogado
                              ? 'bg-rose-500 shadow-sm shadow-rose-500/30'
                              : 'bg-amber-500'
                          }`}
                        >
                          {isLgpdAtivo ? (
                            <ShieldCheck className="h-6 w-6" />
                          ) : isLgpdRevogado ? (
                            <AlertOctagon className="h-6 w-6" />
                          ) : (
                            <AlertTriangle className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                              Termo {consentimentoAtivo.tipo_termo || 'LGPD'} — Versão {consentimentoAtivo.versao_termo || '2024.1'}
                            </h4>
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isLgpdAtivo
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : isLgpdRevogado
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                              }`}
                            >
                              Status: {consentimentoAtivo.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            ID do Registro: {consentimentoAtivo.consentimento_id?.substring(0, 13)}...
                          </p>
                        </div>
                      </div>

                      {/* Botão de Revogação */}
                      {isLgpdAtivo && consentimentoAtivo.consentimento_id && (
                        <button
                          onClick={() => handleRevogarConsentimento(consentimentoAtivo.consentimento_id!)}
                          disabled={revogandoLgpd}
                          className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                          {revogandoLgpd ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <AlertOctagon className="h-3.5 w-3.5" />
                          )}
                          Revogar Consentimento
                        </button>
                      )}
                    </div>

                    {/* Metadados do consentimento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Manifestado em
                        </span>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          {consentimentoAtivo.manifestado_em
                            ? new Date(consentimentoAtivo.manifestado_em).toLocaleString('pt-BR')
                            : 'Pendente'}
                        </p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Canal / Meio
                        </span>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          {formatarMeio(consentimentoAtivo.meio)}
                        </p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Responsável Legal
                        </span>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                          {formatarResponsavel(
                            consentimentoAtivo.responsavel_tipo,
                            consentimentoAtivo.responsavel_nome
                          )}
                        </p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Evidência Digital
                        </span>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          {consentimentoAtivo.possui_evidencia ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Anexada
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <Lock className="h-3.5 w-3.5" /> Hash / Log do Sistema
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lista Detalhada de Finalidades Granulares */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3">
                      Detalhamento das Finalidades Granulares
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(FINALIDADES_META).map(([finKey, finMeta]) => {
                        const autorizado = Boolean(consentimentoAtivo.finalidades?.[finKey])
                        const IconComponent = finMeta.icon

                        return (
                          <div
                            key={finKey}
                            className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                              autorizado && isLgpdAtivo
                                ? 'bg-white dark:bg-slate-800/80 border-emerald-300 dark:border-emerald-800/60 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
                            }`}
                          >
                            <div
                              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                                autorizado && isLgpdAtivo
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                              }`}
                            >
                              <IconComponent className="h-4 w-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {finMeta.label}
                                </span>
                                {autorizado && isLgpdAtivo ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                                    <CheckCircle2 className="h-3 w-3" /> Autorizado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                                    <XCircle className="h-3 w-3" /> Negado
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                                {finMeta.descricao}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Histórico completo de manifestações anteriores (se houver mais de 1) */}
                  {consentimentos.length > 1 && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3">
                        Histórico de Manifestações Anteriores
                      </h4>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                            <tr>
                              <th className="px-4 py-3">Termo / Versão</th>
                              <th className="px-4 py-3">Manifestado em</th>
                              <th className="px-4 py-3">Meio</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Revogado em</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {consentimentos.map((c, idx) => (
                              <tr key={c.consentimento_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {c.tipo_termo} (v{c.versao_termo})
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {c.manifestado_em ? new Date(c.manifestado_em).toLocaleDateString('pt-BR') : '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {formatarMeio(c.meio)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      c.status === 'ativo'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                  >
                                    {c.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {c.revogado_em ? new Date(c.revogado_em).toLocaleString('pt-BR') : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* ── Consultas ─────────────────────────────────────────────────── */}
          {activeTab === 'historico' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="text-slate-800 dark:text-slate-100 font-bold mb-1 text-base">Nenhum histórico de consultas</h4>
              <p className="text-slate-400 text-sm">Os agendamentos concluídos aparecerão aqui.</p>
            </div>
          )}

          {/* ── Tratamentos ───────────────────────────────────────────────── */}
          {activeTab === 'proximo' && (
            <div className="text-center py-12">
              <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-5 w-5" />
              </div>
              <h4 className="text-slate-800 dark:text-slate-100 font-bold mb-1 text-base">Planejamento de Tratamento</h4>
              <p className="text-slate-400 text-sm mb-4">Gerencie os orçamentos e tratamentos deste paciente.</p>
              <button 
                onClick={() => setOrcamentoModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all border border-blue-500 shadow-sm active:scale-95"
              >
                Novo Orçamento
              </button>
            </div>
          )}

          {/* ── Financeiro ────────────────────────────────────────────────── */}
          {activeTab === 'financeiro' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-slate-400" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Histórico Financeiro
                  </h3>
                  {!loadingCobrancas && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 px-2 py-0.5 rounded-full">
                      {cobrancas.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setCobrancaModalOpen(true)}
                  className="
                    flex items-center gap-2 text-sm font-bold
                    text-white bg-green-600 hover:bg-green-500
                    border border-green-500 px-4 py-2 rounded-xl
                    shadow-sm shadow-green-500/20
                    transition-all active:scale-95
                  "
                >
                  <Plus className="h-4 w-4" />
                  Gerar Nova Cobrança
                </button>
              </div>

              {loadingCobrancas && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
              )}

              {!loadingCobrancas && erroCobrancas && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
                  <p className="text-sm font-bold text-red-400 mb-1">Erro ao carregar cobranças</p>
                  <p className="text-xs text-slate-400 mb-3">{erroCobrancas}</p>
                  <button
                    onClick={carregarCobrancas}
                    className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 transition-all active:scale-95"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {!loadingCobrancas && !erroCobrancas && cobrancas.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-12 w-12 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h4 className="text-slate-800 dark:text-slate-100 font-bold mb-1 text-base">Nenhuma cobrança registrada</h4>
                  <p className="text-slate-400 text-sm mb-4">
                    Este paciente ainda não possui histórico financeiro.
                  </p>
                </div>
              )}

              {!loadingCobrancas && !erroCobrancas && cobrancas.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Descrição</th>
                        <th className="px-6 py-4 font-semibold">Data</th>
                        <th className="px-6 py-4 font-semibold">Valor</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                      {cobrancas.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{c.descricao}</td>
                          <td className="px-6 py-4 text-slate-400">
                            {new Date(c.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.valor)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                              c.status === 'PAGO' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                              c.status === 'CANCELADO' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Prontuário ────────────────────────────────────────────────── */}
          {activeTab === 'prontuario' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-slate-400" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Evoluções Clínicas
                  </h3>
                  {!loadingEvolucoes && (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 px-2 py-0.5 rounded-full">
                      {evolucoes.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setEvolucaoSelecionada(null)
                    setModalAberto(true)
                  }}
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

              {loadingEvolucoes && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  {Array.from({ length: 3 }).map((_, i) => <EvolucaoSkeleton key={i} />)}
                </div>
              )}

              {!loadingEvolucoes && erroEvolucoes && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 text-center">
                  <p className="text-sm font-bold text-red-400 mb-1">Erro ao carregar evoluções</p>
                  <p className="text-xs text-slate-400 mb-3">{erroEvolucoes}</p>
                  <button
                    onClick={carregarEvolucoes}
                    className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-700 transition-all active:scale-95"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {!loadingEvolucoes && !erroEvolucoes && evolucoes.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-12 w-12 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h4 className="text-slate-800 dark:text-slate-100 font-bold mb-1 text-base">Nenhuma evolução registrada</h4>
                  <p className="text-slate-400 text-sm mb-4">
                    Clique em{' '}
                    <button
                      onClick={() => {
                        setEvolucaoSelecionada(null)
                        setModalAberto(true)
                      }}
                      className="text-blue-500 hover:underline font-semibold"
                    >
                      Nova Evolução
                    </button>{' '}
                    para criar o primeiro registro clínico.
                  </p>
                </div>
              )}

              {!loadingEvolucoes && !erroEvolucoes && evolucoes.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  {evolucoes.map((ev, index) => (
                    <div
                      key={ev.id}
                      className={`
                        p-5 sm:p-6 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors
                        ${index < evolucoes.length - 1 ? 'border-b border-slate-200 dark:border-slate-700/50' : ''}
                      `}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {new Date(ev.data_evolucao + 'T00:00:00').toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'long', year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 pl-4 sm:pl-0">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Registrado: {new Date(ev.created_at).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEvolucaoSelecionada(ev)
                                setModalAberto(true)
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Editar evolução"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => excluirEvolucao(ev.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Excluir evolução"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-4">
                        {ev.descricao}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ABA: ANAMNESE ──────────────────────────────────────────────── */}
          {activeTab === 'anamnese' && (
            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm p-8 mt-2 mb-8 flex flex-col items-center gap-6 text-center">
              <div className="p-4 bg-blue-500/10 rounded-2xl">
                <HeartPulse className="h-10 w-10 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Anamnese Digital</h3>
                <p className="text-sm text-slate-400 max-w-sm">Clique abaixo para preencher ou revisar a ficha de anamnese e histórico de saúde deste paciente.</p>
              </div>
              <button onClick={() => setAnamneseOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm shadow-blue-500/20">
                <ClipboardList className="h-4 w-4" /> Abrir Ficha de Anamnese
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Modais ──────────────────────────────────────────────────────────── */}
      {modalAberto && session?.user?.id && (
        <ModalNovaEvolucao
          pacienteId={pacienteId}
          dentistaId={session.user.id}
          evolucaoParaEditar={evolucaoSelecionada}
          onClose={() => setModalAberto(false)}
          onSaved={carregarEvolucoes}
        />
      )}

      <ModalConsentimentoLGPD
        isOpen={modalLgpdOpen}
        onClose={() => setModalLgpdOpen(false)}
        pacienteId={pacienteId}
        pacienteNome={paciente?.nome || ''}
        consentimentoAtual={consentimentoAtivo}
        onSuccess={async () => {
          await carregarConsentimentos()
          await carregarPaciente()
        }}
      />

      <AnamneseDigitalModal
        pacienteNome={paciente?.nome || ''}
        isOpen={anamneseOpen}
        onClose={() => setAnamneseOpen(false)}
      />

      <ModalNovoOrcamento
        pacienteId={pacienteId}
        isOpen={orcamentoModalOpen}
        onClose={() => setOrcamentoModalOpen(false)}
        onSuccess={() => {
          setOrcamentoModalOpen(false)
        }}
      />

      <ModalNovaCobranca
        pacienteId={pacienteId}
        isOpen={cobrancaModalOpen}
        onClose={() => setCobrancaModalOpen(false)}
        onSuccess={() => {
          setCobrancaModalOpen(false)
          carregarCobrancas()
        }}
      />
    </>
  )
}