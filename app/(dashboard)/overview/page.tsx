'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Download, FileSpreadsheet, TrendingUp, Users, 
  Calendar, Activity, Printer, CalendarDays, ClipboardList 
} from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts'
import { fetchDashboardMetrics, fetchDashboardCharts } from '@/app/actions/dashboard'
import { useAuth } from '@/app/components/RequireAuth'
import { useClinica } from '@/app/contexts/ClinicaContext'
import Link from 'next/link'

export default function DashboardOverview() {
  const { profile, session } = useAuth()
  const { clinica } = useClinica()
  const isFinanceiroOrAdmin = profile?.role === 'admin' || profile?.role === 'admin_clinica' || profile?.role === 'financeiro'

  const [mounted, setMounted] = useState(false)
  const [imageError, setImageError] = useState(false)

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

  // Formatação do Nome: precedido por Dr(a).
  const doctorName = useMemo(() => {
    const rawNome = profile?.nome || session?.user?.user_metadata?.nome || ''
    if (!rawNome.trim()) return 'Dr(a). Profissional'
    const trimmed = rawNome.trim()
    if (/^dr\(a\)\.?\s+/i.test(trimmed) || /^dr\.?\s+/i.test(trimmed) || /^dra\.?\s+/i.test(trimmed)) {
      return trimmed
    }
    return `Dr(a). ${trimmed}`
  }, [profile?.nome, session?.user?.user_metadata])

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
    if (!rawNome) return 'DR'
    const clean = rawNome.replace(/^(dr|dra|dr\(a\))\.\s*/i, '').trim()
    const parts = clean.split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return clean.substring(0, 2).toUpperCase() || 'DR'
  }, [profile?.nome, session?.user?.user_metadata])

  // Nome da clínica para exibição no cabeçalho de boas-vindas
  const clinicaNome = clinica?.nome_exibido || clinica?.nome || 'Clínica Odontológica'

  // Mapeamento visual profissional por perfil / role
  const roleDisplayMap: Record<string, { label: string; color: string }> = {
    admin: {
      label: 'Administrador Geral',
      color: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
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
    <div className="flex flex-col min-h-screen w-full h-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-y-auto print:bg-white print:text-slate-900">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-dashboard, #printable-dashboard * { visibility: visible; }
          #printable-dashboard { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm shrink-0 no-print gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            {isFinanceiroOrAdmin ? 'Dashboard Gerencial' : 'Dashboard Clínico'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {isFinanceiroOrAdmin 
              ? 'Visão geral do desempenho financeiro e operacional da clínica' 
              : 'Resumo diário e atalhos operacionais rápidos'
            }
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mês:</span>
            <input 
              type="month" 
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            />
          </div>
          
          {isFinanceiroOrAdmin && (
            <div className="relative">
              <button 
                onClick={() => setExportOpen(!exportOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                <Download size={16} />
                Exportar
              </button>
              
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 overflow-hidden">
                  <button 
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800"
                  >
                    <Printer size={16} className="text-slate-400" /> Em PDF / Imprimir
                  </button>
                  <button 
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3"
                  >
                    <FileSpreadsheet size={16} className="text-green-600" /> Em Planilha (CSV)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main id="printable-dashboard" className="flex-1 p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 min-w-0">
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Relatório Gerencial - OdontoSaaS</h1>
          <p className="text-slate-600">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* ── Cartão de Boas-Vindas Dinâmico e Personalizado (Dr(a) + Avatar) ── */}
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900/90 dark:to-slate-950 p-6 sm:p-8 shadow-sm">
          {/* Brilho decorativo sutil de fundo */}
          <div
            aria-hidden
            className="absolute -top-16 -right-16 w-72 h-72 bg-gradient-to-br from-blue-400/10 via-cyan-400/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none"
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Bloco Esquerda: Avatar + Saudação + Subtítulo */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              {/* Avatar do Usuário Autenticado com Fallback Elegante */}
              <div className="relative shrink-0">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={doctorName}
                    onError={() => setImageError(true)}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-800 ring-2 ring-blue-500/20"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-md border-2 border-white dark:border-slate-800 ring-2 ring-blue-500/20 shrink-0 select-none">
                    {initials}
                  </div>
                )}
                {/* Status Indicator Live */}
                <span
                  title="Profissional conectado ao OdontoSoft"
                  className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white dark:bg-slate-950 ring-2 ring-white dark:ring-slate-950"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </span>
              </div>

              {/* Textos de Boas-Vindas */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                    {saudacao},{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-cyan-400">
                      {doctorName}
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

            {/* Bloco Direita: Micro-Cards Operacionais e Ação Rápida */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Chip de Consultas Hoje */}
              <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xs">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <CalendarDays size={18} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Consultas Hoje
                  </div>
                  <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-none mt-0.5">
                    {carregando ? '...' : `${metrics?.consultasHoje || 0} agendadas`}
                  </div>
                </div>
              </div>

              {/* Atalho Rápido para Agenda */}
              <Link
                href="/agenda"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all active:scale-95"
              >
                <span>Abrir Agenda</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {!isFinanceiroOrAdmin && (
          <div className="flex gap-4">
            <Link href="/agenda" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-[24px] shadow-sm transition-colors flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Acessar Agenda</h3>
                <p className="text-indigo-200 text-sm">Visualize seus compromissos</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl"><CalendarDays size={24} /></div>
            </Link>
            
            <Link href="/pacientes" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-[24px] shadow-sm transition-colors flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Prontuários e Pacientes</h3>
                <p className="text-emerald-200 text-sm">Acesse o histórico clínico</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl"><ClipboardList size={24} /></div>
            </Link>
          </div>
        )}

        <div className={`grid grid-cols-1 ${profile?.role === 'financeiro' ? 'md:grid-cols-1 lg:grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`}>
          {isFinanceiroOrAdmin && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Faturamento Mensal</h3>
                <div className="p-2 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-xl"><TrendingUp size={18} /></div>
              </div>
              <div className="mt-auto">
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                  {carregando ? '...' : formatCurrency(metrics?.faturamentoMensal || 0)}
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${metrics?.faturamentoCrescimento >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900' : 'text-red-600 bg-red-50 border-red-100 dark:bg-red-950/40 dark:border-red-900'}`}>
                    {metrics?.faturamentoCrescimento >= 0 ? '+' : ''}{metrics?.faturamentoCrescimento || 0}%
                  </span>
                  <span className="text-xs font-semibold text-slate-400">vs. mês anterior</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
                  Mês passado: <strong className="text-slate-700 dark:text-slate-300">
                    {carregando ? '...' : formatCurrency(metrics?.faturamentoMesAnterior || 0)}
                  </strong>
                </div>
              </div>
            </div>
          )}
          
          {profile?.role !== 'financeiro' && (
            <>
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pacientes Ativos</h3>
                  <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl"><Users size={18} /></div>
                </div>
                <div className="mt-auto">
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                    {carregando ? '...' : (metrics?.pacientesAtivos || 0)}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900 px-2 py-0.5 rounded-lg border border-blue-100">
                      +{metrics?.pacientesCrescimento || 0} novos
                    </span>
                    <span className="text-xs font-semibold text-slate-400">na semana</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Consultas Hoje</h3>
                  <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-xl"><Calendar size={18} /></div>
                </div>
                <div className="mt-auto">
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                    {carregando ? '...' : (metrics?.consultasHoje || 0)}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <strong className="text-slate-700 dark:text-slate-200">{metrics?.consultasRealizadasHoje || 0}</strong> realizadas
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comparecimento</h3>
                  <div className="p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl"><Activity size={18} /></div>
                </div>
                <div className="mt-auto">
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                    {carregando ? '...' : `${metrics?.taxaComparecimento || 0}%`}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${metrics?.taxaComparecimento || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {charts && (
          <div className={`grid grid-cols-1 ${profile?.role === 'financeiro' ? 'lg:grid-cols-1' : isFinanceiroOrAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
            {isFinanceiroOrAdmin && (
              <div className={`${profile?.role === 'financeiro' ? 'lg:col-span-1' : 'lg:col-span-2'} bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-sm`}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Fluxo de Caixa Mensal</h3>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Receitas vs Despesas do ano</p>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.cashFlow} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [formatCurrency(value as number), '']}
                      />
                      <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} name="Receitas" />
                      <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} name="Despesas" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {profile?.role !== 'financeiro' && (
              <>
                <div className="lg:col-span-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-sm flex flex-col">
                  <div className="mb-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Atendimentos</h3>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Distribuição por Profissional</p>
                  </div>
                  <div className="flex-1 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={charts.dentistDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {charts.dentistDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    {charts.dentistDistribution.map((d: any) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }}></div>
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${isFinanceiroOrAdmin ? 'lg:col-span-3' : 'lg:col-span-1'} bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-sm`}>
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Procedimentos Mais Realizados</h3>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Top 5 tratamentos executados na clínica</p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={charts.topProcedures} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '16px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
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