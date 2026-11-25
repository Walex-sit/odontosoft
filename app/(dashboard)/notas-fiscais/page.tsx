'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Search } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function NotasFiscais() {
  const { session } = useAuth()
  const [receitas, setReceitas] = useState<any[]>([])
  const [notas, setNotas] = useState<any[]>([])
  const [receitaId, setReceitaId] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [valor, setValor] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  async function carregarDados() {
    try {
      const { data: recs } = await supabase.from('receitas').select('*').order('created_at', { ascending: false })
      setReceitas(recs || [])
      const { data: nts } = await supabase.from('notas_fiscais').select('*, receitas(descricao)').order('created_at', { ascending: false })
      setNotas(nts || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarNota() {
    if (!numeroNota.trim() || !valor || !dataEmissao || !session?.user?.id) return
    try {
      await supabase.from('notas_fiscais').insert([{ receita_id: receitaId || null, numero_nota: numeroNota, valor: Number(valor), data_emissao: dataEmissao, user_id: session.user.id }])
      setReceitaId(''); setNumeroNota(''); setValor(''); setDataEmissao('')
      carregarDados()
    } catch (e) {
      alert('Erro ao registrar nota fiscal')
    }
  }

  useEffect(() => { carregarDados() }, [])

  const filteredNotas = notas.filter(n => n.numero_nota.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex w-full h-full overflow-hidden text-[var(--text-primary)]">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Nova Nota Fiscal</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Receita Vinculada</label>
            <select 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              value={receitaId} 
              onChange={(e) => setReceitaId(e.target.value)}
            >
              <option value="">Selecione (opcional)</option>
              {receitas.map((r) => (<option key={r.id} value={r.id}>{r.descricao} - R$ {Number(r.valor).toFixed(2)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Nº da Nota</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              placeholder="Ex: NF-001" 
              value={numeroNota} 
              onChange={(e) => setNumeroNota(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Valor (R$)</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              type="number" 
              step="0.01" 
              min="0" 
              placeholder="0.00" 
              value={valor} 
              onChange={(e) => setValor(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Data de Emissão</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              value={dataEmissao} 
              onChange={(e) => setDataEmissao(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarNota} 
            disabled={!numeroNota.trim() || !valor || !dataEmissao}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Registrar NF
          </button>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar notas fiscais..." 
              className="w-full text-sm outline-none placeholder-[var(--text-secondary)] text-[var(--text-primary)] bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Notas Emitidas</h2>
          <table className="w-full border-collapse border border-[var(--border)] text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Nº da Nota</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Receita Vinculada</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Data Emissão</th>
                <th className="text-right py-2 px-3 font-semibold text-[var(--text-primary)]">Valor</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Carregando...</td>
                </tr>
              ) : filteredNotas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Nenhuma nota fiscal registrada.</td>
                </tr>
              ) : (
                filteredNotas.map((n) => (
                  <tr key={n.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface)]">
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-primary)] font-medium">{n.numero_nota}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{n.receitas?.descricao || '—'}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{n.data_emissao ? new Date(n.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 px-3 text-right font-medium text-[var(--text-primary)]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n.valor))}
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
