'use server'

/**
 * app/actions/validation-code.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Validação de Novo Utilizador via Código de Acesso OTP (Pilar 2).
 *
 * Segurança (Etapa 6.2 - Pre-Go-Live Hardening):
 *  ✅ Código numérico de 6 dígitos gerado com crypto.randomInt (CSPRNG).
 *  ✅ Armazenamento em hash HMAC-SHA256 (colunas code e code_hash) — nunca texto puro.
 *  ✅ Cooldown de 60 segundos por e-mail contra envio abusivo (anti-flood/DoS).
 *  ✅ Validade estrita de 15 minutos por código.
 *  ✅ Limite máximo de 5 tentativas por código para prevenção de força bruta.
 *  ✅ Consumo atômico de uso único (used = true) via CAS com proteção anti-concorrência.
 *  ✅ Integração com serviço transacional Resend para envio real de e-mails.
 *  ✅ Falha segura em caso de indisponibilidade de banco ou do serviço de e-mail.
 *  ✅ Proibição total de código demonstrativo em ambiente de produção.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabaseAdmin } from '@/app/lib/supabase/admin'
import { sendOtpEmail } from '@/app/lib/email/resend'
import crypto from 'crypto'

export interface EnviarCodigoResult {
  success: boolean
  error?: string
}

export interface VerificarCodigoResult {
  success: boolean
  error?: string
}

/**
 * Gera o hash criptográfico seguro do código OTP associado ao e-mail.
 * Utiliza HMAC-SHA256 com segredo interno (pepper) para mitigar rainbow tables.
 * Função interna server-side (não exportada como Server Action).
 */
function hashOtp(email: string, code: string): string {
  const pepper = process.env.OTP_SECRET
  if (!pepper) {
    throw new Error('[SECURITY FATAL] Variável OTP_SECRET obrigatória não configurada no ambiente.')
  }

  return crypto
    .createHmac('sha256', pepper)
    .update(`${email.trim().toLowerCase()}:${code.trim()}`)
    .digest('hex')
}

/**
 * Comparação em tempo constante para evitar ataques de temporização (timing attacks).
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * Gera, armazena com hash e envia o código de confirmação de 6 dígitos para o e-mail do usuário.
 */
