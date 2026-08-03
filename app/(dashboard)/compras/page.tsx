'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Search } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function Compras() {
  const { session } = useAuth()
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [dataCompra, setDataCompra] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  async function carregarDados() {
    try {
      const { data: forns } = await supabase.from('fornecedores').select('*')
      setFornecedores(forns || [])
      const { data: comps } = await supabase.from('compras').select('*, fornecedores(nome)').order('created_at', { ascending: false })
      setCompras(comps || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarCompra() {
    if (!descricao.trim() || !valorTotal || !dataCompra || !session?.user?.id) return
    
    try {
      await supabase.from('compras').insert([{ fornecedor_id: fornecedorId || null, descricao, valor_total: Number(valorTotal), data_compra: dataCompra, user_id: session.user.id }])
      setFornecedorId(''); setDescricao(''); setValorTotal(''); setDataCompra('')
      carregarDados()
    } catch (e) {
      alert('Erro ao registrar compra')
    }
  }

  useEffect(() => { carregarDados() }, [])

  const filteredCompras = compras.filter(c => c.descricao.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex w-full h-full overflow-hidden text-slate-100">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700 flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-slate-100">Nova Compra</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Fornecedor</label>
            <select 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              value={fornecedorId} 
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">Selecione (opcional)</option>
              {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Descrição</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              placeholder="Ex: Resina composta" 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Valor Total (R$)</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              type="number" 
              step="0.01" 
              min="0" 
              placeholder="0.00" 
              value={valorTotal} 
              onChange={(e) => setValorTotal(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Data da Compra</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              value={dataCompra} 
              onChange={(e) => setDataCompra(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarCompra} 
            disabled={!descricao.trim() || !valorTotal || !dataCompra}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Registrar Compra
          </button>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar compras..." 
              className="w-full text-sm outline-none placeholder-slate-400 text-slate-100 bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Histórico de Compras</h2>
          <table className="w-full border-collapse border border-slate-600 text-sm">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-600">
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Descrição</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Fornecedor</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Data</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-100">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 border-b border-slate-600">Carregando...</td>
                </tr>
              ) : filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 border-b border-slate-600">Nenhuma compra registrada.</td>
                </tr>
              ) : (
                filteredCompras.map((c) => (
                  <tr key={c.id} className="border-b border-slate-600 hover:bg-slate-700/50">
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-100">{c.descricao}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{c.fornecedores?.nome || '—'}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{c.data_compra ? new Date(c.data_compra + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.valor_total))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
