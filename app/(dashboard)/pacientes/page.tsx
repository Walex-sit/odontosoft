'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { logAction } from '@/app/lib/logger'
import { useAuth } from '@/app/components/RequireAuth'
import {
  UserPlus, Users, Eye, Search, AlertCircle, RefreshCw, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Paciente {
  id: string
  nome: string
  telefone: string | null
  cpf: string | null
  created_at: string
  user_id: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iniciais(nome: string) {
  return nome
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function formatarCPF(cpf: string | null) {
  if (!cpf) return '—'
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatarTelefone(tel: string | null) {
  if (!tel) return '—'
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-700/50">
      {[40, 28, 28, 20].map((w, i) => (
        <td key={i} className="px-6 py-4">
          <div className={`h-4 w-${w} bg-slate-700/60 rounded animate-pulse`} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonMobileCard() {
  return (
    <div className="p-4 border-b border-slate-700/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-slate-700/60 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-slate-700/60 rounded animate-pulse" />
          <div className="h-3 w-24 bg-slate-700/60 rounded animate-pulse" />
        </div>
      </div>
      <div className="h-8 w-full bg-slate-700/60 rounded-xl animate-pulse" />
    </div>
  )
}

// ─── Error card ───────────────────────────────────────────────────────────────

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="m-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="h-10 w-10 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center border border-red-500/20 shrink-0">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-400">Erro ao carregar pacientes</p>
        <p className="text-xs text-slate-400 mt-0.5 break-words">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition-all border border-slate-600 shrink-0 active:scale-95"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </button>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="h-16 w-16 bg-slate-900 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
        <Users className="h-8 w-8" />
      </div>
      {filtered ? (
        <>
          <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhum resultado encontrado</h3>
          <p className="text-slate-400 text-sm">Tente buscar por outro nome.</p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhum paciente cadastrado</h3>
          <p className="text-slate-400 text-sm">Adicione seu primeiro paciente usando o formulário acima.</p>
        </>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Pacientes() {
  const { session } = useAuth()
  const router = useRouter()

  // Form state
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  // List state
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Search
  const [busca, setBusca] = useState('')

  // ── Data fetching ───────────────────────────────────────────────────────────

  async function carregarPacientes() {
    setCarregando(true)
    setErro(null)

    const { data, error } = await supabase
      .from('pacientes')
      .select('id, nome, telefone, cpf, created_at, user_id')
      .order('nome', { ascending: true })

    if (error) {
      setErro(error.message)
    } else {
      setPacientes((data ?? []) as Paciente[])
    }

    setCarregando(false)
  }

  async function adicionarPaciente() {
    if (!nome.trim() || !session?.user?.id) return
    setSalvando(true)

    const { error } = await supabase
      .from('pacientes')
      .insert([{ nome: nome.trim(), user_id: session.user.id }])

    if (error) {
      alert('Erro ao adicionar paciente: ' + error.message)
    } else {
      await logAction(session.user.id, 'criacao', 'pacientes', { nome })
      setNome('')
      carregarPacientes()
    }

    setSalvando(false)
  }

  useEffect(() => {
    if (session?.user?.id) {
      carregarPacientes()
    } else if (session === null) {
      setCarregando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // ── Derived: filtered list ──────────────────────────────────────────────────

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return pacientes
    return pacientes.filter((p) => p.nome.toLowerCase().includes(termo))
  }, [pacientes, busca])

  const isFiltered = busca.trim().length > 0

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Pacientes</h2>
          <p className="text-slate-400 mt-1 text-sm">Gerencie os dados e prontuários dos pacientes</p>
        </div>

        {/* Badge de contagem */}
        {!carregando && !erro && (
          <div className="bg-slate-800 px-5 py-3 rounded-2xl border border-slate-700/50 flex items-center gap-3 shadow-sm">
            <div className="h-9 w-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</p>
              <p className="text-xl font-extrabold text-slate-100">{pacientes.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Cadastro Rápido ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 mb-8 shadow-sm">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-400" />
          Cadastro Rápido
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Nome completo
            </label>
            <input
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm"
              placeholder="Ex: João da Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarPaciente()}
            />
          </div>

          <button
            onClick={adicionarPaciente}
            disabled={salvando || !nome.trim()}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl transition-all font-bold text-sm h-[42px] border border-blue-500 shadow-sm flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            {salvando ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {salvando ? 'Salvando…' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* ── Tabela de Pacientes ─────────────────────────────────────────────── */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">

        {/* Cabeçalho da tabela + campo de busca */}
        <div className="p-4 sm:p-6 border-b border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 shrink-0">
            <Users className="h-5 w-5 text-slate-400" />
            Todos os Pacientes
          </h3>

          {/* Campo de busca em tempo real */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {erro && <ErrorCard message={erro} onRetry={carregarPacientes} />}

        {/* ── Desktop Table ───────────────────────────────────────────────────  */}
        {!erro && (
          <div className="hidden sm:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CPF</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cadastro</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/50">
                {carregando ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : pacientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState filtered={isFiltered} />
                    </td>
                  </tr>
                ) : (
                  pacientesFiltrados.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-700/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/pacientes/${p.id}`)}
                    >
                      {/* Nome + avatar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
                            {iniciais(p.nome)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                              {p.nome}
                            </div>
                            <div className="text-xs text-slate-500">#{p.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium">
                        {formatarTelefone(p.telefone)}
                      </td>

                      {/* CPF */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300 font-medium tracking-wide">
                        {formatarCPF(p.cpf)}
                      </td>

                      {/* Data */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Ação */}
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => router.push(`/pacientes/${p.id}`)}
                          className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 active:scale-95"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Mobile Cards ─────────────────────────────────────────────────── */}
        {!erro && (
          <div className="sm:hidden divide-y divide-slate-700/50">
            {carregando ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonMobileCard key={i} />)
            ) : pacientesFiltrados.length === 0 ? (
              <EmptyState filtered={isFiltered} />
            ) : (
              pacientesFiltrados.map((p) => (
                <div
                  key={p.id}
                  className="p-4 hover:bg-slate-700/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/pacientes/${p.id}`)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                      {iniciais(p.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-200 truncate">{p.nome}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                        <span>{formatarTelefone(p.telefone)}</span>
                        <span>·</span>
                        <span>{formatarCPF(p.cpf)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-700/50 px-2 py-1 rounded shrink-0">
                      #{p.id.substring(0, 6)}
                    </span>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/pacientes/${p.id}`)}
                      className="w-full text-center text-blue-400 bg-blue-500/5 border border-blue-500/10 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                    >
                      Ver Ficha do Paciente
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Rodapé com contagem filtrada */}
        {!carregando && !erro && pacientesFiltrados.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isFiltered
                ? `${pacientesFiltrados.length} de ${pacientes.length} pacientes`
                : `${pacientes.length} paciente${pacientes.length !== 1 ? 's' : ''} no total`}
            </p>
            {isFiltered && (
              <button
                onClick={() => setBusca('')}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}