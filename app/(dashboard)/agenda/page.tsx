'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import {
  Filter,
  Users,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Timer,
  Activity,
  CalendarDays,
  Stethoscope,
  Banknote,
  MessageCircle,
  LayoutGrid,
  CalendarCheck,
  Rows3,
} from 'lucide-react'
import NovoAgendamentoModal from '../../components/NovoAgendamentoModal'
import DetalhesAgendamentoModal from '../../components/DetalhesAgendamentoModal'
import LembreteModal from '../../components/LembreteModal'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { toast } from 'sonner'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]
const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

/** Retorna yyyy-MM-dd em horário local sem conversão de timezone */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Retorna os 7 dias da semana (Dom→Sáb) que contém a data passada */
function getSemana(base: Date): Date[] {
  const dow = base.getDay()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() - dow + i)
    return d
  })
}

/** Retorna todos os dias a exibir numa grelha de calendário mensal (inclui dias de meses adjacentes para completar semanas) */
function getDiasDoMes(ano: number, mes: number): Date[] {
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  const startDow = primeiroDia.getDay()
  const endDow = ultimoDia.getDay()
  const dias: Date[] = []
  // Preenche com dias do mês anterior
  for (let i = startDow; i > 0; i--) {
    const d = new Date(ano, mes, 1 - i)
    dias.push(d)
  }
  // Dias do mês corrente
  for (let d = 1; d <= ultimoDia.getDate(); d++) {
    dias.push(new Date(ano, mes, d))
  }
  // Preenche com dias do mês seguinte até completar 6 semanas (42 células)
  const restante = 42 - dias.length
  for (let i = 1; i <= restante; i++) {
    dias.push(new Date(ano, mes + 1, i))
  }
  return dias
}

const MESES_FULL = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

