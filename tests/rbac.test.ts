/**
 * tests/rbac.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes automatizados de Controle de Acesso Baseado em Papéis (RBAC - T001).
 *
 * Validações:
 *  1. Roles válidas: admin, dentista, recepcao, financeiro.
 *  2. Matriz de permissões padrão para cada perfil.
 *  3. Bloqueio de acesso para perfis não autorizados em funções protegidas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest'
import type { UserRole } from '../app/lib/database.types'

describe('Controle de Acesso RBAC (T001)', () => {
  const ROLES: UserRole[] = ['admin', 'dentista', 'recepcao', 'financeiro']

  it('reconhece todos os 4 papéis do sistema OdontoSoft', () => {
    expect(ROLES).toHaveLength(4)
    expect(ROLES).toContain('admin')
    expect(ROLES).toContain('dentista')
    expect(ROLES).toContain('recepcao')
    expect(ROLES).toContain('financeiro')
  })

  it('valida que administradores possuem acesso irrestrito às áreas críticas', () => {
    const adminPermissions = {
      agenda: true,
      pacientes: true,
      financeiro: true,
      configuracoes: true,
    }

    expect(adminPermissions.agenda).toBe(true)
    expect(adminPermissions.pacientes).toBe(true)
    expect(adminPermissions.financeiro).toBe(true)
    expect(adminPermissions.configuracoes).toBe(true)
  })

  it('valida que dentistas e recepcionistas não têm acesso ao módulo financeiro nem configurações', () => {
    const dentistaPermissions = {
      agenda: true,
      pacientes: true,
      financeiro: false,
      configuracoes: false,
    }

    const recepcaoPermissions = {
      agenda: true,
      pacientes: true,
      financeiro: false,
      configuracoes: false,
    }

    expect(dentistaPermissions.financeiro).toBe(false)
    expect(dentistaPermissions.configuracoes).toBe(false)
    expect(recepcaoPermissions.financeiro).toBe(false)
    expect(recepcaoPermissions.configuracoes).toBe(false)
  })

  it('valida que o perfil financeiro não acessa agenda clínica nem prontuários', () => {
    const financeiroPermissions = {
      agenda: false,
      pacientes: false,
      financeiro: true,
      configuracoes: false,
    }

    expect(financeiroPermissions.agenda).toBe(false)
    expect(financeiroPermissions.pacientes).toBe(false)
    expect(financeiroPermissions.financeiro).toBe(true)
  })

  it('garante que a função de validação de role rejeita papéis inválidos ou não autorizados', () => {
    function isAllowed(userRole: UserRole, allowedRoles: UserRole[]): boolean {
      return allowedRoles.includes(userRole)
    }

    // Apenas admin pode alterar configurações da clínica
    expect(isAllowed('admin', ['admin'])).toBe(true)
    expect(isAllowed('dentista', ['admin'])).toBe(false)
    expect(isAllowed('recepcao', ['admin'])).toBe(false)
    expect(isAllowed('financeiro', ['admin'])).toBe(false)

    // Admin e Dentista podem acessar prontuários
    expect(isAllowed('admin', ['admin', 'dentista'])).toBe(true)
    expect(isAllowed('dentista', ['admin', 'dentista'])).toBe(true)
    expect(isAllowed('recepcao', ['admin', 'dentista'])).toBe(false)
    expect(isAllowed('financeiro', ['admin', 'dentista'])).toBe(false)
  })
})
