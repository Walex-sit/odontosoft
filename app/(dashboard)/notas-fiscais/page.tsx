'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, ReceiptText, ListFilter } from 'lucide-react'

export default function NotasFiscais() {
  const [receitas, setReceitas] = useState<any[]>([])
  const [notas, setNotas] = useState<any[]>([])
  const [receitaId, setReceitaId] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [valor, setValor] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')
  const [carregando, setCarregando] = useState(true)

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
    if (!numeroNota.trim() || !valor || !dataEmissao) return
    const { data: userData } = await supabase.auth.getUser()
    try {
      await supabase.from('notas_fiscais').insert([{ receita_id: receitaId || null, numero_nota: numeroNota, valor: Number(valor), data_emissao: dataEmissao, user_id: userData.user?.id }])
      setReceitaId(''); setNumeroNota(''); setValor(''); setDataEmissao('')
      carregarDados()
    } catch (e) {
      alert('Erro ao registrar nota fiscal')
    }
  }

  useEffect(() => { carregarDados() }, [])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-105">Notas Fiscais</h2>
        <p className="text-slate-400 mt-1 text-sm">Registro e controle de notas fiscais emitidas</p>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-105 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-400" />
          Nova Nota Fiscal
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Receita Vinculada</label>
            <select className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" value={receitaId} onChange={(e) => setReceitaId(e.target.value)}>
              <option value="" className="bg-slate-900 text-slate-400">Selecione (opcional)</option>
              {receitas.map((r) => (<option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">{r.descricao} - R$ {Number(r.valor).toFixed(2)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nº da Nota</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" placeholder="Ex: NF-001" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor (R$)</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" type="number" step="0.01" min="0" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data de Emissão</label>
            <input type="date" className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
          </div>
          <button onClick={salvarNota} className="w-full bg-blue-600 hover:bg-blue-505 text-white px-6 py-2.5 rounded-xl transition-all font-bold text-sm h-[42px] border border-blue-500 shadow-sm flex items-center justify-center shrink-0 active:scale-95">
            Registrar NF
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-105">Notas Emitidas</h3>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : notas.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-900 text-slate-550 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <ReceiptText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhuma nota fiscal registrada</h3>
            <p className="text-slate-400 text-sm">Registre a primeira nota acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Nota</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Receita Vinculada</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Emissão</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {notas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-200 text-sm">{n.numero_nota}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{n.receitas?.descricao || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{n.data_emissao ? new Date(n.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-450">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
