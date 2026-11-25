'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import { Eye, EyeOff, CheckCircle2, AlertCircle, Shield, User, Mail, ShieldCheck, KeyRound, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  admin_clinica: 'Admin da Clínica',
  dentista: 'Cirurgião-Dentista',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
}

function validarSenha(senha: string): string | null {
  if (senha.length < 8)       return 'A senha deve conter pelo menos 8 caracteres.'
  if (!/[A-Z]/.test(senha))   return 'A senha deve conter pelo menos uma letra maiúscula.'
  if (!/[a-z]/.test(senha))   return 'A senha deve conter pelo menos uma letra minúscula.'
  if (!/[0-9]/.test(senha))   return 'A senha deve conter pelo menos um número.'
  return null
}

export default function MinhaConta() {
  const { profile, session, refreshProfile } = useAuth()

  const [nome, setNome]                       = useState(profile?.nome || '')
  const [salvandoNome, setSalvandoNome]       = useState(false)

  const [novaSenha, setNovaSenha]             = useState('')
  const [confirmaSenha, setConfirmaSenha]     = useState('')
  const [mostrarNova, setMostrarNova]         = useState(false)
  const [mostrarConfirma, setMostrarConfirma] = useState(false)
  const [salvando, setSalvando]               = useState(false)
  const [sucesso, setSucesso]                 = useState(false)
  const [erro, setErro]                       = useState<string | null>(null)

  useEffect(() => {
    if (profile?.nome) {
      setNome(profile.nome)
    }
  }, [profile?.nome])

  async function atualizarNome() {
    if (!profile?.id) return
    if (!nome.trim()) {
      toast.error('O nome não pode ficar em branco.')
      return
    }
    setSalvandoNome(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ nome: nome.trim() })
        .eq('id', profile.id)

      if (error) {
        toast.error('Erro ao atualizar nome: ' + error.message)
      } else {
        await refreshProfile()
        toast.success('Nome de usuário atualizado com sucesso!')
      }
    } catch (err: any) {
      toast.error('Erro inesperado: ' + err.message)
    } finally {
      setSalvandoNome(false)
    }
  }

  async function alterarSenha() {
    setErro(null)
    setSucesso(false)

    if (!novaSenha) return setErro('Digite a nova senha.')

    const erroSenha = validarSenha(novaSenha)
    if (erroSenha) return setErro(erroSenha)

    if (novaSenha !== confirmaSenha)
      return setErro('As senhas não coincidem.')

    setSalvando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) {
        setErro(error.message)
      } else {
        setSucesso(true)
        setNovaSenha('')
        setConfirmaSenha('')
      }
    } catch (e: any) {
      setErro(e.message || 'Erro inesperado.')
    } finally {
      setSalvando(false)
    }
  }

  // Pega o email do supabase session
  const userEmail = session?.user?.email || ''

  return (
    <div className="flex flex-col w-full h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-[var(--bg-surface)] border-b border-[var(--border)]  shadow-sm shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Meu Perfil</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Gerencie suas informações pessoais e credenciais de acesso</p>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8">
        
        {/* Card 1: Informações Pessoais */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]  shadow-sm">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-6">
            <div className="p-2.5 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Dados do Usuário</h2>
              <p className="text-sm font-medium text-[var(--text-muted)] mt-0.5">Informações vinculadas à sua conta no sistema</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Nome Completo</label>
                {nome.trim() !== (profile?.nome || '') && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Alterações pendentes</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  className="flex-1 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                />
                <button
                  type="button"
                  onClick={atualizarNome}
                  disabled={salvandoNome || !nome.trim() || nome.trim() === (profile?.nome || '')}
                  className="px-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--border)] disabled:text-[var(--text-muted)] dark:disabled:bg-[var(--bg-surface)] dark:disabled:text-[var(--text-secondary)] text-[var(--on-primary)] rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                >
                  {salvandoNome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">E-mail de Acesso</label>
              <div className="relative">
                <input
                  type="email"
                  value={userEmail || 'carregando...'}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-bold text-[var(--text-secondary)] opacity-80 cursor-not-allowed"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Nível de Acesso (Perfil)</label>
              <div className="relative">
                <input
                  type="text"
                  value={ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? ''}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-bold text-[var(--text-secondary)] opacity-80 cursor-not-allowed"
                />
                <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--text-muted)]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">ID do Usuário</label>
              <input
                type="text"
                value={profile?.id || ''}
                disabled
                className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-xs font-mono font-bold text-[var(--text-muted)] opacity-80 cursor-not-allowed"
              />
            </div>
          </div>
        </section>

        {/* Card 2: Segurança */}
        <section id="seguranca" className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]  shadow-sm scroll-mt-6">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-6">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Alterar Senha</h2>
              <p className="text-sm font-medium text-[var(--text-muted)] mt-0.5">Mantenha sua conta segura atualizando sua senha periodicamente</p>
            </div>
          </div>

          <div className="max-w-md">
            {erro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-semibold">{erro}</p>
              </div>
            )}

            {sucesso && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 font-semibold">Sua senha foi alterada com sucesso!</p>
              </div>
            )}

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={mostrarNova ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-medium)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => { setNovaSenha(e.target.value); setErro(null); setSucesso(false) }}
                    disabled={salvando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNova(v => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {mostrarNova ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={mostrarConfirma ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-medium)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                    placeholder="••••••••"
                    value={confirmaSenha}
                    onChange={(e) => { setConfirmaSenha(e.target.value); setErro(null); setSucesso(false) }}
                    disabled={salvando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirma(v => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {mostrarConfirma ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Requisitos de Senha */}
            <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-2xl p-5 mb-8">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">Requisitos de Segurança</h4>
              <ul className="space-y-2.5">
                {[
                  { ok: novaSenha.length >= 8,         label: 'Mínimo de 8 caracteres' },
                  { ok: /[A-Z]/.test(novaSenha),       label: 'Pelo menos uma letra maiúscula' },
                  { ok: /[a-z]/.test(novaSenha),       label: 'Pelo menos uma letra minúscula' },
                  { ok: /[0-9]/.test(novaSenha),       label: 'Pelo menos um número' },
                  { ok: novaSenha === confirmaSenha && confirmaSenha.length > 0, label: 'As senhas coincidem' },
                ].map(({ ok, label }) => (
                  <li key={label} className="flex items-center gap-2">
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-[var(--border-medium)]  shrink-0 flex items-center justify-center bg-[var(--bg-surface)]" />
                    )}
                    <span className={`text-sm font-medium transition-colors ${ok ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={alterarSenha}
              disabled={salvando || !novaSenha || !confirmaSenha}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--border-medium)] disabled:text-[var(--text-primary)] disabled:shadow-none text-[var(--on-primary)] py-3.5 rounded-xl font-bold text-sm transition-all  flex items-center justify-center gap-2"
            >
              {salvando ? (
                <>
                  <div className="h-4 w-4 border-2 border-[var(--border)] border-t-transparent rounded-full animate-spin" />
                  Salvando alterações...
                </>
              ) : (
                'Atualizar Senha'
              )}
            </button>
          </div>
        </section>

      </main>
    </div>
  )
}
