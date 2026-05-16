'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function NotasFiscais() {
  const [receitas, setReceitas] = useState<any[]>([])
  const [notas, setNotas] = useState<any[]>([])
  const [receitaId, setReceitaId] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [valor, setValor] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')

  async function carregarDados() {
    const { data: recs } = await supabase.from('receitas').select('*').order('created_at', { ascending: false })
    setReceitas(recs || [])
    const { data: nts } = await supabase.from('notas_fiscais').select('*, receitas(descricao)').order('created_at', { ascending: false })
    setNotas(nts || [])
  }

  async function salvarNota() {
    if (!numeroNota.trim() || !valor || !dataEmissao) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('notas_fiscais').insert([{ receita_id: receitaId || null, numero_nota: numeroNota, valor: Number(valor), data_emissao: dataEmissao, user_id: userData.user?.id }])
    setReceitaId(''); setNumeroNota(''); setValor(''); setDataEmissao('')
    carregarDados()
  }

  useEffect(() => { carregarDados() }, [])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Notas Fiscais</h2>
        <p className="text-slate-400 mt-1">Registro e controle de notas fiscais emitidas</p>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Nova Nota Fiscal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Receita Vinculada</label>
            <select className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" value={receitaId} onChange={(e) => setReceitaId(e.target.value)}>
              <option value="">Selecione (opcional)</option>
              {receitas.map((r) => (<option key={r.id} value={r.id}>{r.descricao} - R$ {Number(r.valor).toFixed(2)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Nº da Nota</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" placeholder="Ex: NF-001" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Valor (R$)</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" type="number" step="0.01" min="0" placeholder="0.00" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Data de Emissão</label>
            <input type="date" className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
          </div>
          <button onClick={salvarNota} className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 transition-all font-bold text-sm h-[42px] border border-blue-500">
            Registrar NF
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Notas Emitidas</h3>
        </div>
        {notas.length === 0 ? (
          <div className="text-center py-16"><h3 className="text-lg font-bold text-white mb-1">Nenhuma nota fiscal registrada</h3><p className="text-slate-400">Registre a primeira nota acima.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nº Nota</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Receita Vinculada</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Emissão</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {notas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white text-sm">{n.numero_nota}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden sm:table-cell">{n.receitas?.descricao || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{n.data_emissao ? new Date(n.data_emissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n.valor))}</td>
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
