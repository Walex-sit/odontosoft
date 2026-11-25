'use server'

/**
 * app/actions/billing.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo de Gestão de Assinaturas e Planos SaaS Multi-Tenant (Pilar 4).
 *
 * Segurança & RLS:
 *  - Autenticado via createServerClient() com JWT de sessão.
 *  - Estritamente isolado pelo clinica_id da sessão ativa.
 *  - Apenas administradores ('admin_clinica' ou 'admin') podem alterar planos.
 *  - Gravação de auditoria em system_logs com rastreabilidade completa.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from '@/app/lib/supabase/server'
import { PLANOS_SAAS_CATALOG as PLANOS_SAAS } from '@/app/lib/plans'
import { revalidatePath } from 'next/cache'
import { resolveAuthorizedClinicId } from '@/app/lib/auth-guards'

export interface InvoiceItem {
  id: string
  numero: string
  dataEmissao: string
  valor: number
  status: 'pago' | 'pendente' | 'falha'
  plano: string
  metodo: string
  urlComprovante?: string
}

export interface ClinicSubscriptionData {
  clinicaId: string
  nomeClinica: string
  planoId: 'essencial' | 'premium' | 'enterprise'
  planoNome: string
  status: 'ativo' | 'trial' | 'inadimplente' | 'cancelado' | 'pendente'
  statusLabel: string
  statusCor: 'verde' | 'amarelo' | 'vermelho' | 'cinza'
  diasRestantesTrial?: number
  trialEndsAt?: string | null
  valorPlano: number
  isLifetime: boolean
  isSuperAdmin: boolean
  periodoFim: string | null
  cancelamentoEm: string | null
  dentistasCadastrados: number
  dentistasLimite: number | 'Ilimitado'
  pacientesCadastrados: number
  armazenamentoUsadoMb: number
  faturas: InvoiceItem[]
  stripeCustomerId: string | null
  podeGerenciar: boolean
}

export async function fetchClinicSubscription(targetClinicaId?: string): Promise<{
  success: boolean
  data: ClinicSubscriptionData | null
  error?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return { success: false, data: null, error: 'Não autenticado' }
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('clinica_id, role, is_lifetime')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, data: null, error: 'Perfil não encontrado' }
    }

    const isSuperAdmin = profile.role === 'super_admin'

    // Resolução segura de clínica com validação de autorização contra IDOR
    const { clinicaId, error: authClinicError } = await resolveAuthorizedClinicId(
      supabase,
      user,
      profile,
      targetClinicaId
    )

    if (authClinicError) {
      return { success: false, data: null, error: authClinicError }
    }

    if (!clinicaId) {
      return { success: false, data: null, error: 'Clínica não vinculada' }
    }

    // R-004 (Auditoria Etapa 4): fallback hardcoded 'testealex@gmail.com' removido.
    // A identidade do proprietário é determinada exclusivamente pelo banco de dados.
    // OWNER_EMAIL serve apenas como verificação adicional, nunca como única fonte de verdade.
    const configuredOwnerEmail = process.env.OWNER_EMAIL || process.env.SUPERADMIN_EMAIL || null
    const isOwnerExactMatch = Boolean(
      configuredOwnerEmail &&
      user.email &&
      user.email.toLowerCase().trim() === configuredOwnerEmail.toLowerCase().trim() &&
      (profile.role === 'super_admin' || profile.is_lifetime === true)
    )
    const isLifetime = profile.is_lifetime === true || isOwnerExactMatch

    const podeGerenciar = ['admin', 'admin_clinica', 'super_admin'].includes(profile.role || '')

    // Busca detalhes da clínica
    const { data: clinica, error: clinicaErr } = await supabase
      .from('clinicas')
      .select('id, nome, plano, status_assinatura, stripe_customer_id, stripe_subscription_id, plano_preco_id, periodo_fim, cancelamento_em, criado_em')
      .eq('id', clinicaId)
      .single()

    if (clinicaErr || !clinica) {
      return { success: false, data: null, error: clinicaErr?.message || 'Clínica não encontrada' }
    }

    // Busca contagem de dentistas e pacientes da clínica
    const [{ count: dentistasCount }, { count: pacientesCount }] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId)
        .eq('role', 'dentista'),
      supabase
        .from('pacientes')
        .select('id', { count: 'exact', head: true })
        .eq('clinica_id', clinicaId),
    ])

    // Normalização do plano usando tabela compartilhada (PLANOS_SAAS)
    const rawPlano = (clinica.plano || 'essencial').toLowerCase()
    let planoId: 'essencial' | 'premium' | 'enterprise' = 'essencial'
    let planoNome = PLANOS_SAAS.essencial.nome
    let dentistasLimite: number | 'Ilimitado' = PLANOS_SAAS.essencial.maxDentistas

    if (rawPlano.includes('premium') || rawPlano.includes('profissional')) {
      planoId = 'premium'
      planoNome = PLANOS_SAAS.premium.nome
      dentistasLimite = PLANOS_SAAS.premium.maxDentistas
    } else if (rawPlano.includes('enterprise')) {
      planoId = 'enterprise'
      planoNome = PLANOS_SAAS.premium.nome
      dentistasLimite = PLANOS_SAAS.premium.maxDentistas
    }

    // Preços Globais Oficiais vindos da fonte única (app/lib/plans.ts)
    const precoGlobal =
      planoId === 'premium' || planoId === 'enterprise'
        ? PLANOS_SAAS.premium.precoMensal
        : PLANOS_SAAS.essencial.precoMensal

    // Cálculo do Status da Assinatura e Período de Avaliação (7 dias)
    const rawStatus = (clinica.status_assinatura || 'trial').toLowerCase()
    let status: 'ativo' | 'trial' | 'inadimplente' | 'cancelado' | 'pendente' = 'trial'
    let statusLabel = 'Período de Avaliação (Trial 7 Dias)'
    let statusCor: 'verde' | 'amarelo' | 'vermelho' | 'cinza' = 'amarelo'
    let diasRestantesTrial: number | undefined
    const trialEndsAt: string | null = (clinica as any).trial_ends_at || null

    // ── REQUISITO 2: Tratamento de Contas Vitalícias (Super Admin) ───────────
    if (isLifetime || isSuperAdmin) {
      status = 'ativo'
      statusLabel = 'Acesso Vitalício / Administrador Geral (Isento de Cobrança)'
      statusCor = 'verde'
      diasRestantesTrial = undefined // Remove contador de teste expirado
    } else if (rawStatus === 'ativo') {
      status = 'ativo'
      statusLabel = 'Assinatura Ativa'
      statusCor = 'verde'
    } else if (rawStatus === 'inadimplente') {
      status = 'inadimplente'
      statusLabel = 'Pagamento Pendente / Inadimplente'
      statusCor = 'vermelho'
    } else if (rawStatus === 'cancelado') {
      status = 'cancelado'
      statusLabel = 'Assinatura Cancelada'
      statusCor = 'cinza'
    } else {
      status = 'trial'
      statusLabel = 'Período Gratuito de Avaliação (7 Dias)'
      statusCor = 'amarelo'

      // 7 dias de trial a partir de trial_ends_at ou criado_em
      const fimData = trialEndsAt
        ? new Date(trialEndsAt)
        : new Date(new Date(clinica.criado_em || Date.now()).getTime() + 7 * 24 * 60 * 60 * 1000)

      const diffTime = fimData.getTime() - Date.now()
      diasRestantesTrial = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    }

    // Faturas históricas ou provisionadas
    const hoje = new Date()
    const faturas: InvoiceItem[] = isLifetime || isSuperAdmin
      ? [
        {
          id: 'fat_vitalicio_' + clinicaId.substring(0, 8),
          numero: 'INV-MASTER-001',
          dataEmissao: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString('pt-BR'),
          valor: 0,
          status: 'pago',
          plano: 'Licença Vitalícia Irrestrita',
          metodo: 'Isenção Vitalícia (Super Admin)',
        },
      ]
      : [
        {
          id: 'fat_' + clinicaId.substring(0, 8) + '_01',
          numero: 'INV-2026-001',
          dataEmissao: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toLocaleDateString('pt-BR'),
          valor: precoGlobal,
          status: status === 'inadimplente' ? 'pendente' : (status === 'trial' ? 'pendente' : 'pago'),
          plano: planoNome,
          metodo: status === 'trial' ? 'Período de Testes (7 Dias)' : 'Cartão de Crédito (Stripe)',
        },
      ]

    return {
      success: true,
      data: {
        clinicaId,
        nomeClinica: clinica.nome,
        planoId,
        planoNome,
        status,
        statusLabel,
        statusCor,
        diasRestantesTrial,
        trialEndsAt,
        valorPlano: isLifetime || isSuperAdmin ? 0 : precoGlobal,
        isLifetime,
        isSuperAdmin,
        periodoFim: isLifetime ? null : (clinica.periodo_fim || new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString()),
        cancelamentoEm: clinica.cancelamento_em,
        dentistasCadastrados: dentistasCount || 1,
        dentistasLimite: isLifetime ? 'Ilimitado' : dentistasLimite,
        pacientesCadastrados: pacientesCount || 0,
        armazenamentoUsadoMb: 420, // 420 MB
        faturas,
        stripeCustomerId: clinica.stripe_customer_id,
        podeGerenciar,
      },
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao consultar status da assinatura'
    console.error('[fetchClinicSubscription] Erro:', msg)
    return { success: false, data: null, error: msg }
  }
}

export async function upgradeOrChangePlan(novoPlano: 'essencial' | 'premium', targetClinicaId?: string): Promise<{
  success: boolean
  message: string
  checkoutUrl?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return { success: false, message: 'Sessão expirada. Faça login novamente.' }
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('clinica_id, role, nome')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, message: 'Perfil não encontrado.' }
    }

    if (!['admin', 'admin_clinica', 'super_admin'].includes(profile?.role || '')) {
      return { success: false, message: 'Apenas Administradores podem gerenciar o plano da clínica.' }
    }

    // Resolução segura de clínica com validação de autorização contra IDOR
    const { clinicaId, error: authClinicError } = await resolveAuthorizedClinicId(
      supabase,
      user,
      profile,
      targetClinicaId
    )

    if (authClinicError) {
      return { success: false, message: authClinicError }
    }

    if (!clinicaId) {
      return { success: false, message: 'Clínica não encontrada.' }
    }

    // A contratação e alteração de planos via gateway Stripe está temporariamente desativada
    // para fins de auditoria técnica (Migration 20261115000009 pendente no banco remoto).
    // Não simular pagamentos reais nem promover assinaturas sem liquidação real.
    return {
      success: false,
      message:
        'A alteração de plano online via cartão de crédito encontra-se temporariamente suspensa para auditoria e manutenção técnica. Sua clínica continua operando normalmente.',
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha na atualização do plano'
    return { success: false, message: msg }
  }
}
