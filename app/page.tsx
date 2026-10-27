import type { Metadata } from 'next'
import LandingNav from './components/landing/LandingNav'
import HeroSection from './components/landing/HeroSection'
import FeaturesSection from './components/landing/FeaturesSection'
import SocialProofSection from './components/landing/SocialProofSection'
import PricingSection from './components/landing/PricingSection'
import CtaSection from './components/landing/CtaSection'
import LandingFooter from './components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'OdontoSoft — Gestão Odontológica Simples e Previsível',
  description:
    'Agendamentos inteligentes, prontuário eletrônico completo e controle financeiro para clínicas odontológicas. Comece grátis por 14 dias, sem cartão de crédito.',
  keywords: [
    'software odontológico',
    'gestão clínica dental',
    'prontuário eletrônico odontologia',
    'agenda odontológica',
    'sistema odontológico',
  ],
  openGraph: {
    title: 'OdontoSoft — Gestão Odontológica Simples e Previsível',
    description:
      'Agendamentos inteligentes, prontuário eletrônico e controle financeiro em um só lugar.',
    type: 'website',
    locale: 'pt_BR',
  },
}

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <SocialProofSection />
        <PricingSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  )
}
