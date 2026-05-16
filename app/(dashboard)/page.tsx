'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const [pacientes, setPacientes] = useState(0)
  const [agendamentos, setAgendamentos] = useState(0)
  const [receitas, setReceitas] = useState(0)
  const [despesas, setDespesas] = useState(0)
  const [assinaturas, setAssinaturas] = useState(0)

  async function carregarDados() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) return

    // TODO: Ajustar consultas de acordo com a implementação final de RLS e queries reais

    const { data: pacientesData } = await supabase
      .from('pacientes')
      .select('*')
      .eq('user_id', userId)

    const { data: agendamentosData } = await supabase
      .from('agendamentos')
      .select('*')

    const { data: receitasData } = await supabase
      .from('receitas')
      .select('*')

    const { data: despesasData } = await supabase
      .from('despesas')
      .select('*')

    setPacientes(pacientesData?.length || 0)
    setAgendamentos(agendamentosData?.length || 0)
    setReceitas(receitasData?.length || 0)
    setDespesas(despesasData?.length || 0)
    setAssinaturas(0) // Mock por enquanto
  }

  useEffect(() => {
    carregarDados()
  }, [])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Visão Geral 👋
        </h2>
        <p className="text-slate-400 mt-1">
          Acompanhe os indicadores da sua clínica em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Pacientes Cadastrados */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-blue-900/30 text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">+12% mês</span>
            </div>
            <p className="text-slate-400 font-medium text-sm">Pacientes Cadastrados</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{pacientes}</h3>
          </div>
        </div>

        {/* Agendamentos de Hoje */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-indigo-900/30 text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-indigo-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-1 rounded-full">Hoje</span>
            </div>
            <p className="text-slate-400 font-medium text-sm">Agendamentos de Hoje</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{agendamentos}</h3>
          </div>
        </div>

        {/* Receita do Mês */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-emerald-900/30 text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">+8% mês</span>
            </div>
            <p className="text-slate-400 font-medium text-sm">Receita do Mês</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">R$ {(receitas * 150).toFixed(2)}</h3>
          </div>
        </div>

        {/* Despesas do Mês */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-red-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-red-900/30 text-red-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 font-medium text-sm">Despesas do Mês</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">R$ {(despesas * 50).toFixed(2)}</h3>
          </div>
        </div>

        {/* Saldo Atual */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-teal-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-teal-900/30 text-teal-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-teal-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 font-medium text-sm">Saldo Atual</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">R$ {((receitas * 150) - (despesas * 50)).toFixed(2)}</h3>
          </div>
        </div>

        {/* Assinaturas Ativas */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-amber-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-amber-900/30 text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-amber-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 font-medium text-sm">Assinaturas Ativas (Planos)</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{assinaturas}</h3>
          </div>
        </div>

      </div>
    </>
  )
}