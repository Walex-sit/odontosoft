'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { logClientAction } from '@/app/actions/audit'
import { Search, Plus, Filter, Shield, Users, Eye, EyeOff, X } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

type Role = 'admin' | 'dentista' | 'recepcao' | 'financeiro'

interface Usuario {
  id: string
  nome: string
  role: Role
}

interface NovoUsuarioForm {
  nome: string
  email: string
  senha: string
  role: Role
}

function validarSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.'
  if (!/[A-Z]/.test(senha)) return 'Falta letra maiúscula.'
  if (!/[a-z]/.test(senha)) return 'Falta letra minúscula.'
  if (!/[0-9]/.test(senha)) return 'Falta número.'
  return null
}

const ROLE_LABELS: Record<Role, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/40' },
  dentista: { label: 'Dentista', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  recepcao: { label: 'Recepção', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  financeiro: { label: 'Financeiro', color: 'bg-[var(--primary-subtle)] text-[var(--primary)] border-[var(--primary)]/40' },
}

export default function Usuarios() {
  const { session, refreshProfile } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)

  // Form para "Novo" direto na sidebar ou modal?
  // Pela UI corporativa, a sidebar pode ter o formulário ou filtros. Vamos colocar o formulário de convite na sidebar para aproveitar o espaço.
  const [form, setForm] = useState<NovoUsuarioForm>({ nome: '', email: '', senha: '', role: 'recepcao' })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function setFieldValue(field: keyof NovoUsuarioForm, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (erro) setErro(null)
  }

  async function carregarUsuarios() {
    try {
      const { data, error } = await supabase.from('user_profiles').select('id, nome, role')
      if (error) console.error(error.message)
      setUsuarios((data || []) as Usuario[])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function alterarRole(userId: string, novaRole: Role) {
    const roleAnterior = usuarios.find(u => u.id === userId)?.role
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: novaRole } : u))

    try {
      const { error } = await supabase.from('user_profiles').update({ role: novaRole }).eq('id', userId)
      if (error) {
        setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: roleAnterior as Role } : u))
        alert(`Erro ao alterar perfil: ${error.message}`)
      } else {
        if (session?.user?.id) {
          await logClientAction('edicao', 'usuarios', { user_id_afetado: userId, nova_role: novaRole })
        }
        if (userId === session?.user?.id) await refreshProfile()
      }
    } catch (e: any) {
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: roleAnterior as Role } : u))
      alert(`Erro inesperado: ${e.message || e}`)
    }
  }

  async function salvarUsuario() {
    setErro(null)
    if (!form.nome.trim() || !form.email.trim() || !form.senha) return setErro('Preencha todos os campos.')
    const erroSenha = validarSenha(form.senha)
    if (erroSenha) return setErro(erroSenha)

    setSalvando(true)
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.senha,
        options: { data: { full_name: form.nome.trim() } },
      })

      if (signUpError) {
        setErro(signUpError.message)
        setSalvando(false)
        return
      }

      const userId = signUpData.user?.id
      if (!userId) {
        setErro('Erro ao obter ID do usuário.')
        setSalvando(false)
        return
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({ id: userId, nome: form.nome.trim(), role: form.role }, { onConflict: 'id' })

      if (profileError) {
        setErro(`Usuário criado, erro no perfil: ${profileError.message}`)
      } else {
        await logClientAction('criacao', 'usuarios', { email: form.email.trim(), role: form.role })
        setForm({ nome: '', email: '', senha: '', role: 'recepcao' })
        carregarUsuarios()
      }
    } catch (e: any) {
      setErro(e.message || 'Erro inesperado')
    } finally {
      setSalvando(false)
    }
  }

  useEffect(() => { carregarUsuarios() }, [])

  return (
    <div className="flex w-full h-full overflow-hidden text-[var(--text-primary)] font-sans text-sm">
      {/* Column 2: Filters / Context */}
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Equipe</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Controle de acessos</p>
        </div>

        {/* Formulário Criar Usuário */}
        <div className="p-5 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">Adicionar Usuário</h3>
          {erro && (
            <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs border border-red-200 rounded">
              {erro}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setFieldValue('nome', e.target.value)}
                className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-sm focus:outline-none focus:border-[var(--primary)]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setFieldValue('email', e.target.value)}
                className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-sm focus:outline-none focus:border-[var(--primary)]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => setFieldValue('senha', e.target.value)}
                  className="w-full px-3 py-1.5 pr-8 border border-[var(--border)] rounded text-sm focus:outline-none focus:border-[var(--primary)]/40"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute inset-y-0 right-2 flex items-center text-[var(--text-muted)]"
                >
                  {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Perfil</label>
              <select
                value={form.role}
                onChange={e => setFieldValue('role', e.target.value as Role)}
                className="w-full px-3 py-1.5 border border-[var(--border)] rounded text-sm bg-[var(--bg-surface)] focus:outline-none focus:border-[var(--primary)]/40"
              >
                <option value="admin">Administrador</option>
                <option value="dentista">Dentista</option>
                <option value="recepcao">Recepção</option>
                <option value="financeiro">Financeiro</option>
              </select>
            </div>
            <button
              onClick={salvarUsuario}
              disabled={salvando}
              className="w-full bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] px-4 py-2 rounded font-semibold text-xs transition-colors mt-2 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Adicionar Usuário'}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            <Filter size={14} /> Perfis
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-[var(--border)]" /> Administradores
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-[var(--border)]" /> Dentistas
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-[var(--border)]" /> Recepção
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-[var(--border)]" /> Financeiro
            </label>
          </div>
        </div>
      </aside>

      {/* Column 3: Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative min-w-0">
        <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-6 shrink-0 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2 text-[var(--text-muted)] w-96">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar usuário..."
              className="bg-transparent border-none focus:outline-none text-sm w-full text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
            />
          </div>
          <button className="flex items-center gap-1 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] rounded px-4 py-1.5 text-xs font-semibold">
            <Plus size={14} /> Convidar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-surface)]">
          <h1 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Users size={20} className="text-[var(--primary)]" /> Usuários do Sistema ({usuarios.length})
          </h1>

          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded shadow-sm overflow-x-auto">
            <table className="w-full min-w-[540px] text-left border-collapse">
              <thead className="bg-[var(--bg-surface)] border-b border-[var(--border)] text-xs font-bold text-[var(--text-secondary)]">
                <tr>
                  <th className="p-3 w-10 text-center border-r border-[var(--border)]">
                    <input type="checkbox" className="rounded border-[var(--border)]" />
                  </th>
                  <th className="p-3 border-r border-[var(--border)]">Nome do Usuário</th>
                  <th className="p-3 border-r border-[var(--border)] w-48">ID do Sistema</th>
                  <th className="p-3 w-48">Perfil de Acesso</th>
                </tr>
              </thead>
              <tbody className="text-sm text-[var(--text-primary)]">
                {carregando ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[var(--text-muted)]">Carregando...</td>
                  </tr>
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[var(--text-muted)]">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  usuarios.map(u => {
                    const info = ROLE_LABELS[u.role] || ROLE_LABELS['recepcao']
                    return (
                      <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors">
                        <td className="p-3 text-center border-r border-[var(--border)]">
                          <input type="checkbox" className="rounded border-[var(--border)]" />
                        </td>
                        <td className="p-3 border-r border-[var(--border)] font-semibold flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[var(--border)] text-[var(--text-secondary)] font-bold flex items-center justify-center text-xs">
                            {(u.nome || 'U').charAt(0).toUpperCase()}
                          </div>
                          {u.nome || 'Sem Nome'}
                        </td>
                        <td className="p-3 border-r border-[var(--border)] text-xs text-[var(--text-muted)] font-mono">
                          {u.id}
                        </td>
                        <td className="p-3">
                          <select
                            className={`w-full px-2 py-1 text-xs font-bold uppercase rounded border focus:outline-none ${info.color}`}
                            value={u.role}
                            onChange={(e) => alterarRole(u.id, e.target.value as Role)}
                          >
                            <option value="admin">Administrador</option>
                            <option value="dentista">Dentista</option>
                            <option value="recepcao">Recepção</option>
                            <option value="financeiro">Financeiro</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
