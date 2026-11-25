'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ModalAlterarCartaoProps {
  isOpen: boolean
  onClose: () => void
}

export default function ModalAlterarCartao({ isOpen, onClose }: ModalAlterarCartaoProps) {
  const [loading, setLoading] = useState(false)
  
  if (!isOpen) return null

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Novo cartão salvo com sucesso!')
      onClose()
    }, 1000)
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-base)] p-4"
        onClick={onClose}
      >
        <div 
          className="bg-[var(--bg-surface)] w-full max-w-[400px] p-6 rounded-xl border border-[var(--border)] shadow-md flex flex-col relative"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[var(--text-primary)] font-bold text-lg">Atualizar Método de Pagamento</h2>
            <button 
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-surface)] p-1.5 rounded-md hover:bg-[var(--border-medium)] border border-[var(--border)]"
            >
              <X size={18} />
            </button>
          </div>

          <form id="alterar-cartao-form" onSubmit={handleSalvar} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome no Cartão</label>
              <input 
                type="text" 
                required
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all placeholder-[var(--text-secondary)] uppercase"
                placeholder="NOME IMPRESSO NO CARTÃO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Número do Cartão</label>
              <input 
                type="text" 
                required
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all placeholder-[var(--text-secondary)]"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Validade</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all placeholder-[var(--text-secondary)]"
                  placeholder="MM/AA"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">CVV</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all placeholder-[var(--text-secondary)]"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 mt-4">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-transparent text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border-medium)] border border-[var(--border)] rounded-md text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[170px]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Novo Cartão'}
              </button>
            </div>
            
          </form>

        </div>
      </div>
    </>
  )
}
