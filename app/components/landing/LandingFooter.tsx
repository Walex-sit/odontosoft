import Link from 'next/link'
import { BrandLogo } from '@/app/components/BrandLogo'
import { BRAND_LEGAL_CONFIG, BRAND_SOCIAL_LINKS, type SocialLinkItem } from '@/app/lib/brand'

function SocialIcon({ id }: { id: SocialLinkItem['id'] }) {
  if (id === 'instagram') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    )
  }
  if (id === 'linkedin') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  )
}

export default function LandingFooter() {
  const currentYear = new Date().getFullYear()
  const { razaoSocial, cnpj, contatoEmail, suporteEmail, dpoEmail } = BRAND_LEGAL_CONFIG
  const contactOrDpo = dpoEmail || contatoEmail
  const hasLegalInfo = Boolean(razaoSocial || cnpj || contactOrDpo)

  return (
    <footer className="bg-[var(--bg-surface)] text-[var(--text-secondary)] border-t border-[var(--border)] px-6 pt-16 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <BrandLogo size="sm" />
            </div>
            <p className="text-sm leading-relaxed max-w-xs mb-5 text-[var(--text-secondary)]">
              Agenda, prontuário e financeiro da sua clínica em um só lugar.
            </p>
            {BRAND_SOCIAL_LINKS.length > 0 && (
              <div className="flex gap-3">
                {BRAND_SOCIAL_LINKS.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.ariaLabel}
                    className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] hover:border-[var(--primary)]/45 flex items-center justify-center transition-colors"
                  >
                    <SocialIcon id={item.id} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Produto */}
          <div>
            <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-4">Produto</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ['Funcionalidades', '#funcionalidades'],
                ['Preços', '#preços'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="hover:text-[var(--text-primary)] transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2.5 text-sm">
              {suporteEmail && (
                <li>
                  <a href={`mailto:${suporteEmail}`} className="hover:text-[var(--text-primary)] transition-colors">
                    Central de Ajuda
                  </a>
                </li>
              )}
              {contatoEmail && (
                <li>
                  <a href={`mailto:${contatoEmail}`} className="hover:text-[var(--text-primary)] transition-colors">
                    Contato
                  </a>
                </li>
              )}
              <li>
                <Link href="/termos" className="hover:text-[var(--text-primary)] transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-[var(--text-primary)] transition-colors">
                  Privacidade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Dados cadastrais e encarregado LGPD (via variáveis de ambiente; omite campos sem valor) */}
        {hasLegalInfo && (
          <div className="border-t border-[var(--border)] py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-[var(--text-secondary)]">
            {(razaoSocial || cnpj) && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {razaoSocial && (
                  <span>
                    <strong className="text-[var(--text-primary)] font-semibold">Razão social:</strong>{' '}
                    {razaoSocial}
                  </span>
                )}
                {cnpj && (
                  <span>
                    <strong className="text-[var(--text-primary)] font-semibold">CNPJ:</strong>{' '}
                    {cnpj}
                  </span>
                )}
              </div>
            )}
            {contactOrDpo && (
              <div>
                <strong className="text-[var(--text-primary)] font-semibold">
                  Contato / Encarregado LGPD:
                </strong>{' '}
                <a
                  href={`mailto:${contactOrDpo}`}
                  className="text-[var(--primary)] hover:underline font-medium"
                >
                  {contactOrDpo}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-secondary)]">
            © {currentYear} OdontoSoft. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
