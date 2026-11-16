import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import type { Database } from '@/app/lib/database.types'

describe('Módulo de Estoque — Contrato de Colunas e Isolamento de Tenant', () => {
  it('1. app/lib/database.types.ts deve conter as colunas reais da tabela estoque (nome, minimo, descricao)', () => {
    type EstoqueRow = Database['public']['Tables']['estoque']['Row']
    type EstoqueInsert = Database['public']['Tables']['estoque']['Insert']
    type EstoqueUpdate = Database['public']['Tables']['estoque']['Update']

    // Validação estática de tipos
    const mockRow: EstoqueRow = {
      id: 'uuid-123',
      clinica_id: 'clinica-uuid-456',
      nome: 'Resina Composta A2',
      descricao: 'DentalX',
      quantidade: 10,
      minimo: 3,
      unidade: 'un',
      created_at: new Date().toISOString(),
    }

    expect(mockRow.nome).toBe('Resina Composta A2')
    expect(mockRow.minimo).toBe(3)
    expect(mockRow.descricao).toBe('DentalX')
  })

  it('2. app/(dashboard)/estoque/page.tsx NÃO deve conter referências obsoletas a nome_item ou quantidade_minima', () => {
    const estoquePagePath = path.join(__dirname, '../app/(dashboard)/estoque/page.tsx')
    const content = fs.readFileSync(estoquePagePath, 'utf8')

    expect(content).not.toContain('nome_item')
    expect(content).not.toContain('quantidade_minima')
  })

  it('3. app/(dashboard)/estoque/page.tsx deve utilizar as colunas reais (nome, minimo, clinica_id) e ordenação por nome', () => {
    const estoquePagePath = path.join(__dirname, '../app/(dashboard)/estoque/page.tsx')
    const content = fs.readFileSync(estoquePagePath, 'utf8')

    expect(content).toContain(".select('id, clinica_id, nome, descricao, quantidade, minimo, unidade, created_at')")
    expect(content).toContain(".order('nome', { ascending: true })")
    expect(content).toContain("query.eq('clinica_id', profile.clinica_id)")
  })
})

