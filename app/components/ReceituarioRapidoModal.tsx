'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, FileText, Printer, Search, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './RequireAuth'

interface ReceituarioRapidoModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Paciente {
  id: string
  nome: string
  cpf_mascarado: string | null
}

interface ReceitaItem {
  medicamento: string
  concentracao: string
  forma_farm: string
  quantidade: string
  posologia: string
  instrucoes: string
}

export default function ReceituarioRapidoModal({ isOpen, onClose }: ReceituarioRapidoModalProps) {
  const { profile } = useAuth()
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ─── Estados do Formulário Pai ──────────────────────────────────────────────
  const [tipoReceituario, setTipoReceituario] = useState<'comum' | 'especial_azul' | 'especial_branco'>('comum')
  const [observacoesGlobais, setObservacoesGlobais] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ─── Estados da Busca de Pacientes ──────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // ─── Estados dos Itens (Medicamentos) ───────────────────────────────────────
  const [itens, setItens] = useState<ReceitaItem[]>([])
  
  // Estado do formulário de NOVO item
  const [novoItem, setNovoItem] = useState<ReceitaItem>({
    medicamento: '',
    concentracao: '',
    forma_farm: '',
    quantidade: '',
    posologia: '',
    instrucoes: ''
  })

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

  function resetForm() {
    setSearchTerm('')
    setSelectedPaciente(null)
    setTipoReceituario('comum')
    setObservacoesGlobais('')
    setItens([])
    setNovoItem({ medicamento: '', concentracao: '', forma_farm: '', quantidade: '', posologia: '', instrucoes: '' })
  }

  // Resetar quando fechar
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectPaciente = (paciente: Paciente) => {
    setSelectedPaciente(paciente)
    setSearchTerm(paciente.nome)
    setShowResults(false)
  }

  const handleAddItem = () => {
    if (!novoItem.medicamento || !novoItem.posologia) {
      toast.error('Preencha pelo menos o Medicamento e a Posologia.')
      return
    }
    setItens([...itens, novoItem])
    // Limpar form de item
    setNovoItem({ medicamento: '', concentracao: '', forma_farm: '', quantidade: '', posologia: '', instrucoes: '' })
  }

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const handleGerar = async (shouldPrint: boolean) => {
    
    if (!selectedPaciente) {
      toast.error('Selecione um paciente.')
      return
    }
    
    if (itens.length === 0) {
      toast.error('Adicione ao menos um medicamento na receita.')
      return
    }

    if (!profile?.id) {
      toast.error('Erro de autenticação: Perfil não encontrado.')
      return
    }

    setIsLoading(true)

    try {
      // 1. Inserir a receita pai
      const { data: receita, error: receitaError } = await supabase
        .from('receitas')
        .insert({
          paciente_id: selectedPaciente.id,
          profissional_id: profile.id,
          tipo_receituario: tipoReceituario,
          observacoes: observacoesGlobais,
          valor: 0, // Receituário rápido não tem valor financeiro; satisfaz constraint NOT NULL
        })
        .select()
        .single()

      if (receitaError) throw receitaError

      // 2. Preparar os itens
      const itensToInsert = itens.map((item, index) => ({
        receita_id: receita.id,
        medicamento: item.medicamento,
        concentracao: item.concentracao,
        forma_farm: item.forma_farm,
        quantidade: item.quantidade,
        posologia: item.posologia,
        instrucoes: item.instrucoes,
        ordem: index + 1
      }))

      // 3. Inserir os itens em batch
      const { error: itensError } = await supabase
        .from('receita_itens')
        .insert(itensToInsert)

      if (itensError) throw itensError

      toast.success('Receita gerada e salva com sucesso!')
      onClose()
      
      if (shouldPrint) {
        // Aguarda 300ms para garantir que o Supabase propagou a linha antes de a
        // página de impressão tentar buscá-la. Sem isso, a query pode chegar antes
        // do commit ser visível e retornar "Receita não encontrada".
        setTimeout(() => {
          window.open(`/imprimir/receituario/${receita.id}`, '_blank')
        }, 300)
      }
    } catch (error: any) {
      // PostgrestError tem propriedades não-enumeráveis (message, code, details, hint),
      // por isso JSON.stringify(error) retorna {}. Usamos getOwnPropertyNames para capturar tudo.
      const detail =
        error?.message ||
        error?.error_description ||
        (typeof error === 'object' && error !== null
          ? JSON.stringify(error, Object.getOwnPropertyNames(error))
          : String(error))
      console.error('Erro ao salvar receita:', detail, error)

      // Se vier de uma Server Action com { success: false, error: '...' }
      const serverMsg = error?.error ?? null
      toast.error(serverMsg || detail || 'Ocorreu um erro ao gerar a receita.')
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
        className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto my-auto bg-[var(--bg-surface)] rounded-3xl shadow-md border border-[var(--border)] flex flex-col"
      >
        
        {/* Header */}
        <div className="bg-[var(--primary-fill)] text-[var(--on-primary)] p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/10 rounded-xl">
              <FileText className="h-6 w-6 text-[var(--on-primary)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Emitir Receituário</h3>
              <p className="text-xs text-[var(--on-primary)] opacity-90 font-medium">Criação de receitas médicas e odontológicas</p>
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
          
          {/* Seção: Paciente e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Paciente *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    if (selectedPaciente && e.target.value !== selectedPaciente.nome) {
                      setSelectedPaciente(null) // Reset se alterou
                    }
                  }}
                  className="w-full px-4 py-2.5 pl-10 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)]"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
                
                {selectedPaciente && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
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
                        className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--primary-subtle)] dark:hover:bg-[var(--bg-surface)] transition-colors border-b border-[var(--border)]  last:border-0"
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

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Tipo de Receituário *
              </label>
              <select
                value={tipoReceituario}
                onChange={(e) => setTipoReceituario(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)]"
              >
                <option value="comum">Comum (Branco Simples)</option>
                <option value="especial_azul">Receituário B (Azul)</option>
                <option value="especial_branco">Controle Especial (Duas Vias)</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-[var(--border)] dark:bg-[var(--bg-surface)] my-6" />

          {/* Seção: Adicionar Item (Medicamento) */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              Adicionar Medicamento
            </h4>
            
            <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border)] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <input
                    type="text"
                    placeholder="Medicamento (ex: Amoxicilina) *"
                    value={novoItem.medicamento}
                    onChange={(e) => setNovoItem({ ...novoItem, medicamento: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-lg text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Conc. (ex: 500mg)"
                    value={novoItem.concentracao}
                    onChange={(e) => setNovoItem({ ...novoItem, concentracao: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-lg text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Forma (ex: Cápsulas)"
                    value={novoItem.forma_farm}
                    onChange={(e) => setNovoItem({ ...novoItem, forma_farm: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-lg text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Qtd. (ex: 1 caixa)"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-lg text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Posologia (ex: 1 comp. 8/8h) *"
                  value={novoItem.posologia}
                  onChange={(e) => setNovoItem({ ...novoItem, posologia: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-lg text-sm text-[var(--text-primary)]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Instruções adicionais"
                    value={novoItem.instrucoes}
                    onChange={(e) => setNovoItem({ ...novoItem, instrucoes: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)]  rounded-lg text-sm text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-2 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] text-[var(--on-primary)] rounded-lg text-sm font-bold flex items-center justify-center transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Itens Adicionados */}
          {itens.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">
                Medicamentos na Receita
              </h4>
              <div className="space-y-2">
                {itens.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[var(--primary-subtle)] border border-[var(--primary)]/30 rounded-xl">
                    <div className="pr-4">
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {item.medicamento} {item.concentracao && `- ${item.concentracao}`}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
                        <span className="font-semibold text-[var(--text-secondary)]">Uso:</span> {item.posologia}
                        {item.quantidade && ` | Qtd: ${item.quantidade}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações Gerais */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Observações Gerais
            </label>
            <textarea
              rows={2}
              placeholder="Recomendações gerais ao paciente..."
              value={observacoesGlobais}
              onChange={(e) => setObservacoesGlobais(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--text-primary)]"
            />
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
            disabled={isLoading || !selectedPaciente || itens.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-base)] hover:bg-[var(--border)] dark:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Apenas Salvar'}
          </button>
          <button
            onClick={() => handleGerar(true)}
            disabled={isLoading || !selectedPaciente || itens.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] disabled:bg-[var(--primary)]/60 text-[var(--on-primary)] rounded-xl text-sm font-bold shadow-sm dark:shadow-none transition-all"
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
