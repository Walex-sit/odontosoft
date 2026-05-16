'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { logAction } from '../lib/logger'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const router = useRouter()

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      alert(error.message)
    } else {
      await logAction('login', 'auth', { email })
      router.push('/pacientes')
    }
  }

  async function registrar() {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (error) {
      alert(error.message)
    } else {
      alert('Conta criada com sucesso!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-100 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-blue-100">
        
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            OS
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mt-4">
            Odonto<span className="text-blue-600">SaaS</span>
          </h1>

          <p className="text-gray-500 mt-2">
            Acesse sua clínica
          </p>
        </div>

        <div className="space-y-4">
         <input
  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="E-mail"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

<input
  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
  type="password"
  placeholder="Senha"
  value={senha}
  onChange={(e) => setSenha(e.target.value)}
/>
          <button
            onClick={login}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            Entrar
          </button>

          <button
            onClick={registrar}
            className="w-full border border-blue-600 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition"
          >
            Criar conta
          </button>
        </div>
      </div>
    </div>
  )
}