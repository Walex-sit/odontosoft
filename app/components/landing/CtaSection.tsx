import Link from 'next/link'

export default function CtaSection() {
  return (
    <section className="py-24 px-6 bg-white" id="comecar">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-12 sm:p-16 text-center overflow-hidden shadow-2xl shadow-blue-200">
          {/* Background decoration */}
          <div
            aria-hidden
            className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none"
          />

          {/* Grid pattern */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Sem contrato de fidelidade
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-white mb-5 leading-tight">
              Comece grátis por{' '}
              <span className="text-cyan-200">14 dias</span>
            </h2>

            <p className="text-lg text-blue-100 max-w-xl mx-auto mb-10 leading-relaxed">
              Teste todos os recursos sem limitações. Sem cartão de crédito.
              Configure em menos de 5 minutos e veja a diferença que o OdontoSoft
              faz na sua clínica.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                id="cta-final-primary"
                className="inline-flex items-center gap-2.5 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-200 active:scale-95 text-base"
              >
                Criar minha conta grátis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <a
                href="#funcionalidades"
                id="cta-final-secondary"
                className="text-white/70 hover:text-white font-medium text-sm transition-colors"
              >
                Ver todas as funcionalidades →
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Dados 100% seguros' },
                { icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', label: 'Suporte 24h' },
                { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Sem cartão de crédito' },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 text-xs text-blue-100">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={badge.icon} />
                  </svg>
                  {badge.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
