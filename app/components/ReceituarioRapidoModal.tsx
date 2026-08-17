'use client'

import { useState, useEffect, useRef } from 'react'
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
  cpf: string | null
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

  // Resetar quando fechar
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

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

  const resetForm = () => {
    setSearchTerm('')
    setSelectedPaciente(null)
    setTipoReceituario('comum')
    setObservacoesGlobais('')
    setItens([])
    setNovoItem({ medicamento: '', concentracao: '', forma_farm: '', quantidade: '', posologia: '', instrucoes: '' })
  }

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/30 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Emitir Receituário</h3>
              <p className="text-xs text-blue-100 font-medium">Criação de receitas médicas e odontológicas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-blue-500/40 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          
          {/* Seção: Paciente e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
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
                  className="w-full px-4 py-2.5 pl-10 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                
                {selectedPaciente && (
                  <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-500" />
                )}
              </div>

              {/* Autocomplete Dropdown */}
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
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Tipo de Receituário *
              </label>
              <select
                value={tipoReceituario}
                onChange={(e) => setTipoReceituario(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100"
              >
                <option value="comum">Comum (Branco Simples)</option>
                <option value="especial_azul">Receituário B (Azul)</option>
                <option value="especial_branco">Controle Especial (Duas Vias)</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-6" />

          {/* Seção: Adicionar Item (Medicamento) */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              Adicionar Medicamento
            </h4>
            
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <input
                    type="text"
                    placeholder="Medicamento (ex: Amoxicilina) *"
                    value={novoItem.medicamento}
                    onChange={(e) => setNovoItem({ ...novoItem, medicamento: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Conc. (ex: 500mg)"
                    value={novoItem.concentracao}
                    onChange={(e) => setNovoItem({ ...novoItem, concentracao: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Forma (ex: Cápsulas)"
                    value={novoItem.forma_farm}
                    onChange={(e) => setNovoItem({ ...novoItem, forma_farm: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Qtd. (ex: 1 caixa)"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Posologia (ex: 1 comp. 8/8h) *"
                  value={novoItem.posologia}
                  onChange={(e) => setNovoItem({ ...novoItem, posologia: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Instruções adicionais"
                    value={novoItem.instrucoes}
                    onChange={(e) => setNovoItem({ ...novoItem, instrucoes: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
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
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                Medicamentos na Receita
              </h4>
              <div className="space-y-2">
                {itens.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                    <div className="pr-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {item.medicamento} {item.concentracao && `- ${item.concentracao}`}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Uso:</span> {item.posologia}
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Observações Gerais
            </label>
            <textarea
              rows={2}
              placeholder="Recomendações gerais ao paciente..."
              value={observacoesGlobais}
              onChange={(e) => setObservacoesGlobais(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100"
            />
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
            disabled={isLoading || !selectedPaciente || itens.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Apenas Salvar'}
          </button>
          <button
            onClick={() => handleGerar(true)}
            disabled={isLoading || !selectedPaciente || itens.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none transition-all"
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
