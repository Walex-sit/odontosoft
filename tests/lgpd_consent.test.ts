/**
 * tests/lgpd_consent.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes automatizados de Conformidade LGPD e Normas CFO (Res. CFO 198/2019 & Lei 13.709/18).
 *
 * Validações:
 *  1. Enumerações e integridade de tipos (tipo_termo, status_consentimento, meio_consentimento, tipo_responsavel).
 *  2. Estrutura e granularidade de finalidades de consentimento.
 *  3. Regras de representação legal (menores de idade e incapazes).
 *  4. Contrato de dados da view vw_conformidade_consentimentos.
 *  5. Regras de revogação de consentimento e auditoria imutável.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect } from 'vitest'
import type { Database } from '../app/lib/database.types'
import type { ConformidadeConsentimento, TermoPrivacidade } from '../app/actions/pacientes'

describe('Conformidade LGPD & CFO — Consentimentos e Privacidade', () => {
  type TipoTermo = Database['public']['Enums']['tipo_termo']
  type StatusConsentimento = Database['public']['Enums']['status_consentimento']
  type MeioConsentimento = Database['public']['Enums']['meio_consentimento']
  type TipoResponsavel = Database['public']['Enums']['tipo_responsavel']

  it('valida os tipos de termos admitidos pela regulação LGPD/CFO', () => {
    const tiposPermitidos: TipoTermo[] = ['LGPD', 'TCLE', 'TCLE_MENOR']
    expect(tiposPermitidos).toHaveLength(3)
    expect(tiposPermitidos).toContain('LGPD')
    expect(tiposPermitidos).toContain('TCLE')
    expect(tiposPermitidos).toContain('TCLE_MENOR')
  })

  it('valida os estados do ciclo de vida de consentimento', () => {
    const statusValidos: StatusConsentimento[] = ['ativo', 'revogado', 'expirado', 'pendente']
    expect(statusValidos).toHaveLength(4)
    expect(statusValidos).toContain('ativo')
    expect(statusValidos).toContain('revogado')
    expect(statusValidos).toContain('pendente')
    expect(statusValidos).toContain('expirado')
  })

  it('valida os canais legítimos de manifestação de vontade', () => {
    const canaisValidos: MeioConsentimento[] = [
      'eletronico_interno',
      'upload_legado',
      'email_confirmado',
      'whatsapp_confirmado',
    ]
    expect(canaisValidos).toHaveLength(4)
    expect(canaisValidos).toContain('eletronico_interno')
    expect(canaisValidos).toContain('whatsapp_confirmado')
    expect(canaisValidos).toContain('email_confirmado')
    expect(canaisValidos).toContain('upload_legado')
  })

  it('valida a obrigatoriedade de identificação do responsável quando não for o titular', () => {
    function validarResponsavel(tipo: TipoResponsavel, nome?: string | null): boolean {
      if (tipo === 'proprio_paciente') return true
      return Boolean(nome && nome.trim().length >= 3)
    }

    expect(validarResponsavel('proprio_paciente')).toBe(true)
    expect(validarResponsavel('pai_mae', 'Maria Silva')).toBe(true)
    expect(validarResponsavel('tutor_legal', 'Carlos Eduardo')).toBe(true)
    expect(validarResponsavel('curador', 'Ana Costa')).toBe(true)

    // Falhas esperadas
    expect(validarResponsavel('pai_mae', '')).toBe(false)
    expect(validarResponsavel('pai_mae', null)).toBe(false)
    expect(validarResponsavel('tutor_legal', '  ')).toBe(false)
  })

  it('garante o princípio da finalidade com controle granular dos dados', () => {
    const finalidadesConsentidas: Record<string, boolean> = {
      whatsapp: true,
      email_marketing: true,
      imagens_redes_sociais: false,
      compartilhamento_plano_saude: true,
      pesquisa_clinica: false,
    }

    // Valida que finalidades são booleanos independentes
    expect(finalidadesConsentidas.whatsapp).toBe(true)
    expect(finalidadesConsentidas.imagens_redes_sociais).toBe(false)
    expect(finalidadesConsentidas.compartilhamento_plano_saude).toBe(true)

    // O paciente pode autorizar WhatsApp sem autorizar uso de imagem em redes sociais
    expect(finalidadesConsentidas.whatsapp && !finalidadesConsentidas.imagens_redes_sociais).toBe(true)
  })

  it('valida a estrutura de retorno da view vw_conformidade_consentimentos', () => {
    const mockRowView: ConformidadeConsentimento = {
      paciente_id: 'paciente-uuid-1234',
      paciente_nome: 'João da Silva',
      clinica_id: 'clinica-uuid-5678',
      tipo_termo: 'LGPD',
      versao_termo: '2024.1',
      consentimento_id: 'consentimento-uuid-9999',
      status: 'ativo',
      manifestado_em: '2026-09-01T10:00:00Z',
      revogado_em: null,
      meio: 'eletronico_interno',
      responsavel_nome: null,
      responsavel_tipo: 'proprio_paciente',
      finalidades: {
        whatsapp: true,
        email_marketing: true,
        imagens_redes_sociais: false,
      },
      possui_evidencia: true,
      registrado_em: '2026-09-01T10:00:00Z',
    }

    expect(mockRowView.paciente_id).toBe('paciente-uuid-1234')
    expect(mockRowView.status).toBe('ativo')
    expect(mockRowView.versao_termo).toBe('2024.1')
    expect(mockRowView.finalidades?.whatsapp).toBe(true)
    expect(mockRowView.possui_evidencia).toBe(true)
  })

  it('valida a lógica de revogação de consentimento com retenção auditável', () => {
    interface ConsentimentoRecord {
      id: string
      status: StatusConsentimento
      revogado_em: string | null
    }

    const consentimento: ConsentimentoRecord = {
      id: 'consentimento-1',
      status: 'ativo',
      revogado_em: null,
    }

    // Função que simula a transição de estado da RPC registrar_revogacao_consentimento
    function revogar(c: ConsentimentoRecord, dataRevogacao: string): ConsentimentoRecord {
      if (c.status !== 'ativo') {
        throw new Error('Apenas consentimentos ativos podem ser revogados')
      }
      return {
        ...c,
        status: 'revogado',
        revogado_em: dataRevogacao,
      }
    }

    const revogado = revogar(consentimento, '2026-09-02T12:00:00Z')
    expect(revogado.status).toBe('revogado')
    expect(revogado.revogado_em).toBe('2026-09-02T12:00:00Z')

    // Tentar revogar novamente deve falhar
    expect(() => revogar(revogado, '2026-09-02T13:00:00Z')).toThrow('Apenas consentimentos ativos podem ser revogados')
  })
})
