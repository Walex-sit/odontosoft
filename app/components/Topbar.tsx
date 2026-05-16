'use client'

export default function Topbar() {
  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 z-10 relative">
      <div className="flex-1 max-w-2xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-700 rounded-full text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-800 hover:bg-slate-700 transition-all text-white"
            placeholder="Buscar pacientes, agendamentos..."
          />
        </div>
      </div>

      <div className="flex items-center gap-6 ml-6">
        <button className="hidden sm:flex bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-sm transition-colors items-center gap-2 border border-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Agendamento
        </button>

        <div className="h-8 w-px bg-slate-700 hidden sm:block"></div>

        <button className="text-slate-400 hover:text-slate-200 transition-colors relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-slate-900"></span>
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-white">Dr. Administrador</p>
            <p className="text-xs font-medium text-slate-400">Admin</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
            AD
          </div>
        </div>
      </div>
    </header>
  )
}
