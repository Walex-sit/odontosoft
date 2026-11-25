'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Building2, Users, ShieldCheck, Cpu, Save, Sliders, Smartphone, Mail, Globe,
  UserPlus, Loader2, Pencil, Trash2, Percent, FileText, CheckCircle2, AlertTriangle,
  Clock, Lock, ExternalLink, RefreshCw, Download, Upload, X, Camera, CreditCard, Sparkles, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import ManageRolePermissionsModal, { Role } from '@/app/components/ManageRolePermissionsModal'
import CreateUserModal from '@/app/components/CreateUserModal'
import EditUserModal from '@/app/components/EditUserModal'
import { fetchTeamMembers, deleteUserAccount } from '@/app/actions/users'
import CommissionModal from '@/app/components/CommissionModal'
import { fetchCommissions } from '@/app/actions/commissions'
import { fetchAuditLogs, fetchComplianceStats, AuditLog, ComplianceStats } from '@/app/actions/audit'
import { fetchClinicaSettings, updateClinicaSettings, uploadClinicaLogo, removeClinicaLogo, ClinicaSettings } from '@/app/actions/clinica'
import { fetchClinicSubscription, upgradeOrChangePlan, ClinicSubscriptionData } from '@/app/actions/billing'
import { useAuth } from '@/app/components/RequireAuth'
import { useClinica } from '@/app/contexts/ClinicaContext'
import Link from 'next/link'
import Image from 'next/image'

// ─── Badge de ação colorido ──────────────────────────────────────────────────

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  criacao:    { bg: 'bg-[var(--bg-surface)] border border-[var(--success)]/45', text: 'text-[var(--success)]', label: 'CRIAÇÃO' },
  edicao:     { bg: 'bg-[var(--bg-surface)] border border-[var(--primary)]/45', text: 'text-[var(--primary)]', label: 'EDIÇÃO' },
  exclusao:   { bg: 'bg-[var(--bg-surface)] border border-[var(--error)]/45', text: 'text-[var(--error)]', label: 'EXCLUSÃO' },
  financeiro: { bg: 'bg-[var(--bg-surface)] border border-[var(--warning)]/45', text: 'text-[var(--warning)]', label: 'FINANCEIRO' },
  login:      { bg: 'bg-[var(--bg-surface)] border border-[var(--primary)]/45', text: 'text-[var(--primary)]', label: 'LOGIN' },
  logout:     { bg: 'bg-[var(--bg-surface)] border border-[var(--border)]', text: 'text-[var(--text-secondary)]', label: 'LOGOUT' },
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] ?? { bg: 'bg-[var(--bg-surface)] border border-[var(--border)]', text: 'text-[var(--text-secondary)]', label: action.toUpperCase() }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

