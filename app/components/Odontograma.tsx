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
    saudavel: 'bg-white border-slate-300 text-slate-600',
    carie: 'bg-red-50 border-red-400 text-red-600',
    restaurado: 'bg-blue-50 border-blue-400 text-blue-600',
    ausente: 'bg-slate-100 border-slate-300 text-slate-400 opacity-50',
    extrair: 'bg-orange-50 border-orange-400 text-orange-600',
    canal: 'bg-purple-50 border-purple-400 text-purple-600',
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
          <div className="w-full h-0.5 bg-slate-400 rotate-45 absolute" />
          <div className="w-full h-0.5 bg-slate-400 -rotate-45 absolute" />
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
        <h3 className="text-lg font-bold text-slate-800">Odontograma</h3>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setTipo('permanente')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tipo === 'permanente' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Permanentes
          </button>
          <button
            onClick={() => setTipo('deciduo')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${tipo === 'deciduo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Decíduos
          </button>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-8 items-center overflow-x-auto">
        {/* Superior */}
        <div className="flex items-center gap-2">
          {dentes.superior.map(num => (
            <DenteVisual key={num} numero={num} status={statusMap[num] || 'saudavel'} onClick={handleDenteClick} />
          ))}
        </div>
        
        {/* Divisória */}
        <div className="w-full max-w-2xl h-px bg-slate-200 relative flex justify-center">
          <span className="absolute -top-3 bg-slate-50 px-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Direita | Esquerda</span>
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
        <div className="p-4 bg-white border border-blue-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-2 flex items-center justify-between gap-4">
          <p className="font-semibold text-slate-800 text-sm">Alterar status do dente <span className="text-blue-600">{selectedDente}</span>:</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => changeStatus('saudavel')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Saudável</button>
            <button onClick={() => changeStatus('carie')} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-colors">Cárie</button>
            <button onClick={() => changeStatus('restaurado')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-bold rounded-lg transition-colors">Restaurado</button>
            <button onClick={() => changeStatus('ausente')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-300 text-xs font-bold rounded-lg transition-colors">Ausente</button>
            <button onClick={() => changeStatus('extrair')} className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 text-xs font-bold rounded-lg transition-colors">Extrair</button>
            <button onClick={() => changeStatus('canal')} className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 text-xs font-bold rounded-lg transition-colors">Canal</button>
          </div>
        </div>
      )}
    </div>
  )
}
