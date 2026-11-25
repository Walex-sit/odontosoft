/**
 * Helpers de ambiente seguros para uso em Client e Server Components.
 * Em produção (`NODE_ENV === 'production'` sem staging/preview), flags de demo ficam desligadas.
 */
export const IS_NON_PRODUCTION_ENV =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'

export const SHOW_CANCELLATION_POLICY =
  process.env.NEXT_PUBLIC_SHOW_CANCELLATION_POLICY === 'true'
