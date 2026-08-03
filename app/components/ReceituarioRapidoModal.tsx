'use client'

import { useState } from 'react'
import { X, FileText, Printer, Send } from 'lucide-react'
import { toast } from 'sonner'

interface ReceituarioRapidoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ReceituarioRapidoModal({ isOpen, onClose }: ReceituarioRapidoModalProps) {
  const [paciente, setPaciente] = useState('')
  const [medicamento, setMedicamento] = useState('')
  const [posologia, setPosologia] = useState('')
  const [observacoes, setObservacoes] = useState('')

  if (!isOpen) return null

  const handleGerar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!paciente || !medicamento) {
      toast.error('Preencha os campos obrigatórios (Paciente e Medicamento).')
      return
    }
    toast.success('Receita gerada e pronta para impressão!')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/30 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Receituário Rápido</h3>
              <p className="text-xs text-blue-100 font-medium">Emissão ágil de receitas odontológicas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-blue-500/40 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleGerar} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Paciente *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Ana Maria Silva"
              value={paciente}
              onChange={(e) => setPaciente(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Medicamento & Dosagem *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Amoxicilina 500mg (21 cápsulas)"
              value={medicamento}
              onChange={(e) => setMedicamento(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Posologia / Modo de Uso
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Tomar 1 cápsula de 8 em 8 horas durante 7 dias."
              value={posologia}
              onChange={(e) => setPosologia(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações Adicionais
            </label>
            <input
              type="text"
              placeholder="Ex: Tomar preferencialmente após as refeições."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-all"
            >
              <Printer className="h-4 w-4" /> Gerar & Imprimir
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
