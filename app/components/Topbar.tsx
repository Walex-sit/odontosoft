'use client'

import { Search, Plus, Bell } from 'lucide-react'

export default function Topbar() {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 relative shadow-[0_2px_8px_-4px_rgba(0,0,0,0.02)]">
      <div className="flex-1 max-w-2xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-full text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-slate-50 hover:bg-white transition-all text-slate-800 shadow-sm"
            placeholder="Buscar pacientes, agendamentos..."
          />
        </div>
      </div>

      <div className="flex items-center gap-6 ml-6">
        <button className="hidden sm:flex bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all items-center gap-2 border border-blue-700 hover:shadow-md">
          <Plus className="h-4 w-4" strokeWidth={3} />
          Novo Agendamento
        </button>

        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

        <button className="text-slate-400 hover:text-slate-600 transition-colors relative p-2 rounded-full hover:bg-slate-50">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-800">Dr. Administrador</p>
            <p className="text-xs font-semibold text-slate-500">Admin</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-sm border border-blue-200">
            AD
          </div>
        </div>
      </div>
    </header>
  )
}
