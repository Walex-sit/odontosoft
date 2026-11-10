'use server'

import { createServerClient } from '@/app/lib/supabase/server'
import { logAction } from '@/app/lib/logger'

export type ReminderType = 'confirmacao' | 'lembrete_24h' | 'pre_operatorio' | 'retorno'

export interface ReminderPayload {
  agendamentoId?: string
  pacienteNome: string
  telefone: string
  dentistaNome?: string
  procedimento?: string
  dataConsulta: string
  horaConsulta: string
  tipo: ReminderType
}

export interface ReminderTemplate {
  tipo: ReminderType
  titulo: string
  descricao: string
  mensagem: string
}

export async function gerarMensagemLembrete(payload: ReminderPayload): Promise<{
  mensagem: string
  whatsappUrl: string
}> {
  const cleanPhone = payload.telefone.replace(/\D/g, '')
  const dataFormatada = new Date(payload.dataConsulta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  const hora = payload.horaConsulta ? payload.horaConsulta.slice(0, 5) : '00:00'
  const dentista = payload.dentistaNome ? ` com ${payload.dentistaNome}` : ''
  const proc = payload.procedimento ? ` (${payload.procedimento})` : ''

  let texto = ''

  switch (payload.tipo) {
    case 'confirmacao':
      texto = `Olá ${payload.pacienteNome}! Sua consulta${proc}${dentista} foi agendada para o dia ${dataFormatada} às ${hora}. Por gentileza, responda com "1" para CONFIRMAR ou "2" para remarcar.`
      break
    case 'lembrete_24h':
      texto = `Olá ${payload.pacienteNome}! Passando para lembrar da sua consulta odontológica amanhã, dia ${dataFormatada} às ${hora}${dentista}. Estamos preparando tudo para lhe receber!`
      break
    case 'pre_operatorio':
      texto = `Olá ${payload.pacienteNome}! Lembrete importante para o seu procedimento${proc} agendado para ${dataFormatada} às ${hora}: favor seguir o jejum e orientações pré-operatórias combinadas.`
      break
    case 'retorno':
      texto = `Olá ${payload.pacienteNome}! Já se passaram 6 meses desde o seu último check-up preventivo na nossa clínica. A saúde do seu sorriso é prioridade! Podemos agendar a sua revisão periódica?`
      break
  }

  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
  const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(texto)}`

  return {
    mensagem: texto,
    whatsappUrl,
  }
}

export async function registrarEnvioLembrete(params: {
  agendamentoId?: string
  pacienteNome: string
  telefone: string
  tipo: ReminderType
  mensagem: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('clinica_id, nome')
        .eq('id', user.id)
        .single()

      await logAction(
        user.id,
        'edicao',
        'lembretes_whatsapp',
        {
          agendamento_id: params.agendamentoId || null,
          paciente_nome: params.pacienteNome,
          telefone: params.telefone,
          tipo: params.tipo,
          clinica_id: profile?.clinica_id,
        },
        profile?.nome
      )
    }

    return { success: true }
  } catch (err: any) {
    console.error('[reminders.registrarEnvioLembrete] Erro:', err)
    return { success: false, error: err?.message }
  }
}
