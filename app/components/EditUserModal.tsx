'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { toast } from 'sonner'
import { updateUserAccount } from '@/app/actions/users'

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  user: { id: string; nome: string; email: string; role: string; especialidade?: string } | null
}

export default function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({ nome: '', role: 'dentista', especialidade: '' })

  // Sincroniza os dados do usuário selecionado sempre que o modal abrir
  useEffect(() => {
    if (isOpen && user) {
      setFormData({ nome: user.nome, role: user.role, especialidade: user.especialidade || '' })
    }
  }, [isOpen, user])

  if (!isOpen || !user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const res = await updateUserAccount({ id: user.id, nome: formData.nome, role: formData.role, especialidade: formData.especialidade })

      if (res.success) {
        toast.success('Usuário atualizado com sucesso!')
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Erro ao atualizar o usuário.')
      }
    } catch {
      toast.error('Erro inesperado ao atualizar o usuário.')
    } finally {
      setIsSaving(false)
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    dentista: 'Dentista',
    recepcao: 'Recepção',
    financeiro: 'Financeiro',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)]">
      <div className="bg-[var(--bg-surface)] rounded-[24px] shadow-md w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-base)] dark:bg-[var(--bg-base)] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Editar Usuário</h2>
            <p className="text-sm font-semibold text-[var(--text-muted)] truncate max-w-[260px]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border)]/50 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.nome || ''}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                E-mail (não editável)
              </label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-muted)] outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Função / Perfil
              </label>
              <select
                required
                value={formData.role || ''}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all appearance-none"
              >
                <option value="admin">Administrador</option>
                <option value="dentista">Dentista</option>
                <option value="recepcao">Recepção</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>

            {formData.role === 'dentista' && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Especialidade</label>
                <input
                  type="text"
                  value={formData.especialidade || ''}
                  onChange={e => setFormData(p => ({ ...p, especialidade: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                  placeholder="Ex: Ortodontia, Clínico Geral..."
                />
              </div>
            )}
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
              className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--border-medium)] disabled:text-[var(--text-primary)] text-[var(--on-primary)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all "
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-[var(--bg-surface)] border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
