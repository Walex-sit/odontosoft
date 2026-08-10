"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// Estou assumindo que você usa lucide-react para os ícones. 
// Caso use outra biblioteca (como react-icons), basta trocar as importações.
import { Home, CalendarDays, Users, CircleDollarSign } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  // Defina aqui as rotas principais do seu sistema
  const navItems = [
    { name: "Início", href: "/", icon: Home },
    { name: "Agenda", href: "/agenda", icon: CalendarDays },
    { name: "Pacientes", href: "/pacientes", icon: Users },
    { name: "Finanças", href: "/financeiro", icon: CircleDollarSign },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 custom-calendar">
  <style dangerouslySetInnerHTML={{__html: `
                .custom-calendar .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 800 !important; color: #1e293b !important; }
                .custom-calendar .fc-button-primary { background-color: #f1f5f9 !important; border-color: transparent !important; color: #475569 !important; font-weight: 600 !important; border-radius: 0.5rem !important; text-transform: capitalize !important; }
                .custom-calendar .fc-button-primary:not(:disabled):active, .custom-calendar .fc-button-primary:not(:disabled).fc-button-active { background-color: #2563eb !important; color: white !important; }
                .custom-calendar .fc-theme-standard th { border-color: var(--calendar-border, #f1f5f9); padding: 12px 0; font-size: 0.85rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
                .custom-calendar .fc-theme-standard td { border-color: var(--calendar-border, #f1f5f9); cursor: pointer; }
                .custom-calendar .fc-timegrid-col-bg { background-color: #f8fafc !important; }
                .custom-calendar .fc-timegrid-slot { cursor: pointer; background-color: rgba(248, 250, 252, 0.6); }
                .custom-calendar .fc-timegrid-slot:hover { background-color: rgba(37, 99, 235, 0.04) !important; }

                /* Dark mode overrides — neutralise light-only slot tints */
                .dark .custom-calendar .fc-timegrid-col-bg { background-color: transparent !important; }
                .dark .custom-calendar .fc-timegrid-slot { background-color: transparent !important; }
                .dark .custom-calendar .fc-timegrid-slot:hover { background-color: rgba(255,255,255,0.03) !important; }
                .dark .custom-calendar .fc-toolbar-title { color: #f8fafc !important; }
                .dark .custom-calendar .fc-button-primary { background-color: #1e293b !important; color: #cbd5e1 !important; }
                .dark .custom-calendar .fc-theme-standard th, .dark .custom-calendar .fc-theme-standard td { border-color: #1e293b !important; color: #94a3b8; }
                .custom-calendar .fc-event { border-radius: 10px; padding: 4px 8px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.2) !important; }
                .custom-calendar .fc-event:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); opacity: 0.95; }
                .custom-calendar .fc-v-event { border: none !important; }
                .custom-calendar .fc-daygrid-event { margin-top: 2px; }

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
  <div className="w-full overflow-x-auto">
    <div className="min-w-[600px]">
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
    </nav>
  );
}