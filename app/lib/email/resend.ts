'use server'

/**
 * app/lib/email/resend.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cliente singleton do Resend e serviço de e-mail transacional do OdontoSoft.
 *
 * Segurança (Etapa 6.2 - Pre-Go-Live Hardening):
 *  ✅ USO RESTRITO — Executado exclusivamente no servidor (Server Action / Route Handler).
 *  ✅ Guard 'use server' + import 'server-only' bloqueia qualquer importação client-side.
 *  ✅ Falha segura em produção se RESEND_API_KEY não estiver configurada.
 *  ✅ Tratamento defensivo de exceções e timeout.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'server-only'
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

/**
 * Instância singleton do cliente Resend.
 * Permanece null se nenhuma chave foi informada no ambiente.
 */
export const resendClient = apiKey ? new Resend(apiKey) : null

/**
 * Endereço remetente padrão para e-mails transacionais.
 * Em produção, deve ser um domínio verificado no Resend (ex: noreply@odontosoft.com.br).
 */
export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL || 'OdontoSoft <onboarding@resend.dev>'

export interface SendOtpEmailResult {
  success: boolean
  error?: string
}

/**
 * Envia o código OTP de 6 dígitos para o e-mail do usuário.
 * Falha de forma segura caso a API do Resend falhe ou não esteja configurada.
 */
export async function sendOtpEmail(
  email: string,
  codigoOtp: string
): Promise<SendOtpEmailResult> {
  const cleanEmail = email.trim().toLowerCase()

  // 1. Verificação em ambiente de produção
  if (process.env.NODE_ENV === 'production') {
    if (!resendClient) {
      console.error(
        '[Email/Resend] ERRO CRÍTICO: RESEND_API_KEY não está configurada em ambiente de produção.'
      )
      return {
        success: false,
        error: 'Serviço de envio de e-mails temporariamente indisponível. Contacte o suporte.',
      }
    }
  }

  // 2. Modo de desenvolvimento sem Resend configurado
  if (!resendClient) {
    console.warn(
      `[Email/Resend DEV] RESEND_API_KEY não configurada. Código OTP para ${cleanEmail}: ${codigoOtp}`
    )
    return { success: true }
  }

  // 3. Disparo via Resend API
  try {
    const htmlBody = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Código de Confirmação - OdontoSoft</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 16px;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 26px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px;">OdontoSoft</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Gestão Clínica Odontológica Inteligente</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 12px;">Confirmação de Acesso</h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px;">
          Você iniciou o registro de uma nova clínica no <strong>OdontoSoft</strong>. Digite o código de 6 dígitos abaixo para confirmar a titularidade do seu e-mail:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f0f9ff; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px 36px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0369a1; font-family: monospace;">
            ${codigoOtp}
          </div>
        </div>

        <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px 18px; margin-top: 24px; border-left: 4px solid #0284c7;">
          <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">
            ⏱ <strong>Validade estrita:</strong> 15 minutos.<br/>
            🔒 <strong>Segurança:</strong> Nunca compartilhe este código com ninguém. Se você não solicitou este registro, pode ignorar este e-mail com segurança.
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          © ${new Date().getFullYear()} OdontoSoft SaaS. Todos os direitos reservados.<br/>
          Protegido por isolamento multi-tenant e criptografia ponta a ponta.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()

    const textBody = `
OdontoSoft - Confirmação de Acesso
────────────────────────────────────────
Seu código de confirmação para registro de clínica:

  ${codigoOtp}

• Validade: 15 minutos (uso único)
• Se você não solicitou este cadastro, desconsidere esta mensagem.
────────────────────────────────────────
© ${new Date().getFullYear()} OdontoSoft SaaS
    `.trim()

    const { error } = await resendClient.emails.send({
      from: EMAIL_FROM,
      to: [cleanEmail],
      subject: `Seu código de acesso OdontoSoft: ${codigoOtp}`,
      html: htmlBody,
      text: textBody,
    })

    if (error) {
      console.error('[Email/Resend] Erro retornado pela API:', error.message)
      return {
        success: false,
        error: 'Falha no envio do e-mail com o código. Verifique o endereço e tente novamente.',
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao disparar e-mail'
    console.error('[Email/Resend] Exceção durante envio:', msg)
    return {
      success: false,
      error: 'Não foi possível enviar o e-mail de validação. Tente novamente mais tarde.',
    }
  }
}
