'use client'

import { useState } from 'react'
import { Search, Plus, Bell, Menu } from 'lucide-react'
import NovoAgendamentoModal from './NovoAgendamentoModal'
import NotificacoesDropdown from './NotificacoesDropdown'

interface TopbarProps {
  onMenuClick?: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'appointment' as const,
      title: 'Próximo Agendamento',
      description: 'João Silva - 15:30 (Hoje)',
      time: '10m',
      unread: true,
    },
    {
      id: '2',
      type: 'patient' as const,
      title: 'Novo Paciente',
      description: 'Carlos Eduardo se cadastrou pelo portal.',
      time: '2h',
      unread: true,
    },
    {
      id: '3',
      type: 'financial' as const,
      title: 'Alerta Financeiro',
      description: 'Fatura pendente vencendo hoje.',
      time: '4h',
      unread: true,
    },
    {
      id: '4',
      type: 'appointment' as const,
      title: 'Próximo Agendamento',
      description: 'Maria Oliveira - 17:00 (Hoje)',
      time: '1h',
      unread: false,
    },
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: false } : n))
    )
  }

  const handleClearAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  return (
    <header className="h-20 flex items-center justify-between px-4 md:px-8 z-10 relative" style={{background:'#131c2e', borderBottom:'1px solid rgba(148,163,184,0.10)'}}>
      
      {/* Search and Hamburger */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-400 hover:text-slate-250 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
        >
          <Menu className="h-5.5 w-5.5" />
        </button>

        <div className="relative group w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2 border border-slate-700 rounded-full text-xs sm:text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-800/60 hover:bg-slate-800 transition-all text-slate-100"
            placeholder="Buscar pacientes, agendamentos..."
          />
        </div>
      </div>

      {/* Action buttons and profile */}
      <div className="flex items-center gap-3 md:gap-6 ml-3 sm:ml-6 shrink-0">
        
        {/* Responsive Novo Agendamento Button */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 border border-blue-500 active:scale-95"
        >
          <Plus className="h-4.5 w-4.5 sm:h-4 sm:w-4" strokeWidth={3} />
          <span className="hidden sm:inline">Novo Agendamento</span>
        </button>

        <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="text-slate-400 hover:text-slate-200 transition-colors relative p-2 rounded-full hover:bg-slate-800"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border border-slate-900 animate-pulse"></span>
            )}
          </button>

          <NotificacoesDropdown
            isOpen={isDropdownOpen}
            onClose={() => setIsDropdownOpen(false)}
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onClearAll={handleClearAll}
          />
        </div>

        <div className="flex items-center gap-2 md:gap-3 pl-1 sm:pl-2">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-200">Dr. Administrador</p>
            <p className="text-xs font-semibold text-slate-500">Admin</p>
          </div>
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs sm:text-sm font-bold border border-blue-500/20 shrink-0">
            AD
          </div>
        </div>
      </div>

      <NovoAgendamentoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </header>
  )
}
