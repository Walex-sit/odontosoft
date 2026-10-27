import { z } from 'zod'

/**
 * Normaliza o nome da clínica para comparação (remove acentos, múltiplos espaços e caixa alta).
 */
export function normalizeClinicName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Schema de validação completo para o formulário de registo (client & server-side).
 */
export const registerSchema = z
  .object({
    nomeClinica: z
      .string()
      .trim()
      .min(1, 'O nome da clínica é obrigatório.')
      .min(3, 'O nome da clínica deve ter pelo menos 3 caracteres.')
      .max(80, 'O nome da clínica não pode exceder 80 caracteres.'),
    email: z
      .string()
      .trim()
      .min(1, 'O e-mail é obrigatório.')
      .email('Introduza um endereço de e-mail válido.'),
    senha: z
      .string()
      .min(1, 'A senha é obrigatória.')
      .min(8, 'A senha deve ter pelo menos 8 caracteres.')
      .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
      .regex(/[0-9]/, 'A senha deve conter pelo menos um número.'),
    confirmarSenha: z
      .string()
      .min(1, 'A confirmação de senha é obrigatória.'),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  })

/**
 * Schema específico para o payload da Server Action de provisionamento.
 */
export const registrarClinicaPayloadSchema = z.object({
  nomeClinica: z
    .string()
    .trim()
    .min(1, 'O nome da clínica é obrigatório.')
    .min(3, 'O nome da clínica deve ter pelo menos 3 caracteres.')
    .max(80, 'O nome da clínica não pode exceder 80 caracteres.'),
})

export type RegisterFormData = z.infer<typeof registerSchema>
export type RegisterFormErrors = Partial<Record<keyof RegisterFormData | 'geral', string>>
