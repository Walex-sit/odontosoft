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
    <SmoothScroll>
      <PageTransition>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            Visão Geral 👋
          </h2>
          <p className="text-slate-500 mt-1">
            Acompanhe os indicadores da sua clínica em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pacientes Cadastrados */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-100">
                  <Users className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">+12% mês</span>
              </div>
              <p className="text-slate-500 font-medium text-sm">Pacientes Cadastrados</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{pacientes}</h3>
            </div>
          </div>

          {/* Agendamentos de Hoje */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-indigo-100">
                  <Calendar className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">Hoje</span>
              </div>
              <p className="text-slate-500 font-medium text-sm">Agendamentos de Hoje</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{agendamentos}</h3>
            </div>
          </div>

          {/* Receita do Mês */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-100">
                  <TrendingUp className="h-6 w-6" strokeWidth={2} />
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">+8% mês</span>
              </div>
              <p className="text-slate-500 font-medium text-sm">Receita do Mês</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">R$ {(receitas * 150).toFixed(2)}</h3>
            </div>
          </div>

          {/* Despesas do Mês */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-red-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-red-100">
                  <TrendingDown className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
              <p className="text-slate-500 font-medium text-sm">Despesas do Mês</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">R$ {(despesas * 50).toFixed(2)}</h3>
            </div>
          </div>

          {/* Saldo Atual */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-teal-100">
                  <Wallet className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
              <p className="text-slate-500 font-medium text-sm">Saldo Atual</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">R$ {((receitas * 150) - (despesas * 50)).toFixed(2)}</h3>
            </div>
          </div>

          {/* Assinaturas Ativas */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:border-amber-300 hover:shadow-md transition-all duration-300 relative overflow-hidden group shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-amber-100">
                  <BookOpen className="h-6 w-6" strokeWidth={2} />
                </div>
              </div>
              <p className="text-slate-500 font-medium text-sm">Assinaturas Ativas (Planos)</p>
              <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{assinaturas}</h3>
            </div>
          </div>

        </div>
      </PageTransition>
    </SmoothScroll>
  )
}