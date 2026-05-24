'use client'

import { useState } from 'react'
import { X, CalendarDays, Clock, User, FileText, Check } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function NovoAgendamentoModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({
    paciente: '',
    data: '',
    horario: '',
    observacao: '',
  })
  const [saved, setSaved] = useState(false)

  if (!isOpen) return null

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setForm({ paciente: '', data: '', horario: '', observacao: '' })
      onClose()
    }, 1200)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'rgba(10,14,26,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        {/* Modal Card */}
        <div
          className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl"
          style={{
            background: '#131c2e',
            border: '1px solid rgba(148,163,184,0.14)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#f0f4ff' }}>
                Novo Agendamento
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                Criação rápida de consulta
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#64748b' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f0f4ff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Paciente */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#64748b' }}>
                Paciente
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#475569' }} />
                <input
                  type="text"
                  name="paciente"
                  required
                  value={form.paciente}
                  onChange={handleChange}
                  placeholder="Nome do paciente"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: '#1a2540',
                    border: '1px solid rgba(148,163,184,0.12)',
                    color: '#f0f4ff',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)')}
                />
              </div>
            </div>

            {/* Data + Horário lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#64748b' }}>
                  Data
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#475569' }} />
                  <input
                    type="date"
                    name="data"
                    required
                    value={form.data}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: '#1a2540',
                      border: '1px solid rgba(148,163,184,0.12)',
                      color: '#f0f4ff',
                      colorScheme: 'dark',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#64748b' }}>
                  Horário
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#475569' }} />
                  <input
                    type="time"
                    name="horario"
                    required
                    value={form.horario}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: '#1a2540',
                      border: '1px solid rgba(148,163,184,0.12)',
                      color: '#f0f4ff',
                      colorScheme: 'dark',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)')}
                  />
                </div>
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#64748b' }}>
                Observação
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4" style={{ color: '#475569' }} />
                <textarea
                  name="observacao"
                  value={form.observacao}
                  onChange={handleChange}
                  placeholder="Notas adicionais..."
                  rows={3}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                  style={{
                    background: '#1a2540',
                    border: '1px solid rgba(148,163,184,0.12)',
                    color: '#f0f4ff',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2563eb')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.12)')}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'rgba(148,163,184,0.08)',
                  color: '#94a3b8',
                  border: '1px solid rgba(148,163,184,0.12)',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{
                  background: saved ? '#16a34a' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                }}
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" /> Salvo!
                  </>
                ) : (
                  'Agendar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
