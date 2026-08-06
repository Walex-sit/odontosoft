'use client'

import { useState } from 'react'
import { X, Award, Printer } from 'lucide-react'
import { toast } from 'sonner'

interface AtestadoMedicoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AtestadoMedicoModal({ isOpen, onClose }: AtestadoMedicoModalProps) {
  const [paciente, setPaciente] = useState('')
  const [dias, setDias] = useState('1')
  const [cid, setCid] = useState('')
  const [motivo, setMotivo] = useState('necessidade de repouso para recuperação de procedimento odontológico')

  if (!isOpen) return null

  const handleGerar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!paciente || !dias) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }
    toast.success('Atestado odontológico gerado com sucesso!')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-indigo-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/30 rounded-xl">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Atestado Médico / Odontológico</h3>
              <p className="text-xs text-indigo-100 font-medium">Emissão oficial de atestados de afastamento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-500/40 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleGerar} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
              Nome do Paciente *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Eduardo de Sousa"
              value={paciente}
              onChange={(e) => setPaciente(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                Dias de Afastamento *
              </label>
              <input
                type="number"
                min="1"
                required
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                CID (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: K08.1"
                value={cid}
                onChange={(e) => setCid(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
              Motivo / Descrição
            </label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all"
            >
              <Printer className="h-4 w-4" /> Emitir & Imprimir
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
