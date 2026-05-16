'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { useAuth, UserRole } from './RequireAuth'
import { logAction } from '../lib/logger'

// Definição centralizada das permissões por perfil
const PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    '/', '/agenda', '/pacientes', '/prontuarios',
    '/financeiro', '/despesas', '/fluxo-caixa',
    '/fornecedores', '/compras', '/notas-fiscais',
    '/usuarios', '/logs'
  ],
  dentista: [
    '/', '/agenda', '/pacientes', '/prontuarios'
  ],
  recepcao: [
    '/', '/agenda', '/pacientes', '/financeiro'
  ],
  financeiro: [
    '/', '/financeiro', '/despesas', '/fluxo-caixa',
    '/fornecedores', '/compras', '/notas-fiscais'
  ],
}

// Configuração de cada item de menu
interface MenuItem {
  path: string
  label: string
  icon: string  // SVG path "d" attribute
  matchPrefix?: boolean // para /pacientes/[id]
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Principal',
    items: [
      {
        path: '/',
        label: 'Dashboard',
        icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
      },
      {
        path: '/agenda',
        label: 'Agenda',
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      },
    ],
  },
  {
    title: 'Clínica',
    items: [
      {
        path: '/pacientes',
        label: 'Pacientes',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        matchPrefix: true,
      },
      {
        path: '/prontuarios',
        label: 'Prontuários',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      {
        path: '/financeiro',
        label: 'Receitas',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        path: '/despesas',
        label: 'Despesas',
        icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      {
        path: '/fluxo-caixa',
        label: 'Fluxo de Caixa',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      },
      {
        path: '/fornecedores',
        label: 'Fornecedores',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      },
      {
        path: '/compras',
        label: 'Compras',
        icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      },
      {
        path: '/notas-fiscais',
        label: 'Notas Fiscais',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      },
    ],
  },
  {
    title: 'Sistema',
    items: [
      {
        path: '/usuarios',
        label: 'Usuários e Perfis',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      },
      {
        path: '/logs',
        label: 'Logs (Auditoria)',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      },
    ],
  },
]

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'text-blue-400' },
  dentista: { label: 'Dentista', color: 'text-emerald-400' },
  recepcao: { label: 'Recepção', color: 'text-amber-400' },
  financeiro: { label: 'Financeiro', color: 'text-violet-400' },
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
      ? 'bg-blue-900/30 text-blue-400 font-bold border border-blue-800/50'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 font-medium border border-transparent'
  }

  function getIconClasses(item: MenuItem) {
    return isItemActive(item) ? 'text-blue-400' : 'text-slate-500'
  }

  async function logout() {
    await logAction('logout', 'auth')
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shadow-sm z-20 relative">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md border border-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Odonto<span className="text-blue-500">SaaS</span>
          </h1>
        </div>

        {/* Card da Clínica + Role do Usuário */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clínica Ativa</p>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
          <p className="text-sm font-bold text-white">Matriz Centro</p>
          <div className="mt-2 pt-2 border-t border-slate-700">
            <p className="text-xs text-slate-500">Perfil</p>
            <p className={`text-sm font-bold ${roleInfo.color}`}>{roleInfo.label}</p>
          </div>
        </div>
      </div>

      {/* Menu dinâmico baseado em RBAC */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 no-scrollbar">
        {MENU_SECTIONS.map((section) => {
          // Filtrar itens permitidos para este perfil
          const visibleItems = section.items.filter((item) =>
            allowedPaths.includes(item.path)
          )

          // Se nenhum item da seção é visível, omitir a seção inteira
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title}>
              <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                {section.title}
              </p>
              <nav className="space-y-1">
                {visibleItems.map((item) => (
                  <Link
                    key={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${getItemClasses(item)}`}
                    href={item.path}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 ${getIconClasses(item)}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={item.icon}
                      />
                    </svg>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )
        })}
      </div>
      
      {/* Rodapé com Logout */}
      <div className="mt-auto p-4 border-t border-slate-800">
        <button 
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium border border-transparent hover:border-red-500/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair do Sistema
        </button>
      </div>
    </aside>
  )
}
