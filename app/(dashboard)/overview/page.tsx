'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Download, FileSpreadsheet, TrendingUp, Users,
  Calendar, Activity, Printer, CalendarDays, ClipboardList,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Package,
  Clock, CheckCircle2, Circle, Banknote,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import {
  fetchDashboardMetrics,
  fetchDashboardCharts,
  fetchDashboardAlerts,
  fetchDashboardComplement,
  type AgendamentoDia,
  type EstoqueCritico,
  type DespesaVencida,
} from '@/app/actions/dashboard'
import { useAuth } from '@/app/components/RequireAuth'
import { useClinica } from '@/app/contexts/ClinicaContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Sparkline decorativa ────────────────────────────────────────────────────
function SparklineCurve({ color = '#10b981', trend = 'up' }: { color?: string; trend?: 'up' | 'down' }) {
  const gradId = `spark-${color.replace('#', '')}-${trend}`
  return (
    <svg className="w-18 h-8 opacity-85 shrink-0" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {trend === 'up' ? (
        <>
          <path d="M0 34 Q 25 32, 45 22 T 75 14 T 100 4 L 100 40 L 0 40 Z" fill={`url(#${gradId})`} />
          <path d="M0 34 Q 25 32, 45 22 T 75 14 T 100 4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M0 8 Q 25 12, 45 22 T 75 28 T 100 36 L 100 40 L 0 40 Z" fill={`url(#${gradId})`} />
          <path d="M0 8 Q 25 12, 45 22 T 75 28 T 100 36" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

// ─── Título de seção discreto ─────────────────────────────────────────────────
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)]">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{description}</p>
      )}
    </div>
  )
}

// ─── Status badge do agendamento ─────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  agendado:   { label: 'Agendado',   color: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/30', icon: <Circle size={10} /> },
  confirmado: { label: 'Confirmado', color: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30', icon: <CheckCircle2 size={10} /> },
  atendido:   { label: 'Atendido',   color: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/30', icon: <CheckCircle2 size={10} /> },
  realizado:  { label: 'Realizado',  color: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30', icon: <CheckCircle2 size={10} /> },
  concluido:  { label: 'Concluído',  color: 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border)]', icon: <CheckCircle2 size={10} /> },
}
function getStatusConf(status: string) {
  return STATUS_CONFIG[status?.toLowerCase()] ?? { label: status, color: 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border)]', icon: <Circle size={10} /> }
}

function formatHora(hora: string) {
  return hora?.slice(0, 5) ?? '--:--'
}

