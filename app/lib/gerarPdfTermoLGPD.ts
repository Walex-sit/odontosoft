/**
 * gerarPdfTermoLGPD.ts
 * Gerador de Termo de Consentimento LGPD em PDF.
 *
 * Texto padrão CFO + LGPD Lei 13.709/18 — Resolução CFO 198/2019.
 * Usa jsPDF (já presente no projeto) para compatibilidade com o padrão existente.
 */

import { jsPDF } from 'jspdf'

interface DadosTermoLGPD {
  pacienteNome: string
  pacienteCpf: string
  clinicaNome?: string
  clinicaCnpj?: string
  clinicaEndereco?: string
}

export function gerarPdfTermoLGPD(dados: DadosTermoLGPD): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const clinica = dados.clinicaNome || 'Clínica Odontológica'
  const cnpj = dados.clinicaCnpj || ''
  const endereco = dados.clinicaEndereco || ''

  const marginLeft = 20
  const marginRight = 190
  const lineWidth = marginRight - marginLeft
  let y = 22

  // ─── CABEÇALHO ─────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42) // slate-900
  doc.rect(0, 0, 210, 14, 'F')

  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('ODONTOSOFT  ·  SISTEMA DE GESTÃO ODONTOLÓGICA', 105, 9, { align: 'center' })

  y = 22

  // Nome da clínica
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text(clinica.toUpperCase(), 105, y, { align: 'center' })
  y += 6

  if (cnpj) {
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.text(`CNPJ: ${cnpj}`, 105, y, { align: 'center' })
    y += 5
  }
  if (endereco) {
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.text(endereco, 105, y, { align: 'center' })
    y += 5
  }

  y += 4

  // Linha divisória
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, y, marginRight, y)
  y += 8

  // ─── TÍTULO ────────────────────────────────────────────────────────────────
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text('TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)', 105, y, { align: 'center' })
  y += 5

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Tratamento de Dados Pessoais — LGPD Lei nº 13.709/2018 · Resolução CFO nº 198/2019',
    105, y, { align: 'center' }
  )
  y += 10

  // ─── CORPO DO TERMO ────────────────────────────────────────────────────────
  doc.setFontSize(10.5)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')

  // Parágrafo principal
  const textoPrincipal =
    `Eu, ${dados.pacienteNome.toUpperCase()}, portador(a) do Cadastro de Pessoas Físicas (CPF) de número ` +
    `${dados.pacienteCpf}, autorizo a ${clinica} a coletar, armazenar, tratar e utilizar ` +
    `os meus dados pessoais e dados sensíveis de saúde, estritamente para as finalidades ` +
    `abaixo descritas, em conformidade com a Lei Geral de Proteção de Dados Pessoais ` +
    `(LGPD — Lei nº 13.709, de 14 de agosto de 2018) e com a Resolução do Conselho Federal ` +
    `de Odontologia nº 198/2019.`

  const linhasPrincipal = doc.splitTextToSize(textoPrincipal, lineWidth)
  doc.text(linhasPrincipal, marginLeft, y)
  y += linhasPrincipal.length * 5.5 + 6

  // ─── FINALIDADES ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('FINALIDADES AUTORIZADAS DO TRATAMENTO:', marginLeft, y)
  y += 6

  const finalidades = [
    'I.   Elaboração, armazenamento e gestão de prontuário clínico odontológico;',
    'II.  Prestação de atendimento clínico, diagnóstico e elaboração de planos de tratamento;',
    'III. Emissão de receitas, atestados, laudos e documentos clínicos correlatos;',
    'IV.  Comunicação para lembretes de consultas, orientações pré e pós-procedimento;',
    'V.   Cumprimento de obrigações legais perante órgãos reguladores, convênios e planos de saúde.',
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  for (const item of finalidades) {
    const linhas = doc.splitTextToSize(item, lineWidth)
    doc.text(linhas, marginLeft + 3, y)
    y += linhas.length * 5.2 + 1.5
  }
  y += 4

  // ─── DIREITOS DO TITULAR ───────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text('DIREITOS DO TITULAR (art. 18 da LGPD):', marginLeft, y)
  y += 6

  const direitosTexto =
    `O(A) titular dos dados tem direito, a qualquer tempo, de: (a) confirmar a existência de ` +
    `tratamento; (b) acessar os dados; (c) corrigir dados incompletos ou inexatos; (d) anonimizar, ` +
    `bloquear ou eliminar dados desnecessários ou tratados em desconformidade com a lei; ` +
    `(e) revogar o consentimento — sem prejuízo da legalidade do tratamento realizado anteriormente.`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const linhasDireitos = doc.splitTextToSize(direitosTexto, lineWidth)
  doc.text(linhasDireitos, marginLeft, y)
  y += linhasDireitos.length * 5.2 + 6

  // ─── RETENÇÃO ──────────────────────────────────────────────────────────────
  const textoRetencao =
    `Os dados pessoais e prontuários serão mantidos pelo prazo mínimo de 20 (vinte) anos, ` +
    `conforme determinado pela Resolução CFO nº 198/2019, podendo ser conservados por prazo ` +
    `superior em caso de obrigação legal ou exercício regular de direito.`

  const linhasRetencao = doc.splitTextToSize(textoRetencao, lineWidth)
  doc.text(linhasRetencao, marginLeft, y)
  y += linhasRetencao.length * 5.2 + 10

  // ─── LINHA SEPARADORA ──────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.line(marginLeft, y, marginRight, y)
  y += 12

  // ─── ÁREA DE ASSINATURA ────────────────────────────────────────────────────
  const colLeft = marginLeft
  const colRight = 115

  // Data
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('Local e Data:', colLeft, y)

  doc.setDrawColor(100, 116, 139)
  doc.setLineWidth(0.4)
  doc.line(colLeft, y + 10, colLeft + 80, y + 10)

  // Assinatura do Paciente
  doc.text('Assinatura do(a) Paciente / Responsável Legal:', colRight, y)
  doc.line(colRight, y + 10, marginRight, y + 10)

  y += 16
  doc.setFontSize(8.5)
  doc.text('_____________________________/_____ /________', colLeft, y)
  doc.text('(Cidade, dia, mês e ano)', colLeft, y + 4)
  doc.setFontSize(8.5)
  doc.text(`Nome: ${dados.pacienteNome.toUpperCase()}`, colRight, y)
  doc.text(`CPF: ${dados.pacienteCpf}`, colRight, y + 5)

  y += 22

  // Assinatura do Responsável pela Clínica
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('Carimbo e Assinatura do(a) Cirurgião(ã)-Dentista Responsável:', marginLeft, y)
  y += 12
  doc.setDrawColor(100, 116, 139)
  doc.line(marginLeft, y, marginLeft + 90, y)
  y += 5
  doc.setFontSize(8.5)
  doc.text('CRO: ___________________', marginLeft, y)

  // ─── RODAPÉ ────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 276, 210, 21, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.line(0, 276, 210, 276)

  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Documento gerado automaticamente por Odontosoft — ${new Date().toLocaleString('pt-BR')}`,
    105, 282, { align: 'center' }
  )
  doc.text(
    'Este termo é parte integrante do prontuário clínico do paciente conforme Resolução CFO nº 198/2019.',
    105, 287, { align: 'center' }
  )
  doc.text(
    'LGPD — Lei nº 13.709/2018 · CFO Res. 198/2019 · Autenticidade verificável pela clínica emissora.',
    105, 292, { align: 'center' }
  )

  // ─── DOWNLOAD ──────────────────────────────────────────────────────────────
  const nomeArquivo = `TermoLGPD_${dados.pacienteNome.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nomeArquivo)
}
