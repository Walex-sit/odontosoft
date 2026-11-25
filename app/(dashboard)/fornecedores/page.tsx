'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Search } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function Fornecedores() {
  const { session } = useAuth()
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  async function carregarFornecedores() {
    try {
      const { data } = await supabase.from('fornecedores').select('*').order('created_at', { ascending: false })
      setFornecedores(data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setCarregando(false)
    }
  }

  async function salvarFornecedor() {
    if (!nome.trim() || !session?.user?.id) return
    
    try {
      await supabase.from('fornecedores').insert([{ nome, cnpj, telefone, email, user_id: session.user.id }])
      setNome(''); setCnpj(''); setTelefone(''); setEmail('')
      carregarFornecedores()
    } catch (e) {
      alert('Erro ao cadastrar fornecedor')
    }
  }

  useEffect(() => { carregarFornecedores() }, [])

  const filteredFornecedores = fornecedores.filter(f => f.nome.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex w-full h-full overflow-hidden text-[var(--text-primary)]">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-[var(--border)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Novo Fornecedor</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Nome / Razão Social</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              placeholder="Ex: Dental Brasil" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">CNPJ</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              placeholder="00.000.000/0001-00" 
              value={cnpj} 
              onChange={(e) => setCnpj(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Telefone</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              placeholder="(11) 99999-9999" 
              value={telefone} 
              onChange={(e) => setTelefone(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">E-mail</label>
            <input 
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-[var(--primary)]/40" 
              placeholder="email@empresa.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarFornecedor} 
            disabled={!nome.trim()}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Cadastrar
          </button>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-[var(--bg-surface)] relative">
        <div className="h-14 border-b border-[var(--border)] flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar fornecedores..." 
              className="w-full text-sm outline-none placeholder-[var(--text-secondary)] text-[var(--text-primary)] bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Fornecedores Cadastrados</h2>
          <table className="w-full border-collapse border border-[var(--border)] text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Nome</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">CNPJ</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)] border-r border-[var(--border)]">Telefone</th>
                <th className="text-left py-2 px-3 font-semibold text-[var(--text-primary)]">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Carregando...</td>
                </tr>
              ) : filteredFornecedores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[var(--text-muted)] border-b border-[var(--border)]">Nenhum fornecedor registrado.</td>
                </tr>
              ) : (
                filteredFornecedores.map((f) => (
                  <tr key={f.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface)]">
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-primary)] font-medium">{f.nome}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{f.cnpj || '—'}</td>
                    <td className="py-2 px-3 border-r border-[var(--border)] text-[var(--text-secondary)]">{f.telefone || '—'}</td>
                    <td className="py-2 px-3 text-[var(--text-secondary)]">{f.email || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
