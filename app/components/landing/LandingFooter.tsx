import Link from 'next/link'

export default function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[var(--bg-surface)] text-[var(--text-secondary)] border-t border-[var(--border)] px-6 pt-16 pb-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary-fill)] text-[var(--on-primary)] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.5 2 5 5.5 5 9c0 3 2 5.5 4 7l1 5h4l1-5c2-1.5 4-4 4-7 0-3.5-3.5-7-7-7z"/>
                  <path d="M9 9h6M12 6v6"/>
                </svg>
              </div>
              <span className="font-heading font-bold text-[var(--text-primary)] text-lg">OdontoSoft</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs mb-5 text-[var(--text-secondary)]">
              O sistema de gestão odontológica mais completo do Brasil. Agenda, prontuário e financeiro em um só lugar.
            </p>
            <div className="flex gap-3">
              {/* Instagram */}
              <a href="#" aria-label="Instagram" className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] hover:text-[var(--primary)] flex items-center justify-center transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] hover:text-[var(--primary)] flex items-center justify-center transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
              {/* YouTube */}
              <a href="#" aria-label="YouTube" className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] hover:text-[var(--primary)] flex items-center justify-center transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Produto */}
          <div>
            <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-4">Produto</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ['Funcionalidades', '#funcionalidades'],
                ['Preços', '#preços'],
                ['Atualizações', '#'],
                ['Roadmap', '#'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="hover:text-[var(--text-primary)] transition-colors">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                ['Central de Ajuda', '#'],
                ['Contato', '#'],
                ['Status do Sistema', '#'],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="hover:text-[var(--text-primary)] transition-colors">{label}</a>
                </li>
              ))}
              <li>
                <Link href="/termos" className="hover:text-[var(--text-primary)] transition-colors">Termos de Uso</Link>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-[var(--text-primary)] transition-colors">Privacidade</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-secondary)]">
            © {currentYear} OdontoSoft. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            Todos os sistemas operacionais
          </div>
        </div>
      </div>
    </footer>
  )
}
