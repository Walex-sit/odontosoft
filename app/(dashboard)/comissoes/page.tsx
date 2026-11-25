'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { DollarSign, CheckCircle2, Search, TrendingUp, Users, Percent, Loader2 } from 'lucide-react'
import { supabase } from '@/app/lib/supabaseClient'
import { useAuth } from '@/app/components/RequireAuth'
import { useClinica } from '@/app/contexts/ClinicaContext'
import CommissionModal from '@/app/components/CommissionModal'

interface Procedimento {
  id: string
  paciente: string
  descricao: string
  data: string
  valor: number
  taxaComissao: number
  status: 'pendente' | 'pago'
  dentistaNome?: string
  dentistaId?: string
}

interface Dentista {
  id: string
  nome: string
  especialidade: string
  taxaPadrao: number
  procedimentos: Procedimento[]
}

export default function ComissoesPage() {
  const { profile } = useAuth()
  const { clinica } = useClinica()

  const [dentistas, setDentistas] = useState<Dentista[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDentista, setSelectedDentista] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [busca, setBusca] = useState('')
  const [quitarModal, setQuitarModal] = useState<{ dentistaId: string; procIds: string[] } | null>(null)
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  const calcComissao = (valor: number, taxa: number) => valor * (taxa / 100)

  useEffect(() => {
    async function carregarComissoes() {
      setLoading(true)
      try {
        const clinicaId = profile?.clinica_id || clinica?.id

        // 1. Busca todos os profissionais com role 'dentista' vinculados à clínica
        let dentistasQuery = supabase
          .from('user_profiles')
          .select('id, nome, especialidade, clinica_id')
          .eq('role', 'dentista')
          .order('nome', { ascending: true })

        if (clinicaId) {
          dentistasQuery = dentistasQuery.eq('clinica_id', clinicaId)
        }

        // 2. Busca histórico de procedimentos realizados na clínica
        let procsRealizadosQuery = supabase
          .from('procedimentos_realizados')
          .select('id, clinica_id, paciente_id, dentista_id, procedimento_id, data_realizacao, valor_cobrado, comissao_gerada')
          .order('data_realizacao', { ascending: false })

        if (clinicaId) {
          procsRealizadosQuery = procsRealizadosQuery.eq('clinica_id', clinicaId)
        }

        // 3. Busca regras de comissão configuradas
        let regrasComissaoQuery = supabase
          .from('comissoes')
          .select('id, clinica_id, procedimento_id, dentista_id, porcentagem')

        if (clinicaId) {
          regrasComissaoQuery = regrasComissaoQuery.eq('clinica_id', clinicaId)
        }

        const [dentistasRes, procsRes, procsDefRes, pacientesRes, regrasRes] = await Promise.all([
          dentistasQuery,
          procsRealizadosQuery,
          supabase.from('procedimentos').select('id, nome, valor_padrao'),
          supabase.from('pacientes').select('id, nome'),
          regrasComissaoQuery,
        ])

        const dentistasData = (dentistasRes.data || []) as any[]
        const procsRealizadosData = (procsRes.data || []) as any[]
        const procsDefMap = new Map((procsDefRes.data || []).map((p: any) => [p.id, p.nome]))
        const pacMap = new Map((pacientesRes.data || []).map((p: any) => [p.id, p.nome]))
        const regrasList = (regrasRes.data || []) as any[]

        const dentistasMapeados: Dentista[] = dentistasData.map((dent: any) => {
          const dentRegras = regrasList.filter((r) => r.dentista_id === dent.id)
          const taxaPadrao = dentRegras.length > 0 ? Number(dentRegras[0].porcentagem) : 40

          const procsDoDentista = procsRealizadosData.filter((pr: any) => pr.dentista_id === dent.id)
          const procedimentos: Procedimento[] = procsDoDentista.map((pr: any) => {
            const valor = Number(pr.valor_cobrado ?? 0)
            let taxa = taxaPadrao
            if (pr.procedimento_id) {
              const regraEspecifica = dentRegras.find((r) => r.procedimento_id === pr.procedimento_id)
              if (regraEspecifica) taxa = Number(regraEspecifica.porcentagem)
            }
            if (pr.comissao_gerada && valor > 0) {
              taxa = Math.round((Number(pr.comissao_gerada) / valor) * 100)
            }

            return {
              id: pr.id,
              paciente: (pr.paciente_id && pacMap.get(pr.paciente_id)) || 'Paciente',
              descricao: (pr.procedimento_id && procsDefMap.get(pr.procedimento_id)) || 'Procedimento',
              data: pr.data_realizacao ? new Date(pr.data_realizacao).toLocaleDateString('pt-BR') : '—',
              valor,
              taxaComissao: taxa,
              status: 'pendente' as const,
            }
          })

          return {
            id: dent.id,
            nome: dent.nome || 'Dentista',
            especialidade: dent.especialidade || 'Clínico Geral',
            taxaPadrao,
            procedimentos,
          }
        })

        setDentistas(dentistasMapeados)
      } catch (err) {
        console.error('Erro ao carregar comissões:', err)
        toast.error('Erro ao carregar dados de comissões.')
      } finally {
        setLoading(false)
      }
    }

    carregarComissoes()
  }, [profile, clinica, reloadTrigger])

  const allProcs = dentistas.flatMap(d => d.procedimentos.map(p => ({ ...p, dentistaNome: d.nome, dentistaId: d.id })))

  const filtrado = allProcs.filter(p => {
    const matchD = selectedDentista === 'todos' || p.dentistaId === selectedDentista
    const matchS = filtroStatus === 'todos' || p.status === filtroStatus
    const matchB = p.paciente.toLowerCase().includes(busca.toLowerCase()) || p.descricao.toLowerCase().includes(busca.toLowerCase())
    return matchD && matchS && matchB
  })

  const totalPendente = allProcs.filter(p => p.status === 'pendente').reduce((acc, p) => acc + calcComissao(p.valor, p.taxaComissao), 0)
  const totalPago = allProcs.filter(p => p.status === 'pago').reduce((acc, p) => acc + calcComissao(p.valor, p.taxaComissao), 0)

  const quitarPendentes = (dentistaId: string) => {
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
    <div className="flex flex-col h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] overflow-y-auto">
      <header className="p-8 bg-[var(--bg-surface)] border-b border-[var(--border)]  shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Controle de Comissões</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Histórico de repasses e comissões por profissional</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCommissionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] rounded-xl text-sm font-bold shadow-sm transition-colors"
            >
              <Percent className="h-4 w-4" /> Configurar Comissões
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit mb-3"><DollarSign className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">A Repassar</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-3"><CheckCircle2 className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Já Repassado</p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl w-fit mb-3"><Users className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">
              {loading ? '...' : dentistas.length}
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">
              {dentistas.length === 1 ? 'Profissional' : 'Profissionais'}
            </p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm col-span-2 md:col-span-1">
            <div className="p-2.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl w-fit mb-3"><TrendingUp className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">
              {loading ? '...' : allProcs.length}
            </p>
            <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Procedimentos</p>
          </div>
        </div>

        {/* Resumo por Dentista */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] ">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-3" />
            <p className="text-sm font-semibold text-[var(--text-muted)]">Carregando profissionais e histórico de comissões...</p>
          </div>
        ) : dentistas.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] ">
            <Users className="h-10 w-10 text-[var(--border-medium)] mx-auto mb-2" />
            <p className="text-sm font-bold text-[var(--text-secondary)]">Nenhum profissional com perfil de dentista cadastrado</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Cadastre profissionais na aba de Usuários para gerenciar comissões e repasses clínicos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dentistas.map(d => {
              const pendente = d.procedimentos.filter(p => p.status === 'pendente').reduce((acc, p) => acc + calcComissao(p.valor, p.taxaComissao), 0)
              return (
                <div key={d.id} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[var(--text-primary)]">{d.nome}</h3>
                      <p className="text-xs text-[var(--text-muted)]">{d.especialidade} · {d.taxaPadrao}% comissão</p>
                    </div>
                    <div className="h-10 w-10 bg-[var(--primary-subtle)] rounded-full flex items-center justify-center text-[var(--primary)] font-extrabold text-sm">
                      {d.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-[var(--text-muted)] font-semibold">A repassar</p>
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
        )}

        {/* Filtros */}
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] rounded-xl px-3 py-2 flex-1 min-w-48">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por paciente ou procedimento..." className="bg-transparent outline-none text-sm text-[var(--text-secondary)] w-full font-medium" />
          </div>
          <select
            value={selectedDentista}
            onChange={e => setSelectedDentista(e.target.value)}
            className="border border-[var(--border)]  rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] focus:outline-none bg-[var(--bg-surface)]"
          >
            <option value="todos">Todos os Dentistas</option>
            {dentistas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <div className="flex gap-2">
            {(['todos', 'pendente', 'pago'] as const).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors capitalize ${filtroStatus === s ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border)]'}`}>{s === 'todos' ? 'Todos' : s === 'pendente' ? 'Pendente' : 'Pago'}</button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)] ">
                <tr>
                  {['Paciente', 'Procedimento', 'Dentista', 'Data', 'Valor Proc.', 'Comissão (%)', 'Valor Comissão', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] ">
                {filtrado.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">{p.paciente}</td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">{p.descricao}</td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">{p.dentistaNome}</td>
                    <td className="px-5 py-3.5 text-[var(--text-muted)]">{p.data}</td>
                    <td className="px-5 py-3.5 font-semibold text-[var(--text-primary)]">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">{p.taxaComissao}%</td>
                    <td className="px-5 py-3.5 font-extrabold text-[var(--primary)]">R$ {calcComissao(p.valor, p.taxaComissao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.status === 'pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status === 'pago' ? 'Pago' : 'Pendente'}</span>
                    </td>
                  </tr>
                ))}
                {filtrado.length === 0 && !loading && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-[var(--text-muted)] font-semibold">Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Quitar */}
      {quitarModal && (
        <div className="fixed inset-0 bg-[var(--bg-surface)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl shadow-md w-full max-w-sm p-8 text-center">
            <div className="text-4xl mb-4">💸</div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Confirmar Quitação</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Marcar <strong>{quitarModal.procIds.length}</strong> comissão(ões) como pagas para <strong>{dentistas.find(d => d.id === quitarModal.dentistaId)?.nome}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setQuitarModal(null)} className="flex-1 py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors">Cancelar</button>
              <button onClick={confirmarQuitacao} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar Comissão */}
      <CommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        onSuccess={() => setReloadTrigger(p => p + 1)}
      />
    </div>
  )
}
