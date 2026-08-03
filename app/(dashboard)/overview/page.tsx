'use client'

import { useState, useEffect } from 'react'
import { Search, Bell, Download, FileText, FileSpreadsheet, TrendingUp, Users, Calendar, Activity, Printer } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { fetchDashboardMetrics, fetchDashboardCharts } from '@/app/actions/dashboard'

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<any>(null)
  const [charts, setCharts] = useState<any>(null)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      const [m, c] = await Promise.all([
        fetchDashboardMetrics(),
        fetchDashboardCharts()
      ])
      if (m.success) setMetrics(m.data)
      if (c.success) setCharts(c.data)
    }
    loadData()
  }, [])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Lógica de exportação nativa em CSV
  const handleExportCSV = () => {
    setExportOpen(false)
    if (!charts) return

    // Montando o CSV a partir do fluxo de caixa
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
    // Invoca o método nativo de impressão, que usará @media print para limpar a tela
    window.print()
  }

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 text-slate-800 overflow-y-auto print:bg-white print:text-black">
      {/* Estilos para impressão */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-dashboard, #printable-dashboard * { visibility: visible; }
          #printable-dashboard { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Cabeçalho da Página */}
      <header className="flex items-center justify-between p-8 border-b border-slate-200 bg-white shadow-sm shrink-0 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard Gerencial</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">Visão geral do desempenho da sua clínica</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-72 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <Search size={18} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Buscar pacientes, médicos..." className="bg-transparent border-none focus:outline-none text-sm font-semibold w-full text-slate-700 placeholder-slate-400" />
          </div>
          <button className="relative p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-slate-200 rounded-xl bg-white shadow-sm">
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setExportOpen(!exportOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
            >
              <Download size={16} />
              Exportar
            </button>
            
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <button 
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100"
                >
                  <Printer size={16} className="text-slate-400" /> Em PDF / Imprimir
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                >
                  <FileSpreadsheet size={16} className="text-green-600" /> Em Planilha (CSV)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main id="printable-dashboard" className="flex-1 p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 min-w-0">
        
        <div className="hidden print:block mb-8">
          <h1 className="text-3xl font-extrabold text-black">Relatório Gerencial - OdontoSaaS</h1>
          <p className="text-slate-600">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* Linha 1: KPIs (Métricas Principais) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Mensal</h3>
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><TrendingUp size={18} /></div>
            </div>
            <div className="mt-auto">
              <span className="text-3xl font-extrabold text-slate-800">
                {metrics ? formatCurrency(metrics.faturamentoMensal) : 'R$ 0,00'}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  +{metrics?.faturamentoCrescimento || 0}%
                </span>
                <span className="text-xs font-semibold text-slate-400">vs. mês anterior</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pacientes Ativos</h3>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Users size={18} /></div>
            </div>
            <div className="mt-auto">
              <span className="text-3xl font-extrabold text-slate-800">
                {metrics?.pacientesAtivos || 0}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  +{metrics?.pacientesCrescimento || 0} novos
                </span>
                <span className="text-xs font-semibold text-slate-400">na semana</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consultas Hoje</h3>
              <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Calendar size={18} /></div>
            </div>
            <div className="mt-auto">
              <span className="text-3xl font-extrabold text-slate-800">
                {metrics?.consultasHoje || 0}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-slate-500">
                  <strong className="text-slate-700">{metrics?.consultasRealizadasHoje || 0}</strong> realizadas
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comparecimento</h3>
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Activity size={18} /></div>
            </div>
            <div className="mt-auto">
              <span className="text-3xl font-extrabold text-slate-800">
                {metrics?.taxaComparecimento || 0}%
              </span>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${metrics?.taxaComparecimento || 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Linha 2: Gráficos (Dashboard Interativo) */}
        {charts && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gráfico Principal: Fluxo de Caixa */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Fluxo de Caixa Mensal</h3>
                  <p className="text-sm font-semibold text-slate-500">Receitas vs Despesas do ano</p>
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.cashFlow} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value/1000}k`} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [formatCurrency(value as number), '']}
                    />
                    <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} name="Receitas" />
                    <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} name="Despesas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Atendimentos por Dentista (Pie) */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm flex flex-col">
              <div className="mb-2">
                <h3 className="text-lg font-bold text-slate-800">Atendimentos</h3>
                <p className="text-sm font-semibold text-slate-500">Distribuição por Profissional</p>
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
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 mt-4">
                {charts.dentistDistribution.map((d: any) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }}></div>
                      <span className="text-sm font-semibold text-slate-600">{d.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gráfico 3: Procedimentos (Bar) */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Procedimentos Mais Realizados</h3>
                <p className="text-sm font-semibold text-slate-500">Top 5 tratamentos executados na clínica</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.topProcedures} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f1f5f9' }}
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

          </div>
        )}
      </main>
    </div>
  )
}