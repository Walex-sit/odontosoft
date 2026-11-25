/**
 * app/lib/brand.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Identidade centralizada da marca OdontoSoft:
 *  - Geometria única do logo SVG (usada em UI, favicon e e-mails)
 *  - Dados institucionais/LGPD lidos exclusivamente de variáveis de ambiente
 *  - URLs de redes sociais lidas exclusivamente de variáveis de ambiente
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const BRAND_NAME = 'OdontoSoft'
export const BRAND_SVG_VIEWBOX = '0 0 24 24'
export const BRAND_TOOTH_PATH =
  'M12 2C8.5 2 5 5.5 5 9c0 3 2 5.5 4 7l1 5h4l1-5c2-1.5 4-4 4-7 0-3.5-3.5-7-7-7z'
export const BRAND_CROSS_PATH = 'M9 9h6M12 6v6'

function sanitizeEnvText(raw?: string): string {
  const val = raw?.trim() || ''
  if (!val || val.toLowerCase() === 'undefined' || val.toLowerCase() === 'null') {
    return ''
  }
  return val
}

export const BRAND_LEGAL_CONFIG = {
  razaoSocial: sanitizeEnvText(process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME),
  cnpj: sanitizeEnvText(process.env.NEXT_PUBLIC_COMPANY_CNPJ),
  contatoEmail: sanitizeEnvText(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  suporteEmail:
    sanitizeEnvText(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ||
    sanitizeEnvText(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  dpoEmail: sanitizeEnvText(process.env.NEXT_PUBLIC_DPO_EMAIL),
} as const

export interface SocialLinkItem {
  id: 'instagram' | 'linkedin' | 'youtube'
  label: string
  ariaLabel: string
  url: string
}

function sanitizeHttpUrl(raw?: string): string {
  const val = raw?.trim() || ''
  return /^https?:\/\//i.test(val) ? val : ''
}

export const BRAND_SOCIAL_LINKS: SocialLinkItem[] = (
  [
    {
      id: 'instagram' as const,
      label: 'Instagram',
      ariaLabel: 'Instagram do OdontoSoft',
      url: sanitizeHttpUrl(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL),
    },
    {
      id: 'linkedin' as const,
      label: 'LinkedIn',
      ariaLabel: 'LinkedIn do OdontoSoft',
      url: sanitizeHttpUrl(process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL),
    },
    {
      id: 'youtube' as const,
      label: 'YouTube',
      ariaLabel: 'YouTube do OdontoSoft',
      url: sanitizeHttpUrl(process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL),
    },
  ] satisfies SocialLinkItem[]
).filter((item) => item.url.length > 0)

/**
 * SVG inline compartilhado para templates HTML de e-mail transacional.
 */
export function renderBrandLogoEmailHtml(): string {
  return `
    <div style="display:inline-flex;align-items:center;gap:10px;vertical-align:middle;">
      <span style="display:inline-block;width:34px;height:34px;border-radius:10px;background-color:#0F6E7A;text-align:center;line-height:34px;vertical-align:middle;">
        <svg width="20" height="20" viewBox="${BRAND_SVG_VIEWBOX}" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-top:7px;">
          <path d="${BRAND_TOOTH_PATH}"/>
          <path d="${BRAND_CROSS_PATH}"/>
        </svg>
      </span>
      <span style="font-size:24px;font-weight:800;color:#1A2127;letter-spacing:-0.4px;vertical-align:middle;">${BRAND_NAME}</span>
    </div>
  `.trim()
}
