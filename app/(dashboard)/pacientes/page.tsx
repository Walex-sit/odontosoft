'use client'

/**
 * app/(dashboard)/pacientes/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de gerenciamento de pacientes da clínica OdontoSoft.
 *
 * Segurança (T001):
 *  ✅ Cadastro utiliza Server Action consolidada (createPatient).
 *  ✅ clinica_id não é manipulado ou injetado manualmente no frontend.
 *  ✅ RLS no Supabase garante o isolamento multi-tenant da clínica.
 *
 * UI/UX e Acessibilidade:
 *  ✅ Light Mode refinado com fundo suave (bg-slate-50), cartões e tabelas brancas (bg-white).
 *  ✅ Bordas delicadas (border-slate-200) e tipografia de alto contraste (slate-900 / slate-700).
 *  ✅ Barra de KPIs executivos no topo (Total, Novos este Mês, LGPD Conforme, Contatos Ativos).
 *  ✅ Ações rápidas em cada linha: Marcar Consulta direta, WhatsApp instantâneo, Prontuário e Edição.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/RequireAuth'
import {
  UserPlus, Users, Search, AlertCircle, RefreshCw, X, Edit2,
  CalendarPlus, MessageCircle, FileText, ShieldCheck,
  Sparkles, CheckCircle2, Phone, ArrowUpRight
} from 'lucide-react'
import { toast } from 'sonner'
import EditPatientModal from '@/app/components/EditPatientModal'
import NovoAgendamentoModal from '@/app/components/NovoAgendamentoModal'
import { createPatient, type Paciente as PacienteType } from '@/app/actions/pacientes'
import { getCached, setCached, invalidateCache } from '@/app/lib/cache'

// ─── Helpers de Formatação ────────────────────────────────────────────────────

function iniciais(nome: string) {
  return nome
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function formatarCPF(cpfMascarado: string | null) {
  if (!cpfMascarado) return '—'
  return cpfMascarado
}

function formatarTelefone(tel: string | null) {
  if (!tel) return '—'
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel
}

function formatarNumeroWhatsapp(tel: string | null | undefined) {
  if (!tel) return null
  const d = tel.replace(/\D/g, '')
  if (d.length < 10) return null
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  return `55${d}`
}

// ─── Skeletons de Carregamento ────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-200/80 dark:border-slate-800">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto animate-pulse" />
      </td>
    </tr>
  )
}

function SkeletonMobileCard() {
  return (
    <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-9 w-full bg-slate-100 dark:bg-slate-800/80 rounded-xl animate-pulse" />
    </div>
  )
}

// ─── Error Card ───────────────────────────────────────────────────────────────

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="m-6 bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 dark:bg-red-950/20 dark:border-red-900/40">
      <div className="h-10 w-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center border border-red-200 shrink-0 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-900 dark:text-red-300">Erro ao carregar lista de pacientes</p>
        <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-0.5 break-words">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-4 py-2 rounded-xl transition-all border border-slate-200 shadow-xs shrink-0 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </button>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-xs dark:bg-slate-800 dark:border-slate-700">
        <Users className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      {filtered ? (
        <>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Nenhum resultado encontrado</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Nenhum paciente corresponde ao termo pesquisado.</p>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50"
          >
            Limpar busca
          </button>
        </>
      ) : (
        <>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">Nenhum paciente cadastrado</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Adicione seu primeiro paciente usando o formulário de cadastro rápido acima.</p>
        </>
      )}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Pacientes() {
  const { session, profile } = useAuth()
  const router = useRouter()

  // Form de cadastro rápido
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Lista de pacientes
  const cachedList = getCached<PacienteType[]>('pacientes:lista')
  const [pacientes, setPacientes] = useState<PacienteType[]>(cachedList || [])
  const [carregando, setCarregando] = useState(!cachedList)
  const [erro, setErro] = useState<string | null>(null)

  // Dentistas da clínica para o modal de agendamento direto
  const [dentistas, setDentistas] = useState<{ id: string; nome: string }[]>([])

  // Busca e Filtros
  const [busca, setBusca] = useState('')
  const [filtroLgpd, setFiltroLgpd] = useState<'todos' | 'conforme' | 'pendente'>('todos')

  // Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<PacienteType | null>(null)

  const [isAgendamentoModalOpen, setIsAgendamentoModalOpen] = useState(false)
  const [agendamentoPatientId, setAgendamentoPatientId] = useState<string | undefined>(undefined)

  // ── Carregamento de dados ───────────────────────────────────────────────────

  const carregarPacientes = useCallback(async (forceLoadingState = false) => {
    const cached = getCached<PacienteType[]>('pacientes:lista')
    if (cached && !forceLoadingState) {
      setPacientes(cached)
      setCarregando(false)
    } else if (forceLoadingState || pacientes.length === 0) {
      setCarregando(true)
    }
    setErro(null)

    const { data, error } = await supabase
      .from('pacientes')
      .select('id, clinica_id, nome, telefone, cpf_mascarado, rg, email, data_nascimento, endereco, convenio, lgpd_aceite, lgpd_aceite_em, created_at, user_id, cep, rua, numero, bairro, cidade, genero, whatsapp')
      .order('nome', { ascending: true })

    if (error) {
      console.error('[pacientes] erro ao carregar:', error.message)
      if (!cached) setErro(error.message)
    } else if (data) {
      setCached('pacientes:lista', data, 4 * 60 * 1000)
      setPacientes(data as PacienteType[])
    }

    setCarregando(false)
  }, [pacientes.length])

  // Carregar dentistas para agendamento direto
  const carregarDentistas = useCallback(async () => {
    const clinicaId = profile?.clinica_id
    if (!clinicaId) return

    const { data } = await supabase
      .from('user_profiles')
      .select('id, nome')
      .eq('clinica_id', clinicaId)
      .in('role', ['dentista', 'admin', 'admin_clinica'])

    if (data) {
      setDentistas(data)
    }
  }, [profile?.clinica_id])

  useEffect(() => {
    if (session?.user?.id) {
      carregarPacientes()
      carregarDentistas()
    } else if (session === null) {
      setCarregando(false)
    }
  }, [session, carregarPacientes, carregarDentistas])

  // ── Adição Rápida ───────────────────────────────────────────────────────────

  async function adicionarPaciente() {
    if (!nome.trim() || !session?.user?.id) return
    setSalvando(true)

    // Cadastro Rápido: nasce com conformidade LGPD pendente
    const res = await createPatient({
      nome: nome.trim(),
      lgpd_aceite: false,
      lgpd_aceite_em: null,
      _userId: session.user.id,
      _userNome: profile?.nome,
    })

    if (!res.success) {
      toast.error('Erro ao adicionar paciente: ' + (res.error || 'Erro desconhecido'))
    } else {
      toast.success(`Paciente "${nome.trim()}" cadastrado com sucesso!`)
      setNome('')
      invalidateCache('pacientes')
      carregarPacientes(false)
    }

    setSalvando(false)
  }

  // ── Ações Rápidas por Linha ─────────────────────────────────────────────────

  const handleMarcarConsulta = (p: PacienteType, e: React.MouseEvent) => {
    e.stopPropagation()
    setAgendamentoPatientId(p.id)
    setIsAgendamentoModalOpen(true)
  }

  const handleAbrirProntuario = (p: PacienteType, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/pacientes/${p.id}`)
  }

  const handleEnviarWhatsapp = (p: PacienteType, e: React.MouseEvent) => {
    e.stopPropagation()
    const num = formatarNumeroWhatsapp(p.telefone)

    if (!num) {
      toast.warning(`O paciente "${p.nome}" não possui número de telefone/WhatsApp válido.`, {
        action: {
          label: 'Editar',
          onClick: () => {
            setEditingPatient(p)
            setIsEditModalOpen(true)
          }
        }
      })
      return
    }

    const primeiroNome = p.nome.trim().split(' ')[0]
    const mensagem = encodeURIComponent(`Olá ${primeiroNome}, tudo bem? Aqui é da clínica OdontoSoft. Gostaria de confirmar seu agendamento ou saber se você precisa de algum atendimento.`)
    window.open(`https://wa.me/${num}?text=${mensagem}`, '_blank')
    toast.success(`Abrindo WhatsApp para conversar com ${primeiroNome}...`)
  }

  const handleEditarPaciente = (p: PacienteType, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPatient(p)
    setIsEditModalOpen(true)
  }

  // ── KPIs Resumidos do Topo ──────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total = pacientes.length
    const agora = new Date()
    const mesAtual = agora.getMonth()
    const anoAtual = agora.getFullYear()

    let novosMes = 0
    let lgpdConformeCount = 0
    let comTelefoneCount = 0

    for (const p of pacientes) {
      if (p.created_at) {
        const d = new Date(p.created_at)
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
          novosMes++
        }
      }
      if (p.lgpd_aceite) {
        lgpdConformeCount++
      }
      if (p.telefone && p.telefone.replace(/\D/g, '').length >= 10) {
        comTelefoneCount++
      }
    }

    const taxaLgpd = total > 0 ? Math.round((lgpdConformeCount / total) * 100) : 0

    return {
      total,
      novosMes,
      lgpdConformeCount,
      taxaLgpd,
      comTelefoneCount,
    }
  }, [pacientes])

  // ── Filtragem de Pacientes ──────────────────────────────────────────────────

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return pacientes.filter((p) => {
      const matchTermo =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.cpf_mascarado && p.cpf_mascarado.includes(termo)) ||
        (p.telefone && p.telefone.includes(termo))
      const matchLgpd =
        filtroLgpd === 'todos'
          ? true
          : filtroLgpd === 'conforme'
            ? Boolean(p.lgpd_aceite)
            : !p.lgpd_aceite
      return matchTermo && matchLgpd
    })
  }, [pacientes, busca, filtroLgpd])

  const isFiltered = busca.trim().length > 0 || filtroLgpd !== 'todos'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F8FAFC] dark:bg-[#0B1120] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">

        {/* ── 1. Cabeçalho Principal ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Pacientes
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Gestão clínica completa, conformidade LGPD e ações ágeis de recepção
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => carregarPacientes(true)}
              className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs active:scale-95"
              title="Recarregar pacientes"
            >
              <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── 2. Barra de KPIs Resumidos ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* KPI 1: Total de Pacientes */}
          <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center shrink-0 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40">
                  Base Ativa
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-1">
                {carregando ? '—' : kpis.total}
              </p>
            </div>
          </div>

          {/* KPI 2: Novos este Mês */}
          <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Novos este Mês
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40">
                  Crescimento
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-1">
                {carregando ? '—' : `+${kpis.novosMes}`}
              </p>
            </div>
          </div>

          {/* KPI 3: Conformidade LGPD */}
          <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/70 flex items-center justify-center shrink-0 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-900/60">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  LGPD Conforme
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/70 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/40">
                  {kpis.taxaLgpd}%
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-1">
                {carregando ? '—' : `${kpis.lgpdConformeCount}/${kpis.total}`}
              </p>
            </div>
          </div>

          {/* KPI 4: Contato Ativo (WhatsApp) */}
          <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/70 flex items-center justify-center shrink-0 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/60">
              <Phone className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Contato Cadastrado
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/40">
                  WhatsApp
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-1">
                {carregando ? '—' : kpis.comTelefoneCount}
              </p>
            </div>
          </div>

        </div>

        {/* ── 3. Card de Cadastro Rápido ────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-slate-900 dark:text-slate-50 flex items-center gap-2.5 tracking-tight">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-900/60">
                <UserPlus className="h-4 w-4" />
              </div>
              Cadastro Rápido de Paciente
            </h2>
            <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
              O paciente será inserido de imediato na base com RGPD inicial pendente
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Nome completo do paciente *
              </label>
              <input
                data-testid="input-quick-paciente-nome"
                className="appearance-none block w-full px-4 py-3 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-sm font-semibold transition-all shadow-2xs"
                placeholder="Ex: Dra. Mariana Vasconcelos ou Carlos Eduardo Silveira"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionarPaciente()}
              />
            </div>

            <button
              onClick={adicionarPaciente}
              disabled={salvando || !nome.trim()}
              data-testid="btn-quick-adicionar-paciente"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-2xl transition-all font-bold text-sm h-[46px] shadow-sm shadow-blue-500/25 flex items-center justify-center gap-2 shrink-0 active:scale-95 mb-0.5"
            >
              {salvando ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {salvando ? 'Cadastrando…' : 'Adicionar Paciente'}
            </button>
          </div>
        </div>
        {/* ── 4. Tabela de Pacientes com Ações Rápidas ──────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_2px_14px_-4px_rgba(15,23,42,0.04)] overflow-hidden">

          {/* Barra Superior da Tabela: Título + Filtros + Busca */}
          <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-950/40">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                Base de Pacientes
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {pacientesFiltrados.length} de {pacientes.length} pacientes listados
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              {/* Filtro por LGPD */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setFiltroLgpd('todos')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroLgpd === 'todos'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroLgpd('conforme')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroLgpd === 'conforme'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                >
                  Conformes
                </button>
                <button
                  onClick={() => setFiltroLgpd('pendente')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${filtroLgpd === 'pendente'
                      ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                >
                  Pendentes
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome do paciente…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
                />
                {busca && (
                  <button
                    onClick={() => setBusca('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Error State ── */}
          {erro && <ErrorCard message={erro} onRetry={() => carregarPacientes(true)} />}

          {/* ── Tabela Desktop ── */}
          {!erro && (
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Paciente
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      CPF
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Conformidade
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Cadastro
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Ações Rápidas
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                  {carregando ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : pacientesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState filtered={isFiltered} onClear={() => { setBusca(''); setFiltroLgpd('todos'); }} />
                      </td>
                    </tr>
                  ) : (
                    pacientesFiltrados.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        onClick={(e) => handleAbrirProntuario(p, e)}
                      >
                        {/* Nome + Avatar com Iniciais */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 font-extrabold text-xs shrink-0 shadow-xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60">
                              {iniciais(p.nome)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {p.nome}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                ID: #{p.id.substring(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Telefone */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 font-medium">
                          {formatarTelefone(p.telefone)}
                        </td>

                        {/* CPF mascarado (LGPD) */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 font-medium tracking-wide">
                          {formatarCPF(p.cpf_mascarado)}
                        </td>

                        {/* Status LGPD */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {p.lgpd_aceite ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              Conforme
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pendente
                            </span>
                          )}
                        </td>

                        {/* Data de Cadastro */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 font-medium">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}
                        </td>

                        {/* Ações Rápidas por Linha */}
                        <td
                          className="px-6 py-4 whitespace-nowrap text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">

                            {/* 1. Botão WhatsApp Rápido */}
                            <button
                              onClick={(e) => handleEnviarWhatsapp(p, e)}
                              className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 dark:hover:bg-emerald-900/40"
                              title="Enviar mensagem via WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">WhatsApp</span>
                            </button>

                            {/* 2. Botão Marcar Consulta Direta */}
                            <button
                              onClick={(e) => handleMarcarConsulta(p, e)}
                              className="text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 dark:hover:bg-blue-900/40"
                              title="Agendar consulta direta na agenda"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Agendar</span>
                            </button>

                            {/* 3. Botão Ver Prontuário Completo */}
                            <button
                              onClick={(e) => handleAbrirProntuario(p, e)}
                              className="text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-xs active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                              title="Abrir prontuário odontológico e histórico"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-500" />
                              <span>Prontuário</span>
                            </button>

                            {/* 4. Botão Editar Dados */}
                            <button
                              onClick={(e) => handleEditarPaciente(p, e)}
                              className="text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 p-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                              title="Editar dados cadastrais"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Cards Mobile Enriquecidos ── */}
          {!erro && (
            <div className="md:hidden divide-y divide-slate-200/80 dark:divide-slate-800">
              {carregando ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonMobileCard key={i} />)
              ) : pacientesFiltrados.length === 0 ? (
                <EmptyState filtered={isFiltered} onClear={() => { setBusca(''); setFiltroLgpd('todos'); }} />
              ) : (
                pacientesFiltrados.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-11 w-11 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 font-extrabold text-sm shrink-0 shadow-xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/60">
                        {iniciais(p.nome)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {p.nome}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{formatarTelefone(p.telefone)}</span>
                          <span>·</span>
                          {p.lgpd_aceite ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">✓ LGPD</span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400 font-bold">⚠️ Pendente</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded shrink-0">
                        #{p.id.substring(0, 6)}
                      </span>
                    </div>

                    {/* Ações Rápidas Mobile em Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <button
                        onClick={(e) => handleEnviarWhatsapp(p, e)}
                        className="flex items-center justify-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Zap</span>
                      </button>

                      <button
                        onClick={(e) => handleMarcarConsulta(p, e)}
                        className="flex items-center justify-center gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
                        title="Agendar"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Agendar</span>
                      </button>

                      <button
                        onClick={(e) => handleAbrirProntuario(p, e)}
                        className="flex items-center justify-center gap-1 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                        title="Prontuário"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Ficha</span>
                      </button>

                      <button
                        onClick={(e) => handleEditarPaciente(p, e)}
                        className="flex items-center justify-center gap-1 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span className="text-[11px]">Editar</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Rodapé da Tabela com Resumo */}
          {!carregando && !erro && pacientesFiltrados.length > 0 && (
            <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <p>
                {isFiltered
                  ? `Exibindo ${pacientesFiltrados.length} de ${pacientes.length} pacientes filtrados`
                  : `${pacientes.length} paciente${pacientes.length !== 1 ? 's' : ''} no total`}
              </p>
              {isFiltered && (
                <button
                  onClick={() => { setBusca(''); setFiltroLgpd('todos'); }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ── Modais de Edição e Agendamento ──────────────────────────────────── */}
      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingPatient(null)
        }}
        onSuccess={() => {
          invalidateCache('pacientes')
          carregarPacientes(false)
        }}
        patient={editingPatient}
      />

      <NovoAgendamentoModal
        isOpen={isAgendamentoModalOpen}
        onClose={() => {
          setIsAgendamentoModalOpen(false)
          setAgendamentoPatientId(undefined)
        }}
        onSuccess={() => {
          toast.success('Consulta agendada com sucesso!')
        }}
        pacientes={pacientes}
        dentistas={dentistas}
        initialPatientId={agendamentoPatientId}
      />

    </div>
  )
}