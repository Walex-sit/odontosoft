import { Page } from '@playwright/test'

export interface MockUserConfig {
  id: string
  email: string
  nome: string
  role: 'admin' | 'dentista' | 'recepcao' | 'financeiro'
  clinica_id: string
}

export const DEFAULT_ADMIN_USER: MockUserConfig = {
  id: 'user-admin-123',
  email: 'admin@odontosoft.com.br',
  nome: 'Dra. Administradora',
  role: 'admin',
  clinica_id: 'clinica-alfa-001',
}

export const DEFAULT_DENTISTA_USER: MockUserConfig = {
  id: 'user-dentista-456',
  email: 'dentista@odontosoft.com.br',
  nome: 'Dr. Roberto Santos',
  role: 'dentista',
  clinica_id: 'clinica-alfa-001',
}

/**
 * Segredo partilhado entre o helper E2E e o proxy (middleware).
 * Deve coincidir com E2E_AUTH_SECRET no .env.local.
 *
 * Nota de segurança: este segredo circula apenas entre processos locais
 * e nunca chega ao banco de dados nem ao Supabase. Em produção,
 * E2E_TEST_MODE=true nunca está definido, portanto o bypass está inativo.
 */
const E2E_AUTH_SECRET = 'e2e-odontosaas-local-bypass-secret-2026'

/**
 * Injeta a sessão de autenticação diretamente no browser E interceta todas
 * as rotas relevantes do Supabase para que os Server Components funcionem
 * com dados simulados.
 *
 * O mecanismo de bypass no proxy.ts resolve o problema de o Playwright não
 * conseguir interceptar chamadas HTTP server-side (middleware → Supabase Auth).
 */
export async function setupAuthenticatedSession(page: Page, user: MockUserConfig = DEFAULT_ADMIN_USER) {
  const session = {
    access_token: 'fake-jwt-e2e-access-token',
    refresh_token: 'fake-e2e-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      app_metadata: { provider: 'email' },
      user_metadata: { nome: user.nome },
      created_at: '2026-01-01T00:00:00.000Z',
    },
  }

  // ── Intercepta rotas REST do Supabase Auth ────────────────────────────────
  await page.route('**/auth/v1/user', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    })
  })

  await page.route('**/auth/v1/session', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })

  await page.route('**/auth/v1/token*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })

  // ── Intercepta perfil no user_profiles ───────────────────────────────────
  await page.route('**/rest/v1/user_profiles*', async route => {
    const profile = {
      id: user.id,
      clinica_id: user.clinica_id,
      nome: user.nome,
      role: user.role,
    }
    const acceptHeader = route.request().headers()['accept'] || ''
    if (acceptHeader.includes('vnd.pgrst.object+json')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.pgrst.object+json',
        body: JSON.stringify(profile),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([profile]),
      })
    }
  })

  // ── Intercepta clinicas e settings caso a Topbar ou layout carregue ───────
  await page.route('**/rest/v1/clinicas*', async route => {
    const clinica = {
      id: user.clinica_id,
      nome: 'Clínica OdontoSoft Exemplo',
      plano: 'profissional',
      ativo: true,
    }
    const acceptHeader = route.request().headers()['accept'] || ''
    if (acceptHeader.includes('vnd.pgrst.object+json')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.pgrst.object+json',
        body: JSON.stringify(clinica),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([clinica]),
      })
    }
  })

  await page.route('**/rest/v1/clinica_settings*', async route => {
    const setting = {
      id: 'settings-001',
      clinica_id: user.clinica_id,
      nome: 'Clínica OdontoSoft Exemplo',
      nome_exibido: 'OdontoSoft Dental Care',
    }
    const acceptHeader = route.request().headers()['accept'] || ''
    if (acceptHeader.includes('vnd.pgrst.object+json')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.pgrst.object+json',
        body: JSON.stringify(setting),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([setting]),
      })
    }
  })

  // ── Injeta cookie do Supabase SSR (para clientes browser) ────────────────
  const sessionStr = JSON.stringify(session)
  const base64Session = Buffer.from(sessionStr).toString('base64')
  const cookieValue = `base64-${base64Session}`

  await page.context().addCookies([
    {
      name: 'sb-jabtmplfjwtrfzwlwjax-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'sb-auth-token',
      value: cookieValue,
      domain: 'localhost',
      path: '/',
    },
  ])

  // ── Injeta no localStorage e document.cookie antes do carregamento ────────
  await page.addInitScript(({ sStr, cVal }) => {
    try {
      localStorage.setItem('sb-jabtmplfjwtrfzwlwjax-auth-token', sStr)
      localStorage.setItem('supabase.auth.token', sStr)
      document.cookie = `sb-jabtmplfjwtrfzwlwjax-auth-token=${cVal}; path=/; max-age=3600`
      document.cookie = `sb-auth-token=${cVal}; path=/; max-age=3600`
    } catch {}
  }, { sStr: sessionStr, cVal: cookieValue })

  // ── Bypass do middleware (proxy.ts) ───────────────────────────────────────
  // O middleware Next.js executa server-side — o Playwright não intercepta
  // as chamadas HTTP que ele faz para o Supabase Auth. Para contornar isso,
  // injetamos o header x-e2e-bypass-auth em todas as requisições de navegação.
  // O proxy.ts verifica E2E_TEST_MODE=true + o segredo e libera sem JWT.
  await page.setExtraHTTPHeaders({
    'x-e2e-bypass-auth': E2E_AUTH_SECRET,
  })
}
