/**
 * app/lib/plans.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fonte única e compartilhada de planos, preços, limites e descrições
 * do OdontoSoft (Landing Page, /planos, /trial-expirado, Configurações e Painel Global).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type PaidPlanId = 'essencial' | 'premium'
export type DbPlanKey = 'basico' | 'profissional' | 'enterprise'

export interface TrialPlanConfig {
  id: 'trial'
  nome: string
  badge: string
  descricao: string
  precoMensal: number
  precoLabel: string
  periodo: string
  limites: {
    dentistas: string
    pacientes: string
    resumoCurto: string
  }
  recursos: string[]
  limitacoes: string[]
  ctaText: string
}

export interface PaidPlanConfig {
  id: PaidPlanId
  nome: string
  nomeCompleto: string
  badge: string
  popularBadge?: string
  descricao: string
  precoMensalCentavos: number
  precoAnualCentavos: number
  precoAnualMensalizadoCentavos: number
  precoMensal: number
  precoAnual: number
  precoAnualMensalizado: number
  popular?: boolean
  maxDentistas: number | 'Ilimitado'
  limites: {
    dentistas: string
    pacientes: string
    armazenamento: string
    resumoCurto: string
  }
  recursos: string[]
  ctaText: string
}

export const TRIAL_PLAN: TrialPlanConfig = {
  id: 'trial',
  nome: 'Teste de 7 dias',
  badge: 'Gratuito',
  descricao:
    'Experimente o sistema na rotina da clínica por 7 dias antes de escolher um plano.',
  precoMensal: 0,
  precoLabel: 'R$ 0',
  periodo: '/ 7 dias',
  limites: {
    dentistas: '1 profissional',
    pacientes: 'Até 50 pacientes',
    resumoCurto: '1 profissional · até 50 pacientes',
  },
  recursos: [
    '7 dias de acesso para conhecer a rotina da clínica',
    'Odontograma digital e prontuário básico',
  ],
  limitacoes: [
    'Relatórios financeiros completos e comissões bloqueados',
    'Exige assinatura de um plano pago para continuar após 7 dias',
  ],
  ctaText: 'Iniciar Teste de 7 dias',
}

const ESSENCIAL_MENSAL_CENTAVOS = 14900
const ESSENCIAL_ANUAL_CENTAVOS = Math.round(ESSENCIAL_MENSAL_CENTAVOS * 12 * 0.8) // 143040
const ESSENCIAL_ANUAL_MENSALIZADO_CENTAVOS = Math.round(ESSENCIAL_ANUAL_CENTAVOS / 12) // 11920

const PREMIUM_MENSAL_CENTAVOS = 29900
const PREMIUM_ANUAL_CENTAVOS = Math.round(PREMIUM_MENSAL_CENTAVOS * 12 * 0.8) // 287040
const PREMIUM_ANUAL_MENSALIZADO_CENTAVOS = Math.round(PREMIUM_ANUAL_CENTAVOS / 12) // 23920

export const PLANOS_SAAS_CATALOG: Record<PaidPlanId, PaidPlanConfig> = {
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    nomeCompleto: 'Essencial',
    badge: 'Consultórios',
    descricao:
      'Ideal para consultórios individuais e clínicas em estruturação que precisam organizar agenda e finanças.',
    precoMensalCentavos: ESSENCIAL_MENSAL_CENTAVOS,
    precoAnualCentavos: ESSENCIAL_ANUAL_CENTAVOS,
    precoAnualMensalizadoCentavos: ESSENCIAL_ANUAL_MENSALIZADO_CENTAVOS,
    precoMensal: ESSENCIAL_MENSAL_CENTAVOS / 100,
    precoAnual: ESSENCIAL_ANUAL_CENTAVOS / 100,
    precoAnualMensalizado: ESSENCIAL_ANUAL_MENSALIZADO_CENTAVOS / 100,
    maxDentistas: 3,
    limites: {
      dentistas: 'Até 3 profissionais',
      pacientes: 'Pacientes ilimitados',
      armazenamento: '5 GB de armazenamento',
      resumoCurto: 'Até 3 profissionais · Pacientes ilimitados · 5 GB',
    },
    recursos: [
      'Agendamento inteligente e confirmações de consulta',
      'Prontuários com validação de CPF',
      'Controle financeiro de receitas e despesas',
      'Catálogo de procedimentos e Termo LGPD padrão',
      'Suporte por e-mail em dias úteis',
    ],
    ctaText: 'Assinar Essencial',
  },
  premium: {
    id: 'premium',
    nome: 'Premium',
    nomeCompleto: 'Premium',
    badge: 'Clínica Completa',
    popularBadge: 'Recomendado',
    descricao:
      'Para clínicas consolidadas que precisam de equipe ilimitada, relatórios completos e recursos de apoio à conformidade CFO e LGPD.',
    precoMensalCentavos: PREMIUM_MENSAL_CENTAVOS,
    precoAnualCentavos: PREMIUM_ANUAL_CENTAVOS,
    precoAnualMensalizadoCentavos: PREMIUM_ANUAL_MENSALIZADO_CENTAVOS,
    precoMensal: PREMIUM_MENSAL_CENTAVOS / 100,
    precoAnual: PREMIUM_ANUAL_CENTAVOS / 100,
    precoAnualMensalizado: PREMIUM_ANUAL_MENSALIZADO_CENTAVOS / 100,
    popular: true,
    maxDentistas: 'Ilimitado',
    limites: {
      dentistas: 'Profissionais ilimitados',
      pacientes: 'Pacientes ilimitados',
      armazenamento: '50 GB de armazenamento',
      resumoCurto: 'Profissionais e pacientes ilimitados · 50 GB',
    },
    recursos: [
      'Tudo do plano Essencial incluído',
      'Múltiplos dentistas e divisão automática de comissões',
      'Relatórios financeiros completos e acompanhamento de caixa',
      'Recursos de apoio à conformidade CFO (histórico de alterações no prontuário)',
      'Dados da sua clínica isolados e protegidos',
      'Termo de consentimento LGPD com registro de aceite digital',
      'Backups automáticos',
      'Suporte prioritário via WhatsApp',
    ],
    ctaText: 'Assinar Premium',
  },
}

/**
 * Mapeamento canônico dos códigos armazenados na coluna `clinicas.plano` no banco
 * (`basico`, `profissional`, `enterprise`) para os nomes e valores unificados.
 */
