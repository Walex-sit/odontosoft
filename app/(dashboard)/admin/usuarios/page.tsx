'use client'

/**
 * app/(dashboard)/admin/usuarios/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * GESTÃO GLOBAL DE USUÁRIOS (SUPER ADMIN)
 * Rota direta: /admin/usuarios
 *
 * Funcionalidades:
 *  - Listagem completa de todos os usuários da plataforma via getGlobalUsersList()
 *  - Identificação de cargo (super_admin, admin_clinica, dentista, recepcao, financeiro)
 *  - Vínculo institucional (Clínica / Tenant)
 *  - Destaque para contas vitalícias (is_lifetime / Lifetime SaaS)
 *  - Filtro por cargo e busca textual instantânea por nome ou e-mail
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { AdminHeader } from '../AdminHeader'
import {
  getGlobalUsersList,
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

export default function SuperAdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<GlobalUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroRole, setFiltroRole] = useState('todos')

  const carregarUsuarios = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await getGlobalUsersList()
      if (res.success && res.data) {
        setUsuarios(res.data)
      } else {
        toast.error(res.error || 'Erro ao carregar lista de usuários globais.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao comunicar com o servidor.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    carregarUsuarios()
  }, [carregarUsuarios])

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchBusca =
        !busca ||
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(busca.toLowerCase()))

      const matchRole =
        filtroRole === 'todos' || u.role === filtroRole

      return matchBusca && matchRole
    })
  }, [usuarios, busca, filtroRole])

  return (
    <div className="flex-1 w-full bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 overflow-y-auto min-h-screen">
      <AdminHeader
        title="Usuários Globais da Plataforma"
        subtitle="Visualização consolidada de contas, papéis e acessos na infraestrutura OdontoSoft."
        onRefresh={() => carregarUsuarios(true)}
        refreshing={refreshing}
        usuariosCount={usuarios.length}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Barra de Filtros e Busca */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail de usuário..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full md:w-auto">
            <select
              value={filtroRole}
              onChange={(e) => setFiltroRole(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos os Cargos</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin_clinica">Admin da Clínica</option>
              <option value="dentista">Dentista</option>
              <option value="recepcao">Recepção</option>
              <option value="financeiro">Financeiro</option>
            </select>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          {loading && !refreshing ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-xs text-slate-500 font-medium">Carregando usuários da plataforma...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="px-5 py-3.5">Nome / E-mail</th>
                    <th className="px-5 py-3.5">Cargo / Papel</th>
                    <th className="px-5 py-3.5">Clínica Vinculada</th>
                    <th className="px-5 py-3.5">Status Vitalício</th>
                    <th className="px-5 py-3.5 text-right">Data de Criação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        Nenhum usuário encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {u.nome}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {u.email || u.id}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            {u.role}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {u.clinica_nome}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          {u.is_lifetime ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              <Sparkles className="h-3 w-3" />
                              Vitalício (Lifetime)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Padrão SaaS</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right text-slate-500 text-xs">
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
    </div>
  )
}

