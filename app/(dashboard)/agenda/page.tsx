'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../components/RequireAuth'
import { Filter, Users, Calendar as CalendarIcon, Plus, X } from 'lucide-react'
import NovoAgendamentoModal from '../../components/NovoAgendamentoModal'
import DetalhesAgendamentoModal from '../../components/DetalhesAgendamentoModal'
import { toast } from 'sonner'

export default function Agenda() {
  const { session } = useAuth()
  const [pacientes, setPacientes] = useState<any[]>([])
  const [dentistas, setDentistas] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros e Estado Mobile
  const [filtroDentista, setFiltroDentista] = useState('')
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const calendarRef = useRef<FullCalendar>(null)

  // Modais
  const [isNovoModalOpen, setIsNovoModalOpen] = useState(false)
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false)
  
  const [initialDate, setInitialDate] = useState('')
  const [initialTime, setInitialTime] = useState('')
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<any>(null)

  // Tooltip Informativo no Hover
  const [hoveredInfo, setHoveredInfo] = useState<{
    data: any;
    x: number;
    y: number;
  } | null>(null)

  async function carregarDados() {
    setCarregando(true)
    
    // Carrega Pacientes
    const { data: pacs } = await supabase.from('pacientes').select('*')
    setPacientes(pacs || [])

    // Carrega Dentistas (perfis com role dentista)
    const { data: dents } = await supabase.from('user_profiles').select('*').eq('role', 'dentista')
    setDentistas(dents || [])

    // Carrega Agendamentos com fallback gracioso se o JOIN no PostgREST falhar
    let query = supabase
      .from('agendamentos')
      .select('*, pacientes(nome, telefone), dentistas:user_profiles!dentista_id(nome)')
    
    if (filtroDentista) {
      query = query.eq('dentista_id', filtroDentista)
    }
    
    let { data: agends, error: agendErr } = await query

    if (agendErr) {
      console.warn('Busca com JOIN falhou, executando fallback simples:', agendErr.message)
      let fbQuery = supabase.from('agendamentos').select('*, pacientes(nome, telefone)')
      if (filtroDentista) {
        fbQuery = fbQuery.eq('dentista_id', filtroDentista)
      }
      const { data: fbData } = await fbQuery
      agends = (fbData || []).map(a => {
        const dent = (dents || []).find(d => d.id === (a.dentista_id || a.profissional_id))
        return {
          ...a,
          dentistas: dent ? { nome: dent.nome } : null
        }
      })
    } else {
      agends = (agends || []).map(a => {
        if (!a.dentistas) {
          const dent = (dents || []).find(d => d.id === (a.dentista_id || a.profissional_id))
          if (dent) a.dentistas = { nome: dent.nome }
        }
        return a
      })
    }

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

  const statusLabels: any = {
    agendado: 'Agendado',
    confirmado: 'Confirmado',
    espera: 'Na Espera',
    atendido: 'Atendido',
    cancelado: 'Cancelado'
  }

  const eventos = agendamentos.map((a) => {
    let start = `${a.data_consulta}T${a.hora_consulta}`
    let end = a.hora_fim ? `${a.data_consulta}T${a.hora_fim}` : start
    const corStatus = statusColors[a.status || 'agendado']

    return {
      id: a.id,
      title: `${a.hora_consulta} - ${a.pacientes?.nome || 'Consulta'}${a.procedimento ? ` (${a.procedimento})` : ''}`,
      start,
      end,
      backgroundColor: corStatus,
      borderColor: corStatus,
      textColor: '#ffffff',
      extendedProps: { ...a }
    }
  })

  function handleDateClick(info: any) {
    const parts = info.dateStr.split('T')
    const data = parts[0]
    const hora = parts[1] ? parts[1].substring(0, 5) : '08:00'
    
    setInitialDate(data)
    setInitialTime(hora)
    setIsNovoModalOpen(true)
  }

  function handleSelectSlot(info: any) {
    const data = info.startStr.split('T')[0]
    const hora = info.startStr.split('T')[1] ? info.startStr.split('T')[1].substring(0, 5) : '08:00'
    setInitialDate(data)
    setInitialTime(hora)
    setIsNovoModalOpen(true)
  }

  function handleEventClick(info: any) {
    setAgendamentoSelecionado(info.event.extendedProps)
    setIsDetalhesModalOpen(true)
  }

  function handleEventMouseEnter(info: any) {
    const rect = info.el.getBoundingClientRect()
    const x = rect.right + 12 < window.innerWidth - 240 ? rect.right + 12 : Math.max(12, rect.left - 240)
    const y = Math.min(rect.top, window.innerHeight - 200)

    setHoveredInfo({
      data: info.event.extendedProps,
      x,
      y
    })
  }

  function handleEventMouseLeave() {
    setHoveredInfo(null)
  }

  return (
    <div className="flex flex-col md:flex-row w-full flex-1 overflow-hidden text-slate-800 dark:text-slate-100 font-sans text-sm bg-slate-50 dark:bg-slate-950 relative">
      
      {/* Barra superior mobile para abrir filtros e novo agendamento */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 z-20">
        <div>
          <h2 className="text-lg font-heading font-extrabold text-slate-800 dark:text-slate-100">Agenda</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Gerenciamento de consultas</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setInitialDate(''); setInitialTime(''); setIsNovoModalOpen(true); }}
            className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-xs font-bold shadow-md shadow-blue-500/20"
          >
            <Plus size={14} /> Novo
          </button>
          <button 
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <Filter size={14} /> Filtros
          </button>
        </div>
      </div>

      {/* Overlay escuro para fechar o menu mobile de filtros */}
      {isMobileFilterOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileFilterOpen(false)}
        />
      )}

      {/* Sidebar: Filtros (Drawer no mobile, fixo no desktop) */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 w-72 
        transform ${isMobileFilterOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        transition-transform duration-200 ease-in-out
        border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full shrink-0 shadow-sm
      `}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-slate-800 dark:text-slate-100">Agenda</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Gerenciamento de consultas</p>
          </div>
          <button 
            onClick={() => setIsMobileFilterOpen(false)}
            className="md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <button 
            onClick={() => { setInitialDate(''); setInitialTime(''); setIsNovoModalOpen(true); setIsMobileFilterOpen(false); }}
            className="w-full hidden md:flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 mb-6"
          >
            <Plus size={16} /> Novo Agendamento
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            <Filter size={14} /> Filtros Rápidos
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                <Users size={14} className="text-slate-400" /> Dentista Responsável
              </label>
              <select 
                value={filtroDentista}
                onChange={(e) => setFiltroDentista(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              >
                <option value="">Todos os Dentistas</option>
                {dentistas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 mb-3">Legenda de Status</label>
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
      <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[24px] shadow-sm p-3 md:p-4 overflow-hidden flex flex-col min-h-[500px]">
            <div className="flex-1 min-h-0 custom-calendar">
              <style dangerouslySetInnerHTML={{__html: `
                .custom-calendar .fc-toolbar-title { font-size: 1.1rem !important; font-weight: 800 !important; color: #1e293b !important; }
                @media (min-width: 768px) {
                  .custom-calendar .fc-toolbar-title { font-size: 1.25rem !important; }
                }
                .custom-calendar .fc-button-primary { background-color: #f1f5f9 !important; border-color: transparent !important; color: #475569 !important; font-weight: 600 !important; border-radius: 0.5rem !important; text-transform: capitalize !important; padding: 0.4rem 0.6rem !important; font-size: 0.8rem !important; }
                .custom-calendar .fc-button-primary:not(:disabled):active, .custom-calendar .fc-button-primary:not(:disabled).fc-button-active { background-color: #2563eb !important; color: white !important; }
                .custom-calendar .fc-theme-standard th { border-color: var(--calendar-border, #f1f5f9); padding: 8px 0; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
                .custom-calendar .fc-theme-standard td { border-color: var(--calendar-border, #f1f5f9); cursor: pointer; }
                .custom-calendar .fc-timegrid-col-bg { background-color: #f8fafc !important; }
                .custom-calendar .fc-timegrid-slot { cursor: pointer; background-color: rgba(248, 250, 252, 0.6); }
                .custom-calendar .fc-timegrid-slot:hover { background-color: rgba(37, 99, 235, 0.04) !important; }

                /* Forçar bloco preenchido completo no mês */
                .custom-calendar .fc-daygrid-event {
                  border-radius: 6px !important;
                  padding: 4px 8px !important;
                  font-weight: 700 !important;
                  font-size: 0.75rem !important;
                  border: none !important;
                  margin-top: 3px !important;
                }
                .custom-calendar .fc-daygrid-event:hover {
                  filter: brightness(0.9);
                  transform: translateY(-1px);
                }

                /* Dark mode overrides */
                .dark .custom-calendar .fc-timegrid-col-bg { background-color: transparent !important; }
                .dark .custom-calendar .fc-timegrid-slot { background-color: transparent !important; }
                .dark .custom-calendar .fc-timegrid-slot:hover { background-color: rgba(255,255,255,0.03) !important; }
                .dark .custom-calendar .fc-toolbar-title { color: #f8fafc !important; }
                .dark .custom-calendar .fc-button-primary { background-color: #1e293b !important; color: #cbd5e1 !important; }
                .dark .custom-calendar .fc-theme-standard th, .dark .custom-calendar .fc-theme-standard td { border-color: #1e293b !important; color: #94a3b8; }
                
                /* Estilização do Indicador de Hora Atual */
                .custom-calendar .fc-timegrid-now-indicator-line {
                  border-color: #ef4444 !important;
                  border-width: 2px !important;
                  box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
                  z-index: 20 !important;
                }
                .custom-calendar .fc-timegrid-now-indicator-arrow {
                  border-color: #ef4444 !important;
                  border-width: 6px !important;
                  margin-top: -5px !important;
                }
              `}} />
              <div className="w-full h-full overflow-x-auto">
                <div className="min-w-[650px] h-full">
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    events={eventos}
                    eventDisplay="block"
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
                    selectable={true}
                    selectMirror={true}
                    select={handleSelectSlot}
                    allDaySlot={false}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    eventMouseEnter={handleEventMouseEnter}
                    eventMouseLeave={handleEventMouseLeave}
                    nowIndicator={true}
                    dayMaxEvents={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Tooltip Informativa Flutuante no Hover */}
      {hoveredInfo && (
        <div 
          style={{ top: `${hoveredInfo.y}px`, left: `${hoveredInfo.x}px` }}
          className="fixed z-50 w-60 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <span 
              className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: statusColors[hoveredInfo.data.status || 'agendado'] }}
            >
              {statusLabels[hoveredInfo.data.status || 'agendado']}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {hoveredInfo.data.hora_consulta} {hoveredInfo.data.hora_fim ? `- ${hoveredInfo.data.hora_fim}` : ''}
            </span>
          </div>

          <p className="font-bold text-slate-100 text-sm truncate">
            {hoveredInfo.data.pacientes?.nome || 'Paciente não identificado'}
          </p>

          {hoveredInfo.data.pacientes?.telefone && (
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              📞 {hoveredInfo.data.pacientes.telefone}
            </p>
          )}

          {hoveredInfo.data.procedimento && (
            <p className="text-xs text-blue-400 font-semibold mt-2 border-t border-slate-800 pt-1.5">
              📋 {hoveredInfo.data.procedimento}
            </p>
          )}

          {hoveredInfo.data.dentistas?.nome && (
            <p className="text-xs text-slate-400 font-medium mt-1">
              👨‍⚕️ {hoveredInfo.data.dentistas.nome}
            </p>
          )}
        </div>
      )}

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