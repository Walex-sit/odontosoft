import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession, DEFAULT_ADMIN_USER } from './helpers/auth'

/**
 * e2e/cadastro-lgpd.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fluxo 1: Autenticação, Cadastro de Paciente e Gestão Granular de LGPD.
 * ─────────────────────────────────────────────────────────────────────────────
 */

test.describe('Fluxo 1 — Cadastro de Paciente e Consentimento LGPD', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, DEFAULT_ADMIN_USER)

    await page.route('**/rest/v1/pacientes*', async route => {
      const url = route.request().url()
      const acceptHeader = route.request().headers()['accept'] || ''
      const isSingle = acceptHeader.includes('vnd.pgrst.object+json') || url.includes('id=eq.')

      const pacienteData = {
        id: 'paciente-teste-lgpd-001',
        nome: 'Carlos Eduardo Santos',
        telefone: '11987654321',
        // CPF armazenado como hash SHA-256 (pós-migração LGPD — nunca em plaintext)
        cpf_hash: 'b94d27b9934d3e08a52e52d7da7dabfac484efe04294e576ac5a2c7b3a7c5a1f',
        cpf_encrypted: null,
        email: 'carlos.santos@email.com',
        created_at: '2026-09-01T12:00:00.000Z',
        lgpd_aceite: true,
        lgpd_aceite_em: '2026-09-01T14:30:00.000Z',
      }

      if (isSingle) {
        await route.fulfill({
          status: 200,
          contentType: 'application/vnd.pgrst.object+json',
          body: JSON.stringify(pacienteData),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([pacienteData]),
        })
      }
    })

    await page.route('**/rest/v1/vw_conformidade_consentimentos*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            paciente_id: 'paciente-teste-lgpd-001',
            paciente_nome: 'Carlos Eduardo Santos',
            clinica_id: 'clinica-alfa-001',
            tipo_termo: 'LGPD',
            versao_termo: '2024.1',
            consentimento_id: 'consentimento-001',
            status: 'ativo',
            manifestado_em: '2026-09-01T14:30:00.000Z',
            revogado_em: null,
            meio: 'eletronico_interno',
            responsavel_nome: null,
            responsavel_tipo: 'proprio_paciente',
            finalidades: {
              whatsapp: true,
              email_marketing: true,
              imagens_redes_sociais: false,
              compartilhamento_plano_saude: true,
              pesquisa_clinica: false,
            },
            possui_evidencia: true,
            registrado_em: '2026-09-01T14:30:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/termos_privacidade*', async route => {
      const termo = {
        id: 'termo-lgpd-2024-1',
        clinica_id: 'clinica-alfa-001',
        tipo: 'LGPD',
        versao: '2024.1',
        texto_hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        publicado_em: '2026-01-01T00:00:00.000Z',
        ativo: true,
      }
      const acceptHeader = route.request().headers()['accept'] || ''
      if (acceptHeader.includes('vnd.pgrst.object+json')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/vnd.pgrst.object+json',
          body: JSON.stringify(termo),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([termo]),
        })
      }
    })
  })

  test('deve renderizar a tela de login com formulário e ilustrações', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="E-mail" i]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('button:has-text("Entrar")')).toBeVisible()
  })

  test('deve exibir listagem de pacientes e permitir navegação para a ficha clínica', async ({ page }) => {
    await page.goto('/pacientes', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('text=Carlos Eduardo Santos').first()).toBeVisible({ timeout: 20000 })
  })

  test('deve exibir a aba de Privacidade & LGPD com status dinâmico e finalidades granulares', async ({ page }) => {
    await page.goto('/pacientes/paciente-teste-lgpd-001', { waitUntil: 'domcontentloaded' })

    // Verifica cabeçalho e badge LGPD
    await expect(page.locator('text=Carlos Eduardo Santos').first()).toBeVisible({ timeout: 20000 })
    await expect(page.locator('text=Conforme LGPD (v2024.1)').first()).toBeVisible()

    // Clica na aba Privacidade & LGPD
    const abaPrivacidade = page.locator('button:has-text("Privacidade & LGPD")')
    await expect(abaPrivacidade).toBeVisible()
    await abaPrivacidade.click()

    // Verifica o card de status detalhado
    await expect(page.locator('text=Gestão de Privacidade & Conformidade LGPD')).toBeVisible()
    await expect(page.locator('text=Termo LGPD — Versão 2024.1')).toBeVisible()
    await expect(page.locator('text=Status: ativo')).toBeVisible()

    // Verifica o grid de finalidades granulares
    await expect(page.locator('text=Lembretes e Avisos via WhatsApp')).toBeVisible()
    await expect(page.locator('text=E-mails e Documentos Digitais')).toBeVisible()
    await expect(page.locator('text=Uso de Imagens Clínicas (Antes/Depois)')).toBeVisible()
    await expect(page.locator('text=Compartilhamento com Convênios / Planos')).toBeVisible()
  })

  test('deve abrir o modal de registro/atualização de consentimento LGPD', async ({ page }) => {
    await page.goto('/pacientes/paciente-teste-lgpd-001', { waitUntil: 'domcontentloaded' })

    // Localiza e clica no botão de registro/atualização
    const btnLgpd = page.locator('button:has-text("Atualizar Aceite LGPD"), button:has-text("Registrar Aceite LGPD")').first()
    await expect(btnLgpd).toBeVisible({ timeout: 20000 })
    await btnLgpd.click()

    // Verifica elementos do modal
    await expect(page.locator('text=Registro de Consentimento LGPD & TCLE')).toBeVisible()
    await expect(page.locator('text=Termo LGPD (v2024.1)').first()).toBeVisible()
    await expect(page.locator('text=Manifestado Por')).toBeVisible()
    await expect(page.locator('text=Meio de Coleta')).toBeVisible()
    await expect(page.locator('text=Finalidades Específicas Autorizadas').first()).toBeVisible()

    // Fecha modal
    await page.locator('[data-testid="btn-cancelar-consentimento"], button:has-text("Cancelar")').first().click()
    await expect(page.locator('text=Registro de Consentimento LGPD & TCLE')).not.toBeVisible()
  })
})
