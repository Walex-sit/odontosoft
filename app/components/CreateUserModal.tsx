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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)] animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] rounded-[28px] shadow-md w-full max-w-md overflow-hidden flex flex-col border border-[var(--border)]/80 ">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-base)] dark:bg-[var(--bg-base)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-2xl border border-[var(--primary)]/40  shadow-2xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-[var(--text-primary)]">
                Novo Membro da Equipe
              </h2>
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                Convide dentistas, recepcionistas ou administradores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border)]/50 dark:hover:bg-[var(--bg-surface)] rounded-full transition-colors"
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
              <h3 className="text-lg font-heading font-extrabold text-[var(--text-primary)]">
                Convite Gerado com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
                O colaborador <strong className="text-[var(--text-primary)]">{formData.nome}</strong> foi registrado na clínica com o cargo <strong className="text-[var(--primary)]">{formData.role}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] rounded-2xl border border-[var(--border)] text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Link de Primeiro Acesso (Definir Senha)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteSuccessLink}
                  className="flex-1 bg-transparent text-xs text-[var(--text-secondary)] truncate outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinishInvite}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] font-bold text-sm py-3 rounded-2xl transition-all"
            >
              Concluir
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="p-6 space-y-4">
              
              {/* Seletor de Modo: Convite vs Senha Manual */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] rounded-2xl border border-[var(--border)]/60 ">
                <button
                  type="button"
                  onClick={() => setMode('invite')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    mode === 'invite'
                      ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-2xs border border-[var(--border)]/80 '
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] '
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
                      ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-2xs border border-[var(--border)]/80 '
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] '
                  }`}
                >
                  <Key className="h-3.5 w-3.5" />
                  Senha Manual
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                  placeholder="Ex: Dra. Mariana Costa"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  E-mail Profissional
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                  placeholder="Ex: mariana@odontosoft.com"
                />
              </div>

              {mode === 'manual' && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Senha Provisória
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-10 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                      placeholder="Mínimo de 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Cargo / Função (Permissões RBAC)
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all cursor-pointer"
                >
                  <option value="dentista">Dentista (Atendimento &amp; Prontuário)</option>
                  <option value="recepcao">Recepção (Agenda &amp; Pacientes)</option>
                  <option value="financeiro">Financeiro (Fluxo de Caixa &amp; Comissões)</option>
                  <option value="admin">Administrador da Clínica (Acesso Completo)</option>
                </select>
              </div>

              {formData.role === 'dentista' && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    Especialidade
                  </label>
                  <input
                    type="text"
                    value={formData.especialidade || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, especialidade: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                    placeholder="Ex: Ortodontia, Implantodontia..."
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-base)] dark:bg-[var(--bg-base)] mt-auto flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]/50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-[var(--on-primary)] px-5 py-2.5 rounded-xl font-bold text-xs transition-all  active:scale-95"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-[var(--bg-surface)] border-t-transparent rounded-full animate-spin" />
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
