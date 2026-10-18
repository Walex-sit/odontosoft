'use client'

/**
 * app/(dashboard)/pacientes/[id]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página de detalhes e prontuário do paciente (Painel da Clínica).
 *
 * Segurança (T001):
 *  ✅ Consulta alinhada ao schema LGPD (cpf_hash, cpf_encrypted).
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
  /** CPF protegido por hash e criptografia (LGPD). */
  cpf_hash: string | null
  cpf_encrypted: string | null
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

/** Exibe o CPF mascarado a partir do hash (não expõe o dado real). */
function formatarCPF(cpfHash: string | null) {
  if (!cpfHash) return null
  return `***.***.*${cpfHash.substring(0, 3).toUpperCase()}-**`
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
      .select('id, nome, telefone, cpf_hash, cpf_encrypted, email, created_at, lgpd_aceite, lgpd_aceite_em')
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

        <div className="p-6">
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
                <InfoField label="CPF" value={formatarCPF(paciente.cpf_hash)} />
              </div>
            </div>
          )}

          {activeTab === 'privacidade' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Gestão de Privacidade & Conformidade LGPD
                  </h3>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="text-center py-12">
              <Calendar className="h-5 w-5 mx-auto mb-3 text-slate-400" />
              <h4 className="text-slate-800 dark:text-slate-100 font-bold mb-1 text-base">Nenhum histórico de consultas</h4>
            </div>
          )}

          {activeTab === 'proximo' && (
            <div className="text-center py-12">
              <DollarSign className="h-5 w-5 mx-auto mb-3 text-blue-500" />
              <h4 className="text-slate-800 dark:text-slate-100 font-bold mb-1 text-base">Planejamento de Tratamento</h4>
              <button 
                onClick={() => setOrcamentoModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm"
              >
                Novo Orçamento
              </button>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Histórico Financeiro</h3>
                <button
                  onClick={() => setCobrancaModalOpen(true)}
                  className="flex items-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl"
                >
                  <Plus className="h-4 w-4" /> Gerar Nova Cobrança
                </button>
              </div>
              {cobrancas.length === 0 && (
                <div className="text-center py-12 text-slate-400">Nenhuma cobrança registrada.</div>
              )}
            </div>
          )}

          {activeTab === 'prontuario' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Evoluções Clínicas</h3>
                <button
                  onClick={() => {
                    setEvolucaoSelecionada(null)
                    setModalAberto(true)
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl"
                >
                  <Plus className="h-4 w-4" /> Nova Evolução
                </button>
              </div>
              {evolucoes.length === 0 ? (
                <div className="text-center py-12 text-slate-400">Nenhuma evolução registrada.</div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden space-y-4 p-4">
                  {evolucoes.map(ev => (
                    <div key={ev.id} className="p-4 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-blue-500">{new Date(ev.data_evolucao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{ev.descricao}</p>
                      </div>
                      <button onClick={() => excluirEvolucao(ev.id)} className="text-red-500 hover:text-red-400 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'anamnese' && (
            <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border p-8 text-center">
              <HeartPulse className="h-10 w-10 text-blue-500 mx-auto mb-4" />
              <button onClick={() => setAnamneseOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm">
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
    </>
  )
}