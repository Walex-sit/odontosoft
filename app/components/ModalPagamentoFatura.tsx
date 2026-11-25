'use client'

import { useState } from 'react'
import { X, Loader2, CreditCard, QrCode, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface Fatura {
  id: string
  valor: number
}

interface ModalPagamentoFaturaProps {
  isOpen: boolean
  onClose: () => void
  fatura: Fatura | null
}

export default function ModalPagamentoFatura({ isOpen, onClose, fatura }: ModalPagamentoFaturaProps) {
  const [loading, setLoading] = useState(false)
  const [metodo, setMetodo] = useState<'cartao' | 'pix' | 'boleto'>('cartao')
  
  if (!isOpen || !fatura) return null

  async function handleConfirmar() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success(`Pagamento da fatura ${fatura?.id} concluído com sucesso!`)
      onClose()
    }, 1200)
  }

  const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fatura.valor)

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
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[var(--text-primary)] font-bold text-lg">Pagamento de Fatura</h2>
            <button 
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-surface)] p-1.5 rounded-md hover:bg-[var(--border-medium)] border border-[var(--border)]"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-[var(--text-muted)] mb-6">Fatura {fatura.id} &middot; <strong className="text-[var(--text-primary)]">{valorFormatado}</strong></p>

          <div className="space-y-3 mb-6">
            
            <button 
              onClick={() => setMetodo('cartao')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                metodo === 'cartao' 
                  ? 'bg-[var(--bg-surface)] border-[var(--primary)] ring-1 ring-[var(--primary)]' 
                  : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--border-medium)]'
              }`}
            >
              <div className={`p-2 rounded-md ${metodo === 'cartao' ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'bg-[var(--bg-base)] text-[var(--text-secondary)]'}`}>
                <CreditCard size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Cartão de Crédito</h4>
                <p className="text-xs text-[var(--text-secondary)]">Terminado em 4321</p>
              </div>
            </button>

            <button 
              onClick={() => setMetodo('pix')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                metodo === 'pix' 
                  ? 'bg-[var(--bg-surface)] border-[var(--primary)] ring-1 ring-[var(--primary)]' 
                  : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--border-medium)]'
              }`}
            >
              <div className={`p-2 rounded-md ${metodo === 'pix' ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'bg-[var(--bg-base)] text-[var(--text-secondary)]'}`}>
                <QrCode size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Pix (QR Code)</h4>
                <p className="text-xs text-[var(--text-secondary)]">Aprovação imediata</p>
              </div>
            </button>

            <button 
              onClick={() => setMetodo('boleto')}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                metodo === 'boleto' 
                  ? 'bg-[var(--bg-surface)] border-[var(--primary)] ring-1 ring-[var(--primary)]' 
                  : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--border-medium)]'
              }`}
            >
              <div className={`p-2 rounded-md ${metodo === 'boleto' ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' : 'bg-[var(--bg-base)] text-[var(--text-secondary)]'}`}>
                <FileText size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Boleto Bancário</h4>
                <p className="text-xs text-[var(--text-secondary)]">Até 3 dias úteis para compensar</p>
              </div>
            </button>

          </div>

          <div className="pt-2 flex justify-end gap-3 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border-medium)] border border-[var(--border)] rounded-md text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirmar}
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[170px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Pagamento'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
