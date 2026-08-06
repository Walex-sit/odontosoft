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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Editar Usuário</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[260px]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.nome || ''}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                E-mail (não editável)
              </label>
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-400 outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Função / Perfil
              </label>
              <select
                required
                value={formData.role || ''}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="admin">Administrador</option>
                <option value="dentista">Dentista</option>
                <option value="recepcao">Recepção</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>

            {formData.role === 'dentista' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Especialidade</label>
                <input
                  type="text"
                  value={formData.especialidade || ''}
                  onChange={e => setFormData(p => ({ ...p, especialidade: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Ex: Ortodontia, Clínico Geral..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 dark:bg-slate-950 mt-auto flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
