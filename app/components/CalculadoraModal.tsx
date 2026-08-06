'use client'

import { useState } from 'react'
import { X, Calculator } from 'lucide-react'

interface CalculadoraModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CalculadoraModal({ isOpen, onClose }: CalculadoraModalProps) {
  const [display, setDisplay] = useState('0')
  const [equation, setEquation] = useState('')

  if (!isOpen) return null

  const handleBtnClick = (val: string) => {
    if (val === 'C') {
      setDisplay('0')
      setEquation('')
      return
    }

    if (val === '=') {
      try {
        const sanitized = equation.replace(/×/g, '*').replace(/÷/g, '/')
        const res = Function(`'use strict'; return (${sanitized})`)()
        setDisplay(String(res))
        setEquation(String(res))
      } catch {
        setDisplay('Erro')
      }
      return
    }

    if (['+', '-', '×', '÷'].includes(val)) {
      setEquation(prev => prev + ' ' + val + ' ')
      setDisplay('0')
      return
    }

    setEquation(prev => (prev === '0' ? val : prev + val))
    setDisplay(prev => (prev === '0' ? val : prev + val))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xs overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-sm">Calculadora</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Display */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 text-right">
          <div className="text-xs text-slate-400 font-mono h-4 overflow-hidden truncate">
            {equation || ' '}
          </div>
          <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-mono tracking-tight truncate mt-1">
            {display}
          </div>
        </div>

        {/* Teclado */}
        <div className="p-4 grid grid-cols-4 gap-2 bg-white dark:bg-slate-800">
          {['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map((btn) => {
            const isOp = ['÷', '×', '-', '+', '='].includes(btn)
            const isClear = btn === 'C'
            
            return (
              <button
                key={btn}
                onClick={() => handleBtnClick(btn)}
                className={`py-3 rounded-2xl font-bold text-base transition-all active:scale-95 shadow-sm ${
                  btn === '='
                    ? 'col-span-2 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                    : isOp
                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    : isClear
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-slate-100 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                }`}
              >
                {btn}
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
