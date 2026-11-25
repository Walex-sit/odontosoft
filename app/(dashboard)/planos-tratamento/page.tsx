'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Calendar, CheckCircle2, Clock, Plus, ChevronRight, DollarSign, Users, Target, X, AlertCircle } from 'lucide-react'

type StatusPlano = 'ativo' | 'concluido' | 'cancelado' | 'pausado'
type StatusSessao = 'realizada' | 'agendada' | 'pendente' | 'faltou'

interface Sessao {
  id: number
  numero: number
  descricao: string
  data: string
  status: StatusSessao
  valorParcela: number
  parcelaPaga: boolean
}

interface PlanoTratamento {
  id: number
  paciente: string
  tipo: string
  dentista: string
  valorTotal: number
  sessaoTotal: number
  sessoes: Sessao[]
  status: StatusPlano
  dataInicio: string
  dataFim: string
}

// TODO: Planos de tratamento serão carregados do Supabase (tabelas planos_tratamento + sessoes).

const STATUS_PLANO_CONFIG: Record<StatusPlano, { label: string; bg: string; text: string }> = {
  ativo: { label: 'Ativo', bg: 'bg-[var(--primary-subtle)]', text: 'text-[var(--primary)]' },
  concluido: { label: 'Concluído', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700' },
  pausado: { label: 'Pausado', bg: 'bg-amber-100', text: 'text-amber-700' },
}

const STATUS_SESSAO_CONFIG: Record<StatusSessao, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  realizada: { label: 'Realizada', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 className="h-4 w-4" /> },
  agendada: { label: 'Agendada', bg: 'bg-[var(--primary-subtle)]', text: 'text-[var(--primary)]', icon: <Calendar className="h-4 w-4" /> },
  pendente: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="h-4 w-4" /> },
  faltou: { label: 'Faltou', bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="h-4 w-4" /> },
}

