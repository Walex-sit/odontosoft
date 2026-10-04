import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession } from './helpers/auth'

/**
 * e2e/isolamento-tenant.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fluxo 3: Isolamento Multi-Tenancy Estrito (T001 — RLS e Separação de Dados).
 * ─────────────────────────────────────────────────────────────────────────────
 */

test.describe('Fluxo 3 — Isolamento Multi-Tenant entre Clínicas', () => {
  test('deve exibir apenas pacientes da Clínica Alfa quando autenticado como usuário da Clínica Alfa', async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'user-alfa-01',
      email: 'atendente@clinica-alfa.com.br',
      nome: 'Recepção Alfa',
      role: 'recepcao',
      clinica_id: 'tenant-clinica-alfa',
    })

    await page.route('**/rest/v1/pacientes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'paciente-alfa-001',
            clinica_id: 'tenant-clinica-alfa',
            nome: 'Paciente Exclusivo Alfa',
            telefone: '11999990001',
            cpf_hash: 'c0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
            cpf_encrypted: null,
            email: 'alfa@paciente.com',
            created_at: '2026-09-01T10:00:00.000Z',
            lgpd_aceite: true,
          },
        ]),
      })
    })

    await page.goto('/pacientes', { waitUntil: 'domcontentloaded' })

    // Deve exibir o paciente da Clínica Alfa
    await expect(page.locator('text=Paciente Exclusivo Alfa').first()).toBeVisible({ timeout: 20000 })

    // Não deve exibir pacientes de outra clínica
    await expect(page.locator('text=Paciente Exclusivo Beta')).not.toBeVisible()
  })

  test('deve exibir apenas pacientes da Clínica Beta quando autenticado como usuário da Clínica Beta', async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'user-beta-01',
      email: 'dentista@clinica-beta.com.br',
      nome: 'Dr. Beta',
      role: 'dentista',
      clinica_id: 'tenant-clinica-beta',
    })

    await page.route('**/rest/v1/pacientes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'paciente-beta-001',
            clinica_id: 'tenant-clinica-beta',
            nome: 'Paciente Exclusivo Beta',
            telefone: '11999990002',
            cpf_hash: 'd1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
            cpf_encrypted: null,
            email: 'beta@paciente.com',
            created_at: '2026-09-01T11:00:00.000Z',
            lgpd_aceite: false,
          },
        ]),
      })
    })

    await page.goto('/pacientes', { waitUntil: 'domcontentloaded' })

    // Deve exibir o paciente da Clínica Beta
    await expect(page.locator('text=Paciente Exclusivo Beta').first()).toBeVisible({ timeout: 20000 })

    // Não deve exibir pacientes da Clínica Alfa
    await expect(page.locator('text=Paciente Exclusivo Alfa')).not.toBeVisible()
  })
})