/** Iniciais de até 2 palavras do nome */
function iniciais(nome: string): string {
  const partes = nome.trim().split(' ')
  return partes.length === 1
    ? partes[0].slice(0, 2).toUpperCase()
    : (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/** Gera uma cor de avatar determinística a partir do nome */
const AVATAR_PALETTES = [
  { bg: '#dbeafe', text: '#1d4ed8' }, // blue
  { bg: '#d1fae5', text: '#065f46' }, // green
  { bg: '#ede9fe', text: '#5b21b6' }, // violet
  { bg: '#fce7f3', text: '#9d174d' }, // pink
  { bg: '#fef3c7', text: '#92400e' }, // amber
  { bg: '#cffafe', text: '#0e7490' }, // cyan
  { bg: '#fee2e2', text: '#991b1b' }, // red
  { bg: '#e0e7ff', text: '#3730a3' }, // indigo
]
function avatarColor(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = (hash + nome.charCodeAt(i)) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[hash]
}

// ─── Tipos de status ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  agendado:   { label: 'Agendado',        bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  confirmado: { label: 'Confirmado',      bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  espera:     { label: 'Na Espera',       bg: '#fefce8', text: '#a16207', dot: '#eab308' },
  atendido:   { label: 'Atendido',        bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7' },
  cancelado:  { label: 'Cancelado',       bg: '#fff1f2', text: '#be123c', dot: '#f43f5e' },
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Pílula de status estilizada */
function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['agendado']
  return (
    <span
      style={{ background: cfg.bg, color: cfg.text }}
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide whitespace-nowrap"
    >
      <span style={{ background: cfg.dot }} className="w-1.5 h-1.5 rounded-full shrink-0" />
      {cfg.label}
    </span>
  )
}

/** Avatar com iniciais coloridas */
function Avatar({ nome, size = 40 }: { nome: string; size?: number }) {
  const { bg, text } = avatarColor(nome)
  return (
    <div
      style={{ width: size, height: size, minWidth: size, background: bg, color: text }}
      className="rounded-full flex items-center justify-center font-bold text-sm select-none"
    >
      {iniciais(nome)}
    </div>
  )
}

/** Card horizontal de um agendamento no feed diário */
function AgendamentoCard({
  ag,
  onClick,
  onLembrete,
}: {
  ag: any
  onClick: () => void
  onLembrete?: (e: React.MouseEvent) => void
}) {
  const nome = ag.pacientes?.nome || 'Paciente'
  const status = ag.status || 'agendado'
  const isAtivo = status === 'espera' || status === 'atendido'

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left group flex items-center gap-4 p-4 sm:p-5 rounded-3xl border transition-all duration-200
        hover:shadow-bento hover:-translate-y-0.5 active:scale-[0.99]
        ${isAtivo
          ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/50 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
        }
      `}
    >
      {/* Barra de cor lateral por status */}
      <div
        style={{ background: STATUS_CONFIG[status]?.dot ?? '#3b82f6' }}
        className="w-1.5 self-stretch rounded-full shrink-0 shadow-2xs"
      />

      {/* Horário */}
      <div className="text-center shrink-0 w-14">
        <p className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">
          {ag.hora_consulta?.slice(0, 5) ?? '--:--'}
        </p>
        {ag.hora_fim && (
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums mt-0.5">
            {ag.hora_fim.slice(0, 5)}
          </p>
        )}
      </div>

      {/* Avatar */}
      <Avatar nome={nome} size={42} />

      {/* Informações principais */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {nome}
          </p>
          {ag.id && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
              #{String(ag.id).slice(-5)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
          {ag.procedimento && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50 text-xs font-bold truncate">
              <Activity size={12} className="shrink-0 text-blue-500" />
              {ag.procedimento}
            </span>
          )}
          {ag.dentistas?.nome && (
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 truncate">
              <Stethoscope size={12} className="shrink-0" />
              {ag.dentistas.nome}
            </span>
          )}
        </div>
      </div>

      {/* Coluna direita: status + valor + WhatsApp */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          {ag.pacientes?.telefone && onLembrete && (
            <button
              type="button"
              onClick={onLembrete}
              title="Disparar Lembrete WhatsApp"
              className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors"
            >
              <MessageCircle size={14} />
            </button>
          )}
          <StatusPill status={status} />
        </div>
        {ag.valor_procedimento != null && (
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Banknote size={13} />
            {Number(ag.valor_procedimento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        )}
      </div>
    </button>
  )
}

/** Calcula tempo decorrido em formato legível */
function useTempoDecorrido(dataChegada: string | null) {
  const [label, setLabel] = useState('—')

  useEffect(() => {
    if (!dataChegada) { setLabel('—'); return }

    function atualizar() {
      const diff = Math.floor((Date.now() - new Date(dataChegada!).getTime()) / 1000)
      if (diff < 60) setLabel(`${diff}s`)
      else if (diff < 3600) setLabel(`${Math.floor(diff / 60)}min`)
      else setLabel(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`)
    }
    atualizar()
    const id = setInterval(atualizar, 15_000)
    return () => clearInterval(id)
  }, [dataChegada])

  return label
}

