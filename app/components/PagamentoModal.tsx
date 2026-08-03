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
        className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm transition-opacity flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div 
          className="bg-slate-700 w-full max-w-[400px] rounded-xl shadow-2xl z-[70] flex flex-col border border-slate-600"
          onClick={e => e.stopPropagation()}
        >
          
          <div className="flex items-center justify-between p-5 border-b border-slate-600">
            <h2 className="text-slate-100 font-bold text-lg">Lançar Pagamento</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 transition-colors bg-slate-800 p-1.5 rounded-md hover:bg-slate-600 border border-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5">
            <form id="pagamento-form" onSubmit={handleSalvar} className="space-y-5">
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  <input 
                    type="radio" 
                    name="tipo"
                    checked={tipo === 'receita'}
                    onChange={() => setTipo('receita')}
                    className="text-blue-600 focus:ring-blue-500/50 bg-slate-800 border-slate-600"
                  />
                  Receita
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                  <input 
                    type="radio" 
                    name="tipo"
                    checked={tipo === 'despesa'}
                    onChange={() => setTipo('despesa')}
                    className="text-red-500 focus:ring-red-500/50 bg-slate-800 border-slate-600"
                  />
                  Despesa
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Categoria</label>
                <select 
                  required
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="consulta">Consulta/Procedimento</option>
                  <option value="material">Material de Consumo</option>
                  <option value="imposto">Impostos</option>
                  <option value="outro">Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                <textarea 
                  rows={2}
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500 resize-none"
                  placeholder="Detalhes do lançamento..."
                />
              </div>
              
            </form>
          </div>

          <div className="border-t border-slate-600 bg-slate-700/50 p-5 flex justify-end gap-3 rounded-b-xl">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent text-slate-300 hover:text-white hover:bg-slate-600 border border-slate-600 rounded-md text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              form="pagamento-form"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[150px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar Lançamento'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
