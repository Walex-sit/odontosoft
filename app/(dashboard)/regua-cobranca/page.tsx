'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MessageSquare, Mail, Phone, Clock, CheckCircle2, AlertCircle, Send, Play, Settings, Users, ChevronRight, Zap } from 'lucide-react'

type Canal = 'whatsapp' | 'sms' | 'email'
type StatusEnvio = 'enviado' | 'pendente' | 'falhou'
type TipoRegra = 'lembrete' | 'cobranca' | 'retorno'

interface Regra {
  id: number
  nome: string
  tipo: TipoRegra
  canal: Canal
  antecedencia: string
  mensagem: string
  ativa: boolean
}

interface LogEnvio {
  id: number
  paciente: string
  canal: Canal
  tipo: TipoRegra
  dataEnvio: string
  horario: string
  status: StatusEnvio
}

const REGRAS_INICIAIS: Regra[] = [
  { id: 1, nome: 'Lembrete 24h antes', tipo: 'lembrete', canal: 'whatsapp', antecedencia: '24 horas antes', mensagem: 'Olá {paciente}, sua consulta é amanhã às {horario} na Clínica OdontoSoft. Confirme sua presença respondendo SIM.', ativa: true },
  { id: 2, nome: 'Lembrete 2h antes', tipo: 'lembrete', canal: 'sms', antecedencia: '2 horas antes', mensagem: 'Lembrete: sua consulta é em 2h. Clínica OdontoSoft.', ativa: true },
  { id: 3, nome: 'Cobrança 3 dias atraso', tipo: 'cobranca', canal: 'whatsapp', antecedencia: '3 dias após vencimento', mensagem: 'Olá {paciente}, identificamos um débito de R$ {valor} vencido há 3 dias. Por favor, entre em contato.', ativa: true },
  { id: 4, nome: 'Cobrança 10 dias atraso', tipo: 'cobranca', canal: 'email', antecedencia: '10 dias após vencimento', mensagem: 'Prezado {paciente}, seu débito de R$ {valor} completou 10 dias. Regularize sua situação.', ativa: false },
  { id: 5, nome: 'Convite de Retorno', tipo: 'retorno', canal: 'whatsapp', antecedencia: '6 meses sem consulta', mensagem: 'Olá {paciente}! Faz 6 meses desde sua última visita. Que tal agendar uma consulta de revisão?', ativa: true },
]

const LOG_MOCK: LogEnvio[] = [
  { id: 1, paciente: 'João Silva', canal: 'whatsapp', tipo: 'lembrete', dataEnvio: '02/08/2026', horario: '14:30', status: 'enviado' },
  { id: 2, paciente: 'Maria Fernanda', canal: 'sms', tipo: 'lembrete', dataEnvio: '02/08/2026', horario: '15:00', status: 'enviado' },
  { id: 3, paciente: 'Carlos Petit', canal: 'whatsapp', tipo: 'cobranca', dataEnvio: '01/08/2026', horario: '10:00', status: 'enviado' },
  { id: 4, paciente: 'Ana Souza', canal: 'email', tipo: 'cobranca', dataEnvio: '01/08/2026', horario: '09:15', status: 'falhou' },
  { id: 5, paciente: 'Roberto Lima', canal: 'whatsapp', tipo: 'retorno', dataEnvio: '31/07/2026', horario: '11:00', status: 'enviado' },
]

const CANALICON: Record<Canal, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" />, color: 'text-emerald-600 bg-emerald-50' },
  sms: { label: 'SMS', icon: <Phone className="h-4 w-4" />, color: 'text-blue-600 bg-blue-50' },
  email: { label: 'E-mail', icon: <Mail className="h-4 w-4" />, color: 'text-purple-600 bg-purple-50' },
}

const TIPO_LABEL: Record<TipoRegra, { label: string; color: string }> = {
  lembrete: { label: 'Lembrete de Consulta', color: 'bg-blue-100 text-blue-700' },
  cobranca: { label: 'Cobrança', color: 'bg-red-100 text-red-700' },
  retorno: { label: 'Retorno', color: 'bg-purple-100 text-purple-700' },
}

