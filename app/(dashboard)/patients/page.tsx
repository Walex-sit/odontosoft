'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { Search, Plus, Loader2, ChevronRight, Phone, Mail, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/components/RequireAuth'
import NovoPacienteSlideOver from '@/app/components/NovoPacienteSlideOver'

interface Paciente {
  id: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  created_at: string
}

function formatarTelefone(tel: string | null) {
  if (!tel) return null
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return tel
}

export default function PacientesPage() {
  const { session } = useAuth()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [slideOverOpen, setSlideOverOpen] = useState(false)

  async function carregarPacientes() {
    if (!session) {
      setLoading(false)
      return
    }
    
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome', { ascending: true })

    if (data) {
      setPacientes(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarPacientes()
  }, [session])

  const pacientesFiltrados = pacientes.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    (p.cpf && p.cpf.includes(busca))
  )

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      
      {/* Header Fixo */}
      <header className="pt-8 px-6 sm:px-8 pb-4 shrink-0 bg-slate-50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pacientes</h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">Gerencie os cadastros e prontuários</p>
          </div>
          <button 
            onClick={() => setSlideOverOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" strokeWidth={3} /> Novo Paciente
          </button>
        </div>
      </header>

      {/* Barra de Pesquisa e Filtros */}
      <div className="px-6 sm:px-8 py-4 shrink-0 border-b border-slate-200 bg-white shadow-sm z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center w-full max-w-md bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search className="h-5 w-5 text-slate-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>
          <span className="text-sm font-bold text-slate-400 shrink-0">
            {pacientesFiltrados.length} {pacientesFiltrados.length === 1 ? 'paciente' : 'pacientes'}
          </span>
        </div>
      </div>

      {/* Conteúdo Rolável */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[32px] border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col items-center">
              <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="h-8 w-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum paciente encontrado</h3>
              <p className="text-slate-500 font-medium text-sm">
                Tente ajustar os termos da sua busca.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pacientesFiltrados.map(p => (
                  <Link 
                    key={p.id} 
                    href={`/patients/${p.id}`} 
                    className="block bg-white p-5 rounded-[24px] border border-slate-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.05)] hover:border-blue-200 transition-colors group relative overflow-hidden"
                  >
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Identidade */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg font-extrabold border border-blue-100 shrink-0">
                        {p.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                          {p.nome}
                        </h3>
                        {p.cpf && <p className="text-xs font-semibold text-slate-400 mt-0.5">CPF: {p.cpf}</p>}
                      </div>
                    </div>

                    {/* Contatos */}
                    <div className="flex flex-col gap-1.5 flex-1 pl-0 sm:pl-4 sm:border-l border-slate-100">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="text-sm font-medium">{formatarTelefone(p.telefone) || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="text-sm font-medium truncate">{p.email || 'Não informado'}</span>
                      </div>
                    </div>

                    {/* Data de Cadastro & Ação */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 flex-1 pl-0 sm:pl-4 sm:border-l border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Cadastro</span>
                        <div className="flex items-center gap-1.5 text-slate-700 mt-0.5">
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-bold">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      
                      <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </div>

                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <NovoPacienteSlideOver 
        isOpen={slideOverOpen} 
        onClose={() => setSlideOverOpen(false)} 
        onSuccess={() => {
          setSlideOverOpen(false)
          carregarPacientes()
        }}
      />
    </div>
  )
}