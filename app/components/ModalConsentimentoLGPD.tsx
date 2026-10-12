'use client'

import { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  UserCheck,
  Smartphone,
  Mail,
  Camera,
  HeartHandshake,
  Microscope,
  Info,
  Printer,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { toast } from 'sonner'
import { supabase } from '@/app/lib/supabaseClient'
import {
  registrarConsentimento,
  getTermosPrivacidade,
  type ConformidadeConsentimento,
  type TermoPrivacidade,
} from '@/app/actions/pacientes'
import { useAuth } from '@/app/components/RequireAuth'

interface ModalConsentimentoLGPDProps {
  isOpen: boolean
  onClose: () => void
  pacienteId: string
  pacienteNome: string
  consentimentoAtual?: ConformidadeConsentimento | null
  onSuccess: () => void
}

interface FinalidadeConfig {
  id: string
  label: string
  descricao: string
  icon: React.ComponentType<{ className?: string }>
  obrigatoriaRecomendada?: boolean
}

const FINALIDADES_PADRAO: FinalidadeConfig[] = [
  {
    id: 'whatsapp',
    label: 'Lembretes e Avisos via WhatsApp',
    descricao: 'Envio de confirmações de consulta, orientações pré/pós-procedimento e alertas de retorno.',
    icon: Smartphone,
    obrigatoriaRecomendada: true,
  },
  {
    id: 'email_marketing',
    label: 'E-mails Informativos e Notificações',
    descricao: 'Envio de receitas digitais, recibos, notas fiscais e comunicados institucionais da clínica.',
    icon: Mail,
  },
  {
    id: 'imagens_redes_sociais',
    label: 'Uso de Imagens Clínicas (Antes/Depois)',
    descricao: 'Registro fotográfico/radiográfico para acompanhamento do caso e eventual divulgação científica/educativa.',
    icon: Camera,
  },
  {
    id: 'compartilhamento_plano_saude',
    label: 'Compartilhamento com Convênios / Planos',
    descricao: 'Envio de guias, laudos e prontuários exigidos por operadoras para auditoria e autorização.',
    icon: HeartHandshake,
  },
  {
    id: 'pesquisa_clinica',
    label: 'Pesquisa Clínica e Estatística Interna',
    descricao: 'Utilização de dados estritamente anonimizados para aprimoramento de tratamentos e protocolos assistenciais.',
    icon: Microscope,
  },
]

export default function ModalConsentimentoLGPD({
  isOpen,
  onClose,
  pacienteId,
  pacienteNome,
  consentimentoAtual,
  onSuccess,
}: ModalConsentimentoLGPDProps) {
  const { session } = useAuth()
  const [termos, setTermos] = useState<TermoPrivacidade[]>([])
  const [termoSelecionadoId, setTermoSelecionadoId] = useState<string>('')
  const [loadingTermos, setLoadingTermos] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [gerandoImpressao, setGerandoImpressao] = useState(false)

  // Campos do formulário
  const [responsavelTipo, setResponsavelTipo] = useState<
    'proprio_paciente' | 'pai_mae' | 'tutor_legal' | 'curador'
  >('proprio_paciente')
  const [responsavelNome, setResponsavelNome] = useState('')
  const [meio, setMeio] = useState<
    'eletronico_interno' | 'whatsapp_confirmado' | 'email_confirmado' | 'upload_legado'
  >('eletronico_interno')

  // Estado das finalidades granulares
  const [finalidades, setFinalidades] = useState<Record<string, boolean>>({
    whatsapp: true,
    email_marketing: true,
    imagens_redes_sociais: false,
    compartilhamento_plano_saude: true,
    pesquisa_clinica: false,
  })

  // Carregar termos de privacidade disponíveis
  useEffect(() => {
    if (!isOpen) return

    async function carregarTermos() {
      setLoadingTermos(true)
      const res = await getTermosPrivacidade()
      if (res.success && res.data.length > 0) {
        setTermos(res.data)
        setTermoSelecionadoId(res.data[0].id)
      } else {
        const { data } = await supabase
          .from('termos_privacidade')
          .select('*')
          .eq('ativo', true)
          .order('publicado_em', { ascending: false })

        if (data && data.length > 0) {
          setTermos(data as TermoPrivacidade[])
          setTermoSelecionadoId(data[0].id)
        }
      }
      setLoadingTermos(false)
    }

    carregarTermos()
  }, [isOpen])

  // Inicializar estado se houver consentimento existente
  useEffect(() => {
    if (consentimentoAtual) {
      if (consentimentoAtual.responsavel_tipo) {
        setResponsavelTipo(consentimentoAtual.responsavel_tipo)
      }
      if (consentimentoAtual.responsavel_nome) {
        setResponsavelNome(consentimentoAtual.responsavel_nome)
      }
      if (consentimentoAtual.meio) {
        setMeio(consentimentoAtual.meio)
      }
      if (consentimentoAtual.finalidades) {
        setFinalidades(prev => ({
          ...prev,
          ...consentimentoAtual.finalidades,
        }))
      }
    } else {
      // Resetar para defaults
      setResponsavelTipo('proprio_paciente')
      setResponsavelNome('')
      setMeio('eletronico_interno')
      setFinalidades({
        whatsapp: true,
        email_marketing: true,
        imagens_redes_sociais: false,
        compartilhamento_plano_saude: true,
        pesquisa_clinica: false,
      })
    }
  }, [consentimentoAtual, isOpen])

  if (!isOpen) return null

  function toggleFinalidade(id: string) {
    setFinalidades(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function handleImprimirTermoFisico() {
    setGerandoImpressao(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const mL = 20 // margem esquerda
      const mR = 190 // margem direita
      const lW = mR - mL // largura de linha
      let y = 0

      // ── CABEÇALHO ──────────────────────────────────────────────────────────
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, 210, 14, 'F')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('ODONTOSOFT  ·  SISTEMA DE GESTÃO ODONTOLÓGICA', 105, 9, { align: 'center' })
      y = 22

      doc.setFontSize(15)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text('TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO (TCLE)', 105, y, { align: 'center' })
      y += 6

      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.text(
        'Tratamento de Dados Pessoais — LGPD Lei nº 13.709/2018  ·  Resolução CFO nº 198/2019',
        105, y, { align: 'center' }
      )
      y += 8

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.4)
      doc.line(mL, y, mR, y)
      y += 8

      // ── IDENTIFICAÇÃO DO PACIENTE ──────────────────────────────────────────
      doc.setFontSize(10)
      doc.setTextColor(15, 23, 42)
      doc.setFont('helvetica', 'bold')
      doc.text('DADOS DO TITULAR', mL, y)
      y += 6

      const titular = responsavelTipo === 'proprio_paciente'
        ? `Paciente / Titular: ${pacienteNome.toUpperCase()}`
        : `Paciente: ${pacienteNome.toUpperCase()}  |  Responsável (${responsavelTipo}): ${responsavelNome.toUpperCase()}`

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const linhasTitular = doc.splitTextToSize(titular, lW)
      doc.text(linhasTitular, mL, y)
      y += linhasTitular.length * 5.5 + 2

      const meioLabel: Record<string, string> = {
        eletronico_interno: 'Eletrônico Interno (Consultório / Tablet)',
        whatsapp_confirmado: 'WhatsApp Confirmado',
        email_confirmado: 'E-mail Confirmado',
        upload_legado: 'Upload / Ficha Física Digitalizada',
      }
      doc.text(`Meio de coleta: ${meioLabel[meio] ?? meio}`, mL, y)
      y += 8

      doc.setDrawColor(226, 232, 240)
      doc.line(mL, y, mR, y)
      y += 8

      // ── TEXTO PRINCIPAL ───────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('DECLARAÇÃO DE CONSENTIMENTO', mL, y)
      y += 6

      const textoDeclaracao =
        `Eu, ${pacienteNome.toUpperCase()}, declaro que fui devidamente informado(a) sobre ` +
        `a forma como a clínica odontológica coleta, armazena e utiliza meus dados pessoais ` +
        `e dados sensíveis de saúde, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) ` +
        `e a Resolução do Conselho Federal de Odontologia nº 198/2019. ` +
        `Manifesto livremente, de forma informada e inequívoca, o meu consentimento ` +
        `para o tratamento de dados nas finalidades abaixo indicadas.`

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      const linhasDecl = doc.splitTextToSize(textoDeclaracao, lW)
      doc.text(linhasDecl, mL, y)
      y += linhasDecl.length * 5 + 8

      // ── TABELA DE FINALIDADES ─────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('FINALIDADES DO TRATAMENTO DE DADOS', mL, y)
      y += 5

      // Cabeçalho da tabela
      doc.setFillColor(15, 23, 42)
      doc.rect(mL, y, lW, 7, 'F')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text('FINALIDADE', mL + 3, y + 5)
      doc.text('STATUS', mR - 22, y + 5)
      y += 7

      // Linhas da tabela
      FINALIDADES_PADRAO.forEach((fin, idx) => {
        const autorizado = Boolean(finalidades[fin.id])
        const bgColor = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255]
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.rect(mL, y, lW, 14, 'F')

        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.2)
        doc.rect(mL, y, lW, 14, 'S')

        // Label
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        const labLines = doc.splitTextToSize(fin.label, lW - 35)
        doc.text(labLines, mL + 3, y + 5)

        // Descrição
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        const descLines = doc.splitTextToSize(fin.descricao, lW - 35)
        doc.text(descLines, mL + 3, y + 9.5)

        // Badge Autorizado / Negado
        if (autorizado) {
          doc.setFillColor(16, 185, 129) // emerald-500
          doc.roundedRect(mR - 28, y + 3.5, 22, 7, 2, 2, 'F')
          doc.setTextColor(255, 255, 255)
        } else {
          doc.setFillColor(226, 232, 240) // slate-200
          doc.roundedRect(mR - 28, y + 3.5, 22, 7, 2, 2, 'F')
          doc.setTextColor(71, 85, 105)
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.text(autorizado ? 'AUTORIZADO' : 'NEGADO', mR - 17, y + 8.5, { align: 'center' })

        y += 14
      })

      y += 8

      // ── DIREITOS DO TITULAR ───────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(15, 23, 42)
      doc.text('DIREITOS DO TITULAR (Art. 18 LGPD) — Posso, a qualquer tempo:', mL, y)
      y += 5

      const direitos = [
        'Confirmar a existência do tratamento e acessar meus dados;',
        'Solicitar a correção de dados incompletos, inexatos ou desatualizados;',
        'Revogar este consentimento sem prejuízo da legalidade do tratamento anterior;',
        'Solicitar a eliminação de dados tratados com base exclusivamente no meu consentimento.',
      ]

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      direitos.forEach(d => {
        const ls = doc.splitTextToSize(`• ${d}`, lW)
        doc.text(ls, mL, y)
        y += ls.length * 4.8 + 1
      })

      y += 6

      // ── LINHA SEPARADORA PRÉ-ASSINATURA ──────────────────────────────────
      doc.setDrawColor(148, 163, 184)
      doc.setLineWidth(0.3)
      doc.line(mL, y, mR, y)
      y += 10

      // ── RODAPÉ DE ASSINATURA ──────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(15, 23, 42)
      doc.text('ASSINATURA E ANUÊNCIA', mL, y)
      y += 7

      // Linha local/data (col esquerda)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      doc.text('Local e Data:', mL, y)
      doc.setDrawColor(100, 116, 139)
      doc.setLineWidth(0.4)
      doc.line(mL, y + 12, mL + 75, y + 12)
      doc.setFontSize(7.5)
      doc.text('(Cidade, __ / __ / ________)', mL, y + 17)

      // Linha assinatura (col direita)
      const colDir = mL + 90
      doc.setFontSize(8.5)
      doc.text('Assinatura do(a) Paciente / Responsável Legal:', colDir, y)
      doc.line(colDir, y + 12, mR, y + 12)
      doc.setFontSize(7.5)
      doc.setTextColor(15, 23, 42)
      doc.text(`Nome: ${pacienteNome.toUpperCase()}`, colDir, y + 17)

      y += 28

      // Assinatura do dentista
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      doc.text('Carimbo e Assinatura do(a) Cirurgião(ã)-Dentista Responsável:', mL, y)
      doc.setDrawColor(100, 116, 139)
      doc.line(mL, y + 12, mL + 85, y + 12)
      doc.setFontSize(7.5)
      doc.text('CRO: ___________________', mL, y + 17)

      // ── RODAPÉ DA PÁGINA ─────────────────────────────────────────────────
      const pY = 285
      doc.setFillColor(248, 250, 252)
      doc.rect(0, pY - 4, 210, 15, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.line(0, pY - 4, 210, pY - 4)
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Documento gerado por Odontosoft em ${new Date().toLocaleString('pt-BR')}  ·  LGPD Lei 13.709/2018  ·  CFO Res. 198/2019`,
        105, pY + 2, { align: 'center' }
      )
      doc.text(
        'Este termo integra o prontuário do paciente e deve ser arquivado pela clínica por no mínimo 20 anos.',
        105, pY + 7, { align: 'center' }
      )

      // ── DOWNLOAD ─────────────────────────────────────────────────────────
      const nomeSanitizado = pacienteNome.replace(/\s+/g, '_').replace(/[^\w]/g, '')
      const dataHoje = new Date().toISOString().slice(0, 10)
      doc.save(`TermoFisico_LGPD_${nomeSanitizado}_${dataHoje}.pdf`)
      toast.success('Termo físico gerado! Verifique seus downloads.')
    } catch {
      toast.error('Erro ao gerar o PDF. Tente novamente.')
    } finally {
      setGerandoImpressao(false)
    }
  }

  async function handleSalvar() {
    if (responsavelTipo !== 'proprio_paciente' && !responsavelNome.trim()) {
      toast.error('Informe o nome completo do responsável legal.')
      return
    }

    setSalvando(true)
    try {
      const res = await registrarConsentimento({
        paciente_id: pacienteId,
        termo_id: termoSelecionadoId || undefined,
        responsavel_tipo: responsavelTipo,
        responsavel_nome: responsavelTipo !== 'proprio_paciente' ? responsavelNome.trim() : null,
        meio: meio,
        finalidades: finalidades,
        _userId: session?.user?.id,
        _userNome: session?.user?.email || 'Operador do Sistema',
      })

      if (res.success) {
        toast.success('Manifestação de consentimento registrada com sucesso!')
        onSuccess()
        onClose()
      } else {
        toast.error('Erro ao registrar consentimento: ' + (res.error || 'Erro desconhecido'))
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar solicitação'
      toast.error(errorMsg)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div data-testid="modal-consentimento-lgpd" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Registro de Consentimento LGPD & TCLE
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Paciente: <span className="font-bold text-slate-700 dark:text-slate-200">{pacienteNome}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={salvando}
            data-testid="btn-fechar-modal-lgpd"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body rolável */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300">
          
          {/* Card Informativo Base Legal */}
          <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-blue-900 dark:text-blue-200">
              <span className="font-bold">Base Legal (LGPD Lei 13.709/18 & Resolução CFO 198/2019):</span> Cada manifestação é registrada de forma auditável e com versionamento do termo. O titular tem o direito de escolher as finalidades específicas autorizadas e revogá-las a qualquer momento.
            </div>
          </div>

          {/* Seleção do Termo de Privacidade */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Termo de Referência
            </label>
            {loadingTermos ? (
              <div className="h-11 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : termos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {termos.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`termo-item-${t.id}`}
                    onClick={() => setTermoSelecionadoId(t.id)}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                      termoSelecionadoId === t.id
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        Termo {t.tipo} (v{t.versao})
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Publicado em {new Date(t.publicado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {termoSelecionadoId === t.id && (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                Termo padrão da clínica será associado automaticamente (v2024.1).
              </div>
            )}
          </div>

          {/* Titular / Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Manifestado Por
              </label>
              <select
                data-testid="select-responsavel-tipo"
                value={responsavelTipo}
                onChange={e => setResponsavelTipo(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="proprio_paciente">O Próprio Paciente (Titular)</option>
                <option value="pai_mae">Pai ou Mãe (Menor de idade)</option>
                <option value="tutor_legal">Tutor Legal</option>
                <option value="curador">Curador</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Meio de Coleta
              </label>
              <select
                data-testid="select-meio-coleta"
                value={meio}
                onChange={e => setMeio(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="eletronico_interno">Eletrônico Interno (Consultório / Tablet)</option>
                <option value="whatsapp_confirmado">WhatsApp Confirmado</option>
                <option value="email_confirmado">E-mail Confirmado</option>
                <option value="upload_legado">Upload / Ficha Física Digitalizada</option>
              </select>
            </div>
          </div>

          {/* Nome do responsável (se não for o próprio paciente) */}
          {responsavelTipo !== 'proprio_paciente' && (
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                Nome Completo do Responsável Legal *
              </label>
              <input
                type="text"
                data-testid="input-responsavel-nome"
                value={responsavelNome}
                onChange={e => setResponsavelNome(e.target.value)}
                placeholder="Ex: Maria dos Santos Silva"
                className="w-full bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl px-3.5 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1">
                Obrigatório para menores de 18 anos ou titulares legalmente representados.
              </p>
            </div>
          )}

          {/* Finalidades Granulares (Consentimento Específico) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Finalidades Específicas Autorizadas
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                Controle granular (Art. 8º §4º LGPD)
              </span>
            </div>

            <div className="space-y-2.5">
              {FINALIDADES_PADRAO.map(fin => {
                const isChecked = Boolean(finalidades[fin.id])
                const IconComponent = fin.icon

                return (
                  <div
                    key={fin.id}
                    data-testid={`finalidade-toggle-${fin.id}`}
                    onClick={() => toggleFinalidade(fin.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                      isChecked
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/70'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-bold ${
                            isChecked
                              ? 'text-slate-800 dark:text-slate-100'
                              : 'text-slate-500 dark:text-slate-400 line-through'
                          }`}
                        >
                          {fin.label}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isChecked
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {isChecked ? 'Autorizado' : 'Negado'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {fin.descricao}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
          {/* Linha superior: dica + botão de impressão */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">
              Ao salvar, um registro auditável de conformidade será anexado à ficha do paciente.
            </p>
            <button
              type="button"
              data-testid="btn-imprimir-termo-fisico"
              onClick={handleImprimirTermoFisico}
              disabled={gerandoImpressao || salvando}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-400 dark:border-blue-600
                text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30
                text-xs font-bold transition-all active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                w-full sm:w-auto justify-center"
            >
              {gerandoImpressao
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Printer className="h-3.5 w-3.5" />
              }
              {gerandoImpressao ? 'Gerando PDF...' : 'Imprimir Termo Físico (PDF)'}
            </button>
          </div>

          {/* Linha inferior: cancelar + salvar */}
          <div className="flex items-center gap-3 w-full sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              data-testid="btn-cancelar-consentimento"
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              data-testid="btn-salvar-consentimento"
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {salvando ? 'Salvando...' : 'Salvar Consentimento'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
