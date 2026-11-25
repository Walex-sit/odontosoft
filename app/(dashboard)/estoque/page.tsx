'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Package, AlertTriangle, Plus, Search, TrendingUp, ArrowDown, ArrowUp, X, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '@/app/lib/supabaseClient'
import { useAuth } from '@/app/components/RequireAuth'
import { TableSkeleton } from '@/app/components/ui/Skeleton'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { ErrorState } from '@/app/components/ui/ErrorState'

interface Item {
  id: string
  nome: string
  categoria: string
  quantidade: number
  minimo: number
  unidade: string
  fornecedor: string
  ultimaCompra: string
  custo: number
}

const CATEGORIAS = ['Todos', 'Resinas', 'Anestésicos', 'Instrumentos', 'Descartáveis', 'Radiologia', 'Outros']

type MovType = 'entrada' | 'saida'

export default function EstoquePage() {
  const { session, profile } = useAuth()
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [movModal, setMovModal] = useState<{ item: Item; tipo: MovType } | null>(null)
  const [movQtd, setMovQtd] = useState(1)
  const [novoModal, setNovoModal] = useState(false)
  const [novoItem, setNovoItem] = useState({
    nome: '',
    categoria: 'Resinas',
    quantidade: 0,
    minimo: 5,
    unidade: 'un',
    fornecedor: '',
    custo: 0,
  })

  async function carregarEstoque() {
    setLoading(true)
    setErro(null)
    try {
      // Colunas reais da tabela `estoque` no Supabase:
      // id | clinica_id | nome | descricao | quantidade | minimo | unidade | created_at
      let query = supabase
        .from('estoque')
        .select('id, clinica_id, nome, descricao, quantidade, minimo, unidade, created_at')

      if (profile?.clinica_id) {
        query = query.eq('clinica_id', profile.clinica_id)
      }

      const { data, error } = await query.order('nome', { ascending: true })

      if (error) {
        console.error('[Estoque] Erro ao carregar itens:', error.message)
        setErro('Falha ao carregar itens do estoque. Verifique sua conexão.')
      } else if (data) {
        setItens(
          data.map((row: any) => ({
            id: row.id,
            nome: row.nome || 'Item sem nome',
            categoria: 'Outros',
            quantidade: Number(row.quantidade ?? 0),
            minimo: Number(row.minimo ?? 0),
            unidade: row.unidade || 'un',
            fornecedor: row.descricao || '—',
            ultimaCompra: row.created_at
              ? new Date(row.created_at).toLocaleDateString('pt-BR')
              : '—',
            custo: 0,
          }))
        )
      }
    } catch (err: any) {
      console.error('[Estoque] Falha na requisição:', err)
      setErro('Erro inesperado ao consultar o estoque da clínica.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarEstoque()
  }, [session, profile?.clinica_id])

  const itensFiltrados = itens.filter(i => {
    const matchBusca =
      i.nome.toLowerCase().includes(busca.toLowerCase()) ||
      i.fornecedor.toLowerCase().includes(busca.toLowerCase())
    const matchCat = categoria === 'Todos' || i.categoria === categoria
    return matchBusca && matchCat
  })

  const criticos = itens.filter(i => i.minimo > 0 && i.quantidade <= i.minimo).length
  const total = itens.length
  const valorTotal = itens.reduce((acc, i) => acc + i.quantidade * i.custo, 0)

  const executarMovimentacao = async () => {
    if (!movModal || movQtd < 1) return
    const novaQtd =
      movModal.tipo === 'entrada'
        ? movModal.item.quantidade + movQtd
        : Math.max(0, movModal.item.quantidade - movQtd)

    let updateQuery = supabase
      .from('estoque')
      .update({ quantidade: novaQtd })
      .eq('id', movModal.item.id)

    if (profile?.clinica_id) {
      updateQuery = updateQuery.eq('clinica_id', profile.clinica_id)
    }

    const { error } = await updateQuery

    if (error) {
      toast.error('Erro ao atualizar estoque: ' + error.message)
    } else {
      toast.success(
        `${movModal.tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${movQtd} ${movModal.item.unidade}(s) registrada!`
      )
      setItens(prev =>
        prev.map(i => (i.id === movModal.item.id ? { ...i, quantidade: novaQtd } : i))
      )
    }
    setMovModal(null)
    setMovQtd(1)
  }

  const adicionarItem = async () => {
    if (!novoItem.nome || !novoItem.unidade) {
      toast.error('Preencha nome e unidade.')
      return
    }

    const { data, error } = await supabase
      .from('estoque')
      .insert([
        {
          ...(profile?.clinica_id ? { clinica_id: profile.clinica_id } : {}),
          nome: novoItem.nome,
          descricao: novoItem.fornecedor || null,
          quantidade: novoItem.quantidade,
          minimo: novoItem.minimo,
          unidade: novoItem.unidade,
        },
      ])
      .select('id, clinica_id, nome, descricao, quantidade, minimo, unidade, created_at')

    if (error) {
      toast.error('Erro ao salvar item: ' + error.message)
    } else {
      toast.success(`${novoItem.nome} adicionado ao estoque!`)
      setNovoModal(false)
      setNovoItem({
        nome: '',
        categoria: 'Resinas',
        quantidade: 0,
        minimo: 5,
        unidade: 'un',
        fornecedor: '',
        custo: 0,
      })
      carregarEstoque()
    }
  }

  const excluirItem = async (item: Item) => {
    if (!confirm(`Tem certeza que deseja excluir o item "${item.nome}" do estoque?`)) {
      return
    }

    let deleteQuery = supabase
      .from('estoque')
      .delete()
      .eq('id', item.id)

    if (profile?.clinica_id) {
      deleteQuery = deleteQuery.eq('clinica_id', profile.clinica_id)
    }

    const { error } = await deleteQuery

    if (error) {
      toast.error('Erro ao excluir item: ' + error.message)
    } else {
      toast.success(`Item "${item.nome}" removido do estoque.`)
      setItens(prev => prev.filter(i => i.id !== item.id))
    }
  }

  const statusColor = (item: Item) => {
    if (item.quantidade === 0 && item.minimo > 0) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Esgotado' }
    if (item.minimo > 0 && item.quantidade <= item.minimo) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Crítico' }
    return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Normal' }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-[var(--bg-surface)] border-b border-[var(--border)]  shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Gestão de Estoque</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Controle de materiais, insumos e suprimentos odontológicos</p>
          </div>
          <button onClick={() => setNovoModal(true)} className="flex items-center gap-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Novo Item
          </button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total de Itens', value: total, icon: Package, color: 'blue' },
            { label: 'Itens Críticos', value: criticos, icon: AlertTriangle, color: 'amber' },
            { label: 'Itens em Nível Normal', value: Math.max(0, total - criticos), icon: TrendingUp, color: 'emerald' },
          ].map(k => (
            <div key={k.label} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]  p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{k.label}</p>
                <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-1">{loading ? '...' : k.value}</p>
              </div>
              <div className={`p-3 rounded-xl border ${k.color === 'blue' ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/20' : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border)]'}`}>
                <k.icon className="h-6 w-6" />
              </div>
            </div>
          ))}
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar item ou fornecedor..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  categoria === cat
                    ? 'bg-[var(--primary-fill)] text-[var(--on-primary)]'
                    : 'bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela ou Estados de Erro / Vazio */}
        {erro ? (
          <ErrorState
            title="Falha ao sincronizar estoque"
            message={erro}
            onRetry={carregarEstoque}
          />
        ) : (
          <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border)]/80  shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-4">
                  <TableSkeleton rows={5} cols={8} />
                </div>
              ) : itensFiltrados.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={<Package size={30} />}
                    title={busca ? 'Nenhum item encontrado na busca' : 'Nenhum item cadastrado no estoque'}
                    description={
                      busca
                        ? 'Tente buscar por outro termo ou remova os filtros.'
                        : 'Cadastre materiais, anestésicos e insumos clínicos para acompanhar níveis mínimos e reposição.'
                    }
                    actionLabel={busca ? 'Limpar busca' : 'Adicionar Novo Item'}
                    actionIcon={<Plus size={15} />}
                    onAction={() => {
                      if (busca) setBusca('')
                      else setNovoModal(true)
                    }}
                  />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] border-b border-[var(--border)] ">
                    <tr>
                      {['Item', 'Categoria', 'Qtd Atual', 'Mín.', 'Unidade', 'Fornecedor', 'Data Cadastro', 'Status', 'Ações'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] divide-[var(--border)]">
                    {itensFiltrados.map(item => {
                      const st = statusColor(item)
                      return (
                        <tr key={item.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] transition-colors">
                          <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">{item.nome}</td>
                          <td className="px-5 py-3.5 text-[var(--text-secondary)]">{item.categoria}</td>
                          <td className={`px-5 py-3.5 font-extrabold ${item.minimo > 0 && item.quantidade <= item.minimo ? 'text-red-600' : 'text-[var(--text-primary)]'}`}>{item.quantidade}</td>
                          <td className="px-5 py-3.5 text-[var(--text-muted)]">{item.minimo}</td>
                          <td className="px-5 py-3.5 text-[var(--text-muted)]">{item.unidade}</td>
                          <td className="px-5 py-3.5 text-[var(--text-secondary)]">{item.fornecedor}</td>
                          <td className="px-5 py-3.5 text-[var(--text-muted)]">{item.ultimaCompra}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setMovModal({ item, tipo: 'entrada' }); setMovQtd(1) }} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer" title="Registrar Entrada">
                                <ArrowDown className="h-3.5 w-3.5" /> Entrada
                              </button>
                              <button onClick={() => { setMovModal({ item, tipo: 'saida' }); setMovQtd(1) }} className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors cursor-pointer" title="Registrar Saída">
                                <ArrowUp className="h-3.5 w-3.5" /> Saída
                              </button>
                              <button onClick={() => excluirItem(item)} className="p-1 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer" title="Excluir item">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Movimentação */}
      {movModal && (
        <div className="fixed inset-0 bg-[var(--bg-surface)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl shadow-md w-full max-w-sm p-8">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {movModal.tipo === 'entrada' ? '📦 Registrar Entrada' : '📤 Registrar Saída'}
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">{movModal.item.nome} — estoque atual: <strong>{movModal.item.quantidade}</strong></p>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Quantidade ({movModal.item.unidade})</label>
            <input type="number" min={1} value={movQtd} onChange={e => setMovQtd(Number(e.target.value))} className="w-full border border-[var(--border)]  rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 mb-6" />
            <div className="flex gap-3">
              <button onClick={() => setMovModal(null)} className="flex-1 py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors">Cancelar</button>
              <button onClick={executarMovimentacao} className={`flex-1 py-3 text-white rounded-xl font-bold text-sm transition-colors ${movModal.tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Item */}
      {novoModal && (
        <div className="fixed inset-0 bg-[var(--bg-surface)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl shadow-md w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Novo Item de Estoque</h3>
              <button onClick={() => setNovoModal(false)} className="p-2 hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-full"><X className="h-5 w-5 text-[var(--text-muted)]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Nome do Item</label>
                <input
                  type="text"
                  value={novoItem.nome}
                  onChange={e => setNovoItem(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Resina Composta A2"
                  className="w-full border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Fornecedor</label>
                <input
                  type="text"
                  value={novoItem.fornecedor}
                  onChange={e => setNovoItem(p => ({ ...p, fornecedor: e.target.value }))}
                  placeholder="Ex: DentalX"
                  className="w-full border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Unidade</label>
                  <input
                    type="text"
                    value={novoItem.unidade}
                    onChange={e => setNovoItem(p => ({ ...p, unidade: e.target.value }))}
                    placeholder="Ex: un, caixa, seringa"
                    className="w-full border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Qtd Inicial</label>
                  <input
                    type="number"
                    min={0}
                    value={novoItem.quantidade}
                    onChange={e => setNovoItem(p => ({ ...p, quantidade: Number(e.target.value) }))}
                    className="w-full border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Estoque Mínimo</label>
                <input
                  type="number"
                  min={0}
                  value={novoItem.minimo}
                  onChange={e => setNovoItem(p => ({ ...p, minimo: Number(e.target.value) }))}
                  className="w-full border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Categoria</label>
                <select
                  value={novoItem.categoria}
                  onChange={e => setNovoItem(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full border border-[var(--border)]  rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40"
                >
                  {CATEGORIAS.filter(c => c !== 'Todos').map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setNovoModal(false)} className="flex-1 py-3 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:bg-[var(--border)] transition-colors">Cancelar</button>
              <button onClick={adicionarItem} className="flex-1 py-3 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] rounded-xl font-bold text-sm transition-colors">Salvar Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}