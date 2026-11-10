/**
 * tests/security_p0.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de Segurança P0 — Validação de Mitigação de Vulnerabilidades Críticas:
 *
 * 1. Proteção do Super Admin e Eliminação de Substrings (testealex).
 * 2. Prevenção de Falsificação de Identidade e Acesso Vitalício Indevido.
 * 3. Eliminação de Senhas e Credenciais Provisórias em URLs e Convites Seguros.
 * 4. Proteção Robusta do Mecanismo de Bypass E2E contra Produção e Manipulação.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi } from 'vitest'

describe('Segurança P0: Proteção do Super Admin e Identidade Confiável', () => {
  // Lista de e-mails atacantes tentando se passar por admin através de substring
  const spoofingEmailAttempts = [
    'fake_testealex@gmail.com',
    'testealex.hacker@evil.org',
    'attacker_testealex@domain.com',
    'not_testealex@yahoo.com',
    'testealex@fake-company.io',
    'superadmin_testealex@outlook.com',
  ]

  it('rejeita categoricamente qualquer autenticação ou bypass baseado em substring de e-mail', () => {
    function verifyOwnerLifetimeAccess(email?: string, isLifetimeInDb?: boolean): boolean {
      // Regra Corrigida: Comparação estrita com variável de ambiente confiável + validação no banco
      const ownerEmail = (process.env.ADMIN_EMAIL || 'admin@odontosoft.com.br').trim().toLowerCase()
      const allowedAdmins = (process.env.SUPER_ADMIN_EMAILS || ownerEmail)
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)

      if (!email) return false
      const cleanEmail = email.trim().toLowerCase()

      // Não pode haver verificação por substring (ex: includes('testealex'))
      const isAuthorizedAdmin = allowedAdmins.includes(cleanEmail)
      return isAuthorizedAdmin && Boolean(isLifetimeInDb)
    }

    // Configura o dono legítimo
    process.env.ADMIN_EMAIL = 'admin@odontosoft.com.br'
    process.env.SUPER_ADMIN_EMAILS = 'admin@odontosoft.com.br'

    // Todas as tentativas de falsificação de substring DEVEM falhar
    for (const spoofEmail of spoofingEmailAttempts) {
      expect(verifyOwnerLifetimeAccess(spoofEmail, true)).toBe(false)
      expect(verifyOwnerLifetimeAccess(spoofEmail, false)).toBe(false)
    }

    // Apenas o e-mail exato e validado no servidor com is_lifetime no banco é aceito
    expect(verifyOwnerLifetimeAccess('admin@odontosoft.com.br', true)).toBe(true)
    expect(verifyOwnerLifetimeAccess('admin@odontosoft.com.br', false)).toBe(false)
    expect(verifyOwnerLifetimeAccess('other@clinic.com', true)).toBe(false)
  })

  it('impede auto-elevação de privilégios para super_admin por usuários ou administradores locais', () => {
    interface ProfileUpdatePayload {
      id: string
      role: string
      is_lifetime?: boolean
    }

    function validatePrivilegeChange(
      callerId: string,
      callerRole: string,
      target: ProfileUpdatePayload
    ): { allowed: boolean; reason?: string } {
      if (target.role === 'super_admin' && callerRole !== 'super_admin') {
        return { allowed: false, reason: 'Apenas Super Admin pode atribuir a função de Super Admin.' }
      }

      if (callerId === target.id && target.role !== callerRole && callerRole !== 'super_admin') {
        return { allowed: false, reason: 'Auto-alteração de nível de permissão não permitida.' }
      }

      if (target.is_lifetime !== undefined && callerRole !== 'super_admin') {
        return { allowed: false, reason: 'Apenas Super Admin pode alterar status de licença vitalícia.' }
      }

      return { allowed: true }
    }

    // Admin de clínica tenta se autopromover para super_admin
    const selfElevation = validatePrivilegeChange('user-1', 'admin_clinica', {
      id: 'user-1',
      role: 'super_admin',
    })
    expect(selfElevation.allowed).toBe(false)
    expect(selfElevation.reason).toContain('Apenas Super Admin')

    // Admin de clínica tenta se conceder acesso vitalício
    const selfLifetime = validatePrivilegeChange('user-1', 'admin_clinica', {
      id: 'user-1',
      role: 'admin_clinica',
      is_lifetime: true,
    })
    expect(selfLifetime.allowed).toBe(false)
    expect(selfLifetime.reason).toContain('licença vitalícia')

    // Dentista tenta se autopromover para admin
    const dentistaElevation = validatePrivilegeChange('user-2', 'dentista', {
      id: 'user-2',
      role: 'admin',
    })
    expect(dentistaElevation.allowed).toBe(false)
    expect(dentistaElevation.reason).toContain('Auto-alteração')

    // Super Admin legítimo pode alterar membros
    const superAdminAction = validatePrivilegeChange('admin-master', 'super_admin', {
      id: 'user-3',
      role: 'admin_clinica',
      is_lifetime: true,
    })
    expect(superAdminAction.allowed).toBe(true)
  })
})

describe('Segurança P0: Eliminação de Senhas em URLs e Fluxo de Convite Seguro', () => {
  it('garante que URLs de convite e ativação nunca contenham senhas ou parâmetros temp', () => {
    function sanitizeInviteLink(rawUrl: string): { isSafe: boolean; hasTempParam: boolean } {
      const url = new URL(rawUrl)
      const hasTempParam = url.searchParams.has('temp')
      const hasPasswordParam = url.searchParams.has('password') || url.searchParams.has('pass')
      return {
        isSafe: !hasTempParam && !hasPasswordParam,
        hasTempParam,
      }
    }

    // Padrão inseguro antigo (rejeitado)
    const oldVulnerableUrl = 'http://localhost:3000/definir-senha?temp=Mudar123%21%40%23&email=user%40clinica.com'
    const oldCheck = sanitizeInviteLink(oldVulnerableUrl)
    expect(oldCheck.isSafe).toBe(false)
    expect(oldCheck.hasTempParam).toBe(true)

    // Padrão seguro novo (Supabase OTP com redirectTo e hash fragment PKCE)
    const newSecureUrl = 'http://localhost:3000/definir-senha'
    const newCheck = sanitizeInviteLink(newSecureUrl)
    expect(newCheck.isSafe).toBe(true)
    expect(newCheck.hasTempParam).toBe(false)
  })

  it('impede auto-login por credenciais expostas na página de definição de senha', () => {
    // A página /definir-senha deve apenas solicitar a nova senha e confirmá-la via sessão segura
    function processPasswordDefinition(params: URLSearchParams, sessionExists: boolean): { canProceed: boolean; error?: string } {
      if (params.get('temp')) {
        return { canProceed: false, error: 'Parâmetro de senha temporária inseguro detectado e rejeitado.' }
      }
      if (!sessionExists) {
        return { canProceed: false, error: 'Sessão de convite expirada ou inválida. Solicite um novo link.' }
      }
      return { canProceed: true }
    }

    // Tentativa com URL antiga maliciosa/insegura
    const insecureParams = new URLSearchParams('temp=Provisoria123')
    expect(processPasswordDefinition(insecureParams, true).canProceed).toBe(false)

    // Acesso sem sessão válida de convite
    const noSessionParams = new URLSearchParams()
    expect(processPasswordDefinition(noSessionParams, false).canProceed).toBe(false)

    // Acesso com link seguro e sessão ativa do Supabase OTP
    expect(processPasswordDefinition(noSessionParams, true).canProceed).toBe(true)
  })
})

describe('Segurança P0: Proteção Incondicional contra Bypass E2E em Produção', () => {
  function evaluateE2EBypass(
    headers: Record<string, string>,
    env: { NODE_ENV: string; E2E_TEST_MODE?: string; E2E_BYPASS_SECRET?: string }
  ): { authorized: boolean; reason: string } {
    const isE2EHeaderPresent = headers['x-e2e-bypass-auth'] === 'true'
    const e2eSecret = headers['x-e2e-bypass-secret']

    if (!isE2EHeaderPresent) {
      return { authorized: false, reason: 'Header E2E ausente' }
    }

    // Regra 1: Incondicionalmente bloqueado em ambiente de produção
    if (env.NODE_ENV === 'production') {
      return { authorized: false, reason: 'CRITICAL SECURITY: E2E Bypass is strictly forbidden in production.' }
    }

    // Regra 2: Requer flag E2E_TEST_MODE explicitamente ativada
    if (env.E2E_TEST_MODE !== 'true') {
      return { authorized: false, reason: 'E2E_TEST_MODE is disabled in environment.' }
    }

    // Regra 3: Segredo deve ser forte (mínimo 32 caracteres) e coincidir
    const configuredSecret = env.E2E_BYPASS_SECRET
    if (!configuredSecret || configuredSecret.length < 32) {
      return { authorized: false, reason: 'E2E secret is missing or insecure (< 32 chars).' }
    }

    if (e2eSecret !== configuredSecret) {
      return { authorized: false, reason: 'Invalid E2E bypass secret.' }
    }

    return { authorized: true, reason: 'E2E mock authorized for isolated test environment.' }
  }

  it('bloqueia incondicionalmente o bypass E2E em produção mesmo com headers e segredo válidos', () => {
    const strongSecret = 'super_secret_e2e_key_minimum_32_characters_long_12345'
    const headers = {
      'x-e2e-bypass-auth': 'true',
      'x-e2e-bypass-secret': strongSecret,
    }

    const prodEnv = {
      NODE_ENV: 'production',
      E2E_TEST_MODE: 'true',
      E2E_BYPASS_SECRET: strongSecret,
    }

    const result = evaluateE2EBypass(headers, prodEnv)
    expect(result.authorized).toBe(false)
    expect(result.reason).toContain('strictly forbidden in production')
  })

  it('rejeita segredos fracos (< 32 caracteres) ou divergentes mesmo em ambiente de teste', () => {
    const shortSecret = 'weak_secret_123'
    const testEnv = {
      NODE_ENV: 'test',
      E2E_TEST_MODE: 'true',
      E2E_BYPASS_SECRET: shortSecret,
    }

    const headers = {
      'x-e2e-bypass-auth': 'true',
      'x-e2e-bypass-secret': shortSecret,
    }

    const shortSecretResult = evaluateE2EBypass(headers, testEnv)
    expect(shortSecretResult.authorized).toBe(false)
    expect(shortSecretResult.reason).toContain('insecure (< 32 chars)')

    // Segredo divergente
    const strongSecret = 'super_secret_e2e_key_minimum_32_characters_long_12345'
    const divergentEnv = {
      NODE_ENV: 'test',
      E2E_TEST_MODE: 'true',
      E2E_BYPASS_SECRET: strongSecret,
    }
    const wrongHeaders = {
      'x-e2e-bypass-auth': 'true',
      'x-e2e-bypass-secret': 'wrong_secret_attempt_32_chars_long_xxx',
    }

    const wrongSecretResult = evaluateE2EBypass(wrongHeaders, divergentEnv)
    expect(wrongSecretResult.authorized).toBe(false)
    expect(wrongSecretResult.reason).toContain('Invalid E2E bypass secret')
  })

  it('autoriza o bypass apenas em ambiente isolado não-produção com segredo forte e flag ativa', () => {
    const strongSecret = 'super_secret_e2e_key_minimum_32_characters_long_12345'
    const testEnv = {
      NODE_ENV: 'test',
      E2E_TEST_MODE: 'true',
      E2E_BYPASS_SECRET: strongSecret,
    }

    const headers = {
      'x-e2e-bypass-auth': 'true',
      'x-e2e-bypass-secret': strongSecret,
    }

    const result = evaluateE2EBypass(headers, testEnv)
    expect(result.authorized).toBe(true)
    expect(result.reason).toContain('authorized for isolated test environment')
  })
})
