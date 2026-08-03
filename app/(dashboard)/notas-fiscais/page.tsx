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
    <div className="flex w-full h-full overflow-hidden text-slate-100">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700 flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-slate-100">Nova Nota Fiscal</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Receita Vinculada</label>
            <select 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              value={receitaId} 
              onChange={(e) => setReceitaId(e.target.value)}
            >
              <option value="">Selecione (opcional)</option>
              {receitas.map((r) => (<option key={r.id} value={r.id}>{r.descricao} - R$ {Number(r.valor).toFixed(2)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Nº da Nota</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              placeholder="Ex: NF-001" 
              value={numeroNota} 
              onChange={(e) => setNumeroNota(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Valor (R$)</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              type="number" 
              step="0.01" 
              min="0" 
              placeholder="0.00" 
              value={valor} 
              onChange={(e) => setValor(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Data de Emissão</label>
            <input 
              type="date" 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              value={dataEmissao} 
              onChange={(e) => setDataEmissao(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarNota} 
            disabled={!numeroNota.trim() || !valor || !dataEmissao}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Registrar NF
          </button>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar notas fiscais..." 
              className="w-full text-sm outline-none placeholder-slate-400 text-slate-100 bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Notas Emitidas</h2>
          <table className="w-full border-collapse border border-slate-600 text-sm">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-600">
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Nº da Nota</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Receita Vinculada</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Data Emissão</th>
                <th className="text-right py-2 px-3 font-semibold text-slate-100">Valor</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 border-b border-slate-600">Carregando...</td>
                </tr>
              ) : filteredNotas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 border-b border-slate-600">Nenhuma nota fiscal registrada.</td>
                </tr>
              ) : (
                filteredNotas.map((n) => (
                  <tr key={n.id} className="border-b border-slate-600 hover:bg-slate-700/50">
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-100 font-medium">{n.numero_nota}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{n.receitas?.descricao || '—'}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{n.data_emissao ? new Date(n.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-100">
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
