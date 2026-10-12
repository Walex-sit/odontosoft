'use client'

import { useState } from 'react'
import { X, Loader2, FileText, ShieldCheck } from 'lucide-react'
import { createPatient } from '@/app/actions/pacientes'
import { toast } from 'sonner'
import { useAuth } from '@/app/components/RequireAuth'
import { mascaraCpf, validarCpf } from '@/app/lib/cpfUtils'
import { gerarPdfTermoLGPD } from '@/app/lib/gerarPdfTermoLGPD'

interface NovoPacienteSlideOverProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NovoPacienteSlideOver({ isOpen, onClose, onSuccess }: NovoPacienteSlideOverProps) {
  const [loading, setLoading] = useState(false)
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const { profile } = useAuth()

  // DADOS PESSOAIS
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [rg, setRg] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [genero, setGenero] = useState('')
  const [lgpdAceite, setLgpdAceite] = useState(false)

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

  // Derivações de estado
  const cpfValido = validarCpf(cpf)
  const nomePreenchido = nome.trim().length >= 3
  const podePdf = nomePreenchido && cpfValido
  const cpfCompleto = cpf.replace(/\D/g, '').length === 11

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCpf(mascaraCpf(e.target.value))
    // Se o CPF ficou inválido, desmarca o aceite LGPD automaticamente
    if (!validarCpf(mascaraCpf(e.target.value))) {
      setLgpdAceite(false)
    }
  }

  function handleLgpdToggle(checked: boolean) {
    if (checked && !cpfValido) {
      toast.warning('CPF matematicamente inválido. Verifique antes de registrar o aceite LGPD.')
      return
    }
    setLgpdAceite(checked)
  }

  function handleGerarTermoPdf() {
    if (!podePdf) return
    setGerandoPdf(true)
    try {
      gerarPdfTermoLGPD({
        pacienteNome: nome.trim(),
        pacienteCpf: cpf,
      })
      toast.success('Termo LGPD gerado! Verifique seus downloads.')
    } catch {
      toast.error('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setGerandoPdf(false)
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) {
      toast.error('O nome do paciente é obrigatório')
      return
    }

    // Valida CPF se foi digitado
    if (cpf && !cpfValido) {
      toast.error('O CPF informado é inválido. Verifique os dígitos.')
      return
    }

    setLoading(true)
    
    const payload = {
      nome,
      cpf_raw: cpf ? cpf.replace(/\D/g, '') : null,
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

  // Classes reutilizáveis
  const inputBase = 'w-full bg-slate-800 text-slate-100 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder-slate-500'

  function cpfBorderClass() {
    if (!cpf) return 'border-slate-600'
    if (!cpfCompleto) return 'border-slate-600'
    return cpfValido ? 'border-emerald-500' : 'border-red-500'
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Painel */}
      <div data-testid="slideover-novo-paciente" className="fixed right-0 top-0 h-screen w-full sm:w-[500px] bg-slate-700 shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-slate-600">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 shrink-0">
          <h2 className="text-slate-100 font-bold text-lg">Cadastrar Novo Paciente</h2>
          <button 
            onClick={onClose}
            data-testid="btn-fechar-slideover-paciente"
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
                  data-testid="input-paciente-nome"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className={`${inputBase} border-slate-600`}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* ── CPF COM MÁSCARA E VALIDAÇÃO ── */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">CPF</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    data-testid="input-paciente-cpf"
                    value={cpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                    className={`${inputBase} ${cpfBorderClass()}`}
                    placeholder="000.000.000-00"
                  />
                  {/* Feedback visual de validação */}
                  {cpf && cpfCompleto && (
                    <p className={`mt-1 text-xs font-semibold ${cpfValido ? 'text-emerald-400' : 'text-red-400'}`}>
                      {cpfValido ? '✓ CPF válido' : '✗ CPF inválido — verifique os dígitos'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">RG</label>
                  <input 
                    type="text" 
                    data-testid="input-paciente-rg"
                    value={rg}
                    onChange={e => setRg(e.target.value)}
                    className={`${inputBase} border-slate-600`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data de Nascimento</label>
                  <input 
                    type="date" 
                    data-testid="input-paciente-data-nascimento"
                    value={dataNascimento}
                    onChange={e => setDataNascimento(e.target.value)}
                    className={`${inputBase} border-slate-600`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Gênero</label>
                  <select 
                    data-testid="select-paciente-genero"
                    value={genero}
                    onChange={e => setGenero(e.target.value)}
                    className={`${inputBase} border-slate-600`}
                  >
                    <option value="">Selecione...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
              </div>

              {/* ── ACEITE LGPD (condicional ao CPF válido) ── */}
              <div className={`rounded-xl border p-3.5 transition-all ${cpfValido ? 'border-emerald-600/40 bg-emerald-950/20' : 'border-slate-600 bg-slate-800/40 opacity-60'}`}>
                <label className={`flex items-start gap-3 ${cpfValido ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    data-testid="checkbox-paciente-lgpd"
                    checked={lgpdAceite}
                    disabled={!cpfValido}
                    onChange={e => handleLgpdToggle(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500/50 focus:ring-2 disabled:opacity-50 transition-all"
                  />
                  <div>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-slate-200">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Aceite LGPD
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Consentimento para tratamento de dados pessoais e clínicos (Lei nº 13.709/2018).
                    </span>
                    {!cpfValido && (
                      <span className="text-xs font-semibold text-amber-400 block mt-1">
                        ⚠️ Preencha um CPF válido para habilitar o aceite LGPD.
                      </span>
                    )}
                  </div>
                </label>
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
                    data-testid="input-paciente-telefone"
                    value={telefone}
                    onChange={e => setTelefone(e.target.value)}
                    className={`${inputBase} border-slate-600`}
                    placeholder="(11) 90000-0000"
                  />
                </div>
                <div className="flex items-center mt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      data-testid="checkbox-paciente-whatsapp"
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
                  data-testid="input-paciente-email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`${inputBase} border-slate-600`}
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
                    className={`${inputBase} border-slate-600`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cidade</label>
                  <input 
                    type="text" 
                    value={cidade}
                    onChange={e => setCidade(e.target.value)}
                    className={`${inputBase} border-slate-600`}
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
                    className={`${inputBase} border-slate-600`}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Número</label>
                  <input 
                    type="text" 
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    className={`${inputBase} border-slate-600`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Bairro</label>
                <input 
                  type="text" 
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  className={`${inputBase} border-slate-600`}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Rodapé Fixo */}
        <div className="border-t border-slate-600 bg-slate-700 p-4 shrink-0 space-y-2">
          {/* Botão Gerar Termo LGPD (PDF) */}
          <button
            type="button"
            data-testid="btn-gerar-termo-lgpd"
            onClick={handleGerarTermoPdf}
            disabled={!podePdf || gerandoPdf}
            title={!podePdf ? 'Preencha o nome e um CPF válido para gerar o termo' : 'Gerar Termo de Consentimento LGPD em PDF'}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md border text-sm font-semibold transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              enabled:border-emerald-600 enabled:text-emerald-300 enabled:hover:bg-emerald-600/20 enabled:hover:text-emerald-100
              disabled:border-slate-600 disabled:text-slate-500"
          >
            {gerandoPdf
              ? <Loader2 size={15} className="animate-spin" />
              : <FileText size={15} />
            }
            {gerandoPdf ? 'Gerando PDF...' : 'Gerar Termo LGPD (PDF)'}
          </button>

          {/* Ações principais */}
          <div className="flex justify-end gap-3">
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
              data-testid="btn-salvar-paciente"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-semibold transition-colors flex items-center justify-center min-w-[140px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Paciente'}
            </button>
          </div>
        </div>

      </div>
    </>
  )
}
