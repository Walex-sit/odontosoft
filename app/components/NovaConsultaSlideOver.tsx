'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchTeamMembers } from '@/app/actions/users'

interface NovaConsultaSlideOverProps {
  isOpen: boolean
  onClose: () => void
}

export default function NovaConsultaSlideOver({ isOpen, onClose }: NovaConsultaSlideOverProps) {
  const [loading, setLoading] = useState(false)
  const [dentistas, setDentistas] = useState<{ id: string; nome: string }[]>([])
  
  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers().then(res => {
        if (res.success && res.data) {
          const list = res.data.filter(u => u.role === 'dentista')
          setDentistas(list)
        }
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulating API call
    setTimeout(() => {
      setLoading(false)
      toast.success('Consulta agendada com sucesso!')
      onClose()
    }, 1000)
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[60] bg-[var(--bg-base)] transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-[var(--bg-surface)] shadow-md z-[70] flex flex-col transform transition-transform duration-300 ease-in-out border-l border-[var(--border)]">
        
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-[var(--text-primary)] font-bold text-lg">Nova Consulta</h2>
          <button 
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-surface)] p-1.5 rounded-md hover:bg-[var(--border-medium)] border border-[var(--border)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="nova-consulta-form" onSubmit={handleSalvar} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Paciente</label>
              <select 
                required
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
              >
                <option value="">Buscar paciente...</option>
                <option value="1">Carlos Silva</option>
                <option value="2">Mariana Costa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Profissional (Dentista)</label>
              <select 
                required
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
              >
                <option value="">Selecione o profissional...</option>
                {dentistas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Data</label>
                <input 
                  type="date" 
                  required
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Horário</label>
                <input 
                  type="time" 
                  required
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Procedimento</label>
              <select 
                required
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
              >
                <option value="">Selecione...</option>
                <option value="avaliacao">Avaliação Inicial</option>
                <option value="limpeza">Limpeza (Profilaxia)</option>
                <option value="manutencao">Manutenção de Aparelho</option>
              </select>
            </div>
            
          </form>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--bg-surface)] p-4 flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-transparent text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border-medium)] border border-[var(--border)] rounded-md text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="nova-consulta-form"
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[120px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agendar'}
          </button>
        </div>

      </div>
    </>
  )
}