/** Card de paciente na sala de espera */
function EsperaCard({ ag }: { ag: any }) {
  // Usa updated_at como proxy de "hora de chegada" quando espera_desde não existe
  const chegada = ag.espera_desde ?? ag.updated_at ?? null
  const tempo = useTempoDecorrido(chegada)
  const nome = ag.pacientes?.nome || 'Paciente'

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors shadow-2xs">
      <Avatar nome={nome} size={36} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{nome}</p>
        {ag.procedimento && (
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">{ag.procedimento}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 shrink-0 font-bold bg-amber-100/80 dark:bg-amber-900/50 px-2 py-0.5 rounded-lg">
        <Timer size={11} />
        <span className="text-[11px] tabular-nums">{tempo}</span>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Agenda() {
  const { profile } = useAuth()
  const [pacientes, setPacientes] = useState<any[]>([])
  const [dentistas, setDentistas] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Modo de visualização: dia | semana | mes
  const [viewMode, setViewMode] = useState<'dia' | 'semana' | 'mes'>('dia')

  // Semana base de referência para o seletor
  const [semanaBase, setSemanaBase] = useState<Date>(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    return hoje
  })

  // Mês base para o modo calendário
  const [mesBase, setMesBase] = useState<Date>(() => {
    const hoje = new Date()
    hoje.setDate(1)
    hoje.setHours(0, 0, 0, 0)
    return hoje
  })

  // Dia selecionado (string yyyy-MM-dd)
  const [diaSelecionado, setDiaSelecionado] = useState<string>(() => toLocalDateStr(new Date()))

  // Filtros
  const [filtroDentista, setFiltroDentista] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false)
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false)
  const [initialDate, setInitialDate] = useState('')
  const [initialTime, setInitialTime] = useState('')
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null)
  const [lembreteAgendamento, setLembreteAgendamento] = useState<any>(null)

  const semana = getSemana(semanaBase)

  // ── Carregamento de dados ──────────────────────────────────────────────────

  const carregarDados = useCallback(async () => {
    const clinicaId = profile?.clinica_id
    if (!clinicaId) { setCarregando(false); return }

    setCarregando(true)
    setErro(null)

    try {
      // Pacientes
      const { data: pacs, error: pacErr } = await supabase
        .from('pacientes')
        .select('id, nome, telefone, cpf_hash')
        .eq('clinica_id', clinicaId)
      if (pacErr) throw pacErr
      setPacientes(pacs || [])

      // Dentistas
      const { data: dents, error: dentErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'dentista')
        .eq('clinica_id', clinicaId)
      if (dentErr) throw dentErr
      const dentsList = (dents as Array<{ id: string; nome: string }>) || []
      setDentistas(dentsList)

      // Agendamentos (toda a semana visível — filtro de dia é feito no cliente)
      let query = supabase
        .from('agendamentos')
        .select('*, pacientes(nome, telefone), dentistas:user_profiles!dentista_id(nome)')
        .eq('clinica_id', clinicaId)

      if (filtroDentista) query = query.eq('dentista_id', filtroDentista)

      const { data: agendsData, error: agendErr } = await query

      let finalAgends: any[] = []
      if (agendErr) {
        console.warn('Busca com JOIN falhou, executando fallback:', agendErr.message)
        let fbQuery = supabase
          .from('agendamentos')
          .select('*, pacientes(nome, telefone)')
          .eq('clinica_id', clinicaId)
        if (filtroDentista) fbQuery = fbQuery.eq('dentista_id', filtroDentista)
        const { data: fbData } = await fbQuery
        finalAgends = (fbData || []).map((a: any) => {
          const dent = dentsList.find((d) => d.id === (a.dentista_id || a.profissional_id))
          return { ...a, dentistas: dent ? { nome: dent.nome } : null }
        })
      } else {
        finalAgends = ((agendsData as any[]) || []).map((a: any) => {
          if (!a.dentistas) {
            const dent = dentsList.find((d) => d.id === (a.dentista_id || a.profissional_id))
            if (dent) a.dentistas = { nome: dent.nome }
          }
          return a
        })
      }

      setAgendamentos(finalAgends)
    } catch (err: any) {
      console.error('[Agenda] Erro ao carregar dados:', err?.message || err)
      setErro('Não foi possível sincronizar os agendamentos da clínica no momento.')
    } finally {
      setCarregando(false)
    }
  }, [profile?.clinica_id, filtroDentista])

  useEffect(() => { carregarDados() }, [carregarDados])

  // ── Dados derivados ────────────────────────────────────────────────────────

  /** Contagem de agendamentos por dia da semana visível */
  function contagemPorDia(dia: Date): number {
    const str = toLocalDateStr(dia)
    return agendamentos.filter((a) => a.data_consulta === str).length
  }

  /** Agendamentos do dia selecionado, ordenados por hora, com filtro de status */
  const agendamentosDoDia = agendamentos
    .filter((a) => {
      if (a.data_consulta !== diaSelecionado) return false
      if (filtroStatus && a.status !== filtroStatus) return false
      return true
    })
    .sort((a, b) => (a.hora_consulta ?? '').localeCompare(b.hora_consulta ?? ''))

  /** Pacientes na sala de espera (qualquer dia, status espera) */
  const salaDeEspera = agendamentos
    .filter((a) => a.status === 'espera')
    .sort((a, b) => {
      const ta = a.espera_desde ?? a.updated_at ?? ''
      const tb = b.espera_desde ?? b.updated_at ?? ''
      return ta.localeCompare(tb)
    })

  // ── Navegação de semana ────────────────────────────────────────────────────

  function semanaAnterior() {
    setSemanaBase((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
  }
  function proximaSemana() {
    setSemanaBase((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
  }
  function irParaHoje() {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    setSemanaBase(hoje)
    setMesBase(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
    setDiaSelecionado(toLocalDateStr(hoje))
  }

  // ── Navegação de mês ───────────────────────────────────────────────────────

  function mesAnterior() {
    setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  function proximoMes() {
    setMesBase((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  function selecionarDiaDoMes(dia: Date) {
    const str = toLocalDateStr(dia)
    setDiaSelecionado(str)
    setSemanaBase(dia)
    setViewMode('dia')
  }

  // ── Handlers de modal ──────────────────────────────────────────────────────

  function abrirNovoAgendamento(date?: string) {
    setInitialDate(date ?? diaSelecionado)
    setInitialTime('')
    setIsNovoModalOpen(true)
  }

  function abrirDetalhes(ag: any) {
    setAgendamentoSelecionado(ag)
    setIsDetalhesModalOpen(true)
  }

  // ── Label do intervalo da semana ───────────────────────────────────────────
  const primeiroDia = semana[0]
  const ultimoDia = semana[6]
  const labelSemana = `${primeiroDia.getDate()} ${MESES[primeiroDia.getMonth()]} – ${ultimoDia.getDate()} ${MESES[ultimoDia.getMonth()]} ${ultimoDia.getFullYear()}`

  // ── Label do dia selecionado ───────────────────────────────────────────────
  const dataSel = semana.find((d) => toLocalDateStr(d) === diaSelecionado) ?? new Date(diaSelecionado + 'T12:00:00')
  const labelDiaSel = `${DIAS_SEMANA_FULL[dataSel.getDay()]}, ${dataSel.getDate()} de ${MESES[dataSel.getMonth()].charAt(0).toUpperCase() + MESES[dataSel.getMonth()].slice(1)}`

  const hoje = toLocalDateStr(new Date())

  // ─────────────────────────────────────────────────────────────────────────

  // ── Labels do cabeçalho ────────────────────────────────────────────────────
  const labelMes = `${MESES_FULL[mesBase.getMonth()]} ${mesBase.getFullYear()}`

  const headerLabel = viewMode === 'mes'
    ? labelMes
    : viewMode === 'semana'
    ? labelSemana
    : labelDiaSel

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">

      {/* ── Topbar da Agenda ─────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 md:px-8 py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 shadow-2xs">
        <div className="min-w-0">
          <h1 className="text-xl font-heading font-black text-slate-900 dark:text-slate-50 leading-tight tracking-tight">
            Agenda
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
            {headerLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* ── Seletor de Modo de Visualização ── */}
          <div className="hidden sm:flex items-center bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-2xl p-0.5 gap-0.5">
            {([
              { key: 'dia', label: 'Dia', icon: CalendarCheck },
              { key: 'semana', label: 'Semana', icon: Rows3 },
              { key: 'mes', label: 'Mês', icon: LayoutGrid },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  viewMode === key
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Filtro dentista */}
          <div className="hidden md:flex items-center gap-1.5 text-xs bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-2.5 py-1">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filtroDentista}
              onChange={(e) => setFiltroDentista(e.target.value)}
              className="text-xs font-bold bg-transparent border-0 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">Todos os Dentistas</option>
              {dentistas.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>

          {/* Filtro status — só em modo dia */}
          {viewMode === 'dia' && (
            <div className="hidden md:flex items-center gap-1.5 text-xs bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-2.5 py-1">
              <Activity size={13} className="text-slate-400" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="text-xs font-bold bg-transparent border-0 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="">Todos os Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => abrirNovoAgendamento()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-4 py-2 text-xs font-bold shadow-sm shadow-blue-500/25 transition-all active:scale-95"
          >
            <Plus size={14} /> Novo
          </button>
        </div>
      </div>

      {/* ── Sub-header de Navegação (visível apenas nos modos dia e semana) ── */}
      {viewMode !== 'mes' && (
        <div className="shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 px-4 md:px-8 py-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <button
              onClick={semanaAnterior}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={irParaHoje}
              className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline px-1.5 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={proximaSemana}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {semana.map((dia) => {
              const str = toLocalDateStr(dia)
              const isSelected = str === diaSelecionado
              const isToday = str === hoje
              const count = contagemPorDia(dia)
              return (
                <button
                  key={str}
                  onClick={() => {
                    setDiaSelecionado(str)
                    if (viewMode === 'semana') setViewMode('dia')
                  }}
                  className={`
                    relative flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-95
                    ${isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                      : isToday
                        ? 'bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/60'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }
                  `}
                >
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    {DIAS_SEMANA[dia.getDay()]}
                  </span>
                  <span className={`text-base font-black leading-none ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                    {dia.getDate()}
                  </span>
                  {count > 0 ? (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {count}
                    </span>
                  ) : (
                    <span className="h-4" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Corpo Principal ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════════════════════ MODO: MÊS ════════════════════════ */}
        {viewMode === 'mes' && (
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={mesAnterior} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/70 dark:border-slate-800">
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="text-xl font-heading font-black text-slate-900 dark:text-slate-50 tracking-tight min-w-[200px] text-center">
                    {labelMes}
                  </h2>
                  <button onClick={proximoMes} className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/70 dark:border-slate-800">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <button
                  onClick={irParaHoje}
                  className="text-xs font-extrabold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 px-3 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  Hoje
                </button>
              </div>

              {/* Grid cabeçalho dos dias */}
              <div className="grid grid-cols-7 mb-2">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="text-center text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid dos dias do mês */}
              {carregando ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1.5">
                  {getDiasDoMes(mesBase.getFullYear(), mesBase.getMonth()).map((dia, idx) => {
                    const str = toLocalDateStr(dia)
                    const isMesAtual = dia.getMonth() === mesBase.getMonth()
                    const isHoje = str === hoje
                    const isSel = str === diaSelecionado
                    const ags = agendamentos.filter((a) => a.data_consulta === str)
                    const total = ags.length

                    // Agrupa até 3 tipos de status para os dots visuais
                    const statusCounts = ags.reduce((acc: Record<string, number>, a) => {
                      acc[a.status] = (acc[a.status] || 0) + 1
                      return acc
                    }, {})
                    const topStatus = Object.entries(statusCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)

                    return (
                      <button
                        key={`${str}-${idx}`}
                        onClick={() => selecionarDiaDoMes(dia)}
                        className={`
                          group relative flex flex-col min-h-[80px] p-2 rounded-2xl border transition-all duration-150 active:scale-[0.97] text-left
                          ${!isMesAtual ? 'opacity-35' : ''}
                          ${isSel
                            ? 'bg-blue-600 border-blue-500 shadow-md shadow-blue-500/20'
                            : isHoje
                            ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                            : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                          }
                        `}
                      >
                        {/* Número do dia */}
                        <span className={`text-sm font-black leading-none mb-1.5 ${
                          isSel ? 'text-white' : isHoje ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {dia.getDate()}
                        </span>

                        {/* Indicador de consultas */}
                        {total > 0 && (
                          <div className="flex flex-col gap-1 w-full">
                            {/* Badge com total */}
                            <span className={`self-start text-[10px] font-extrabold px-1.5 py-0.5 rounded-lg leading-none ${
                              isSel ? 'bg-blue-500 text-white' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            }`}>
                              {total} {total === 1 ? 'consulta' : 'consultas'}
                            </span>
                            {/* Dots de status */}
                            <div className="flex gap-0.5 flex-wrap mt-0.5">
                              {topStatus.map(([st, ct]) => (
                                <span
                                  key={st}
                                  title={`${STATUS_CONFIG[st]?.label ?? st}: ${ct}`}
                                  style={{ background: STATUS_CONFIG[st]?.dot ?? '#94a3b8' }}
                                  className="w-2 h-2 rounded-full shrink-0"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </main>
        )}

        {/* ════════════════════ MODO: SEMANA ═════════════════════ */}
        {viewMode === 'semana' && (
          <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6">
            <div className="min-w-[640px] max-w-6xl mx-auto">
              {carregando ? (
                <ListSkeleton count={5} />
              ) : erro ? (
                <ErrorState title="Erro ao carregar agenda" message={erro} onRetry={carregarDados} />
              ) : (
                <div className="grid grid-cols-7 gap-3">
                  {semana.map((dia) => {
                    const str = toLocalDateStr(dia)
                    const isHoje = str === hoje
                    const isSel = str === diaSelecionado
                    const ags = agendamentos
                      .filter((a) => a.data_consulta === str && (!filtroDentista || a.dentista_id === filtroDentista))
                      .sort((a, b) => (a.hora_consulta ?? '').localeCompare(b.hora_consulta ?? ''))

                    return (
                      <div key={str} className={`flex flex-col rounded-3xl border overflow-hidden transition-all ${
                        isHoje ? 'border-blue-400 dark:border-blue-600 shadow-md shadow-blue-500/10' : 'border-slate-200/70 dark:border-slate-800'
                      }`}>
                        {/* Cabeçalho do dia */}
                        <div className={`flex flex-col items-center py-3 px-2 ${
                          isSel ? 'bg-blue-600' : isHoje ? 'bg-blue-50/80 dark:bg-blue-950/30' : 'bg-slate-50/70 dark:bg-slate-900/70'
                        }`}>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            isSel ? 'text-blue-200' : isHoje ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {DIAS_SEMANA[dia.getDay()]}
                          </span>
                          <span className={`text-xl font-black leading-tight mt-0.5 ${
                            isSel ? 'text-white' : isHoje ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {dia.getDate()}
                          </span>
                          {ags.length > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                              isSel ? 'bg-blue-500 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {ags.length}
                            </span>
                          )}
                        </div>

                        {/* Cards dos agendamentos */}
                        <div className="flex-1 bg-white dark:bg-slate-900 p-2 space-y-1.5 min-h-[160px]">
                          {ags.length === 0 ? (
                            <div className="flex items-center justify-center h-full min-h-[120px]">
                              <p className="text-[10px] text-slate-300 dark:text-slate-600 font-semibold text-center">
                                Livre
                              </p>
                            </div>
                          ) : (
                            ags.map((ag) => {
                              const st = ag.status || 'agendado'
                              const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG['agendado']
                              return (
                                <button
                                  key={ag.id}
                                  onClick={() => abrirDetalhes(ag)}
                                  className="w-full text-left flex items-start gap-1.5 p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-sm transition-all group"
                                  style={{ background: cfg.bg }}
                                >
                                  <div style={{ background: cfg.dot }} className="w-1 self-stretch rounded-full shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black truncate" style={{ color: cfg.text }}>
                                      {ag.hora_consulta?.slice(0, 5) ?? '--:--'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate leading-tight">
                                      {ag.pacientes?.nome || 'Paciente'}
                                    </p>
                                    {ag.procedimento && (
                                      <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{ag.procedimento}</p>
                                    )}
                                  </div>
                                </button>
                              )
                            })
                          )}
                        </div>

                        {/* Botão adicionar */}
                        <button
                          onClick={() => abrirNovoAgendamento(str)}
                          className="shrink-0 w-full py-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center gap-1"
                        >
                          <Plus size={11} /> Adicionar
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </main>
        )}

        {/* ════════════════════ MODO: DIA ════════════════════════ */}
        {viewMode === 'dia' && (
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto w-full">
            {/* Header do dia */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-heading font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  {labelDiaSel}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {agendamentosDoDia.length === 0
                    ? 'Nenhuma consulta agendada'
                    : `${agendamentosDoDia.length} consulta${agendamentosDoDia.length > 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => abrirNovoAgendamento(diaSelecionado)}
                className="hidden md:flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
              >
                <Plus size={14} /> Agendar neste dia
              </button>
            </div>

            {/* Filtros mobile */}
            <div className="flex md:hidden gap-2 mb-4 flex-wrap">
              <select
                value={filtroDentista}
                onChange={(e) => setFiltroDentista(e.target.value)}
                className="flex-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="">Todos os Dentistas</option>
                {dentistas.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="flex-1 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="">Todos os Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {carregando ? (
              <ListSkeleton count={4} />
            ) : erro ? (
              <ErrorState
                title="Erro ao carregar agenda"
                message={erro}
                onRetry={carregarDados}
              />
            ) : agendamentosDoDia.length === 0 ? (
              <EmptyState
                icon={<CalendarDays size={28} />}
                title="Sem consultas neste dia"
                description="A agenda para este dia está livre. Selecione outro dia ou registre um novo agendamento."
                actionLabel="Novo Agendamento"
                actionIcon={<Plus size={15} />}
                onAction={() => abrirNovoAgendamento(diaSelecionado)}
              />
            ) : (
              <div className="space-y-3">
                {agendamentosDoDia.map((ag) => (
                  <AgendamentoCard
                    key={ag.id}
                    ag={ag}
                    onClick={() => abrirDetalhes(ag)}
                    onLembrete={(e) => {
                      e.stopPropagation()
                      setLembreteAgendamento(ag)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
        )}

        {/* ── Sidebar: Sala de Espera Ao Vivo ──────────────────── */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  Sala de Espera
                </h3>
              </div>
              {salaDeEspera.length > 0 && (
                <span className="text-xs font-bold bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/50">
                  {salaDeEspera.length} aguardando
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
              Painel de recepção em tempo real
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {salaDeEspera.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center mb-3 text-slate-400">
                  <Users size={20} />
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Sala vazia
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Nenhum paciente aguardando
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {salaDeEspera.map((ag) => (
                  <button
                    key={ag.id}
                    onClick={() => abrirDetalhes(ag)}
                    className="w-full text-left"
                  >
                    <EsperaCard ag={ag} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estatísticas rápidas do dia */}
          <div className="shrink-0 p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Resumo — {labelDiaSel.split(',')[0]}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Total', value: agendamentosDoDia.length, icon: CalendarDays, color: 'text-blue-500', bg: 'bg-blue-50/80 dark:bg-blue-950/40' },
                { label: 'Espera', value: agendamentosDoDia.filter(a => a.status === 'espera').length, icon: Timer, color: 'text-amber-500', bg: 'bg-amber-50/80 dark:bg-amber-950/40' },
                { label: 'Confirmados', value: agendamentosDoDia.filter(a => a.status === 'confirmado').length, icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50/80 dark:bg-emerald-950/40' },
                { label: 'Atendidos', value: agendamentosDoDia.filter(a => a.status === 'atendido').length, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50/80 dark:bg-purple-950/40' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="flex flex-col p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 shadow-2xs"
                >
                  <div className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center mb-1.5`}>
                    <Icon size={14} className={color} />
                  </div>
                  <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">
                    {value}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Modais ───────────────────────────────────────────────── */}
      <NovoAgendamentoModal
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onSuccess={carregarDados}
        pacientes={pacientes}
        dentistas={dentistas}
        initialDate={initialDate}
        initialTime={initialTime}
      />

      <DetalhesAgendamentoModal
        isOpen={isDetalhesModalOpen}
        onClose={() => setIsDetalhesModalOpen(false)}
        onSuccess={carregarDados}
        agendamento={agendamentoSelecionado}
      />

      <LembreteModal
        isOpen={!!lembreteAgendamento}
        onClose={() => setLembreteAgendamento(null)}
        agendamento={lembreteAgendamento}
      />
    </div>
  )
}