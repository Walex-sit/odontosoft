'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Download, FileSpreadsheet, TrendingUp, Users, 
  Calendar, Activity, Printer, CalendarDays, ClipboardList,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts'
import { fetchDashboardMetrics, fetchDashboardCharts } from '@/app/actions/dashboard'
import { useAuth } from '@/app/components/RequireAuth'
import { useClinica } from '@/app/contexts/ClinicaContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

export default function DashboardOverview() {
  const { profile, session } = useAuth()
  const { clinica, isSuperAdminContext, loading: clinicaLoading } = useClinica()
  const router = useRouter()
  const isFinanceiroOrAdmin = profile?.role === 'admin' || profile?.role === 'admin_clinica' || profile?.role === 'financeiro'

  const [mounted, setMounted] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Super Admin em modo global deve ser direcionado ao Painel Global
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
  const [exportOpen, setExportOpen] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Saudação Dinâmica por Horário (Bom dia / Boa tarde / Boa noite)
  const saudacao = useMemo(() => {
    const hora = new Date().getHours()
    if (hora >= 5 && hora < 12) return 'Bom dia'
    if (hora >= 12 && hora < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  // Formatação do Nome para a Mensagem de Boas-Vindas:
  // Remove o prefixo estático "Dr(a)." e aplica "Dr." / "Dra." apenas se o cargo for clinicamente aplicável (ex: dentista)
  const displayName = useMemo(() => {
    const rawNome = profile?.nome || session?.user?.user_metadata?.nome || ''
    // Remove qualquer prefixo estático residual "Dr(a)."
    const cleanNome = rawNome.replace(/^dr\(a\)\.?\s*/i, '').trim()

    if (!cleanNome) {
      return profile?.role === 'dentista' ? 'Doutor(a)' : 'Usuário'
    }

    const isClinicalRole = profile?.role === 'dentista'

    // Se o próprio nome já possuir "Dr." ou "Dra." explicitamente informado
    if (/^(dr|dra)\.?\s+/i.test(cleanNome)) {
      return isClinicalRole ? cleanNome : cleanNome.replace(/^(dr|dra)\.?\s+/i, '').trim()
    }

    // Se o cargo for clinicamente aplicável (dentista), aplica prefixo de tratamento respeitoso
    if (isClinicalRole) {
      const firstName = cleanNome.split(/\s+/)[0].toLowerCase()
      const isFeminine = firstName.endsWith('a') || (firstName.endsWith('e') && ['aline', 'simone', 'monique', 'janice', 'viviane', 'tatiane', 'cristiane'].includes(firstName))
      const prefix = isFeminine ? 'Dra.' : 'Dr.'
      return `${prefix} ${cleanNome}`
    }

    // Para todos os outros cargos (admin, admin_clinica, financeiro, recepcao, etc.): exibe puramente o nome do usuário!
    return cleanNome
  }, [profile?.nome, profile?.role, session?.user?.user_metadata])

  // Foto de perfil do usuário (user_profiles ou Supabase Auth)
  const avatarUrl = useMemo(() => {
    return (
      (profile as any)?.avatar_url ||
      (profile as any)?.foto_url ||
      session?.user?.user_metadata?.avatar_url ||
      session?.user?.user_metadata?.picture ||
      session?.user?.user_metadata?.foto_url ||
      null
    )
  }, [profile, session?.user?.user_metadata])

  // Iniciais elegantes de fallback
  const initials = useMemo(() => {
    const rawNome = profile?.nome || session?.user?.user_metadata?.nome || ''
    if (!rawNome.trim()) return 'US'
    const clean = rawNome.replace(/^(dr|dra|dr\(a\))\.\s*/i, '').trim()
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return clean.substring(0, 2).toUpperCase() || 'US'
  }, [profile?.nome, session?.user?.user_metadata])

  // Nome da clínica para exibição no cabeçalho de boas-vindas
  const clinicaNome = clinica?.nome_exibido || clinica?.nome || 'Clínica Odontológica'

  // Mapeamento visual profissional por perfil / role (Paleta Oficial OdontoSoft)
  const roleDisplayMap: Record<string, { label: string; color: string }> = {
    admin: {
      label: 'Administrador Geral',
      color: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    },
    admin_clinica: {
      label: 'Administrador da Clínica',
      color: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    },
    dentista: {
      label: 'Cirurgião-Dentista',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    },
    financeiro: {
      label: 'Gestor Financeiro',
      color: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    },
    recepcao: {
      label: 'Recepção & Atendimento',
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    },
  }
  const roleInfo = roleDisplayMap[profile?.role || 'dentista'] || {
    label: 'Profissional',
    color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }

  // Data por extenso em Português
  const dataExtenso = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
  }, [])

  async function loadData(valorMes: string) {
    setCarregando(true)
    const [ano, mes] = valorMes.split('-').map(Number)

    const [m, c] = await Promise.all([
      fetchDashboardMetrics(ano, mes - 1),
      fetchDashboardCharts()
    ])
    if (m.success) setMetrics(m.data)
    if (c.success) setCharts(c.data)
    setCarregando(false)
  }

  useEffect(() => {
    loadData(mesSelecionado)
  }, [mesSelecionado])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handleExportCSV = () => {
    setExportOpen(false)
    if (!charts) return

    const headers = ['Mes', 'Receitas', 'Despesas', 'Lucro']
    const rows = charts.cashFlow.map((item: any) => 
      [item.name, item.receitas, item.despesas, item.receitas - item.despesas].join(',')
    )
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'relatorio_financeiro.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    setExportOpen(false)
    window.print()
  }

  return (
    <div className="flex flex-col min-h-screen w-full h-full bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 overflow-y-auto print:bg-white print:text-slate-900">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-dashboard, #printable-dashboard * { visibility: visible; }
          #printable-dashboard { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md shadow-2xs shrink-0 no-print gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            {isFinanceiroOrAdmin ? 'Dashboard Gerencial' : 'Dashboard Clínico'}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {isFinanceiroOrAdmin 
              ? 'Visão geral do desempenho financeiro e operacional da clínica' 
              : 'Resumo diário e atalhos operacionais rápidos'
            }
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-3.5 py-2 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mês:</span>
            <input 
              type="month" 
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
            />
          </div>
          
          {isFinanceiroOrAdmin && (
            <div className="relative">
              <button 
                onClick={() => setExportOpen(!exportOpen)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm shadow-blue-500/25 flex items-center gap-2 active:scale-95"
              >
                <Download size={15} />
                Exportar
              </button>
              
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                  <button 
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 transition-colors"
                  >
                    <Printer size={15} className="text-slate-400" /> Em PDF / Imprimir
                  </button>
                  <button 
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-3 transition-colors"
                  >
                    <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" /> Em Planilha (CSV)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main id="printable-dashboard" className="flex-1 p-6 sm:p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-6 sm:gap-8 min-w-0">
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Relatório Gerencial - OdontoSaaS</h1>
          <p className="text-slate-600">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* ── BENTO GRID ASSIMÉTRICO (HERO 7x5: IDENTIDADE CLÍNICA + PAINEL DO DIA) ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card Principal de Destaque (7 Colunas): Boas-Vindas & Identidade Clínica */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col justify-between min-w-0">
            {/* Brilho decorativo sutil em azul corporativo translúcido */}
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-72 h-72 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl pointer-events-none"
            />

            <div className="relative z-10">
              <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                {/* Avatar com Anel Azul Corporativo e Indicador de Presença Ativa */}
                <div className="relative shrink-0">
                  {avatarUrl && !imageError ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      onError={() => setImageError(true)}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-sm border-2 border-white dark:border-slate-800 ring-2 ring-blue-500/20"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-sm border-2 border-white dark:border-slate-800 ring-2 ring-blue-500/20 shrink-0 select-none">
                      {initials}
                    </div>
                  )}
                  {/* Status Indicator Live */}
                  <span
                    title="Profissional conectado ao OdontoSoft"
                    className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-2 ring-white dark:ring-slate-900"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </span>
                </div>

                {/* Saudação e Papel */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                      {saudacao},{' '}
                      <span className="text-blue-600 dark:text-blue-400">
                        {displayName}
                      </span>
                      !
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium flex items-center gap-2 flex-wrap">
                    <span className="capitalize">{dataExtenso}</span>
                    {clinicaNome && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {clinicaNome}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Pílulas de Contexto Operacional Inferior */}
            <div className="relative z-10 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                  Sistema Operante
                </span>
                <span>Isolamento Ativo ({clinicaNome})</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/agenda"
                  className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  Grade Semanal
                  <ArrowUpRight size={14} />
                </Link>
                <Link
                  href="/pacientes"
                  className="font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                  Buscar Paciente
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Painel Operacional Lateral (5 Colunas): Painel do Dia em Branco Puro */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between relative overflow-hidden group">
            <div className="flex flex-col h-full justify-between gap-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Operacional do Dia
                </span>
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                  <CalendarDays size={18} />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Consultas Agendadas Hoje</div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-1 flex items-baseline gap-2">
                  {carregando ? '...' : metrics?.consultasHoje || 0}
                  <span className="text-sm font-semibold text-slate-400">pacientes</span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {metrics?.consultasRealizadasHoje || 0} realizadas
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{metrics?.taxaComparecimento || 0}% presenças</span>
                </div>

                {/* Micro barra de progresso diária no azul corporativo */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-700" 
                    style={{ width: `${Math.min(metrics?.taxaComparecimento || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <Link
                  href="/agenda"
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-2xl text-xs sm:text-sm shadow-sm shadow-blue-500/25 transition-all active:scale-95"
                >
                  <span>Acessar Agenda Completa</span>
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {!isFinanceiroOrAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Link 
              href="/agenda" 
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-300 dark:hover:border-blue-700/60 p-5 sm:p-6 rounded-3xl shadow-bento hover:shadow-md transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">Operacional</span>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg mt-0.5 group-hover:text-blue-600 transition-colors">Acessar Agenda</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Visualize e gerencie consultas do dia</p>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                <CalendarDays size={22} />
              </div>
            </Link>
            
            <Link 
              href="/pacientes" 
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-300 dark:hover:border-emerald-700/60 p-5 sm:p-6 rounded-3xl shadow-bento hover:shadow-md transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Clínica</span>
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg mt-0.5 group-hover:text-emerald-600 transition-colors">Prontuários e Pacientes</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Histórico clínico e cadastro de pacientes</p>
              </div>
              <div className="p-3.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList size={22} />
              </div>
            </Link>
          </div>
        )}

        {/* ── BENTO MOSAIC METRIC CARDS COM SPARKLINES ── */}
        <div className={`grid grid-cols-1 ${profile?.role === 'financeiro' ? 'md:grid-cols-1 lg:grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4'} gap-5 sm:gap-6`}>
          {isFinanceiroOrAdmin && (
            <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Faturamento Mensal</span>
                <div className="h-10 w-10 bg-emerald-50 text-emerald-600 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 rounded-2xl flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
              </div>
              
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight block">
                    {carregando ? '...' : formatCurrency(metrics?.faturamentoMensal || 0)}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${metrics?.faturamentoCrescimento >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200/70 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50' : 'text-rose-700 bg-rose-50 border-rose-200/70 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50'}`}>
                      {metrics?.faturamentoCrescimento >= 0 ? '+' : ''}{metrics?.faturamentoCrescimento || 0}%
                    </span>
                    <span className="text-xs font-semibold text-slate-400">vs. anterior</span>
                  </div>
                </div>
                <SparklineCurve color="#10b981" trend={metrics?.faturamentoCrescimento >= 0 ? 'up' : 'down'} />
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                Mês passado: <strong className="text-slate-700 dark:text-slate-200 font-bold">
                  {carregando ? '...' : formatCurrency(metrics?.faturamentoMesAnterior || 0)}
                </strong>
              </div>
            </div>
          )}
          
          {profile?.role !== 'financeiro' && (
            <>
              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-bento flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pacientes Ativos</span>
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 rounded-2xl flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                </div>
                
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight block">
                      {carregando ? '...' : (metrics?.pacientesAtivos || 0)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50 px-2 py-0.5 rounded-lg">
                        +{metrics?.pacientesCrescimento || 0} novos
                      </span>
                      <span className="text-xs font-semibold text-slate-400">na semana</span>
                    </div>
                  </div>
                  <SparklineCurve color="#3b82f6" trend="up" />
                </div>
              </div>

              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Consultas Hoje</span>
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60 rounded-2xl flex items-center justify-center shrink-0">
                    <Calendar size={18} />
                  </div>
                </div>
                
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight block">
                      {carregando ? '...' : (metrics?.consultasHoje || 0)}
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200 font-bold">{metrics?.consultasRealizadasHoje || 0}</strong> concluídas
                      </span>
                    </div>
                  </div>
                  <SparklineCurve color="#2563eb" trend="up" />
                </div>
              </div>

              <div className="bento-card bento-card-interactive p-6 rounded-3xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Comparecimento</span>
                  <div className="h-10 w-10 bg-amber-50 text-amber-600 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 rounded-2xl flex items-center justify-center shrink-0">
                    <Activity size={18} />
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                      {carregando ? '...' : `${metrics?.taxaComparecimento || 0}%`}
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
                      Taxa Mensal
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-500" style={{ width: `${metrics?.taxaComparecimento || 0}%` }}></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── BENTO MOSAIC ASSIMÉTRICO DE GRÁFICOS (7x5: FLUXO DE CAIXA + ATENDIMENTOS) ── */}
        {charts && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {isFinanceiroOrAdmin && (
              <div className={`${profile?.role === 'financeiro' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Fluxo de Caixa Mensal</h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Receitas vs Despesas consolidadas do ano</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Receitas
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Despesas
                    </span>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.cashFlow} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.12} vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '18px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4)' }}
                        formatter={(value: any) => [formatCurrency(value as number), '']}
                      />
                      <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 2, fill: '#10b981' }} activeDot={{ r: 7 }} name="Receitas" />
                      <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 2, fill: '#ef4444' }} activeDot={{ r: 7 }} name="Despesas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {profile?.role !== 'financeiro' && (
              <>
                <div className={`${isFinanceiroOrAdmin ? 'lg:col-span-5' : 'lg:col-span-12'} bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between`}>
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Atendimentos</h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Distribuição por Profissional</p>
                  </div>
                  <div className="flex-1 min-h-[240px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts.dentistDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {charts.dentistDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '18px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    {charts.dentistDistribution.map((d: any) => (
                      <div key={d.name} className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }}></div>
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{d.name}</span>
                        </div>
                        <span className="font-black text-slate-900 dark:text-slate-100">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
                  <div className="mb-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Procedimentos Mais Realizados</h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Top 5 tratamentos executados na clínica</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.topProcedures} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.12} vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '18px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4)' }}
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        />
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
        )}
      </main>
    </div>
  )
}