// ─── Bloco: próximos agendamentos do dia ─────────────────────────────────────
function AgendamentosDia({ agendamentos, carregando }: { agendamentos: AgendamentoDia[]; carregando: boolean }) {
  if (carregando) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--border)] animate-pulse" />
        ))}
      </div>
    )
  }
  if (!agendamentos.length) {
    return (
      <div className="flex items-center gap-3 py-4 px-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)]">
        <CalendarDays size={16} className="text-[var(--border-medium)] shrink-0" />
        <span className="text-xs text-[var(--text-muted)] font-medium">Nenhuma consulta agendada para hoje.</span>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {agendamentos.map(a => {
        const sc = getStatusConf(a.status)
        return (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] hover:border-[var(--primary)]/40 dark:hover:border-[var(--primary)]/30 transition-colors">
            {/* Horário */}
            <div className="shrink-0 w-11 text-center">
              <span className="text-sm font-black text-[var(--text-primary)] leading-none">{formatHora(a.hora_consulta)}</span>
            </div>
            <div className="w-px h-7 bg-[var(--border)] dark:bg-[var(--border)] shrink-0" />
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs text-[var(--text-primary)] truncate">{a.paciente_nome}</div>
              {a.procedimento && (
                <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">{a.procedimento}</div>
              )}
            </div>
            {/* Status */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border shrink-0 ${sc.color}`}>
              {sc.icon}
              {sc.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Bloco: alertas rápidos ───────────────────────────────────────────────────
function AlertasRapidos({
  estoque,
  despesas,
  carregando,
  formatCurrency,
}: {
  estoque: EstoqueCritico[]
  despesas: DespesaVencida[]
  carregando: boolean
  formatCurrency: (v: number) => string
}) {
  const total = estoque.length + despesas.length

  if (carregando) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-12 rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--border)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (total === 0) return null   // Sem alertas → não renderiza nada

  return (
    <div className="space-y-2">
      {estoque.map(e => (
        <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
          <Package size={14} className="text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[var(--text-primary)] truncate">{e.nome}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
              Estoque crítico: {e.quantidade} {e.unidade} (mín. {e.minimo})
            </div>
          </div>
          <Link href="/estoque" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 shrink-0 flex items-center gap-0.5 transition-colors">
            Ver <ArrowUpRight size={11} />
          </Link>
        </div>
      ))}

      {despesas.map(d => {
        return (
          <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
            <AlertTriangle size={14} className="text-rose-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">{d.descricao}</div>
              <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                {formatCurrency(d.valor)} · vencida há {d.dias_atraso} {d.dias_atraso === 1 ? 'dia' : 'dias'}
              </div>
            </div>
            <Link href="/financeiro" className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 shrink-0 flex items-center gap-0.5 transition-colors">
              Ver <ArrowUpRight size={11} />
            </Link>
          </div>
        )
      })}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DashboardOverview() {
  const { profile, session } = useAuth()
  const { clinica, isSuperAdminContext, loading: clinicaLoading } = useClinica()
  const router = useRouter()
  const isFinanceiroOrAdmin = profile?.role === 'admin' || profile?.role === 'admin_clinica' || profile?.role === 'financeiro'

  const [imageError, setImageError] = useState(false)

  // Super Admin em modo global → Painel Global
  useEffect(() => {
    if (!clinicaLoading && profile?.role === 'super_admin' && !isSuperAdminContext) {
      router.replace('/admin')
    }
  }, [clinicaLoading, profile?.role, isSuperAdminContext, router])

  const agora = new Date()
  const mesAtualStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualStr)
  const [metrics, setMetrics] = useState<any>(null)
  const [charts, setCharts] = useState<any>(null)
  const [alerts, setAlerts] = useState<{
    agendamentosDia: AgendamentoDia[]
    estoqueCritico: EstoqueCritico[]
    despesasVencidas: DespesaVencida[]
  } | null>(null)
  const [complement, setComplement] = useState<{ despesasMes: number; saldoLiquido: number } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [carregandoAlerts, setCarregandoAlerts] = useState(true)

  // Saudação por horário
  const saudacao = useMemo(() => {
    const hora = new Date().getHours()
    if (hora >= 5 && hora < 12) return 'Bom dia'
    if (hora >= 12 && hora < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  // Nome de exibição limpo
  const displayName = useMemo(() => {
    const rawNome = profile?.nome || session?.user?.user_metadata?.nome || ''
    const cleanNome = rawNome.replace(/^dr\(a\)\.?\s*/i, '').trim()
    if (!cleanNome) return profile?.role === 'dentista' ? 'Doutor(a)' : 'Usuário'
    const isClinicalRole = profile?.role === 'dentista'
    if (/^(dr|dra)\.?\s+/i.test(cleanNome)) {
      return isClinicalRole ? cleanNome : cleanNome.replace(/^(dr|dra)\.?\s+/i, '').trim()
    }
    if (isClinicalRole) {
      const firstName = cleanNome.split(/\s+/)[0].toLowerCase()
      const isFeminine = firstName.endsWith('a') || ['aline','simone','monique','janice','viviane','tatiane','cristiane'].includes(firstName)
      return `${isFeminine ? 'Dra.' : 'Dr.'} ${cleanNome}`
    }
    return cleanNome
  }, [profile?.nome, profile?.role, session?.user?.user_metadata])

  const avatarUrl = useMemo(() => (
    (profile as any)?.avatar_url ||
    (profile as any)?.foto_url ||
    session?.user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.picture ||
    session?.user?.user_metadata?.foto_url ||
    null
  ), [profile, session?.user?.user_metadata])

  const initials = useMemo(() => {
    const rawNome = profile?.nome || session?.user?.user_metadata?.nome || ''
    if (!rawNome.trim()) return 'US'
    const clean = rawNome.replace(/^(dr|dra|dr\(a\))\.\s*/i, '').trim()
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return clean.substring(0, 2).toUpperCase() || 'US'
  }, [profile?.nome, session?.user?.user_metadata])

  const clinicaNome = clinica?.nome_exibido || clinica?.nome || 'Clínica Odontológica'

  const roleDisplayMap: Record<string, { label: string; color: string }> = {
    admin:         { label: 'Administrador Geral',      color: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/30' },
    admin_clinica: { label: 'Administrador da Clínica', color: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/30' },
    dentista:      { label: 'Cirurgião-Dentista',       color: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30' },
    financeiro:    { label: 'Gestor Financeiro',        color: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30' },
    recepcao:      { label: 'Recepção & Atendimento',   color: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/30' },
  }
  const roleInfo = roleDisplayMap[profile?.role || 'dentista'] || {
    label: 'Profissional',
    color: 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border)]',
  }

  const dataExtenso = useMemo(() =>
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
  [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  async function loadData(valorMes: string) {
    setCarregando(true)
    const [ano, mes] = valorMes.split('-').map(Number)
    const [m, c, comp] = await Promise.all([
      fetchDashboardMetrics(ano, mes - 1),
      fetchDashboardCharts(),
      fetchDashboardComplement(ano, mes - 1),
    ])
    if (m.success) setMetrics(m.data)
    if (c.success) setCharts(c.data)
    if (comp.success) setComplement(comp.data)
    setCarregando(false)
  }

  async function loadAlerts() {
    setCarregandoAlerts(true)
    const a = await fetchDashboardAlerts()
    if (a.success) setAlerts(a.data)
    setCarregandoAlerts(false)
  }

  useEffect(() => { loadData(mesSelecionado) }, [mesSelecionado])
  useEffect(() => { loadAlerts() }, [])

  const saldoLiquido = metrics && complement
    ? metrics.faturamentoMensal - complement.despesasMes
    : null

  const handleExportCSV = () => {
    setExportOpen(false)
    if (!charts) return
    const headers = ['Mes', 'Receitas', 'Despesas', 'Lucro']
    const rows = charts.cashFlow.map((item: any) =>
      [item.name, item.receitas, item.despesas, item.receitas - item.despesas].join(',')
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', 'relatorio_financeiro.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => { setExportOpen(false); window.print() }

  // Contagem total de alertas para badge
  const totalAlertas = (alerts?.estoqueCritico.length ?? 0) + (alerts?.despesasVencidas.length ?? 0)

  return (
    <div className="flex flex-col min-h-screen w-full h-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto print:bg-white print:text-[var(--text-primary)]">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-dashboard, #printable-dashboard * { visibility: visible; }
          #printable-dashboard { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 border-b border-[var(--border)] bg-[var(--bg-surface)] shadow-2xs shrink-0 no-print gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
            {isFinanceiroOrAdmin ? 'Dashboard Gerencial' : 'Dashboard Clínico'}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mt-1">
            {isFinanceiroOrAdmin
              ? 'Visão geral do desempenho financeiro e operacional da clínica'
              : 'Resumo diário e atalhos operacionais rápidos'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 bg-[var(--bg-surface)] border border-[var(--border)]/80  rounded-2xl px-3.5 py-2 shadow-2xs transition-all hover:border-[var(--border-medium)] ">
            <span className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Mês:</span>
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs sm:text-sm font-bold text-[var(--text-primary)] cursor-pointer"
            />
          </div>

          {isFinanceiroOrAdmin && (
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all  flex items-center gap-2 active:scale-95"
              >
                <Download size={15} />
                Exportar
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[var(--bg-surface)] border border-[var(--border)]/90  rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                  <button onClick={handleExportPDF} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-hover)] flex items-center gap-3 border-b border-[var(--border)]/80 transition-colors">
                    <Printer size={15} className="text-[var(--text-muted)]" /> Em PDF / Imprimir
                  </button>
                  <button onClick={handleExportCSV} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-hover)] flex items-center gap-3 transition-colors">
                    <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" /> Em Planilha (CSV)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main id="printable-dashboard" className="flex-1 p-6 sm:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-10 sm:gap-12 min-w-0">

        {/* Print header */}
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Relatório Gerencial - OdontoSoft</h1>
          <p className="text-[var(--text-secondary)]">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            SEÇÃO 1 — VISÃO DO DIA
        ════════════════════════════════════════════════════════════════════ */}
        <section aria-label="Visão do Dia">
          <SectionHeader title="Visão do Dia" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Card de boas-vindas (7 col) */}
            <div className="lg:col-span-7 bg-[var(--bg-surface)] rounded-3xl p-6 sm:p-8 border border-[var(--border)] shadow-bento relative overflow-hidden flex flex-col justify-between min-w-0">
              <div className="relative z-10">
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {avatarUrl && !imageError ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        onError={() => setImageError(true)}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[var(--border)]"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--primary-fill)] flex items-center justify-center text-[var(--on-primary)] font-black text-xl sm:text-2xl border-2 border-[var(--border)] shrink-0 select-none">
                        {initials}
                      </div>
                    )}
                    <span title="Profissional conectado ao OdontoSoft" className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--bg-surface)] ring-2 ring-[var(--bg-surface)]">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--success)]" />
                    </span>
                  </div>

                  {/* Saudação */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
                        {saudacao},{' '}
                        <span className="text-[var(--primary)]">{displayName}</span>!
                      </h2>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 font-medium flex items-center gap-2 flex-wrap">
                      <span className="capitalize">{dataExtenso}</span>
                      {clinicaNome && (
                        <>
                          <span className="text-[var(--text-secondary)]">•</span>
                          <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-fill)]" />
                            {clinicaNome}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Links rápidos */}
              <div className="relative z-10 mt-6 pt-5 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[var(--text-secondary)]">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[var(--success-bg)] text-[var(--success)] font-bold border border-[var(--success)]/30">
                    Sistema Operante
                  </span>
                  <span>Isolamento Ativo ({clinicaNome})</span>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/agenda" className="font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 transition-colors">
                    Grade Semanal <ArrowUpRight size={14} />
                  </Link>
                  <Link href="/pacientes" className="font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
                    Buscar Paciente <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Painel do dia: contador + próximos agendamentos (5 col) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Contador compacto */}
              <div className="bg-[var(--bg-surface)] rounded-3xl p-5 border border-[var(--border)] shadow-bento">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-fill)]" />
                    Operacional do Dia
                  </span>
                  <div className="p-2 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30">
                    <CalendarDays size={16} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-3xl font-black text-[var(--text-primary)] tracking-tight leading-none">
                      {carregando ? '...' : metrics?.consultasHoje || 0}
                    </div>
                    <div className="text-xs font-semibold text-[var(--text-secondary)] mt-1">consultas hoje</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                        {metrics?.consultasRealizadasHoje || 0} realizadas
                      </span>
                      <span className="text-[var(--primary)] font-bold">{metrics?.taxaComparecimento || 0}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--primary-fill)] h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(metrics?.taxaComparecimento || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista dos próximos agendamentos */}
              <div className="bg-[var(--bg-surface)] rounded-3xl p-5 border border-[var(--border)] shadow-bento flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Clock size={13} className="text-[var(--text-secondary)]" />
                    Próximas consultas
                  </span>
                  <Link href="/agenda" className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-0.5 transition-colors">
                    Ver agenda <ArrowUpRight size={12} />
                  </Link>
                </div>
                <AgendamentosDia
                  agendamentos={alerts?.agendamentosDia ?? []}
                  carregando={carregandoAlerts}
                />
              </div>
            </div>
          </div>

          {/* Atalhos clínicos para não-financeiros */}
          {!isFinanceiroOrAdmin && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/agenda" className="group bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--primary)]/40 p-5 sm:p-6 rounded-3xl shadow-bento transition-all flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">Operacional</span>
                  <h3 className="font-extrabold text-[var(--text-primary)] text-lg mt-0.5 group-hover:text-[var(--primary)] transition-colors">Acessar Agenda</h3>
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-0.5">Visualize e gerencie consultas do dia</p>
                </div>
                <div className="p-3.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarDays size={22} />
                </div>
              </Link>
              <Link href="/pacientes" className="group bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--primary)]/40 p-5 sm:p-6 rounded-3xl shadow-bento transition-all flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--primary)]">Clínica</span>
                  <h3 className="font-extrabold text-[var(--text-primary)] text-lg mt-0.5 group-hover:text-[var(--primary)] transition-colors">Prontuários e Pacientes</h3>
                  <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-0.5">Histórico clínico e cadastro de pacientes</p>
                </div>
                <div className="p-3.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                  <ClipboardList size={22} />
                </div>
              </Link>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SEÇÃO 2 — INDICADORES PRINCIPAIS
        ════════════════════════════════════════════════════════════════════ */}
        <section aria-label="Indicadores Principais">
          <SectionHeader title="Indicadores Principais" />

          <div className={`grid grid-cols-1 ${profile?.role === 'financeiro' ? 'md:grid-cols-1 lg:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-5`}>

            {/* Faturamento Mensal */}
            {isFinanceiroOrAdmin && (
              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Faturamento Mensal</span>
                  <div className="h-10 w-10 bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20 rounded-2xl flex items-center justify-center shrink-0">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight block">
                      {carregando ? '...' : formatCurrency(metrics?.faturamentoMensal || 0)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${metrics?.faturamentoCrescimento >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50' : 'text-rose-700 bg-rose-50 border-rose-200/70 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50'}`}>
                        {metrics?.faturamentoCrescimento >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {metrics?.faturamentoCrescimento >= 0 ? '+' : ''}{metrics?.faturamentoCrescimento || 0}%
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-muted)]">vs. anterior</span>
                    </div>
                  </div>
                  <SparklineCurve color="#10b981" trend={metrics?.faturamentoCrescimento >= 0 ? 'up' : 'down'} />
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)]/80 text-xs text-[var(--text-muted)]">
                  Mês passado: <strong className="text-[var(--text-secondary)] font-bold">
                    {carregando ? '...' : formatCurrency(metrics?.faturamentoMesAnterior || 0)}
                  </strong>
                </div>
              </div>
            )}

            {/* Saldo Líquido */}
            {isFinanceiroOrAdmin && (
              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Saldo Líquido</span>
                  <div className="h-10 w-10 bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30 rounded-2xl flex items-center justify-center shrink-0">
                    <Banknote size={18} />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className={`text-3xl font-black tracking-tight block ${saldoLiquido === null ? 'text-[var(--text-secondary)]' : saldoLiquido >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
                      {carregando || saldoLiquido === null ? '...' : formatCurrency(saldoLiquido)}
                    </span>
                    <div className="mt-2 text-xs text-[var(--text-secondary)] font-semibold">
                      Despesas: <span className="text-[var(--text-secondary)] font-bold">
                        {carregando ? '...' : formatCurrency(complement?.despesasMes || 0)}
                      </span>
                    </div>
                  </div>
                  <SparklineCurve color="#0F6E7A" trend={saldoLiquido === null || saldoLiquido >= 0 ? 'up' : 'down'} />
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  Receitas − Despesas do mês selecionado
                </div>
              </div>
            )}

            {/* Pacientes Ativos */}
            {profile?.role !== 'financeiro' && (
              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Pacientes Ativos</span>
                  <div className="h-10 w-10 bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30 rounded-2xl flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight block">
                      {carregando ? '...' : (metrics?.pacientesAtivos || 0)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary-subtle)] border border-[var(--primary)]/30 px-2 py-0.5 rounded-lg">
                        +{metrics?.pacientesCrescimento || 0} novos
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">na semana</span>
                    </div>
                  </div>
                  <SparklineCurve color="#0F6E7A" trend="up" />
                </div>
              </div>
            )}

            {/* Consultas Hoje */}
            {profile?.role !== 'financeiro' && (
              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento border border-[var(--border)] flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Consultas Hoje</span>
                  <div className="h-10 w-10 bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30 rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight block">
                      {carregando ? '...' : (metrics?.consultasHoje || 0)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)] font-bold">{metrics?.consultasRealizadasHoje || 0}</strong> concluídas
                      </span>
                    </div>
                  </div>
                  <SparklineCurve color="#0F6E7A" trend="up" />
                </div>
              </div>
            )}

            {/* Taxa de Comparecimento */}
            {profile?.role !== 'financeiro' && (
              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento border border-[var(--border)] flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">Comparecimento</span>
                  <div className="h-10 w-10 bg-[var(--bg-base)] text-[var(--primary)] border border-[var(--border)] rounded-2xl flex items-center justify-center shrink-0">
                    <Activity size={18} />
                  </div>
                </div>
                <div className="mt-auto">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                      {carregando ? '...' : `${metrics?.taxaComparecimento || 0}%`}
                    </span>
                    <span className="text-xs font-bold text-[var(--warning)] bg-[var(--warning-bg)] px-2 py-0.5 rounded-md border border-[var(--warning)]/30">
                      Taxa Mensal
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden mt-3">
                    <div className="bg-[var(--warning)] h-full transition-all duration-500" style={{ width: `${metrics?.taxaComparecimento || 0}%` }} />
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            SEÇÃO 3 — ANÁLISES FINANCEIRAS E OPERACIONAIS
        ════════════════════════════════════════════════════════════════════ */}
        {charts && (
          <section aria-label="Análises Financeiras e Operacionais">
            <SectionHeader title="Análises Financeiras e Operacionais" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

              {/* Fluxo de Caixa */}
              {isFinanceiroOrAdmin && (
                <div className={`${profile?.role === 'financeiro' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-bento`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Fluxo de Caixa Mensal</h3>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mt-0.5">Receitas consolidadas dos últimos 7 meses</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />Receitas
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />Despesas
                        </span>
                      </div>
                      {/* Saldo complementar no gráfico */}
                      {saldoLiquido !== null && !carregando && (
                        <div className="text-xs font-semibold text-[var(--text-muted)]">
                          Saldo líquido:{' '}
                          <span className={`font-black ${saldoLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatCurrency(saldoLiquido)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={charts.cashFlow} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '14px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          formatter={(value: any) => [formatCurrency(value as number), '']}
                        />
                        <Line type="monotone" dataKey="receitas" stroke="#266D44" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 2, fill: '#266D44' }} activeDot={{ r: 7 }} name="Receitas" />
                        <Line type="monotone" dataKey="despesas" stroke="#C0392B" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 2, fill: '#C0392B' }} activeDot={{ r: 7 }} name="Despesas" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Atendimentos por dentista */}
              {profile?.role !== 'financeiro' && (
                <>
                  <div className={`${isFinanceiroOrAdmin ? 'lg:col-span-5' : 'lg:col-span-12'} bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-bento flex flex-col justify-between`}>
                    <div className="mb-4">
                      <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Atendimentos</h3>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mt-0.5">Distribuição por Profissional</p>
                    </div>
                    <div className="flex-1 min-h-[240px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={charts.dentistDistribution} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={4} dataKey="value">
                            {charts.dentistDistribution.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '14px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-[var(--border)]/80">
                      {charts.dentistDistribution.map((d: any) => (
                        <div key={d.name} className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                            <span className="font-semibold text-[var(--text-secondary)]">{d.name}</span>
                          </div>
                          <span className="font-black text-[var(--text-primary)]">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-12 bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-bento">
                    <div className="mb-6">
                      <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Procedimentos Mais Realizados</h3>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mt-0.5">Top tratamentos executados na clínica</p>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={charts.topProcedures} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip contentStyle={{ borderRadius: '14px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} cursor={{ fill: 'var(--bg-hover)' }} />
                          <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Realizados">
                            {charts.topProcedures.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            SEÇÃO 4 — PENDÊNCIAS E ALERTAS
            Renderiza somente se houver alertas reais
        ════════════════════════════════════════════════════════════════════ */}
        {(carregandoAlerts || totalAlertas > 0) && (
          <section aria-label="Pendências e Alertas">
            <SectionHeader
              title="Pendências e Alertas"
              description={totalAlertas > 0 ? `${totalAlertas} ${totalAlertas === 1 ? 'item requer atenção' : 'itens requerem atenção'}` : undefined}
            />

            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)] shadow-bento p-5 sm:p-6">
              <AlertasRapidos
                estoque={alerts?.estoqueCritico ?? []}
                despesas={alerts?.despesasVencidas ?? []}
                carregando={carregandoAlerts}
                formatCurrency={formatCurrency}
              />
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
