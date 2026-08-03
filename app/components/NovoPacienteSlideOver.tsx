'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { createPatient } from '@/app/actions/pacientes'
import { toast } from 'sonner'

interface NovoPacienteSlideOverProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NovoPacienteSlideOver({ isOpen, onClose, onSuccess }: NovoPacienteSlideOverProps) {
  const [loading, setLoading] = useState(false)
  
  // DADOS PESSOAIS
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [genero, setGenero] = useState('')
  
  // CONTATO
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState(false)
  const [email, setEmail] = useState('')
  
  // ENDEREÇO
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')

  if (!isOpen) return null

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    
    if (!nome.trim()) {
      toast.error('O nome do paciente é obrigatório')
      return
    }

    setLoading(true)
    
    // Payload com todos os dados
    const payload = {
      nome,
      cpf: cpf || null,
      rg: rg || null,
      data_nascimento: dataNascimento || null,
      genero: genero || null,
      telefone: telefone || null,
      whatsapp: whatsapp,
      email: email || null,
      cep: cep || null,
      rua: rua || null,
      numero: numero || null,
      bairro: bairro || null,
      cidade: cidade || null,
    }

    const res = await createPatient(payload)

    setLoading(false)

    if (!res.success) {
      toast.error('Erro ao salvar paciente: ' + res.error)
      return
    }

    if (res.warning) {
      toast.warning(res.warning)
    }

    toast.success('Paciente cadastrado com sucesso!')
    onSuccess()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Painel */}
      <div className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-slate-700 shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-slate-600">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 shrink-0">
          <h2 className="text-slate-100 font-bold text-lg">Cadastrar Novo Paciente</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors bg-slate-800 p-1.5 rounded-md hover:bg-slate-600 border border-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo (Rolável) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="novo-paciente-form" onSubmit={handleSalvar}>
            
            {/* DADOS PESSOAIS */}
            <h3 className="text-xs text-slate-400 font-bold uppercase mt-2 mb-4 tracking-wider">Dados Pessoais</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome completo <span className="text-red-400">*</span></label>
                <input 
                  type="text" 
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CPF</label>
                  <input 
                    type="text" 
                    value={cpf}
                    onChange={e => setCpf(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">RG</label>
                  <input 
                    type="text" 
                    value={rg}
                    onChange={e => setRg(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data de Nascimento</label>
                  <input 
                    type="date" 
                    value={dataNascimento}
                    onChange={e => setDataNascimento(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Gênero</label>
                  <select 
                    value={genero}
                    onChange={e => setGenero(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  >
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CONTATO */}
            <h3 className="text-xs text-slate-400 font-bold uppercase mt-8 mb-4 tracking-wider">Contato</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Celular</label>
                  <input 
                    type="text" 
                    value={telefone}
                    onChange={e => setTelefone(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                    placeholder="(11) 90000-0000"
                  />
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={whatsapp}
                      onChange={e => setWhatsapp(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500/50 focus:ring-2 h-4 w-4 transition-all"
                    />
                    É WhatsApp?
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  placeholder="exemplo@email.com"
                />
              </div>
            </div>

            {/* ENDEREÇO */}
            <h3 className="text-xs text-slate-400 font-bold uppercase mt-8 mb-4 tracking-wider">Endereço</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">CEP</label>
                  <input 
                    type="text" 
                    value={cep}
                    onChange={e => setCep(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cidade</label>
                  <input 
                    type="text" 
                    value={cidade}
                    onChange={e => setCidade(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Rua</label>
                  <input 
                    type="text" 
                    value={rua}
                    onChange={e => setRua(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Número</label>
                  <input 
                    type="text" 
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bairro</label>
                <input 
                  type="text" 
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500"
                />
              </div>
            </div>
            
          </form>
        </div>

        {/* Rodapé Fixo */}
        <div className="border-t border-slate-600 bg-slate-700 p-4 flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-transparent text-slate-300 hover:text-white hover:bg-slate-600 border border-slate-600 rounded-md text-sm font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="novo-paciente-form"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[140px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Paciente'}
          </button>
        </div>

      </div>
    </>
  )
}
