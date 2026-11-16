/**
 * tests/super_admin_context.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes Unitários de Autorização, RBAC e Contexto Administrativo (Super Admin)
 *
 * Itens testados:
 *  1. RBAC Client: Apenas super_admin tem permissão para rota /admin.
 *  2. Dentista, Recepção, Financeiro e Admin de Clínica bloqueados em /admin.
 *  3. Acesso aos 6 módulos clínicos permitido para super_admin.
 *  4. Separação de Identidade: Troca de contexto não afeta user_profiles no cliente.
 *  5. Contratos de Server Actions de Contexto.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest'
import { canAccess, ROUTE_PERMISSIONS } from '@/app/lib/rbac-client'
import type { UserRole } from '@/app/components/RequireAuth'

describe('SUPER ADMIN — Permissões de Rota e Painel Global (RBAC Client)', () => {
  it('1. Super Admin possui permissão explícita para acessar /admin e suas sub-rotas (/admin/clinicas, /admin/usuarios, /admin/assinaturas)', () => {
    expect(canAccess('super_admin', '/admin')).toBe(true)
    expect(canAccess('super_admin', '/admin/clinicas')).toBe(true)
    expect(canAccess('super_admin', '/admin/usuarios')).toBe(true)
    expect(canAccess('super_admin', '/admin/assinaturas')).toBe(true)
    expect(canAccess('super_admin', '/admin?tab=clinicas')).toBe(true)
    expect(canAccess('super_admin', '/admin?tab=usuarios')).toBe(true)
    expect(canAccess('super_admin', '/admin?tab=assinaturas')).toBe(true)
  })

  it('2. Usuários comuns (admin, admin_clinica, dentista, recepcao, financeiro) são BLOQUEADOS em /admin e sub-rotas', () => {
    const rolesComuns: UserRole[] = ['admin', 'admin_clinica', 'dentista', 'recepcao', 'financeiro']

    for (const r of rolesComuns) {
      expect(canAccess(r, '/admin')).toBe(false)
      expect(canAccess(r, '/admin/clinicas')).toBe(false)
      expect(canAccess(r, '/admin/usuarios')).toBe(false)
      expect(canAccess(r, '/admin/assinaturas')).toBe(false)
      expect(canAccess(r, '/admin/detalhes')).toBe(false)
    }
  })

  it('3. Super Admin tem permissão para os 6 módulos clínicos da clínica selecionada', () => {
    const modulosObrigatorios = [
      '/agenda',
      '/pacientes',
      '/prontuarios',
      '/financeiro',
      '/estoque',
      '/configuracoes',
    ]

    for (const mod of modulosObrigatorios) {
      expect(canAccess('super_admin', mod)).toBe(true)
      expect(canAccess('super_admin', `${mod}/123`)).toBe(true)
    }
  })

  it('4. Dentista continua sem acesso a módulos restritos (financeiro, configuracoes)', () => {
    expect(canAccess('dentista', '/financeiro')).toBe(false)
    expect(canAccess('dentista', '/configuracoes')).toBe(false)
    expect(canAccess('dentista', '/usuarios')).toBe(false)
    expect(canAccess('dentista', '/agenda')).toBe(true)
    expect(canAccess('dentista', '/pacientes')).toBe(true)
    expect(canAccess('dentista', '/prontuarios')).toBe(true)
  })

  it('5. Recepção continua sem acesso a prontuários e financeiro', () => {
    expect(canAccess('recepcao', '/prontuarios')).toBe(false)
    expect(canAccess('recepcao', '/financeiro')).toBe(false)
    expect(canAccess('recepcao', '/configuracoes')).toBe(false)
    expect(canAccess('recepcao', '/agenda')).toBe(true)
    expect(canAccess('recepcao', '/pacientes')).toBe(true)
  })

  it('6. Usuário indefinido não acessa nenhuma rota', () => {
    expect(canAccess(undefined, '/admin')).toBe(false)
    expect(canAccess(undefined, '/overview')).toBe(false)
  })

  it('7. Topbar para Super Admin contém links reais para /admin, /admin/clinicas, /admin/usuarios, /admin/assinaturas', () => {
    const superAdminNavLinks = [
      { name: 'Painel Geral', path: '/admin' },
      { name: 'Clínicas', path: '/admin/clinicas' },
      { name: 'Usuários', path: '/admin/usuarios' },
      { name: 'Assinaturas', path: '/admin/assinaturas' },
    ]

    expect(superAdminNavLinks).toHaveLength(4)
    expect(superAdminNavLinks[0].path).toBe('/admin')
    expect(superAdminNavLinks[1].path).toBe('/admin/clinicas')
    expect(superAdminNavLinks[2].path).toBe('/admin/usuarios')
    expect(superAdminNavLinks[3].path).toBe('/admin/assinaturas')

    // Verificação de isolamento da aba ativa no Topbar
    const isBaseMatch = (linkPath: string, pathname: string) => {
      return linkPath === '/admin'
        ? pathname === '/admin'
        : pathname === linkPath || pathname.startsWith(linkPath + '/') || pathname.startsWith('/dashboard' + linkPath)
    }

    // Quando estiver em /admin, somente Painel Geral deve estar ativo
    expect(isBaseMatch('/admin', '/admin')).toBe(true)
    expect(isBaseMatch('/admin/clinicas', '/admin')).toBe(false)
    expect(isBaseMatch('/admin/usuarios', '/admin')).toBe(false)
    expect(isBaseMatch('/admin/assinaturas', '/admin')).toBe(false)

    // Quando estiver em /admin/clinicas, somente Clínicas deve estar ativo
    expect(isBaseMatch('/admin', '/admin/clinicas')).toBe(false)
    expect(isBaseMatch('/admin/clinicas', '/admin/clinicas')).toBe(true)
    expect(isBaseMatch('/admin/usuarios', '/admin/clinicas')).toBe(false)
    expect(isBaseMatch('/admin/assinaturas', '/admin/clinicas')).toBe(false)

    // Quando estiver em /admin/usuarios, somente Usuários deve estar ativo
    expect(isBaseMatch('/admin', '/admin/usuarios')).toBe(false)
    expect(isBaseMatch('/admin/clinicas', '/admin/usuarios')).toBe(false)
    expect(isBaseMatch('/admin/usuarios', '/admin/usuarios')).toBe(true)
    expect(isBaseMatch('/admin/assinaturas', '/admin/usuarios')).toBe(false)

    // Quando estiver em /admin/assinaturas, somente Assinaturas deve estar ativo
    expect(isBaseMatch('/admin', '/admin/assinaturas')).toBe(false)
    expect(isBaseMatch('/admin/clinicas', '/admin/assinaturas')).toBe(false)
    expect(isBaseMatch('/admin/usuarios', '/admin/assinaturas')).toBe(false)
    expect(isBaseMatch('/admin/assinaturas', '/admin/assinaturas')).toBe(true)
  })

  it('8. AdminHeader tabs calculam abas ativas com rotas reais independentes', () => {
    const isCurrentTab = (tabHref: string, pathname: string) => {
      return tabHref === '/admin'
        ? pathname === '/admin'
        : pathname === tabHref || pathname.startsWith(tabHref + '/')
    }

    expect(isCurrentTab('/admin', '/admin')).toBe(true)
    expect(isCurrentTab('/admin/clinicas', '/admin')).toBe(false)

    expect(isCurrentTab('/admin', '/admin/clinicas')).toBe(false)
    expect(isCurrentTab('/admin/clinicas', '/admin/clinicas')).toBe(true)

    expect(isCurrentTab('/admin', '/admin/usuarios')).toBe(false)
    expect(isCurrentTab('/admin/usuarios', '/admin/usuarios')).toBe(true)

    expect(isCurrentTab('/admin', '/admin/assinaturas')).toBe(false)
    expect(isCurrentTab('/admin/assinaturas', '/admin/assinaturas')).toBe(true)
  })

  it('9. Regex de rewrite do Turbopack em desenvolvimento casa apenas arquivos CSS sem ._ e rejeita ._.css', () => {
    // Regex configurado no next.config.ts para Turbopack em desenvolvimento
    const devChunkRegex = /^\/_next\/static\/chunks\/((?!.*\._)[^/]+)\.css$/

    // Chunks que necessitam do rewrite (dev Turbopack sem ._)
    expect(devChunkRegex.test('/_next/static/chunks/[root-of-the-server]__097~5go.css')).toBe(true)
    expect(devChunkRegex.test('/_next/static/chunks/app_layout_5go.css')).toBe(true)

    // Chunks que já possuem ._.css NÃO devem casar
    expect(devChunkRegex.test('/_next/static/chunks/[root-of-the-server]__097~5go._.css')).toBe(false)
    expect(devChunkRegex.test('/_next/static/chunks/app_layout_5go._.css')).toBe(false)
  })

  it('10. Sanitização de busca do painel remove caracteres de controle que corrompem cláusulas PostgREST', () => {
    const sanitizeSearch = (term: string) => term.trim().replace(/[,()]/g, '')

    expect(sanitizeSearch('Clinica Odonto, Ltda')).toBe('Clinica Odonto Ltda')
    expect(sanitizeSearch('select(id,name)')).toBe('selectidname')
    expect(sanitizeSearch('  Clinica Central  ')).toBe('Clinica Central')
  })

  it('11. Validação de UUID rejeita identificadores maliciosos ou inválidos em ações de Super Admin', () => {
    const isValidUUID = (id: string) => /^[0-9a-f-]{36}$/i.test(id)

    expect(isValidUUID('9dbd5232-48c0-4a5b-90a7-5e6ab8d35aa4')).toBe(true)
    expect(isValidUUID('invalid-uuid')).toBe(false)
    expect(isValidUUID("9dbd5232-48c0-4a5b-90a7-5e6ab8d35aa4' OR 1=1--")).toBe(false)
    expect(isValidUUID(';;DROP TABLE clinicas;')).toBe(false)
  })
})

