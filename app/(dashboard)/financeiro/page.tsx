'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { logAction } from '../../lib/logger'
import { DollarSign, Plus, ListFilter } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function Financeiro() {
  const { session } = useAuth()
  const router = useRouter()
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [receitas, setReceitas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  async function carregarReceitas() {
    try {
      const { data } = await supabase
        .from('receitas')
        .select('*')
        .order('created_at', { ascending: false })

      setReceitas(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarReceita() {
    if (!descricao.trim() || !valor) return

    try {
      await supabase.from('receitas').insert([
        {
          descricao,
          valor: Number(valor),
          status: 'pendente'
        }
      ])

      await logAction('financeiro', 'receitas', { descricao, valor: Number(valor), acao: 'receita_criada' })

      setDescricao('')
      setValor('')

      carregarReceitas()
    } catch (e) {
      alert('Erro ao lançar receita')
    }
  }

  useEffect(() => {
    if (session) {
      carregarReceitas()
    } else if (session === null) {
      setCarregando(false)
    }
  }, [session])

  const total = receitas.reduce(
    (acc, item) => acc + Number(item.valor),
    0
  )

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Receitas</h2>
          <p className="text-slate-400 mt-1 text-sm">Controle financeiro da clínica</p>
        </div>

        {/* Card do Resumo Financeiro */}
        <div className="bg-slate-800 px-6 py-3.5 rounded-2xl border border-slate-700/50 flex items-center gap-4 w-full sm:w-auto shadow-sm">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Receitas</p>
            <p className="text-xl font-extrabold text-emerald-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </p>
          </div>
        </div>
      </div>

      {/* Formulário de Nova Receita */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-400" />
          Nova Receita
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição</label>
            <input
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm"
              placeholder="Ex: Tratamento Ortodôntico"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-2">Valor (R$)</label>
            <input
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm"
              placeholder="0,00"
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <button
            onClick={salvarReceita}
            className="w-full bg-blue-600 hover:bg-blue-505 text-white px-6 py-2.5 rounded-xl transition-all font-bold text-sm h-[42px] border border-blue-500 shadow-sm flex items-center justify-center shrink-0 active:scale-95"
          >
            Lançar Receita
          </button>
        </div>
      </div>

      {/* Histórico de Receitas */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ListFilter className="h-5 w-5 text-slate-400" />
            Histórico de Receitas
          </h3>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : receitas.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-900 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <DollarSign className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhuma receita lançada</h3>
            <p className="text-slate-400 text-sm">Comece a registrar as receitas da clínica.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {receitas.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-200 text-sm">{r.descricao}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        r.status === 'pendente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        r.status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        'bg-slate-900 text-slate-450 border border-slate-750'
                      }`}>
                        {r.status ? r.status.toUpperCase() : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-emerald-450">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.valor))}
                    </td>
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