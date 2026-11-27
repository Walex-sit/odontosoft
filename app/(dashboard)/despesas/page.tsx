'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { logClientAction } from '@/app/actions/audit'
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
        await logClientAction('financeiro', 'despesas', { descricao, valor: Number(valor), categoria, acao: 'despesa_criada' })
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
    <div className="flex w-full h-full overflow-hidden text-[var(--text-primary)]">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Nova Despesa</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Descrição</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
              placeholder="Ex: Aluguel" 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Valor (R$)</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
              placeholder="0.00" 
              type="number" 
              step="0.01" 
              min="0" 
              value={valor} 
              onChange={(e) => setValor(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Categoria</label>
            <select 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
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
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Vencimento</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40"
              value={dataVencimento} 
              onChange={(e) => setDataVencimento(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarDespesa} 
            disabled={!descricao.trim() || !valor || !dataVencimento}
            className="w-full bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Lançar Despesa
          </button>
        </div>
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-surface)]">
          <p className="text-xs font-bold text-[var(--text-muted)] mb-1">Total Despesas</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
          </p>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar despesas..." 
              className="w-full text-sm outline-none placeholder-[var(--text-secondary)] text-[var(--text-primary)] bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Histórico de Despesas</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse border border-[var(--border)] text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Descrição</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Categoria</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Vencimento</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Status</th>
                <th className="text-right py-2 px-3 font-semibold text-[var(--text-primary)]">Valor</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Carregando...</td>
                </tr>
              ) : filteredDespesas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Nenhuma despesa registrada.</td>
                </tr>
              ) : (
                filteredDespesas.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface)]">
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-primary)]">{d.descricao}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)] capitalize">{d.categoria || '—'}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{d.data_vencimento ? new Date(d.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        d.status === 'pendente' ? 'bg-amber-100 text-amber-800' : 
                        d.status === 'pago' ? 'bg-emerald-100 text-emerald-800' : 
                        'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                      }`}>
                        {d.status || 'PENDENTE'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-[var(--text-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(d.valor))}
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
