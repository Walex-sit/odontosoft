'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Package, AlertTriangle, Plus, Search, TrendingDown, TrendingUp, ArrowDown, ArrowUp, X } from 'lucide-react'

interface Item {
  id: number
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

const ITENS_INICIAIS: Item[] = [
  { id: 1, nome: 'Resina Composta A2', categoria: 'Resinas', quantidade: 3, minimo: 5, unidade: 'seringa', fornecedor: 'DentalX', ultimaCompra: '15/07/2026', custo: 89.90 },
  { id: 2, nome: 'Anestésico Mepivacaína', categoria: 'Anestésicos', quantidade: 48, minimo: 20, unidade: 'tubete', fornecedor: 'Biodinâmica', ultimaCompra: '20/07/2026', custo: 4.50 },
  { id: 3, nome: 'Luvas Nitrílicas P', categoria: 'Descartáveis', quantidade: 28, minimo: 50, unidade: 'caixa', fornecedor: 'MedPlus', ultimaCompra: '01/08/2026', custo: 32.00 },
  { id: 4, nome: 'Filme Radiográfico', categoria: 'Radiologia', quantidade: 12, minimo: 10, unidade: 'pacote', fornecedor: 'DentalX', ultimaCompra: '10/07/2026', custo: 55.00 },
  { id: 5, nome: 'Broca Carbide FG', categoria: 'Instrumentos', quantidade: 4, minimo: 10, unidade: 'un', fornecedor: 'SSWhite', ultimaCompra: '05/07/2026', custo: 12.00 },
  { id: 6, nome: 'Ácido Fosfórico 37%', categoria: 'Resinas', quantidade: 15, minimo: 5, unidade: 'seringa', fornecedor: 'Angelus', ultimaCompra: '22/07/2026', custo: 18.50 },
  { id: 7, nome: 'Máscara PFF2', categoria: 'Descartáveis', quantidade: 85, minimo: 30, unidade: 'un', fornecedor: 'MedPlus', ultimaCompra: '01/08/2026', custo: 5.20 },
  { id: 8, nome: 'Fio Dental (rolo profissional)', categoria: 'Outros', quantidade: 2, minimo: 8, unidade: 'rolo', fornecedor: 'DentalX', ultimaCompra: '18/06/2026', custo: 45.00 },
]

type MovType = 'entrada' | 'saida'

interface Movimentacao {
  tipo: MovType
  itemId: number
  qtd: number
}

export default function EstoquePage() {
  const [itens, setItens] = useState<Item[]>(ITENS_INICIAIS)
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [movModal, setMovModal] = useState<{ item: Item; tipo: MovType } | null>(null)
  const [movQtd, setMovQtd] = useState(1)
  const [novoModal, setNovoModal] = useState(false)
  const [novoItem, setNovoItem] = useState({ nome: '', categoria: 'Resinas', quantidade: 0, minimo: 5, unidade: '', fornecedor: '', custo: 0 })

  const itensFiltrados = itens.filter(i => {
    const matchBusca = i.nome.toLowerCase().includes(busca.toLowerCase()) || i.fornecedor.toLowerCase().includes(busca.toLowerCase())
    const matchCat = categoria === 'Todos' || i.categoria === categoria
    return matchBusca && matchCat
  })

  const criticos = itens.filter(i => i.quantidade < i.minimo).length
  const total = itens.length
  const valorTotal = itens.reduce((acc, i) => acc + i.quantidade * i.custo, 0)

  const executarMovimentacao = () => {
    if (!movModal || movQtd < 1) return
    setItens(prev => prev.map(i => {
      if (i.id !== movModal.item.id) return i
      const nova = movModal.tipo === 'entrada' ? i.quantidade + movQtd : Math.max(0, i.quantidade - movQtd)
      return { ...i, quantidade: nova }
    }))
    toast.success(`${movModal.tipo === 'entrada' ? 'Entrada' : 'Saída'} de ${movQtd} ${movModal.item.unidade}(s) registrada!`)
    setMovModal(null)
    setMovQtd(1)
  }

  const adicionarItem = () => {
    if (!novoItem.nome || !novoItem.unidade) { toast.error('Preencha nome e unidade.'); return }
    setItens(prev => [...prev, { ...novoItem, id: Date.now(), ultimaCompra: new Date().toLocaleDateString('pt-BR') }])
    toast.success(`${novoItem.nome} adicionado ao estoque!`)
    setNovoModal(false)
    setNovoItem({ nome: '', categoria: 'Resinas', quantidade: 0, minimo: 5, unidade: '', fornecedor: '', custo: 0 })
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de Itens', value: total, icon: Package, color: 'blue' },
            { label: 'Itens Críticos', value: criticos, icon: AlertTriangle, color: 'amber' },
            { label: 'Itens OK', value: total - criticos, icon: TrendingUp, color: 'emerald' },
            { label: 'Valor em Estoque', value: `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingDown, color: 'slate' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm`}>
              <div className={`p-2.5 bg-${color}-50 text-${color}-600 rounded-xl w-fit mb-3`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 flex-1 min-w-48">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar item ou fornecedor..." className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 w-full font-medium" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map(cat => (
              <button key={cat} onClick={() => setCategoria(cat)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${categoria === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {['Item', 'Categoria', 'Qtd Atual', 'Mín.', 'Unidade', 'Fornecedor', 'Custo Unit.', 'Status', 'Ações'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensFiltrados.map(item => {
                  const st = statusColor(item)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-100">{item.nome}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.categoria}</td>
                      <td className={`px-5 py-3.5 font-extrabold ${item.quantidade < item.minimo ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>{item.quantidade}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.minimo}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{item.unidade}</td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{item.fornecedor}</td>
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200 font-semibold">R$ {item.custo.toFixed(2)}</td>
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
                {itensFiltrados.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400 font-semibold">Nenhum item encontrado.</td></tr>
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
              {[
                { label: 'Nome do Item', key: 'nome', type: 'text' },
                { label: 'Fornecedor', key: 'fornecedor', type: 'text' },
                { label: 'Unidade (ex: caixa, seringa)', key: 'unidade', type: 'text' },
                { label: 'Quantidade Inicial', key: 'quantidade', type: 'number' },
                { label: 'Estoque Mínimo', key: 'minimo', type: 'number' },
                { label: 'Custo Unitário (R$)', key: 'custo', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">{f.label}</label>
                  <input type={f.type} value={(novoItem as any)[f.key]} onChange={e => setNovoItem(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Categoria</label>
                <select value={novoItem.categoria} onChange={e => setNovoItem(p => ({ ...p, categoria: e.target.value }))} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  {CATEGORIAS.filter(c => c !== 'Todos').map(c => <option key={c}>{c}</option>)}
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
