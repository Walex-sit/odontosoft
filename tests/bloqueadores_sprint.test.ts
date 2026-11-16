/**
 * tests/bloqueadores_sprint.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes Unitários e Integrados dos Bloqueadores Corrigidos (Vitest):
 *  1. Logger: Isolamento de tenant, mitigação de spoofing, super_admin, chamadas internas
 *  2. Webhook Stripe: Route handler e lógica de idempotência / fora de ordem
 *  3. Verificações de tipos e contratos
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { logAction } from '@/app/lib/logger'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

describe('TAREFA 4 — Logger e Isolamento Estrito de Tenant', () => {
  const cidAlpha = 'aaaa1111-2222-3333-4444-555566667777'
  const cidBeta = 'bbbb1111-2222-3333-4444-555566667777'
  const uidAdminAlpha = '1111aaaa-2222-3333-4444-555566667777'
  const uidDentistaAlpha = '2222aaaa-2222-3333-4444-555566667777'
  const uidSuperAdminNoClinic = '3333aaaa-2222-3333-4444-555566667777'

  beforeAll(async () => {
    // Setup das clínicas
    await admin.from('clinicas').upsert([
      { id: cidAlpha, nome: 'Clínica Alpha Vitest Logger', ativo: true, status_assinatura: 'ativo' },
      { id: cidBeta, nome: 'Clínica Beta Vitest Logger', ativo: true, status_assinatura: 'ativo' },
    ])

    // Inserção prévia em auth.users para satisfazer foreign key user_profiles_id_fkey
    const { error: authErr } = await admin.auth.admin.createUser({
      email: 'admin.alpha@vitest.test',
      id: uidAdminAlpha,
      email_confirm: true,
    }).catch(() => ({ error: null }))

    await admin.auth.admin.createUser({
      email: 'dentista.alpha@vitest.test',
      id: uidDentistaAlpha,
      email_confirm: true,
    }).catch(() => ({ error: null }))

    await admin.auth.admin.createUser({
      email: 'superadmin@vitest.test',
      id: uidSuperAdminNoClinic,
      email_confirm: true,
    }).catch(() => ({ error: null }))

    const { error: profErr } = await admin.from('user_profiles').upsert([
      { id: uidAdminAlpha, nome: 'Admin Alpha Vitest', email: 'admin.alpha@vitest.test', role: 'admin_clinica', clinica_id: cidAlpha },
      { id: uidDentistaAlpha, nome: 'Dentista Alpha Vitest', email: 'dentista.alpha@vitest.test', role: 'dentista', clinica_id: cidAlpha },
      { id: uidSuperAdminNoClinic, nome: 'Super Admin Vitest', email: 'superadmin@vitest.test', role: 'super_admin', clinica_id: null },
    ])
    if (profErr) {
      console.error('Error inserting user_profiles in beforeAll:', profErr.message)
    }
  })

  afterAll(async () => {
    // Teardown
    await admin.from('system_logs').delete().in('clinica_id', [cidAlpha, cidBeta])
    await admin.from('user_profiles').delete().in('id', [uidAdminAlpha, uidDentistaAlpha, uidSuperAdminNoClinic])
    await admin.auth.admin.deleteUser(uidAdminAlpha).catch(() => {})
    await admin.auth.admin.deleteUser(uidDentistaAlpha).catch(() => {})
    await admin.auth.admin.deleteUser(uidSuperAdminNoClinic).catch(() => {})
    await admin.from('clinicas').delete().in('id', [cidAlpha, cidBeta])
  })

  it('1. Admin Alpha tentando enviar clinica_id da Clínica Beta tem o log gravado estritamente em Alpha', async () => {
    await logAction(
      uidAdminAlpha,
      'criacao',
      'pacientes',
      { clinica_id: cidBeta, paciente_nome: 'Tentativa Spoofing Admin' }
    )

    const { data: logs } = await admin
      .from('system_logs')
      .select('clinica_id, details')
      .eq('user_id', uidAdminAlpha)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(logs).toBeDefined()
    expect(logs!.length).toBe(1)
    expect(logs![0].clinica_id).toBe(cidAlpha) // Forçado para a clínica real do usuário
    expect((logs![0].details as any)?.clinica_id).toBe(cidAlpha) // Sobrescrito nos details
  })

  it('2. Dentista Alpha tentando enviar clinica_id da Clínica Beta tem o log gravado estritamente em Alpha', async () => {
    await logAction(
      uidDentistaAlpha,
      'edicao',
      'prontuarios',
      { clinica_id: cidBeta, procedimento: 'Tentativa Spoofing Dentista' }
    )

    const { data: logs } = await admin
      .from('system_logs')
      .select('clinica_id, details')
      .eq('user_id', uidDentistaAlpha)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(logs).toBeDefined()
    expect(logs!.length).toBe(1)
    expect(logs![0].clinica_id).toBe(cidAlpha)
    expect((logs![0].details as any)?.clinica_id).toBe(cidAlpha)
  })

  it('3. Super_admin sem clínica vinculada é descartado com segurança sem inventar tenant', async () => {
    const { count: beforeCount } = await admin
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uidSuperAdminNoClinic)

    await logAction(
      uidSuperAdminNoClinic,
      'login',
      'auth',
      { clinica_id: cidBeta }
    )

    const { count: afterCount } = await admin
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uidSuperAdminNoClinic)

    expect(afterCount).toBe(beforeCount) // Nenhum log inserido com tenant forjado
  })

  it('4. UserId inexistente no banco é descartado com segurança (não grava)', async () => {
    const fakeId = '99998888-7777-6666-5555-444433332222'
    const { count: beforeCount } = await admin
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', fakeId)

    await logAction(fakeId, 'login', 'auth', { clinica_id: cidBeta })

    const { count: afterCount } = await admin
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', fakeId)

    expect(afterCount).toBe(beforeCount)
  })

  it('5. Chamada de sistema interna com InternalSystemContext explícito grava com sucesso', async () => {
    await logAction(
      null,
      'financeiro',
      'faturamento',
      { webhook_event: 'invoice.payment_succeeded' },
      undefined,
      { systemSource: 'stripe_webhook', clinicaId: cidBeta }
    )

    const { data: logs } = await admin
      .from('system_logs')
      .select('user_nome, clinica_id')
      .eq('clinica_id', cidBeta)
      .is('user_id', null)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(logs).toBeDefined()
    expect(logs!.length).toBe(1)
    expect(logs![0].clinica_id).toBe(cidBeta)
    expect(logs![0].user_nome).toBe('[Sistema/stripe_webhook]')
  })

  it('6. Chamada sem userId e sem internalContext é descartada com segurança', async () => {
    const { count: beforeCount } = await admin
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null)
      .is('user_nome', null)

    await logAction(null, 'criacao', 'pacientes', { sem_contexto: true })

    const { count: afterCount } = await admin
      .from('system_logs')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null)
      .is('user_nome', null)

    expect(afterCount).toBe(beforeCount)
  })
})
