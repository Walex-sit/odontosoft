'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal, FileText, CheckCircle2, Clock, Truck, ShieldAlert } from 'lucide-react'

// Mock Data para as colunas do Kanban
const initialColumns = [
  {
    id: 'solicitado',
    title: 'Solicitado',
    color: 'border-blue-500',
    bg: 'bg-blue-50',
    cards: [
      { id: 1, patient: 'Ana Paula Souza', item: 'Coroa Total Porcelana', dentist: 'Dra. Camila', date: '10/Oct', lab: 'Laboratório Master' }
    ]
  },
  {
    id: 'em-producao',
    title: 'Em Produção no Laboratório',
    color: 'border-yellow-500',
    bg: 'bg-yellow-50',
    cards: [
      { id: 2, patient: 'Roberto Alves', item: 'Prótese Parcial Removível', dentist: 'Dr. João', date: '08/Oct', lab: 'Lab OdontoPrime' },
      { id: 3, patient: 'Fernanda Lima', item: 'Lente de Contato (4 un)', dentist: 'Dra. Camila', date: '05/Oct', lab: 'Laboratório Master' }
    ]
  },
  {
    id: 'entregue',
    title: 'Entregue p/ Clínica',
    color: 'border-purple-500',
    bg: 'bg-purple-50',
    cards: [
      { id: 4, patient: 'Marcos Vinicius', item: 'Placa de Bruxismo', dentist: 'Dr. Roberto', date: '01/Oct', lab: 'Lab OdontoPrime' }
    ]
  },
  {
    id: 'finalizado',
    title: 'Instalado no Paciente',
    color: 'border-green-500',
    bg: 'bg-green-50',
    cards: [
      { id: 5, patient: 'Júlia Mendes', item: 'Implante (Coroa)', dentist: 'Dr. João', date: '28/Sep', lab: 'Lab Titanium' }
    ]
  }
]

export default function ProtesesPage() {
  const [columns, setColumns] = useState(initialColumns)
  
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Page Header */}
      <div className="h-20 px-8 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-1">Controle de Próteses</h1>
          <p className="text-sm font-medium text-slate-500">Gerencie os pedidos de laboratório com o quadro Kanban.</p>
        </div>
        
        <div className="flex gap-3">
          <button className="h-10 px-4 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            Filtros
          </button>
          <button className="h-10 px-5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center gap-2">
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
              <div className={`h-12 px-4 rounded-t-2xl flex items-center justify-between bg-white border-t-[3px] border-x border-b border-slate-200 ${col.color} shadow-sm shrink-0`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-[15px]">{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.bg} text-slate-700 border border-slate-100`}>
                    {col.cards.length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              {/* Column Body / Cards Container */}
              <div className="flex-1 bg-slate-100/50 border-x border-b border-slate-200 rounded-b-2xl p-3 overflow-y-auto flex flex-col gap-3">
                {col.cards.map(card => (
                  <div key={card.id} className="bg-white rounded-xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-slate-200 cursor-pointer hover:shadow-md transition-all hover:border-blue-200 group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{card.date}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button className="text-slate-400 hover:text-blue-600"><FileText className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 text-[15px] leading-tight mb-1">{card.patient}</h4>
                    <p className="text-sm font-semibold text-slate-600 mb-3">{card.item}</p>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                        {card.dentist.charAt(4)}
                      </div>
                      <span className="text-xs font-medium text-slate-500 truncate">{card.dentist}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-500 truncate">{card.lab}</span>
                    </div>
                  </div>
                ))}
                
                {/* Empty State / Add Area */}
                <button className="h-12 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
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
