'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, User, UserPlus, CalendarPlus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: string
  nome: string
  type: 'paciente' | 'profissional'
  role?: string
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Debounce e Busca
  useEffect(() => {
    if (!query) {
      setResults([])
      setIsLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        // Busca pacientes
        const { data: pacientes } = await supabase
          .from('pacientes')
          .select('id, nome')
          .ilike('nome', `%${query}%`)
          .limit(5)

        // Busca profissionais
        const { data: profissionais } = await supabase
          .from('user_profiles')
          .select('id, nome, role')
          .ilike('nome', `%${query}%`)
          .limit(5)

        const combinedResults: SearchResult[] = [
          ...(pacientes?.map((p) => ({ ...p, type: 'paciente' as const })) || []),
          ...(profissionais?.map((p) => ({ ...p, type: 'profissional' as const })) || []),
        ]

        setResults(combinedResults)
      } catch (error) {
        console.error('Erro na busca global:', error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (result: SearchResult) => {
    onClose()
    if (result.type === 'paciente') {
      router.push(`/pacientes/${result.id}`)
    } else if (result.type === 'profissional') {
      router.push(`/usuarios`)
    }
  }

  const handleAction = (action: string) => {
    onClose()
    if (action === 'novo-paciente') {
      router.push('/pacientes')
    } else if (action === 'novo-agendamento') {
      router.push('/agenda')
    }
  }

  return (
    <Command.Dialog 
      open={isOpen} 
      onOpenChange={onClose}
      label="Busca Global"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[20vh]"
    >
      {/* Overlay Escuro */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Container do Command */}
      <div className="relative z-[101] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 mx-4 sm:mx-0">
        
        {/* Input */}
        <div className="flex items-center border-b border-slate-100 dark:border-slate-800 px-4">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <Command.Input 
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar pacientes, profissionais ou acionar ações..." 
            className="flex-1 h-14 bg-transparent border-0 px-4 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-sm"
          />
          {isLoading && <Loader2 className="h-5 w-5 text-slate-400 animate-spin shrink-0" />}
        </div>

        {/* Lista de Resultados */}
        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scroll-smooth">
          <Command.Empty className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {isLoading ? 'Buscando...' : 'Nenhum resultado encontrado.'}
          </Command.Empty>

          {/* Resultados da Pesquisa - Pacientes */}
          {results.filter(r => r.type === 'paciente').length > 0 && (
            <Command.Group 
              heading="Pacientes" 
              className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-slate-500"
            >
              {results.filter(r => r.type === 'paciente').map(paciente => (
                <Command.Item 
                  key={`pac-${paciente.id}`}
                  onSelect={() => handleSelect(paciente)}
                  value={`paciente ${paciente.nome}`}
                  className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-slate-700 dark:text-slate-300 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800 aria-selected:text-blue-600 dark:aria-selected:text-blue-400 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{paciente.nome}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Paciente</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Resultados da Pesquisa - Profissionais */}
          {results.filter(r => r.type === 'profissional').length > 0 && (
            <Command.Group 
              heading="Profissionais" 
              className="px-2 py-1 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-slate-500"
            >
              {results.filter(r => r.type === 'profissional').map(profissional => (
                <Command.Item 
                  key={`prof-${profissional.id}`}
                  onSelect={() => handleSelect(profissional)}
                  value={`profissional ${profissional.nome}`}
                  className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-slate-700 dark:text-slate-300 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800 aria-selected:text-purple-600 dark:aria-selected:text-purple-400 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{profissional.nome}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{profissional.role || 'Profissional'}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Ações Rápidas (Aparecem sempre se a busca estiver vazia ou podem sempre aparecer) */}
          {!query && (
            <Command.Group 
              heading="Ações Rápidas" 
              className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-slate-500"
            >
              <Command.Item 
                onSelect={() => handleAction('novo-paciente')}
                value="novo paciente"
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-slate-700 dark:text-slate-300 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800 aria-selected:text-slate-900 dark:aria-selected:text-slate-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                Cadastrar Novo Paciente
              </Command.Item>
              
              <Command.Item 
                onSelect={() => handleAction('novo-agendamento')}
                value="novo agendamento"
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-slate-700 dark:text-slate-300 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800 aria-selected:text-slate-900 dark:aria-selected:text-slate-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <CalendarPlus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                Novo Agendamento
              </Command.Item>
            </Command.Group>
          )}

        </Command.List>

        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span>Navegue com <kbd className="font-sans border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800">↑</kbd> <kbd className="font-sans border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800">↓</kbd></span>
            <span>Abra com <kbd className="font-sans border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800">Enter</kbd></span>
          </div>
          <span>Fechar com <kbd className="font-sans border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800">Esc</kbd></span>
        </div>
      </div>
    </Command.Dialog>
  )
}
