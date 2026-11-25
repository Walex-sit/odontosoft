'use client'

import { X, CalendarDays, Clock, User, FileText, MessageCircle, Activity, Stethoscope, Phone } from 'lucide-react'
import { updateAgendamentoStatus } from '@/app/actions/agenda'
import { toast } from 'sonner'
import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  agendamento: any | null
}

const statusColors: any = {
  agendado: 'bg-[var(--primary-subtle)] text-[var(--primary)]',
  confirmado: 'bg-green-100 text-green-700',
  espera: 'bg-yellow-100 text-yellow-700',
  atendido: 'bg-[var(--primary-subtle)] text-[var(--primary)]',
  cancelado: 'bg-red-100 text-red-700'
}

export default function DetalhesAgendamentoModal({ isOpen, onClose, onSuccess, agendamento }: Props) {
  const [loading, setLoading] = useState(false)

  if (!isOpen || !agendamento) return null

  const pacienteNome = agendamento.pacientes?.nome || 'Paciente Desconhecido'
  const telefone = agendamento.pacientes?.telefone || ''

  async function handleStatusChange(status: string) {
    setLoading(true)
    const res = await updateAgendamentoStatus(agendamento.id, status)
    setLoading(false)
    if (res.success) {
      toast.success(`Status alterado para ${status}`)
      onSuccess()
      onClose()
    } else {
      toast.error(res.error)
    }
  }

  function handleWhatsApp() {
    if (!telefone) {
      toast.warning('O paciente não tem telefone cadastrado.')
      return
    }
    const numeros = telefone.replace(/\D/g, '')
    const url = `https://wa.me/55${numeros}?text=Olá ${pacienteNome}, gostaríamos de confirmar sua consulta para o dia ${new Date(agendamento.data_consulta).toLocaleDateString('pt-BR')} às ${agendamento.hora_consulta}.`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[var(--bg-base)]" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border-none rounded-[24px] p-6 sm:p-8 shadow-md animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-heading font-extrabold text-[var(--text-primary)]">Detalhes do Agendamento</h2>
            <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[agendamento.status || 'agendado']}`}>
              {agendamento.status || 'Agendado'}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-lg"><User size={18} /></div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{pacienteNome}</p>
              <p className="text-xs text-[var(--text-muted)]">Paciente</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-lg"><Stethoscope size={18} /></div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{agendamento.dentistas?.nome || 'Não atribuído'}</p>
              <p className="text-xs text-[var(--text-muted)]">Dentista</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-lg"><Activity size={18} /></div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">{agendamento.procedimento || 'Consulta Padrão'}</p>
              <p className="text-xs text-[var(--text-muted)]">Procedimento</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-lg"><CalendarDays size={18} /></div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {new Date(agendamento.data_consulta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Data</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--primary-subtle)] text-[var(--primary)] rounded-lg"><Clock size={18} /></div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {agendamento.hora_consulta} {agendamento.hora_fim ? `- ${agendamento.hora_fim}` : ''}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Horário</p>
            </div>
          </div>

          {agendamento.observacoes && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-lg"><FileText size={18} /></div>
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">{agendamento.observacoes}</p>
                <p className="text-xs text-[var(--text-muted)]">Observações</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border)]">
          <button 
            disabled={loading}
            onClick={() => handleStatusChange('confirmado')}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors"
          >
            Confirmar Presença
          </button>
          
          <button 
            disabled={loading}
            onClick={() => handleStatusChange('espera')}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors"
          >
            Mover para Espera
          </button>
          
          <button 
            disabled={loading}
            onClick={() => handleStatusChange('atendido')}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-[var(--primary)] bg-[var(--primary-subtle)] hover:bg-[var(--primary-subtle)] border border-[var(--primary)]/30 transition-colors"
          >
            Finalizar Atendimento
          </button>
          
          <button 
            disabled={loading}
            onClick={() => handleStatusChange('cancelado')}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
          >
            Cancelar
          </button>
        </div>

        <button 
          onClick={handleWhatsApp}
          className="w-full mt-3 py-3 rounded-xl text-sm font-bold text-white bg-[var(--success)] hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Phone className="h-4 w-4" /> Enviar Lembrete via WhatsApp
        </button>

      </div>
    </div>
  )
}
