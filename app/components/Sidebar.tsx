'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { useAuth, UserRole } from './RequireAuth'
import { logAction } from '../lib/logger'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Truck, 
  ShoppingCart, 
  ReceiptText, 
  ShieldCheck, 
  History, 
  LogOut,
  ChevronDown,
  X
} from 'lucide-react'

// Definição centralizada das permissões por perfil
const PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/overview', '/agenda', '/pacientes', '/prontuarios',
    '/financeiro', '/despesas', '/fluxo-caixa',
    '/fornecedores', '/compras', '/notas-fiscais',
    '/usuarios', '/logs'
  ],
  dentista: [
    '/overview', '/agenda', '/pacientes', '/prontuarios'
  ],
  recepcao: [
    '/overview', '/agenda', '/pacientes', '/financeiro'
  ],
  financeiro: [
    '/overview', '/financeiro', '/despesas', '/fluxo-caixa',
    '/fornecedores', '/compras', '/notas-fiscais'
  ],
}

interface MenuItem {
  path: string
  label: string
  icon: React.ElementType
  matchPrefix?: boolean
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Principal',
    items: [
      { path: '/overview', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/agenda', label: 'Agenda', icon: Calendar },
    ],
  },
  {
    title: 'Clínica',
    items: [
      { path: '/pacientes', label: 'Pacientes', icon: Users, matchPrefix: true },
      { path: '/prontuarios', label: 'Prontuários', icon: ClipboardList },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { path: '/financeiro', label: 'Receitas', icon: TrendingUp },
      { path: '/despesas', label: 'Despesas', icon: TrendingDown },
      { path: '/fluxo-caixa', label: 'Fluxo de Caixa', icon: Activity },
      { path: '/fornecedores', label: 'Fornecedores', icon: Truck },
      { path: '/compras', label: 'Compras', icon: ShoppingCart },
      { path: '/notas-fiscais', label: 'Notas Fiscais', icon: ReceiptText },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { path: '/usuarios', label: 'Usuários e Perfis', icon: ShieldCheck },
      { path: '/logs', label: 'Logs (Auditoria)', icon: History },
    ],
  },
]

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'text-blue-400' },
  dentista: { label: 'Dentista', color: 'text-emerald-400' },
  recepcao: { label: 'Recepção', color: 'text-amber-400' },
  financeiro: { label: 'Financeiro', color: 'text-violet-400' },
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuth()

  const role = profile?.role || 'recepcao'
  const allowedPaths = PERMISSIONS[role]
  const roleInfo = ROLE_LABELS[role]

  function isItemActive(item: MenuItem) {
    if (item.matchPrefix) return pathname.startsWith(item.path)
    return pathname === item.path
  }

  function getItemClasses(item: MenuItem) {
    return isItemActive(item)
      ? 'bg-slate-900 text-blue-400 font-semibold border border-slate-800 shadow-sm'
      : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 font-medium border border-transparent'
  }

  function getIconClasses(item: MenuItem) {
    return isItemActive(item) ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-350'
  }

  async function logout() {
    await logAction('logout', 'auth')
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-full 
        transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:flex
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{background:'#131c2e', borderRight:'1px solid rgba(148,163,184,0.10)'}} >
        {/* Logo */}
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center border border-blue-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-200 tracking-tight">
                Odonto<span className="text-blue-500">SaaS</span>
              </h1>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Card da Clínica + Role do Usuário */}
          <div className="rounded-xl p-4" style={{background:'#1a2540', border:'1px solid rgba(148,163,184,0.10)'}}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clínica Ativa</p>
              <ChevronDown className="h-4 w-4 text-slate-550" />
            </div>
            <p className="text-sm font-bold text-slate-350">Matriz Centro</p>
            <div className="mt-2 pt-2" style={{borderTop:'1px solid rgba(148,163,184,0.10)'}}>
              <p className="text-xs text-slate-500 mb-0.5">Perfil</p>
              <p className={`text-sm font-semibold ${roleInfo.color}`}>{roleInfo.label}</p>
            </div>
          </div>
        </div>

        {/* Menu dinâmico baseado em RBAC */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 no-scrollbar">
          {MENU_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) =>
              allowedPaths.includes(item.path)
            )

            if (visibleItems.length === 0) return null

            return (
              <div key={section.title}>
                <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {section.title}
                </p>
                <nav className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${getItemClasses(item)}`}
                        href={item.path}
                        onClick={onClose}
                      >
                        <Icon className={`h-5 w-5 transition-colors ${getIconClasses(item)}`} strokeWidth={2} />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            )
          })}
        </div>
        
        {/* Rodapé com Logout */}
        <div className="mt-auto p-4 flex-shrink-0" style={{borderTop:'1px solid rgba(148,163,184,0.10)', background:'#131c2e'}}>
          <button 
            onClick={logout}
            className="group flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-950/20 hover:text-red-400 transition-colors font-medium border border-transparent"
          >
            <LogOut className="h-5 w-5 text-slate-500 group-hover:text-red-400 transition-colors" />
            Sair do Sistema
          </button>
        </div>      
      </aside>
    </>
  )
}
