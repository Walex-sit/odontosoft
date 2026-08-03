'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import { Filter, Users, Calendar as CalendarIcon, Plus } from 'lucide-react'
import NovoAgendamentoModal from '../../components/NovoAgendamentoModal'
import DetalhesAgendamentoModal from '../../components/DetalhesAgendamentoModal'
import { toast } from 'sonner'

export default function Agenda() {
  const { session } = useAuth()
  const [pacientes, setPacientes] = useState<any[]>([])
  const [dentistas, setDentistas] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [filtroDentista, setFiltroDentista] = useState('')
  const calendarRef = useRef<FullCalendar>(null)

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false)
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false)
  
  const [initialDate, setInitialDate] = useState('')
  const [initialTime, setInitialTime] = useState('')
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null)

  async function carregarDados() {
    setCarregando(true)
    
    // Carrega Pacientes
    const { data: pacs } = await supabase.from('pacientes').select('*')
    setPacientes(pacs || [])

    // Carrega Dentistas (perfis com role dentista)
    const { data: dents } = await supabase.from('user_profiles').select('*').eq('role', 'dentista')
    setDentistas(dents || [])

    // Carrega Agendamentos
    let query = supabase
      .from('agendamentos')
      .select('*, pacientes(nome, telefone), dentistas:user_profiles!dentista_id(nome)')
    
    if (filtroDentista) {
      query = query.eq('dentista_id', filtroDentista)
    }
    
    const { data: agends } = await query
    setAgendamentos(agends || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregarDados()
  }, [filtroDentista])

  const statusColors: any = {
    agendado: '#3b82f6', // blue-500
    confirmado: '#22c55e', // green-500
    espera: '#eab308', // yellow-500
    atendido: '#a855f7', // purple-500
    cancelado: '#ef4444' // red-500
  }

  const eventos = agendamentos.map((a) => {
    let start = `${a.data_consulta}T${a.hora_consulta}`
    let end = a.hora_fim ? `${a.data_consulta}T${a.hora_fim}` : start

    return {
      id: a.id,
      title: `${a.pacientes?.nome || 'Consulta'}${a.procedimento ? ` - ${a.procedimento}` : ''}`,
      start,
      end,
      backgroundColor: statusColors[a.status || 'agendado'],
      borderColor: 'transparent',
      extendedProps: { ...a }
    }
  })

  function handleDateClick(info: any) {
    // Se clicou na visão de mês (sem hora), ou na de tempo (com hora)
    const data = info.dateStr.split('T')[0]
    const hora = info.dateStr.split('T')[1] ? info.dateStr.split('T')[1].substring(0, 5) : ''
    
    setInitialDate(data)
    setInitialTime(hora)
    setIsNovoModalOpen(true)
  }

  function handleEventClick(info: any) {
    setAgendamentoSelecionado(info.event.extendedProps)
    setIsDetalhesModalOpen(true)
  }

  return (
    <div className="flex w-full h-full overflow-hidden text-slate-800 font-sans text-sm bg-slate-50">
      
      {/* Sidebar: Filtros */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col h-full shrink-0 shadow-sm z-10">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-heading font-extrabold text-slate-800">Agenda</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Gerenciamento de consultas</p>
        </div>

        <div className="p-6">
          <button 
            onClick={() => { setInitialDate(''); setInitialTime(''); setIsNovoModalOpen(true); }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 mb-6"
          >
            <Plus size={16} /> Novo Agendamento
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            <Filter size={14} /> Filtros Rápidos
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-2">
                <Users size={14} className="text-slate-400" /> Dentista Responsável
              </label>
              <select 
                value={filtroDentista}
                onChange={(e) => setFiltroDentista(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Todos os Dentistas</option>
                {dentistas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-3">Legenda de Status</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-xs font-medium">Agendado</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-xs font-medium">Confirmado</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-xs font-medium">Na Espera</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div><span className="text-xs font-medium">Atendido</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs font-medium">Cancelado</span></div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content: Calendário */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 relative min-w-0">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="flex-1 bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 custom-calendar">
              <style dangerouslySetInnerHTML={{__html: `
                .custom-calendar .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 800 !important; color: #1e293b !important; }
                .custom-calendar .fc-button-primary { background-color: #f1f5f9 !important; border-color: transparent !important; color: #475569 !important; font-weight: 600 !important; border-radius: 0.5rem !important; text-transform: capitalize !important; }
                .custom-calendar .fc-button-primary:not(:disabled):active, .custom-calendar .fc-button-primary:not(:disabled).fc-button-active { background-color: #2563eb !important; color: white !important; }
                .custom-calendar .fc-theme-standard th { border-color: #e2e8f0; padding: 8px 0; font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
                .custom-calendar .fc-theme-standard td { border-color: #e2e8f0; }
                .custom-calendar .fc-event { border-radius: 6px; padding: 2px 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
                .custom-calendar .fc-event:hover { opacity: 0.85; }
                .custom-calendar .fc-v-event { border: none !important; }
                .custom-calendar .fc-daygrid-event { margin-top: 2px; }
              `}} />
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                events={eventos}
                height="100%"
                locale="pt-br"
                buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' }}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                }}
                slotMinTime="07:00:00"
                slotMaxTime="20:00:00"
                slotDuration="00:30:00"
                allDaySlot={false}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                nowIndicator={true}
                dayMaxEvents={true}
              />
            </div>
          </div>
        </div>
      </main>

      <NovoAgendamentoModal 
        isOpen={isNovoModalOpen}
        onClose={() => setIsNovoModalOpen(false)}
        onSuccess={carregarDados}
        pacientes={pacientes}
        dentistas={dentistas}
        initialDate={initialDate}
        initialTime={initialTime}
      />

      <DetalhesAgendamentoModal
        isOpen={isDetalhesModalOpen}
        onClose={() => setIsDetalhesModalOpen(false)}
        onSuccess={carregarDados}
        agendamento={agendamentoSelecionado}
      />
    </div>
  )
}