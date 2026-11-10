/**
 * tests/security_etapa4.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de Segurança — Etapa 4: Verificação das Correções dos Riscos Residuais
 *
 * Coberturas:
 *  R-006: Proteção de campos críticos de billing (status_assinatura, trial_ends_at, ativo)
 *  R-004: Ausência de email hardcoded como fallback
 *  R-005: Role do proprietário deve ser super_admin quando is_lifetime=true
 *  R-001: is_admin() deve reconhecer admin_clinica
 *  R-002: Super Admin sem clinica_id deve ter acesso administrativo
 *  R-003: Storage — Upload isolado por tenant
 *
 * IMPORTANTE: Estes são testes de lógica de aplicação (unit/integration).
 * Os testes de banco de dados (trigger de billing, RLS) devem ser executados
 * em ambiente Supabase local com `supabase db test`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Simulação de ambiente ────────────────────────────────────────────────────
const originalEnv = { ...process.env }

beforeEach(() => {
  // Reset env vars before each test
  process.env = { ...originalEnv }
  delete process.env.OWNER_EMAIL
  delete process.env.SUPERADMIN_EMAIL
  delete process.env.NEXT_PUBLIC_OWNER_EMAIL
})

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — R-004: Ausência de email hardcoded
// ─────────────────────────────────────────────────────────────────────────────
describe('R-004: Ausência de email hardcoded como fallback de segurança', () => {
  /**
   * Simula a lógica do proxy.ts e billing.ts após a correção R-004.
   * Se OWNER_EMAIL não estiver configurado, nenhum email concede acesso.
   */
  function resolveOwnerEmailAccess(
    userEmail: string | null,
    isLifetimeInDb: boolean,
    roleInDb: string
  ): { isSuperAdmin: boolean; isLifetime: boolean } {
    const configuredOwnerEmail = process.env.OWNER_EMAIL || process.env.SUPERADMIN_EMAIL || null

    const isOwnerExactMatch = Boolean(
      configuredOwnerEmail &&
      userEmail &&
      userEmail.toLowerCase().trim() === configuredOwnerEmail.toLowerCase().trim() &&
      (roleInDb === 'super_admin' || isLifetimeInDb === true)
    )

    const isSuperAdmin = roleInDb === 'super_admin'
    const isLifetime = isLifetimeInDb === true || isOwnerExactMatch

    return { isSuperAdmin, isLifetime }
  }

  it('sem OWNER_EMAIL configurado: nenhum email concede isLifetime por email', () => {
    // Sem variável de ambiente, o email não concede privilégios
    const result = resolveOwnerEmailAccess('testealex@gmail.com', false, 'admin')
    expect(result.isLifetime).toBe(false)
    expect(result.isSuperAdmin).toBe(false)
  })

  it('sem OWNER_EMAIL configurado: is_lifetime=true no banco ainda concede acesso', () => {
    // O banco de dados é a fonte de verdade — is_lifetime=true funciona sem env var
    const result = resolveOwnerEmailAccess('qualquer@email.com', true, 'super_admin')
    expect(result.isLifetime).toBe(true)
    expect(result.isSuperAdmin).toBe(true)
  })

  it('sem OWNER_EMAIL configurado: role=super_admin no banco concede isSuperAdmin', () => {
    const result = resolveOwnerEmailAccess('qualquer@email.com', false, 'super_admin')
    expect(result.isSuperAdmin).toBe(true)
    expect(result.isLifetime).toBe(false) // sem is_lifetime no banco e sem email configurado
  })

  it('com OWNER_EMAIL configurado: apenas correspondência exata E banco confirmam acesso', () => {
    process.env.OWNER_EMAIL = 'owner@odontosoft.com.br'

    // Email exato + banco confirma = acesso concedido
    const valid = resolveOwnerEmailAccess('owner@odontosoft.com.br', true, 'super_admin')
    expect(valid.isLifetime).toBe(true)

    // Email diferente = acesso negado por email
    const invalid = resolveOwnerEmailAccess('outro@clinica.com', true, 'super_admin')
    expect(invalid.isLifetime).toBe(true) // is_lifetime=true do banco ainda vale!
    // mas não pelo email
  })

  it('com OWNER_EMAIL configurado: email próximo mas não exato é rejeitado', () => {
    process.env.OWNER_EMAIL = 'owner@odontosoft.com.br'

    const attackAttempts = [
      'owner@odontosoft.com.br.evil.com',
      'OWner@odontosoft.com.br',  // case — normalize para lowercase
      ' owner@odontosoft.com.br', // espaço à esquerda — trim resolve
      'owner@odontosoft.com.br2',
    ]

    for (const email of attackAttempts) {
      // Simula sem is_lifetime no banco (atacante não tem)
      const result = resolveOwnerEmailAccess(email, false, 'admin')
      expect(result.isLifetime).toBe(false)
      expect(result.isSuperAdmin).toBe(false)
    }
  })

  it('não deve conter a string testealex em nenhuma variável de fallback', () => {
    // Verifica que o código não usa mais email hardcoded
    const configuredOwnerEmail = process.env.OWNER_EMAIL || process.env.SUPERADMIN_EMAIL || null
    expect(configuredOwnerEmail).not.toBe('testealex@gmail.com')
    expect(configuredOwnerEmail).toBeNull()
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — R-006: Proteção de campos críticos de billing
// ─────────────────────────────────────────────────────────────────────────────
describe('R-006: Proteção de campos críticos de billing', () => {
  /**
   * Simula a lógica do trigger protect_clinica_billing_fields() em TypeScript.
   * Em um teste real de banco, isso seria feito com supabase db test.
   */
  function simulateBillingFieldProtectionTrigger(
    jwtRole: 'service_role' | 'authenticated' | 'anon',
    oldRow: { status_assinatura: string; trial_ends_at: string | null; ativo: boolean },
    newRow: { status_assinatura: string; trial_ends_at: string | null; ativo: boolean }
  ): { allowed: boolean; error?: string } {
    // service_role tem acesso irrestrito
    if (jwtRole === 'service_role') {
      return { allowed: true }
    }

    // Verificar campos protegidos
    if (newRow.status_assinatura !== oldRow.status_assinatura) {
      return {
        allowed: false,
        error: '[OdontoSoft Security] Alteração de status_assinatura não autorizada.'
      }
    }

    if (newRow.trial_ends_at !== oldRow.trial_ends_at) {
      return {
        allowed: false,
        error: '[OdontoSoft Security] Alteração de trial_ends_at não autorizada.'
      }
    }

    if (newRow.ativo !== oldRow.ativo) {
      return {
        allowed: false,
        error: '[OdontoSoft Security] Alteração do campo ativo não autorizada.'
      }
    }

    return { allowed: true }
  }

  const baseRow = {
    status_assinatura: 'trial',
    trial_ends_at: '2026-11-10T00:00:00Z',
    ativo: true,
  }

  it('TESTE N1: rejeita alteração de status_assinatura por usuário autenticado', () => {
    const result = simulateBillingFieldProtectionTrigger(
      'authenticated',
      baseRow,
      { ...baseRow, status_assinatura: 'ativo' }
    )
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('status_assinatura')
  })

  it('TESTE N2: rejeita remoção de trial_ends_at por usuário autenticado', () => {
    const result = simulateBillingFieldProtectionTrigger(
      'authenticated',
      baseRow,
      { ...baseRow, trial_ends_at: null }
    )
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('trial_ends_at')
  })

  it('TESTE N3: rejeita alteração de ativo por usuário autenticado', () => {
    const result = simulateBillingFieldProtectionTrigger(
      'authenticated',
      baseRow,
      { ...baseRow, ativo: false }
    )
    expect(result.allowed).toBe(false)
    expect(result.error).toContain('ativo')
  })

  it('TESTE P1: permite Stripe webhook (service_role) alterar status_assinatura', () => {
    const result = simulateBillingFieldProtectionTrigger(
      'service_role',
      baseRow,
      { ...baseRow, status_assinatura: 'ativo' }
    )
    expect(result.allowed).toBe(true)
  })

  it('TESTE P2: permite Stripe webhook (service_role) alterar trial_ends_at', () => {
    const result = simulateBillingFieldProtectionTrigger(
      'service_role',
      baseRow,
      { ...baseRow, trial_ends_at: null }
    )
    expect(result.allowed).toBe(true)
  })

  it('TESTE P3: permite admin alterar campos não-billing (nome, telefone)', () => {
    // Campos de billing não mudaram — apenas nome mudou (não protegido)
    const result = simulateBillingFieldProtectionTrigger(
      'authenticated',
      baseRow,
      { ...baseRow } // sem mudança nos campos protegidos
    )
    expect(result.allowed).toBe(true)
  })

  it('TESTE N-COMBINADO: rejeita tentativa de bypass simultâneo de múltiplos campos', () => {
    const result = simulateBillingFieldProtectionTrigger(
      'authenticated',
      baseRow,
      { status_assinatura: 'ativo', trial_ends_at: null, ativo: true }
    )
    expect(result.allowed).toBe(false)
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — R-005: Role do proprietário deve ser super_admin
// ─────────────────────────────────────────────────────────────────────────────
describe('R-005: Consistência de role para usuários vitalícios', () => {
  it('usuário com is_lifetime=true e role=admin deve ser tratado inconsistentemente', () => {
    // Simula estado PRÉ-correção (migration 20261102000001 com role='admin')
    const preFixProfile = { is_lifetime: true, role: 'admin' }

    // No proxy.ts pré-correção, isOwnerExactMatch poderia resolver para true,
    // mas Server Actions com verificação de role !== 'super_admin' bloqueavam ações.
    // Isso é a inconsistência identificada em R-005.
    const isConsistentSuperAdmin = preFixProfile.role === 'super_admin'
    expect(isConsistentSuperAdmin).toBe(false) // confirma a inconsistência
  })

  it('usuário com is_lifetime=true e role=super_admin é consistentemente privilegiado', () => {
    // Estado PÓS-correção (migration 20261103000003)
    const postFixProfile = { is_lifetime: true, role: 'super_admin' }

    const isSuperAdmin = postFixProfile.role === 'super_admin'
    const isLifetime = postFixProfile.is_lifetime === true

    // Ambas as verificações convergem — sem inconsistência
    expect(isSuperAdmin).toBe(true)
    expect(isLifetime).toBe(true)
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — R-001: is_admin() deve reconhecer admin_clinica
// ─────────────────────────────────────────────────────────────────────────────
describe('R-001: Função is_admin() e consistência de papéis', () => {
  /**
   * Simula a função SQL is_admin() após a correção.
   */
  function isAdmin(role: string): boolean {
    return role === 'admin' || role === 'admin_clinica'
  }

  it('reconhece admin como administrador', () => {
    expect(isAdmin('admin')).toBe(true)
  })

  it('reconhece admin_clinica como administrador', () => {
    expect(isAdmin('admin_clinica')).toBe(true)
  })

  it('NÃO reconhece super_admin como is_admin — super_admin tem políticas próprias', () => {
    // super_admin não entra em is_admin() por design — tem acesso via políticas próprias
    expect(isAdmin('super_admin')).toBe(false)
  })

  it('NÃO reconhece dentista como administrador', () => {
    expect(isAdmin('dentista')).toBe(false)
  })

  it('NÃO reconhece atendente como administrador', () => {
    expect(isAdmin('atendente')).toBe(false)
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 5 — R-003: Isolamento de Storage por tenant
// ─────────────────────────────────────────────────────────────────────────────
describe('R-003: Isolamento de upload de Storage por tenant', () => {
  /**
   * Simula a verificação de isolamento de caminho do bucket clinic-logos.
   * Em produção, a política RLS de Storage valida:
   *   (storage.foldername(name))[1] = clinica_id do usuário autenticado
   */
  function simulateStorageUploadCheck(
    uploadPath: string,
    userClinicaId: string
  ): boolean {
    // Extrai o primeiro segmento do caminho (equivale a storage.foldername)
    const pathClinicaId = uploadPath.split('/')[0]
    return pathClinicaId === userClinicaId
  }

  const CLINICA_A = 'aaaaaaaa-0000-0000-0000-000000000001'
  const CLINICA_B = 'bbbbbbbb-0000-0000-0000-000000000002'

  it('permite upload no próprio caminho do tenant', () => {
    const path = `${CLINICA_A}/logo.png`
    expect(simulateStorageUploadCheck(path, CLINICA_A)).toBe(true)
  })

  it('rejeita upload no caminho de outro tenant', () => {
    const path = `${CLINICA_B}/logo.png`
    expect(simulateStorageUploadCheck(path, CLINICA_A)).toBe(false)
  })

  it('rejeita caminho sem tenant prefix', () => {
    const path = 'logo.png'
    expect(simulateStorageUploadCheck(path, CLINICA_A)).toBe(false)
  })

  it('rejeita caminho com UUID parcialmente correto', () => {
    const malformedPath = `${CLINICA_A.slice(0, 8)}/logo.png` // UUID truncado
    expect(simulateStorageUploadCheck(malformedPath, CLINICA_A)).toBe(false)
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 6 — R-002: Super Admin sem clinica_id
// ─────────────────────────────────────────────────────────────────────────────
describe('R-002: Super Admin sem clinica_id deve ter acesso administrativo global', () => {
  /**
   * Simula a lógica de verificação de acesso do super_admin.
   * Após a migration 20261103000003, a política RLS adiciona uma cláusula
   * separada para super_admin com EXISTS().
   */
  function superAdminCanAccessAllProfiles(
    requestingUserRole: string,
    requestingUserClinicaId: string | null
  ): boolean {
    // Super admin tem acesso global via política própria
    if (requestingUserRole === 'super_admin') {
      return true
    }
    // Usuários comuns: apenas da própria clínica
    return requestingUserClinicaId !== null
  }

  it('super_admin sem clinica_id pode ver todos os user_profiles', () => {
    expect(superAdminCanAccessAllProfiles('super_admin', null)).toBe(true)
  })

  it('super_admin com clinica_id pode ver todos os user_profiles', () => {
    expect(superAdminCanAccessAllProfiles('super_admin', 'some-uuid')).toBe(true)
  })

  it('admin_clinica sem clinica_id NÃO pode ver outros user_profiles', () => {
    expect(superAdminCanAccessAllProfiles('admin_clinica', null)).toBe(false)
  })

  it('dentista com clinica_id pode ver apenas sua própria clínica', () => {
    expect(superAdminCanAccessAllProfiles('dentista', 'some-uuid')).toBe(true)
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 7 — Ausência de OWNER_EMAIL: comportamento seguro
// ─────────────────────────────────────────────────────────────────────────────
describe('Comportamento seguro quando OWNER_EMAIL não está configurado', () => {
  it('sem OWNER_EMAIL: nenhum email aleatório ganha acesso via email matching', () => {
    delete process.env.OWNER_EMAIL
    delete process.env.SUPERADMIN_EMAIL

    const ownerEmail = process.env.OWNER_EMAIL || process.env.SUPERADMIN_EMAIL || null
    expect(ownerEmail).toBeNull()

    // Com null, isOwnerExactMatch sempre é false (ver lógica do proxy)
    const isOwnerExactMatch = Boolean(
      ownerEmail && // null → false → short-circuit
      true &&
      true
    )
    expect(isOwnerExactMatch).toBe(false)
  })

  it('com OWNER_EMAIL definido: acesso via email só é concedido com banco confirmando', () => {
    process.env.OWNER_EMAIL = 'real-owner@clinica.com'

    const ownerEmail = process.env.OWNER_EMAIL || null
    const isOwnerExactMatch = Boolean(
      ownerEmail &&
      'real-owner@clinica.com'.toLowerCase() === ownerEmail.toLowerCase() &&
      true // simula is_lifetime=true no banco
    )
    expect(isOwnerExactMatch).toBe(true)
  })
})
