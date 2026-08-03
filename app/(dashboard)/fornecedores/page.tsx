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
    <div className="flex w-full h-full overflow-hidden text-slate-100">
      {/* Column 2 (Context/Filters) */}
      <aside className="w-72 border-r border-slate-600 bg-slate-700 flex flex-col h-full shrink-0">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <h2 className="text-sm font-bold text-slate-100">Novo Fornecedor</h2>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Nome / Razão Social</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              placeholder="Ex: Dental Brasil" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">CNPJ</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              placeholder="00.000.000/0001-00" 
              value={cnpj} 
              onChange={(e) => setCnpj(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Telefone</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              placeholder="(11) 99999-9999" 
              value={telefone} 
              onChange={(e) => setTelefone(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">E-mail</label>
            <input 
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm focus:outline-none focus:border-blue-500" 
              placeholder="email@empresa.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarFornecedor} 
            disabled={!nome.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
          >
            Cadastrar
          </button>
        </div>
      </aside>

      {/* Column 3 (Main Workspace) */}
      <main className="flex-1 flex flex-col h-full bg-slate-800 relative">
        <div className="h-14 border-b border-slate-600 flex items-center px-6 shrink-0">
          <div className="flex items-center gap-2 text-slate-400 w-1/3">
            <Search className="h-4 w-4" />
            <input 
              placeholder="Buscar fornecedores..." 
              className="w-full text-sm outline-none placeholder-slate-400 text-slate-100 bg-transparent"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Fornecedores Cadastrados</h2>
          <table className="w-full border-collapse border border-slate-600 text-sm">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-600">
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Nome</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">CNPJ</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100 border-r border-slate-600">Telefone</th>
                <th className="text-left py-2 px-3 font-semibold text-slate-100">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 border-b border-slate-600">Carregando...</td>
                </tr>
              ) : filteredFornecedores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400 border-b border-slate-600">Nenhum fornecedor registrado.</td>
                </tr>
              ) : (
                filteredFornecedores.map((f) => (
                  <tr key={f.id} className="border-b border-slate-600 hover:bg-slate-700/50">
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-100 font-medium">{f.nome}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{f.cnpj || '—'}</td>
                    <td className="py-2 px-3 border-r border-slate-600 text-slate-300">{f.telefone || '—'}</td>
                    <td className="py-2 px-3 text-slate-300">{f.email || '—'}</td>
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
