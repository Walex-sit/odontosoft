/**
 * cpfUtils.ts
 * Utilitários para máscara visual e validação matemática real de CPF.
 * Conformidade: CFO Resolução 198/2019 + LGPD Lei 13.709/18.
 */

/**
 * Aplica a máscara visual de CPF ao valor bruto digitado.
 * Remove tudo que não é dígito e formata como 000.000.000-00.
 */
export function mascaraCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

/**
 * Valida matematicamente um CPF usando o algoritmo dos dígitos verificadores.
 * Aceita CPF com ou sem máscara.
 * Retorna `true` apenas se o CPF for matematicamente válido.
 */
export function validarCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '')

  // Deve ter exatamente 11 dígitos
  if (digits.length !== 11) return false

  // Rejeita sequências repetidas (ex: 000.000.000-00, 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false

  // Cálculo do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[9])) return false

  // Cálculo do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(digits[10])) return false

  return true
}

/**
 * Retorna apenas os dígitos numéricos de um CPF (sem máscara).
 */
export function cpfSemMascara(value: string): string {
  return value.replace(/\D/g, '')
}