export default function ReguaCobrancaPage() {
  const [regras, setRegras] = useState<Regra[]>(REGRAS_INICIAIS)
  const [logs] = useState<LogEnvio[]>(LOG_MOCK)
  const [activeTab, setActiveTab] = useState<'regras' | 'logs' | 'inadimplentes'>('regras')
  const [editandoId, setEditandoId] = useState<number | null>(null)

  const toggleRegra = (id: number) => {
    setRegras(prev => prev.map(r => r.id === id ? { ...r, ativa: !r.ativa } : r))
    const regra = regras.find(r => r.id === id)
    toast.success(`Régua "${regra?.nome}" ${regra?.ativa ? 'desativada' : 'ativada'}!`)
  }

  const dispararManual = (nome: string) => {
    toast.success(`📤 Disparo manual da régua "${nome}" iniciado! Verificando elegíveis...`)
  }

  const inadimplentes = [
    { paciente: 'Carlos Petit', valor: 450, diasAtraso: 12, telefone: '(11) 98765-4321' },
    { paciente: 'Fernanda Torres', valor: 280, diasAtraso: 5, telefone: '(11) 91234-5678' },
    { paciente: 'Marcos Antônio', valor: 820, diasAtraso: 31, telefone: '(11) 99876-5432' },
  ]

  const totalPendente = inadimplentes.reduce((acc, i) => acc + i.valor, 0)
  const enviados = logs.filter(l => l.status === 'enviado').length
  const ativos = regras.filter(r => r.ativa).length

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <header className="p-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Régua de Cobrança e Lembretes</h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Automações de comunicação com pacientes via WhatsApp, SMS e E-mail</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit mb-3"><Zap className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{ativos}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Réguas Ativas</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-3"><CheckCircle2 className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{enviados}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Enviados Hoje</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl w-fit mb-3"><AlertCircle className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{inadimplentes.length}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Inadimplentes</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit mb-3"><AlertCircle className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Total Inadimplente</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-1.5 shadow-sm w-fit">
          {([['regras', 'Réguas de Comunicação'], ['logs', 'Log de Envios'], ['inadimplentes', 'Inadimplentes']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950'}`}>{label}</button>
          ))}
        </div>

        {/* Réguas */}
        {activeTab === 'regras' && (
          <div className="space-y-4">
            {regras.map(regra => {
              const canal = CANALICON[regra.canal]
              const tipo = TIPO_LABEL[regra.tipo]
              return (
                <div key={regra.id} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-6 transition-all ${regra.ativa ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">{regra.nome}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tipo.color}`}>{tipo.label}</span>
                        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${canal.color}`}>{canal.icon}{canal.label}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-3"><Clock className="h-3.5 w-3.5 inline mr-1" />{regra.antecedencia}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 font-medium italic">"{regra.mensagem}"</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => dispararManual(regra.nome)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors">
                        <Play className="h-3.5 w-3.5" /> Disparar
                      </button>
                      <button onClick={() => toggleRegra(regra.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${regra.ativa ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        {regra.ativa ? '● Ativa' : '○ Inativa'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Log de envios */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {['Paciente', 'Canal', 'Tipo', 'Data', 'Horário', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(l => {
                    const canal = CANALICON[l.canal]
                    return (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">{l.paciente}</td>
                        <td className="px-5 py-3.5"><span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold ${canal.color}`}>{canal.icon}{canal.label}</span></td>
                        <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIPO_LABEL[l.tipo].color}`}>{TIPO_LABEL[l.tipo].label}</span></td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{l.dataEnvio}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{l.horario}</td>
                        <td className="px-5 py-3.5">
                          <span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold ${l.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : l.status === 'falhou' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {l.status === 'enviado' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inadimplentes */}
        {activeTab === 'inadimplentes' && (
          <div className="space-y-4">
            {inadimplentes.map((p, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    {p.paciente.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{p.paciente}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.telefone} · {p.diasAtraso} dias de atraso</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Valor em aberto</p>
                    <p className="text-xl font-extrabold text-red-600">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toast.success(`📲 Mensagem de cobrança enviada para ${p.paciente} via WhatsApp!`)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors">
                      <MessageSquare className="h-4 w-4" /> WhatsApp
                    </button>
                    <button onClick={() => toast.success(`📧 E-mail de cobrança enviado para ${p.paciente}!`)} className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-colors">
                      <Mail className="h-4 w-4" /> E-mail
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
