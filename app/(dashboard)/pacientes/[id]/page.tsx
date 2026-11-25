'use client'

/**
 * app/(dashboard)/pacientes/[id]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página de detalhes e prontuário do paciente (Painel da Clínica).
 *
 * Segurança (T001):
 *  ✅ Consulta alinhada ao schema LGPD (cpf_mascarado para minimização de dados).
 *  ✅ RLS no Supabase garante o isolamento multi-tenant da clínica.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/app/components/RequireAuth'
import ModalNovaEvolucao from '@/app/components/ModalNovaEvolucao'
import AnamneseDigitalModal from '@/app/components/AnamneseDigitalModal'
import ModalNovoOrcamento from '@/app/components/ModalNovoOrcamento'
import ModalNovaCobranca from '@/app/components/ModalNovaCobranca'
import ModalConsentimentoLGPD from '@/app/components/ModalConsentimentoLGPD'
import OdontogramaInterativo from '@/app/components/OdontogramaInterativo'
import {
  ChevronLeft, Info, Calendar, DollarSign, FileText,
  Plus, ClipboardList, Loader2, Pencil, Trash2, CreditCard, HeartPulse,
  ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, XCircle,
  Smartphone, Mail, Camera, HeartHandshake, Microscope, RefreshCw, Lock, Scan
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
  /** CPF mascarado para exibição segura na UI (LGPD art. 46). */
  cpf_mascarado: string | null
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
      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {label}
      </label>
      {value ? (
        <p className="text-[var(--text-secondary)] font-medium text-sm">{value}</p>
      ) : (
        <p className="text-[var(--text-secondary)] italic text-sm">Não informado</p>
      )}
    </div>
  )
}

function EvolucaoSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-[var(--border)]/70  bg-[var(--bg-surface)] space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-4 w-32 bg-[var(--border)] dark:bg-[var(--border)] rounded-lg" />
        <div className="h-4 w-20 bg-[var(--border)] dark:bg-[var(--border)] rounded-lg" />
      </div>
      <div className="h-3 w-full bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-lg" />
      <div className="h-3 w-3/4 bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-lg" />
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

  // LGPD & Privacidade
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
      .select('id, nome, telefone, cpf_mascarado, email, created_at, lgpd_aceite, lgpd_aceite_em')
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]/40" />
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Paciente não encontrado</h2>
        <button
          onClick={() => router.push('/pacientes')}
          className="mt-4 text-[var(--primary)] hover:underline text-sm font-semibold"
        >
          Voltar para a lista
        </button>
      </div>
    )
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'informacoes',  name: 'Informações',       icon: Info },
    { id: 'privacidade',  name: 'Privacidade & LGPD', icon: ShieldCheck },
    { id: 'historico',    name: 'Consultas',          icon: Calendar },
    { id: 'proximo',      name: 'Tratamentos',        icon: DollarSign },
    { id: 'financeiro',   name: 'Financeiro',         icon: CreditCard },
    { id: 'prontuario',   name: 'Prontuário',         icon: FileText },
    { id: 'odontograma',  name: 'Odontograma',        icon: Scan },
    { id: 'anamnese',     name: 'Anamnese',           icon: HeartPulse },
  ]

  const isLgpdAtivo = consentimentoAtivo?.status === 'ativo'
  const isLgpdRevogado = consentimentoAtivo?.status === 'revogado'

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[var(--bg-base)] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Botão de retorno */}
        <button
          onClick={() => router.push('/pacientes')}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] font-bold text-xs transition-colors active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para lista de pacientes
        </button>

        {/* Cabeçalho do paciente em Bento Card */}
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.035)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="h-16 w-16 rounded-2xl bg-[var(--primary-fill)] flex items-center justify-center text-[var(--on-primary)] font-black text-2xl shadow-md border-2 border-[var(--bg-surface)]  ring-2 ring-[var(--primary)]/20 shrink-0">
              {paciente.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
                  {paciente.nome}
                </h2>

                {loadingConsentimentos ? (
                  <span className="h-6 w-28 bg-[var(--border)] dark:bg-[var(--bg-surface)] rounded-full animate-pulse" />
                ) : isLgpdAtivo ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Conforme LGPD (v{consentimentoAtivo?.versao_termo || '2024.1'})
                  </span>
                ) : isLgpdRevogado ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <AlertOctagon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    Consentimento Revogado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Pendente LGPD
                  </span>
                )}
              </div>
              <p className="text-[var(--text-muted)] mt-1 text-xs sm:text-sm font-semibold">
                Paciente Cadastrado · ID: #{paciente.id.substring(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => setModalLgpdOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <ShieldCheck className="h-4 w-4" />
              {isLgpdAtivo ? 'Atualizar Aceite LGPD' : 'Registrar Aceite LGPD'}
            </button>

            <button
              onClick={() => router.push(`/pacientes/${paciente.id}/edit`)}
              className="bg-[var(--bg-surface)] border border-[var(--border)]/90  text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar Cadastro
            </button>
          </div>
        </div>

        {/* Card com tabs */}
        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] shadow-[0_2px_14px_-4px_rgba(15,23,42,0.04)] overflow-hidden mb-8">
          <div className="border-b border-[var(--border)]/80  px-4 sm:px-6 bg-[var(--bg-base)] dark:bg-[var(--bg-base)]">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar scroll-smooth">
              {tabs.map(({ id, name, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-bold text-xs sm:text-sm
                    transition-all flex items-center gap-2
                    ${activeTab === id
                      ? 'border-[var(--primary)]/40 text-[var(--primary)] font-extrabold'
                      : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]  hover:border-[var(--border-medium)] dark:hover:border-[var(--border)]'}
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {name}
                </button>
              ))}
            </nav>
          </div>

        <div className="p-6">
          {activeTab === 'informacoes' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)]  pb-2">
                Dados Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField label="Nome Completo" value={paciente.nome} />
                <InfoField label="Data de Cadastro" value={new Date(paciente.created_at).toLocaleDateString('pt-BR')} />
                <InfoField label="Telefone" value={formatarTelefone(paciente.telefone)} />
                <InfoField label="Email" value={paciente.email} />
                <InfoField label="CPF" value={paciente.cpf_mascarado || '—'} />
              </div>
            </div>
          )}

          {activeTab === 'privacidade' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)]/70  pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Gestão de Privacidade & Conformidade LGPD
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                    Registo de consentimentos vinculados a este paciente, em conformidade com a LGPD.
                  </p>
                </div>
                <button
                  onClick={() => setModalLgpdOpen(true)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {isLgpdAtivo ? 'Atualizar Consentimento' : 'Registar Consentimento'}
                </button>
              </div>

              {/* Status global */}
              {loadingConsentimentos ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] animate-pulse" />
                  ))}
                </div>
              ) : consentimentos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]">
                  <ShieldCheck className="h-10 w-10 text-[var(--border-medium)] mb-3" />
                  <p className="text-sm font-bold text-[var(--text-secondary)]">Nenhum consentimento registado</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                    Registe o aceite LGPD deste paciente para garantir a conformidade legal.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consentimentos.map((c, idx) => {
                    const isAtivo = c.status === 'ativo'
                    const isRevogado = c.status === 'revogado'
                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl border shadow-[0_1px_6px_-2px_rgba(15,23,42,0.04)] ${
                          isAtivo
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/50'
                            : isRevogado
                              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-800/50'
                              : 'bg-[var(--bg-surface)] border-[var(--border)]/70 '
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            {isAtivo ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : isRevogado ? (
                              <XCircle className="h-4 w-4 text-rose-500 dark:text-rose-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            <span className={`text-xs font-extrabold uppercase tracking-wider ${
                              isAtivo ? 'text-emerald-700 dark:text-emerald-400'
                                : isRevogado ? 'text-rose-700 dark:text-rose-400'
                                  : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              {isAtivo ? 'Ativo' : isRevogado ? 'Revogado' : c.status}
                            </span>
                            {c.versao_termo && (
                              <span className="text-xs font-mono text-[var(--text-muted)]">v{c.versao_termo}</span>
                            )}
                          </div>
                          {c.registrado_em && (
                            <span className="text-xs font-semibold text-[var(--text-muted)]">
                              {new Date(c.registrado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {c.meio && (
                          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2 font-medium">
                            Meio: <span className="font-semibold">{formatarMeio(c.meio)}</span>
                          </p>
                        )}
                        {isAtivo && (
                          <button
                            onClick={() => handleRevogarConsentimento(c.consentimento_id ?? '')}
                            disabled={revogandoLgpd}
                            className="mt-3 text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {revogandoLgpd ? <RefreshCw className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                            Revogar este consentimento
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Finalidades autorizadas */}
              {isLgpdAtivo && consentimentoAtivo && (
                <div className="mt-2">
                  <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Finalidades autorizadas</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {Object.entries(FINALIDADES_META).map(([key, meta]) => {
                      const Icon = meta.icon
                      const autorizado = (consentimentoAtivo as any)?.finalidades?.[key] ?? false
                      return (
                        <div
                          key={key}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border text-xs ${
                            autorizado
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                              : 'bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border-[var(--border)] opacity-60'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${autorizado ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                          <div>
                            <p className={`font-extrabold ${autorizado ? 'text-emerald-800 dark:text-emerald-300' : 'text-[var(--text-muted)]'}`}>
                              {meta.label}
                            </p>
                            <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-0.5 leading-snug">{meta.descricao}</p>
                          </div>
                          {autorizado ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 ml-auto mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-[var(--border-medium)] shrink-0 ml-auto mt-0.5" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="text-center py-12">
              <Calendar className="h-5 w-5 mx-auto mb-3 text-[var(--text-muted)]" />
              <h4 className="text-[var(--text-primary)] font-bold mb-1 text-base">Nenhum histórico de consultas</h4>
            </div>
          )}

          {activeTab === 'proximo' && (
            <div className="text-center py-12">
              <DollarSign className="h-5 w-5 mx-auto mb-3 text-[var(--primary)]" />
              <h4 className="text-[var(--text-primary)] font-bold mb-1 text-base">Planejamento de Tratamento</h4>
              <button 
                onClick={() => setOrcamentoModalOpen(true)}
                className="mt-4 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-4 py-2 rounded-xl font-bold text-sm"
              >
                Novo Orçamento
              </button>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">Histórico Financeiro</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                    {cobrancas.length === 0 ? 'Nenhuma cobrança' : `${cobrancas.length} cobrança${cobrancas.length > 1 ? 's' : ''} registada${cobrancas.length > 1 ? 's' : ''}`}
                  </p>
                </div>
                <button
                  onClick={() => setCobrancaModalOpen(true)}
                  className="flex items-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-2xl shadow-sm transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Nova Cobrança
                </button>
              </div>

              {loadingCobrancas ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] animate-pulse" />
                  ))}
                </div>
              ) : cobrancas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]">
                  <CreditCard className="h-10 w-10 text-[var(--border-medium)] mb-3" />
                  <p className="text-sm font-bold text-[var(--text-secondary)]">Sem cobranças registadas</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Gere uma cobrança para este paciente.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cobrancas.map(cb => {
                    const isPago = cb.status === 'PAGO'
                    const isCancelado = cb.status === 'CANCELADO'
                    return (
                      <div
                        key={cb.id}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]/70  shadow-[0_1px_6px_-2px_rgba(15,23,42,0.04)] hover:shadow-bento hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPago ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : isCancelado ? 'bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] text-[var(--text-muted)]'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-[var(--text-primary)] truncate">{cb.descricao || 'Cobrança'}</p>
                          <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                            {new Date(cb.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-sm font-black text-[var(--text-primary)]">
                            {Number(cb.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span className={`text-xs font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            isPago ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                              : isCancelado ? 'bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] text-[var(--text-muted)]'
                                : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                          }`}>
                            {isPago ? 'Pago' : isCancelado ? 'Cancelado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {erroCobrancas && (
                <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5" /> {erroCobrancas}
                </p>
              )}
            </div>
          )}

          {activeTab === 'prontuario' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">Evoluções Clínicas</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                    {evolucoes.length === 0 ? 'Nenhuma evolução' : `${evolucoes.length} evolução${evolucoes.length > 1 ? 'ões' : ''} registada${evolucoes.length > 1 ? 's' : ''}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEvolucaoSelecionada(null)
                    setModalAberto(true)
                  }}
                  className="flex items-center gap-2 text-xs font-bold text-[var(--on-primary)] bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] px-4 py-2.5 rounded-2xl  transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" /> Nova Evolução
                </button>
              </div>

              {loadingEvolucoes ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map(i => <EvolucaoSkeleton key={i} />)}
                </div>
              ) : evolucoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]">
                  <ClipboardList className="h-10 w-10 text-[var(--border-medium)] mb-3" />
                  <p className="text-sm font-bold text-[var(--text-secondary)]">Nenhuma evolução registada</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Registe a primeira evolução clínica deste paciente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evolucoes.map(ev => (
                    <div
                      key={ev.id}
                      className="group flex items-start gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]/70  shadow-[0_1px_6px_-2px_rgba(15,23,42,0.04)] hover:shadow-bento hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)] flex items-center justify-center shrink-0 mt-0.5">
                        <ClipboardList className="h-4 w-4 text-[var(--primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-extrabold text-[var(--primary)]">
                            {new Date(ev.data_evolucao + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{ev.descricao}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEvolucaoSelecionada(ev); setModalAberto(true) }}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] hover:bg-[var(--primary-subtle)] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => excluirEvolucao(ev.id)}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {erroEvolucoes && (
                <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5" /> {erroEvolucoes}
                </p>
              )}
            </div>
          )}

          {activeTab === 'odontograma' && (
            <OdontogramaInterativo pacienteId={pacienteId} />
          )}

          {activeTab === 'anamnese' && (
            <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-2xl border p-8 text-center">
              <HeartPulse className="h-10 w-10 text-[var(--primary)] mx-auto mb-4" />
              <button onClick={() => setAnamneseOpen(true)} className="bg-[var(--primary-fill)] text-[var(--on-primary)] px-6 py-3 rounded-xl font-bold text-sm">
                Abrir Ficha de Anamnese
              </button>
            </div>
          )}
        </div>
      </div>

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
        onSuccess={() => setOrcamentoModalOpen(false)}
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
      </div>
    </div>
  )
}