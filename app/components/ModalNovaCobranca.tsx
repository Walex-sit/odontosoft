'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ModalNovaCobrancaProps {
  pacienteId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ModalNovaCobranca({ pacienteId, isOpen, onClose, onSuccess }: ModalNovaCobrancaProps) {
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim() || !valor) return

    setLoading(true)
    const { error } = await supabase.from('cobrancas').insert([
      {
        paciente_id: pacienteId,
        descricao: descricao.trim(),
        valor: parseFloat(valor),
        status: 'PENDENTE'
      }
    ])

    if (error) {
      toast.error('Erro ao gerar cobrança: ' + error.message)
    } else {
      toast.success('Cobrança gerada com sucesso!')
      setDescricao('')
      setValor('')
      onSuccess()
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] p-6 rounded-2xl w-full max-w-md shadow-md border border-[var(--border)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Gerar Nova Cobrança</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]  transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Consulta, Limpeza, Aparelho..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border-medium)]  rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-green-500/20 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Salvar Cobrança
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}