export interface DbPlanInfo {
  dbKey: DbPlanKey
  nome: string
  precoMensal: number
  limites: PaidPlanConfig['limites']
}

export const DB_PLAN_CATALOG: Record<DbPlanKey, DbPlanInfo> = {
  basico: {
    dbKey: 'basico',
    nome: 'Essencial (Legado Básico)',
    precoMensal: PLANOS_SAAS_CATALOG.essencial.precoMensal,
    limites: PLANOS_SAAS_CATALOG.essencial.limites,
  },
  profissional: {
    dbKey: 'profissional',
    nome: PLANOS_SAAS_CATALOG.essencial.nome,
    precoMensal: PLANOS_SAAS_CATALOG.essencial.precoMensal,
    limites: PLANOS_SAAS_CATALOG.essencial.limites,
  },
  enterprise: {
    dbKey: 'enterprise',
    nome: PLANOS_SAAS_CATALOG.premium.nome,
    precoMensal: PLANOS_SAAS_CATALOG.premium.precoMensal,
    limites: PLANOS_SAAS_CATALOG.premium.limites,
  },
}

export function getDbPlanInfo(rawPlano?: string | null): DbPlanInfo {
  const normalized = (rawPlano || 'profissional').toLowerCase().trim()
  if (normalized === 'enterprise' || normalized === 'premium') {
    return DB_PLAN_CATALOG.enterprise
  }
  if (normalized === 'basico' || normalized === 'essencial') {
    return DB_PLAN_CATALOG.basico
  }
  return DB_PLAN_CATALOG.profissional
}

export function formatPlanPriceBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
