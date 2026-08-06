'use client'

import { useState, useEffect } from 'react'
import {
  Building2, Users, ShieldCheck, Cpu, Save, Sliders, Smartphone, Mail, Globe,
  UserPlus, Loader2, Pencil, Trash2, Percent, FileText, CheckCircle2, AlertTriangle,
  Clock, Lock, ExternalLink, RefreshCw, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import ManageRolePermissionsModal, { Role } from '@/app/components/ManageRolePermissionsModal'
import CreateUserModal from '@/app/components/CreateUserModal'
import EditUserModal from '@/app/components/EditUserModal'
import { fetchTeamMembers, deleteUserAccount } from '@/app/actions/users'
import CommissionModal from '@/app/components/CommissionModal'
import { fetchCommissions } from '@/app/actions/commissions'
import { fetchAuditLogs, fetchComplianceStats, AuditLog, ComplianceStats } from '@/app/actions/audit'
import { useAuth } from '@/app/components/RequireAuth'
import Link from 'next/link'

// ─── Badge de ação colorido ──────────────────────────────────────────────────

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  criacao:    { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-700', label: 'CRIAÇÃO' },
  edicao:     { bg: 'bg-blue-50 border border-blue-200',       text: 'text-blue-700',    label: 'EDIÇÃO' },
  exclusao:   { bg: 'bg-red-50 border border-red-200',         text: 'text-red-700',     label: 'EXCLUSÃO' },
  financeiro: { bg: 'bg-amber-50 border border-amber-200',     text: 'text-amber-700',   label: 'FINANCEIRO' },
  login:      { bg: 'bg-indigo-50 border border-indigo-200',   text: 'text-indigo-700',  label: 'LOGIN' },
  logout:     { bg: 'bg-slate-100 border border-slate-200 dark:border-slate-700',    text: 'text-slate-600 dark:text-slate-300',   label: 'LOGOUT' },
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] ?? { bg: 'bg-slate-100 border border-slate-200 dark:border-slate-700', text: 'text-slate-600 dark:text-slate-300', label: action.toUpperCase() }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${style.bg} ${style.text}`}>
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
    <div className={`p-5 rounded-2xl border bg-white dark:bg-slate-800 shadow-sm flex items-start gap-4 ${color}`}>
      <div className="p-3 rounded-xl bg-current/10 shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'perfil' | 'usuarios' | 'integracoes' | 'comissoes' | 'seguranca'>('perfil')
  const [salvando, setSalvando] = useState(false)

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

  useEffect(() => {
    if (activeTab === 'usuarios') loadTeamMembers()
    else if (activeTab === 'comissoes') loadCommissions()
    else if (activeTab === 'seguranca') loadSecurityData(filtroAction)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'seguranca') loadSecurityData(filtroAction)
  }, [filtroAction])

  // ─── Handlers ──────────────────────────────────────────────────────────────

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
    setSalvando(true)
    await new Promise(r => setTimeout(r, 600))
    setSalvando(false)
    toast.success('Configurações salvas com sucesso!')
  }

  // Estado mock para o Perfil da Clínica
  const [clinica, setClinica] = useState({
    nome: 'OdontoSoft Clínica Odontológica Especializada',
    cnpj: '12.345.678/0001-90',
    telefone: '(11) 99999-8888',
    email: 'contato@odontosoft.com.br',
    croResponsavel: 'CRO-SP 123456',
    endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    site: 'https://odontosoft.com.br'
  })

  // Estado mock de Integrações
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
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-y-auto">
      {/* Header */}
      <header className="p-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Configurações do Sistema</h1>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Gerencie os dados da sua clínica, permissões de usuários e integrações</p>
          </div>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 self-start md:self-auto disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>

        {/* Abas */}
        <div className="max-w-6xl mx-auto flex items-center gap-2 mt-8 border-b border-slate-100 pb-0.5 overflow-x-auto">
          {(
            [
              { id: 'perfil',      label: 'Perfil da Clínica',      icon: <Building2 className="h-4 w-4" /> },
              { id: 'usuarios',    label: 'Usuários e Permissões',   icon: <Users className="h-4 w-4" /> },
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
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.id === 'seguranca' && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">LGPD</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {/* ABA 1: PERFIL DA CLÍNICA */}
        {activeTab === 'perfil' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-100 pb-3">Informações Cadastrais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Razão Social / Nome da Clínica</label>
                <input
                  type="text"
                  value={clinica.nome}
                  onChange={e => setClinica(p => ({ ...p, nome: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">CNPJ</label>
                <input
                  type="text"
                  value={clinica.cnpj}
                  onChange={e => setClinica(p => ({ ...p, cnpj: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Telefone de Contato</label>
                <input
                  type="text"
                  value={clinica.telefone}
                  onChange={e => setClinica(p => ({ ...p, telefone: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">E-mail Comercial</label>
                <input
                  type="email"
                  value={clinica.email}
                  onChange={e => setClinica(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">CRO do Responsável Técnico</label>
                <input
                  type="text"
                  value={clinica.croResponsavel}
                  onChange={e => setClinica(p => ({ ...p, croResponsavel: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Website</label>
                <input
                  type="text"
                  value={clinica.site}
                  onChange={e => setClinica(p => ({ ...p, site: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Endereço Completo</label>
              <input
                type="text"
                value={clinica.endereco}
                onChange={e => setClinica(p => ({ ...p, endereco: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* ABA 2: USUÁRIOS E PERMISSÕES */}
        {activeTab === 'usuarios' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Perfis de Acesso (RBAC)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie os papeis configurados no seu OdontoSoft</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => { setSelectedRole('admin'); setSelectedRoleName('Administrador'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-start gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">Administrador</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Acesso total a todos os módulos, prontuários, financeiro e configurações.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('dentista'); setSelectedRoleName('Dentista / Odontólogo'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-start gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">Dentista / Odontólogo</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Acesso à agenda, lista de pacientes, prontuários e evolução médica.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('recepcao'); setSelectedRoleName('Recepção'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-start gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                  <Sliders className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">Recepção</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Agendamento de consultas, confirmações e cadastro inicial de pacientes.</p>
                </div>
              </div>

              <div 
                onClick={() => { setSelectedRole('financeiro'); setSelectedRoleName('Financeiro'); setIsModalOpen(true); }}
                className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-start gap-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md transition-all"
              >
                <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">Financeiro</h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Controle de entradas, saídas, emissão de boletos e relatórios orçamentários.</p>
                </div>
              </div>
            </div>

            {/* Nova Seção: Membros da Equipe */}
            <div className="mt-12">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Membros da Equipe</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie os usuários cadastrados no sistema</p>
                </div>
                <button
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Novo Usuário
                </button>
              </div>

              {isLoadingMembers ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Carregando membros...</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        <th className="p-4">Nome Completo</th>
                        <th className="p-4">E-mail</th>
                        <th className="p-4">Função</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamMembers.length > 0 ? (
                        teamMembers.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950/50 transition-colors">
                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{member.nome}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{member.email}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                member.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                member.role === 'dentista' ? 'bg-green-100 text-green-700' :
                                member.role === 'recepcao' ? 'bg-amber-100 text-amber-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleEditUser(member)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(member.id, member.nome)}
                                  disabled={deletingUserId === member.id}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50" title="Excluir"
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
                          <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400 font-semibold">
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

        {/* ABA 3: INTEGRAÇÕES */}
        {activeTab === 'integracoes' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 pb-3 mb-4">Serviços Conectados</h3>

            <div className="space-y-4">
              <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">WhatsApp / Notificações Automáticas</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Envio automático de lembretes e confirmações de consulta</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.whatsapp}
                  onChange={e => setIntegracoes(p => ({ ...p, whatsapp: e.target.checked }))}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
              </div>

              <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">Google Calendar</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Sincronização bidirecional das agendas da clínica</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.googleCalendar}
                  onChange={e => setIntegracoes(p => ({ ...p, googleCalendar: e.target.checked }))}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
              </div>

              <div className="p-5 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">Recebimento via PIX &amp; Cartões (Gateway)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Geração de QR Code PIX dinâmico e conciliação bancária</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={integracoes.pagamentosPix}
                  onChange={e => setIntegracoes(p => ({ ...p, pagamentosPix: e.target.checked }))}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: COMISSÕES */}
        {activeTab === 'comissoes' && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tabela de Comissões</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Defina a porcentagem de comissão por procedimento e dentista</p>
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
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Carregando comissões...</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                      <th className="p-4">Dentista</th>
                      <th className="p-4">Procedimento</th>
                      <th className="p-4">Porcentagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissions.length > 0 ? (
                      commissions.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950/50 transition-colors">
                          <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{c.dentista_nome}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{c.procedimento_nome}</td>
                          <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{c.porcentagem}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500 dark:text-slate-400 font-semibold">
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
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  Painel de Conformidade LGPD
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Transparência e rastreabilidade de todas as ações sensíveis realizadas no sistema.
                </p>
              </div>
              <button
                onClick={() => loadSecurityData(filtroAction)}
                disabled={isLoadingSecurity}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100 hover:shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingSecurity ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            {/* Cards de Métricas LGPD */}
            {isLoadingSecurity && !complianceStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 animate-pulse h-28" />
                ))}
              </div>
            ) : complianceStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Card 1: Pacientes com aceite */}
                <div className="bg-white dark:bg-slate-800 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aceite LGPD</p>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{complianceStats.pacientesComAceite}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>{lgpdPercent}% conformes</span>
                      <span>{complianceStats.totalPacientes} total</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${lgpdPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Pendentes */}
                <div className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border ${complianceStats.pacientesSemAceite > 0 ? 'border-red-200' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${complianceStats.pacientesSemAceite > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                      <AlertTriangle className={`h-5 w-5 ${complianceStats.pacientesSemAceite > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pendentes LGPD</p>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{complianceStats.pacientesSemAceite}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {complianceStats.pacientesSemAceite > 0
                      ? 'Pacientes sem consentimento registrado'
                      : 'Todos os pacientes estão em conformidade ✓'}
                  </p>
                </div>

                {/* Card 3: Logs hoje */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Logs (24h)</p>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{complianceStats.totalLogsHoje}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Ações registradas nas últimas 24 horas</p>
                </div>

                {/* Card 4: Último evento */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Último Evento</p>
                  </div>
                  {complianceStats.ultimoEvento ? (
                    <>
                      <p className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                        {formatDateTime(complianceStats.ultimoEvento)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Data/hora do registro mais recente</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400 mt-2">Nenhum evento nas últimas 24h</p>
                  )}
                </div>
              </div>
            ) : null}

            {/* Tabela de Logs de Auditoria */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[32px] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Logs de Auditoria
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Últimas {auditLogs.length} ações sensíveis registradas no sistema
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Filtro de ação */}
                  <select
                    value={filtroAction}
                    onChange={e => setFiltroAction(e.target.value)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:text-slate-100 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                  {/* Link para logs completos */}
                  <Link
                    href="/logs"
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ver todos
                  </Link>
                </div>
              </div>

              {/* Tabela */}
              {isLoadingSecurity ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Carregando logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 bg-slate-100 rounded-2xl mb-4">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum log encontrado</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {filtroAction ? `Sem registros do tipo "${filtroAction}"` : 'As ações sensíveis aparecerão aqui'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                    <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                        <th className="px-5 py-3.5">Data/Hora</th>
                        <th className="px-5 py-3.5">Ação</th>
                        <th className="px-5 py-3.5">Módulo</th>
                        <th className="px-5 py-3.5">Usuário</th>
                        <th className="px-5 py-3.5">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-950/60 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <ActionBadge action={log.action} />
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{entityLabel(log.entity)}</span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {log.user_nome ? (
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{log.user_nome}</span>
                            ) : log.user_id ? (
                              <span className="text-xs text-slate-400 font-mono">{log.user_id.substring(0, 8)}…</span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 max-w-[240px]">
                            {log.details ? (
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate block" title={JSON.stringify(log.details)}>
                                {log.details.nome
                                  ? `Paciente: ${log.details.nome}`
                                  : log.details.deleted_user_nome
                                  ? `Usuário: ${log.details.deleted_user_nome}`
                                  : JSON.stringify(log.details).substring(0, 60)}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
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
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-700">
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
