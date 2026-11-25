'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './RequireAuth'
import { supabase } from '../lib/supabaseClient'
import { logAuthAction } from '@/app/actions/audit'
import { 
  Search, 
  Bell, 
  Settings, 
  LayoutGrid, 
  HeadphonesIcon,
  LogOut,
  User,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  Calculator,
  FileBadge,
  FileText,
  ClipboardList,
  ClipboardPlus,
  Percent,
  Clock,
  ArrowLeft,
  Building2,
} from 'lucide-react'
import { exitClinicContextAction } from '@/app/actions/admin-global'
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
const ROLES_WITH_TOOLS: UserRole[] = ['admin', 'admin_clinica', 'dentista', 'recepcao', 'financeiro']

/** Perfis que enxergam Receituário e Atestado (atos estritamente médicos) */
const ROLES_MEDICAL_DOCS: UserRole[] = ['admin', 'admin_clinica', 'dentista']

/** Perfis que enxergam Planos de Tratamento */
const ROLES_TREATMENT_PLANS: UserRole[] = ['super_admin', 'admin', 'admin_clinica', 'dentista', 'recepcao']

/** Perfis que enxergam Prontuários Eletrónicos */
const ROLES_PRONTUARIOS: UserRole[] = ['super_admin', 'admin', 'admin_clinica', 'dentista']

/** Perfis que enxergam Módulos Financeiros Avançados (Comissões e Régua de Cobrança) */
const ROLES_FINANCIAL_MODULES: UserRole[] = ['super_admin', 'admin', 'admin_clinica', 'financeiro']

/** Mapeamento de tipos de notificações permitidas por cargo (RBAC) */
const NOTIFICATION_ROLES_MAP: Record<UserRole, NotificationItem['type'][]> = {
  super_admin: ['financial', 'appointment', 'patient', 'lgpd', 'stock', 'system'],
  admin: ['financial', 'appointment', 'patient', 'lgpd', 'stock', 'system'],
  admin_clinica: ['financial', 'appointment', 'patient', 'lgpd', 'stock', 'system'],
  financeiro: ['financial', 'system'],
  recepcao: ['appointment', 'patient', 'system'],
  dentista: ['appointment', 'patient', 'system'],
}

// ─── Rótulos humanizados para os cargos ─────────────────────────────────────────
const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  admin_clinica: 'Admin da Clínica',
  dentista: 'Cirurgião-Dentista',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'US'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── Links de navegação principal (Topo - Links Visíveis) ─────────────────────
const navLinks: { name: string; path: string; allowedRoles: UserRole[] }[] = [
  { name: 'Agenda',     path: '/agenda',     allowedRoles: ['admin', 'admin_clinica', 'dentista', 'recepcao'] },
  { name: 'Pacientes',  path: '/pacientes',  allowedRoles: ['admin', 'admin_clinica', 'dentista', 'recepcao'] },
  { name: 'Financeiro', path: '/financeiro', allowedRoles: ['admin', 'admin_clinica', 'financeiro'] },
  { name: 'Estoque',    path: '/estoque',    allowedRoles: ['admin', 'admin_clinica', 'dentista', 'recepcao'] },
]

// ─────────────────────────────────────────────────────────────────────────────

