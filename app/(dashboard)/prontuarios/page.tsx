'use client'

/**
 * app/(dashboard)/prontuarios/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel de Prontuários e Histórico Clínico dos Pacientes.
 *
 * Multi-Tenancy (T001):
 *  ✅ Pacientes da clínica são listados respeitando RLS da clínica.
 *  ✅ Prontuários inseridos são vinculados automaticamente à clínica via trigger.
 *  ✅ Tipagem limpa sem 'any'.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Search } from 'lucide-react'
import { useAuth } from '@/app/components/RequireAuth'

interface PacienteItem {
  id: string
  nome: string
}

interface ProntuarioItem {
  id: string
  paciente_id: string | null
  dentista_id: string | null
  descricao: string
  tratamento: string | null
  data_registro?: string
  created_at?: string
  pacientes?: {
    nome: string
  } | null
}

export default function Prontuarios() {
  const { session } = useAuth()
  const [pacientes, setPacientes] = useState<PacienteItem[]>([])
  const [prontuarios, setProntuarios] = useState<ProntuarioItem[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tratamento, setTratamento] = useState('')
  const [carregando, setCarregando] = useState(true)

  async function carregarDados() {
    try {
      // Busca todos os pacientes da clínica via RLS
      const { data: pacs, error: pacError } = await supabase
        .from('pacientes')
        .select('id, nome')
        .order('nome', { ascending: true })

      if (pacError) {
        console.error('[prontuarios] Erro ao carregar pacientes:', pacError.message)
      } else {
        setPacientes(pacs || [])
      }

      // Busca todos os prontuários da clínica via RLS
      const { data: prns, error: prnError } = await supabase
        .from('prontuarios')
        .select('id, paciente_id, dentista_id, descricao, tratamento, data_registro, pacientes(nome)')
        .order('data_registro', { ascending: false })

      if (prnError) {
        console.error('[prontuarios] Erro ao carregar prontuários:', prnError.message)
      } else {
        setProntuarios((prns || []) as unknown as ProntuarioItem[])
      }
    } catch (e) {
      console.error('[prontuarios] Exceção ao carregar dados:', e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarProntuario() {
    if (!pacienteId || !descricao.trim() || !session?.user?.id) return

    const { error } = await supabase.from('prontuarios').insert([{
      paciente_id: pacienteId,
      dentista_id: session.user.id,
      descricao,
      tratamento: tratamento || null,
      data_registro: new Date().toISOString(),
    }])

    if (error) {
      alert('Erro ao salvar prontuário: ' + error.message)
      return
    }

    setPacienteId('')
    setDescricao('')
    setTratamento('')
    carregarDados()
  }

  useEffect(() => {
    if (session?.user?.id) {
      carregarDados()
    } else if (session === null) {
      setCarregando(false)
    }
  }, [session])

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Column 2: Context/Filters */}
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">Novo Registro</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">Paciente</label>
            <select 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 transition-colors" 
              value={pacienteId} 
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">Selecione um paciente...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">Tratamento</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 transition-colors" 
              placeholder="Ex: Limpeza profilática" 
              value={tratamento} 
              onChange={(e) => setTratamento(e.target.value)} 
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">Descrição / Evolução</label>
            <textarea 
              className="w-full flex-1 min-h-[120px] px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 transition-colors resize-y" 
              placeholder="Descreva o atendimento realizado..." 
              value={descricao} 
              onChange={(e) => setDescricao(e.target.value)} 
            />
          </div>
          <div className="pt-2">
            <button 
              onClick={salvarProntuario} 
              disabled={!pacienteId || !descricao.trim()}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:bg-[var(--border-medium)] disabled:text-[var(--text-primary)] text-[var(--on-primary)] px-4 py-2.5 rounded-md font-bold text-sm transition-colors"
            >
              Salvar Registro
            </button>
          </div>
        </div>
      </aside>

      {/* Column 3: Main Workspace */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative">
        <header className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0 gap-4">
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Buscar prontuários..." 
            className="bg-transparent border-none focus:outline-none text-sm text-[var(--text-primary)] w-full placeholder-[var(--text-secondary)]" 
          />
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Registros Clínicos</h1>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Histórico e evolução dos pacientes.</p>
            </div>
          </div>

          <div className="border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-surface)]">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider w-32">Data</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider w-48">Paciente</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider w-48">Tratamento</th>
                  <th className="px-4 py-3 font-semibold text-[var(--text-secondary)] text-xs uppercase tracking-wider">Evolução / Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/50">
                {carregando ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--primary)]/40"></div>
                      </div>
                    </td>
                  </tr>
                ) : prontuarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">
                      Nenhum prontuário registrado.
                    </td>
                  </tr>
                ) : (
                  prontuarios.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--bg-surface)] transition-colors align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-[var(--text-secondary)] font-medium">
                        {p.data_registro ? new Date(p.data_registro).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[var(--text-primary)]">
                        {p.pacientes?.nome || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {p.tratamento ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]">
                            {p.tratamento}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {p.descricao}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