export async function enviarCodigoValidacao(email: string): Promise<EnviarCodigoResult> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'E-mail inválido para validação.' }
  }

  try {
    // 1. Proteção contra envio abusivo (Cooldown de 60 segundos por e-mail)
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recentCodes, error: cooldownError } = await supabaseAdmin
      .from('user_verification_codes')
      .select('id, created_at')
      .eq('email', cleanEmail)
      .gt('created_at', sixtySecondsAgo)
      .limit(1)

    if (cooldownError) {
      console.error('[enviarCodigoValidacao] Erro ao consultar cooldown:', cooldownError.message)
      return {
        success: false,
        error: 'Falha temporária ao verificar solicitações anteriores. Tente novamente.',
      }
    }

    if (recentCodes && recentCodes.length > 0) {
      return {
        success: false,
        error: 'Aguarde 60 segundos antes de solicitar um novo código de confirmação.',
      }
    }

    // 2. Gera código seguro de 6 dígitos (100000 a 999999) via CSPRNG
    const codigo = crypto.randomInt(100000, 1000000).toString()
    const codigoHash = hashOtp(cleanEmail, codigo)

    // 3. Invalida códigos anteriores não utilizados deste e-mail
    await supabaseAdmin
      .from('user_verification_codes')
      .update({ used: true })
      .eq('email', cleanEmail)
      .eq('used', false)

    // 4. Insere o novo código HASHEADO no banco com validade estrita de 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { data: insertedRecord, error: insertError } = await supabaseAdmin
      .from('user_verification_codes')
      .insert({
        email: cleanEmail,
        code: codigoHash, // Salvo exclusivamente como hash HMAC-SHA256
        expires_at: expiresAt,
        used: false,
        attempts: 0,
      })
      .select('id')
      .single()

    if (insertError || !insertedRecord) {
      console.error(
        '[enviarCodigoValidacao] Erro ao salvar código no Supabase:',
        insertError?.message
      )
      return {
        success: false,
        error: 'Falha temporária ao registrar código de validação. Tente novamente mais tarde.',
      }
    }

    // 5. Envio real via serviço de e-mail transacional (Resend)
    const emailResult = await sendOtpEmail(cleanEmail, codigo)

    if (!emailResult.success) {
      // Falha segura: se o e-mail não foi entregue, invalida imediatamente o código criado
      await supabaseAdmin
        .from('user_verification_codes')
        .update({ used: true })
        .eq('id', insertedRecord.id)

      return {
        success: false,
        error: emailResult.error || 'Falha ao entregar código por e-mail. Tente novamente.',
      }
    }

    // 6. Confirmação segura ao cliente: O código OTP NUNCA é retornado ao navegador
    // sob nenhuma circunstância ou ambiente. O usuário deve obtê-lo exclusivamente em sua caixa de e-mail.
    return {
      success: true,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao processar código de acesso'
    console.error('[enviarCodigoValidacao] Exceção:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Valida o código digitado pelo usuário (verificação prévia de interface).
 */
export async function verificarCodigoValidacao(
  email: string,
  codigoDigitado: string
): Promise<VerificarCodigoResult> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanCode = codigoDigitado.trim()

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, error: 'O código deve conter exatamente 6 dígitos numéricos.' }
  }

  try {
    // 1. Busca o código ativo mais recente para este e-mail
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('user_verification_codes')
      .select('id, code, expires_at, used, attempts')
      .eq('email', cleanEmail)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)

    // 2. Falhas de banco ou ausência de registros resultam estritamente em erro
    if (fetchError) {
      console.error('[verificarCodigoValidacao] Erro ao consultar banco:', fetchError.message)
      return { success: false, error: 'Erro de comunicação ao validar código. Tente novamente.' }
    }

    if (!records || records.length === 0) {
      return {
        success: false,
        error: 'Nenhum código ativo encontrado para este e-mail. Solicite um novo código.',
      }
    }

    const record = records[0]

    // 3. Reserva atômica da tentativa no PostgreSQL ANTES de qualquer comparação
    // Incrementa attempts de forma condicional (attempts < 5 RETURNING).
    // Se o limite de 5 já foi atingido, ou o código expirou/foi consumido, nenhuma linha é retornada.
    const { data: reservedData, error: reserveError } = await (supabaseAdmin.rpc as any)(
      'reservar_tentativa_otp',
      { p_code_id: record.id }
    )

    const reservedRow = Array.isArray(reservedData) ? reservedData[0] : reservedData

    if (reserveError || !reservedRow) {
      return {
        success: false,
        error: 'Número máximo de tentativas excedido ou código expirado. Solicite um novo código.',
      }
    }

    // 4. Apenas requisições que reservaram a tentativa com sucesso chegam a comparar o hash
    const expectedHash = hashOtp(cleanEmail, cleanCode)
    const matchHash = safeCompare(reservedRow.code, expectedHash)
    const matchLegacy = safeCompare(reservedRow.code, cleanCode)
    const isCodeValid = matchHash || matchLegacy

    if (!isCodeValid) {
      if (reservedRow.attempts >= 5) {
        await supabaseAdmin
          .from('user_verification_codes')
          .update({ used: true })
          .eq('id', reservedRow.id)
      }

      return {
        success: false,
        error:
          reservedRow.attempts >= 5
            ? 'Número máximo de tentativas excedido. Solicite um novo código.'
            : 'Código de confirmação incorreto. Tente novamente.',
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao verificar código'
    console.error('[verificarCodigoValidacao] Exceção:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Valida E CONSOME o código OTP atomicamente no servidor.
 * Chamado obrigatoriamente por Server Actions de privilégio (ex: registrarNovaClinica)
 * para assegurar que o cadastro é impossível sem um código OTP válido e não reutilizável.
 */
export async function validarEConsumirCodigoOtp(
  email: string,
  codigoDigitado: string
): Promise<VerificarCodigoResult> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanCode = codigoDigitado.trim()

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      error: 'O código de validação OTP deve conter exatamente 6 dígitos numéricos.',
    }
  }

  try {
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('user_verification_codes')
      .select('id, code, expires_at, used, attempts')
      .eq('email', cleanEmail)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('[validarEConsumirCodigoOtp] Erro ao consultar banco:', fetchError.message)
      return { success: false, error: 'Erro de comunicação ao validar código OTP no servidor.' }
    }

    if (!records || records.length === 0) {
      return {
        success: false,
        error: 'Nenhum código OTP ativo encontrado para este e-mail. Solicite um novo código.',
      }
    }

    const record = records[0]

    // 1. Reserva atômica da tentativa no PostgreSQL ANTES de qualquer comparação
    // Incrementa attempts de forma condicional (attempts < 5 RETURNING).
    // Se o limite de 5 já foi atingido, ou o código expirou/foi consumido, nenhuma linha é retornada.
    const { data: reservedData, error: reserveError } = await (supabaseAdmin.rpc as any)(
      'reservar_tentativa_otp',
      { p_code_id: record.id }
    )

    const reservedRow = Array.isArray(reservedData) ? reservedData[0] : reservedData

    if (reserveError || !reservedRow) {
      return {
        success: false,
        error: 'Número máximo de tentativas excedido para este código OTP ou código expirado.',
      }
    }

    // 2. Apenas requisições que reservaram a tentativa com sucesso chegam a comparar o hash
    const expectedHash = hashOtp(cleanEmail, cleanCode)
    const matchHash = safeCompare(reservedRow.code, expectedHash)
    const matchLegacy = safeCompare(reservedRow.code, cleanCode)
    const isCodeValid = matchHash || matchLegacy

    if (!isCodeValid) {
      if (reservedRow.attempts >= 5) {
        await supabaseAdmin
          .from('user_verification_codes')
          .update({ used: true })
          .eq('id', reservedRow.id)
      }

      return {
        success: false,
        error:
          reservedRow.attempts >= 5
            ? 'Número máximo de tentativas excedido para este código OTP.'
            : 'Código de confirmação OTP incorreto.',
      }
    }

    // 3. Sucesso: Consumo ATÔMICO do código com proteção contra condição de corrida (CAS)
    // Apenas marca used=true se used ainda for false no exato instante do update
    const { data: consumedRows, error: updateError } = await supabaseAdmin
      .from('user_verification_codes')
      .update({ used: true })
      .eq('id', reservedRow.id)
      .eq('used', false)
      .select('id')

    if (updateError) {
      console.error(
        '[validarEConsumirCodigoOtp] Falha ao marcar código como consumido:',
        updateError.message
      )
      return { success: false, error: 'Falha ao registrar uso do código OTP.' }
    }

    if (!consumedRows || consumedRows.length === 0) {
      // Outra requisição simultânea já consumiu este mesmo código no milissegundo anterior
      return {
        success: false,
        error: 'Este código OTP já foi utilizado ou está sendo processado por outra requisição.',
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado na validação do código OTP'
    console.error('[validarEConsumirCodigoOtp] Exceção:', msg)
    return { success: false, error: msg }
  }
}