export default function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, session } = useAuth()
  const { clinica, isSuperAdminContext, refreshClinica } = useClinica()
  
  const [isDropdownOpen,   setIsDropdownOpen]   = useState(false)
  const [isUserMenuOpen,   setIsUserMenuOpen]   = useState(false)
  const [isToolsOpen,      setIsToolsOpen]      = useState(false)
  const [isTarefasOpen,    setIsTarefasOpen]    = useState(false)
  const [isCalculadoraOpen,  setIsCalculadoraOpen]  = useState(false)
  const [isReceituarioOpen,  setIsReceituarioOpen]  = useState(false)
  const [isAtestadoOpen,     setIsAtestadoOpen]     = useState(false)
  const [isSearchOpen,     setIsSearchOpen]     = useState(false)
  const [notifications,    setNotifications]    = useState<NotificationItem[]>([])

  const userMenuRef = useRef<HTMLDivElement>(null)
  const toolsMenuRef = useRef<HTMLDivElement>(null)

  // Fechar menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false)
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setIsToolsOpen(false)
      }
    }
    if (isUserMenuOpen || isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen, isToolsOpen])

  // Fechar menus ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
        setIsToolsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
        if (role === 'admin' || role === 'admin_clinica' || role === 'financeiro') {
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
        if (role === 'admin' || role === 'admin_clinica' || role === 'dentista' || role === 'recepcao') {
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

        // 4. Alertas de Gestão, LGPD e Estoque (exclusivo admin / gestores)
        if (role === 'admin' || role === 'admin_clinica' || role === 'super_admin') {
          const { count: lgpdPendentesCount } = await supabase
            .from('pacientes')
            .select('id', { count: 'exact', head: true })
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

          // Consulta real na tabela estoque respeitando isolamento multi-tenant
          const effectiveClinicaId = profile?.clinica_id || clinica?.id
          let estoqueQuery = supabase
            .from('estoque')
            .select('id, nome, quantidade, minimo')

          if (effectiveClinicaId) {
            estoqueQuery = estoqueQuery.eq('clinica_id', effectiveClinicaId)
          }

          const { data: estoqueItens, error: estoqueError } = await estoqueQuery

          if (!estoqueError && estoqueItens && estoqueItens.length > 0) {
            const itensCriticos = estoqueItens.filter((item: any) => {
              const qtd = Number(item.quantidade ?? 0)
              const min = Number(item.minimo ?? 0)
              return min > 0 && qtd <= min
            })

            if (itensCriticos.length > 0) {
              const nomesAmostra = itensCriticos.slice(0, 2).map((i: any) => i.nome).join(', ')
              const sufixoMais = itensCriticos.length > 2 ? ` e mais ${itensCriticos.length - 2} item(ns)` : ''
              notifs.push({
                id: 'notif-estoque-critico',
                type: 'stock',
                title: 'Alerta de Estoque Mínimo',
                description: `${itensCriticos.length} ${itensCriticos.length === 1 ? 'item atingiu' : 'itens atingiram'} o estoque mínimo de segurança (${nomesAmostra}${sufixoMais}).`,
                time: 'Hoje',
                unread: true,
                link: '/estoque',
              })
            }
          }
        }

        setNotifications(notifs)
      } catch (err) {
        console.error('Erro ao carregar notificações:', err)
      }
    }

    fetchNotifications()
  }, [role, profile?.clinica_id, clinica?.id])

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
    try {
      await exitClinicContextAction()
    } catch {}
    await logAuthAction('logout')
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ─── Flags de visibilidade derivadas do role e contexto ──────────────────────
  const isSuper              = profile?.role === 'super_admin'
  const canSeeTools          = (isSuper && isSuperAdminContext) || hasPermission(role, ROLES_WITH_TOOLS)
  const canSeeMedicalDocs    = (isSuper && isSuperAdminContext) || hasPermission(role, ROLES_MEDICAL_DOCS)
  const canSeeTreatmentPlans = (isSuper && isSuperAdminContext) || hasPermission(role, ROLES_TREATMENT_PLANS)
  const canSeeProntuarios    = (isSuper && isSuperAdminContext) || hasPermission(role, ROLES_PRONTUARIOS)
  const canSeeClinicalGroup  = canSeeTreatmentPlans || canSeeProntuarios
  const canSeeFinancialGroup = (isSuper && isSuperAdminContext) || hasPermission(role, ROLES_FINANCIAL_MODULES)
  const isAdmin              = (isSuper && isSuperAdminContext) || hasPermission(role, ['admin', 'admin_clinica'])

  const renderedNavLinks = useMemo(() => {
    if (isSuper) {
      if (isSuperAdminContext) {
        return [
          { name: 'Agenda', path: '/agenda' },
          { name: 'Pacientes', path: '/pacientes' },
          { name: 'Prontuários', path: '/prontuarios' },
          { name: 'Financeiro', path: '/financeiro' },
          { name: 'Estoque', path: '/estoque' },
          { name: 'Configurações', path: '/configuracoes' },
        ]
      }
      return [
        { name: 'Painel Geral', path: '/admin' },
        { name: 'Clínicas', path: '/admin/clinicas' },
        { name: 'Usuários', path: '/admin/usuarios' },
        { name: 'Assinaturas', path: '/admin/assinaturas' },
      ]
    }
    return navLinks
      .filter((link) => hasPermission(role, link.allowedRoles))
      .map((link) => ({ name: link.name, path: link.path }))
  }, [isSuper, isSuperAdminContext, role])

  async function handleVoltarPainelGlobal() {
    try {
      const res = await exitClinicContextAction()
      if (res.success) {
        toast.success('Retornando ao Painel Administrativo Global.')
        await refreshClinica()
        router.push('/admin')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao retornar ao painel global.')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <header className="h-16 w-full flex items-center justify-between px-4 sm:px-8 z-50 bg-[var(--bg-surface)] border-b border-[var(--border)] shrink-0 transition-colors duration-200">
      
      {/* ── Lado esquerdo: Logo + Nav ── */}
      <div className="flex items-center gap-4 sm:gap-6">
        <Link 
          href={isSuper && !isSuperAdminContext ? '/admin' : '/overview'} 
          prefetch={true} 
          className="flex items-center gap-3 active:scale-95 transition-transform"
        >
          {clinica?.logo_url ? (
            <div className="h-9 w-9 rounded-2xl overflow-hidden flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border)]/80  shadow-2xs shrink-0">
              <img
                src={clinica.logo_url}
                alt="Logo da clínica"
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-9 w-9 bg-[var(--primary)] rounded-2xl flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--on-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          )}
          <div className="flex items-center gap-2">
            <h1 
              className="text-lg sm:text-xl font-black text-[var(--text-primary)] tracking-tight truncate max-w-[140px] sm:max-w-[220px] md:max-w-[300px]" 
              title={isSuper && !isSuperAdminContext ? 'OdontoSoft Global' : (clinica?.nome_exibido?.trim() || clinica?.nome?.trim() || 'OdontoSoft')}
            >
              {isSuper && !isSuperAdminContext ? 'OdontoSoft' : (clinica?.nome_exibido?.trim() || clinica?.nome?.trim() || 'OdontoSoft')}
            </h1>
            {isSuper && isSuperAdminContext && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Contexto
              </span>
            )}
            {isSuper && !isSuperAdminContext && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30">
                Painel Global
              </span>
            )}
          </div>
        </Link>

        {/* Nav principal — filtrada por role e contexto */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[var(--bg-base)] p-1 rounded-2xl border border-[var(--border)]">
          {renderedNavLinks.map(link => {
            const isBaseMatch = link.path === '/admin'
              ? pathname === '/admin'
              : pathname === link.path || pathname.startsWith(link.path + '/') || pathname.startsWith('/dashboard' + link.path)
            return (
              <Link 
                key={link.name} 
                href={link.path}
                prefetch={true}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 ${
                  isBaseMatch
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ── Lado direito: Ferramentas Rápidas + Suporte + Busca + Ações + Perfil ── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

        {/* ── Menu Dropdown: Utilitários Clínicos Rápidos ── */}
        {canSeeTools && (
          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all border outline-none active:scale-[0.98] ${
                isToolsOpen
                  ? 'bg-[var(--bg-base)] border-[var(--border-medium)] text-[var(--primary)]'
                  : 'bg-[var(--bg-base)] border-[var(--border)] hover:border-[var(--border-medium)] text-[var(--text-primary)]'
              }`}
              aria-expanded={isToolsOpen}
              aria-haspopup="true"
              aria-label="Abrir menu de utilitários rápidos"
            >
              <LayoutGrid className="h-4 w-4 text-[var(--text-muted)]" />
              <span className="hidden md:inline">Ferramentas</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${
                  isToolsOpen ? 'rotate-180 text-[var(--primary)]' : ''
                }`}
              />
            </button>

            {isToolsOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-80 sm:w-84 max-h-[calc(100vh-5rem)] overflow-y-auto bg-[var(--bg-surface)] rounded-3xl shadow-md border border-[var(--border)] py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150 origin-top-right divide-y divide-[var(--border)]"
                role="menu"
              >
                {/* ── GRUPO 1: UTILITÁRIOS RÁPIDOS ── */}
                <div className="py-1 px-1.5 space-y-0.5">
                  <div className="px-3 pt-2 pb-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                      Utilitários Rápidos
                    </p>
                  </div>

                  {/* Calculadora */}
                  <button
                    onClick={() => { setIsCalculadoraOpen(prev => !prev); setIsToolsOpen(false) }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group text-left"
                  >
                    <div className="p-2 rounded-xl bg-[var(--bg-base)] group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)] transition-colors shrink-0">
                      <Calculator className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--text-primary)]">Calculadora</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">Cálculos e conversões imediatas</span>
                    </div>
                  </button>

                  {/* Receituário Rápido & Atestado Médico (atos médicos) */}
                  {canSeeMedicalDocs && (
                    <>
                      <button
                        onClick={() => { setIsReceituarioOpen(prev => !prev); setIsToolsOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]  hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group text-left"
                      >
                        <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--text-primary)]">Receituário Rápido</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">Emissão ágil com posologia</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { setIsAtestadoOpen(prev => !prev); setIsToolsOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group text-left"
                      >
                        <div className="p-2 rounded-xl bg-[var(--bg-base)] group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)] transition-colors shrink-0">
                          <FileBadge className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--text-primary)]">Atestado Odontológico</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-normal">Declaração e afastamento legal</span>
                        </div>
                      </button>
                    </>
                  )}
                </div>

                {/* ── GRUPO 2: MÓDULOS CLÍNICOS & GESTÃO ── */}
                {canSeeClinicalGroup && (
                  <div className="py-1 px-1.5 space-y-0.5">
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
                        Módulos Clínicos & Gestão
                      </p>
                    </div>

                    {canSeeTreatmentPlans && (
                      <Link
                        href="/planos-tratamento"
                        prefetch={true}
                        onClick={() => setIsToolsOpen(false)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group"
                      >
                        <div className="p-2 rounded-xl bg-[var(--bg-base)] group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)] transition-colors shrink-0">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--text-primary)]">Planos de Tratamento</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-normal">Orçamentos e fases de tratamento</span>
                        </div>
                      </Link>
                    )}

                    {canSeeProntuarios && (
                      <Link
                        href="/prontuarios"
                        prefetch={true}
                        onClick={() => setIsToolsOpen(false)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group"
                      >
                        <div className="p-2 rounded-xl bg-[var(--bg-base)] group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)] transition-colors shrink-0">
                          <ClipboardPlus className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--text-primary)]">Prontuário Eletrónico</span>
                          <span className="text-[10px] text-[var(--text-secondary)] font-normal">Histórico clínico e evoluções</span>
                        </div>
                      </Link>
                    )}
                  </div>
                )}

                {/* ── GRUPO 3: MÓDULOS FINANCEIROS & AVANÇADOS ── */}
                {canSeeFinancialGroup && (
                  <div className="py-1 px-1.5 space-y-0.5">
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                        Módulos Financeiros & Avançados
                      </p>
                    </div>

                    <Link
                      href="/comissoes"
                      prefetch={true}
                      onClick={() => setIsToolsOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]  hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group"
                    >
                      <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] group-hover:bg-amber-50 dark:group-hover:bg-amber-950/50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors shrink-0">
                        <Percent className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">Controle de Comissões</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">Repasses e produção dos dentistas</span>
                      </div>
                    </Link>

                    <Link
                      href="/regua-cobranca"
                      prefetch={true}
                      onClick={() => setIsToolsOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]  hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group"
                    >
                      <div className="p-2 rounded-xl bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] group-hover:bg-rose-50 dark:group-hover:bg-rose-950/50 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">Régua de Cobrança</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal">Automação de lembretes e cobrança</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Botão Suporte WhatsApp ── */}
        <button
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
          className="hidden xl:flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-[0.98]"
          title="Falar com Suporte Técnico"
        >
          <HeadphonesIcon className="h-4 w-4" />
          <span>Suporte</span>
        </button>

        {/* ── Busca global com atalho Kbd ── */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2.5 bg-[var(--bg-base)] border border-[var(--border)] px-3.5 py-2 rounded-2xl text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)] hover:border-[var(--border-medium)] text-xs sm:text-sm font-medium group active:scale-[0.98]"
          title="Buscar no sistema (⌘K ou Ctrl+K)"
        >
          <Search className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
          <span className="hidden sm:inline">Buscar...</span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-lg bg-[var(--border)] text-[10px] font-extrabold text-[var(--text-secondary)] border border-[var(--border-medium)] select-none">
            ⌘K
          </kbd>
        </button>

        {/* ── Cluster: Notificações + Alternância de Tema ── */}
        <div className="flex items-center bg-[var(--bg-base)] p-1 rounded-2xl border border-[var(--border)] gap-0.5">
          {/* Notificações com badge */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`p-2 rounded-xl relative transition-all ${
                isDropdownOpen
                  ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
              }`}
              title="Notificações da Clínica"
              aria-label="Abrir notificações"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-extrabold text-white ring-2 ring-[var(--bg-surface)] animate-in zoom-in-50">
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

          {/* Alternância de tema claro/escuro */}
          <ThemeToggle />
        </div>

        {/* Divisor vertical sutil */}
        <div className="h-6 w-px bg-[var(--border)] mx-0.5 hidden sm:block" />

        {/* Botão Contextual: Voltar ao Painel Global para Super Admin em contexto */}
        {isSuper && isSuperAdminContext && (
          <button
            onClick={handleVoltarPainelGlobal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shrink-0"
            title="Voltar ao Painel Administrativo Global"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Painel Global</span>
          </button>
        )}

        {/* ── Bloco de Perfil do Utilizador + Menu Dropdown Centralizado ── */}
        <div className="relative ml-1 sm:ml-2" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex items-center gap-2.5 p-1 sm:pr-3 rounded-2xl transition-all border outline-none active:scale-[0.98] ${
              isUserMenuOpen
                ? 'bg-[var(--bg-base)] border-[var(--border-medium)]'
                : 'bg-[var(--bg-base)] border-[var(--border)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-medium)]'
            }`}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
            aria-label="Menu de perfil do utilizador"
          >
            {/* Avatar sem gradiente nem brilho, iniciais e status online */}
            <div className="relative h-9 w-9 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-extrabold text-xs shrink-0">
              {getInitials(profile?.nome)}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--success)] ring-2 ring-[var(--bg-surface)]" />
            </div>

            {/* Informações do utilizador: Nome Completo + Cargo humanizado */}
            <div className="hidden sm:flex flex-col text-left leading-tight pr-0.5">
              <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[130px] md:max-w-[170px]" title={profile?.nome?.trim() || 'Meu Perfil'}>
                {profile?.nome?.trim() || 'Meu Perfil'}
              </span>
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                {ROLE_LABELS[role] || 'Membro da Equipe'}
              </span>
            </div>

            {/* Chevron animado */}
            <ChevronDown
              className={`hidden sm:block h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${
                isUserMenuOpen ? 'rotate-180 text-[var(--primary)]' : ''
              }`}
            />
          </button>

          {/* Dropdown / Popover Centralizado */}
          {isUserMenuOpen && (
            <div 
              className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-surface)] rounded-3xl shadow-md border border-[var(--border)]/80  py-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 origin-top-right divide-y divide-[var(--border)]"
              role="menu"
            >
              {/* Header do Menu com identificação completa */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center font-black text-sm shrink-0">
                    {getInitials(profile?.nome)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[var(--text-primary)] truncate" title={profile?.nome?.trim() || 'Usuário'}>
                      {profile?.nome?.trim() || 'Usuário'}
                    </p>
                    <p className="text-xs font-medium text-[var(--text-muted)] truncate" title={session?.user?.email || ''}>
                      {session?.user?.email || 'Acesso seguro'}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30">
                    <ShieldCheck className="h-3 w-3" />
                    {ROLE_LABELS[role] || 'Membro da Equipe'}
                  </span>
                </div>
              </div>

              {/* Seção 1: Configurações Pessoais (Perfil, Senha e Credenciais) */}
              <div className="py-1.5 px-1.5 space-y-0.5">
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  Configurações Pessoais
                </p>
                <Link
                  href="/minha-conta"
                  prefetch={true}
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]  hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group"
                >
                  <div className="p-1 rounded-lg bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] group-hover:bg-[var(--primary-subtle)] dark:group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)] dark:group-hover:text-[var(--primary)] transition-colors">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold">Meu Perfil</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">Alterar dados pessoais e identificação</span>
                  </div>
                </Link>

                <Link
                  href="/minha-conta"
                  prefetch={true}
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]  hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group"
                >
                  <div className="p-1 rounded-lg bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] group-hover:bg-amber-50 dark:group-hover:bg-amber-950/50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-semibold">Segurança & Palavra-passe</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">Modificar senha e acessos</span>
                  </div>
                </Link>
              </div>

              {/* Seção 2: Administração da Clínica (Exclusivo para admin / admin_clinica) */}
              {isAdmin && (
                <div className="py-1.5 px-1.5 space-y-0.5">
                  <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Administração da Clínica
                  </p>
                  <Link
                    href="/configuracoes"
                    prefetch={true}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-xl font-medium transition-colors group"
                  >
                    <div className="p-1 rounded-lg bg-[var(--bg-base)] group-hover:bg-[var(--primary-subtle)] group-hover:text-[var(--primary)] transition-colors">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">Configurações do Sistema</span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-normal">Dados da clínica, logotipo e permissões</span>
                    </div>
                  </Link>
                </div>
              )}

              {/* Seção Super Admin: Painel Global da Plataforma */}
              {isSuper && (
                <div className="py-1.5 px-1.5 space-y-0.5">
                  <p className="px-3 pt-1.5 pb-1 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Administração Geral SaaS
                  </p>
                  <Link
                    href="/admin"
                    prefetch={true}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs sm:text-sm text-[var(--primary)] hover:bg-[var(--primary-subtle)] rounded-xl font-bold transition-colors group"
                  >
                    <div className="p-1 rounded-lg bg-[var(--primary-subtle)] text-[var(--primary)] transition-colors">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-semibold">Painel Global</span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-normal">Clínicas, usuários e indicadores</span>
                    </div>
                  </Link>
                </div>
              )}

              {/* Seção 3: Logout */}
              <div className="py-1.5 px-1.5">
                <button
                  onClick={logout}
                  className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs sm:text-sm text-[var(--error)] hover:bg-[var(--error-bg)] rounded-xl font-bold transition-colors group"
                >
                  <div className="p-1 rounded-lg bg-[var(--error-bg)] transition-colors">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span>Terminar Sessão</span>
                </button>
              </div>
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