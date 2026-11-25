'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  cpf_mascarado: string | null
}

export default function AtestadoMedicoModal({ isOpen, onClose }: AtestadoMedicoModalProps) {
  const { profile } = useAuth()
  const { clinica } = useClinica()
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
        .select('id, nome, cpf_mascarado')
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

  // Fechar com tecla Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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

  if (!isOpen || !mounted) return null

  return createPortal(
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 overflow-y-auto animate-in fade-in"
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto my-auto bg-[var(--bg-surface)] rounded-3xl shadow-md border border-[var(--border)] flex flex-col"
      >
        
        {/* Header */}
        <div className="bg-[var(--primary)] text-[var(--on-primary)] p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/10 rounded-xl">
              <Award className="h-6 w-6 text-[var(--on-primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Atestado Odontológico</h3>
              <p className="text-xs text-[var(--on-primary)] opacity-90 font-medium">Emissão oficial de atestados de afastamento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--on-primary)] hover:bg-black/15 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6">
          
          <div className="space-y-4">
            
            {/* Paciente (Busca Inteligente) */}
            <div className="relative">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
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
                  className="w-full px-4 py-2.5 pl-10 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--text-primary)]"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
                
                {selectedPaciente && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />
                )}
              </div>

              {showResults && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-sm text-[var(--text-muted)] text-center">Buscando...</div>
                  ) : pacientes.length > 0 ? (
                    pacientes.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPaciente(p)}
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--primary)] dark:hover:bg-[var(--bg-surface)] transition-colors border-b border-[var(--border)]  last:border-0"
                      >
                        <span className="font-medium">{p.nome}</span>
                        {p.cpf_mascarado && <span className="text-xs text-[var(--text-muted)] block">CPF: {p.cpf_mascarado}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-[var(--text-muted)] text-center">Nenhum paciente encontrado.</div>
                  )}
                </div>
              )}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Data de Início *
                </label>
                <input
                  type="date"
                  required
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Dias Afastamento *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* CID e Descrição */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  CID-10 (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: K08.1"
                  value={cid}
                  onChange={(e) => setCid(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--text-primary)]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Descrição do CID
                </label>
                <input
                  type="text"
                  placeholder="Ex: Perda de dentes devido a acidente"
                  value={cidDescricao}
                  onChange={(e) => setCidDescricao(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Motivo / Descrição Textual
              </label>
              <textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/30 text-[var(--text-primary)]"
              />
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 flex items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:bg-[var(--border)] dark:hover:bg-[var(--bg-surface)] rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleGerar(false)}
            disabled={isLoading || !selectedPaciente}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-base)] hover:bg-[var(--border)] dark:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Apenas Salvar'}
          </button>
          <button
            onClick={() => handleGerar(true)}
            disabled={isLoading || !selectedPaciente}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)] disabled:bg-[var(--primary)] text-[var(--on-primary)] rounded-xl text-sm font-bold shadow-sm dark:shadow-none transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-[var(--bg-surface)]/30 border-t-white rounded-full animate-spin" /> 
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
    </div>,
    document.body
  )
}
