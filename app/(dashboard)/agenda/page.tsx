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
} from 'lucide-react'
import NovoAgendamentoModal from '../../components/NovoAgendamentoModal'
import DetalhesAgendamentoModal from '../../components/DetalhesAgendamentoModal'
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
}: {
  ag: any
  onClick: () => void
}) {
  const nome = ag.pacientes?.nome || 'Paciente'
  const status = ag.status || 'agendado'
  const isAtivo = status === 'espera' || status === 'atendido'

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150
        hover:shadow-md hover:-translate-y-px active:scale-[0.99]
        ${isAtivo
          ? 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900/40 shadow-sm'
          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600'
        }
      `}
    >
      {/* Barra de cor lateral por status */}
      <div
        style={{ background: STATUS_CONFIG[status]?.dot ?? '#3b82f6' }}
        className="w-1 self-stretch rounded-full shrink-0"
      />

      {/* Horário */}
      <div className="text-center shrink-0 w-14">
        <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
          {ag.hora_consulta?.slice(0, 5) ?? '--:--'}
        </p>
        {ag.hora_fim && (
          <p className="text-[10px] font-medium text-slate-400 tabular-nums">
            {ag.hora_fim.slice(0, 5)}
          </p>
        )}
      </div>

      {/* Avatar */}
      <Avatar nome={nome} size={42} />

      {/* Informações principais */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{nome}</p>
          {ag.id && (
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
              #{String(ag.id).slice(-5)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {ag.procedimento && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              <Activity size={11} className="shrink-0" />
              {ag.procedimento}
            </span>
          )}
          {ag.dentistas?.nome && (
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 truncate">
              <Stethoscope size={11} className="shrink-0" />
              {ag.dentistas.nome}
            </span>
          )}
        </div>
      </div>

      {/* Coluna direita: status + valor */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StatusPill status={status} />
        {ag.valor_procedimento != null && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Banknote size={12} />
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
    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
      <Avatar nome={nome} size={34} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{nome}</p>
        {ag.procedimento && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{ag.procedimento}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 shrink-0">
        <Timer size={11} />
        <span className="text-[11px] font-bold tabular-nums">{tempo}</span>
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

  // Semana base de referência para o seletor
  const [semanaBase, setSemanaBase] = useState<Date>(() => {
    const hoje = new Date()
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

  const semana = getSemana(semanaBase)

  // ── Carregamento de dados ──────────────────────────────────────────────────

  const carregarDados = useCallback(async () => {
    const clinicaId = profile?.clinica_id
    if (!clinicaId) { setCarregando(false); return }

    setCarregando(true)

    // Pacientes
    const { data: pacs } = await supabase
      .from('pacientes')
      .select('id, nome, telefone, cpf_hash')
      .eq('clinica_id', clinicaId)
    setPacientes(pacs || [])

    // Dentistas
    const { data: dents } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'dentista')
      .eq('clinica_id', clinicaId)
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
    setCarregando(false)
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
    setDiaSelecionado(toLocalDateStr(hoje))
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">

      {/* ── Topbar da Agenda ─────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 md:px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-heading font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
            Agenda
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {labelSemana}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro dentista */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filtroDentista}
              onChange={(e) => setFiltroDentista(e.target.value)}
              className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Todos os Dentistas</option>
              {dentistas.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>

          {/* Filtro status */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <Activity size={13} className="text-slate-400" />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border-0 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Todos os Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => abrirNovoAgendamento()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2 text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus size={14} /> Novo
          </button>
        </div>
      </div>

      {/* ── Seletor de Dias da Semana ────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3">
        {/* Controles de navegação */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={semanaAnterior}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={irParaHoje}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-1"
          >
            Hoje
          </button>
          <button
            onClick={proximaSemana}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7 gap-1.5">
          {semana.map((dia) => {
            const str = toLocalDateStr(dia)
            const isSelected = str === diaSelecionado
            const isToday = str === hoje
            const count = contagemPorDia(dia)

            return (
              <button
                key={str}
                onClick={() => setDiaSelecionado(str)}
                className={`
                  relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95
                  ${isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : isToday
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
              >
                <span className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                  {DIAS_SEMANA[dia.getDay()]}
                </span>
                <span className={`text-base font-extrabold leading-none ${isSelected ? 'text-white' : ''}`}>
                  {dia.getDate()}
                </span>
                {/* Badge de contagem */}
                {count > 0 ? (
                  <span className={`
                    text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
                    ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}
                  `}>
                    {count}
                  </span>
                ) : (
                  <span className="h-4" /> // espaçador
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Corpo Principal: Feed + Sidebar ─────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Feed diário */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header do dia */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-heading font-extrabold text-slate-800 dark:text-slate-100">
                {labelDiaSel}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {agendamentosDoDia.length === 0
                  ? 'Nenhuma consulta agendada'
                  : `${agendamentosDoDia.length} consulta${agendamentosDoDia.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => abrirNovoAgendamento(diaSelecionado)}
              className="hidden md:flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Plus size={13} /> Agendar neste dia
            </button>
          </div>

          {/* Filtros mobile */}
          <div className="flex md:hidden gap-2 mb-4 flex-wrap">
            <select
              value={filtroDentista}
              onChange={(e) => setFiltroDentista(e.target.value)}
              className="flex-1 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Todos os Dentistas</option>
              {dentistas.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="flex-1 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Todos os Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Lista de agendamentos */}
          {carregando ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          ) : agendamentosDoDia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <CalendarDays size={28} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Sem consultas neste dia</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Selecione outro dia ou adicione um novo agendamento.
              </p>
              <button
                onClick={() => abrirNovoAgendamento(diaSelecionado)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
              >
                <Plus size={15} /> Novo Agendamento
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {agendamentosDoDia.map((ag) => (
                <AgendamentoCard
                  key={ag.id}
                  ag={ag}
                  onClick={() => abrirDetalhes(ag)}
                />
              ))}
            </div>
          )}
        </main>

        {/* ── Sidebar: Sala de Espera Ao Vivo ──────────────────── */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  Sala de Espera
                </h3>
              </div>
              {salaDeEspera.length > 0 && (
                <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  {salaDeEspera.length} aguardando
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Atualizado em tempo real
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {salaDeEspera.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Users size={22} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Sala vazia
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Nenhum paciente aguardando
                </p>
              </div>
            ) : (
              <div className="space-y-2">
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
          <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
              Resumo — {labelDiaSel.split(',')[0]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Total', value: agendamentosDoDia.length, icon: CalendarDays, color: 'text-blue-500' },
                { label: 'Espera', value: agendamentosDoDia.filter(a => a.status === 'espera').length, icon: Timer, color: 'text-amber-500' },
                { label: 'Confirmados', value: agendamentosDoDia.filter(a => a.status === 'confirmado').length, icon: Clock, color: 'text-green-500' },
                { label: 'Atendidos', value: agendamentosDoDia.filter(a => a.status === 'atendido').length, icon: Activity, color: 'text-purple-500' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="flex flex-col p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800"
                >
                  <Icon size={13} className={`${color} mb-1`} />
                  <span className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                    {value}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{label}</span>
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
    </div>
  )
}