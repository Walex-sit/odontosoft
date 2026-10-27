'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Package, AlertTriangle, Plus, Search, TrendingUp, ArrowDown, ArrowUp, X, Loader2 } from 'lucide-react'
import { supabase } from '@/app/lib/supabaseClient'
import { useAuth } from '@/app/components/RequireAuth'

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
  const { session } = useAuth()
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
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
    try {
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .order('nome', { ascending: true })

      if (error) {
        console.error('[Estoque] Erro ao carregar itens:', error.message)
      } else if (data) {
        setItens(
          data.map((row: any) => ({
            id: row.id,
            nome: row.nome || 'Item sem nome',
            categoria: row.descricao?.split('|')[0] || 'Outros',
            quantidade: Number(row.quantidade || 0),
            minimo: Number(row.minimo || 0),
            unidade: row.unidade || 'un',
            fornecedor: row.descricao?.split('|')[1] || '—',
            ultimaCompra: row.created_at
              ? new Date(row.created_at).toLocaleDateString('pt-BR')
              : '—',
            custo: 0,
          }))
        )
      }
    } catch (err: any) {
      console.error('[Estoque] Falha na requisição:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarEstoque()
  }, [session])

  const itensFiltrados = itens.filter(i => {
    const matchBusca =
      i.nome.toLowerCase().includes(busca.toLowerCase()) ||
      i.fornecedor.toLowerCase().includes(busca.toLowerCase())
    const matchCat = categoria === 'Todos' || i.categoria === categoria
    return matchBusca && matchCat
  })

  const criticos = itens.filter(i => i.quantidade < i.minimo).length
  const total = itens.length
  const valorTotal = itens.reduce((acc, i) => acc + i.quantidade * i.custo, 0)

  const executarMovimentacao = async () => {
    if (!movModal || movQtd < 1) return
    const novaQtd =
      movModal.tipo === 'entrada'
        ? movModal.item.quantidade + movQtd
        : Math.max(0, movModal.item.quantidade - movQtd)

    const { error } = await supabase
      .from('estoque')
      .update({ quantidade: novaQtd })
      .eq('id', movModal.item.id)

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
          nome: novoItem.nome,
          descricao: `${novoItem.categoria}|${novoItem.fornecedor}`,
          quantidade: novoItem.quantidade,
          minimo: novoItem.minimo,
          unidade: novoItem.unidade,
        },
      ])
      .select()

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

  const statusColor = (item: Item) => {
    if (item.quantidade === 0) return { bg: 'bg-red-100', text: 'text-red-700', label: 'Esgotado' }
    if (item.quantidade < item.minimo) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Crítico' }
    return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Normal' }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Gestão de Estoque</h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Controle de materiais, insumos e suprimentos odontológicos</p>
          </div>
          <button onClick={() => setNovoModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors">
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
            <div key={k.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{k.label}</p>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{loading ? '...' : k.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${k.color === 'blue' ? 'bg-blue-50 text-blue-600' : k.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <k.icon className="h-6 w-6" />
              </div>
            </div>
          ))}
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar item ou fornecedor..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIAS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  categoria === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Item', 'Categoria', 'Qtd Atual', 'Mín.', 'Unidade', 'Fornecedor', 'Data Cadastro', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400 font-semibold">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        Carregando estoque do banco de dados...
                      </div>
                    </td>
                  </tr>
                ) : itensFiltrados.map(item => {
                  const st = statusColor(item)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">{item.nome}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.categoria}</td>
                      <td className={`px-5 py-3.5 font-extrabold ${item.quantidade < item.minimo ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>{item.quantidade}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.minimo}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.unidade}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.fornecedor}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.ultimaCompra}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2">
                          <button onClick={() => { setMovModal({ item, tipo: 'entrada' }); setMovQtd(1) }} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                            <ArrowDown className="h-3.5 w-3.5" /> Entrada
                          </button>
                          <button onClick={() => { setMovModal({ item, tipo: 'saida' }); setMovQtd(1) }} className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
                            <ArrowUp className="h-3.5 w-3.5" /> Saída
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && itensFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400 font-semibold">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="text-base font-bold text-slate-600 dark:text-slate-300">Nenhum item cadastrado no estoque</p>
                        <p className="text-xs text-slate-400 mt-1">Cadastre novos materiais usando o botão acima.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Movimentação */}
      {movModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-8">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              {movModal.tipo === 'entrada' ? '📦 Registrar Entrada' : '📤 Registrar Saída'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{movModal.item.nome} — estoque atual: <strong>{movModal.item.quantidade}</strong></p>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Quantidade ({movModal.item.unidade})</label>
            <input type="number" min={1} value={movQtd} onChange={e => setMovQtd(Number(e.target.value))} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-6" />
            <div className="flex gap-3">
              <button onClick={() => setMovModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={executarMovimentacao} className={`flex-1 py-3 text-white rounded-xl font-bold text-sm transition-colors ${movModal.tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Item */}
      {novoModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Novo Item de Estoque</h3>
              <button onClick={() => setNovoModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Nome do Item</label>
                <input
                  type="text"
                  value={novoItem.nome}
                  onChange={e => setNovoItem(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Resina Composta A2"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Fornecedor</label>
                <input
                  type="text"
                  value={novoItem.fornecedor}
                  onChange={e => setNovoItem(p => ({ ...p, fornecedor: e.target.value }))}
                  placeholder="Ex: DentalX"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Unidade</label>
                  <input
                    type="text"
                    value={novoItem.unidade}
                    onChange={e => setNovoItem(p => ({ ...p, unidade: e.target.value }))}
                    placeholder="Ex: un, caixa, seringa"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Qtd Inicial</label>
                  <input
                    type="number"
                    min={0}
                    value={novoItem.quantidade}
                    onChange={e => setNovoItem(p => ({ ...p, quantidade: Number(e.target.value) }))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Estoque Mínimo</label>
                <input
                  type="number"
                  min={0}
                  value={novoItem.minimo}
                  onChange={e => setNovoItem(p => ({ ...p, minimo: Number(e.target.value) }))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Categoria</label>
                <select
                  value={novoItem.categoria}
                  onChange={e => setNovoItem(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {CATEGORIAS.filter(c => c !== 'Todos').map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setNovoModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={adicionarItem} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors">Salvar Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}