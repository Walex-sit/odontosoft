'use client'

/**
 * app/(dashboard)/admin/usuarios/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * GESTÃO GLOBAL DE USUÁRIOS POR CLÍNICA (SUPER ADMIN)
 * Rota direta: /admin/usuarios
 *
 * Organização hierárquica:
 *  1. Visão Principal: Listagem de clínicas cadastradas com contagem real de
 *     usuários vinculados e distribuição por cargo + busca por clínica.
 *  2. Detalhe da Clínica: Ao selecionar uma clínica, carrega exclusivamente os
 *     usuários vinculados àquela clínica (isolamento server-side), com busca
 *     por nome/e-mail e filtro por cargo.
 *  3. Usuários Globais: Seção separada para contas sem vínculo com clínica
 *     (clinica_id IS NULL), como Super Admins.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Sparkles,
  Users,
  Building2,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { AdminHeader } from '../AdminHeader'
import {
  getGlobalClinicsUsersSummary,
  getClinicUsersByClinicId,
  getUnlinkedGlobalUsers,
  type ClinicaUsersSummary,
  type GlobalUserItem,
} from '@/app/actions/admin-global'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_clinica: 'Admin da Clínica',
  admin: 'Admin da Clínica',
  dentista: 'Dentista',
  recepcao: 'Recepção',
  financeiro: 'Financeiro',
}

function formatRoleLabel(role: string) {
  return ROLE_LABELS[role] || role
}

const SUBSCRIPTION_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ativo: {
    label: 'Assinatura Ativa',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  trial: {
    label: 'Trial',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
  inadimplente: {
    label: 'Inadimplente',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
  cancelado: {
    label: 'Cancelada',
    className: 'bg-zinc-500/10 text-[var(--text-secondary)] border-[var(--border)]',
  },
  pendente: {
    label: 'Pendente',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
}

function ClinicStatusBadges({ ativo, statusAssinatura }: { ativo: boolean; statusAssinatura: string }) {
  const sub = SUBSCRIPTION_STATUS_LABELS[statusAssinatura] || {
    label: statusAssinatura,
    className: 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border)]',
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
          ativo
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
        }`}
      >
        {ativo ? 'Ativa' : 'Bloqueada'}
      </span>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sub.className}`}>
        {sub.label}
      </span>
    </div>
  )
}

export default function SuperAdminUsuariosPage() {
  // ── Visão principal: Clínicas + Usuários Globais (sem vínculo) ──
  const [clinicas, setClinicas] = useState<ClinicaUsersSummary[]>([])
  const [usuariosGlobais, setUsuariosGlobais] = useState<GlobalUserItem[]>([])
  const [totalUsuariosPlataforma, setTotalUsuariosPlataforma] = useState<number | undefined>(undefined)
  const [loadingMain, setLoadingMain] = useState(true)
  const [errorMain, setErrorMain] = useState<string | null>(null)
  const [buscaClinica, setBuscaClinica] = useState('')

  // ── Visão de detalhe da clínica selecionada ──
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null)
  const [selectedClinicInfo, setSelectedClinicInfo] = useState<{
    id: string
    nome: string
    cnpj: string | null
    email: string | null
    status_assinatura: string
    ativo: boolean
  } | null>(null)
  const [clinicUsers, setClinicUsers] = useState<GlobalUserItem[]>([])
  const [loadingClinic, setLoadingClinic] = useState(false)
  const [errorClinic, setErrorClinic] = useState<string | null>(null)
  const [buscaUsuario, setBuscaUsuario] = useState('')
  const [filtroRole, setFiltroRole] = useState('todos')

  const [refreshing, setRefreshing] = useState(false)

  const carregarVisaoPrincipal = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoadingMain(true)
    setErrorMain(null)

    try {
      const [summaryRes, globalUsersRes] = await Promise.all([
        getGlobalClinicsUsersSummary(),
        getUnlinkedGlobalUsers(),
      ])

      if (!summaryRes.success || !summaryRes.data) {
        const msg = summaryRes.error || 'Erro ao carregar resumo de clínicas e usuários.'
        setErrorMain(msg)
        toast.error(msg)
        return
      }

      setClinicas(summaryRes.data.clinicas)
      setTotalUsuariosPlataforma(summaryRes.data.totalUsuarios)

      if (globalUsersRes.success && globalUsersRes.data) {
        setUsuariosGlobais(globalUsersRes.data)
      } else if (globalUsersRes.error) {
        toast.error(globalUsersRes.error)
      }
    } catch (err: any) {
      const msg = err.message || 'Erro ao comunicar com o servidor.'
      setErrorMain(msg)
      toast.error(msg)
    } finally {
      setLoadingMain(false)
      setRefreshing(false)
    }
  }, [])

  const carregarDetalheClinica = useCallback(async (clinicaId: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoadingClinic(true)
    setErrorClinic(null)

    try {
      const res = await getClinicUsersByClinicId(clinicaId)
      if (!res.success || !res.data) {
        const msg = res.error || 'Erro ao carregar usuários da clínica.'
        setErrorClinic(msg)
        toast.error(msg)
        return
      }

      setSelectedClinicInfo(res.data.clinica)
      setClinicUsers(res.data.usuarios)
    } catch (err: any) {
      const msg = err.message || 'Erro ao comunicar com o servidor.'
      setErrorClinic(msg)
      toast.error(msg)
    } finally {
      setLoadingClinic(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    carregarVisaoPrincipal()
  }, [carregarVisaoPrincipal])

  function handleSelectClinica(clinica: ClinicaUsersSummary) {
    setSelectedClinicId(clinica.id)
    setSelectedClinicInfo({
      id: clinica.id,
      nome: clinica.nome,
      cnpj: clinica.cnpj,
      email: clinica.email,
      status_assinatura: clinica.status_assinatura,
      ativo: clinica.ativo,
    })
    setClinicUsers([])
    setBuscaUsuario('')
    setFiltroRole('todos')
    carregarDetalheClinica(clinica.id)
  }

  function handleVoltarClinicas() {
    setSelectedClinicId(null)
    setSelectedClinicInfo(null)
    setClinicUsers([])
    setErrorClinic(null)
    setBuscaUsuario('')
    setFiltroRole('todos')
  }

  function handleRefresh() {
    if (selectedClinicId) {
      carregarDetalheClinica(selectedClinicId, true)
    } else {
      carregarVisaoPrincipal(true)
    }
  }

  const clinicasFiltradas = useMemo(() => {
    const q = buscaClinica.trim().toLowerCase()
    if (!q) return clinicas
    return clinicas.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.cnpj && c.cnpj.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
    )
  }, [clinicas, buscaClinica])

  const clinicUsersFiltrados = useMemo(() => {
    const q = buscaUsuario.trim().toLowerCase()
    return clinicUsers.filter((u) => {
      const matchBusca =
        !q ||
        u.nome.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))

      const matchRole =
        filtroRole === 'todos' ||
        u.role === filtroRole ||
        (filtroRole === 'admin_clinica' && u.role === 'admin')

      return matchBusca && matchRole
    })
  }, [clinicUsers, buscaUsuario, filtroRole])

  return (
    <div className="flex-1 w-full bg-[var(--bg-base)] text-[var(--text-primary)] overflow-y-auto min-h-screen">
      <AdminHeader
        title="Usuários Globais da Plataforma"
        subtitle={
          selectedClinicInfo
            ? `Usuários vinculados exclusivamente à clínica ${selectedClinicInfo.nome}.`
            : 'Visualização hierárquica de usuários por clínica e contas globais da infraestrutura OdontoSoft.'
        }
        onRefresh={handleRefresh}
        refreshing={refreshing}
        usuariosCount={totalUsuariosPlataforma}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {selectedClinicId ? (
          /* ══════════════════════════════════════════════════════════════════
             DETALHE DA CLÍNICA SELECIONADA
             ══════════════════════════════════════════════════════════════════ */
          <div className="space-y-5">
            {/* Cabeçalho da Clínica Selecionada + Voltar */}
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border)] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <button
                  type="button"
                  onClick={handleVoltarClinicas}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar à listagem de clínicas</span>
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)] truncate">
                        {selectedClinicInfo?.nome || 'Clínica Selecionada'}
                      </h2>
                      {selectedClinicInfo && (
                        <ClinicStatusBadges
                          ativo={selectedClinicInfo.ativo}
                          statusAssinatura={selectedClinicInfo.status_assinatura}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-0.5">
                      {selectedClinicInfo?.cnpj && <span>CNPJ: {selectedClinicInfo.cnpj}</span>}
                      <span className="font-mono">ID: {selectedClinicId}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]">
                  <Users className="h-3.5 w-3.5 text-[var(--primary)]" />
                  <span>
                    {loadingClinic
                      ? 'Carregando...'
                      : `${clinicUsers.length} ${clinicUsers.length === 1 ? 'usuário vinculado' : 'usuários vinculados'}`}
                  </span>
                </span>
              </div>
            </div>

            {/* Filtros do Detalhe da Clínica */}
            <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)] shadow-2xs flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Buscar usuário por nome ou e-mail..."
                  value={buscaUsuario}
                  onChange={(e) => setBuscaUsuario(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>

              <div className="w-full md:w-auto">
                <select
                  value={filtroRole}
                  onChange={(e) => setFiltroRole(e.target.value)}
                  aria-label="Filtrar por cargo"
                  className="w-full md:w-auto px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--text-primary)]"
                >
                  <option value="todos">Todos os Cargos</option>
                  <option value="admin_clinica">Admin da Clínica</option>
                  <option value="dentista">Dentista</option>
                  <option value="recepcao">Recepção</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            {/* Tabela de Usuários da Clínica */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xs overflow-hidden">
              {loadingClinic && !refreshing ? (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[var(--primary)]" />
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Carregando usuários da clínica...
                  </p>
                </div>
              ) : errorClinic ? (
                <div className="py-14 px-6 flex flex-col items-center justify-center text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-[var(--danger)]" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Não foi possível carregar os usuários desta clínica.
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] max-w-md">{errorClinic}</p>
                  <button
                    type="button"
                    onClick={() => carregarDetalheClinica(selectedClinicId)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--primary-fill)] text-[var(--on-primary)] text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Tentar novamente</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-base)] text-xs font-extrabold uppercase text-[var(--text-secondary)] tracking-wider">
                        <th className="px-5 py-3.5">Nome / E-mail</th>
                        <th className="px-5 py-3.5">Cargo / Papel</th>
                        <th className="px-5 py-3.5">Status Vitalício</th>
                        <th className="px-5 py-3.5 text-right">Data de Criação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {clinicUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                            Esta clínica ainda não possui usuários vinculados.
                          </td>
                        </tr>
                      ) : clinicUsersFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                            Nenhum usuário encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        clinicUsersFiltrados.map((u) => (
                          <tr key={u.id} className="hover:bg-[var(--bg-base)] transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--text-primary)]">{u.nome}</span>
                                <span className="text-xs text-[var(--text-secondary)]">
                                  {u.email || u.id}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20">
                                {formatRoleLabel(u.role)}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              {u.is_lifetime ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--warning)]">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Vitalício (Lifetime)
                                </span>
                              ) : (
                                <span className="text-[var(--text-secondary)] text-xs">Padrão SaaS</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right text-[var(--text-secondary)] text-xs">
                              {formatDate(u.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             VISÃO PRINCIPAL: CLÍNICAS + SEÇÃO SEPARADA DE USUÁRIOS GLOBAIS
             ══════════════════════════════════════════════════════════════════ */
          <div className="space-y-8">
            {/* ── Seção 1: Clínicas Cadastradas ── */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                    <Building2 className="h-4.5 w-4.5 text-[var(--primary)]" />
                    <span>Clínicas Cadastradas</span>
                    {!loadingMain && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {clinicas.length}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Selecione uma clínica para visualizar exclusivamente os usuários vinculados a ela.
                  </p>
                </div>
              </div>

              {/* Busca de Clínicas */}
              <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)] shadow-2xs">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Buscar clínica por nome, CNPJ ou ID..."
                    value={buscaClinica}
                    onChange={(e) => setBuscaClinica(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Tabela de Clínicas */}
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xs overflow-hidden">
                {loadingMain && !refreshing ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[var(--primary)]" />
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      Carregando clínicas e contagem de usuários...
                    </p>
                  </div>
                ) : errorMain ? (
                  <div className="py-14 px-6 flex flex-col items-center justify-center text-center space-y-3">
                    <AlertCircle className="h-8 w-8 text-[var(--danger)]" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Erro ao carregar as clínicas cadastradas.
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md">{errorMain}</p>
                    <button
                      type="button"
                      onClick={() => carregarVisaoPrincipal()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--primary-fill)] text-[var(--on-primary)] text-xs font-bold cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Tentar novamente</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-base)] text-xs font-extrabold uppercase text-[var(--text-secondary)] tracking-wider">
                          <th className="px-5 py-3.5">Clínica / Identificação</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5">Usuários Vinculados</th>
                          <th className="px-5 py-3.5">Distribuição por Cargo</th>
                          <th className="px-5 py-3.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {clinicas.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                              Nenhuma clínica cadastrada na plataforma até o momento.
                            </td>
                          </tr>
                        ) : clinicasFiltradas.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-secondary)]">
                              Nenhuma clínica encontrada para &quot;{buscaClinica}&quot;.
                            </td>
                          </tr>
                        ) : (
                          clinicasFiltradas.map((c) => {
                            const roleBadges = [
                              { label: 'Admin', count: c.usuariosPorRole.admin_clinica },
                              { label: 'Dentista', count: c.usuariosPorRole.dentista },
                              { label: 'Recepção', count: c.usuariosPorRole.recepcao },
                              { label: 'Financeiro', count: c.usuariosPorRole.financeiro },
                              { label: 'Outros', count: c.usuariosPorRole.outros },
                            ].filter((r) => r.count > 0)

                            return (
                              <tr
                                key={c.id}
                                onClick={() => handleSelectClinica(c)}
                                className="hover:bg-[var(--bg-base)] transition-colors cursor-pointer group"
                              >
                                <td className="px-5 py-3.5">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                                      {c.nome}
                                    </span>
                                    <span className="text-[11px] text-[var(--text-secondary)] font-mono truncate max-w-[260px]">
                                      {c.cnpj ? `CNPJ: ${c.cnpj} • ` : ''}ID: {c.id}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-5 py-3.5">
                                  <ClinicStatusBadges
                                    ativo={c.ativo}
                                    statusAssinatura={c.status_assinatura}
                                  />
                                </td>

                                <td className="px-5 py-3.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      c.totalUsuarios > 0
                                        ? 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/20'
                                        : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]'
                                    }`}
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                    <span>
                                      {c.totalUsuarios}{' '}
                                      {c.totalUsuarios === 1 ? 'usuário' : 'usuários'}
                                    </span>
                                  </span>
                                </td>

                                <td className="px-5 py-3.5">
                                  {roleBadges.length === 0 ? (
                                    <span className="text-xs text-[var(--text-secondary)]">
                                      Sem usuários vinculados
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {roleBadges.map((rb) => (
                                        <span
                                          key={rb.label}
                                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]"
                                        >
                                          {rb.label}: {rb.count}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>

                                <td className="px-5 py-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSelectClinica(c)
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-base)] hover:bg-[var(--primary-fill)] hover:text-[var(--on-primary)] text-[var(--text-primary)] border border-[var(--border)] text-xs font-bold transition-all cursor-pointer"
                                  >
                                    <span>Ver usuários</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* ── Seção 2: Usuários Globais (Sem Vínculo com Clínica) ── */}
            <section className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-[var(--warning)]" />
                    <span>Usuários Globais (Sem Vínculo com Clínica)</span>
                    {!loadingMain && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]">
                        {usuariosGlobais.length}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Contas administrativas da plataforma (ex.: Super Admins) que operam sem vínculo fixo a uma clínica.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-2xs overflow-hidden">
                {loadingMain && !refreshing ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[var(--warning)]" />
                    <p className="text-xs text-[var(--text-secondary)]">
                      Carregando usuários globais...
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-base)] text-xs font-extrabold uppercase text-[var(--text-secondary)] tracking-wider">
                          <th className="px-5 py-3.5">Nome / E-mail</th>
                          <th className="px-5 py-3.5">Cargo / Papel</th>
                          <th className="px-5 py-3.5">Status Vitalício</th>
                          <th className="px-5 py-3.5 text-right">Data de Criação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {usuariosGlobais.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-[var(--text-secondary)]">
                              Nenhum usuário global sem vínculo com clínica encontrado.
                            </td>
                          </tr>
                        ) : (
                          usuariosGlobais.map((u) => (
                            <tr key={u.id} className="hover:bg-[var(--bg-base)] transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-bold text-[var(--text-primary)]">{u.nome}</span>
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    {u.email || u.id}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-[var(--bg-base)] text-[var(--warning)] border border-[var(--warning)]/40">
                                  {formatRoleLabel(u.role)}
                                </span>
                              </td>

                              <td className="px-5 py-3.5">
                                {u.is_lifetime ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--warning)]">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Vitalício (Lifetime)
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-secondary)] text-xs">Padrão SaaS</span>
                                )}
                              </td>

                              <td className="px-5 py-3.5 text-right text-[var(--text-secondary)] text-xs">
                                {formatDate(u.created_at)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
