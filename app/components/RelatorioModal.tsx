'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RelatorioModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RelatorioModal({ isOpen, onClose }: RelatorioModalProps) {
  const [loading, setLoading] = useState(false)
  
  if (!isOpen) return null

  async function handleExportar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulating API call
    setTimeout(() => {
      setLoading(false)
      toast.success('Relatório exportado com sucesso!')
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
            <h2 className="text-slate-100 font-bold text-lg">Gerar Relatório</h2>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 transition-colors bg-slate-800 p-1.5 rounded-md hover:bg-slate-600 border border-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5">
            <form id="relatorio-form" onSubmit={handleExportar} className="space-y-5">
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Relatório</label>
                <select 
                  required
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="financeiro">Financeiro (Receitas e Despesas)</option>
                  <option value="pacientes">Lista de Pacientes</option>
                  <option value="agendamentos">Agendamentos e Consultas</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data Inicial</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data Final</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
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
              form="relatorio-form"
              disabled={loading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[120px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Exportar'}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
