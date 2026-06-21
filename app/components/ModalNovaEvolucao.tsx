'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabaseClient'
import { X, FileText, Loader2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  pacienteId: string
  dentistaId: string
  onClose: () => void
  onSaved: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInputValue(date: Date) {
  return date.toISOString().split('T')[0]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModalNovaEvolucao({ pacienteId, dentistaId, onClose, onSaved }: Props) {
  const today = toDateInputValue(new Date())

  const [data, setData] = useState(today)
  const [evolucao, setEvolucao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef  = useRef<HTMLDivElement>(null)

  // Foca o textarea ao abrir
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  // Fecha ao pressionar Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Bloqueia scroll do body enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────

  async function salvar() {
    const texto = evolucao.trim()
    if (!texto || !data) {
      setErro('Preencha a data e a descrição da evolução.')
      return
    }

    setSalvando(true)
    setErro(null)

    const { error } = await supabase.from('evolucao').insert([{
      paciente_id:  pacienteId,
      dentista_id:  dentistaId,
      data_evolucao: data,
      descricao:    texto,
    }])

    setSalvando(false)

    if (error) {
      setErro(error.message)
    } else {
      onSaved()   // dispara refresh na tela pai
      onClose()   // fecha o modal
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /* Overlay */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden />

      {/* Dialog */}
      <div
        className="
          relative z-10 w-full sm:max-w-lg
          bg-slate-900 border border-slate-700/60
          rounded-t-3xl sm:rounded-2xl
          shadow-2xl shadow-black/60
          flex flex-col
          animate-in fade-in slide-in-from-bottom-4 duration-200
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-slate-100">
                Nova Evolução
              </h2>
              <p className="text-xs text-slate-500">Registro clínico do paciente</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all active:scale-95"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Data */}
          <div>
            <label
              htmlFor="evo-data"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
            >
              Data da Evolução
            </label>
            <input
              id="evo-data"
              type="date"
              value={data}
              max={today}
              onChange={(e) => setData(e.target.value)}
              className="
                w-full px-4 py-2.5
                bg-slate-800 border border-slate-700
                rounded-xl text-slate-100
                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                text-sm transition-all
                [color-scheme:dark]
              "
            />
          </div>

          {/* Descrição / Evolução */}
          <div>
            <label
              htmlFor="evo-descricao"
              className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
            >
              Evolução Clínica
            </label>
            <textarea
              id="evo-descricao"
              ref={textareaRef}
              value={evolucao}
              onChange={(e) => setEvolucao(e.target.value)}
              placeholder="Descreva o atendimento realizado, procedimentos, observações clínicas, materiais utilizados…"
              rows={6}
              className="
                w-full px-4 py-3
                bg-slate-800 border border-slate-700
                rounded-xl text-slate-100 text-sm leading-relaxed
                placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                transition-all resize-none
              "
            />
            <p className="text-right text-[10px] text-slate-600 mt-1">
              {evolucao.length} caracteres
            </p>
          </div>

          {/* Erro inline */}
          {erro && (
            <p className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {erro}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onClose}
            disabled={salvando}
            className="
              w-full sm:w-auto px-5 py-2.5 rounded-xl
              text-sm font-bold text-slate-400 hover:text-slate-100
              bg-slate-800 hover:bg-slate-700
              border border-slate-700 hover:border-slate-600
              transition-all active:scale-95 disabled:opacity-50
            "
          >
            Cancelar
          </button>

          <button
            onClick={salvar}
            disabled={salvando || !evolucao.trim() || !data}
            className="
              w-full sm:w-auto px-6 py-2.5 rounded-xl
              text-sm font-bold text-white
              bg-blue-600 hover:bg-blue-500
              border border-blue-500
              shadow-sm shadow-blue-500/20
              transition-all active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            "
          >
            {salvando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando…
              </>
            ) : (
              'Salvar Evolução'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
