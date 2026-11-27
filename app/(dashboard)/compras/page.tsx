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
    <div className="flex w-full h-full overflow-hidden text-[var(--text-primary)]">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Nova Compra</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Fornecedor</label>
            <select 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
              value={fornecedorId} 
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">Selecione (opcional)</option>
              {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Descrição</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
              placeholder="Ex: Resina composta" 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Valor Total (R$)</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
              type="number" 
              step="0.01" 
              min="0" 
              placeholder="0.00" 
              value={valorTotal} 
              onChange={(e) => setValorTotal(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Data da Compra</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
              value={dataCompra} 
              onChange={(e) => setDataCompra(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarCompra} 
            disabled={!descricao.trim() || !valorTotal || !dataCompra}
            className="w-full bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Registrar Compra
          </button>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar compras..." 
              className="w-full text-sm outline-none placeholder-[var(--text-secondary)] text-[var(--text-primary)] bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Histórico de Compras</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse border border-[var(--border)] text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Descrição</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Fornecedor</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Data</th>
                <th className="text-right py-2 px-3 font-semibold text-[var(--text-primary)]">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Carregando...</td>
                </tr>
              ) : filteredCompras.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Nenhuma compra registrada.</td>
                </tr>
              ) : (
                filteredCompras.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface)]">
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-primary)]">{c.descricao}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{c.fornecedores?.nome || '—'}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{c.data_compra ? new Date(c.data_compra + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 px-3 text-right font-medium text-[var(--text-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(c.valor_total))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </div>
  )
}
