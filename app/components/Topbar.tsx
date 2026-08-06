'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './RequireAuth'
import { supabase } from '../lib/supabaseClient'
import { logAction } from '../lib/logger'
import { toast } from 'sonner'
import { 
  Search, 
  Bell, 
  MessageSquare, 
  CheckSquare, 
  Settings, 
  LayoutGrid, 
  HeadphonesIcon,
  LogOut,
  User,
  CreditCard
} from 'lucide-react'
import NotificacoesDropdown from './NotificacoesDropdown'
import TarefasSlideOver from './TarefasSlideOver'
import CalculadoraModal from './CalculadoraModal'
import ReceituarioRapidoModal from './ReceituarioRapidoModal'
import AtestadoMedicoModal from './AtestadoMedicoModal'
import { ThemeToggle } from './ThemeToggle'

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, session } = useAuth()
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const [isTarefasOpen, setIsTarefasOpen] = useState(false)
  const [isCalculadoraOpen, setIsCalculadoraOpen] = useState(false)
  const [isReceituarioOpen, setIsReceituarioOpen] = useState(false)
  const [isAtestadoOpen, setIsAtestadoOpen] = useState(false)

  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'appointment' as const,
      title: 'Próximo Agendamento',
      description: 'João Silva - 15:30 (Hoje)',
      time: '10m',
      unread: true,
    }
  ])

  const unreadCount = notifications.filter(n => n.unread).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, unread: false } : n)))
  }

  const handleClearAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
  }

  async function logout() {
    if (profile?.id) {
      await logAction(profile.id, 'logout', 'auth')
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { name: 'Agenda', path: '/agenda' },
    { name: 'Pacientes', path: '/pacientes' },
    { name: 'Financeiro', path: '/financeiro' },
  ]

  const handleBusca = () => {
    toast.info('Barra de pesquisa global (Busca de Pacientes/Atalhos) será aberta!')
  }

  const handleTarefas = () => {
    setIsTarefasOpen(true)
  }

  const handleSuporte = () => {
    // Exemplo: Abrir WhatsApp de suporte ou chat flutuante
    window.open('https://wa.me/5511999999999?text=Preciso%20de%20suporte%20no%20Odontosoft', '_blank')
  }

  return (
    <header className="h-16 w-full flex items-center justify-between px-6 z-50 bg-slate-50 dark:bg-slate-950 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0 transition-colors duration-200">
      
      {/* Esquerda: Logo e Navegação Principal */}
      <div className="flex items-center gap-8">
        
        {/* Logo */}
        <Link href="/overview" className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Odonto<span className="text-blue-600">Soft</span>
          </h1>
        </Link>

        {/* Links Principais */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => {
            const isActive = pathname.startsWith(link.path)
            return (
              <Link 
                key={link.name} 
                href={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-slate-100 text-slate-800 dark:text-slate-100' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 hover:text-slate-800 dark:text-slate-100'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Direita: Ferramentas, Busca e Perfil */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Botões de Ação Especiais */}
        <div className="hidden lg:flex items-center gap-2 mr-2">
          
          <div className="relative">
            <button 
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-200 dark:border-slate-700"
            >
              <LayoutGrid className="h-4 w-4" /> Ferramentas
            </button>
            {isToolsOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ferramentas Clínicas</p>
                <button onClick={() => { setIsCalculadoraOpen(true); setIsToolsOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 font-medium transition-colors flex items-center justify-between">Calculadora</button>
                <button onClick={() => { setIsReceituarioOpen(true); setIsToolsOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 font-medium transition-colors flex items-center justify-between">Receituário Rápido</button>
                <button onClick={() => { setIsAtestadoOpen(true); setIsToolsOpen(false) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 font-medium transition-colors flex items-center justify-between">Atestado Médico</button>
                <div className="h-px bg-slate-100 my-1" />
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Módulos Avançados</p>
                <Link href="/estoque" onClick={() => setIsToolsOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 font-medium">Gestão de Estoque</Link>
                <Link href="/comissoes" onClick={() => setIsToolsOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 font-medium">Controle de Comissões</Link>
                <Link href="/regua-cobranca" onClick={() => setIsToolsOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 font-medium">Régua de Cobrança</Link>
                <Link href="/planos-tratamento" onClick={() => setIsToolsOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 font-medium">Planos de Tratamento</Link>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleSuporte}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <HeadphonesIcon className="h-4 w-4" /> Chamar especialista
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 hidden lg:block mx-1"></div>

        {/* Busca com Atalho */}
        <button 
          onClick={handleBusca}
          className="hidden md:flex items-center gap-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-slate-400 transition-colors mr-2 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <Search className="h-4 w-4" />
          <span className="text-sm font-medium">Buscar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 shadow-sm">
            <span>Ctrl</span><span>K</span>
          </kbd>
        </button>

        {/* Ícones Rápidos */}
        <div className="flex items-center gap-1">
          
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:text-slate-100 rounded-xl transition-colors relative"
              title="Notificações"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
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

          <Link 
            href="/messages"
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:text-slate-100 rounded-xl transition-colors relative"
            title="Central de Mensagens"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-blue-600 border-2 border-white"></span>
          </Link>

          <button 
            onClick={handleTarefas}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:text-slate-100 rounded-xl transition-colors" 
            title="Tarefas do Dia"
          >
            <CheckSquare className="h-5 w-5" />
          </button>
          
          <Link href="/configuracoes" className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:text-slate-100 dark:hover:text-slate-200 rounded-xl transition-colors" title="Configurações">
            <Settings className="h-5 w-5" />
          </Link>
          <ThemeToggle />
        </div>

        {/* Conta do Usuário (Avatar com Dropdown) */}
        <div className="relative ml-2">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 pr-1 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none">{profile?.nome || 'Usuário'}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-sm border border-blue-200">
              {profile?.nome ? profile.nome.substring(0, 2).toUpperCase() : 'US'}
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100 mb-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{profile?.nome || 'Usuário'}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{session?.user?.email || 'testealex@gmail.com'}</p>
              </div>
              <Link href="/minha-conta" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 hover:text-blue-600 font-medium transition-colors">
                <User className="h-4 w-4" /> Meu Perfil
              </Link>
              <Link href="/establishment/subscription" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950 hover:text-blue-600 font-medium transition-colors">
                <CreditCard className="h-4 w-4" /> Meu Plano
              </Link>
              <div className="h-px bg-slate-100 my-1"></div>
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold flex items-center gap-3 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          )}
        </div>

      </div>
      
      <TarefasSlideOver 
        isOpen={isTarefasOpen} 
        onClose={() => setIsTarefasOpen(false)} 
      />

      <CalculadoraModal
        isOpen={isCalculadoraOpen}
        onClose={() => setIsCalculadoraOpen(false)}
      />

      <ReceituarioRapidoModal
        isOpen={isReceituarioOpen}
        onClose={() => setIsReceituarioOpen(false)}
      />

      <AtestadoMedicoModal
        isOpen={isAtestadoOpen}
        onClose={() => setIsAtestadoOpen(false)}
      />
    </header>
  )
}
