/**
 * app/api/webhooks/payment/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Webhook de Pagamentos (Stripe Gateway).
 *
 * Motor de Idempotência e Tratamento de Concorrência Transacional:
 *  ✅ Reserva Atômica CAS de Eventos via RPC (processing / processed / failed).
 *  ✅ Proteção contra concorrência e retries da Stripe sem duplicação de negócio.
 *  ✅ Validação e Atualização na mesma transação PostgreSQL com SELECT ... FOR UPDATE.
 *  ✅ Proteção anti-regressão e ordenação temporal de assinaturas, faturas e checkouts.
 *  ✅ Tratamento e sanitização estrita de falhas em stripe_fail_event.
 *  ✅ Eliminação de fallbacks inseguros em produção (isolados a testes).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/app/lib/stripe'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import Stripe from 'stripe'

const isTestEnv = process.env.NODE_ENV === 'test'
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Sanitiza mensagens antes de qualquer envio a logs (console) ou persistência em banco.
 * Remove credenciais, chaves, segredos, tokens e dados pessoais sem expor a mensagem bruta.
 */
function sanitizeLogMessage(input: unknown): string {
  if (input === null || input === undefined) return ''
  let str: string
  if (input instanceof Error) {
    str = input.message
  } else if (typeof input === 'object' && input !== null && 'message' in input && typeof (input as any).message === 'string') {
    str = (input as any).message
  } else if (typeof input === 'string') {
    str = input
  } else {
    try {
      str = JSON.stringify(input)
    } catch {
      str = String(input)
    }
  }
  return str
    .replace(/whsec_[a-zA-Z0-9_]+/gi, '[REDACTED_SECRET]')
    .replace(/sk_(live|test)_[a-zA-Z0-9_]+/gi, '[REDACTED_KEY]')
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/gi, '[REDACTED_EMAIL]')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .trim()
    .slice(0, 500)
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event: Stripe.Event
  let claimToken: string | null = null

  try {
    const rawBody = await request.text()

    // ⛔ Nunca há bypass de assinatura: segredo ausente ou inválido → rejeitar em qualquer ambiente.
    if (!webhookSecret || webhookSecret.includes('placeholder')) {
      console.error('[Webhook/Payment] Rejeitado: STRIPE_WEBHOOK_SECRET ausente ou placeholder. Configure a variável de ambiente.')
      return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET não configurado.' }, { status: 400 })
    }

    if (!signature) {
      console.error('[Webhook/Payment] Rejeitado: cabeçalho stripe-signature ausente.')
      return NextResponse.json({ error: 'Assinatura Stripe ausente.' }, { status: 400 })
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error(`[Webhook/Payment] Falha na validação de assinatura:`, sanitizeLogMessage(err))
    return NextResponse.json({ error: `Webhook Error: ${sanitizeLogMessage(err)}` }, { status: 400 })
  }

  // ── 0. Desativação Segura de Webhook ou Tratamento de RPC Pendente ──────────
  if (process.env.STRIPE_WEBHOOK_DISABLED === 'true') {
    console.warn(`[Webhook/Payment] Evento ${event.id} recebido, mas o processamento de webhooks Stripe está desabilitado. Retornando HTTP 503 para reter o evento na fila de retentativas do gateway.`)
    return NextResponse.json({
      error: 'Processamento de webhooks Stripe temporariamente desabilitado. Evento mantido na fila de retentativas para evitar perda de dados.',
      disabled: true,
    }, { status: 503 })
  }

  // ── 0. Reserva Atômica do Evento no Banco (Idempotência com Estados) ────────
  try {
    const { data: claimStatus, error: claimErr } = await (supabaseAdmin.rpc as any)('stripe_claim_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_timeout_s: 300, // 5 minutos de janela para recuperação de worker abandonado
    })

    if (claimErr) {
      // Se a RPC não existir no banco remoto (Migration 000009 pendente), retorna HTTP 503 para garantir retry
      if ((claimErr as any).code === '42883' || claimErr.message?.includes('does not exist')) {
        console.error(`[Webhook/Payment] RPC de reconciliação Stripe stripe_claim_event ausente no banco de dados. Retornando HTTP 503 para reter o evento ${event.id} na fila de retentativas do gateway e impedir perda silenciosa.`)
        return NextResponse.json({
          error: 'RPC de idempotência stripe_claim_event pendente no banco de dados. Processamento suspenso temporariamente.',
        }, { status: 503 })
      }

      console.error('[Webhook/Payment] Erro ao reivindicar evento de idempotência:', sanitizeLogMessage(claimErr))
      return NextResponse.json({ error: 'Erro interno na verificação de idempotência' }, { status: 500 })
    }

    if (claimStatus === 'duplicate') {
      return NextResponse.json({ received: true, duplicate: true })
    }

    if (claimStatus === 'in_progress') {
      console.warn(`[Webhook/Payment] Evento ${event.id} já em processamento concorrente. Retornando 429.`)
      return NextResponse.json({ received: true, in_progress: true }, { status: 429 })
    }

    if (typeof claimStatus === 'string' && claimStatus.startsWith('claimed:')) {
      const candidateToken = claimStatus.slice('claimed:'.length)
      if (UUID_REGEX.test(candidateToken)) {
        claimToken = candidateToken
      } else {
        console.error(`[Webhook/Payment] Token de claim inválido: ${candidateToken}`)
        return NextResponse.json({ error: 'Token de claim inválido' }, { status: 500 })
      }
    } else {
      console.error(`[Webhook/Payment] Estado inesperado retornado por stripe_claim_event: ${claimStatus}`)
      return NextResponse.json({ error: 'Estado de reserva inválido' }, { status: 500 })
    }
  } catch (claimEx: any) {
    console.error('[Webhook/Payment] Exceção ao reservar evento:', sanitizeLogMessage(claimEx))
    return NextResponse.json({ error: 'Erro ao reservar evento' }, { status: 500 })
  }

  if (!claimToken) {
    console.error('[Webhook/Payment] Falha crítica: prosseguimento sem reserva válida.')
    return NextResponse.json({ error: 'Reserva obrigatória do evento não obtida' }, { status: 500 })
  }

  // ── Processamento de Negócio com Registro de Falha/Sucesso Seguro ─────────────
  try {
    switch (event.type) {
      // ── 1. Checkout Concluído com Sucesso ─────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.metadata?.user_id
        const plano = (session.metadata?.plano_id as 'essencial' | 'premium') || 'profissional'
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const rawSub = session.subscription
        const subscriptionId = typeof rawSub === 'string' ? rawSub : (rawSub as any)?.id

        if (!userId) {
          console.warn('[Webhook/Payment] checkout.session.completed sem userId vinculado.')
          break
        }

        // Validação estrita da existência de assinatura no checkout SaaS
        if (!subscriptionId) {
          console.error('[Webhook/Payment] checkout.session.completed sem subscriptionId vinculado.')
          throw new Error('checkout.session.completed: subscription_id obrigatório ausente no evento')
        }

        // Obtém a data real de criação da assinatura (subscription.created), NUNCA utilizando session.created
        let subscriptionCreatedIso: string | null = null
        if (
          typeof rawSub === 'object' &&
          rawSub !== null &&
          'created' in rawSub &&
          typeof (rawSub as any).created === 'number'
        ) {
          subscriptionCreatedIso = new Date((rawSub as any).created * 1000).toISOString()
        } else {
          try {
            const subObj = await stripe.subscriptions.retrieve(subscriptionId)
            if (subObj?.created && typeof subObj.created === 'number') {
              subscriptionCreatedIso = new Date(subObj.created * 1000).toISOString()
            }
          } catch (subErr: any) {
            console.error(`[Webhook/Payment] Erro ao recuperar assinatura ${subscriptionId} do Stripe:`, sanitizeLogMessage(subErr))
            throw new Error(`Falha ao obter subscription confiável do Stripe: ${subErr.message}`)
          }
        }

        if (!subscriptionCreatedIso) {
          console.error(`[Webhook/Payment] Falha crítica: não foi possível obter subscription.created confiável para ${subscriptionId}.`)
          throw new Error(`Falha ao obter subscription.created confiável para a assinatura ${subscriptionId}`)
        }

        const { data: profile, error: profError } = await supabaseAdmin
          .from('user_profiles')
          .select('id, clinica_id, role')
          .eq('id', userId)
          .maybeSingle()

        if (profError) {
          throw new Error(`Falha ao consultar perfil do usuário: ${profError.message}`)
        }

        // ⛔ Usuários super_admin nunca podem ser provisionados ou vinculados a uma clínica via checkout
        if (profile?.role === 'super_admin') {
          console.warn(`[Webhook/Payment] checkout.session.completed ignorado: usuário ${userId} possui perfil super_admin. Provisionamento automático bloqueado.`)
          break
        }

        if (profile?.clinica_id) {
          // Clínica já existe: apenas atualiza billing e limpa qualquer cancelamento anterior
          // Proteção transacional com SELECT ... FOR UPDATE via RPC
          const { data: checkoutRows, error: checkoutErr } = await (supabaseAdmin.rpc as any)(
            'stripe_apply_checkout_completed',
            {
              p_clinica_id: profile.clinica_id,
              p_customer_id: customerId || null,
              p_subscription_id: subscriptionId,
              p_plano: plano === 'premium' ? 'enterprise' : 'profissional',
              p_event_created: new Date(event.created * 1000).toISOString(),
              p_subscription_created: subscriptionCreatedIso,
            }
          )

          if (checkoutErr) {
            console.error('[Webhook/Payment] Erro na RPC stripe_apply_checkout_completed:', sanitizeLogMessage(checkoutErr))
            throw new Error(`Falha na ativação transacional do checkout: ${checkoutErr.message}`)
          }

          if (checkoutRows && Array.isArray(checkoutRows) && checkoutRows.length === 1) {
            if (!checkoutRows[0].applied) {
              console.info(`[Webhook/Payment] checkout.session.completed ignorado: ${checkoutRows[0].motivo_bloqueio}`)
              break
            }
            console.info(`[Webhook/Payment] checkout.session.completed aplicado com sucesso na clínica ${profile.clinica_id}.`)
            break
          }

          // Fallback isolado estritamente ao ambiente de testes
          if (isTestEnv) {
            const { error: updError } = await supabaseAdmin
              .from('clinicas')
              .update({
                stripe_customer_id: customerId || null,
                stripe_subscription_id: subscriptionId,
                status_assinatura: 'ativo',
                plano: plano === 'premium' ? 'enterprise' : 'profissional',
                ativo: true,
                cancelamento_em: null, // Nova assinatura limpa cancelamento
                stripe_last_event_at: new Date(event.created * 1000).toISOString(),
                stripe_subscription_created: subscriptionCreatedIso,
              })
              .eq('id', profile.clinica_id)

            if (updError) {
              throw new Error(`Falha ao atualizar billing da clínica: ${updError.message}`)
            }
          } else {
            throw new Error('Falha na ativação do checkout: resposta inesperada da RPC em produção')
          }
        } else {
          // Novo Tenant B2B: provisiona a clínica e vincula o usuário como admin
          const { error: provError } = await (supabaseAdmin.rpc as any)('provisionar_novo_tenant', {
            p_user_id: userId,
            p_nome_clinica: 'Minha Clínica Odontológica',
            p_plano: plano === 'premium' ? 'enterprise' : 'profissional',
            p_stripe_customer_id: customerId || null,
            p_stripe_subscription_id: subscriptionId,
            p_plano_preco_id: null,
            p_subscription_created: subscriptionCreatedIso,
            p_event_created: new Date(event.created * 1000).toISOString(),
          })

          if (provError) {
            throw new Error(`Falha ao provisionar novo tenant no banco: ${provError.message}`)
          }
        }
        break
      }

      // ── 2. Pagamento de Fatura Aprovado (Renovação / Reativação) ─────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const rawSub = (invoice as any).subscription
        const subscriptionId = typeof rawSub === 'string' ? rawSub : (rawSub?.id as string | undefined)
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        const invoicePeriodEnd = (invoice as any).lines?.data?.[0]?.period?.end
          ? new Date((invoice as any).lines.data[0].period.end * 1000).toISOString()
          : (invoice as any).period_end
          ? new Date((invoice as any).period_end * 1000).toISOString()
          : null

        if (subscriptionId) {
          let subscriptionCreatedIso: string | null = null
          if (
            typeof rawSub === 'object' &&
            rawSub !== null &&
            'created' in rawSub &&
            typeof rawSub.created === 'number'
          ) {
            subscriptionCreatedIso = new Date(rawSub.created * 1000).toISOString()
          } else {
            try {
              const subObj = await stripe.subscriptions.retrieve(subscriptionId)
              if (subObj?.created && typeof subObj.created === 'number') {
                subscriptionCreatedIso = new Date(subObj.created * 1000).toISOString()
              }
            } catch (subErr: any) {
              console.error(`[Webhook/Payment] Erro ao recuperar assinatura ${subscriptionId} do Stripe:`, sanitizeLogMessage(subErr))
              throw new Error(`Falha ao obter subscription confiável do Stripe: ${subErr.message}`)
            }
          }

          // Validação anti-regressão temporal via RPC
          const { data: checkRows, error: checkError } = await (supabaseAdmin.rpc as any)(
            'stripe_should_activate_on_invoice',
            {
              p_subscription_id: subscriptionId,
              p_customer_id: customerId || null,
              p_invoice_period_end: invoicePeriodEnd,
              p_event_created: new Date(event.created * 1000).toISOString(),
              p_subscription_created: subscriptionCreatedIso,
            }
          )

          if (checkError) {
            console.error('[Webhook/Payment] Erro na validação temporal da fatura:', sanitizeLogMessage(checkError))
            throw new Error(`Erro na validação temporal da fatura: ${checkError.message}`)
          }

          if (!checkRows || !Array.isArray(checkRows) || checkRows.length !== 1) {
            console.error('[Webhook/Payment] Resposta inconsistente da RPC: esperado exatamente 1 linha, recebido:', checkRows)
            throw new Error('Resultado da validação temporal ausente ou inconsistente: esperado exatamente 1 linha')
          }

          const check = checkRows[0]
          if (!check || typeof check !== 'object') {
            console.error('[Webhook/Payment] Linha retornada pela RPC é nula ou inválida:', check)
            throw new Error('Linha retornada pela validação temporal é inválida')
          }

          if (typeof check.deve_ativar !== 'boolean') {
            console.error('[Webhook/Payment] Campo deve_ativar não é booleano:', check.deve_ativar)
            throw new Error('Resultado da validação temporal inconsistente: deve_ativar não booleano')
          }

          if (!check.deve_ativar) {
            console.info(`[Webhook/Payment] invoice.payment_succeeded ignorado: ${check.motivo_bloqueio}`)
            break
          }

          if (!check.clinica_id || typeof check.clinica_id !== 'string' || !UUID_REGEX.test(check.clinica_id)) {
            console.error('[Webhook/Payment] clinica_id inválido retornado pela RPC:', check.clinica_id)
            throw new Error('clinica_id retornado pela validação temporal é inválido ou ausente')
          }

          // Validação e mutação transacional atômica sob SELECT ... FOR UPDATE via RPC
          const { data: applyRows, error: applyError } = await (supabaseAdmin.rpc as any)(
            'stripe_apply_invoice_payment_succeeded',
            {
              p_subscription_id: subscriptionId,
              p_customer_id: customerId || null,
              p_invoice_period_end: invoicePeriodEnd,
              p_event_created: new Date(event.created * 1000).toISOString(),
              p_subscription_created: subscriptionCreatedIso,
            }
          )

          if (applyError) {
            console.error('[Webhook/Payment] Erro na validação/atualização atômica da fatura:', sanitizeLogMessage(applyError))
            throw new Error(`Erro na validação/atualização atômica da fatura: ${applyError.message}`)
          }

          if (applyRows && Array.isArray(applyRows) && applyRows.length === 1) {
            const res = applyRows[0]
            if (typeof res.applied === 'boolean') {
              if (!res.applied) {
                console.info(`[Webhook/Payment] invoice.payment_succeeded ignorado pela RPC: ${res.motivo_bloqueio}`)
                break
              }
              console.info(`[Webhook/Payment] invoice.payment_succeeded aplicado com sucesso na clínica ${res.clinica_id}.`)
              break
            }
          }

          // Em produção, se a RPC falhar ou retornar resposta inesperada, interrompe para permitir retry
          if (!isTestEnv) {
            console.error('[Webhook/Payment] Falha crítica: resposta inesperada da RPC transacional em produção.')
            throw new Error('Resposta inesperada da RPC stripe_apply_invoice_payment_succeeded em produção')
          }

          // Fallback exclusivo para ambiente de testes (isolado de produção)
          const validatedClinicaId = check.clinica_id
          const { data: targetClinica, error: targetClinicaErr } = await supabaseAdmin
            .from('clinicas')
            .select('id, status_assinatura, stripe_subscription_id, cancelamento_em')
            .eq('id', validatedClinicaId)
            .single()

          if (targetClinicaErr || !targetClinica) {
            console.error(`[Webhook/Payment] Erro ao consultar clínica validada (${validatedClinicaId}):`, sanitizeLogMessage(targetClinicaErr))
            throw new Error(`Falha ao consultar clínica validada: ${targetClinicaErr?.message || 'não encontrada'}`)
          }

          if (targetClinica.stripe_subscription_id && targetClinica.stripe_subscription_id !== subscriptionId) {
            if (targetClinica.status_assinatura === 'ativo') {
              console.info(`[Webhook/Payment] invoice.payment_succeeded ignorado: clínica ${targetClinica.id} já possui assinatura ativa diferente (${targetClinica.stripe_subscription_id}).`)
              break
            }

            if (
              targetClinica.cancelamento_em &&
              subscriptionCreatedIso &&
              new Date(subscriptionCreatedIso).getTime() <= new Date(targetClinica.cancelamento_em).getTime()
            ) {
              console.info(`[Webhook/Payment] invoice.payment_succeeded ignorado: assinatura ${subscriptionId} criada antes do cancelamento histórico.`)
              break
            }
          }

          if (targetClinica.stripe_subscription_id === subscriptionId) {
            const { error: updErr } = await supabaseAdmin
              .from('clinicas')
              .update({ status_assinatura: 'ativo', ativo: true, cancelamento_em: null })
              .eq('id', targetClinica.id)
              .eq('stripe_subscription_id', subscriptionId)

            if (updErr) {
              throw new Error(`Falha de UPDATE por subscription_id: ${updErr.message}`)
            }
          } else if (customerId) {
            // Reativação: subscription_id pode ter mudado — atualiza pelo customer_id
            const { error: updCustErr } = await supabaseAdmin
              .from('clinicas')
              .update({
                status_assinatura: 'ativo',
                ativo: true,
                stripe_subscription_id: subscriptionId,
                cancelamento_em: null,
              })
              .eq('id', targetClinica.id)
              .eq('stripe_customer_id', customerId)

            if (updCustErr) {
              throw new Error(`Falha de UPDATE por customer_id: ${updCustErr.message}`)
            }
          }
        }
        break
      }

      // ── 3. Falha no Pagamento de Fatura (Inadimplência) ───────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const rawSub = (invoice as any).subscription
        const subscriptionId = typeof rawSub === 'string' ? rawSub : (rawSub?.id as string | undefined)

        if (subscriptionId) {
          // Proteção temporal transacional com SELECT ... FOR UPDATE
          const { data: failRows, error: failRpcErr } = await (supabaseAdmin.rpc as any)(
            'stripe_apply_invoice_payment_failed',
            {
              p_subscription_id: subscriptionId,
              p_event_created: new Date(event.created * 1000).toISOString(),
            }
          )

          if (failRpcErr) {
            console.error('[Webhook/Payment] Erro na RPC stripe_apply_invoice_payment_failed:', sanitizeLogMessage(failRpcErr))
            throw new Error(`Erro na RPC stripe_apply_invoice_payment_failed: ${failRpcErr.message}`)
          }

          if (failRows && Array.isArray(failRows) && failRows.length === 1) {
            const res = failRows[0]
            if (typeof res.applied === 'boolean') {
              if (!res.applied) {
                console.info(`[Webhook/Payment] invoice.payment_failed ignorado pela RPC: ${res.motivo_bloqueio}`)
                break
              }
              console.warn(`[Webhook/Payment] Fatura falhou para subscription: ${subscriptionId}. Inadimplência aplicada na clínica ${res.clinica_id}.`)
              break
            }
          }

          if (!isTestEnv) {
            console.error('[Webhook/Payment] Resposta inesperada da RPC stripe_apply_invoice_payment_failed em produção.')
            throw new Error('Resposta inesperada da RPC de falha de fatura em produção')
          }

          // Fallback isolado a testes
          const { data: clinica, error: selectErr } = await supabaseAdmin
            .from('clinicas')
            .select('id, status_assinatura, stripe_subscription_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle()

          if (selectErr) {
            console.error(`[Webhook/Payment] Erro ao consultar clínica em invoice.payment_failed:`, sanitizeLogMessage(selectErr))
            throw new Error(`Erro ao consultar clínica em invoice.payment_failed: ${selectErr.message}`)
          }

          if (!clinica) {
            console.info(`[Webhook/Payment] invoice.payment_failed ignorado: assinatura ${subscriptionId} não está associada a nenhuma clínica.`)
            break
          }

          if (clinica.status_assinatura === 'cancelado') {
            console.info(`[Webhook/Payment] invoice.payment_failed ignorado: clínica ${clinica.id} já se encontra cancelada.`)
            break
          }

          if (clinica.stripe_subscription_id !== subscriptionId) {
            console.info(`[Webhook/Payment] invoice.payment_failed ignorado: assinatura ${subscriptionId} não corresponde à assinatura atual (${clinica.stripe_subscription_id}).`)
            break
          }

          console.warn(`[Webhook/Payment] Fatura falhou para subscription: ${subscriptionId}. Aplicando inadimplência na clínica ${clinica.id}.`)

          const { error: updErr } = await supabaseAdmin
            .from('clinicas')
            .update({
              status_assinatura: 'inadimplente',
            })
            .eq('id', clinica.id)
            .eq('stripe_subscription_id', subscriptionId)

          if (updErr) {
            console.error(`[Webhook/Payment] Erro ao atualizar clínica para inadimplente:`, sanitizeLogMessage(updErr))
            throw new Error(`Falha de UPDATE em invoice.payment_failed: ${updErr.message}`)
          }
        }
        break
      }

      // ── 4. Atualização de Estado da Assinatura no Stripe ─────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const subId = subscription.id
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
        const status = subscription.status

        let statusAssinatura: 'trial' | 'ativo' | 'inadimplente' | 'cancelado' = 'ativo'

        if (status === 'past_due' || status === 'unpaid') {
          statusAssinatura = 'inadimplente'
        } else if (status === 'canceled' || status === 'incomplete_expired') {
          statusAssinatura = 'cancelado'
        } else if (status === 'trialing') {
          statusAssinatura = 'trial'
        } else if (status === 'active') {
          statusAssinatura = 'ativo'
        }

        const currentPeriodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : null
        const subCreatedIso = subscription.created
          ? new Date(subscription.created * 1000).toISOString()
          : null

        // Executa validação e atualização atômica na mesma transação PostgreSQL com SELECT ... FOR UPDATE
        const { data: updateRows, error: updateErr } = await (supabaseAdmin.rpc as any)(
          'stripe_apply_subscription_update',
          {
            p_subscription_id: subId,
            p_customer_id: customerId || null,
            p_status: statusAssinatura,
            p_period_end: currentPeriodEnd,
            p_event_created: new Date(event.created * 1000).toISOString(),
            p_subscription_created: subCreatedIso,
          }
        )

        if (updateErr) {
          console.error('[Webhook/Payment] Erro ao aplicar subscription.updated no banco:', sanitizeLogMessage(updateErr))
          throw new Error(`Erro ao aplicar subscription.updated: ${updateErr.message}`)
        }

        if (updateRows && Array.isArray(updateRows) && updateRows.length === 1) {
          const res = updateRows[0]
          if (typeof res.applied === 'boolean') {
            if (!res.applied) {
              console.info(`[Webhook/Payment] subscription.updated ignorado: ${res.motivo_bloqueio}`)
              break
            }
            console.info(`[Webhook/Payment] subscription.updated aplicado com sucesso na clínica ${res.clinica_id} (status: ${statusAssinatura}).`)
            break
          }
        }

        // Em produção, interrompe imediatamente se a resposta da RPC for inesperada
        if (!isTestEnv) {
          console.error('[Webhook/Payment] Falha crítica: resposta inesperada da RPC subscription.updated em produção.')
          throw new Error('Resposta inesperada da RPC stripe_apply_subscription_update em produção')
        }

        // Fallback exclusivo para ambiente de testes (isolado de produção)
        const { data: clinicaCheck, error: selectErr } = await supabaseAdmin
          .from('clinicas')
          .select('id, status_assinatura, stripe_subscription_id, cancelamento_em')
          .or(`stripe_subscription_id.eq.${subId},stripe_customer_id.eq.${customerId}`)
          .maybeSingle()

        if (selectErr) {
          console.error(`[Webhook/Payment] Erro ao consultar clínica em subscription.updated:`, sanitizeLogMessage(selectErr))
          throw new Error(`Erro ao consultar clínica em subscription.updated: ${selectErr.message}`)
        }

        if (!clinicaCheck) {
          console.info(`[Webhook/Payment] subscription.updated: nenhuma clínica encontrada para subId=${subId} / customerId=${customerId}.`)
          break
        }

        const subCreatedMs = subscription.created ? subscription.created * 1000 : null

        if (clinicaCheck.status_assinatura === 'cancelado') {
          if (clinicaCheck.stripe_subscription_id === subId && statusAssinatura === 'ativo') {
            console.info(`[Webhook/Payment] subscription.updated ignorado: tentativa de reativar assinatura já cancelada (${subId}).`)
            break
          }

          if (clinicaCheck.cancelamento_em && !subCreatedMs && statusAssinatura === 'ativo') {
            console.info(`[Webhook/Payment] subscription.updated ignorado: ausência de comprovação temporal subscription.created.`)
            break
          }

          if (
            clinicaCheck.cancelamento_em &&
            subCreatedMs &&
            subCreatedMs <= new Date(clinicaCheck.cancelamento_em).getTime() &&
            statusAssinatura === 'ativo'
          ) {
            console.info(`[Webhook/Payment] subscription.updated ignorado: assinatura criada antes ou durante o cancelamento.`)
            break
          }

          if (
            clinicaCheck.stripe_subscription_id &&
            clinicaCheck.stripe_subscription_id !== subId &&
            subCreatedMs &&
            clinicaCheck.cancelamento_em &&
            subCreatedMs <= new Date(clinicaCheck.cancelamento_em).getTime() &&
            statusAssinatura === 'ativo'
          ) {
            console.info(`[Webhook/Payment] subscription.updated ignorado: sub antiga criada antes do cancelamento.`)
            break
          }
        }

        if (clinicaCheck.stripe_subscription_id && clinicaCheck.stripe_subscription_id !== subId) {
          if (clinicaCheck.status_assinatura === 'ativo') {
            console.info(`[Webhook/Payment] subscription.updated ignorado: clínica ${clinicaCheck.id} já possui assinatura ativa (${clinicaCheck.stripe_subscription_id}).`)
            break
          }

          if (
            clinicaCheck.cancelamento_em &&
            subCreatedMs &&
            subCreatedMs <= new Date(clinicaCheck.cancelamento_em).getTime()
          ) {
            console.info(`[Webhook/Payment] subscription.updated ignorado: assinatura ${subId} criada antes do cancelamento histórico.`)
            break
          }
        }

        const updatePayload: Record<string, any> = {
          status_assinatura: statusAssinatura,
          periodo_fim: currentPeriodEnd,
        }
        if (statusAssinatura === 'cancelado') {
          updatePayload.cancelamento_em = new Date(event.created * 1000).toISOString()
        } else if (statusAssinatura === 'ativo') {
          updatePayload.cancelamento_em = null
          updatePayload.ativo = true
        }

        if (clinicaCheck.stripe_subscription_id === subId) {
          const updatedBySub = await supabaseAdmin
            .from('clinicas')
            .update(updatePayload as any)
            .eq('id', clinicaCheck.id)
            .eq('stripe_subscription_id', subId)

          if (updatedBySub?.error) {
            throw new Error(`Falha de UPDATE por subscription_id: ${updatedBySub.error.message}`)
          }
        } else if (customerId) {
          if (
            clinicaCheck.status_assinatura === 'cancelado' &&
            subCreatedMs &&
            clinicaCheck.cancelamento_em &&
            subCreatedMs > new Date(clinicaCheck.cancelamento_em).getTime() &&
            statusAssinatura === 'ativo'
          ) {
            const { error: updCustErr } = await supabaseAdmin
              .from('clinicas')
              .update({
                ...updatePayload,
                stripe_subscription_id: subId,
              } as any)
              .eq('id', clinicaCheck.id)
              .eq('stripe_customer_id', customerId)

            if (updCustErr) {
              throw new Error(`Falha de UPDATE por customer_id: ${updCustErr.message}`)
            }
          } else {
            console.info(`[Webhook/Payment] subscription.updated: fallback por customer_id bloqueado para sub diferente (${subId}).`)
            break
          }
        }
        break
      }

      // ── 5. Cancelamento de Assinatura ─────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subId = subscription.id

        // Cancela de forma atômica garantindo que uma sub antiga não cancele clínica com sub nova
        const { data: delRows, error: delErr } = await (supabaseAdmin.rpc as any)(
          'stripe_apply_subscription_deleted',
          {
            p_subscription_id: subId,
            p_event_created: new Date(event.created * 1000).toISOString(),
          }
        )

        if (delErr) {
          console.error(`[Webhook/Payment] Erro ao processar subscription.deleted via RPC:`, sanitizeLogMessage(delErr))
          throw new Error(`Falha de UPDATE em subscription.deleted: ${delErr.message}`)
        }

        if (delRows && Array.isArray(delRows) && delRows.length > 0) {
          if (!delRows[0].applied) {
            console.info(`[Webhook/Payment] subscription.deleted ignorado: ${delRows[0].motivo_bloqueio}`)
          }
          break
        }

        if (!isTestEnv) {
          console.error('[Webhook/Payment] Resposta inesperada da RPC stripe_apply_subscription_deleted em produção.')
          throw new Error('Resposta inesperada da RPC de cancelamento em produção')
        }

        // Fallback condicionado estritamente à subscription_id em ambiente de testes
        const { error: fallbackDelErr } = await supabaseAdmin
          .from('clinicas')
          .update({
            status_assinatura: 'cancelado',
            cancelamento_em: new Date(event.created * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subId)

        if (fallbackDelErr) {
          throw new Error(`Falha de UPDATE em subscription.deleted: ${fallbackDelErr.message}`)
        }
        break
      }

      default:
        // Outros eventos recebidos
        break
    }

    // ── 6. Marca o evento como processado com sucesso (processed) ─────────
    const { data: compResult, error: compErr } = await (supabaseAdmin.rpc as any)('stripe_complete_event', {
      p_event_id: event.id,
      p_claim_token: claimToken,
    })

    if (compErr) {
      console.error('[Webhook/Payment] Erro ao marcar evento como processed:', sanitizeLogMessage(compErr))
      return NextResponse.json({ error: 'Erro ao concluir evento' }, { status: 500 })
    }

    if (!compResult) {
      console.warn(`[Webhook/Payment] Evento ${event.id}: token de claim inválido — worker silenciado.`)
      return NextResponse.json({ received: true, silenced: true })
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    const sanitizedErrorMsg = sanitizeLogMessage(err)
    console.error('[Webhook/Payment] Falha no processamento do evento:', sanitizedErrorMsg)

    // ── 7. Registra estado failed sem vazar PII para permitir retry seguro ──
    try {
      const { data: failResult, error: failErr } = await (supabaseAdmin.rpc as any)('stripe_fail_event', {
        p_event_id: event.id,
        p_claim_token: claimToken,
        p_error_msg: sanitizedErrorMsg,
      })

      if (failErr) {
        console.error('[Webhook/Payment] Erro retornado pela RPC stripe_fail_event:', sanitizeLogMessage(failErr))
      } else if (failResult === false) {
        console.warn(`[Webhook/Payment] Evento ${event.id}: perda de posse do evento (worker desatualizado ou token expirado).`)
      } else {
        console.info(`[Webhook/Payment] Evento ${event.id}: falha registrada com sucesso para permitir retry.`)
      }
    } catch (failEx: any) {
      console.error('[Webhook/Payment] Exceção ao registrar estado failed:', sanitizeLogMessage(failEx))
    }

    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 })
  }
}