// ─── Card de Métrica ─────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className={`p-5 rounded-2xl border bg-[var(--bg-surface)] shadow-sm flex items-start gap-4 ${color}`}>
      <div className="p-3 rounded-xl bg-current/10 shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-[var(--text-primary)] leading-none">{value}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const { profile, session, isSuperAdmin, isLifetime } = useAuth()
  const { clinica: ctxClinica, refreshClinica } = useClinica()
  const [activeTab, setActiveTab] = useState<'perfil' | 'usuarios' | 'assinatura' | 'integracoes' | 'comissoes' | 'seguranca'>('perfil')
  const [salvando, setSalvando] = useState(false)

  // ─── Assinatura & Planos SaaS ─────────────────────────────────────────────
  const [subscriptionData, setSubscriptionData] = useState<ClinicSubscriptionData | null>(null)
  const [isLoadingBilling, setIsLoadingBilling] = useState(false)
  const [isChangingPlan, setIsChangingPlan] = useState<string | null>(null)

  // R-004 (Auditoria Etapa 4): fallback hardcoded 'testealex@gmail.com' removido.
  const configuredOwnerEmail = (process.env.NEXT_PUBLIC_OWNER_EMAIL || '').toLowerCase().trim()
  const isOwnerExactMatch = Boolean(
    configuredOwnerEmail &&
    session?.user?.email &&
    session.user.email.toLowerCase().trim() === configuredOwnerEmail &&
    (profile?.role === 'super_admin' || profile?.is_lifetime === true)
  )

  const isVitalicio = Boolean(
    subscriptionData?.isLifetime ||
    subscriptionData?.isSuperAdmin ||
    isSuperAdmin ||
    isLifetime ||
    profile?.is_lifetime ||
    profile?.role === 'super_admin' ||
    isOwnerExactMatch
  )

  // ─── Perfil da Clínica (dados reais) ──────────────────────────────────────
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [clinica, setClinica] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    croResponsavel: '',
    endereco: '',
    site: '',
  })
  const [nomeExibido, setNomeExibido] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Estados para o Modal de Permissões
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [selectedRoleName, setSelectedRoleName] = useState('')

  // Estados para Membros da Equipe
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<{ id: string; nome: string; email: string; role: string } | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  // Estados para Comissões
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)
  const [commissions, setCommissions] = useState<any[]>([])
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false)

  // Estados para Segurança / Conformidade
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null)
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false)
  const [filtroAction, setFiltroAction] = useState('')

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadClinicaSettings = async () => {
    const targetClinicaId = profile?.clinica_id || (isSuperAdmin ? ctxClinica?.id : null)
    if (!targetClinicaId) {
      setClinicaId(null)
      setIsLoadingPerfil(false)
      return
    }

    setIsLoadingPerfil(true)
    try {
      const res = await fetchClinicaSettings(targetClinicaId)
      if (res.success && res.data) {
        const d = res.data
        setClinicaId(d.clinica_id || d.id)
        setClinica({
          nome: d.nome ?? '',
          cnpj: d.cnpj ?? '',
          telefone: d.telefone ?? '',
          email: d.email ?? '',
          croResponsavel: d.cro_responsavel ?? '',
          endereco: d.endereco ?? '',
          site: d.site ?? '',
        })
        setNomeExibido(d.nome_exibido ?? '')
        setLogoUrl(d.logo_url ?? null)
      }
    } catch (e) {
      console.error('Erro ao carregar configurações da clínica:', e)
    } finally {
      setIsLoadingPerfil(false)
    }
  }

  const loadBillingData = async () => {
    const targetClinicaId = profile?.clinica_id || (isSuperAdmin ? ctxClinica?.id : null)

    // Regra 4: Não executa consultas de assinatura se usuário não possuir clínica vinculada
    // ou se Super Admin não tiver clínica selecionada no contexto
    if (!targetClinicaId) {
      setSubscriptionData(null)
      setIsLoadingBilling(false)
      return
    }

    setIsLoadingBilling(true)
    try {
      const res = await fetchClinicSubscription(targetClinicaId)
      if (res.success && res.data) {
        setSubscriptionData(res.data)
      } else if (res.error) {
        console.error('Falha ao carregar assinatura:', res.error)
      }
    } catch (e) {
      console.error('Erro ao buscar dados de assinatura:', e)
    } finally {
      setIsLoadingBilling(false)
    }
  }

  const loadCommissions = async () => {
    setIsLoadingCommissions(true)
    try {
      const res = await fetchCommissions()
      setCommissions(res.data ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingCommissions(false)
    }
  }

  const loadTeamMembers = async () => {
    setIsLoadingMembers(true)
    try {
      const res = await fetchTeamMembers()
      setTeamMembers(res.data ?? [])
      if (!res.success && res.error) {
        console.error('Falha ao carregar equipe:', res.error)
      }
    } catch (e) {
      console.error('Erro inesperado ao carregar equipe:', e)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  const loadSecurityData = async (actionFilter?: string) => {
    setIsLoadingSecurity(true)
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetchAuditLogs({ action: actionFilter || undefined, limit: 50 }),
        fetchComplianceStats(),
      ])
      setAuditLogs(logsRes.data)
      setComplianceStats(statsRes.data)
    } catch (e) {
      console.error('Erro ao carregar dados de segurança:', e)
    } finally {
      setIsLoadingSecurity(false)
    }
  }

  // Carrega configurações da clínica ao montar ou quando a clínica do contexto for resolvida
  useEffect(() => {
    const targetId = profile?.clinica_id || (isSuperAdmin ? ctxClinica?.id : null)
    if (targetId) {
      loadClinicaSettings()
    } else {
      setIsLoadingPerfil(false)
    }
  }, [profile?.clinica_id, isSuperAdmin, ctxClinica?.id])

  useEffect(() => {
    if (activeTab === 'usuarios') {
      loadTeamMembers()
    } else if (activeTab === 'assinatura') {
      const targetId = profile?.clinica_id || (isSuperAdmin ? ctxClinica?.id : null)
      if (targetId) {
        loadBillingData()
      } else {
        setSubscriptionData(null)
        setIsLoadingBilling(false)
      }
    } else if (activeTab === 'comissoes') {
      loadCommissions()
    } else if (activeTab === 'seguranca') {
      loadSecurityData(filtroAction)
    }
  }, [activeTab, profile?.clinica_id, isSuperAdmin, ctxClinica?.id])

  useEffect(() => {
    if (activeTab === 'seguranca') loadSecurityData(filtroAction)
  }, [filtroAction])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleChangePlan = async (novoPlano: 'essencial' | 'premium') => {
    if (!subscriptionData?.podeGerenciar) {
      toast.error('Apenas Administradores podem alterar o plano da clínica.')
      return
    }
    if (subscriptionData.planoId === novoPlano) {
      toast.info(`Sua clínica já está no Plano ${novoPlano === 'premium' ? 'Premium & Compliance' : 'Essencial'}.`)
      return
    }
    setIsChangingPlan(novoPlano)
    try {
      const targetId = profile?.clinica_id || (isSuperAdmin ? ctxClinica?.id : null)
      const res = await upgradeOrChangePlan(novoPlano, targetId || undefined)
      if (res.success) {
        toast.success(res.message)
        loadBillingData()
      } else {
        toast.info(res.message)
      }
    } catch {
      toast.error('Erro inesperado ao alterar plano.')
    } finally {
      setIsChangingPlan(null)
    }
  }

  const handleEditUser = (member: { id: string; nome: string; email: string; role: string }) => {
    setEditingUser(member)
    setIsEditUserModalOpen(true)
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação é irreversível.`)) return
    setDeletingUserId(userId)
    try {
      const res = await deleteUserAccount(userId, profile?.id, profile?.nome)
      if (res.success) {
        toast.success('Usuário excluído com sucesso!')
        loadTeamMembers()
      } else {
        toast.error(res.error || 'Erro ao excluir o usuário.')
      }
    } catch {
      toast.error('Erro inesperado ao excluir o usuário.')
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleSalvar = async () => {
    if (!clinicaId) {
      toast.error('ID da clínica não encontrado. Recarregue a página.')
      return
    }
    setSalvando(true)
    try {
      const res = await updateClinicaSettings({
        id: clinicaId,
        target_clinica_id: ctxClinica?.id || undefined,
        nome: clinica.nome,
        cnpj: clinica.cnpj,
        telefone: clinica.telefone,
        email: clinica.email,
        cro_responsavel: clinica.croResponsavel,
        endereco: clinica.endereco,
        site: clinica.site,
        nome_exibido: nomeExibido.trim() || null,
      })
      if (res.success) {
        await refreshClinica()
        toast.success('Configurações salvas com sucesso!')
      } else {
        toast.error(res.error || 'Erro ao salvar configurações.')
      }
    } catch {
      toast.error('Erro inesperado ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleLogoUpload = async () => {
    if (!logoFile || !clinicaId) return
    setIsUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('logo', logoFile)
      fd.append('clinicaId', clinicaId)
      const res = await uploadClinicaLogo(fd)
      if (res.success && res.logo_url) {
        setLogoUrl(res.logo_url)
        setLogoPreview(null)
        setLogoFile(null)
        toast.success('Logo atualizada com sucesso!')
      } else {
        toast.error(res.error || 'Erro ao fazer upload.')
      }
    } catch {
      toast.error('Erro inesperado no upload.')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!clinicaId) return
    if (!confirm('Tem certeza que deseja remover a logo da clínica?')) return
    setIsUploadingLogo(true)
    try {
      const res = await removeClinicaLogo(clinicaId)
      if (res.success) {
        setLogoUrl(null)
        setLogoPreview(null)
        setLogoFile(null)
        toast.success('Logo removida com sucesso!')
      } else {
        toast.error(res.error || 'Erro ao remover a logo.')
      }
    } catch {
      toast.error('Erro inesperado ao remover.')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // Estado de Integrações (mantido como mock por ora)
  const [integracoes, setIntegracoes] = useState({
    whatsapp: true,
    nfe: false,
    googleCalendar: true,
    pagamentosPix: true
  })

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const lgpdPercent = complianceStats && complianceStats.totalPacientes > 0
    ? Math.round((complianceStats.pacientesComAceite / complianceStats.totalPacientes) * 100)
    : 0

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  const entityLabel = (entity: string) => {
    const map: Record<string, string> = {
      pacientes: 'Pacientes', usuarios: 'Usuários', receitas: 'Receitas',
      despesas: 'Despesas', prontuarios: 'Prontuários', auth: 'Autenticação',
    }
    return map[entity] ?? entity
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-[var(--bg-surface)] border-b border-[var(--border)]  shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Configurações do Sistema</h1>
            <p className="text-sm font-semibold text-[var(--text-muted)] mt-1">Gerencie os dados da sua clínica, permissões de usuários e integrações</p>
          </div>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-6 py-2.5 rounded-xl font-bold text-sm transition-all  flex items-center justify-center gap-2 self-start md:self-auto disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        {/* Abas */}
        <div className="max-w-6xl mx-auto flex items-center gap-2 mt-8 border-b border-[var(--border)] pb-0.5 overflow-x-auto">
          {(
            [
              { id: 'perfil',      label: 'Perfil da Clínica',      icon: <Building2 className="h-4 w-4" /> },
              { id: 'usuarios',    label: 'Usuários e Permissões',   icon: <Users className="h-4 w-4" /> },
              { id: 'assinatura',  label: 'Assinatura & Planos',     icon: <CreditCard className="h-4 w-4" /> },
              { id: 'comissoes',   label: 'Comissões',               icon: <Percent className="h-4 w-4" /> },
              { id: 'integracoes', label: 'Integrações',             icon: <Cpu className="h-4 w-4" /> },
              { id: 'seguranca',   label: 'Segurança',               icon: <ShieldCheck className="h-4 w-4" /> },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary-subtle)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)]'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.id === 'assinatura' && subscriptionData && (
                <span className={`ml-1 text-xs font-extrabold px-2 py-0.5 rounded-full bg-[var(--bg-surface)] border ${
                  subscriptionData.status === 'ativo'
                    ? 'text-[var(--success)] border-[var(--success)]/45'
                    : subscriptionData.status === 'inadimplente'
                    ? 'text-[var(--error)] border-[var(--error)]/45'
                    : 'text-[var(--warning)] border-[var(--warning)]/45'
                }`}>
                  {subscriptionData.status === 'trial' ? 'TRIAL' : subscriptionData.status === 'ativo' ? 'ATIVO' : 'PENDENTE'}
                </span>
              )}
              {tab.id === 'seguranca' && (
                <span className="ml-1 bg-[var(--primary-subtle)] text-[var(--primary)] text-xs font-extrabold px-1.5 py-0.5 rounded-full">LGPD</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {/* ABA 1: PERFIL DA CLÍNICA */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            {isLoadingPerfil ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-3" />
                <p className="text-sm text-[var(--text-muted)] font-semibold">Carregando dados da clínica...</p>
              </div>
            ) : isSuperAdmin && !ctxClinica?.id ? (
              <div className="p-12 rounded-[32px] border border-dashed border-[var(--border)]  bg-[var(--bg-surface)] text-center shadow-xs">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                  Nenhuma clínica selecionada no contexto
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mb-6 leading-relaxed">
                  Como Super Admin Global, seu usuário opera sem vínculo fixo a uma clínica (<code className="text-xs bg-[var(--bg-base)] dark:bg-[var(--border)] px-1.5 py-0.5 rounded font-mono">clinica_id = NULL</code>). Para visualizar ou configurar os dados de uma unidade, selecione uma clínica no Painel Global.
                </p>
                <Link
                  href="/admin/clinicas"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] text-xs font-bold transition-all shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ir para Gestão de Clínicas
                </Link>
              </div>
            ) : !profile?.clinica_id ? (
              <div className="p-12 rounded-[32px] border border-dashed border-[var(--border)]  bg-[var(--bg-surface)] text-center shadow-xs">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                  Clínica não vinculada
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                  Seu usuário não possui uma clínica vinculada no momento. Entre em contato com a administração da clínica ou com o suporte da plataforma para regularizar seu acesso.
                </p>
              </div>
            ) : (
              <>
                {/* ── Seção: Emblema / Logo ─────────────────────────────── */}
                <div className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]  shadow-sm">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Emblema / Logo da Clínica</h3>
                  <p className="text-sm text-[var(--text-muted)] mb-6">A logo é exibida na barra superior para todos os usuários da clínica.</p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Preview */}
                    <div className="relative shrink-0">
                      <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-[var(--border)]  bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] flex items-center justify-center overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Preview da logo" className="h-full w-full object-contain p-2" />
                        ) : logoUrl ? (
                          <img src={logoUrl} alt="Logo da clínica" className="h-full w-full object-contain p-2" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-[var(--text-muted)]">
                            <Camera className="h-8 w-8" />
                            <span className="text-xs font-bold uppercase tracking-wider">Sem logo</span>
                          </div>
                        )}
                      </div>
                      {/* Badge de estado */}
                      {logoPreview && (
                        <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full">PENDENTE</span>
                      )}
                      {logoUrl && !logoPreview && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full">ATIVO</span>
                      )}
                    </div>

                    {/* Controles */}
                    <div className="flex flex-col gap-3 flex-1">
                      <div className="flex flex-wrap gap-2">
                        {/* Input de arquivo oculto */}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={handleLogoFileChange}
                        />
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--border)] hover:bg-[var(--border)] dark:hover:bg-[var(--border-medium)] text-[var(--text-secondary)] rounded-xl text-sm font-bold transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          {logoUrl || logoPreview ? 'Alterar Logo' : 'Selecionar Logo'}
                        </button>

                        {/* Botão de confirmar upload (aparece só após selecionar nova imagem) */}
                        {logoPreview && (
                          <button
                            onClick={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] disabled:opacity-50 text-[var(--on-primary)] rounded-xl text-sm font-bold transition-colors "
                          >
                            {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isUploadingLogo ? 'Enviando...' : 'Confirmar Upload'}
                          </button>
                        )}

                        {/* Botão de cancelar (descarta preview) */}
                        {logoPreview && (
                          <button
                            onClick={() => { setLogoPreview(null); setLogoFile(null) }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--border)] hover:bg-red-50 dark:hover:bg-red-900/30 text-[var(--text-muted)] hover:text-red-600 rounded-xl text-sm font-bold transition-colors"
                          >
                            <X className="h-4 w-4" /> Cancelar
                          </button>
                        )}

                        {/* Remover logo existente */}
                        {logoUrl && !logoPreview && (
                          <button
                            onClick={handleRemoveLogo}
                            disabled={isUploadingLogo}
                            className="flex items-center gap-2 px-4 py-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                          >
                            {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Remover Logo
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] font-medium">Formatos aceitos: PNG, JPG, WEBP, SVG · Tamanho máximo: 2 MB · Recomendado: 256×256 px ou maior</p>
                    </div>
                  </div>

                  {/* ── Campo: Nome Exibido no Topo do Sistema ──────────── */}
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      Nome Exibido no Topo do Sistema
                    </label>
                    <p className="text-xs text-[var(--text-muted)] font-medium mb-3">
                      Substitui a Razão Social na barra superior para todos os usuários.
                      Deixe em branco para usar a Razão Social automaticamente.
                    </p>
                    <div className="relative">
                      <input
                        id="nome-exibido-input"
                        type="text"
                        value={nomeExibido}
                        onChange={e => setNomeExibido(e.target.value)}
                        placeholder={clinica.nome || 'Ex.: Clínica Sorrisos'}
                        maxLength={80}
                        className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all pr-20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)] select-none">
                        {nomeExibido.length}/80
                      </span>
                    </div>
                    {nomeExibido.trim() && (
                      <p className="mt-2 text-xs font-semibold text-[var(--primary)] flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Topbar exibirá: &ldquo;{nomeExibido.trim()}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Seção: Dados Cadastrais ───────────────────────────── */}
                <div className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]  shadow-sm space-y-6">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-3">Informações Cadastrais</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Razão Social / Nome da Clínica</label>
                      <input
                        type="text"
                        value={clinica.nome}
                        onChange={e => setClinica(p => ({ ...p, nome: e.target.value }))}
                        className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">CNPJ</label>
                      <input
                        type="text"
                        value={clinica.cnpj}
                        onChange={e => setClinica(p => ({ ...p, cnpj: e.target.value }))}
                        className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Telefone de Contato</label>
                      <input
                        type="text"
                        value={clinica.telefone}
                        onChange={e => setClinica(p => ({ ...p, telefone: e.target.value }))}
                        className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">E-mail Comercial</label>
                      <input
                        type="email"
                        value={clinica.email}
                        onChange={e => setClinica(p => ({ ...p, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">CRO do Responsável Técnico</label>
                      <input
                        type="text"
                        value={clinica.croResponsavel}
                        onChange={e => setClinica(p => ({ ...p, croResponsavel: e.target.value }))}
                        className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Website</label>
                      <input
                        type="text"
                        value={clinica.site}
                        onChange={e => setClinica(p => ({ ...p, site: e.target.value }))}
                        className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Endereço Completo</label>
                    <input
                      type="text"
                      value={clinica.endereco}
                      onChange={e => setClinica(p => ({ ...p, endereco: e.target.value }))}
                      className="w-full px-4 py-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ABA 2: USUÁRIOS E PERMISSÕES */}
        {activeTab === 'usuarios' && (
          <div className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]  shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Perfis de Acesso (RBAC)</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Gerencie os papeis configurados no seu OdontoSoft</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => { setSelectedRole('admin'); setSelectedRoleName('Administrador'); setIsModalOpen(true); }}
                className="p-5 border border-[var(--border)]  rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-base)] flex items-start gap-4 cursor-pointer hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] hover:shadow-md transition-all"
              >
                <div className="p-3 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">Administrador</h4>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Acesso total a todos os módulos, prontuários, financeiro e configurações.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('dentista'); setSelectedRoleName('Dentista / Odontólogo'); setIsModalOpen(true); }}
                className="p-5 border border-[var(--border)]  rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-base)] flex items-start gap-4 cursor-pointer hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] hover:shadow-md transition-all"
              >
                <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">Dentista / Odontólogo</h4>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Acesso à agenda, lista de pacientes, prontuários e evolução médica.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('recepcao'); setSelectedRoleName('Recepção'); setIsModalOpen(true); }}
                className="p-5 border border-[var(--border)]  rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-base)] flex items-start gap-4 cursor-pointer hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] hover:shadow-md transition-all"
              >
                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                  <Sliders className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">Recepção</h4>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Agendamento de consultas, confirmações e cadastro inicial de pacientes.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('financeiro'); setSelectedRoleName('Financeiro'); setIsModalOpen(true); }}
                className="p-5 border border-[var(--border)]  rounded-2xl bg-[var(--bg-base)] dark:bg-[var(--bg-base)] flex items-start gap-4 cursor-pointer hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] hover:shadow-md transition-all"
              >
                <div className="p-3 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">Financeiro</h4>
                  <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Controle de entradas, saídas, emissão de boletos e relatórios orçamentários.</p>
                </div>
              </div>
            </div>

            {/* Nova Seção: Membros da Equipe */}
            <div className="mt-12">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Membros da Equipe</h3>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Gerencie os usuários cadastrados no sistema</p>
                </div>
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-5 py-2.5 rounded-xl font-bold text-sm transition-all  flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Novo Usuário
                </button>
              </div>

              {isLoadingMembers ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-4" />
                  <p className="text-sm text-[var(--text-muted)] font-semibold">Carregando membros...</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)] ">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)]  text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                        <th className="p-4">Nome Completo</th>
                        <th className="p-4">E-mail</th>
                        <th className="p-4">Função</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {teamMembers.length > 0 ? (
                        teamMembers.map(member => (
                          <tr key={member.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors">
                            <td className="p-4 font-semibold text-[var(--text-primary)]">{member.nome}</td>
                            <td className="p-4 text-[var(--text-secondary)] text-sm">{member.email}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                (member.role === 'admin' || member.role === 'admin_clinica') ? 'bg-[var(--primary-subtle)] text-[var(--primary)]' :
                                member.role === 'dentista' ? 'bg-green-100 text-green-700' :
                                member.role === 'recepcao' ? 'bg-amber-100 text-amber-700' :
                                'bg-[var(--primary-subtle)] text-[var(--primary)]'
                              }`}>
                                {member.role === 'admin_clinica' ? 'Admin' : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditUser(member)}
                                  className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-subtle)] rounded-lg transition-all" title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(member.id, member.nome)}
                                  disabled={deletingUserId === member.id}
                                  className="p-2 text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50" title="Excluir"
                                >
                                  {deletingUserId === member.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-[var(--text-muted)] font-semibold">
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: ASSINATURA & PLANOS SAAS (PILAR 4) */}
        {activeTab === 'assinatura' && (
          <div className="space-y-8">
            {isLoadingBilling ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-3" />
                <p className="text-sm text-[var(--text-muted)] font-semibold">Carregando dados da assinatura...</p>
              </div>
            ) : subscriptionData ? (
              <>
                {/* ── Banner de Status da Assinatura ────────────────────────── */}
                <div className="relative overflow-hidden rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border)] p-8 text-[var(--text-primary)] shadow-sm dark:shadow-none">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--border)]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs uppercase tracking-wider text-[var(--primary)] font-bold">
                          Assinatura OdontoSoft SaaS
                        </span>
                        {isVitalicio ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/40">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--warning)]" />
                            Acesso Vitalício / Administrador Geral (Isento de Cobrança)
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                            subscriptionData.status === 'ativo'
                              ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30'
                              : subscriptionData.status === 'inadimplente'
                              ? 'bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error)]/30'
                              : 'bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/30'
                          }`}>
                            <span className={`h-2 w-2 rounded-full ${
                              subscriptionData.status === 'ativo' ? 'bg-[var(--success)]' : subscriptionData.status === 'inadimplente' ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'
                            }`} />
                            {subscriptionData.statusLabel}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                        {subscriptionData.nomeClinica}
                        <span className={`text-xs px-3 py-1 rounded-xl font-bold uppercase tracking-wider ${
                          isVitalicio
                            ? 'bg-[var(--warning-bg)] border border-[var(--warning)]/40 text-[var(--warning)]'
                            : 'bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--primary)]'
                        }`}>
                          {isVitalicio ? '👑 Master Vitalício' : `Plano ${subscriptionData.planoNome}`}
                        </span>
                      </h2>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                        {isVitalicio ? (
                          <>Conta Master com acesso vitalício irrestrito a todos os recursos. Não há cobranças, faturas periódicas ou contadores de expiração para o Administrador Geral.</>
                        ) : subscriptionData.status === 'trial' ? (
                          <>Aproveite os recursos essenciais liberados. Restam <strong className="text-[var(--warning)] font-bold">{subscriptionData.diasRestantesTrial ?? 7} dias</strong> no seu período de testes.</>
                        ) : (
                          <>Faturamento regular recorrente. Próxima renovação em <strong className="text-[var(--text-primary)] font-bold">{subscriptionData.periodoFim ? new Date(subscriptionData.periodoFim).toLocaleDateString('pt-BR') : 'período vigente'}</strong>.</>
                        )}
                      </p>

                      {/* Exibição do Valor Oficial do Plano (Global SaaS) */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[var(--text-secondary)] font-semibold">
                          {isVitalicio ? 'Condição da Conta:' : 'Valor do Plano:'}
                        </span>
                        {isVitalicio ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]/30">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Isento de Cobrança (Acesso Master Geral)
                          </span>
                        ) : (
                          <>
                            <span className="text-sm font-extrabold text-[var(--text-primary)]">
                              R$ {subscriptionData.valorPlano > 0 ? subscriptionData.valorPlano.toFixed(2).replace('.', ',') : (subscriptionData.planoId === 'premium' ? '299,00' : '149,00')} / mês
                            </span>
                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                              (Tabela oficial OdontoSoft)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        href="/planos"
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition-all"
                      >
                        <ExternalLink className="h-4 w-4" /> Comparar Todos os Planos
                      </Link>
                    </div>
                  </div>

                  {/* ── Quotas e Uso do Tenant ───────────────────────────── */}
                  <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                    <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)]">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Dentistas</p>
                      <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
                        {subscriptionData.dentistasCadastrados} <span className="text-xs text-[var(--text-secondary)] font-normal">/ {subscriptionData.dentistasLimite}</span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Profissionais ativos</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)]">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Pacientes</p>
                      <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
                        {subscriptionData.pacientesCadastrados} <span className="text-xs text-[var(--success)] font-bold">Ilimitados</span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Cadastros totais</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)]">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Armazenamento</p>
                      <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
                        {subscriptionData.armazenamentoUsadoMb} <span className="text-xs text-[var(--text-secondary)] font-normal">MB</span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">Imagens e prontuários</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)]">
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Isolamento & RLS</p>
                      <p className="text-xl font-extrabold text-[var(--success)] mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-5 w-5 text-[var(--success)]" /> Ativo
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">LGPD & CFO Compliant</p>
                    </div>
                  </div>
                </div>

                {/* ── Seleção e Troca de Planos ────────────────────────────── */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">Planos da Plataforma</h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {isVitalicio
                          ? 'Tabela comercial global praticada para novas clínicas e assinantes'
                          : 'Escolha o plano ideal para a capacidade operacional da sua clínica'}
                      </p>
                    </div>
                    {isVitalicio ? (
                      <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 px-3 py-1 rounded-xl flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Conta Geral Isenta de Cobrança
                      </span>
                    ) : !subscriptionData.podeGerenciar && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                        Apenas Administradores podem trocar de plano
                      </span>
                    )}
                  </div>

                  {/* ── Aviso de Gateway Stripe Temporariamente Desativado ── */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800 dark:text-amber-300">
                        Cobrança Online e Alteração via Gateway Stripe Temporariamente Suspensas
                      </p>
                      <p className="mt-0.5 text-amber-700 dark:text-amber-400/90 leading-relaxed">
                        O processamento automatizado via cartão de crédito encontra-se em auditoria técnica. Todas as operações da sua clínica continuam ativas normalmente.
                      </p>
                    </div>
                  </div>

                  {isVitalicio && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                      <span>
                        Como <strong>Administrador Vitalício / Dono do SaaS</strong>, sua conta possui o pacote Master completo liberado em definitivo. Os valores de <strong>R$ 149</strong> e <strong>R$ 299</strong> são definidos globalmente por si para os clientes da plataforma e não geram encargos para a sua conta.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PLANO ESSENCIAL */}
                    <div className={`p-8 rounded-[32px] border transition-all relative flex flex-col justify-between ${
                      !isVitalicio && subscriptionData.planoId === 'essencial'
                        ? 'border-[var(--primary)]/40 bg-[var(--primary-subtle)] shadow-md ring-2 ring-[var(--primary)]/20'
                        : 'border-[var(--border)]  bg-[var(--bg-surface)] hover:border-[var(--border-medium)] dark:hover:border-[var(--border)]'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--bg-base)] dark:bg-[var(--border)] text-[var(--text-secondary)]">
                            PLANO ESSENCIAL
                          </span>
                          {!isVitalicio && subscriptionData.planoId === 'essencial' && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--primary-fill)] text-[var(--on-primary)] flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> SEU PLANO ATUAL
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-3xl font-extrabold text-[var(--text-primary)]">R$ 149</span>
                          <span className="text-xs text-[var(--text-muted)] font-semibold">/ mês</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-6">
                          Ideal para consultórios individuais e clínicas em fase de estruturação.
                        </p>

                        <div className="space-y-3 mb-8">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Até <strong>3 profissionais / dentistas</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Pacientes e prontuários ilimitados</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Agenda inteligente e disparo de confirmações</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Controle de fluxo de caixa e relatórios financeiros</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>5 GB de armazenamento em nuvem</span>
                          </div>
                        </div>
                      </div>

                      {isVitalicio ? (
                        <div className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-[var(--bg-base)] dark:bg-[var(--border)]/50 text-[var(--text-muted)] cursor-not-allowed">
                          Plano Essencial (Tabela Comercial)
                        </div>
                      ) : (
                        <button
                          onClick={() => handleChangePlan('essencial')}
                          disabled={subscriptionData.planoId === 'essencial' || isChangingPlan !== null || !subscriptionData.podeGerenciar}
                          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            subscriptionData.planoId === 'essencial'
                              ? 'bg-[var(--border)] text-[var(--text-secondary)] cursor-default'
                              : 'bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)]'
                          }`}
                        >
                          {isChangingPlan === 'essencial' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : subscriptionData.planoId === 'essencial' ? (
                            'Plano em Uso'
                          ) : (
                            'Mudar para Essencial'
                          )}
                        </button>
                      )}
                    </div>

                    {/* PLANO PREMIUM & COMPLIANCE */}
                    <div className={`p-8 rounded-[32px] border transition-all relative flex flex-col justify-between ${
                      isVitalicio
                        ? 'border-[var(--warning)]/60 bg-[var(--warning-bg)]'
                        : subscriptionData.planoId === 'premium'
                        ? 'border-[var(--primary)] bg-[var(--primary-subtle)]'
                        : 'border-[var(--border)] bg-[var(--bg-surface)]'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" /> RECOMENDADO CFO & LGPD
                          </span>
                          {isVitalicio ? (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--super-bg)] text-[var(--super-text)] flex items-center gap-1">
                              👑 ACESSO VITALÍCIO ATIVO
                            </span>
                          ) : subscriptionData.planoId === 'premium' && (
                            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[var(--primary-fill)] text-[var(--on-primary)] flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> SEU PLANO ATUAL
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-3xl font-extrabold text-[var(--text-primary)]">R$ 299</span>
                          <span className="text-xs text-[var(--text-muted)] font-semibold">/ mês</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mb-6">
                          Para clínicas consolidadas que exigem blindagem jurídica total (CFO & LGPD).
                        </p>

                        <div className="space-y-3 mb-8">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-[var(--primary)] shrink-0" />
                            <span><strong>Dentistas e Usuários Ilimitados</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-[var(--primary)] shrink-0" />
                            <span>Prontuário Imutável CFO 198/2019 (Bloqueio UPDATE/DELETE)</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-[var(--primary)] shrink-0" />
                            <span>Trilha de Auditoria LGPD e hash SHA-256</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-[var(--primary)] shrink-0" />
                            <span>50 GB com retenção de dados por 20 anos</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                            <CheckCircle2 className="h-4 w-4 text-[var(--primary)] shrink-0" />
                            <span>Suporte VIP prioritário via WhatsApp</span>
                          </div>
                        </div>
                      </div>

                      {isVitalicio ? (
                        <div className="w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-[var(--warning-bg)] border border-[var(--warning)]/40 text-[var(--warning)]">
                          <Sparkles className="h-4 w-4 text-[var(--warning)]" /> Acesso Vitalício Master Ativo (Isento)
                        </div>
                      ) : (
                        <button
                          onClick={() => handleChangePlan('premium')}
                          disabled={subscriptionData.planoId === 'premium' || isChangingPlan !== null || !subscriptionData.podeGerenciar}
                          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                            subscriptionData.planoId === 'premium'
                              ? 'bg-[var(--border)] text-[var(--text-secondary)] cursor-default'
                              : 'bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)]'
                          }`}
                        >
                          {isChangingPlan === 'premium' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : subscriptionData.planoId === 'premium' ? (
                            'Plano em Uso'
                          ) : (
                            'Fazer Upgrade para Premium'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Histórico de Faturas & Recibos ──────────────────────── */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border)]  rounded-[32px] shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                        Histórico de Faturamento e Recibos
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Extrato das faturas geradas para a clínica
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[600px]">
                      <thead className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)] ">
                        <tr className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                          <th className="px-6 py-3.5">Fatura</th>
                          <th className="px-6 py-3.5">Emissão</th>
                          <th className="px-6 py-3.5">Plano</th>
                          <th className="px-6 py-3.5">Valor</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Recibo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] divide-[var(--border)]">
                        {subscriptionData.faturas.map(fat => (
                          <tr key={fat.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-[var(--text-secondary)]">
                              {fat.numero}
                            </td>
                            <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                              {fat.dataEmissao}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)]">
                              {fat.plano}
                            </td>
                            <td className="px-6 py-4 text-xs font-extrabold text-[var(--text-primary)]">
                              {isVitalicio ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                                  <CheckCircle2 className="h-3 w-3" /> Isento (Vitalício)
                                </span>
                              ) : fat.valor > 0 ? (
                                `R$ ${fat.valor.toFixed(2).replace('.', ',')}`
                              ) : (
                                `R$ ${subscriptionData.planoId === 'premium' ? '299,00' : '149,00'}`
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                isVitalicio || fat.status === 'pago'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {isVitalicio ? 'ISENTO' : fat.status === 'pago' ? 'PAGO' : 'PENDENTE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => toast.success(`Recibo da fatura ${fat.numero} baixado com sucesso!`)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary)] hover:underline"
                              >
                                <Download className="h-3.5 w-3.5" /> Baixar PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : isSuperAdmin && !ctxClinica?.id ? (
              <div className="p-12 rounded-[32px] border border-dashed border-[var(--border)]  bg-[var(--bg-surface)] text-center shadow-xs">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--primary-subtle)] text-[var(--primary)] flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                  Nenhuma clínica selecionada no contexto
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto mb-6 leading-relaxed">
                  Como Super Admin Global, seu usuário opera sem vínculo fixo de clínica (<code className="text-xs bg-[var(--bg-base)] dark:bg-[var(--border)] px-1.5 py-0.5 rounded font-mono">clinica_id = NULL</code>). Para visualizar ou auditar os dados de assinatura e planos de uma unidade, selecione uma clínica no Painel Global.
                </p>
                <Link
                  href="/admin/clinicas"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] text-xs font-bold transition-all shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ir para Gestão de Clínicas
                </Link>
              </div>
            ) : !profile?.clinica_id ? (
              <div className="p-12 rounded-[32px] border border-dashed border-[var(--border)]  bg-[var(--bg-surface)] text-center shadow-xs">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                  Clínica não vinculada
                </h3>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                  Seu usuário não possui uma clínica vinculada no momento. Entre em contato com a administração da clínica ou com o suporte para regularizar seu acesso.
                </p>
              </div>
            ) : (
              <div className="p-12 rounded-[32px] border border-[var(--border)]  bg-[var(--bg-surface)] text-center text-[var(--text-muted)] text-sm">
                Não foi possível carregar os dados da assinatura da clínica.
              </div>
            )}
          </div>
        )}

        {/* ABA 3: INTEGRAÇÕES */}
        {activeTab === 'integracoes' && (
          <div className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]  shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 mb-4">Serviços Conectados</h3>

            <div className="space-y-4">
              <div className="p-5 border border-[var(--border)]  rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)]">WhatsApp / Notificações Automáticas</h4>
                    <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">Envio automático de lembretes e confirmações de consulta</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.whatsapp}
                  onChange={e => setIntegracoes(p => ({ ...p, whatsapp: e.target.checked }))}
                  className="h-5 w-5 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30 border-[var(--border-medium)]  cursor-pointer"
                />
              </div>

              <div className="p-5 border border-[var(--border)]  rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)]">Google Calendar</h4>
                    <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">Sincronização bidirecional das agendas da clínica</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.googleCalendar}
                  onChange={e => setIntegracoes(p => ({ ...p, googleCalendar: e.target.checked }))}
                  className="h-5 w-5 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30 border-[var(--border-medium)]  cursor-pointer"
                />
              </div>

              <div className="p-5 border border-[var(--border)]  rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-xl">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[var(--text-primary)]">Recebimento via PIX &amp; Cartões (Gateway)</h4>
                    <p className="text-xs text-[var(--text-muted)] font-semibold mt-0.5">Geração de QR Code PIX dinâmico e conciliação bancária</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.pagamentosPix}
                  onChange={e => setIntegracoes(p => ({ ...p, pagamentosPix: e.target.checked }))}
                  className="h-5 w-5 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30 border-[var(--border-medium)]  cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: COMISSÕES */}
        {activeTab === 'comissoes' && (
          <div className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border)]  shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Tabela de Comissões</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Defina a porcentagem de comissão por procedimento e dentista</p>
              </div>
              <button
                onClick={() => setIsCommissionModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-green-500/20 flex items-center gap-2"
              >
                <Percent className="h-4 w-4" />
                Nova Comissão
              </button>
            </div>

            {isLoadingCommissions ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-4" />
                <p className="text-sm text-[var(--text-muted)] font-semibold">Carregando comissões...</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)] ">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)]  text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      <th className="p-4">Dentista</th>
                      <th className="p-4">Procedimento</th>
                      <th className="p-4">Porcentagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {commissions.length > 0 ? (
                      commissions.map(c => (
                        <tr key={c.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors">
                          <td className="p-4 font-semibold text-[var(--text-primary)]">{c.dentista_nome}</td>
                          <td className="p-4 text-[var(--text-secondary)] text-sm">{c.procedimento_nome}</td>
                          <td className="p-4 text-[var(--text-secondary)] text-sm">{c.porcentagem}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-[var(--text-muted)] font-semibold">
                          Nenhuma comissão configurada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ABA 5: SEGURANÇA E CONFORMIDADE */}
        {activeTab === 'seguranca' && (
          <div className="space-y-6">

            {/* Header da aba */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
                  Painel de Conformidade LGPD
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Transparência e rastreabilidade de todas as ações sensíveis realizadas no sistema.
                </p>
              </div>
              <button
                onClick={() => loadSecurityData(filtroAction)}
                disabled={isLoadingSecurity}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingSecurity ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {/* Cards de Métricas LGPD */}
            {isLoadingSecurity && !complianceStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border)]  rounded-2xl p-5 animate-pulse h-28" />
                ))}
              </div>
            ) : complianceStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Card 1: Pacientes com aceite */}
                <div className="bg-[var(--bg-surface)] border border-emerald-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Aceite LGPD</p>
                  </div>
                  <p className="text-3xl font-extrabold text-[var(--text-primary)]">{complianceStats.pacientesComAceite}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                      <span>{lgpdPercent}% conformes</span>
                      <span>{complianceStats.totalPacientes} total</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${lgpdPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Pendentes */}
                <div className={`bg-[var(--bg-surface)] rounded-2xl p-5 shadow-sm border ${complianceStats.pacientesSemAceite > 0 ? 'border-[var(--error)]/45' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-[var(--bg-base)] border border-[var(--border)]">
                      <AlertTriangle className={`h-5 w-5 ${complianceStats.pacientesSemAceite > 0 ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`} />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Pendentes LGPD</p>
                  </div>
                  <p className={`text-3xl font-extrabold ${complianceStats.pacientesSemAceite > 0 ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>{complianceStats.pacientesSemAceite}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">
                    {complianceStats.pacientesSemAceite > 0
                      ? 'Pacientes sem consentimento registrado'
                      : 'Todos os pacientes estão em conformidade ✓'}
                  </p>
                </div>

                {/* Card 3: Logs hoje */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border)]  rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[var(--primary-subtle)] border border-[var(--primary)]/20 rounded-xl">
                      <FileText className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Logs (24h)</p>
                  </div>
                  <p className="text-3xl font-extrabold text-[var(--text-primary)]">{complianceStats.totalLogsHoje}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-2">Ações registradas nas últimas 24 horas</p>
                </div>

                {/* Card 4: Último evento */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border)]  rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[var(--primary-subtle)] border border-[var(--primary)]/20 rounded-xl">
                      <Clock className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Último Evento</p>
                  </div>
                  {complianceStats.ultimoEvento ? (
                    <>
                      <p className="text-base font-extrabold text-[var(--text-primary)] leading-tight">
                        {formatDateTime(complianceStats.ultimoEvento)}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-2">Data/hora do registro mais recente</p>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] mt-2">Nenhum evento nas últimas 24h</p>
                  )}
                </div>
              </div>
            ) : null}

            {/* Tabela de Logs de Auditoria */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)]  rounded-[32px] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                    Logs de Auditoria
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Últimas {auditLogs.length} ações sensíveis registradas no sistema
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Filtro de ação */}
                  <select
                    value={filtroAction}
                    onChange={e => setFiltroAction(e.target.value)}
                    className="px-3 py-2 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-xs font-semibold text-[var(--text-secondary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all"
                  >
                    <option value="">Todas as ações</option>
                    <option value="criacao">Criação</option>
                    <option value="edicao">Edição</option>
                    <option value="exclusao">Exclusão</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                  </select>
                  {/* Botão exportar (UI) */}
                  <button
                    onClick={() => toast.info('Exportação CSV em breve!')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)]  rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                  {/* Link para logs completos */}
                  <Link
                    href="/logs"
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--primary-subtle)] border border-[var(--primary)]/40 rounded-xl text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary-subtle)] transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ver todos
                  </Link>
                </div>
              </div>

              {/* Tabela */}
              {isLoadingSecurity ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-3" />
                  <p className="text-sm text-[var(--text-muted)] font-semibold">Carregando logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 bg-[var(--bg-base)] rounded-2xl mb-4">
                    <FileText className="h-8 w-8 text-[var(--text-muted)]" />
                  </div>
                  <p className="font-bold text-[var(--text-secondary)]">Nenhum log encontrado</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {filtroAction ? `Sem registros do tipo "${filtroAction}"` : 'As ações sensíveis aparecerão aqui'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                    <thead className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)] ">
                      <tr className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold">
                        <th className="px-5 py-3.5">Data/Hora</th>
                        <th className="px-5 py-3.5">Ação</th>
                        <th className="px-5 py-3.5">Módulo</th>
                        <th className="px-5 py-3.5">Usuário</th>
                        <th className="px-5 py-3.5">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[var(--text-muted)] font-mono">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <ActionBadge action={log.action} />
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">{entityLabel(log.entity)}</span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {log.user_nome ? (
                              <span className="text-xs font-semibold text-[var(--text-secondary)]">{log.user_nome}</span>
                            ) : log.user_id ? (
                              <span className="text-xs text-[var(--text-muted)] font-mono">{log.user_id.substring(0, 8)}…</span>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 max-w-[240px]">
                            {log.details ? (
                              <span className="text-xs text-[var(--text-muted)] truncate block" title={JSON.stringify(log.details)}>
                                {log.details.nome
                                  ? `Paciente: ${log.details.nome}`
                                  : log.details.deleted_user_nome
                                  ? `Usuário: ${log.details.deleted_user_nome}`
                                  : JSON.stringify(log.details).substring(0, 60)}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Nota de rodapé legal */}
            <div className="flex items-start gap-3 p-4 bg-[var(--primary-subtle)] border border-[var(--primary)]/40 rounded-2xl text-xs text-[var(--primary)]">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                <strong>Conformidade LGPD:</strong> Este painel registra automaticamente todas as ações sensíveis realizadas no sistema, garantindo rastreabilidade e transparência conforme exigido pela{' '}
                <strong>Lei 13.709/2018</strong>. Os logs são imutáveis e ficam disponíveis para auditoria interna ou por autoridades competentes.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modais */}
      <ManageRolePermissionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={selectedRole}
        roleName={selectedRoleName}
      />
      <CreateUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        onSuccess={loadTeamMembers}
      />
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => { setIsEditUserModalOpen(false); setEditingUser(null) }}
        onSuccess={loadTeamMembers}
        user={editingUser}
      />
      <CommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
        onSuccess={loadCommissions}
      />
    </div>
  )
}
