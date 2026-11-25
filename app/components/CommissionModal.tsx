'use client'

import { useState, useEffect } from 'react'
import { X, Save, Percent } from 'lucide-react'
import { toast } from 'sonner'
import { fetchTeamMembers } from '@/app/actions/users'
import { fetchProcedures, setCommission } from '@/app/actions/commissions'

interface CommissionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CommissionModal({ isOpen, onClose, onSuccess }: CommissionModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [dentistas, setDentistas] = useState<any[]>([])
  const [procedimentos, setProcedimentos] = useState<any[]>([])

  const [formData, setFormData] = useState({
    dentista_id: '',
    procedimento_id: '',
    porcentagem: ''
  })

  // Carrega listas quando o modal abre
  useEffect(() => {
    if (isOpen) {
      loadData()
      // reset form
      setFormData({ dentista_id: '', procedimento_id: '', porcentagem: '' })
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [usersRes, procRes] = await Promise.all([
        fetchTeamMembers(),
        fetchProcedures()
      ])
      if (usersRes.success) {
        setDentistas(usersRes.data.filter(u => u.role === 'dentista'))
      }
      if (procRes.success) {
        setProcedimentos(procRes.data)
      }
    } catch (e) {
      console.error('Erro ao carregar dados do modal', e)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.dentista_id || !formData.procedimento_id || !formData.porcentagem) {
      toast.error('Preencha todos os campos.')
      return
    }

    const pct = parseFloat(formData.porcentagem)
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error('A porcentagem deve ser um número entre 0 e 100.')
      return
    }

    setIsSaving(true)
    
    try {
      const res = await setCommission({
        dentista_id: formData.dentista_id,
        procedimento_id: formData.procedimento_id,
        porcentagem: pct
      })
      
      if (res.success) {
        toast.success('Comissão configurada com sucesso!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Erro ao configurar a comissão.')
      }
    } catch (error) {
      toast.error('Ocorreu um erro inesperado ao salvar a comissão.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)]">
      <div className="bg-[var(--bg-surface)] rounded-[24px] shadow-md w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-base)] dark:bg-[var(--bg-base)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-xl">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Nova Comissão</h2>
              <p className="text-sm font-semibold text-[var(--text-muted)]">Defina o % repassado ao dentista</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border)]/50 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Dentista</label>
              <select
                required
                value={formData.dentista_id}
                onChange={e => setFormData(p => ({ ...p, dentista_id: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all appearance-none"
              >
                <option value="">Selecione um dentista...</option>
                {dentistas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Procedimento</label>
              <select
                required
                value={formData.procedimento_id}
                onChange={e => setFormData(p => ({ ...p, procedimento_id: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all appearance-none"
              >
                <option value="">Selecione um procedimento...</option>
                {procedimentos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Porcentagem (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={formData.porcentagem}
                onChange={e => setFormData(p => ({ ...p, porcentagem: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                placeholder="Ex: 15.5"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-base)] dark:bg-[var(--bg-base)] mt-auto flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]/50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-green-500/20"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-[var(--bg-surface)] border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
