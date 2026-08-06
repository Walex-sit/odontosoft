'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import { Eye, EyeOff, CheckCircle2, AlertCircle, Shield, User, Mail, ShieldCheck, KeyRound } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  dentista: 'Dentista',
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
  const { profile, session } = useAuth()

  const [novaSenha, setNovaSenha]             = useState('')
  const [confirmaSenha, setConfirmaSenha]     = useState('')
  const [mostrarNova, setMostrarNova]         = useState(false)
  const [mostrarConfirma, setMostrarConfirma] = useState(false)
  const [salvando, setSalvando]               = useState(false)
  const [sucesso, setSucesso]                 = useState(false)
  const [erro, setErro]                       = useState<string | null>(null)

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
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Meu Perfil</h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Gerencie suas informações pessoais e credenciais de acesso</p>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-8">
        
        {/* Card 1: Informações Pessoais */}
        <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Dados do Usuário</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Informações vinculadas à sua conta no sistema</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
              <input
                type="text"
                value={profile?.nome || ''}
                disabled
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 opacity-80 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">E-mail de Acesso</label>
              <div className="relative">
                <input
                  type="email"
                  value={userEmail || 'carregando...'}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 opacity-80 cursor-not-allowed"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nível de Acesso (Perfil)</label>
              <div className="relative">
                <input
                  type="text"
                  value={ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? ''}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 opacity-80 cursor-not-allowed"
                />
                <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ID do Usuário</label>
              <input
                type="text"
                value={profile?.id || ''}
                disabled
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-500 dark:text-slate-400 opacity-80 cursor-not-allowed"
              />
            </div>
          </div>
        </section>

        {/* Card 2: Segurança */}
        <section className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Alterar Senha</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Mantenha sua conta segura atualizando sua senha periodicamente</p>
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
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Nova Senha</label>
                <div className="relative">
                  <input
                    type={mostrarNova ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => { setNovaSenha(e.target.value); setErro(null); setSucesso(false) }}
                    disabled={salvando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNova(v => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {mostrarNova ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={mostrarConfirma ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={confirmaSenha}
                    onChange={(e) => { setConfirmaSenha(e.target.value); setErro(null); setSucesso(false) }}
                    disabled={salvando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirma(v => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {mostrarConfirma ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Requisitos de Senha */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-8">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3">Requisitos de Segurança</h4>
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
                      <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 flex items-center justify-center bg-white dark:bg-slate-800" />
                    )}
                    <span className={`text-sm font-medium transition-colors ${ok ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={alterarSenha}
              disabled={salvando || !novaSenha || !confirmaSenha}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 dark:text-slate-400 disabled:shadow-none text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {salvando ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
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
