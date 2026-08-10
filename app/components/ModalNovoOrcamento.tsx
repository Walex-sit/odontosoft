'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ModalNovoOrcamentoProps {
  pacienteId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ModalNovoOrcamento({ pacienteId, isOpen, onClose, onSuccess }: ModalNovoOrcamentoProps) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim() || !valor) return

    setLoading(true)
    // Insere como uma cobrança pendente / orçamento vinculado ao paciente
    const { error } = await supabase.from('cobrancas').insert([
      {
        paciente_id: pacienteId,
        descricao: descricao.trim(),
        valor: parseFloat(valor),
        status: 'PENDENTE'
      }
    ])

    if (error) {
      toast.error('Erro ao criar orçamento: ' + error.message)
    } else {
      toast.success('Orçamento criado com sucesso!')
      setDescricao('')
      setValor('')
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Novo Orçamento / Tratamento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Descrição do Tratamento
            </label>
            <input
              type="text"
              placeholder="Ex: Implante dentário, Clareamento..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-blue-500/20 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Salvar Orçamento
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}