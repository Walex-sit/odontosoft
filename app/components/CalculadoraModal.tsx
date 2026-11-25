'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calculator } from 'lucide-react'

interface CalculadoraModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CalculadoraModal({ isOpen, onClose }: CalculadoraModalProps) {
  const [mounted, setMounted] = useState(false)
  const [display, setDisplay] = useState('0')
  const [equation, setEquation] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!isOpen || !mounted) return null

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

  return createPortal(
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 overflow-y-auto animate-in fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs max-h-[90dvh] overflow-y-auto my-auto bg-[var(--bg-surface)] rounded-3xl shadow-md border border-[var(--border)]"
      >
        
        {/* Header */}
        <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] border-b border-[var(--border)] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="font-bold text-sm">Calculadora</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Display */}
        <div className="p-4 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-b border-[var(--border)]  text-right">
          <div className="text-xs text-[var(--text-muted)] font-mono h-4 overflow-hidden truncate">
            {equation || ' '}
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight truncate mt-1">
            {display}
          </div>
        </div>

        {/* Teclado */}
        <div className="p-4 grid grid-cols-4 gap-2 bg-[var(--bg-surface)]">
          {['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map((btn) => {
            const isOp = ['÷', '×', '-', '+', '='].includes(btn)
            const isClear = btn === 'C'
            
            return (
              <button
                key={btn}
                onClick={() => handleBtnClick(btn)}
                className={`py-3 rounded-2xl font-bold text-base transition-all active:scale-95 shadow-sm ${
                  btn === '='
                    ? 'col-span-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] '
                    : isOp
                    ? 'bg-[var(--primary-subtle)] text-[var(--primary)] hover:bg-[var(--primary-subtle)]'
                    : isClear
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-[var(--bg-base)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                }`}
              >
                {btn}
              </button>
            )
          })}
        </div>

      </div>
    </div>,
    document.body
  )
}
