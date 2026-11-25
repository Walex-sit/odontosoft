'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, User, UserPlus, CalendarPlus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getCached } from '../lib/cache'

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

  // Debounce e Busca com resultados instantâneos do cache
  useEffect(() => {
    if (!query) {
      setResults([])
      setIsLoading(false)
      return
    }

    // Busca instantânea em memória se houver pacientes em cache
    const cachedPatients = getCached<any[]>('pacientes:lista')
    if (cachedPatients && query.trim()) {
      const q = query.trim().toLowerCase()
      const instant = cachedPatients
        .filter((p: any) => p.nome && p.nome.toLowerCase().includes(q))
        .slice(0, 5)
        .map((p: any) => ({ id: p.id, nome: p.nome, type: 'paciente' as const }))
      if (instant.length > 0) {
        setResults(instant)
      }
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
        className="fixed inset-0 bg-[var(--bg-surface)] transition-opacity" 
        onClick={onClose}
      />
      
      {/* Container do Command */}
      <div className="relative z-[101] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-md dark:bg-[var(--bg-surface)] border border-[var(--border)] animate-in fade-in zoom-in-95 duration-200 mx-4 sm:mx-0">
        
        {/* Input */}
        <div className="flex items-center border-b border-[var(--border)] px-4">
          <Search className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
          <Command.Input 
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar pacientes, profissionais ou acionar ações..." 
            className="flex-1 h-14 bg-transparent border-0 px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-0 sm:text-sm"
          />
          {isLoading && <Loader2 className="h-5 w-5 text-[var(--text-muted)] animate-spin shrink-0" />}
        </div>

        {/* Lista de Resultados */}
        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scroll-smooth">
          <Command.Empty className="p-6 text-center text-sm text-[var(--text-muted)]">
            {isLoading ? 'Buscando...' : 'Nenhum resultado encontrado.'}
          </Command.Empty>

          {/* Resultados da Pesquisa - Pacientes */}
          {results.filter(r => r.type === 'paciente').length > 0 && (
            <Command.Group 
              heading="Pacientes" 
              className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[var(--text-muted)]"
            >
              {results.filter(r => r.type === 'paciente').map(paciente => (
                <Command.Item 
                  key={`pac-${paciente.id}`}
                  onSelect={() => handleSelect(paciente)}
                  value={`paciente ${paciente.nome}`}
                  className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-[var(--text-secondary)] aria-selected:bg-[var(--bg-base)] dark:aria-selected:bg-[var(--bg-surface)] aria-selected:text-[var(--primary)] dark:aria-selected:text-[var(--primary)] transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-[var(--primary-subtle)]  flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{paciente.nome}</span>
                    <span className="text-xs text-[var(--text-muted)]">Paciente</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Resultados da Pesquisa - Profissionais */}
          {results.filter(r => r.type === 'profissional').length > 0 && (
            <Command.Group 
              heading="Profissionais" 
              className="px-2 py-1 mt-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[var(--text-muted)]"
            >
              {results.filter(r => r.type === 'profissional').map(profissional => (
                <Command.Item 
                  key={`prof-${profissional.id}`}
                  onSelect={() => handleSelect(profissional)}
                  value={`profissional ${profissional.nome}`}
                  className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-[var(--text-secondary)] aria-selected:bg-[var(--bg-base)] dark:aria-selected:bg-[var(--bg-surface)] aria-selected:text-[var(--primary)] dark:aria-selected:text-[var(--primary)] transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-[var(--primary-subtle)] dark:bg-[var(--primary-subtle)] flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[var(--primary)] dark:text-[var(--primary)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{profissional.nome}</span>
                    <span className="text-xs text-[var(--text-muted)] capitalize">{profissional.role || 'Profissional'}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Ações Rápidas (Aparecem sempre se a busca estiver vazia ou podem sempre aparecer) */}
          {!query && (
            <Command.Group 
              heading="Ações Rápidas" 
              className="px-2 py-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[var(--text-muted)]"
            >
              <Command.Item 
                onSelect={() => handleAction('novo-paciente')}
                value="novo paciente"
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-[var(--text-secondary)] aria-selected:bg-[var(--bg-base)] dark:aria-selected:bg-[var(--bg-surface)] aria-selected:text-[var(--text-primary)] dark:aria-selected:text-[var(--text-primary)] transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                </div>
                Cadastrar Novo Paciente
              </Command.Item>
              
              <Command.Item 
                onSelect={() => handleAction('novo-agendamento')}
                value="novo agendamento"
                className="flex items-center gap-3 px-3 py-3 mt-1 rounded-xl cursor-pointer text-sm text-[var(--text-secondary)] aria-selected:bg-[var(--bg-base)] dark:aria-selected:bg-[var(--bg-surface)] aria-selected:text-[var(--text-primary)] dark:aria-selected:text-[var(--text-primary)] transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
                  <CalendarPlus className="h-4 w-4 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" />
                </div>
                Novo Agendamento
              </Command.Item>
            </Command.Group>
          )}

        </Command.List>

        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between text-xs text-[var(--text-muted)] bg-[var(--bg-base)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <span>Navegue com <kbd className="font-sans border border-[var(--border)]  rounded px-1.5 py-0.5 bg-[var(--bg-surface)]">↑</kbd> <kbd className="font-sans border border-[var(--border)]  rounded px-1.5 py-0.5 bg-[var(--bg-surface)]">↓</kbd></span>
            <span>Abra com <kbd className="font-sans border border-[var(--border)]  rounded px-1.5 py-0.5 bg-[var(--bg-surface)]">Enter</kbd></span>
          </div>
          <span>Fechar com <kbd className="font-sans border border-[var(--border)]  rounded px-1.5 py-0.5 bg-[var(--bg-surface)]">Esc</kbd></span>
        </div>
      </div>
    </Command.Dialog>
  )
}
