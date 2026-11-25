'use client'

import { useState } from 'react'

const DENTES_PERMANENTES = {
  superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
}

const DENTES_DECIDUOS = {
  superior: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  inferior: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
}

type StatusDente = 'saudavel' | 'carie' | 'restaurado' | 'ausente' | 'extrair' | 'canal'

interface DenteProps {
  numero: number
  status: StatusDente
  onClick: (numero: number) => void
}

function DenteVisual({ numero, status, onClick }: DenteProps) {
  const cores = {
    saudavel: 'bg-[var(--bg-surface)] border-[var(--border-medium)]  text-[var(--text-secondary)]',
    carie: 'bg-red-50 border-red-400 text-red-600',
    restaurado: 'bg-[var(--primary-subtle)] border-[var(--primary)]/40 text-[var(--primary)]',
    ausente: 'bg-[var(--bg-base)] border-[var(--border-medium)]  text-[var(--text-muted)] opacity-50',
    extrair: 'bg-orange-50 border-orange-400 text-orange-600',
    canal: 'bg-[var(--primary-subtle)] border-[var(--primary)]/30 text-[var(--primary)]',
  }

  return (
    <button
      onClick={() => onClick(numero)}
      className={`relative w-10 h-10 flex items-center justify-center rounded-lg border-2 font-bold text-xs shadow-sm hover:scale-105 transition-all ${cores[status]}`}
      title={`Dente ${numero} - ${status}`}
    >
      {numero}
      {status === 'ausente' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-0.5 bg-[var(--border-medium)] rotate-45 absolute" />
          <div className="w-full h-0.5 bg-[var(--border-medium)] -rotate-45 absolute" />
        </div>
      )}
    </button>
  )
}

export default function Odontograma() {
  const [tipo, setTipo] = useState<'permanente' | 'deciduo'>('permanente')
  const [statusMap, setStatusMap] = useState<Record<number, StatusDente>>({
    16: 'carie',
    21: 'restaurado',
    38: 'ausente',
    46: 'canal'
  })

  const [selectedDente, setSelectedDente] = useState<number | null>(null)

  const dentes = tipo === 'permanente' ? DENTES_PERMANENTES : DENTES_DECIDUOS

  const handleDenteClick = (numero: number) => {
    setSelectedDente(numero)
  }

  const changeStatus = (novoStatus: StatusDente) => {
    if (selectedDente) {
      setStatusMap(prev => ({ ...prev, [selectedDente]: novoStatus }))
      setSelectedDente(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--text-primary)]">Odontograma</h3>
        <div className="flex items-center bg-[var(--bg-base)] p-1 rounded-xl">
          <button
            onClick={() => setTipo('permanente')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tipo === 'permanente' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            Permanentes
          </button>
          <button
            onClick={() => setTipo('deciduo')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tipo === 'deciduo' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
          >
            Decíduos
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-6 rounded-2xl border border-[var(--border)]  shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-8 items-center overflow-x-auto">
        {/* Superior */}
        <div className="flex items-center gap-2">
          {dentes.superior.map(num => (
            <DenteVisual key={num} numero={num} status={statusMap[num] || 'saudavel'} onClick={handleDenteClick} />
          ))}
        </div>
        
        {/* Divisória */}
        <div className="w-full max-w-2xl h-px bg-[var(--border)] relative flex justify-center">
          <span className="absolute -top-3 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] px-2 text-xs font-bold tracking-wider text-[var(--text-muted)] uppercase">Direita | Esquerda</span>
        </div>

        {/* Inferior */}
        <div className="flex items-center gap-2">
          {dentes.inferior.map(num => (
            <DenteVisual key={num} numero={num} status={statusMap[num] || 'saudavel'} onClick={handleDenteClick} />
          ))}
        </div>
      </div>

      {/* Ferramentas de Status */}
      {selectedDente && (
        <div className="p-4 bg-[var(--bg-surface)] border border-[var(--primary)]/40 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2 flex items-center justify-between gap-4">
          <p className="font-semibold text-[var(--text-primary)] text-sm">Alterar status do dente <span className="text-[var(--primary)]">{selectedDente}</span>:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => changeStatus('saudavel')} className="px-3 py-1.5 bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-secondary)] text-xs font-bold rounded-lg transition-colors">Saudável</button>
            <button onClick={() => changeStatus('carie')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors">Cárie</button>
            <button onClick={() => changeStatus('restaurado')} className="px-3 py-1.5 bg-[var(--primary-subtle)] hover:bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/40 text-xs font-bold rounded-lg transition-colors">Restaurado</button>
            <button onClick={() => changeStatus('ausente')} className="px-3 py-1.5 bg-[var(--bg-base)] hover:bg-[var(--border)] text-[var(--text-muted)] border border-[var(--border-medium)]  text-xs font-bold rounded-lg transition-colors">Ausente</button>
            <button onClick={() => changeStatus('extrair')} className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold rounded-lg transition-colors">Extrair</button>
            <button onClick={() => changeStatus('canal')} className="px-3 py-1.5 bg-[var(--primary-subtle)] hover:bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/30 text-xs font-bold rounded-lg transition-colors">Canal</button>
          </div>
        </div>
      )}
    </div>
  )
}
