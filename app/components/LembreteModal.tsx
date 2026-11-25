'use client'

import { useState, useEffect } from 'react'
import { X, Send, MessageCircle, Clock, Calendar, CheckCircle2, User, Phone, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { ReminderType, gerarMensagemLembrete, registrarEnvioLembrete } from '@/app/actions/reminders'

interface LembreteModalProps {
  isOpen: boolean
  onClose: () => void
  agendamento: {
    id?: string
    pacientes?: { nome: string; telefone?: string }
    dentistas?: { nome: string }
    procedimento?: string
    data_consulta: string
    hora_consulta: string
  } | null
}

export default function LembreteModal({ isOpen, onClose, agendamento }: LembreteModalProps) {
  const [tipo, setTipo] = useState<ReminderType>('confirmacao')
  const [mensagem, setMensagem] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const pacienteNome = agendamento?.pacientes?.nome || 'Paciente'
  const telefone = agendamento?.pacientes?.telefone || ''

  useEffect(() => {
    if (!agendamento) return

    async function computeMessage() {
      if (!agendamento) return
      const res = await gerarMensagemLembrete({
        agendamentoId: agendamento.id,
        pacienteNome,
        telefone,
        dentistaNome: agendamento.dentistas?.nome,
        procedimento: agendamento.procedimento,
        dataConsulta: agendamento.data_consulta,
        horaConsulta: agendamento.hora_consulta,
        tipo,
      })
      setMensagem(res.mensagem)
      setWhatsappUrl(res.whatsappUrl)
    }

    computeMessage()
  }, [agendamento, tipo, pacienteNome, telefone])

  if (!isOpen || !agendamento) return null

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(mensagem)
    setCopied(true)
    toast.success('Texto copiado para a área de transferência!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenWhatsApp = async () => {
    if (!telefone) {
      toast.error('Paciente não possui telefone cadastrado.')
      return
    }

    setLoading(true)
    try {
      await registrarEnvioLembrete({
        agendamentoId: agendamento.id,
        pacienteNome,
        telefone,
        tipo,
        mensagem,
      })
      window.open(whatsappUrl, '_blank')
      toast.success('Lembrete registrado e WhatsApp aberto!')
      onClose()
    } catch (e) {
      window.open(whatsappUrl, '_blank')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-surface)] animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] rounded-[28px] shadow-md w-full max-w-lg overflow-hidden flex flex-col border border-[var(--border)]/80 ">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-base)] dark:bg-[var(--bg-base)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-[var(--text-primary)]">
                Disparo de Lembrete WhatsApp
              </h2>
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                Confirmação e notificações automáticas para o paciente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--border)]/50 dark:hover:bg-[var(--bg-surface)] rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Informações rápidas do paciente */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] rounded-2xl border border-[var(--border)]/60 ">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary-subtle)]  text-[var(--primary)] flex items-center justify-center font-bold text-xs">
                {pacienteNome.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{pacienteNome}</p>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">{telefone || 'Sem telefone'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-extrabold text-[var(--text-secondary)]">
                {new Date(agendamento.data_consulta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">{agendamento.hora_consulta.slice(0, 5)}</p>
            </div>
          </div>

          {/* Seleção do Template */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Selecione o Modelo de Mensagem
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'confirmacao', label: 'Confirmação', desc: 'Pedir confirmação da consulta' },
                { id: 'lembrete_24h', label: 'Lembrete 24h', desc: 'Aviso na véspera do horário' },
                { id: 'pre_operatorio', label: 'Pré-Operatório', desc: 'Orientações e cuidados' },
                { id: 'retorno', label: 'Revisão Periódica', desc: 'Convocação semestral' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id as ReminderType)}
                  className={`p-3 rounded-2xl text-left border transition-all active:scale-[0.98] ${
                    tipo === t.id
                      ? 'bg-[var(--primary-subtle)] border-[var(--primary)]/40  text-[var(--primary)] shadow-2xs ring-2 ring-[var(--primary)]/20'
                      : 'bg-[var(--bg-surface)] border-[var(--border)]/80  text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prévia da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Prévia da Mensagem (Editável)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copiado' : 'Copiar texto'}
              </button>
            </div>
            <textarea
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full p-3.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border border-[var(--border)] rounded-2xl text-xs sm:text-sm font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]/40 transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-base)] dark:bg-[var(--bg-base)] mt-auto flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]/50 rounded-xl transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={loading || !telefone}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
