'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PagamentoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PagamentoModal({ isOpen, onClose }: PagamentoModalProps) {
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita')
  
  if (!isOpen) return null

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulating API call
    setTimeout(() => {
      setLoading(false)
      toast.success('Lançamento registrado com sucesso!')
      onClose()
    }, 1000)
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[60] bg-[var(--bg-base)] transition-opacity flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[var(--bg-surface)] w-full max-w-[400px] rounded-xl shadow-md z-[70] flex flex-col border border-[var(--border)]"
          onClick={e => e.stopPropagation()}
        >
          
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="text-[var(--text-primary)] font-bold text-lg">Lançar Pagamento</h2>
            <button 
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-surface)] p-1.5 rounded-md hover:bg-[var(--border-medium)] border border-[var(--border)]"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5">
            <form id="pagamento-form" onSubmit={handleSalvar} className="space-y-5">
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <input 
                    type="radio" 
                    name="tipo"
                    checked={tipo === 'receita'}
                    onChange={() => setTipo('receita')}
                    className="text-[var(--primary)] focus:ring-[var(--primary)]/20 bg-[var(--bg-surface)] border-[var(--border)]"
                  />
                  Receita
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  <input 
                    type="radio" 
                    name="tipo"
                    checked={tipo === 'despesa'}
                    onChange={() => setTipo('despesa')}
                    className="text-red-500 focus:ring-red-500/50 bg-[var(--bg-surface)] border-[var(--border)]"
                  />
                  Despesa
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all placeholder-[var(--text-secondary)]"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Categoria</label>
                <select 
                  required
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="consulta">Consulta/Procedimento</option>
                  <option value="material">Material de Consumo</option>
                  <option value="imposto">Impostos</option>
                  <option value="outro">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Descrição</label>
                <textarea 
                  rows={2}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all placeholder-[var(--text-secondary)] resize-none"
                  placeholder="Detalhes do lançamento..."
                />
              </div>
              
            </form>
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--bg-surface)] p-5 flex justify-end gap-3 rounded-b-xl">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border-medium)] border border-[var(--border)] rounded-md text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              form="pagamento-form"
              disabled={loading}
              className="px-6 py-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[150px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar Lançamento'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
