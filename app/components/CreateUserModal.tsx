'use client'

import { useState } from 'react'
import { X, Save, UserPlus, Eye, EyeOff, Mail, Key, Copy, Check, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createUserAccount, inviteTeamMember } from '@/app/actions/users'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'invite' | 'manual'>('invite')
  const [inviteSuccessLink, setInviteSuccessLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'dentista',
    especialidade: '',
  })

  if (!isOpen) return null

  const handleCopyLink = () => {
    if (inviteSuccessLink) {
      navigator.clipboard.writeText(inviteSuccessLink)
      setCopied(true)
      toast.success('Link de convite copiado para a área de transferência!')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'manual' && formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setIsSaving(true)

    try {
      if (mode === 'invite') {
        const res = await inviteTeamMember({
          nome: formData.nome,
          email: formData.email,
          role: formData.role,
          especialidade: formData.especialidade,
        })

        if (res.success) {
          toast.success(`Convite gerado com sucesso para ${formData.nome}!`)
          if (res.inviteLink) {
            setInviteSuccessLink(res.inviteLink)
          } else {
            onSuccess()
            onClose()
          }
        } else {
          toast.error(res.error || 'Erro ao enviar convite.')
        }
      } else {
        const res = await createUserAccount(formData)
        if (res.success) {
          toast.success('Usuário criado com sucesso!')
          setFormData({ nome: '', email: '', password: '', role: 'dentista', especialidade: '' })
          onSuccess()
          onClose()
        } else {
          toast.error(res.error || 'Erro ao criar o usuário.')
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro inesperado.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFinishInvite = () => {
    setInviteSuccessLink(null)
    setFormData({ nome: '', email: '', password: '', role: 'dentista', especialidade: '' })
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-2xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-slate-800 dark:text-slate-100">
                Novo Membro da Equipe
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Convide dentistas, recepcionistas ou administradores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal de sucesso com link de convite copiado */}
        {inviteSuccessLink ? (
          <div className="p-7 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-extrabold text-slate-900 dark:text-white">
                Convite Gerado com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                O colaborador <strong className="text-slate-800 dark:text-slate-200">{formData.nome}</strong> foi registrado na clínica com o cargo <strong className="text-blue-600">{formData.role}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Link de Primeiro Acesso (Definir Senha)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteSuccessLink}
                  className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-300 truncate outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishInvite}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm py-3 rounded-2xl transition-all shadow-sm"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="p-6 space-y-4">
              
              {/* Seletor de Modo: Convite vs Senha Manual */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setMode('invite')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    mode === 'invite'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Send className="h-3.5 w-3.5" />
                  Enviar Convite
                </button>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    mode === 'manual'
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Key className="h-3.5 w-3.5" />
                  Senha Manual
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Ex: Dra. Mariana Costa"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  E-mail Profissional
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Ex: mariana@odontosoft.com"
                />
              </div>

              {mode === 'manual' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Senha Provisória
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Mínimo de 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Cargo / Função (Permissões RBAC)
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="dentista">Dentista (Atendimento &amp; Prontuário)</option>
                  <option value="recepcao">Recepção (Agenda &amp; Pacientes)</option>
                  <option value="financeiro">Financeiro (Fluxo de Caixa &amp; Comissões)</option>
                  <option value="admin">Administrador da Clínica (Acesso Completo)</option>
                </select>
              </div>

              {formData.role === 'dentista' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Especialidade
                  </label>
                  <input
                    type="text"
                    value={formData.especialidade || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, especialidade: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Ex: Ortodontia, Implantodontia..."
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 mt-auto flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-200/50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </span>
                ) : mode === 'invite' ? (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Convite
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Criar Usuário
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
