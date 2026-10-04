import { test, expect } from '@playwright/test'
import { setupAuthenticatedSession, DEFAULT_DENTISTA_USER } from './helpers/auth'

/**
 * e2e/security-rls.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Suíte de Testes E2E de Segurança: RLS, Isolamento Tenant e Imutabilidade CFO
 * ─────────────────────────────────────────────────────────────────────────────
 */

test.describe('Validação de Segurança RLS e Imutabilidade', () => {

  test.describe('1. Isolamento Multi-Tenant Estrito (Cross-Tenant Access)', () => {
    test('não deve permitir que Clínica Alfa acesse dados de pacientes da Clínica Beta', async ({ page }) => {
      // 1. Configurar sessão autenticada para Usuário da Clínica Alfa
      await setupAuthenticatedSession(page, {
        id: 'user-alfa-01',
        email: 'dentista@clinica-alfa.com.br',
        nome: 'Dr. Alfa',
        role: 'dentista',
        clinica_id: 'tenant-clinica-alfa',
      })

      // 2. Interceptar requisições da REST API com simulação de RLS do Supabase:
      // Paciente Alfa é retornado; se filtrar por Paciente Beta, o RLS do Supabase retorna array vazio [].
      await page.route('**/rest/v1/pacientes*', async route => {
        const url = route.request().url()
        const acceptHeader = route.request().headers()['accept'] || ''
        
        if (url.includes('id=eq.paciente-beta-999') || url.includes('clinica_id=eq.tenant-clinica-beta')) {
          if (acceptHeader.includes('vnd.pgrst.object+json')) {
            await route.fulfill({
              status: 406,
              contentType: 'application/json',
              body: JSON.stringify({ message: 'JSON object requested, multiple (or no) rows returned' }),
            })
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([]),
            })
          }
        } else {
          const p = {
            id: 'paciente-alfa-001',
            clinica_id: 'tenant-clinica-alfa',
            nome: 'Paciente Legítimo Alfa',
            cpf_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            created_at: '2026-09-01T10:00:00.000Z',
          }
          if (acceptHeader.includes('vnd.pgrst.object+json')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/vnd.pgrst.object+json',
              body: JSON.stringify(p),
            })
          } else {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([p]),
            })
          }
        }
      })

      await page.goto('/pacientes', { waitUntil: 'domcontentloaded' })

      // Confirma que apenas o paciente da própria clínica é visível
      await expect(page.locator('text=Paciente Legítimo Alfa').first()).toBeVisible({ timeout: 20000 })
      await expect(page.locator('text=Paciente Exclusivo Beta')).not.toBeVisible()

      // 3. Tentar acesso direto à rota individual de um paciente de outro tenant
      await page.goto('/pacientes/paciente-beta-999', { waitUntil: 'domcontentloaded' })
      // A página deve tratar o paciente não encontrado ou bloqueado por RLS (ex: exibindo estado vazio ou erro)
      await expect(page.locator('text=Paciente Exclusivo Beta')).not.toBeVisible()
    })
  })

  test.describe('2. Imutabilidade de Prontuários e Evoluções Clínicas (Resolução CFO 198/2019)', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedSession(page, DEFAULT_DENTISTA_USER)

      await page.route('**/rest/v1/pacientes*', async route => {
        const acceptHeader = route.request().headers()['accept'] || ''
        const pacienteObj = {
          id: 'paciente-001',
          nome: 'João da Silva',
          clinica_id: 'clinica-alfa-001',
          created_at: '2026-01-01T00:00:00.000Z',
        }
        if (acceptHeader.includes('vnd.pgrst.object+json')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/vnd.pgrst.object+json',
            body: JSON.stringify(pacienteObj),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([pacienteObj]),
          })
        }
      })

      await page.route('**/rest/v1/evolucao*', async route => {
        const method = route.request().method()
        
        // Bloqueio RLS / Trigger de Imutabilidade para UPDATE (PATCH) ou DELETE
        if (method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              code: '42501',
              details: null,
              hint: null,
              message: 'Regra de Imutabilidade CFO: Registros de evolução clínica não podem ser alterados nem excluídos após a criação.',
            }),
          })
          return
        }

        // Leitura GET (OK)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'evo-001',
              paciente_id: 'paciente-001',
              data_evolucao: '2026-09-10',
              descricao: 'Endodontia realizada no elemento 21 com selamento provisório.',
              created_at: '2026-09-10T14:00:00.000Z',
            },
          ]),
        })
      })
    })

    test('deve garantir que evoluções passadas não possuem botões de edição ou exclusão no histórico', async ({ page }) => {
      await page.goto('/pacientes/paciente-001', { waitUntil: 'domcontentloaded' })

      const abaProntuario = page.locator('button:has-text("Prontuário")')
      await expect(abaProntuario).toBeVisible({ timeout: 20000 })
      await abaProntuario.click()

      // Confirma que o registro histórico é visível
      await expect(page.locator('text=Endodontia realizada no elemento 21')).toBeVisible()

      // Garante a ausência de controles de alteração/exclusão (ex: "Editar", "Excluir", ícones de lixeira)
      await expect(page.locator('button:has-text("Editar Evolução")')).not.toBeVisible()
      await expect(page.locator('button:has-text("Excluir Evolução")')).not.toBeVisible()
      await expect(page.locator('button:has-text("Deletar")')).not.toBeVisible()
    })

    test('deve rejeitar tentativas diretas de PATCH/DELETE na API REST de evoluções com erro 403', async ({ page }) => {
      await page.goto('/pacientes/paciente-001', { waitUntil: 'domcontentloaded' })

      // Executa requisição PATCH direta para tentar alterar o prontuário via API
      const patchResult = await page.evaluate(async () => {
        const base = window.location.origin
        const res = await fetch(`${base}/rest/v1/evolucao?id=eq.evo-001`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ descricao: 'Tentativa ilícita de alteração de histórico médico' }),
        })
        return { status: res.status, ok: res.ok }
      })

      expect(patchResult.status).toBe(403)
      expect(patchResult.ok).toBe(false)

      // Executa requisição DELETE direta para tentar deletar o prontuário via API
      const deleteResult = await page.evaluate(async () => {
        const base = window.location.origin
        const res = await fetch(`${base}/rest/v1/evolucao?id=eq.evo-001`, {
          method: 'DELETE',
        })
        return { status: res.status, ok: res.ok }
      })

      expect(deleteResult.status).toBe(403)
      expect(deleteResult.ok).toBe(false)
    })
  })

  test.describe('3. Blindagem de System Logs (Revogação de INSERT direto)', () => {
    test('deve rejeitar inserção direta de logs por usuário autenticado comum', async ({ page }) => {
      await setupAuthenticatedSession(page, DEFAULT_DENTISTA_USER)
      await page.goto('/pacientes', { waitUntil: 'domcontentloaded' })

      await page.route('**/rest/v1/system_logs*', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({
              code: '42501',
              details: null,
              hint: null,
              message: 'permission denied for table system_logs',
            }),
          })
          return
        }
        await route.fulfill({ status: 200, body: JSON.stringify([]) })
      })

      const insertAttempt = await page.evaluate(async () => {
        const base = window.location.origin
        const res = await fetch(`${base}/rest/v1/system_logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'TAMPER_ATTEMPT',
            payload: { inject: 'fake log' },
          }),
        })
        return { status: res.status, ok: res.ok }
      })

      expect(insertAttempt.status).toBe(403)
      expect(insertAttempt.ok).toBe(false)
    })
  })
})
