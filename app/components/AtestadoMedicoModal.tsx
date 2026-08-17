'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Award, Printer, Search, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './RequireAuth'
import { useClinica } from '../contexts/ClinicaContext'

interface AtestadoMedicoModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Paciente {
  id: string
  nome: string
  cpf: string | null
}

export default function AtestadoMedicoModal({ isOpen, onClose }: AtestadoMedicoModalProps) {
  const { profile } = useAuth()
  const { clinica } = useClinica()
  const modalRef = useRef<HTMLDivElement>(null)

  // ─── Estados da Busca de Pacientes ──────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // ─── Estados do Atestado ────────────────────────────────────────────────────
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [dias, setDias] = useState('1')
  const [cid, setCid] = useState('')
  const [cidDescricao, setCidDescricao] = useState('')
  const [motivo, setMotivo] = useState('necessidade de repouso para recuperação de procedimento odontológico')
  
  const [isLoading, setIsLoading] = useState(false)

  // ─── Efeitos ────────────────────────────────────────────────────────────────

  // Debounce para busca de paciente
  useEffect(() => {
    if (!searchTerm || selectedPaciente?.nome === searchTerm) {
      setPacientes([])
      setShowResults(false)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome, cpf')
        .ilike('nome', `%${searchTerm}%`)
        .order('nome')
        .limit(10)
      
      if (!error && data) {
        setPacientes(data)
        setShowResults(true)
      }
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, selectedPaciente])

  // Fecha dropdown de busca ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Limpar ao fechar
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedPaciente(null)
      setDataInicio(new Date().toISOString().split('T')[0])
      setDias('1')
      setCid('')
      setCidDescricao('')
      setMotivo('necessidade de repouso para recuperação de procedimento odontológico')
    }
  }, [isOpen])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectPaciente = (paciente: Paciente) => {
    setSelectedPaciente(paciente)
    setSearchTerm(paciente.nome)
    setShowResults(false)
  }

  const handleGerar = async (shouldPrint: boolean) => {
    
    if (!selectedPaciente) {
      toast.error('Selecione um paciente primeiro.')
      return
    }

    if (!dias || Number(dias) < 1) {
      toast.error('Informe a quantidade de dias válida.')
      return
    }

    if (!profile?.id) {
      toast.error('Erro de autenticação: Perfil não encontrado.')
      return
    }

    setIsLoading(true)

    try {
      const { data: atestado, error } = await supabase
        .from('atestados')
        .insert({
          paciente_id: selectedPaciente.id,
          profissional_id: profile.id,
          data_inicio: dataInicio,
          dias_afastamento: Number(dias),
          cid: cid || null,
          cid_descricao: cidDescricao || null,
          motivo: motivo,
          establishment_id: profile.clinica_id || (profile as any).establishment_id || clinica?.id
        } as any)
        .select()
        .single()

      if (error) throw error

      toast.success('Atestado salvo com sucesso!')
      onClose()

      if (shouldPrint && atestado) {
        setTimeout(() => {
          window.open(`/imprimir/atestado/${atestado.id}`, '_blank')
        }, 300)
      }
    } catch (error: any) {
      const detail = error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error));
      console.error('Erro detalhado ao salvar atestado:', detail, error);
      toast.error('Ocorreu um erro ao gerar o atestado.');
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col"
      >
        
        {/* Header */}
        <div className="bg-indigo-600 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/30 rounded-xl">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Atestado Odontológico</h3>
              <p className="text-xs text-indigo-100 font-medium">Emissão oficial de atestados de afastamento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-500/40 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          
          <div className="space-y-4">
            
            {/* Paciente (Busca Inteligente) */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Nome do Paciente *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (selectedPaciente && e.target.value !== selectedPaciente.nome) {
                      setSelectedPaciente(null)
                    }
                  }}
                  className="w-full px-4 py-2.5 pl-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                
                {selectedPaciente && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />
                )}
              </div>

              {showResults && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-sm text-slate-500 dark:text-slate-400 text-center">Buscando...</div>
                  ) : pacientes.length > 0 ? (
                    pacientes.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPaciente(p)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                      >
                        <span className="font-medium">{p.nome}</span>
                        {p.cpf && <span className="text-xs text-slate-400 block">CPF: {p.cpf}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-slate-500 text-center">Nenhum paciente encontrado.</div>
                  )}
                </div>
              )}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Data de Início *
                </label>
                <input
                  type="date"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Dias Afastamento *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* CID e Descrição */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  CID-10 (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: K08.1"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Descrição do CID
                </label>
                <input
                  type="text"
                  placeholder="Ex: Perda de dentes devido a acidente"
                  value={cidDescricao}
                  onChange={(e) => setCidDescricao(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Motivo / Descrição Textual
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleGerar(false)}
            disabled={isLoading || !selectedPaciente}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Apenas Salvar'}
          </button>
          <button
            onClick={() => handleGerar(true)}
            disabled={isLoading || !selectedPaciente}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 
                Processando...
              </span>
            ) : (
              <>
                <Printer className="h-4 w-4" /> Salvar e Imprimir
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
