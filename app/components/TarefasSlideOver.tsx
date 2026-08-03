'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, Circle, Clock, AlertCircle, CheckSquare } from 'lucide-react'

interface Tarefa {
  id: number
  title: string
  description: string
  time: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
}

const MOCK_TAREFAS: Tarefa[] = [
  { id: 1, title: 'Ligar para João Silva', description: 'Confirmar consulta de retorno às 15:30', time: '14:00', priority: 'high', completed: false },
  { id: 2, title: 'Conferir estoque de resinas', description: 'Fazer pedido com fornecedor DentalX', time: '16:00', priority: 'medium', completed: false },
  { id: 3, title: 'Aprovação de Orçamento', description: 'Revisar orçamento da paciente Maria Oliveira', time: '17:30', priority: 'high', completed: false },
  { id: 4, title: 'Organizar prontuários do dia', description: 'Arquivar fichas físicas e preencher prontuário digital', time: '18:00', priority: 'low', completed: true },
]

export default function TarefasSlideOver({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>(MOCK_TAREFAS)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAnimateIn(true)
    } else {
      setAnimateIn(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    setAnimateIn(false)
    setTimeout(onClose, 300) // Aguarda a animação
  }

  const toggleTarefa = (id: number) => {
    setTarefas(tarefas.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const pendentes = tarefas.filter(t => !t.completed).length

  return (
    <div className="fixed inset-0 z-[999] flex justify-end">
      {/* Overlay Escuro */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${animateIn ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Painel Lateral */}
      <div 
        className={`relative w-full max-w-sm h-full bg-slate-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out transform ${
          animateIn ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Tarefas do Dia</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}</p>
              </div>
            </div>
            <button 
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Lista de Tarefas */}
        <div className="flex-1 overflow-y-auto p-6">
          {tarefas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-4" />
              <p className="text-sm font-bold text-slate-700">Tudo em dia!</p>
              <p className="text-xs text-slate-500 mt-1">Você não tem tarefas pendentes para hoje.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tarefas.map(tarefa => (
                <div 
                  key={tarefa.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    tarefa.completed 
                      ? 'bg-slate-50 border-slate-200 opacity-60' 
                      : 'bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer'
                  }`}
                  onClick={() => toggleTarefa(tarefa.id)}
                >
                  <div className="flex items-start gap-3">
                    <button className={`mt-0.5 shrink-0 ${tarefa.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}>
                      {tarefa.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-bold ${tarefa.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {tarefa.title}
                        </h4>
                        {!tarefa.completed && tarefa.priority === 'high' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                            <AlertCircle className="h-3 w-3" /> Alta
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${tarefa.completed ? 'text-slate-400' : 'text-slate-500'}`}>
                        {tarefa.description}
                      </p>
                      
                      <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {tarefa.time}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-200 shrink-0">
          <button 
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
            onClick={handleClose}
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  )
}
