'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './RequireAuth'
import { supabase } from '../lib/supabaseClient'
import { logAction } from '../lib/logger'
import { 
  Search, 
  Bell, 
  Settings, 
  LayoutGrid, 
  HeadphonesIcon,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import NotificacoesDropdown, { NotificationItem } from './NotificacoesDropdown'
import TarefasSlideOver from './TarefasSlideOver'
import CalculadoraModal from './CalculadoraModal'
import ReceituarioRapidoModal from './ReceituarioRapidoModal'
import AtestadoMedicoModal from './AtestadoMedicoModal'
import { ThemeToggle } from './ThemeToggle'
import GlobalSearchModal from './GlobalSearchModal'
import { hasPermission } from '../lib/permissions' 
import { UserRole } from './RequireAuth'
import { useClinica } from '../contexts/ClinicaContext'

// ─── Mapa de permissões por perfil ────────────────────────────────────────────
// Centraliza aqui a lógica de visibilidade de cada seção do menu de ferramentas
// para manter o JSX limpo e facilitar futuras alterações.

/** Perfis que enxergam o botão "Ferramentas" na Topbar */
const ROLES_WITH_TOOLS: UserRole[] = ['admin', 'dentista', 'recepcao', 'financeiro']

/** Perfis que enxergam a seção "Ferramentas Clínicas" */
const ROLES_CLINICAL_TOOLS: UserRole[] = ['admin', 'dentista', 'recepcao']

/** Perfis que enxergam Receituário e Atestado (atos estritamente médicos) */
const ROLES_MEDICAL_DOCS: UserRole[] = ['admin', 'dentista']

/** Perfis que enxergam Estoque e Planos de Tratamento */
const ROLES_ADVANCED_MODULES: UserRole[] = ['admin', 'dentista', 'recepcao']

/** Perfis que enxergam a seção "Módulos Financeiros" */
const ROLES_FINANCIAL_MODULES: UserRole[] = ['admin', 'financeiro']

/** Mapeamento de tipos de notificações permitidas por cargo (RBAC) */
const NOTIFICATION_ROLES_MAP: Record<UserRole, NotificationItem['type'][]> = {
  admin: ['financial', 'appointment', 'patient', 'lgpd', 'stock', 'system'],
  financeiro: ['financial', 'system'],
  recepcao: ['appointment', 'patient', 'system'],
  dentista: ['appointment', 'patient', 'system'],
}

// ─── Links de navegação ────────────────────────────────────────────────────────
const navLinks: { name: string; path: string; allowedRoles: UserRole[] }[] = [
  { name: 'Agenda',     path: '/agenda',     allowedRoles: ['admin', 'dentista', 'recepcao'] },
  { name: 'Pacientes',  path: '/pacientes',  allowedRoles: ['admin', 'dentista', 'recepcao'] },
  { name: 'Financeiro', path: '/financeiro', allowedRoles: ['admin', 'financeiro'] },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, session } = useAuth()
  const { clinica } = useClinica()
  
  const [isDropdownOpen,   setIsDropdownOpen]   = useState(false)
  const [isUserMenuOpen,   setIsUserMenuOpen]   = useState(false)
  const [isToolsOpen,      setIsToolsOpen]      = useState(false)
  const [isTarefasOpen,    setIsTarefasOpen]    = useState(false)
  const [isCalculadoraOpen,  setIsCalculadoraOpen]  = useState(false)
  const [isReceituarioOpen,  setIsReceituarioOpen]  = useState(false)
  const [isAtestadoOpen,     setIsAtestadoOpen]     = useState(false)
  const [isSearchOpen,     setIsSearchOpen]     = useState(false)
  const [notifications,    setNotifications]    = useState<NotificationItem[]>([])

  // Atalho de teclado para busca global
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsSearchOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const role = (profile?.role as UserRole) || 'recepcao'

  // Notificações reais da clínica + alertas operacionais filtrados por cargo
  useEffect(() => {
    async function fetchNotifications() {
      const notifs: NotificationItem[] = []

      try {
        // 1. Alertas cadastrados no sistema
        const { data: alertasRaw } = await supabase
          .from('alertas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (alertasRaw && alertasRaw.length > 0) {
          alertasRaw.forEach((a: any) => {
            notifs.push({
              id: a.id,
              type: (a.tipo as NotificationItem['type']) || 'system',
              title: a.titulo || a.title || 'Aviso do Sistema',
              description: a.mensagem || a.descricao || a.description || '',
              time: a.created_at ? new Date(a.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Recente',
              unread: a.read === false || a.unread === true,
              link: a.link || undefined,
            })
          })
        }

        // 2. Alertas Financeiros (apenas admin e financeiro)
        if (role === 'admin' || role === 'financeiro') {
          const { count: despesasPendentesCount } = await supabase
            .from('despesas')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pendente')

          if (despesasPendentesCount && despesasPendentesCount > 0) {
            notifs.push({
              id: 'notif-despesas-pendentes',
              type: 'financial',
              title: 'Contas a Pagar / Pendências',
              description: `${despesasPendentesCount} despesa${despesasPendentesCount > 1 ? 's' : ''} aguardando liquidação e baixa no fluxo de caixa.`,
              time: 'Hoje',
              unread: true,
              link: '/financeiro',
            })
          }

          const { count: receitasPendentesCount } = await supabase
            .from('receitas')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pendente')

          if (receitasPendentesCount && receitasPendentesCount > 0) {
            notifs.push({
              id: 'notif-receitas-pendentes',
              type: 'financial',
              title: 'Recebimentos Pendentes',
              description: `${receitasPendentesCount} receita${receitasPendentesCount > 1 ? 's' : ''} aguardando confirmação de pagamento.`,
              time: 'Hoje',
              unread: true,
              link: '/financeiro',
            })
          }
        }

        // 3. Alertas de Agenda e Pacientes (admin, dentista, recepcao)
        if (role === 'admin' || role === 'dentista' || role === 'recepcao') {
          notifs.push({
            id: 'notif-agenda-hoje',
            type: 'appointment',
            title: 'Consultas e Agenda do Dia',
            description: 'Verifique os horários marcados, confirmações e retornos agendados para hoje.',
            time: 'Manhã',
            unread: false,
            link: '/agenda',
          })

          notifs.push({
            id: 'notif-pacientes-novos',
            type: 'patient',
            title: 'Pacientes em Atendimento',
            description: 'Novos pacientes cadastrados recentemente aguardando evolução e anamnese.',
            time: 'Recente',
            unread: true,
            link: '/pacientes',
          })
        }

        // 4. Alertas de Gestão, LGPD e Estoque (exclusivo admin)
        if (role === 'admin') {
          const { count: lgpdPendentesCount } = await supabase
            .from('pacientes')
            .select('*', { count: 'exact', head: true })
            .or('lgpd_aceite.is.null,lgpd_aceite.eq.false')

          if (lgpdPendentesCount && lgpdPendentesCount > 0) {
            notifs.push({
              id: 'notif-lgpd-pendentes',
              type: 'lgpd',
              title: 'Conformidade LGPD Pendente',
              description: `${lgpdPendentesCount} paciente${lgpdPendentesCount > 1 ? 's' : ''} aguardando aceite formal de proteção de dados.`,
              time: 'Hoje',
              unread: true,
              link: '/pacientes',
            })
          }

          notifs.push({
            id: 'notif-estoque-critico',
            type: 'stock',
            title: 'Alerta de Estoque Mínimo',
            description: 'Itens de consumo clínico (anestésicos e luvas) estão próximos da margem de segurança.',
            time: 'Hoje',
            unread: true,
            link: '/estoque',
          })
        }

        setNotifications(notifs)
      } catch (err) {
        console.error('Erro ao carregar notificações:', err)
      }
    }

    fetchNotifications()
  }, [role])

  // Notificações visíveis e badge filtrados estritamente por perfil (RBAC)
  const visibleNotifications = useMemo(() => {
    const allowed = NOTIFICATION_ROLES_MAP[role] || ['system']
    return notifications.filter(n => allowed.includes(n.type))
  }, [notifications, role])

  const unreadCount = visibleNotifications.filter(n => n.unread).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: false } : n))
    )
  }

  const handleClearAll = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, unread: false }))
    )
    toast.success('Todas as notificações foram marcadas como lidas.')
  }

  async function logout() {
    if (profile?.id) await logAction(profile.id, 'logout', 'auth')
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ─── Flags de visibilidade derivadas do role ────────────────────────────────
  const canSeeTools          = hasPermission(role, ROLES_WITH_TOOLS)
  const canSeeClinicalTools  = hasPermission(role, ROLES_CLINICAL_TOOLS)
  const canSeeMedicalDocs    = hasPermission(role, ROLES_MEDICAL_DOCS)
  const canSeeAdvancedMods   = hasPermission(role, ROLES_ADVANCED_MODULES)
  const canSeeFinancialMods  = hasPermission(role, ROLES_FINANCIAL_MODULES)
  const isAdmin              = hasPermission(role, ['admin'])

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <header className="h-16 w-full flex items-center justify-between px-6 z-50 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0 transition-colors duration-200">
      
      {/* ── Lado esquerdo: Logo + Nav ── */}
      <div className="flex items-center gap-8">
        <Link href="/overview" className="flex items-center gap-3">
          {clinica?.logo_url ? (
            <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
              <img
                src={clinica.logo_url}
                alt="Logo da clínica"
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate max-w-[200px]" title={clinica?.nome_exibido || clinica?.nome}>
            {clinica?.nome_exibido || clinica?.nome}
          </h1>
        </Link>

        {/* Nav principal — filtrada por role */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks
            .filter(link => hasPermission(role, link.allowedRoles))
            .map(link => (
              <Link 
                key={link.name} 
                href={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  pathname.startsWith(link.path) 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {link.name}
              </Link>
            ))}
        </nav>
      </div>

      {/* ── Lado direito: Ferramentas + Suporte + Busca + Ações ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-2 mr-2">

          {/* Botão Ferramentas — visível para todos os perfis com permissão */}
          {canSeeTools && (
            <div className="relative">
              <button
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-200"
              >
                <LayoutGrid className="h-4 w-4" /> Ferramentas
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50">

                  {/* ── Seção: Ferramentas Clínicas ── */}
                  {/* Visível para: admin, dentista, recepcao */}
                  {canSeeClinicalTools && (
                    <>
                      <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Ferramentas Clínicas
                      </p>

                      {/* Calculadora — todos os perfis com acesso a ferramentas clínicas */}
                      <button
                        onClick={() => { setIsCalculadoraOpen(true); setIsToolsOpen(false) }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        Calculadora
                      </button>

                      {/* Receituário e Atestado — somente admin e dentista (atos médicos) */}
                      {canSeeMedicalDocs && (
                        <>
                          <button
                            onClick={() => { setIsReceituarioOpen(true); setIsToolsOpen(false) }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                          >
                            Receituário Rápido
                          </button>
                          <button
                            onClick={() => { setIsAtestadoOpen(true); setIsToolsOpen(false) }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                          >
                            Atestado Médico
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* ── Seção: Módulos Avançados ── */}
                  {/* Visível para: admin, dentista, recepcao */}
                  {canSeeAdvancedMods && (
                    <>
                      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                      <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Módulos Avançados
                      </p>
                      <Link
                        href="/estoque"
                        onClick={() => setIsToolsOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        Gestão de Estoque
                      </Link>
                      <Link
                        href="/planos-tratamento"
                        onClick={() => setIsToolsOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        Planos de Tratamento
                      </Link>
                    </>
                  )}

                  {/* ── Seção: Módulos Financeiros ── */}
                  {/* Visível para: admin, financeiro */}
                  {canSeeFinancialMods && (
                    <>
                      {/* Separador só aparece quando há seções anteriores (admin enxerga tudo) */}
                      {(canSeeClinicalTools || canSeeAdvancedMods) && (
                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                      )}
                      <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Módulos Financeiros
                      </p>
                      <Link
                        href="/comissoes"
                        onClick={() => setIsToolsOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        Controle de Comissões
                      </Link>
                      <Link
                        href="/regua-cobranca"
                        onClick={() => setIsToolsOpen(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      >
                        Régua de Cobrança
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
          >
            <HeadphonesIcon className="h-4 w-4" /> Suporte
          </button>
        </div>

        {/* Busca global */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-400 transition-colors hover:border-slate-300"
        >
          <Search className="h-4 w-4" /> Buscar...
        </button>

        {/* Ícones de ação */}
        <div className="flex items-center gap-1">
          {/* Notificações — todos os perfis */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`p-2 rounded-xl relative transition-colors ${
                isDropdownOpen
                  ? 'bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Notificações da Clínica"
              aria-label="Abrir notificações"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-in zoom-in-50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificacoesDropdown
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
              notifications={visibleNotifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Engrenagem de Configurações — EXCLUSIVO para admin */}
          {isAdmin && (
            <Link
              href="/configuracoes"
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
              title="Configurações do Sistema"
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}

          <ThemeToggle />
        </div>

        {/* Menu do usuário */}
        <div className="relative ml-2">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 pr-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full transition-colors hover:border-slate-300"
          >
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {profile?.nome?.substring(0, 2).toUpperCase() || 'US'}
            </span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50">
              {/* Configurações no menu do usuário — EXCLUSIVO para admin */}
              {isAdmin && (
                <Link
                  href="/configuracoes"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </Link>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modais ── */}
      <CalculadoraModal     isOpen={isCalculadoraOpen}  onClose={() => setIsCalculadoraOpen(false)} />
      <ReceituarioRapidoModal isOpen={isReceituarioOpen} onClose={() => setIsReceituarioOpen(false)} />
      <AtestadoMedicoModal  isOpen={isAtestadoOpen}     onClose={() => setIsAtestadoOpen(false)} />
      <GlobalSearchModal    isOpen={isSearchOpen}       onClose={() => setIsSearchOpen(false)} />
    </header>
  )
}