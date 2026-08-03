'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, Search } from 'lucide-react'

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
  const { profile } = useAuth()

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

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Column 2: Context/Filters */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700/50 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-600 bg-slate-700">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Perfil</h2>
        </div>
        <div className="p-6 flex flex-col items-center border-b border-slate-600 text-center bg-slate-700">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold mb-3 border border-blue-200">
            {(profile?.nome || 'U').charAt(0).toUpperCase()}
          </div>
          <h3 className="text-sm font-bold text-slate-100">{profile?.nome || 'Usuário'}</h3>
          <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300 border border-slate-600">
            {ROLE_LABELS[profile?.role ?? ''] ?? profile?.role ?? '—'}
          </span>
        </div>

        <div className="p-4 space-y-4 bg-slate-700/50 flex-1">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID do Usuário</p>
            <p className="text-xs text-slate-100 font-mono break-all">{profile?.id ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nível de Acesso</p>
            <p className="text-xs font-semibold text-slate-100">{ROLE_LABELS[profile?.role ?? ''] ?? '—'}</p>
          </div>
        </div>
      </aside>

      {/* Column 3: Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <header className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0 gap-4">
          <Search className="h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar configurações..." 
            className="bg-transparent border-none focus:outline-none text-sm text-slate-100 w-full placeholder-slate-400" 
          />
        </header>

        <div className="flex-1 overflow-auto p-6">
          <h1 className="text-lg font-bold text-slate-100 mb-1">Alterar Senha</h1>
          <p className="text-xs text-slate-400 mb-6">A nova senha será aplicada imediatamente à sua conta.</p>

          <div className="max-w-sm">
            {erro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2.5 mb-5">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{erro}</p>
              </div>
            )}

            {sucesso && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2.5 mb-5">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 font-medium">Senha alterada com sucesso!</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nova Senha</label>
                <div className="relative">
                  <input
                    type={mostrarNova ? 'text' : 'password'}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => { setNovaSenha(e.target.value); setErro(null); setSucesso(false) }}
                    disabled={salvando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNova(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300"
                  >
                    {mostrarNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Confirmar Nova Senha</label>
                <div className="relative">
                  <input
                    type={mostrarConfirma ? 'text' : 'password'}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={confirmaSenha}
                    onChange={(e) => { setConfirmaSenha(e.target.value); setErro(null); setSucesso(false) }}
                    disabled={salvando}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirma(v => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300"
                  >
                    {mostrarConfirma ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <ul className="space-y-1.5 mb-6">
              {[
                { ok: novaSenha.length >= 8,         label: 'Mínimo de 8 caracteres' },
                { ok: /[A-Z]/.test(novaSenha),       label: 'Pelo menos uma letra maiúscula' },
                { ok: /[a-z]/.test(novaSenha),       label: 'Pelo menos uma letra minúscula' },
                { ok: /[0-9]/.test(novaSenha),       label: 'Pelo menos um número' },
                { ok: novaSenha === confirmaSenha && confirmaSenha.length > 0, label: 'Senhas coincidem' },
              ].map(({ ok, label }) => (
                <li key={label} className={`flex items-center gap-2 text-xs font-medium transition-colors ${ok ? 'text-green-600' : 'text-slate-400'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ok ? 'bg-green-500' : 'bg-slate-300'}`} />
                  {label}
                </li>
              ))}
            </ul>

            <button
              onClick={alterarSenha}
              disabled={salvando}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white py-2.5 rounded-md font-bold text-sm transition-colors"
            >
              {salvando ? 'Salvando...' : 'Atualizar Senha'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
