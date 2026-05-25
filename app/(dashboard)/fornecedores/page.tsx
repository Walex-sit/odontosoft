'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Plus, Truck, ListFilter } from 'lucide-react'
import { useAuth } from '../../components/RequireAuth'

export default function Fornecedores() {
  const { session } = useAuth()
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

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

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-105">Fornecedores</h2>
        <p className="text-slate-400 mt-1 text-sm">Cadastro de fornecedores e parceiros</p>
      </div>

      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 mb-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-400" />
          Novo Fornecedor
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome / Razão Social</label>
            <input 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              placeholder="Ex: Dental Brasil" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CNPJ</label>
            <input 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              placeholder="00.000.000/0001-00" 
              value={cnpj} 
              onChange={(e) => setCnpj(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone</label>
            <input 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              placeholder="(11) 99999-9999" 
              value={telefone} 
              onChange={(e) => setTelefone(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-mail</label>
            <input 
              className="appearance-none block w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm" 
              placeholder="email@empresa.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <button 
            onClick={salvarFornecedor} 
            className="w-full bg-blue-600 hover:bg-blue-505 text-white px-6 py-2.5 rounded-xl transition-all font-bold text-sm h-[42px] border border-blue-500 shadow-sm flex items-center justify-center shrink-0 active:scale-95"
          >
            Cadastrar
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-bold text-slate-100">Fornecedores Cadastrados</h3>
        </div>

        {carregando ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : fornecedores.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="h-16 w-16 bg-slate-900 text-slate-550 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <Truck className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Nenhum fornecedor cadastrado</h3>
            <p className="text-slate-400 text-sm">Adicione seu primeiro fornecedor acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-900/40 border-b border-slate-700/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">CNPJ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {fornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-200 text-sm">{f.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{f.cnpj || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{f.telefone || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{f.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
