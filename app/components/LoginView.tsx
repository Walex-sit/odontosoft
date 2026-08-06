'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { logAction } from '../lib/logger'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [lembrar, setLembrar] = useState(false)
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
    <div className="min-h-screen w-full flex font-sans antialiased">
      
      {/* Lado Esquerdo - Ilustração (Oculto em telas pequenas) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1258b8] flex-col items-center justify-center relative overflow-hidden">
        
        {/* Círculos de fundo */}
        <div className="absolute w-[500px] h-[500px] bg-[#1a66cc] rounded-full mix-blend-multiply opacity-50 blur-2xl"></div>
        <div className="absolute w-[400px] h-[400px] bg-[#0c4a9e] rounded-full mix-blend-multiply opacity-50 blur-3xl bottom-0 translate-y-1/2"></div>
        
        {/* Ilustração e Bolhas (Representação) */}
        <div className="relative z-10 w-full max-w-md aspect-square flex items-center justify-center">
          {/* Círculo Principal atrás do médico */}
          <div className="absolute w-[350px] h-[350px] bg-[#1964d4] rounded-full shadow-2xl"></div>
          
          {/* Bolhas flutuantes com gráficos */}
          <div className="absolute top-1/4 right-10 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform -translate-y-4">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <div className="absolute top-1/2 right-4 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="18" y="3" width="4" height="18"></rect><rect x="10" y="8" width="4" height="13"></rect><rect x="2" y="13" width="4" height="8"></rect></svg>
          </div>
          <div className="absolute bottom-1/4 right-10 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform translate-y-4">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>

          {/* Bolha flutuante da esquerda (App) */}
          <div className="absolute top-1/4 left-0 w-24 h-32 bg-white rounded-lg shadow-xl flex flex-col p-2 space-y-2 transform -rotate-3">
            <div className="w-full h-3 bg-slate-200 rounded"></div>
            <div className="flex gap-2 items-center">
              <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
              <div className="w-12 h-2 bg-slate-200 rounded"></div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
              <div className="w-10 h-2 bg-slate-200 rounded"></div>
            </div>
          </div>

          {/* Médico Placeholder (Substituindo a imagem complexa por um avatar estilizado) */}
          <div className="relative z-20 translate-y-8">
             <svg width="250" height="250" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
        </div>

        {/* Textos inferiores */}
        <div className="relative z-10 mt-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wide">Odontosoft</h1>
          <p className="text-blue-200 text-lg">Bem-vindo novamente</p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 bg-[#f4f7fa] flex items-center justify-center p-6 relative">
        
        {/* Brilho decorativo fundo */}
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white rounded-full mix-blend-overlay opacity-30 blur-xl"></div>
        
        <div className="w-full max-w-sm flex flex-col items-center">
          
          {/* Logo Customizado */}
          <div className="mb-4">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 10 H50 C 75 10, 90 30, 90 50 C 90 70, 75 90, 50 90 H20 Z" stroke="#1258b8" strokeWidth="8" fill="transparent"/>
              {/* Estetoscópio simulado */}
              <circle cx="50" cy="40" r="15" stroke="#1258b8" strokeWidth="6" fill="transparent"/>
              <path d="M50 55 V75" stroke="#1258b8" strokeWidth="6"/>
              <circle cx="65" cy="75" r="8" fill="#1258b8"/>
              <path d="M30 40 V50 C30 60, 40 70, 50 70" stroke="#1258b8" strokeWidth="4" fill="transparent"/>
            </svg>
          </div>
          
          <h2 className="text-3xl font-extrabold text-[#113a77] mb-10 tracking-tight">Odontosoft</h2>

          <form onSubmit={login} className="w-full space-y-4">
            
            {/* Campo E-mail */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                disabled={carregando}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-[#1258b8] focus:ring-1 focus:ring-[#1258b8] transition-all shadow-sm"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Campo Senha */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                disabled={carregando}
                className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-[#1258b8] focus:ring-1 focus:ring-[#1258b8] transition-all shadow-sm"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                title={mostrarSenha ? 'Ocultar senha' : 'Visualizar senha'}
              >
                {mostrarSenha ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Lembrar e Esqueci Senha */}
            <div className="flex items-center justify-between text-sm py-2">
              <label className="flex items-center text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                <input 
                  type="checkbox" 
                  className="mr-2 rounded border-gray-300 text-[#1258b8] focus:ring-[#1258b8]"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                />
                Lembrar de mim
              </label>
              <button
                type="button"
                onClick={esqueceuSenha}
                disabled={enviandoReset || carregando}
                className="text-[#1258b8] font-medium hover:underline disabled:opacity-50 transition-all"
              >
                {enviandoReset ? 'Enviando...' : 'Esqueci a senha?'}
              </button>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-[#1e88e5] hover:bg-[#1565c0] active:scale-[0.99] disabled:bg-[#90caf9] text-white py-3 rounded-lg font-semibold text-base shadow-md transition-all mt-4"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
            
          </form>
        </div>
      </div>
    </div>
  )
}

