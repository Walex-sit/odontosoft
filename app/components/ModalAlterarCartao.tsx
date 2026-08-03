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
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div 
          className="bg-slate-700 w-full max-w-[400px] p-6 rounded-xl border border-slate-600 shadow-2xl flex flex-col relative"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-slate-100 font-bold text-lg">Atualizar Método de Pagamento</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 transition-colors bg-slate-800 p-1.5 rounded-md hover:bg-slate-600 border border-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <form id="alterar-cartao-form" onSubmit={handleSalvar} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome no Cartão</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500 uppercase"
                placeholder="NOME IMPRESSO NO CARTÃO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Número do Cartão</label>
              <input 
                type="text" 
                required
                className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Validade</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  placeholder="MM/AA"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">CVV</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 mt-4">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-transparent text-slate-300 hover:text-white hover:bg-slate-600 border border-slate-600 rounded-md text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[170px]"
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
