import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  registrarClinicaPayloadSchema,
  normalizeClinicName,
} from '../app/lib/validations/register'

describe('Validações de Registo de Clínica e Administrador (Zod)', () => {
  describe('normalizeClinicName', () => {
    it('deve remover acentuação, normalizar maiúsculas e espaços múltiplos', () => {
      expect(normalizeClinicName('  Clínica   Odontológica   São   José  ')).toBe(
        'clinica odontologica sao jose'
      )
      expect(normalizeClinicName('DENTAL CLINIC')).toBe('dental clinic')
      expect(normalizeClinicName('Odonto-Saúde & Bem-Estar')).toBe('odonto-saude & bem-estar')
    })
  })

  describe('registerSchema', () => {
    const validData = {
      nomeClinica: 'OdontoSorriso Premium',
      email: 'doutor@odontosorriso.com',
      senha: 'SenhaSegura123',
      confirmarSenha: 'SenhaSegura123',
    }

    it('deve aceitar dados válidos e completos', () => {
      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('deve rejeitar nome de clínica com menos de 3 caracteres', () => {
      const result = registerSchema.safeParse({ ...validData, nomeClinica: 'Od' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('pelo menos 3 caracteres')
      }
    })

    it('deve rejeitar email inválido', () => {
      const result = registerSchema.safeParse({ ...validData, email: 'nao-e-um-email' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('endereço de e-mail válido')
      }
    })

    it('deve rejeitar senha com menos de 8 caracteres', () => {
      const result = registerSchema.safeParse({
        ...validData,
        senha: 'Pass1',
        confirmarSenha: 'Pass1',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('pelo menos 8 caracteres')
      }
    })

    it('deve rejeitar senha sem números', () => {
      const result = registerSchema.safeParse({
        ...validData,
        senha: 'SenhaApenasLetras',
        confirmarSenha: 'SenhaApenasLetras',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('pelo menos um número'))).toBe(true)
      }
    })

    it('deve rejeitar senha sem letras', () => {
      const result = registerSchema.safeParse({
        ...validData,
        senha: '12345678',
        confirmarSenha: '12345678',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('pelo menos uma letra'))).toBe(true)
      }
    })

    it('deve rejeitar senhas que não coincidem', () => {
      const result = registerSchema.safeParse({
        ...validData,
        confirmarSenha: 'OutraSenha123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('As senhas não coincidem'))).toBe(true)
      }
    })
  })

  describe('registrarClinicaPayloadSchema', () => {
    it('deve validar nome de clínica para server action', () => {
      expect(registrarClinicaPayloadSchema.safeParse({ nomeClinica: 'Clínica Sorriso' }).success).toBe(true)
      expect(registrarClinicaPayloadSchema.safeParse({ nomeClinica: '  ab  ' }).success).toBe(false)
      expect(registrarClinicaPayloadSchema.safeParse({ nomeClinica: '' }).success).toBe(false)
    })
  })
})
