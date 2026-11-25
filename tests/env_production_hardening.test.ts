import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Hardening de Configuração de Produção', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('A. NEXT_PUBLIC_APP_URL (getAppUrl)', () => {
    it('em produção, lança erro claro se NEXT_PUBLIC_APP_URL estiver ausente', async () => {
      ;(process.env as any).NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_APP_URL

      const { getAppUrl } = await import('@/app/lib/env')
      expect(() => getAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL/)
    })

    it('em produção, lança erro claro se NEXT_PUBLIC_APP_URL for inválida', async () => {
      ;(process.env as any).NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_APP_URL = 'nao-e-uma-url'

      const { getAppUrl } = await import('@/app/lib/env')
      expect(() => getAppUrl()).toThrow(/formato inválido/)
    })

    it('em produção, rejeita protocolo diferente de http/https', async () => {
      ;(process.env as any).NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_APP_URL = 'javascript:alert(1)'

      const { getAppUrl } = await import('@/app/lib/env')
      expect(() => getAppUrl()).toThrow(/http:\/\/ ou https:\/\//)
    })

    it('em produção, retorna URL válida normalizada sem barra final', async () => {
      ;(process.env as any).NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.odontosoft.com.br/'

      const { getAppUrl } = await import('@/app/lib/env')
      expect(getAppUrl()).toBe('https://app.odontosoft.com.br')
    })

    it('em desenvolvimento, preserva fallback para http://localhost:3000 quando ausente', async () => {
      ;(process.env as any).NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_APP_URL

      const { getAppUrl } = await import('@/app/lib/env')
      expect(getAppUrl()).toBe('http://localhost:3000')
    })
  })

  describe('B. RESEND_FROM_EMAIL (app/lib/email/resend.ts)', () => {
    it('em produção, bloqueia envio se RESEND_FROM_EMAIL estiver ausente mesmo com RESEND_API_KEY', async () => {
      ;(process.env as any).NODE_ENV = 'production'
      process.env.RESEND_API_KEY = 're_test_dummy_key_for_unit_test'
      delete process.env.RESEND_FROM_EMAIL

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { sendOtpEmail, EMAIL_FROM } = await import('@/app/lib/email/resend')

      expect(EMAIL_FROM).toBe('')
      const result = await sendOtpEmail('clinica@exemplo.com.br', '123456')

      expect(result.success).toBe(false)
      expect(result.error).toContain('remetente não configurado')
      errorSpy.mockRestore()
    })

    it('em desenvolvimento sem RESEND_API_KEY, preserva simulação segura', async () => {
      ;(process.env as any).NODE_ENV = 'development'
      delete process.env.RESEND_API_KEY
      delete process.env.RESEND_FROM_EMAIL

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { sendOtpEmail, EMAIL_FROM } = await import('@/app/lib/email/resend')

      expect(EMAIL_FROM).toBe('OdontoSoft <onboarding@resend.dev>')
      const result = await sendOtpEmail('dev@exemplo.com.br', '654321')
      expect(result.success).toBe(true)
      warnSpy.mockRestore()
    })
  })

  describe('C. NEXT_PUBLIC_OWNER_EMAIL removida do cliente', () => {
    it('RequireAuth.tsx e configuracoes/page.tsx não dependem mais de NEXT_PUBLIC_OWNER_EMAIL', () => {
      const root = process.cwd()
      const requireAuth = fs.readFileSync(
        path.join(root, 'app/components/RequireAuth.tsx'),
        'utf-8'
      )
      const configuracoes = fs.readFileSync(
        path.join(root, 'app/(dashboard)/configuracoes/page.tsx'),
        'utf-8'
      )

      expect(requireAuth).not.toContain('NEXT_PUBLIC_OWNER_EMAIL')
      expect(configuracoes).not.toContain('NEXT_PUBLIC_OWNER_EMAIL')
      expect(requireAuth).toContain("profile?.role === 'super_admin'")
      expect(requireAuth).toContain('profile?.is_lifetime === true')
    })
  })

  describe('D. Stripe sem fallback de chave falsa (app/lib/stripe.ts)', () => {
    it('não inicializa o SDK no import quando STRIPE_SECRET_KEY está ausente', async () => {
      delete process.env.STRIPE_SECRET_KEY
      const mod = await import('@/app/lib/stripe')
      expect(mod.stripe).toBeDefined()
      expect(mod.stripe.webhooks).toBeDefined()
    })

    it('falha explicitamente ao tentar obter cliente Stripe sem chave válida', async () => {
      delete process.env.STRIPE_SECRET_KEY
      const { getStripeClient, stripe } = await import('@/app/lib/stripe')

      expect(() => getStripeClient()).toThrow(/STRIPE_SECRET_KEY/)
      expect(() => (stripe as any).checkout).toThrow(/STRIPE_SECRET_KEY/)
    })

    it('rejeita chave fictícia ou placeholder explicitamente', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_chave_falsa_apenas_para_o_build_passar'
      const { getStripeClient } = await import('@/app/lib/stripe')

      expect(() => getStripeClient()).toThrow(/STRIPE_SECRET_KEY/)
    })

    it('inicializa corretamente quando STRIPE_SECRET_KEY tem formato válido', async () => {
      process.env.STRIPE_SECRET_KEY = ['sk', 'test', 'unit'.repeat(6)].join('_')
      const { getStripeClient } = await import('@/app/lib/stripe')

      const client = getStripeClient()
      expect(client).toBeDefined()
      expect(typeof client.checkout).toBe('object')
    })
  })

  describe('E. IS_NON_PRODUCTION_ENV não usada em controles de segurança', () => {
    it('não é importada em proxy.ts, auth-guards, actions ou api routes', () => {
      const root = process.cwd()
      const securityFiles = [
        'proxy.ts',
        'app/lib/auth-guards.ts',
        'app/actions/billing.ts',
        'app/actions/users.ts',
        'app/actions/admin-global.ts',
        'app/api/checkout/route.ts',
        'app/api/webhooks/payment/route.ts',
      ]

      for (const relPath of securityFiles) {
        const content = fs.readFileSync(path.join(root, relPath), 'utf-8')
        expect(content).not.toContain('IS_NON_PRODUCTION_ENV')
        expect(content).not.toContain('NEXT_PUBLIC_VERCEL_ENV')
      }
    })
  })
})
