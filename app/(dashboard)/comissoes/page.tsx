'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { DollarSign, CheckCircle2, Clock, Search, Filter, TrendingUp, Users, ChevronDown, X } from 'lucide-react'

interface Procedimento {
  id: number
  paciente: string
  descricao: string
  data: string
  valor: number
  taxaComissao: number
  status: 'pendente' | 'pago'
}

interface Dentista {
  id: number
  nome: string
  especialidade: string
  taxaPadrao: number
  procedimentos: Procedimento[]
}

const DENTISTAS_MOCK: Dentista[] = [
  {
    id: 1, nome: 'Dr. Carlos Mendes', especialidade: 'Clínico Geral', taxaPadrao: 40,
    procedimentos: [
      { id: 1, paciente: 'João Silva', descricao: 'Restauração Composta', data: '28/07/2026', valor: 350, taxaComissao: 40, status: 'pendente' },
      { id: 2, paciente: 'Ana Souza', descricao: 'Extração Simples', data: '29/07/2026', valor: 200, taxaComissao: 40, status: 'pendente' },
      { id: 3, paciente: 'Roberto Lima', descricao: 'Profilaxia + Aplicação de Flúor', data: '30/07/2026', valor: 180, taxaComissao: 40, status: 'pago' },
    ]
  },
  {
    id: 2, nome: 'Dra. Beatriz Costa', especialidade: 'Ortodontista', taxaPadrao: 35,
    procedimentos: [
      { id: 4, paciente: 'Maria Fernanda', descricao: 'Manutenção Aparelho', data: '27/07/2026', valor: 250, taxaComissao: 35, status: 'pago' },
      { id: 5, paciente: 'Lucas Martins', descricao: 'Instalação Aparelho Fixo', data: '01/08/2026', valor: 1200, taxaComissao: 35, status: 'pendente' },
    ]
  },
  {
    id: 3, nome: 'Dr. Rafael Gomes', especialidade: 'Implantodontista', taxaPadrao: 45,
    procedimentos: [
      { id: 6, paciente: 'Carla Nunes', descricao: 'Implante Unitário', data: '02/08/2026', valor: 3500, taxaComissao: 45, status: 'pendente' },
    ]
  },
]

export default function ComissoesPage() {
  const [dentistas, setDentistas] = useState<Dentista[]>(DENTISTAS_MOCK)
  const [selectedDentista, setSelectedDentista] = useState<number | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [busca, setBusca] = useState('')
  const [quitarModal, setQuitarModal] = useState<{ dentistaId: number; procIds: number[] } | null>(null)

  const calcComissao = (valor: number, taxa: number) => valor * (taxa / 100)

  const allProcs = dentistas.flatMap(d => d.procedimentos.map(p => ({ ...p, dentistaNome: d.nome, dentistaId: d.id })))

  const filtrado = allProcs.filter(p => {
    const matchD = selectedDentista === 'todos' || p.dentistaId === selectedDentista
    const matchS = filtroStatus === 'todos' || p.status === filtroStatus
    const matchB = p.paciente.toLowerCase().includes(busca.toLowerCase()) || p.descricao.toLowerCase().includes(busca.toLowerCase())
    return matchD && matchS && matchB
  })

  const totalPendente = allProcs.filter(p => p.status === 'pendente').reduce((acc, p) => acc + calcComissao(p.valor, p.taxaComissao), 0)
  const totalPago = allProcs.filter(p => p.status === 'pago').reduce((acc, p) => acc + calcComissao(p.valor, p.taxaComissao), 0)

  const quitarPendentes = (dentistaId: number) => {
    const procsPendentes = allProcs.filter(p => p.dentistaId === dentistaId && p.status === 'pendente').map(p => p.id)
    if (procsPendentes.length === 0) { toast.info('Nenhuma comissão pendente para este dentista.'); return }
    setQuitarModal({ dentistaId, procIds: procsPendentes })
  }

  const confirmarQuitacao = () => {
    if (!quitarModal) return
    setDentistas(prev => prev.map(d => {
      if (d.id !== quitarModal.dentistaId) return d
      return { ...d, procedimentos: d.procedimentos.map(p => quitarModal.procIds.includes(p.id) ? { ...p, status: 'pago' as const } : p) }
    }))
    toast.success('Comissões quitadas e repasse registrado!')
    setQuitarModal(null)
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <header className="p-8 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Controle de Comissões</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Histórico de repasses e comissões por profissional</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit mb-3"><DollarSign className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">A Repassar</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-3"><CheckCircle2 className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Já Repassado</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit mb-3"><Users className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800">{dentistas.length}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Profissionais</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl w-fit mb-3"><TrendingUp className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-800">{allProcs.length}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">Procedimentos</p>
          </div>
        </div>

        {/* Resumo por Dentista */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dentistas.map(d => {
            const pendente = d.procedimentos.filter(p => p.status === 'pendente').reduce((acc, p) => acc + calcComissao(p.valor, p.taxaComissao), 0)
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800">{d.nome}</h3>
                    <p className="text-xs text-slate-500">{d.especialidade} · {d.taxaPadrao}% comissão</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-extrabold text-sm">
                    {d.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold">A repassar</p>
                    <p className="text-xl font-extrabold text-amber-600">R$ {pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button onClick={() => quitarPendentes(d.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors">
                    Quitar Tudo
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 flex-1 min-w-48">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por paciente ou procedimento..." className="bg-transparent outline-none text-sm text-slate-700 w-full font-medium" />
          </div>
          <select value={selectedDentista} onChange={e => setSelectedDentista(e.target.value === 'todos' ? 'todos' : Number(e.target.value))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none">
            <option value="todos">Todos os Dentistas</option>
            {dentistas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <div className="flex gap-2">
            {(['todos', 'pendente', 'pago'] as const).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors capitalize ${filtroStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s === 'todos' ? 'Todos' : s === 'pendente' ? 'Pendente' : 'Pago'}</button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Paciente', 'Procedimento', 'Dentista', 'Data', 'Valor Proc.', 'Comissão (%)', 'Valor Comissão', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrado.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{p.paciente}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.descricao}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.dentistaNome}</td>
                    <td className="px-5 py-3.5 text-slate-500">{p.data}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.taxaComissao}%</td>
                    <td className="px-5 py-3.5 font-extrabold text-blue-700">R$ {calcComissao(p.valor, p.taxaComissao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status === 'pago' ? 'Pago' : 'Pendente'}</span>
                    </td>
                  </tr>
                ))}
                {filtrado.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400 font-semibold">Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Quitar */}
      {quitarModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="text-4xl mb-4">💸</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirmar Quitação</h3>
            <p className="text-sm text-slate-500 mb-6">
              Marcar <strong>{quitarModal.procIds.length}</strong> comissão(ões) como pagas para <strong>{dentistas.find(d => d.id === quitarModal.dentistaId)?.nome}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setQuitarModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={confirmarQuitacao} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
