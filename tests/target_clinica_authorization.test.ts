/**
 * tests/target_clinica_authorization.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes de Segurança de Autorização: Parâmetro targetClinicaId
 *
 * Validações obrigatórias:
 * 1. Usuários comuns nunca conseguem consultar ou modificar outra clínica alterando targetClinicaId.
 * 2. Super Admin só consegue operar sobre uma clínica quando sua identidade global é validada no servidor e existe contexto autorizado.
 * 3. O contexto não depende exclusivamente de dados enviados pelo cliente.
 * 4. RLS e verificações server-side continuam preservadas.
 * 5. Não existe possibilidade de IDOR ou acesso cruzado entre clínicas.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAuthorizedClinicId } from '@/app/lib/auth-guards'

describe('Segurança de Autorização do Parâmetro targetClinicaId', () => {
  const cidPropria = '11111111-1111-4111-a111-111111111111'
  const cidAlvoIdor = '22222222-2222-4222-a222-222222222222'
  const cidContextoAutorizado = '33333333-3333-4333-a333-333333333333'

  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    }
  })

  // ─── 1. Usuários comuns ───────────────────────────────────────────────────

  it('1.1 Usuário comum (admin_clinica) tentando IDOR com targetClinicaId de outra clínica é estritamente mantido em sua própria clínica', async () => {
    const user = { id: 'user-admin-1' }
    const profile = { clinica_id: cidPropria, role: 'admin_clinica' }

    // O atacante envia targetClinicaId apontando para outra clínica
    const res = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidAlvoIdor)

    // O targetClinicaId é completamente ignorado; a clínica retornada é estritamente a do perfil
    expect(res.clinicaId).toBe(cidPropria)
    expect(res.error).toBeUndefined()
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
  })

  it('1.2 Usuário comum (dentista) tentando IDOR com targetClinicaId de outra clínica é estritamente mantido em sua própria clínica', async () => {
    const user = { id: 'user-dentista-1' }
    const profile = { clinica_id: cidPropria, role: 'dentista' }

    const res = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidAlvoIdor)

    expect(res.clinicaId).toBe(cidPropria)
    expect(res.error).toBeUndefined()
  })

  it('1.3 Usuário comum sem clínica vinculada (clinica_id = null) NÃO consegue atribuir clínica via targetClinicaId', async () => {
    const user = { id: 'user-sem-clinica' }
    const profile = { clinica_id: null, role: 'dentista' }

    const res = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidAlvoIdor)

    expect(res.clinicaId).toBeNull()
    expect(res.error).toBeUndefined()
  })

  // ─── 2 e 3. Super Admin e Dependência de Contexto do Servidor ─────────────

  it('2.1 Super Admin sem contexto autorizado no servidor é BLOQUEADO mesmo se o cliente enviar targetClinicaId', async () => {
    const user = { id: 'user-super-admin' }
    const profile = { clinica_id: null, role: 'super_admin' }

    // Servidor retorna que não há contexto ativo (get_super_admin_context retorna vazio)
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    // Cliente tenta forçar targetClinicaId
    const res = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidAlvoIdor)

    // Não deve aceitar o targetClinicaId forjado pelo cliente
    expect(res.clinicaId).toBeNull()
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_super_admin_context')
  })

  it('3.1 O contexto do Super Admin é validado exclusivamente no servidor via get_super_admin_context', async () => {
    const user = { id: 'user-super-admin' }
    const profile = { clinica_id: null, role: 'super_admin' }

    // Servidor possui contexto ativo autorizado para cidContextoAutorizado
    mockSupabase.rpc.mockResolvedValue({
      data: [{ clinica_id: cidContextoAutorizado, nome: 'Clínica Autorizada' }],
      error: null,
    })

    // Cliente chama enviando o mesmo ID autorizado
    const res = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidContextoAutorizado)

    expect(res.clinicaId).toBe(cidContextoAutorizado)
    expect(res.error).toBeUndefined()
  })

  it('3.2 Super Admin opera na clínica autorizada mesmo se o cliente omitir targetClinicaId', async () => {
    const user = { id: 'user-super-admin' }
    const profile = { clinica_id: null, role: 'super_admin' }

    mockSupabase.rpc.mockResolvedValue({
      data: [{ clinica_id: cidContextoAutorizado, nome: 'Clínica Autorizada' }],
      error: null,
    })

    // Cliente chama sem passar targetClinicaId
    const res = await resolveAuthorizedClinicId(mockSupabase, user, profile, undefined)

    expect(res.clinicaId).toBe(cidContextoAutorizado)
    expect(res.error).toBeUndefined()
  })

  // ─── 5. Prevenção contra IDOR e Acesso Cruzado ────────────────────────────

  it('5.1 Super Admin com contexto A no servidor tentando acessar clínica B via targetClinicaId é REJEITADO (Detecção de IDOR)', async () => {
    const user = { id: 'user-super-admin' }
    const profile = { clinica_id: null, role: 'super_admin' }

    // Servidor possui contexto ativo para cidContextoAutorizado
    mockSupabase.rpc.mockResolvedValue({
      data: [{ clinica_id: cidContextoAutorizado, nome: 'Clínica A' }],
      error: null,
    })

    // Cliente tenta injetar cidAlvoIdor (Clínica B) diferente do contexto ativo
    const res = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidAlvoIdor)

    expect(res.clinicaId).toBeNull()
    expect(res.error).toBe('Acesso negado: Contexto de clínica não autorizado.')
  })

  it('5.2 Fallback para tabela super_admin_clinic_contexts também valida rigorosamente o contexto do servidor', async () => {
    const user = { id: 'user-super-admin' }
    const profile = { clinica_id: null, role: 'super_admin' }

    // RPC falha/vazia, mas tabela possui o contexto
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { clinica_id: cidContextoAutorizado },
            error: null,
          }),
        }),
      }),
    })

    // Caso A: targetClinicaId divergente -> bloqueado
    const resIdor = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidAlvoIdor)
    expect(resIdor.clinicaId).toBeNull()
    expect(resIdor.error).toBe('Acesso negado: Contexto de clínica não autorizado.')

    // Caso B: targetClinicaId coincidente -> permitido
    const resOk = await resolveAuthorizedClinicId(mockSupabase, user, profile, cidContextoAutorizado)
    expect(resOk.clinicaId).toBe(cidContextoAutorizado)
    expect(resOk.error).toBeUndefined()
  })
})

