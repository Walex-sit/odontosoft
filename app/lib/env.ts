/**
 * Helpers de ambiente seguros para uso em Client e Server Components.
 *
 * ⚠️  AVISO DE SEGURANÇA:
 *  `IS_NON_PRODUCTION_ENV` destina-se EXCLUSIVAMENTE a indicadores visuais
 *  não sensíveis (ex.: selo de demonstração na landing page).
 *  NUNCA utilize variáveis `NEXT_PUBLIC_*` para autorização, autenticação
 *  ou bypass de controles de segurança.
 */
export const IS_NON_PRODUCTION_ENV =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'

export const SHOW_CANCELLATION_POLICY =
  process.env.NEXT_PUBLIC_SHOW_CANCELLATION_POLICY === 'true'

/**
 * Retorna a URL base pública da aplicação (`NEXT_PUBLIC_APP_URL`).
 *
 * - Em produção (`NODE_ENV === 'production'`), exige configuração explícita e válida
 *   (http:// ou https://), falhando de forma clara sem fallback para localhost.
 * - Em desenvolvimento/testes, permite fallback para `http://localhost:3000` se ausente.
 */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[Configuração] Variável NEXT_PUBLIC_APP_URL obrigatória não configurada em ambiente de produção.'
      )
    }
    return 'http://localhost:3000'
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(
      `[Configuração] Variável NEXT_PUBLIC_APP_URL possui formato inválido: "${raw}".`
    )
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      '[Configuração] Variável NEXT_PUBLIC_APP_URL deve iniciar com http:// ou https://.'
    )
  }

  return raw.replace(/\/+$/, '')
}