export default function PlanosTratamentoPage() {
  const [planos, setPlanos] = useState<PlanoTratamento[]>([])
  const [selectedPlano, setSelectedPlano] = useState<number | null>(null)
  const [novoModal, setNovoModal] = useState(false)
  const [novoPlano, setNovoPlano] = useState({ paciente: '', tipo: '', dentista: '', valorTotal: 0, sessaoTotal: 1, dataInicio: '', dataFim: '' })

  const planoAtivo = planos.find(p => p.id === selectedPlano)

  const totalAtivos = planos.filter(p => p.status === 'ativo').length
  const totalRecebido = planos.flatMap(p => p.sessoes).filter(s => s.parcelaPaga).reduce((acc, s) => acc + s.valorParcela, 0)
  const totalPendente = planos.flatMap(p => p.sessoes.map(s => ({ ...s, planoStatus: p.status }))).filter(s => !s.parcelaPaga && s.planoStatus === 'ativo').reduce((acc, s) => acc + s.valorParcela, 0)

  const getProgresso = (plano: PlanoTratamento) => {
    const realizadas = plano.sessoes.filter(s => s.status === 'realizada').length
    return Math.round((realizadas / plano.sessaoTotal) * 100)
  }

  const marcarPago = (planoId: number, sessaoId: number) => {
    setPlanos(prev => prev.map(p => p.id !== planoId ? p : {
      ...p,
      sessoes: p.sessoes.map(s => s.id !== sessaoId ? s : { ...s, parcelaPaga: !s.parcelaPaga })
    }))
    toast.success('Status da parcela atualizado!')
  }

  const criarPlano = () => {
    if (!novoPlano.paciente || !novoPlano.tipo) { toast.error('Preencha ao menos paciente e tipo.'); return }
    const sessoesGeradas: Sessao[] = Array.from({ length: novoPlano.sessaoTotal }, (_, i) => ({
      id: Date.now() + i, numero: i + 1, descricao: `Sessão ${i + 1}`, data: '',
      status: 'pendente', valorParcela: novoPlano.valorTotal / novoPlano.sessaoTotal, parcelaPaga: false
    }))
    setPlanos(prev => [...prev, { ...novoPlano, id: Date.now(), status: 'ativo', sessoes: sessoesGeradas }])
    toast.success(`Plano de tratamento criado para ${novoPlano.paciente}!`)
    setNovoModal(false)
    setNovoPlano({ paciente: '', tipo: '', dentista: '', valorTotal: 0, sessaoTotal: 1, dataInicio: '', dataFim: '' })
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] overflow-y-auto">
      <header className="p-8 bg-[var(--bg-surface)] border-b border-[var(--border)]  shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Planos de Tratamento</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Gestão de pacotes e tratamentos de longa duração por sessões ou parcelas</p>
          </div>
          <button onClick={() => setNovoModal(true)} className="flex items-center gap-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Novo Plano
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Planos Ativos', value: totalAtivos, icon: Target, color: 'blue' },
            { label: 'Total de Planos', value: planos.length, icon: Users, color: 'slate' },
            { label: 'Recebido (Parcelas)', value: `R$ ${totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: CheckCircle2, color: 'emerald' },
            { label: 'A Receber', value: `R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'amber' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm">
              <div className={`p-2.5 bg-${color}-50 text-${color}-600 rounded-xl w-fit mb-3`}><Icon className="h-5 w-5" /></div>
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">{value}</p>
              <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Planos List */}
        <div className={`grid gap-6 ${selectedPlano ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Lista de Planos */}
          <div className="space-y-4">
            {planos.map(plano => {
              const prog = getProgresso(plano)
              const st = STATUS_PLANO_CONFIG[plano.status]
              const parcelasPagas = plano.sessoes.filter(s => s.parcelaPaga).length
              return (
                <div key={plano.id} onClick={() => setSelectedPlano(selectedPlano === plano.id ? null : plano.id)}
                  className={`bg-[var(--bg-surface)] rounded-2xl border shadow-sm p-6 cursor-pointer transition-all ${selectedPlano === plano.id ? 'border-[var(--primary)]/40 ring-2 ring-[var(--primary)]/20' : 'border-[var(--border)]  hover:border-[var(--primary)]/40'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">{plano.paciente}</h3>
                      <p className="text-sm text-[var(--text-muted)]">{plano.tipo} · {plano.dentista}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                      <ChevronRight className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${selectedPlano === plano.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mb-3 flex-wrap">
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-muted)]">Valor Total</p>
                      <p className="font-extrabold text-[var(--text-primary)]">R$ {plano.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Sessões</p>
                      <p className="font-extrabold text-[var(--text-primary)]">{plano.sessoes.filter(s => s.status === 'realizada').length}/{plano.sessaoTotal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Parcelas</p>
                      <p className="font-extrabold text-[var(--text-primary)]">{parcelasPagas}/{plano.sessoes.length} pagas</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">Período</p>
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">{plano.dataInicio} → {plano.dataFim}</p>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full bg-[var(--bg-base)] rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${plano.status === 'concluido' ? 'bg-emerald-500' : 'bg-[var(--primary-fill)]'}`} style={{ width: `${prog}%` }} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 font-semibold">{prog}% concluído</p>
                </div>
              )
            })}
          </div>

          {/* Detalhe do Plano */}
          {planoAtivo && (
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  shadow-sm overflow-hidden h-fit">
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)]">Sessões — {planoAtivo.paciente}</h3>
                <button onClick={() => setSelectedPlano(null)} className="p-1.5 hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-lg"><X className="h-4 w-4 text-[var(--text-muted)]" /></button>
              </div>
              <div className="divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
                {planoAtivo.sessoes.map(sessao => {
                  const st = STATUS_SESSAO_CONFIG[sessao.status]
                  return (
                    <div key={sessao.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${st.bg} ${st.text}`}>{st.icon}</div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Sessão {sessao.numero}</p>
                          <p className="text-xs text-[var(--text-muted)]">{sessao.descricao}{sessao.data ? ` · ${sessao.data}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-[var(--text-secondary)]">R$ {sessao.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className={`text-xs font-bold ${sessao.parcelaPaga ? 'text-emerald-600' : 'text-amber-600'}`}>{sessao.parcelaPaga ? 'Pago' : 'Pendente'}</p>
                        </div>
                        <button onClick={() => marcarPago(planoAtivo.id, sessao.id)} className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${sessao.parcelaPaga ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border-medium)]  hover:border-emerald-400'}`}>
                          {sessao.parcelaPaga && <CheckCircle2 className="h-4 w-4 text-white" />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Novo Plano */}
      {novoModal && (
        <div className="fixed inset-0 bg-[var(--bg-surface)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl shadow-md w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Novo Plano de Tratamento</h3>
              <button onClick={() => setNovoModal(false)} className="p-2 hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-full"><X className="h-5 w-5 text-[var(--text-muted)]" /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Paciente', key: 'paciente', type: 'text' },
                { label: 'Tipo de Tratamento', key: 'tipo', type: 'text', placeholder: 'ex: Aparelho Ortodôntico' },
                { label: 'Dentista Responsável', key: 'dentista', type: 'text' },
                { label: 'Valor Total (R$)', key: 'valorTotal', type: 'number' },
                { label: 'Nº de Sessões/Parcelas', key: 'sessaoTotal', type: 'number' },
                { label: 'Data de Início', key: 'dataInicio', type: 'date' },
                { label: 'Data Prevista de Conclusão', key: 'dataFim', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{f.label}</label>
                  <input type={f.type} placeholder={(f as any).placeholder} value={(novoPlano as any)[f.key]} onChange={e => setNovoPlano(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setNovoModal(false)} className="flex-1 py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors">Cancelar</button>
              <button onClick={criarPlano} className="flex-1 py-3 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] rounded-xl font-bold text-sm transition-colors">Criar Plano</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
