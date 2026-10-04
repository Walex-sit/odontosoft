import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession, DEFAULT_ADMIN_USER } from './helpers/auth'

/**
 * e2e/auth-navigation.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de Rotas Protegidas, Redirecionamentos e Navegação Principal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

test.describe('Navegação e Rotas Canônicas', () => {
  test('deve redirecionar rotas legadas /patients para a rota canônica /pacientes', async ({ page }) => {
    await setupAuthenticatedSession(page, DEFAULT_ADMIN_USER)

    await page.route('**/rest/v1/pacientes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Acessa rota legada /patients
    await page.goto('/patients', { waitUntil: 'domcontentloaded' })

    // Deve redirecionar para /pacientes
    await expect(page).toHaveURL(/\/pacientes/, { timeout: 20000 })
  })

  test('deve redirecionar rota legada /patients/[id] para a rota canônica /pacientes/[id]', async ({ page }) => {
    await setupAuthenticatedSession(page, DEFAULT_ADMIN_USER)

    await page.route('**/rest/v1/pacientes*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'paciente-123',
          nome: 'Paciente Teste Canônico',
          telefone: '11999998888',
          cpf_hash: 'e2b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          cpf_encrypted: null,
          email: 'teste@paciente.com',
          created_at: '2026-09-01T12:00:00.000Z',
          lgpd_aceite: false,
          lgpd_aceite_em: null,
        }),
      })
    })

    await page.route('**/rest/v1/vw_conformidade_consentimentos*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Acessa rota legada /patients/paciente-123
    await page.goto('/patients/paciente-123', { waitUntil: 'domcontentloaded' })

    // Deve redirecionar para /pacientes/paciente-123
    await expect(page).toHaveURL(/\/pacientes\/paciente-123/, { timeout: 20000 })
  })
})
