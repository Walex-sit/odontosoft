'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { logAction } from '../../lib/logger'
import { Search } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function Despesas() {
  const { session } = useAuth()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [despesas, setDespesas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  async function carregarDespesas() {
    try {
      const { data } = await supabase
        .from('despesas')
        .select('*')
        .order('created_at', { ascending: false })

      setDespesas(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarDespesa() {
    if (!descricao.trim() || !valor || !dataVencimento || !session?.user?.id) return

    try {
      await supabase.from('despesas').insert([
        {
          descricao,
          valor: Number(valor),
          categoria,
          data_vencimento: dataVencimento,
          status: 'pendente',
          user_id: session.user.id
        }
      ])

      if (session?.user?.id) {
        await logAction(session.user.id, 'financeiro', 'despesas', { descricao, valor: Number(valor), categoria, acao: 'despesa_criada' })
      }

      setDescricao('')
      setValor('')
      setCategoria('')
      setDataVencimento('')
      carregarDespesas()
    } catch (e) {
      alert('Erro ao registrar despesa')
    }
  }

  useEffect(() => {
    carregarDespesas()
  }, [])

  const filteredDespesas = despesas.filter(d => d.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  const total = despesas.reduce((acc, item) => acc + Number(item.valor), 0)

  return (
    <div className="flex w-full h-full overflow-hidden text-slate-100">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700 flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-slate-100">Nova Despesa</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Descrição</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              placeholder="Ex: Aluguel" 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Valor (R$)</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              placeholder="0.00" 
              type="number" 
              step="0.01" 
              min="0" 
              value={valor} 
              onChange={(e) => setValor(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Categoria</label>
            <select 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              value={categoria} 
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="aluguel">Aluguel</option>
              <option value="salarios">Salários</option>
              <option value="materiais">Materiais</option>
              <option value="equipamentos">Equipamentos</option>
              <option value="impostos">Impostos</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Vencimento</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500"
              value={dataVencimento} 
              onChange={(e) => setDataVencimento(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarDespesa} 
            disabled={!descricao.trim() || !valor || !dataVencimento}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Lançar Despesa
          </button>
        </div>
        <div className="p-4 border-t border-slate-600 bg-slate-700/50">
          <p className="text-xs font-bold text-slate-400 mb-1">Total Despesas</p>
          <p className="text-lg font-bold text-slate-100">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
          </p>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar despesas..." 
              className="w-full text-sm outline-none placeholder-slate-400 text-slate-100 bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Histórico de Despesas</h2>
          <table className="w-full border-collapse border border-slate-600 text-sm">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-600">
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Descrição</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Categoria</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Vencimento</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Status</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-100">Valor</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 border-b border-slate-600">Carregando...</td>
                </tr>
              ) : filteredDespesas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 border-b border-slate-600">Nenhuma despesa registrada.</td>
                </tr>
              ) : (
                filteredDespesas.map((d) => (
                  <tr key={d.id} className="border-b border-slate-600 hover:bg-slate-700/50">
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-100">{d.descricao}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300 capitalize">{d.categoria || '—'}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'pendente' ? 'bg-amber-100 text-amber-800' : 
                        d.status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {d.status || 'PENDENTE'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-100">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.valor))}
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
