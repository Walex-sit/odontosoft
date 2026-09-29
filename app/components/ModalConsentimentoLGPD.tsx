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
} from 'lucide-react'
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            Ao salvar, um registro auditável de conformidade será anexado à ficha do paciente.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
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
