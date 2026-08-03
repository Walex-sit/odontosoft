'use client'

import { useState } from 'react'
import { X, Loader2, ShieldCheck, FileText } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { createPatient } from '@/app/actions/pacientes'
import { toast } from 'sonner'
import { useAuth } from '@/app/components/RequireAuth'

interface NovoPacienteSlideOverProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NovoPacienteSlideOver({ isOpen, onClose, onSuccess }: NovoPacienteSlideOverProps) {
  const [loading, setLoading] = useState(false)
  const { profile } = useAuth()

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

  // LGPD
  const [lgpdAceite, setLgpdAceite] = useState(false)
  const [showTermoModal, setShowTermoModal] = useState(false)

  if (!isOpen) return null

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) {
      toast.error('O nome do paciente é obrigatório')
      return
    }

    if (!lgpdAceite) {
      toast.error('O aceite do Termo de Consentimento LGPD é obrigatório para o cadastro.')
      return
    }

    setLoading(true)
    
    // Payload com todos os dados (incluindo LGPD e metadados de auditoria)
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
      lgpd_aceite: lgpdAceite,
      lgpd_aceite_em: lgpdAceite ? new Date().toISOString() : null,
      // Metadados de auditoria (removidos antes do INSERT pelo servidor)
      _userId: profile?.id ?? undefined,
      _userNome: profile?.nome ?? undefined,
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

            {/* CONSENTIMENTO LGPD */}
            <div className="mt-8 p-4 border border-blue-500/30 rounded-xl bg-blue-500/5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                <h3 className="text-xs text-blue-300 font-bold uppercase tracking-wider">Consentimento LGPD</h3>
              </div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={lgpdAceite}
                  onChange={e => setLgpdAceite(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-800 border-slate-600 text-blue-600 focus:ring-blue-500/50 focus:ring-2 h-4 w-4 shrink-0 transition-all"
                />
                <span className="text-sm text-slate-300 leading-relaxed group-hover:text-slate-100 transition-colors">
                  O paciente declara ter lido e consentido com o tratamento de seus dados pessoais e de saúde pela clínica, conforme a{' '}
                  <strong className="text-blue-300">Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)</strong>, para fins de atendimento odontológico.{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermoModal(true)}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    <FileText className="h-3 w-3" /> Ver termo completo
                  </button>
                </span>
              </label>
              {!lgpdAceite && (
                <p className="text-xs text-amber-400/80 mt-2 pl-7">⚠ O aceite é obrigatório para concluir o cadastro.</p>
              )}
            </div>

          </form>
        </div>

      {/* Modal do Termo LGPD */}
      {showTermoModal && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowTermoModal(false)}
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-600 shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <h3 className="text-slate-100 font-bold text-base">Termo de Consentimento LGPD</h3>
                </div>
                <button
                  onClick={() => setShowTermoModal(false)}
                  className="text-slate-400 hover:text-slate-100 bg-slate-700 hover:bg-slate-600 p-1.5 rounded-lg transition-colors border border-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-300 leading-relaxed space-y-4">
                <p>
                  Em conformidade com a <strong className="text-slate-100">Lei Geral de Proteção de Dados Pessoais (LGPD — Lei Federal nº 13.709/2018)</strong>, esta clínica informa ao paciente:
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="font-semibold text-slate-200 mb-1">1. Dados Coletados</p>
                    <p>Nome completo, CPF, RG, data de nascimento, endereço, telefone, e-mail, gênero e histórico de saúde odontológica (prontuário).</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="font-semibold text-slate-200 mb-1">2. Finalidade do Tratamento</p>
                    <p>Os dados são utilizados exclusivamente para: prestação de serviços odontológicos, agendamento de consultas, controle de tratamentos, faturamento e comunicação com o paciente.</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="font-semibold text-slate-200 mb-1">3. Compartilhamento</p>
                    <p>Os dados pessoais e de saúde <strong className="text-slate-100">não são compartilhados</strong> com terceiros, salvo por obrigação legal ou a pedido do próprio paciente.</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="font-semibold text-slate-200 mb-1">4. Direitos do Titular</p>
                    <p>O paciente pode, a qualquer momento: solicitar acesso, correção ou exclusão dos seus dados; revogar este consentimento; e registrar reclamação junto à ANPD.</p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="font-semibold text-slate-200 mb-1">5. Segurança</p>
                    <p>Esta clínica adota medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados, conforme exigido pela LGPD.</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 pt-2">Ao marcar o checkbox de consentimento, o paciente ou seu responsável legal confirma que leu, entendeu e concorda com os termos acima.</p>
              </div>
              <div className="p-4 border-t border-slate-600 shrink-0">
                <button
                  onClick={() => { setLgpdAceite(true); setShowTermoModal(false) }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" /> Li e Aceito o Termo
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
