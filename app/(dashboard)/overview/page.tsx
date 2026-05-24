'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import PageTransition from '../../components/PageTransition'
import SmoothScroll from '../../components/SmoothScroll'
import { Users, Calendar, TrendingUp, TrendingDown, Wallet, BookOpen } from 'lucide-react'

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
    <SmoothScroll>
      <PageTransition>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-100">
            Visão Geral 👋
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            Acompanhe os indicadores da sua clínica em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pacientes Cadastrados */}
          <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-650 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-500/20">
                  <Users className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">+12% mês</span>
              </div>
              <p className="text-slate-400 font-medium text-sm">Pacientes Cadastrados</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">{pacientes}</h3>
            </div>
          </div>

          {/* Agendamentos de Hoje */}
          <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-650 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-500/20">
                  <Calendar className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-slate-300 bg-slate-700 border border-slate-600 px-2.5 py-1 rounded-full">Hoje</span>
              </div>
              <p className="text-slate-400 font-medium text-sm">Agendamentos de Hoje</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">{agendamentos}</h3>
            </div>
          </div>

          {/* Receita do Mês */}
          <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-650 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-emerald-500/20">
                  <TrendingUp className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">+8% mês</span>
              </div>
              <p className="text-slate-400 font-medium text-sm">Receita do Mês</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">R$ {(receitas * 150).toFixed(2)}</h3>
            </div>
          </div>

          {/* Despesas do Mês */}
          <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-650 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-red-500/20">
                  <TrendingDown className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
              <p className="text-slate-400 font-medium text-sm">Despesas do Mês</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">R$ {(despesas * 50).toFixed(2)}</h3>
            </div>
          </div>

          {/* Saldo Atual */}
          <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-650 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-teal-500/10 text-teal-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-teal-500/20">
                  <Wallet className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
              <p className="text-slate-400 font-medium text-sm">Saldo Atual</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">R$ {((receitas * 150) - (despesas * 50)).toFixed(2)}</h3>
            </div>
          </div>

          {/* Assinaturas Ativas */}
          <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col justify-between hover:border-slate-650 transition-all duration-300 relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-amber-500/20">
                  <BookOpen className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
              <p className="text-slate-400 font-medium text-sm">Assinaturas Ativas (Planos)</p>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-1">{assinaturas}</h3>
            </div>
          </div>

        </div>
      </PageTransition>
    </SmoothScroll>
  )
}