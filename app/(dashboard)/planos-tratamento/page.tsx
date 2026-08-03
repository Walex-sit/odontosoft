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

const PLANOS_MOCK: PlanoTratamento[] = [
  {
    id: 1, paciente: 'Maria Fernanda', tipo: 'Aparelho Ortodôntico', dentista: 'Dra. Beatriz Costa',
    valorTotal: 4800, sessaoTotal: 24, status: 'ativo', dataInicio: '10/01/2026', dataFim: '10/01/2028',
    sessoes: [
      { id: 1, numero: 1, descricao: 'Instalação do aparelho', data: '10/01/2026', status: 'realizada', valorParcela: 200, parcelaPaga: true },
      { id: 2, numero: 2, descricao: 'Manutenção mensal', data: '10/02/2026', status: 'realizada', valorParcela: 200, parcelaPaga: true },
      { id: 3, numero: 3, descricao: 'Manutenção mensal', data: '10/03/2026', status: 'realizada', valorParcela: 200, parcelaPaga: false },
      { id: 4, numero: 4, descricao: 'Manutenção mensal', data: '10/04/2026', status: 'agendada', valorParcela: 200, parcelaPaga: false },
    ]
  },
  {
    id: 2, paciente: 'Carlos Petit', tipo: 'Implante Dentário', dentista: 'Dr. Rafael Gomes',
    valorTotal: 7000, sessaoTotal: 6, status: 'ativo', dataInicio: '15/06/2026', dataFim: '15/12/2026',
    sessoes: [
      { id: 5, numero: 1, descricao: 'Extração e planejamento', data: '15/06/2026', status: 'realizada', valorParcela: 1166.67, parcelaPaga: true },
      { id: 6, numero: 2, descricao: 'Inserção do implante', data: '20/07/2026', status: 'realizada', valorParcela: 1166.67, parcelaPaga: true },
      { id: 7, numero: 3, descricao: 'Acompanhamento osseointegração', data: '20/08/2026', status: 'agendada', valorParcela: 1166.67, parcelaPaga: false },
    ]
  },
  {
    id: 3, paciente: 'Ana Souza', tipo: 'Clareamento + Harmonização', dentista: 'Dr. Carlos Mendes',
    valorTotal: 2400, sessaoTotal: 4, status: 'concluido', dataInicio: '01/04/2026', dataFim: '01/07/2026',
    sessoes: [
      { id: 8, numero: 1, descricao: 'Clareamento sessão 1', data: '01/04/2026', status: 'realizada', valorParcela: 600, parcelaPaga: true },
      { id: 9, numero: 2, descricao: 'Clareamento sessão 2', data: '15/04/2026', status: 'realizada', valorParcela: 600, parcelaPaga: true },
      { id: 10, numero: 3, descricao: 'Harmonização facial', data: '01/05/2026', status: 'realizada', valorParcela: 600, parcelaPaga: true },
      { id: 11, numero: 4, descricao: 'Revisão e Polimento', data: '01/07/2026', status: 'realizada', valorParcela: 600, parcelaPaga: true },
    ]
  },
]

const STATUS_PLANO_CONFIG: Record<StatusPlano, { label: string; bg: string; text: string }> = {
  ativo: { label: 'Ativo', bg: 'bg-blue-100', text: 'text-blue-700' },
  concluido: { label: 'Concluído', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700' },
  pausado: { label: 'Pausado', bg: 'bg-amber-100', text: 'text-amber-700' },
}

const STATUS_SESSAO_CONFIG: Record<StatusSessao, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  realizada: { label: 'Realizada', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 className="h-4 w-4" /> },
  agendada: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-700', icon: <Calendar className="h-4 w-4" /> },
  pendente: { label: 'Pendente', bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock className="h-4 w-4" /> },
  faltou: { label: 'Faltou', bg: 'bg-red-100', text: 'text-red-700', icon: <AlertCircle className="h-4 w-4" /> },
}

export default function PlanosTratamentoPage() {
  const [planos, setPlanos] = useState<PlanoTratamento[]>(PLANOS_MOCK)
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
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <header className="p-8 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Planos de Tratamento</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Gestão de pacotes e tratamentos de longa duração por sessões ou parcelas</p>
          </div>
          <button onClick={() => setNovoModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors">
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
            <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className={`p-2.5 bg-${color}-50 text-${color}-600 rounded-xl w-fit mb-3`}><Icon className="h-5 w-5" /></div>
              <p className="text-2xl font-extrabold text-slate-800">{value}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
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
                  className={`bg-white rounded-2xl border shadow-sm p-6 cursor-pointer transition-all ${selectedPlano === plano.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800">{plano.paciente}</h3>
                      <p className="text-sm text-slate-500">{plano.tipo} · {plano.dentista}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                      <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${selectedPlano === plano.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 mb-3 flex-wrap">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Valor Total</p>
                      <p className="font-extrabold text-slate-800">R$ {plano.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Sessões</p>
                      <p className="font-extrabold text-slate-800">{plano.sessoes.filter(s => s.status === 'realizada').length}/{plano.sessaoTotal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Parcelas</p>
                      <p className="font-extrabold text-slate-800">{parcelasPagas}/{plano.sessoes.length} pagas</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Período</p>
                      <p className="text-xs font-semibold text-slate-600">{plano.dataInicio} → {plano.dataFim}</p>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${plano.status === 'concluido' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${prog}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">{prog}% concluído</p>
                </div>
              )
            })}
          </div>

          {/* Detalhe do Plano */}
          {planoAtivo && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Sessões — {planoAtivo.paciente}</h3>
                <button onClick={() => setSelectedPlano(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {planoAtivo.sessoes.map(sessao => {
                  const st = STATUS_SESSAO_CONFIG[sessao.status]
                  return (
                    <div key={sessao.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${st.bg} ${st.text}`}>{st.icon}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">Sessão {sessao.numero}</p>
                          <p className="text-xs text-slate-500">{sessao.descricao}{sessao.data ? ` · ${sessao.data}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">R$ {sessao.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className={`text-[10px] font-bold ${sessao.parcelaPaga ? 'text-emerald-600' : 'text-amber-600'}`}>{sessao.parcelaPaga ? 'Pago' : 'Pendente'}</p>
                        </div>
                        <button onClick={() => marcarPago(planoAtivo.id, sessao.id)} className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${sessao.parcelaPaga ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Novo Plano de Tratamento</h3>
              <button onClick={() => setNovoModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
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
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{f.label}</label>
                  <input type={f.type} placeholder={(f as any).placeholder} value={(novoPlano as any)[f.key]} onChange={e => setNovoPlano(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setNovoModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={criarPlano} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors">Criar Plano</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
