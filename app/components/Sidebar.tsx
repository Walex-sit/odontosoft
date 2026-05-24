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
  ChevronDown
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
  admin: { label: 'Administrador', color: 'text-blue-600' },
  dentista: { label: 'Dentista', color: 'text-emerald-600' },
  recepcao: { label: 'Recepção', color: 'text-amber-600' },
  financeiro: { label: 'Financeiro', color: 'text-violet-600' },
}

export default function Sidebar() {
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
      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-100 shadow-sm'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium border border-transparent'
  }

  function getIconClasses(item: MenuItem) {
    return isItemActive(item) ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
  }

  async function logout() {
    await logAction('logout', 'auth')
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] z-20 relative">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm border border-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Odonto<span className="text-blue-600">SaaS</span>
          </h1>
        </div>

        {/* Card da Clínica + Role do Usuário */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clínica Ativa</p>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-800">Matriz Centro</p>
          <div className="mt-2 pt-2 border-t border-slate-200">
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
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
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
      <div className="mt-auto p-4 border-t border-slate-200 bg-slate-50/50">
        <button 
          onClick={logout}
          className="group flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium border border-transparent hover:border-red-100"
        >
          <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-500 transition-colors" />
          Sair do Sistema
        </button>
      </div>
    </aside>
  )
}
