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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200/80 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-slate-800 dark:text-slate-100">
                Disparo de Lembrete WhatsApp
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Confirmação e notificações automáticas para o paciente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {/* Informações rápidas do paciente */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                {pacienteNome.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{pacienteNome}</p>
                <p className="text-[11px] text-slate-400 font-medium">{telefone || 'Sem telefone'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {new Date(agendamento.data_consulta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">{agendamento.hora_consulta.slice(0, 5)}</p>
            </div>
          </div>

          {/* Seleção do Template */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-2xs ring-2 ring-blue-500/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <p className="text-xs font-bold">{t.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prévia da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Prévia da Mensagem (Editável)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copiado' : 'Copiar texto'}
              </button>
            </div>
            <textarea
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 mt-auto flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={loading || !telefone}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
