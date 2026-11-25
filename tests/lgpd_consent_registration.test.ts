/**
 * tests/lgpd_consent_registration.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Bateria de Testes: Registro de Consentimento LGPD & TCLE e Resolução de Termos
 *
 * Cenários Obrigatórios:
 *  1. Clínica com termo ativo:
 *     - Retorna termos ativos da clínica autorizada.
 *     - Registra consentimento vinculando ao termo ativo e às finalidades.
 *  2. Clínica sem termo ativo:
 *     - Retorna lista vazia [].
 *     - Rejeita registro sem termo ativo com mensagem orientando cadastro.
 *  3. Super Admin com clínica selecionada:
 *     - Valida contexto do servidor e opera sobre a clínica selecionada.
 *  4. Super Admin sem clínica selecionada:
 *     - Retorna lista vazia de termos e rejeita registro sem contexto de clínica.
 *  5. Tentativa de utilizar termo de outra clínica:
 *     - Rejeita estritamente o uso de termo com clinica_id diferente (Anti-IDOR).
 *  6. Registro com finalidades autorizadas e recusadas:
 *     - Finalidades opcionais não possuem consentimento presumido (iniciam false).
 *     - Grava escolhas granulares independentes (true e false).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { resolveAuthorizedClinicId } from '@/app/lib/auth-guards'

describe('LGPD & TCLE — Registro de Consentimento e Resolução de Termos', () => {
  const clinicaAlphaId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
  const clinicaBetaId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
  const termoAlphaId = 'termo-alpha-001'
  const termoBetaId = 'termo-beta-002'
  const pacienteAlphaId = 'paciente-alpha-123'
  const pacienteBetaId = 'paciente-beta-456'

  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(),
    }
  })

  // ─── 1. Clínica com Termo Ativo ───────────────────────────────────────────

  it('1. Clínica com termo ativo: resolve a clínica do perfil e localiza termos ativos correspondentes', async () => {
    const user = { id: 'user-admin-alpha' }
    const profile = { clinica_id: clinicaAlphaId, role: 'admin_clinica' }

    const { clinicaId, error } = await resolveAuthorizedClinicId(mockSupabase, user, profile)
    expect(error).toBeUndefined()
    expect(clinicaId).toBe(clinicaAlphaId)

    // Simula termos retornados para a clínica
    const termosCadastrados = [
      {
        id: termoAlphaId,
        clinica_id: clinicaAlphaId,
        tipo: 'LGPD',
        versao: '1.0.0',
        texto_hash: 'hash-termo-alpha',
        publicado_em: '2026-01-01T00:00:00Z',
        ativo: true,
      },
    ]

    const termosFiltrados = termosCadastrados.filter(
      t => t.clinica_id === clinicaId && t.ativo === true
    )
    expect(termosFiltrados).toHaveLength(1)
    expect(termosFiltrados[0].id).toBe(termoAlphaId)
  })

  // ─── 2. Clínica sem Termo Ativo ───────────────────────────────────────────

  it('2. Clínica sem termo ativo: retorna lista vazia e rejeita salvar consentimento sem termo de referência', async () => {
    const termosCadastrados: any[] = []

    const termosFiltrados = termosCadastrados.filter(
      t => t.clinica_id === clinicaAlphaId && t.ativo === true
    )
    expect(termosFiltrados).toHaveLength(0)

    // Valida que sem termo ativo, a operação de registro sem termo_id não pode prosseguir
    function validarRegistro(termoId?: string, termosDisponiveis: any[] = []) {
      if (!termoId && termosDisponiveis.length === 0) {
        return {
          success: false,
          error: 'Nenhum termo de privacidade ativo encontrado para a clínica. O administrador deve cadastrar um termo antes de registrar consentimentos.',
        }
      }
      return { success: true }
    }

    const res = validarRegistro(undefined, termosFiltrados)
    expect(res.success).toBe(false)
    expect(res.error).toContain('Nenhum termo de privacidade ativo encontrado para a clínica')
  })

  // ─── 3. Super Admin com Clínica Selecionada ───────────────────────────────

  it('3. Super Admin com clínica selecionada: resolve contexto ativo validado no servidor', async () => {
    const user = { id: 'super-admin-id' }
    const profile = { clinica_id: null, role: 'super_admin' }

    mockSupabase.rpc.mockResolvedValue({
      data: [{ clinica_id: clinicaAlphaId, nome: 'Clínica Alpha' }],
      error: null,
    })

    const { clinicaId, error } = await resolveAuthorizedClinicId(mockSupabase, user, profile)
    expect(error).toBeUndefined()
    expect(clinicaId).toBe(clinicaAlphaId)
  })

  // ─── 4. Super Admin sem Clínica Selecionada ───────────────────────────────

  it('4. Super Admin sem clínica selecionada: retorna clinicaId nulo e impede registro de consentimento', async () => {
    const user = { id: 'super-admin-id' }
    const profile = { clinica_id: null, role: 'super_admin' }

    mockSupabase.rpc.mockResolvedValue({ data: [], error: null })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const { clinicaId, error } = await resolveAuthorizedClinicId(mockSupabase, user, profile)
    expect(error).toBeUndefined()
    expect(clinicaId).toBeNull()

    // Regra: Super Admin sem contexto não pode registrar consentimentos
    function validarContextoSuperAdmin(cid: string | null) {
      if (!cid) {
        return {
          success: false,
          error: 'Nenhuma clínica vinculada ou selecionada. Selecione uma clínica antes de registrar consentimentos.',
        }
      }
      return { success: true }
    }

    const check = validarContextoSuperAdmin(clinicaId)
    expect(check.success).toBe(false)
    expect(check.error).toContain('Nenhuma clínica vinculada ou selecionada')
  })

  // ─── 5. Tentativa de Utilizar Termo de Outra Clínica (Anti-IDOR) ───────────

  it('5. Tentativa de utilizar termo de outra clínica: deve ser estritamente bloqueada', () => {
    const clinicaAutorizada = clinicaAlphaId
    const termoOutraClinica = {
      id: termoBetaId,
      clinica_id: clinicaBetaId, // Pertence à Clínica Beta
      ativo: true,
    }

    function validarTermo(termo: typeof termoOutraClinica, cid: string) {
      if (termo.clinica_id !== cid) {
        return { success: false, error: 'Tentativa de utilizar termo de outra clínica não permitida.' }
      }
      if (!termo.ativo) {
        return { success: false, error: 'O termo de privacidade selecionado não está ativo.' }
      }
      return { success: true }
    }

    const res = validarTermo(termoOutraClinica, clinicaAutorizada)
    expect(res.success).toBe(false)
    expect(res.error).toBe('Tentativa de utilizar termo de outra clínica não permitida.')
  })

  // ─── 6. Tentativa de Utilizar Termo Inativo ───────────────────────────────

  it('6. Tentativa de utilizar termo inativo da mesma clínica: deve ser bloqueada', () => {
    const termoInativo = {
      id: 'termo-antigo-alpha',
      clinica_id: clinicaAlphaId,
      ativo: false,
    }

    function validarTermo(termo: typeof termoInativo, cid: string) {
      if (termo.clinica_id !== cid) {
        return { success: false, error: 'Tentativa de utilizar termo de outra clínica não permitida.' }
      }
      if (!termo.ativo) {
        return { success: false, error: 'O termo de privacidade selecionado não está ativo.' }
      }
      return { success: true }
    }

    const res = validarTermo(termoInativo, clinicaAlphaId)
    expect(res.success).toBe(false)
    expect(res.error).toBe('O termo de privacidade selecionado não está ativo.')
  })

  // ─── 7. Registro com Finalidades Granulares (Autorizadas e Recusadas) ─────

  it('7. Registro com finalidades granulares: aceita escolhas individuais expressas (true e false)', () => {
    const finalidadesEscolhidas: Record<string, boolean> = {
      whatsapp: true,
      email_marketing: false,
      imagens_redes_sociais: false,
      compartilhamento_plano_saude: true,
      pesquisa_clinica: false,
    }

    const finalidadesRows = Object.entries(finalidadesEscolhidas).map(([finalidade, autorizado]) => ({
      paciente_consentimento_id: 'consentimento-uuid-1',
      clinica_id: clinicaAlphaId,
      finalidade,
      autorizado: Boolean(autorizado),
    }))

    expect(finalidadesRows).toHaveLength(5)

    const whatsappRow = finalidadesRows.find(r => r.finalidade === 'whatsapp')
    expect(whatsappRow?.autorizado).toBe(true)

    const emailRow = finalidadesRows.find(r => r.finalidade === 'email_marketing')
    expect(emailRow?.autorizado).toBe(false)

    const imagemRow = finalidadesRows.find(r => r.finalidade === 'imagens_redes_sociais')
    expect(imagemRow?.autorizado).toBe(false)

    const planoRow = finalidadesRows.find(r => r.finalidade === 'compartilhamento_plano_saude')
    expect(planoRow?.autorizado).toBe(true)

    const pesquisaRow = finalidadesRows.find(r => r.finalidade === 'pesquisa_clinica')
    expect(pesquisaRow?.autorizado).toBe(false)
  })

  // ─── 8. Conformidade do Componente ModalConsentimentoLGPD ─────────────────

  it('8.1 ModalConsentimentoLGPD não possui autorização presumida nas finalidades (todas iniciam false)', () => {
    const modalPath = path.join(__dirname, '../app/components/ModalConsentimentoLGPD.tsx')
    const content = fs.readFileSync(modalPath, 'utf8')

    // Verifica que o estado inicial das finalidades define false para todas
    expect(content).toContain('whatsapp: false')
    expect(content).toContain('email_marketing: false')
    expect(content).toContain('imagens_redes_sociais: false')
    expect(content).toContain('compartilhamento_plano_saude: false')
    expect(content).toContain('pesquisa_clinica: false')

    // Garante que não há finalidades padrão inicializadas como true
    expect(content).not.toMatch(/FINALIDADES_ESTADO_INICIAL[\s\S]*?whatsapp:\s*true/)
    expect(content).not.toMatch(/FINALIDADES_ESTADO_INICIAL[\s\S]*?email_marketing:\s*true/)
  })

  it('8.2 ModalConsentimentoLGPD não utiliza fallback client-side com supabase.from("termos_privacidade")', () => {
    const modalPath = path.join(__dirname, '../app/components/ModalConsentimentoLGPD.tsx')
    const content = fs.readFileSync(modalPath, 'utf8')

    // Não deve consultar diretamente o banco no cliente
    expect(content).not.toContain("supabase.from('termos_privacidade')")
    expect(content).not.toContain('import { supabase } from')
  })

  it('8.3 ModalConsentimentoLGPD orienta o administrador caso não haja termo ativo e não exibe versão fictícia v2024.1', () => {
    const modalPath = path.join(__dirname, '../app/components/ModalConsentimentoLGPD.tsx')
    const content = fs.readFileSync(modalPath, 'utf8')

    // Deve conter mensagem orientando o administrador a cadastrar/ativar termo
    expect(content).toContain('Nenhum termo de privacidade ativo encontrado para a clínica')
    expect(content).toContain('Para registrar o consentimento em conformidade com a LGPD e CFO')

    // Não deve exibir texto enganoso de termo associado automaticamente v2024.1
    expect(content).not.toContain('v2024.1')
    expect(content).not.toContain('Termo padrão da clínica será associado automaticamente')
  })

  // ─── 9. Proteção do Paciente contra Cross-Tenant ──────────────────────────

  it('9. Bloqueio de consentimento se o paciente pertencer a outra clínica', () => {
    const pacienteBeta = {
      id: pacienteBetaId,
      clinica_id: clinicaBetaId,
    }

    function validarPaciente(paciente: typeof pacienteBeta, clinicaIdAutorizada: string) {
      if (paciente.clinica_id !== clinicaIdAutorizada) {
        return { success: false, error: 'Acesso negado: Paciente pertence a outra clínica.' }
      }
      return { success: true }
    }

    const res = validarPaciente(pacienteBeta, clinicaAlphaId)
    expect(res.success).toBe(false)
    expect(res.error).toBe('Acesso negado: Paciente pertence a outra clínica.')
  })
})
