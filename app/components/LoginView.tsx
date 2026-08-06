'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { logAction } from '../lib/logger'
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'

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
          await logAction(data.user.id, 'login', 'auth', { email })
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
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) {
        alert(error.message)
      } else {
        alert('Link de redefinição enviado para ' + email)
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao enviar e-mail')
    } finally {
      setEnviandoReset(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-200 flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
      
      {/* Card Principal */}
      <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 sm:p-10 flex flex-col items-center">
        
        {/* Logo Icon */}
        <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/20 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>

        {/* Título & Subtítulo */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight text-center">
          Acesso à <span className="text-emerald-500">OdontoSoft</span>
        </h1>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2 text-center">
          Entre com suas credenciais para continuar
        </p>

        {/* Formulário */}
        <form onSubmit={login} className="w-full mt-8 space-y-5">
          
          {/* Campo EMAIL */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              EMAIL
            </label>
            <input
              type="email"
              required
              disabled={carregando}
              className="w-full px-4 py-3 bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 focus:outline-none focus:bg-white dark:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              placeholder="seuemail@clinica.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Campo SENHA */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              SENHA
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                disabled={carregando}
                className="w-full pl-4 pr-11 py-3 bg-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 focus:outline-none focus:bg-white dark:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-300 transition-colors p-1"
                title={mostrarSenha ? 'Ocultar senha' : 'Visualizar senha'}
              >
                {mostrarSenha ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Link Esqueci Minha Senha */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={esqueceuSenha}
                disabled={enviandoReset || carregando}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
              >
                {enviandoReset ? 'Enviando link...' : 'Esqueci minha senha'}
              </button>
            </div>
          </div>

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] disabled:bg-emerald-300 text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all border-0 cursor-pointer mt-2"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

        </form>

        {/* Rodapé do Card */}
        <div className="w-full flex items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-medium text-center">
            Seus dados estão protegidos com segurança de ponta a ponta.
          </span>
        </div>

      </div>

    </div>
  )
}
