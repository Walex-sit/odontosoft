import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { supabaseAdmin } from '@/app/lib/supabase/admin'

describe('ITEM 15 — TRIAL GUARD COM O proxy.ts REAL', () => {
  const clinicaExpiradaId = '55555555-5555-5555-5555-555555555555'
  const emailExpirado = `expirado_${Date.now()}@trialguard.com`
  let sessionCookieHeader = ''
  let createdUserId = ''

  beforeAll(async () => {
    // 1. Criar clínica com trial expirado (expirou há 2 dias)
    await supabaseAdmin.from('clinicas').upsert({
      id: clinicaExpiradaId,
      nome: 'Clínica Trial Expirado Test',
      ativo: true,
      status_assinatura: 'trial',
      trial_ends_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // 2. Criar usuário com senha fixa no auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: emailExpirado,
      password: 'Password123!',
      email_confirm: true,
    })

    if (!userData?.user) {
      throw new Error('Falha ao criar usuário de teste no auth: ' + userError?.message)
    }

    createdUserId = userData.user.id

    // 3. Vincular perfil à clínica expirada
    await supabaseAdmin.from('user_profiles').upsert({
      id: createdUserId,
      email: emailExpirado,
      nome: 'Dr. Expirado',
      role: 'admin_clinica',
      clinica_id: clinicaExpiradaId,
      is_lifetime: false,
    })

    // 4. Efetuar login com createServerClient para capturar os cookies SSR exatos
    const { createServerClient } = await import('@supabase/ssr')
    const authCookies: { name: string; value: string }[] = []
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return authCookies
          },
          setAll(cookies) {
            cookies.forEach(c => authCookies.push({ name: c.name, value: c.value }))
          },
        },
      }
    )

    await client.auth.signInWithPassword({
      email: emailExpirado,
      password: 'Password123!',
    })

    sessionCookieHeader = authCookies.map(c => `${c.name}=${c.value}`).join('; ')
  })

  afterAll(async () => {
    await supabaseAdmin.from('clinicas').delete().eq('id', clinicaExpiradaId)
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)
    }
  })

  function makeRequest(pathname: string) {
    const url = `http://localhost:3000${pathname}`
    const headers = new Headers()
    if (sessionCookieHeader) {
      headers.set('cookie', sessionCookieHeader)
    }
    return new NextRequest(url, { headers })
  }

  it('1. Deve bloquear /usuarios redirecionando para /trial-expirado', async () => {
    const req = makeRequest('/usuarios')
    const res = await proxy(req)
    console.log('[proxy test] /usuarios -> status:', res.status, 'location:', res.headers.get('location'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/trial-expirado')
  })

  it('2. Deve bloquear /fluxo-caixa redirecionando para /trial-expirado', async () => {
    const req = makeRequest('/fluxo-caixa')
    const res = await proxy(req)
    console.log('[proxy test] /fluxo-caixa -> status:', res.status, 'location:', res.headers.get('location'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/trial-expirado')
  })

  it('3. Deve PERMITIR acesso a /establishment/subscription para regularização de pagamento', async () => {
    const req = makeRequest('/establishment/subscription')
    const res = await proxy(req)
    console.log('[proxy test] /establishment/subscription -> status:', res.status, 'location:', res.headers.get('location'))
    // Não deve redirecionar para /trial-expirado
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('4. Deve acessar /trial-expirado sem loop de redirecionamento', async () => {
    const req = makeRequest('/trial-expirado')
    const res = await proxy(req)
    console.log('[proxy test] /trial-expirado -> status:', res.status, 'location:', res.headers.get('location'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })
})
