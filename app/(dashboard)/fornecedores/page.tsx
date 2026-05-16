'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Fornecedores() {
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [fornecedores, setFornecedores] = useState<any[]>([])

  async function carregarFornecedores() {
    const { data } = await supabase.from('fornecedores').select('*').order('created_at', { ascending: false })
    setFornecedores(data || [])
  }

  async function salvarFornecedor() {
    if (!nome.trim()) return
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('fornecedores').insert([{ nome, cnpj, telefone, email, user_id: userData.user?.id }])
    setNome(''); setCnpj(''); setTelefone(''); setEmail('')
    carregarFornecedores()
  }

  useEffect(() => { carregarFornecedores() }, [])

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Fornecedores</h2>
        <p className="text-slate-400 mt-1">Cadastro de fornecedores e parceiros</p>
      </div>

      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 mb-8">
        <h3 className="text-lg font-bold text-white mb-4">Novo Fornecedor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Nome / Razão Social</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" placeholder="Ex: Dental Brasil" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">CNPJ</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" placeholder="00.000.000/0001-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">Telefone</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-400 mb-1.5">E-mail</label>
            <input className="appearance-none block w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button onClick={salvarFornecedor} className="w-full bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 transition-all font-bold text-sm h-[42px] border border-blue-500">
            Cadastrar
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Fornecedores Cadastrados</h3>
        </div>
        {fornecedores.length === 0 ? (
          <div className="text-center py-16"><h3 className="text-lg font-bold text-white mb-1">Nenhum fornecedor cadastrado</h3><p className="text-slate-400">Adicione seu primeiro fornecedor acima.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">CNPJ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Telefone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">E-mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {fornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white text-sm">{f.nome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden md:table-cell">{f.cnpj || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden sm:table-cell">{f.telefone || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 hidden lg:table-cell">{f.email || '—'}</td>
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
