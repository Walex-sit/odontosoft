import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession, DEFAULT_DENTISTA_USER } from './helpers/auth'

/**
 * e2e/prontuario-imutabilidade.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fluxo 2: Gestão do Prontuário Clínico e Imutabilidade (Resolução CFO 198/2019).
 * ─────────────────────────────────────────────────────────────────────────────
 */

test.describe('Fluxo 2 — Prontuário Clínico e Regras de Imutabilidade CFO', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, DEFAULT_DENTISTA_USER)

    await page.route('**/rest/v1/pacientes*', async route => {
      const url = route.request().url()
      const acceptHeader = route.request().headers()['accept'] || ''
      const isSingle = acceptHeader.includes('vnd.pgrst.object+json') || url.includes('id=eq.')

      const pacienteData = {
        id: 'paciente-prontuario-002',
        nome: 'Mariana Lima de Oliveira',
        telefone: '11912345678',
        // CPF armazenado como hash SHA-256 (pós-migração LGPD — nunca em plaintext)
        cpf_hash: 'a3f5c7e9b1d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4',
        cpf_encrypted: null,
        email: 'mariana.lima@email.com',
        created_at: '2026-08-15T09:00:00.000Z',
        lgpd_aceite: true,
        lgpd_aceite_em: '2026-08-15T09:30:00.000Z',
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
            paciente_id: 'paciente-prontuario-002',
            paciente_nome: 'Mariana Lima de Oliveira',
            clinica_id: 'clinica-alfa-001',
            tipo_termo: 'LGPD',
            versao_termo: '2024.1',
            consentimento_id: 'consentimento-002',
            status: 'ativo',
            manifestado_em: '2026-08-15T09:30:00.000Z',
            revogado_em: null,
            meio: 'eletronico_interno',
            responsavel_nome: null,
            responsavel_tipo: 'proprio_paciente',
            finalidades: { whatsapp: true, email_marketing: true },
            possui_evidencia: true,
            registrado_em: '2026-08-15T09:30:00.000Z',
          },
        ]),
      })
    })

    await page.route('**/rest/v1/evolucao*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'evolucao-003',
              paciente_id: 'paciente-prontuario-002',
              data_evolucao: new Date().toISOString().split('T')[0],
              descricao: 'Ajuste oclusal e checagem de restauração prévia.',
              created_at: new Date().toISOString(),
            },
          ]),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'evolucao-001',
              paciente_id: 'paciente-prontuario-002',
              data_evolucao: '2026-08-20',
              descricao: 'Restauração em resina composta no elemento 16 (oclusal-mesial). Anestesia local sem intercorrências.',
              created_at: '2026-08-20T15:00:00.000Z',
            },
            {
              id: 'evolucao-002',
              paciente_id: 'paciente-prontuario-002',
              data_evolucao: '2026-08-27',
              descricao: 'Profilaxia e aplicação tópica de flúor. Tecidos gengivais sadios, ausência de sangramento.',
              created_at: '2026-08-27T10:00:00.000Z',
            },
          ]),
        })
      }
    })
  })

  test('deve acessar a aba de Prontuário e exibir a linha do tempo de evoluções', async ({ page }) => {
    await page.goto('/pacientes/paciente-prontuario-002', { waitUntil: 'domcontentloaded' })

    // Localiza e clica na aba Prontuário
    const abaProntuario = page.locator('button:has-text("Prontuário")')
    await expect(abaProntuario).toBeVisible({ timeout: 20000 })
    await abaProntuario.click()

    // Verifica contador e lista de evoluções clínicas
    await expect(page.locator('text=Evoluções Clínicas')).toBeVisible()
    await expect(page.locator('text=Restauração em resina composta no elemento 16')).toBeVisible()
    await expect(page.locator('text=Profilaxia e aplicação tópica de flúor')).toBeVisible()
  })

  test('deve abrir o modal e permitir a criação de uma nova evolução clínica', async ({ page }) => {
    await page.goto('/pacientes/paciente-prontuario-002', { waitUntil: 'domcontentloaded' })

    // Clica na aba Prontuário
    const abaProntuario = page.locator('button:has-text("Prontuário")')
    await expect(abaProntuario).toBeVisible({ timeout: 20000 })
    await abaProntuario.click()

    // Clica no botão "Nova Evolução"
    const btnNovaEvolucao = page.locator('button:has-text("Nova Evolução")')
    await expect(btnNovaEvolucao).toBeVisible()
    await btnNovaEvolucao.click()

    // Verifica abertura do modal de evolução clínica via data-testid ou role
    const modalEvolucao = page.locator('[data-testid="modal-nova-evolucao"], [role="dialog"]').first()
    await expect(modalEvolucao).toBeVisible()

    // Preenche campo de descrição
    const inputDescricao = page.locator('[data-testid="input-evolucao-descricao"], textarea#evo-descricao').first()
    await inputDescricao.fill('Ajuste oclusal e checagem de restauração prévia.')

    // Submete formulário
    const btnSalvar = page.locator('[data-testid="btn-salvar-evolucao"], button:has-text("Salvar Evolução")').first()
    await expect(btnSalvar).toBeEnabled()
    await btnSalvar.click()

    // Modal deve fechar após envio bem sucedido
    await expect(modalEvolucao).not.toBeVisible()
  })
})
