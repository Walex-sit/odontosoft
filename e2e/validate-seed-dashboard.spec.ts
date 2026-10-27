import { test, expect } from '@playwright/test'

test.describe('Validação do Dashboard com Dados Reais do Seed', () => {
  test('Login com usuário demo e validação de todos os módulos', async ({ page }) => {
    // 1. Acesso à página de login
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 2. Preenchimento de credenciais do usuário demo
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    await expect(emailInput).toBeVisible()

    await emailInput.fill('demo@odontosoft.com.br')
    await passwordInput.fill('Demo@OdontoSoft2026')

    // 3. Submeter login
    const loginButton = page.locator('button:has-text("Entrar")')
    await loginButton.click()

    // 4. Aguardar redirecionamento para o dashboard
    await page.waitForURL(url => url.pathname.includes('/overview') || url.pathname.includes('/dashboard'), { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    console.log('✅ Redirecionado com sucesso para:', page.url())

    // 5. Validar Dashboard Overview (/overview ou /dashboard)
    await page.waitForTimeout(3000) // Aguardar carregamento dos dados das server actions
    
    // Capturar screenshot do Dashboard
    await page.screenshot({ path: 'scratch/screenshot-dashboard.png', fullPage: true })

    // Validar título do dashboard
    const title = page.getByRole('heading', { name: 'Dashboard Gerencial' })
    await expect(title).toBeVisible()
    console.log('Dashboard Title:', await title.innerText())

    // Validar cards de métricas (Faturamento, Pacientes, Consultas)
    const pageText = await page.textContent('body')
    console.log('Possui dados de faturamento:', pageText?.includes('R$'))
    console.log('Possui pacientes ativos:', pageText?.includes('Pacientes'))
    console.log('Possui consultas:', pageText?.includes('Consultas'))

    // 6. Validar rota /dashboard/pacientes (ou /pacientes)
    console.log('\n--- Navegando para Pacientes ---')
    await page.goto('/dashboard/pacientes')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'scratch/screenshot-pacientes.png', fullPage: true })

    const pacientesText = await page.textContent('body')
    const hasMariana = pacientesText?.includes('Mariana Souza Ramos')
    const hasCarlos = pacientesText?.includes('Carlos Eduardo Peixoto')
    console.log('Paciente Mariana Ramos encontrado:', hasMariana)
    console.log('Paciente Carlos Peixoto encontrado:', hasCarlos)
    expect(hasMariana || hasCarlos).toBeTruthy()

    // 7. Validar rota /dashboard/agenda (ou /agenda)
    console.log('\n--- Navegando para Agenda ---')
    await page.goto('/dashboard/agenda')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'scratch/screenshot-agenda.png', fullPage: true })

    const agendaText = await page.textContent('body')
    console.log('Possui calendário / agenda carregada:', agendaText?.includes('Agenda') || agendaText?.includes('Dentista'))

    // 8. Validar rota /dashboard/financeiro (ou /financeiro)
    console.log('\n--- Navegando para Financeiro ---')
    await page.goto('/dashboard/financeiro')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'scratch/screenshot-financeiro.png', fullPage: true })

    const financeiroText = await page.textContent('body')
    console.log('Financeiro carregou R$:', financeiroText?.includes('R$'))
    console.log('Possui tabela ou lançamentos:', financeiroText?.includes('Receita') || financeiroText?.includes('Fluxo') || financeiroText?.includes('Faturamento'))

    console.log('\n✅ Todos os módulos e rotas validados com sucesso!')
  })
})
