'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal, FileText, CheckCircle2, Clock, Truck, ShieldAlert } from 'lucide-react'

// Colunas do Kanban sem dados fictícios — cards serão criados pelo usuário ou carregados do Supabase.
const initialColumns = [
  {
    id: 'solicitado',
    title: 'Solicitado',
    color: 'border-[var(--primary)]/40',
    bg: 'bg-[var(--primary-subtle)]',
    cards: [] as { id: number; patient: string; item: string; dentist: string; date: string; lab: string }[]
  },
  {
    id: 'em-producao',
    title: 'Em Produção no Laboratório',
    color: 'border-yellow-500',
    bg: 'bg-yellow-50',
    cards: [] as { id: number; patient: string; item: string; dentist: string; date: string; lab: string }[]
  },
  {
    id: 'entregue',
    title: 'Entregue p/ Clínica',
    color: 'border-[var(--primary)]/30',
    bg: 'bg-[var(--primary-subtle)]',
    cards: [] as { id: number; patient: string; item: string; dentist: string; date: string; lab: string }[]
  },
  {
    id: 'finalizado',
    title: 'Instalado no Paciente',
    color: 'border-green-500',
    bg: 'bg-green-50',
    cards: [] as { id: number; patient: string; item: string; dentist: string; date: string; lab: string }[]
  }
]

export default function ProtesesPage() {
  const [columns, setColumns] = useState(initialColumns)
  
  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-base)] dark:bg-[var(--bg-base)] overflow-hidden">
      
      {/* Page Header */}
      <div className="h-20 px-8 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mb-1">Controle de Próteses</h1>
          <p className="text-sm font-medium text-[var(--text-muted)]">Gerencie os pedidos de laboratório com o quadro Kanban.</p>
        </div>
        
        <div className="flex gap-3">
          <button className="h-10 px-4 rounded-xl font-bold text-sm bg-[var(--bg-surface)] border border-[var(--border)]  text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors shadow-sm">
            Filtros
          </button>
          <button className="h-10 px-5 rounded-xl font-bold text-sm bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Kanban Board Area */}
      <div className="flex-1 p-8 pt-0 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-6 h-full items-start min-w-max pb-4">
          
          {columns.map(col => (
            <div key={col.id} className="w-80 flex flex-col h-full bg-transparent">
              
              {/* Column Header */}
              <div className={`h-12 px-4 rounded-t-2xl flex items-center justify-between bg-[var(--bg-surface)] border-t-[3px] border-x border-b border-[var(--border)]  ${col.color} shadow-sm shrink-0`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[var(--text-primary)] text-[15px]">{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.bg} text-[var(--text-secondary)] border border-[var(--border)]`}>
                    {col.cards.length}
                  </span>
                </div>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              {/* Column Body / Cards Container */}
              <div className="flex-1 bg-[var(--bg-base)] border-x border-b border-[var(--border)]  rounded-b-2xl p-3 overflow-y-auto flex flex-col gap-3">
                {col.cards.map(card => (
                  <div key={card.id} className="bg-[var(--bg-surface)] rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-[var(--border)]  cursor-pointer hover:shadow-md transition-all hover:border-[var(--primary)]/40 group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-base)] px-2 py-1 rounded-md">{card.date}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button className="text-[var(--text-muted)] hover:text-[var(--primary)]"><FileText className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-[var(--text-primary)] text-[15px] leading-tight mb-1">{card.patient}</h4>
                    <p className="text-sm font-semibold text-[var(--text-secondary)] mb-3">{card.item}</p>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-[var(--primary-subtle)] flex items-center justify-center text-[10px] font-bold text-[var(--primary)] shrink-0">
                        {card.dentist.charAt(4)}
                      </div>
                      <span className="text-xs font-medium text-[var(--text-muted)] truncate">{card.dentist}</span>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                      <span className="text-[11px] font-bold text-[var(--text-muted)] truncate">{card.lab}</span>
                    </div>
                  </div>
                ))}
                
                {/* Empty State / Add Area */}
                <button className="h-12 border-2 border-dashed border-[var(--border)]  rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-medium)]  hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] dark:bg-[var(--bg-base)] transition-colors flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>

            </div>
          ))}

        </div>
      </div>

    </div>
  )
}
