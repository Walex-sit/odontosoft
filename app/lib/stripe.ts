/**
 * app/lib/stripe.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo de Integração com Stripe SDK para OdontoSoft SaaS B2B.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || ''

export const stripe = new Stripe(stripeSecretKey, {
  typescript: true,
  appInfo: {
    name: 'OdontoSoft SaaS',
    version: '1.0.0',
  },
})

export interface PlanConfig {
  id: 'essencial' | 'premium'
  nome: string
  descricao: string
  precoMensal: number
  precoAnual: number
  precoAnualMensalizado: number
  popular?: boolean
  stripePriceIdMensal: string
  stripePriceIdAnual?: string
  limites: {
    dentistas: string
    pacientes: string
    armazenamento: string
  }
  recursos: string[]
}

export const PLANOS_SAAS: Record<'essencial' | 'premium', PlanConfig> = {
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    descricao: 'Ideal para consultórios individuais e clínicas em fase de estruturação.',
    precoMensal: 149,
    precoAnual: 1430, // 20% desconto ~ R$ 119/mês
    precoAnualMensalizado: 119,
    stripePriceIdMensal: process.env.STRIPE_PRICE_ID_ESSENCIAL || 'price_essencial_mensal',
    limites: {
      dentistas: 'Até 3 profissionais',
      pacientes: 'Ilimitados',
      armazenamento: '5 GB de radiografias/fotos',
    },
    recursos: [
      'Agendamento inteligente e status de consultas',
      'Cadastro de pacientes com validação estrita de CPF',
      'Emissão e impressão do Termo LGPD padrão',
      'Controle financeiro de receitas e despesas',
      'Gestão de catálogo de procedimentos e tabelas',
      'Suporte padrão por e-mail em dias úteis',
    ],
  },
  premium: {
    id: 'premium',
    nome: 'Premium & Compliance',
    descricao: 'Para clínicas consolidadas que exigem blindagem jurídica total (CFO & LGPD).',
    precoMensal: 299,
    precoAnual: 2870, // 20% desconto ~ R$ 239/mês
    precoAnualMensalizado: 239,
    popular: true,
    stripePriceIdMensal: process.env.STRIPE_PRICE_ID_PREMIUM || 'price_premium_mensal',
    limites: {
      dentistas: 'Profissionais Ilimitados',
      pacientes: 'Ilimitados',
      armazenamento: '50 GB com retenção CFO 20 anos',
    },
    recursos: [
      'Tudo do Plano Essencial incluído',
      'Prontuário Imutável CFO 198/2019 (Adendos e Bloqueio de DELETE/UPDATE)',
      'Trilha de Auditoria Estrita no schema privado (Diff de OLD e NEW)',
      'Consentimento Granular LGPD & TCLE com hash SHA-256',
      'Anonimização Dissociada (Direito ao Esquecimento sem quebrar CFO)',
      'Painel de Conformidade e Relatórios para DPO / Jurídico',
      'Criptografia simétrica AES-256 no CPF em repouso',
      'Suporte VIP prioritário via WhatsApp',
    ],
  },
}
