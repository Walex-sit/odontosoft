'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabaseClient'
import { Lock, CheckCircle2, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

function DefinirSenhaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('A nova palavra-passe deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas digitadas não coincidem.')
      return
    }

    setLoading(true)

    try {
      // Atualiza a senha no Supabase Auth para a sessão ativa (estabelecida via invite token)
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        toast.error(error.message || 'Erro ao definir senha. Verifique se o convite ainda é válido.')
      } else {
        setIsSuccess(true)
        toast.success('Senha definida com sucesso! Redirecionando...')
        setTimeout(() => router.push('/overview'), 1500)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao salvar a senha.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-emerald-100 shadow-xl max-w-md w-full">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
          Acesso Configurado!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Sua senha foi salva e as permissões da clínica foram ativadas com sucesso.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando no OdontoSoft...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center mx-auto mb-3.5 border border-blue-100 dark:border-blue-900/40 shadow-2xs">
          <ShieldCheck size={24} />
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight">
          Definir Palavra-passe
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Bem-vindo(a) ao OdontoSoft. Crie sua senha de acesso para ingressar na equipe da clínica.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {emailParam && (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              E-mail Convidado
            </label>
            <input
              type="email"
              disabled
              value={emailParam}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold text-slate-500 cursor-not-allowed"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Nova Palavra-passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full pl-4 pr-11 py-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Confirmar Palavra-passe
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a palavra-passe"
            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm py-3 px-5 rounded-2xl shadow-sm shadow-blue-500/25 transition-all active:scale-[0.99] mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando senha...
            </>
          ) : (
            <>
              <Lock size={15} />
              Ativar Minha Conta
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            Já possui acesso configurado? Ir para Login
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function DefinirSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-500 font-bold">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            Carregando convite...
          </div>
        }
      >
        <DefinirSenhaForm />
      </Suspense>
    </div>
  )
}
