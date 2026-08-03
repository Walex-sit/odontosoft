'use client'

import { useState, useEffect } from 'react'
import { X, CalendarDays, Clock, User, FileText, Check, Stethoscope } from 'lucide-react'
import { createAgendamento } from '@/app/actions/agenda'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  pacientes: any[]
  dentistas: any[]
  initialDate?: string
  initialTime?: string
}

export default function NovoAgendamentoModal({ isOpen, onClose, onSuccess, pacientes, dentistas, initialDate, initialTime }: Props) {
  const [form, setForm] = useState({
    paciente_id: '',
    dentista_id: '',
    procedimento: '',
    data: '',
    horario: '',
    hora_fim: '',
    observacao: '',
  })
  const [loading, setLoading] = useState(false)

  // Atualizar data/hora inicial quando o modal abre com base num clique no calendário
  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({
        ...prev,
        data: initialDate || '',
        horario: initialTime || '',
        // Por padrão, se tiver horário inicial, sugere 30 min depois para hora_fim
        hora_fim: initialTime ? calculateEndTime(initialTime) : ''
      }))
    }
  }, [isOpen, initialDate, initialTime])

  function calculateEndTime(start: string) {
    if (!start) return ''
    const [h, m] = start.split(':').map(Number)
    const date = new Date()
    date.setHours(h, m + 30, 0)
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!form.paciente_id || !form.dentista_id || !form.data || !form.horario) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    setLoading(true)

    const res = await createAgendamento({
      paciente_id: form.paciente_id,
      dentista_id: form.dentista_id,
      data_consulta: form.data,
      hora_consulta: form.horario,
      hora_fim: form.hora_fim || calculateEndTime(form.horario),
      procedimento: form.procedimento,
      observacoes: form.observacao,
      status: 'agendado'
    })

    setLoading(false)

    if (!res.success) {
      toast.error(res.error)
      return
    }

    toast.success('Agendamento criado com sucesso!')
    setForm({ paciente_id: '', dentista_id: '', procedimento: '', data: '', horario: '', hora_fim: '', observacao: '' })
    onSuccess()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
        <div className="relative w-full max-w-lg bg-white border-none rounded-[24px] p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-heading font-extrabold text-slate-800">Novo Agendamento</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Preencha os detalhes da consulta</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Paciente *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select name="paciente_id" required value={form.paciente_id} onChange={handleChange} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-800 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none">
                    <option value="">Selecione o Paciente</option>
                    {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Dentista *</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select name="dentista_id" required value={form.dentista_id} onChange={handleChange} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-800 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none">
                    <option value="">Selecione o Dentista</option>
                    {dentistas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Procedimento</label>
              <input type="text" name="procedimento" value={form.procedimento} onChange={handleChange} placeholder="Ex: Limpeza, Avaliação, Canal..." className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-800 font-medium text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Data *</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="date" name="data" required value={form.data} onChange={handleChange} className="w-full pl-9 pr-2 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-800 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 [color-scheme:light]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Início *</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="time" name="horario" required value={form.horario} onChange={handleChange} className="w-full pl-9 pr-2 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-800 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 [color-scheme:light]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Fim</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="time" name="hora_fim" value={form.hora_fim} onChange={handleChange} className="w-full pl-9 pr-2 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-800 font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 [color-scheme:light]" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider text-slate-500">Observações</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea name="observacao" value={form.observacao} onChange={handleChange} placeholder="Notas adicionais..." rows={2} className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-800 font-medium text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="flex-[2] py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Salvando...' : 'Salvar Agendamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
