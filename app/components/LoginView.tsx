'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { logAuthAction } from '@/app/actions/audit'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { BrandMark } from './BrandLogo'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(false)
  const router = useRouter()

  async function login(e?: React.FormEvent) {
    if (e) e.preventDefault()

    if (!email || !senha) {
      alert('Por favor, preencha todos os campos.')
      return
    }
    setCarregando(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        alert(error.message)
      } else {
        if (data?.user?.id) {
          await logAuthAction('login', { email })
        }
        router.push('/overview')
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao realizar login')
    } finally {
      setCarregando(false)
    }
  }

  async function esqueceuSenha() {
    if (!email) {
      alert('Digite seu e-mail acima para receber o link de redefinição.')
      return
    }
    setEnviandoReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/definir-senha`,
      })
      if (error) {
        alert(error.message)
      } else {
        alert('Link de redefinição enviado para ' + email + '. Verifique sua caixa de entrada.')
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao enviar e-mail')
    } finally {
      setEnviandoReset(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex font-sans antialiased bg-[var(--bg-base)] text-[var(--text-primary)]">

      {/* Lado Esquerdo - Painel Institucional (Oculto em telas pequenas) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--primary-fill)] text-[var(--on-primary)] flex-col items-center justify-center relative overflow-hidden p-12">

        {/* Ilustração simplificada em destaque petróleo / neutro */}
        <div className="relative z-10 w-full max-w-sm aspect-square flex items-center justify-center">
          <div className="absolute w-72 h-72 rounded-full border border-[var(--on-primary)]/20 bg-[var(--on-primary)]/10" />
          <div className="absolute w-52 h-52 rounded-full border border-[var(--on-primary)]/15" />

          {/* Cartão minimalista representando agenda / painel da clínica */}
          <div className="relative z-10 w-60 rounded-2xl border border-[var(--on-primary)]/25 bg-[var(--on-primary)]/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-20 rounded-full bg-[var(--on-primary)]/40" />
              <div className="h-6 w-6 rounded-lg bg-[var(--on-primary)]/20" />
            </div>
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-[var(--on-primary)]/50 shrink-0" />
                <div className="h-2.5 flex-1 rounded-full bg-[var(--on-primary)]/30" />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-[var(--on-primary)]/35 shrink-0" />
                <div className="h-2.5 w-3/4 rounded-full bg-[var(--on-primary)]/25" />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-[var(--on-primary)]/35 shrink-0" />
                <div className="h-2.5 w-2/3 rounded-full bg-[var(--on-primary)]/25" />
              </div>
            </div>
          </div>
        </div>

        {/* Texto inferior */}
        <div className="relative z-10 mt-8 text-center">
          <p className="text-2xl font-bold tracking-tight text-[var(--on-primary)]">
            Acesse sua clínica
          </p>
          <p className="text-sm text-[var(--on-primary)]/85 mt-1.5">
            Gestão odontológica completa em um só lugar
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 bg-[var(--bg-base)] flex items-center justify-center p-4 sm:p-6 relative">

        <div className="w-full max-w-sm flex flex-col items-center">

          {/* Logo Centralizado */}
          <div className="mb-4">
            <BrandMark size="lg" className="w-16 h-16 rounded-2xl" />
          </div>

          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight">
            OdontoSoft
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-8 lg:hidden">
            Acesse sua clínica
          </p>
          <div className="hidden lg:block mb-8" />

          <form onSubmit={login} className="w-full space-y-4">

            {/* Campo E-mail */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <input
                type="email"
                required
                data-testid="input-login-email"
                disabled={carregando}
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Campo Senha */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[var(--text-secondary)]" />
              </div>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                data-testid="input-login-password"
                disabled={carregando}
                className="w-full pl-10 pr-10 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title={mostrarSenha ? 'Ocultar senha' : 'Visualizar senha'}
              >
                {mostrarSenha ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Esqueci a senha */}
            <div className="flex items-center justify-end text-sm py-1">
              <button
                type="button"
                onClick={esqueceuSenha}
                disabled={enviandoReset || carregando}
                className="text-[var(--primary)] font-medium hover:underline disabled:opacity-50 transition-all cursor-pointer"
              >
                {enviandoReset ? 'Enviando...' : 'Esqueci a senha?'}
              </button>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              data-testid="btn-login-submit"
              disabled={carregando}
              className="w-full bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] active:scale-[0.99] disabled:bg-[var(--border-medium)] disabled:text-[var(--text-primary)] text-[var(--on-primary)] py-3 rounded-lg font-semibold text-base transition-all mt-2 cursor-pointer"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>

            {/* Link de cadastro / trial */}
            <p className="text-center text-sm text-[var(--text-secondary)] pt-2">
              Ainda não tem conta?{' '}
              <Link
                href="/register"
                className="text-[var(--primary)] font-semibold hover:underline"
              >
                Teste grátis por 7 dias
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  )
}
