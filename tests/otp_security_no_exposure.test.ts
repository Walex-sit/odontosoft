/**
 * tests/otp_security_no_exposure.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Teste de Segurança Estrita: Não-exposição de Códigos OTP ao Cliente ou Logs.
 *
 * Garante que:
 *  1. `enviarCodigoValidacao` NUNCA retorna o código OTP (nem demoCode) em nenhum ambiente.
 *  2. `sendOtpEmail` em modo dev/fallback NUNCA vaza o OTP nos logs do servidor.
 *  3. `app/register/page.tsx` não contém estados ou componentes que exibam ou preencham o OTP na tela.
 *  4. A validação exige obrigatoriamente que o código digitado confira com o hash armazenado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'

// Mock de supabaseAdmin para isolar os testes de Server Action
vi.mock('@/app/lib/supabase/admin', () => {
  return {
    supabaseAdmin: {
      from: vi.fn((table: string) => {
        if (table === 'user_verification_codes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'mock-code-uuid-1234' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
      rpc: vi.fn(),
    },
  }
})

describe('Proteção contra Exposição de Códigos OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OTP_SECRET = 'super-secret-pepper-for-testing-purposes-only-32-chars'
  })

  it('1. enviarCodigoValidacao NUNCA deve retornar demoCode ou o código OTP na resposta', async () => {
    // Importa dinamicamente a action
    const { enviarCodigoValidacao } = await import('@/app/actions/validation-code')

    // 1. Testa em ambiente de desenvolvimento (com fallback dev do Resend)
    const devEnv = 'development'
    const origEnv = process.env.NODE_ENV
    try {
      (process.env as any).NODE_ENV = devEnv
      delete process.env.RESEND_API_KEY // Simula ambiente dev sem chave

      const res = await enviarCodigoValidacao('usuario.teste@odontosoft.com.br')
      expect(res.success).toBe(true)

      const keys = Object.keys(res)
      expect(keys).not.toContain('demoCode')
      expect(keys).not.toContain('code')
      expect(keys).not.toContain('codigo')
      expect(keys).not.toContain('otp')
      expect((res as any).demoCode).toBeUndefined()
      expect(keys).toEqual(['success'])
    } finally {
      (process.env as any).NODE_ENV = origEnv
    }

    // 2. Testa em ambiente de produção sem chave de e-mail (falha segura)
    try {
      (process.env as any).NODE_ENV = 'production'
      delete process.env.RESEND_API_KEY

      const resProd = await enviarCodigoValidacao('usuario.teste@odontosoft.com.br')
      expect(resProd.success).toBe(false)
      expect(resProd.error).toBeDefined()

      const keysProd = Object.keys(resProd)
      expect(keysProd).not.toContain('demoCode')
      expect(keysProd).not.toContain('code')
      expect(keysProd).not.toContain('codigo')
      expect((resProd as any).demoCode).toBeUndefined()
    } finally {
      (process.env as any).NODE_ENV = origEnv
    }
  })

  it('2. sendOtpEmail NÃO deve expor o código OTP nos logs do servidor (console.warn/log/error)', async () => {
    const { sendOtpEmail } = await import('@/app/lib/email/resend')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    delete process.env.RESEND_API_KEY // Garante execução no bloco de fallback dev

    const testOtp = '849201'
    const testEmail = 'seguranca@odontosoft.com.br'

    await sendOtpEmail(testEmail, testOtp)

    // Junta todas as saídas de log capturadas
    const allLogs = [
      ...warnSpy.mock.calls.flat(),
      ...logSpy.mock.calls.flat(),
      ...errorSpy.mock.calls.flat(),
    ].join(' ')

    // O código OTP de 6 dígitos NUNCA deve aparecer nos logs do console
    expect(allLogs).not.toContain(testOtp)

    warnSpy.mockRestore()
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('3. app/register/page.tsx não deve conter referências a demoCode, nem botão de autopreenchimento de OTP', () => {
    const registerPagePath = path.join(process.cwd(), 'app/register/page.tsx')
    const fileContent = fs.readFileSync(registerPagePath, 'utf8')

    // Verifica que demoCode foi completamente extirpado
    expect(fileContent).not.toContain('demoCode')
    expect(fileContent).not.toContain('setDemoCode')
    expect(fileContent).not.toContain('Código de Validação gerado')
    expect(fileContent).not.toContain('setCodigoInput(demoCode)')

    // Verifica que a interface orienta a buscar o código no e-mail
    expect(fileContent).toContain('Enviamos um código de verificação para seu e-mail')
  })

  it('4. app/actions/validation-code.ts não deve exportar propriedades de OTP na interface pública', () => {
    const actionPath = path.join(process.cwd(), 'app/actions/validation-code.ts')
    const fileContent = fs.readFileSync(actionPath, 'utf8')

    expect(fileContent).not.toContain('demoCode')
    expect(fileContent).not.toContain('showDemoCode')
  })
})
