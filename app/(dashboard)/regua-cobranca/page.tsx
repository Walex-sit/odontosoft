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
  { id: 1, nome: 'Lembrete 24h antes', tipo: 'lembrete', canal: 'whatsapp', antecedencia: '24 horas antes', mensagem: 'Olá {paciente}, sua consulta é amanhã às {horario} na OdontoSoft. Confirme sua presença respondendo SIM.', ativa: true },
  { id: 2, nome: 'Lembrete 2h antes', tipo: 'lembrete', canal: 'sms', antecedencia: '2 horas antes', mensagem: 'Lembrete: sua consulta é em 2h na OdontoSoft.', ativa: true },
  { id: 3, nome: 'Cobrança 3 dias atraso', tipo: 'cobranca', canal: 'whatsapp', antecedencia: '3 dias após vencimento', mensagem: 'Olá {paciente}, identificamos um débito de R$ {valor} vencido há 3 dias na OdontoSoft. Por favor, entre em contato.', ativa: true },
  { id: 4, nome: 'Cobrança 10 dias atraso', tipo: 'cobranca', canal: 'email', antecedencia: '10 dias após vencimento', mensagem: 'Prezado(a) {paciente}, identificamos uma pendência de R$ {valor} há 10 dias na OdontoSoft. Regularize sua situação.', ativa: false },
  { id: 5, nome: 'Convite de Retorno', tipo: 'retorno', canal: 'whatsapp', antecedencia: '6 meses sem consulta', mensagem: 'Olá {paciente}! Faz 6 meses desde sua última visita à OdontoSoft. Que tal agendar uma consulta de revisão?', ativa: true },
]

// Logs de envio: serão carregados via Supabase (tabela comunicacao_logs) em iteração futura.

const CANALICON: Record<Canal, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: <MessageSquare className="h-4 w-4" />, color: 'text-emerald-600 bg-emerald-50' },
  sms: { label: 'SMS', icon: <Phone className="h-4 w-4" />, color: 'text-[var(--primary)] bg-[var(--primary-subtle)]' },
  email: { label: 'E-mail', icon: <Mail className="h-4 w-4" />, color: 'text-[var(--primary)] bg-[var(--primary-subtle)]' },
}

const TIPO_LABEL: Record<TipoRegra, { label: string; color: string }> = {
  lembrete: { label: 'Lembrete de Consulta', color: 'bg-[var(--primary-subtle)] text-[var(--primary)]' },
  cobranca: { label: 'Cobrança', color: 'bg-red-100 text-red-700' },
  retorno: { label: 'Retorno', color: 'bg-[var(--primary-subtle)] text-[var(--primary)]' },
}

export default function ReguaCobrancaPage() {
  const [regras, setRegras] = useState<Regra[]>(REGRAS_INICIAIS)
  const [logs] = useState<LogEnvio[]>([])
  const [activeTab, setActiveTab] = useState<'regras' | 'logs' | 'inadimplentes'>('regras')
  const [editandoId, setEditandoId] = useState<number | null>(null)

  const toggleRegra = (id: number) => {
    setRegras(prev => prev.map(r => r.id === id ? { ...r, ativa: !r.ativa } : r))
    const regra = regras.find(r => r.id === id)
    toast.success(`Régua "${regra?.nome}" ${regra?.ativa ? 'desativada' : 'ativada'}!`)
  }

  const dispararManual = (nome: string) => {
    toast.info(`[Modo Demonstração] Régua "${nome}": Simulação executada. Nenhuma mensagem real foi enviada (integrações de mensageria externa não configuradas neste ambiente).`)
  }

  // TODO: inadimplentes será carregado do Supabase (query em lancamentos com status='vencido')
  const inadimplentes: { paciente: string; valor: number; diasAtraso: number; telefone: string }[] = []

  const totalPendente = inadimplentes.reduce((acc, i) => acc + i.valor, 0)
  const enviados = logs.filter(l => l.status === 'enviado').length
  const ativos = regras.filter(r => r.ativa).length

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] overflow-y-auto">
      <header className="p-8 bg-[var(--bg-surface)] border-b border-[var(--border)]  shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Régua de Cobrança e Lembretes</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Automações de comunicação com pacientes via WhatsApp, SMS e E-mail</p>
            <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-semibold w-fit">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Ambiente em modo de demonstração: disparos não enviam mensagens externas reais.</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm">
            <div className="p-2.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl w-fit mb-3"><Zap className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{ativos}</p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Réguas Ativas</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-3"><CheckCircle2 className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{enviados}</p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Enviados Hoje</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl w-fit mb-3"><AlertCircle className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{inadimplentes.length}</p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Inadimplentes</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit mb-3"><AlertCircle className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Total Inadimplente</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-1.5 shadow-sm w-fit">
          {([['regras', 'Réguas de Comunicação'], ['logs', 'Log de Envios'], ['inadimplentes', 'Inadimplentes']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)]'}`}>{label}</button>
          ))}
        </div>

        {/* Réguas */}
        {activeTab === 'regras' && (
          <div className="space-y-4">
            {regras.map(regra => {
              const canal = CANALICON[regra.canal]
              const tipo = TIPO_LABEL[regra.tipo]
              return (
                <div key={regra.id} className={`bg-[var(--bg-surface)] rounded-2xl border shadow-sm p-6 transition-all ${regra.ativa ? 'border-[var(--border)] ' : 'border-[var(--border)] opacity-60'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-bold text-[var(--text-primary)]">{regra.nome}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tipo.color}`}>{tipo.label}</span>
                        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${canal.color}`}>{canal.icon}{canal.label}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] font-semibold mb-3"><Clock className="h-3.5 w-3.5 inline mr-1" />{regra.antecedencia}</p>
                      <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-base)] dark:bg-[var(--bg-base)] rounded-xl p-3 font-medium italic">&quot;{regra.mensagem}&quot;</p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => dispararManual(regra.nome)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary-subtle)] text-[var(--primary)] hover:bg-[var(--primary-subtle)] rounded-xl text-xs font-bold transition-colors">
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
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)] ">
                  <tr>
                    {['Paciente', 'Canal', 'Tipo', 'Data', 'Horário', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {logs.map(l => {
                    const canal = CANALICON[l.canal]
                    return (
                      <tr key={l.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors">
                        <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">{l.paciente}</td>
                        <td className="px-5 py-3.5"><span className={`flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-bold ${canal.color}`}>{canal.icon}{canal.label}</span></td>
                        <td className="px-5 py-3.5"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${TIPO_LABEL[l.tipo].color}`}>{TIPO_LABEL[l.tipo].label}</span></td>
                        <td className="px-5 py-3.5 text-[var(--text-muted)]">{l.dataEnvio}</td>
                        <td className="px-5 py-3.5 text-[var(--text-muted)]">{l.horario}</td>
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
              <div key={i} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    {p.paciente.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)]">{p.paciente}</h4>
                    <p className="text-xs text-[var(--text-muted)]">{p.telefone} · {p.diasAtraso} dias de atraso</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">Valor em aberto</p>
                    <p className="text-xl font-extrabold text-red-600">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toast.info(`[Modo Demonstração] Cobrança WhatsApp para ${p.paciente}: Provedor de WhatsApp não configurado.`)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors">
                      <MessageSquare className="h-4 w-4" /> WhatsApp
                    </button>
                    <button onClick={() => toast.info(`[Modo Demonstração] Cobrança E-mail para ${p.paciente}: Provedor de e-mail não configurado.`)} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--primary-subtle)] text-[var(--primary)] hover:bg-[var(--primary-subtle)] rounded-xl text-xs font-bold transition-colors">
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
