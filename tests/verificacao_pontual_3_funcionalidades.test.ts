import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Verificação Pontual das 3 Funcionalidades', () => {
  const topbarPath = path.join(__dirname, '../app/components/Topbar.tsx')
  const estoquePath = path.join(__dirname, '../app/(dashboard)/estoque/page.tsx')
  const reguaPath = path.join(__dirname, '../app/(dashboard)/regua-cobranca/page.tsx')
  const comissoesPath = path.join(__dirname, '../app/(dashboard)/comissoes/page.tsx')
  const imprimirLayoutPath = path.join(__dirname, '../app/imprimir/layout.tsx')

  describe('1. Notificação: Alerta de Estoque Mínimo', () => {
    it('deve consultar a tabela estoque real e não conter dados estáticos/mock de anestésicos e luvas', () => {
      const content = fs.readFileSync(topbarPath, 'utf8')

      // Não deve conter o alerta fixo ou simulado de anestésicos e luvas
      expect(content).not.toContain('anestésicos e luvas')

      // Deve consultar a tabela estoque real com isolamento multi-tenant
      expect(content).toContain(".from('estoque')")
      expect(content).toContain(".select('id, nome, quantidade, minimo')")
      expect(content).toContain(".eq('clinica_id', effectiveClinicaId)")
    })

    it('deve aplicar estritamente a regra quantidade_atual <= estoque_minimo para itens com mínimo positivo', () => {
      const topbarContent = fs.readFileSync(topbarPath, 'utf8')
      const estoqueContent = fs.readFileSync(estoquePath, 'utf8')

      // Topbar: regra min > 0 && qtd <= min
      expect(topbarContent).toMatch(/min\s*>\s*0\s*&&\s*qtd\s*<=\s*min/)

      // Estoque page: regra quantidade <= minimo e minimo > 0
      expect(estoqueContent).toContain('i.minimo > 0 && i.quantidade <= i.minimo')
      expect(estoqueContent).toContain('item.minimo > 0 && item.quantidade <= item.minimo')
    })
  })

  describe('2. Réguas de Comunicação', () => {
    it('o botão disparar deve informar modo de demonstração/simulação e não afirmar envio real', () => {
      const content = fs.readFileSync(reguaPath, 'utf8')

      // Função dispararManual deve indicar simulação / modo de demonstração
      expect(content).toContain('[Modo Demonstração]')
      expect(content).toContain('Nenhuma mensagem real foi enviada')
      expect(content).not.toContain('Disparo manual da régua "${nome}" iniciado! Verificando elegíveis...')
    })

    it('as mensagens padrão devem utilizar a marca oficial OdontoSoft', () => {
      const reguaContent = fs.readFileSync(reguaPath, 'utf8')
      const layoutContent = fs.readFileSync(imprimirLayoutPath, 'utf8')

      // Templates de régua com OdontoSoft
      expect(reguaContent).toContain('na OdontoSoft')
      expect(reguaContent).not.toContain('Clínica OdontoSoft')

      // Título do layout de impressão atualizado para OdontoSoft
      expect(layoutContent).toContain('Impressão - OdontoSoft')
      expect(layoutContent).not.toContain('OdontoSaaS')
    })
  })

  describe('3. Controle de Comissões', () => {
    it('deve consultar a tabela user_profiles com role "dentista" e filtrar por clinica_id', () => {
      const content = fs.readFileSync(comissoesPath, 'utf8')

      // Consulta de profissionais dentistas
      expect(content).toContain(".from('user_profiles')")
      expect(content).toContain(".eq('role', 'dentista')")
      expect(content).toContain("dentistasQuery.eq('clinica_id', clinicaId)")
    })

    it('deve consultar procedimentos realizados e regras de comissão da clínica', () => {
      const content = fs.readFileSync(comissoesPath, 'utf8')

      expect(content).toContain(".from('procedimentos_realizados')")
      expect(content).toContain(".from('comissoes')")
      expect(content).toContain(".from('procedimentos')")
      expect(content).toContain(".from('pacientes')")
    })

    it('deve utilizar identificadores UUID em string sem coerção indevida para Number', () => {
      const content = fs.readFileSync(comissoesPath, 'utf8')

      // Interface de Dentista e Procedimento com id string
      expect(content).toMatch(/interface Dentista\s*\{[\s\S]*?id:\s*string/)
      expect(content).toMatch(/interface Procedimento\s*\{[\s\S]*?id:\s*string/)

      // Não deve forçar coerção numérica no select que gerava NaN
      expect(content).not.toContain('Number(e.target.value)')
      expect(content).toContain('setSelectedDentista(e.target.value)')
    })

    it('deve exibir a contagem de profissionais baseada nos dentistas reais retornados', () => {
      const content = fs.readFileSync(comissoesPath, 'utf8')

      expect(content).toContain('{loading ? \'...\' : dentistas.length}')
      expect(content).toContain('{dentistas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}')
    })
  })
})
