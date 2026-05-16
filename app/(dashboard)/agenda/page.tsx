'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Agenda() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])

  const [pacienteId, setPacienteId] = useState('')
  const [dataConsulta, setDataConsulta] = useState('')
  const [horaConsulta, setHoraConsulta] = useState('')

  async function carregarPacientes() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .eq('user_id', userData.user.id)

    setPacientes(data || [])
  }

  async function carregarAgendamentos() {
    const { data } = await supabase
      .from('agendamentos')
      .select(`
        *,
        pacientes(nome)
      `)
      .order('data_consulta', { ascending: true })

    setAgendamentos(data || [])
  }

  async function salvarAgendamento() {
    if (!pacienteId || !dataConsulta || !horaConsulta) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    await supabase.from('agendamentos').insert([
      {
        paciente_id: pacienteId,
        data_consulta: dataConsulta,
        hora_consulta: horaConsulta
      }
    ])

    setPacienteId('')
    setDataConsulta('')
    setHoraConsulta('')

    carregarAgendamentos()
  }

  useEffect(() => {
    carregarPacientes()
    carregarAgendamentos()
  }, [])

  const eventos = agendamentos.map((a) => ({
    title: a.pacientes?.nome || 'Consulta',
    date: a.data_consulta,
    color: '#3b82f6'
  }))

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Agenda da Clínica</h2>
          <p className="text-slate-400 mt-1">Gerencie os horários e agendamentos</p>
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Novo Agendamento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Paciente</label>
            <select
              className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="" className="text-slate-500">Selecione o paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id} className="text-white bg-slate-800">
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Data</label>
            <input
              type="date"
              className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
              value={dataConsulta}
              onChange={(e) => setDataConsulta(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Horário</label>
            <input
              type="time"
              className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all"
              value={horaConsulta}
              onChange={(e) => setHoraConsulta(e.target.value)}
            />
          </div>

          <button
            onClick={salvarAgendamento}
            className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm h-[42px] border border-blue-500"
          >
            Agendar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendário Mensal
          </h3>
          
          <div className="calendar-container dark-calendar">
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              events={eventos}
              height="auto"
              locale="pt-br"
              buttonText={{ today: 'Hoje' }}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth'
              }}
            />
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-fit">
          <h3 className="text-lg font-bold text-white mb-4">
            Próximas consultas
          </h3>

          {agendamentos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 font-medium text-sm">Nenhuma consulta agendada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agendamentos.map((a) => (
                <div
                  key={a.id}
                  className="border border-slate-700 rounded-xl p-4 flex justify-between items-center hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <p className="font-bold text-white text-sm">
                      {a.pacientes?.nome || 'Paciente não encontrado'}
                    </p>
                    <div className="flex items-center text-slate-400 text-xs mt-1 font-medium gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(a.data_consulta).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <div className="font-bold text-blue-400 bg-blue-900/30 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs">
                    {a.hora_consulta}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}