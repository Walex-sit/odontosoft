'use client'

import { useState } from 'react'
import { X, Save, UserPlus, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createUserAccount } from '@/app/actions/users'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'dentista',
    especialidade: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setIsSaving(true)
    
    try {
      const res = await createUserAccount(formData)
      
      if (res.success) {
        toast.success('Usuário criado com sucesso!')
        setFormData({ nome: '', email: '', password: '', role: 'dentista', especialidade: '' })
        onSuccess()
        onClose()
      } else {
        toast.error(res.error || 'Erro ao criar o usuário.')
      }
    } catch (error) {
      toast.error('Ocorreu um erro inesperado ao criar o usuário.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Novo Usuário</h2>
              <p className="text-sm font-semibold text-slate-500">Cadastre um membro da equipe</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Ex: João da Silva"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Ex: joao@odontosoft.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Mínimo de 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Função / Perfil</label>
              <select
                required
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
              >
                <option value="admin">Administrador</option>
                <option value="dentista">Dentista</option>
                <option value="recepcao">Recepção</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>

            {formData.role === 'dentista' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Especialidade</label>
                <input
                  type="text"
                  value={formData.especialidade || ''}
                  onChange={e => setFormData(p => ({ ...p, especialidade: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Ex: Ortodontia, Clínico Geral..."
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
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
                  Criando...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Criar Usuário
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
