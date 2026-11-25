'use client'

/**
 * app/components/OdontogramaInterativo.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Odontograma Interativo para o prontuário do paciente.
 *
 * Funcionalidades:
 *  • Arcada permanente (FDI 18-48) e decídua (55-85) com toggle.
 *  • Clique no dente → painel de status emerge com micro-animação.
 *  • Observação clínica livre por registo.
 *  • Persistência via Server Action (upsert atómico no Supabase).
 *  • Legenda de cores inline.
 *  • Skeleton de loading e estados de erro/sucesso com toast.
 *  • Dark mode nativo via tokens CSS do projeto.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
  Save, RefreshCw, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  carregarOdontograma,
  salvarOdontograma,
  type StatusDente,
  type TipoArcada,
} from '@/app/actions/odontograma'

// ─── Constantes FDI ──────────────────────────────────────────────────────────

const ARCADAS: Record<TipoArcada, { superior: number[]; inferior: number[] }> = {
  permanente: {
    superior: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    inferior: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  },
  deciduo: {
    superior: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
    inferior: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
  },
}

// ─── Configuração visual de cada status ──────────────────────────────────────

interface StatusConfig {
  label: string
  /** Classes Tailwind para o botão do dente */
  dentClasses: string
  /** Classes Tailwind para o chip na legenda */
  chipClasses: string
  /** Símbolo exibido sobre o ícone do dente quando aplicável */
  symbol?: string
}

const STATUS_CONFIG: Record<StatusDente, StatusConfig> = {
  saudavel: {
    label: 'Saudável',
    dentClasses:
      'bg-[var(--bg-surface)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40 dark:hover:border-[var(--primary)]/40',
    chipClasses: 'bg-[var(--bg-base)] dark:bg-[var(--border)] text-[var(--text-secondary)] border border-[var(--border)] ',
  },
  carie: {
    label: 'Cárie',
    symbol: '●',
    dentClasses: 'bg-red-50 dark:bg-red-950/40 border-red-400 text-red-600 dark:text-red-400',
    chipClasses: 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
  },
  restaurado: {
    label: 'Restaurado',
    symbol: '■',
    dentClasses: 'bg-[var(--primary-subtle)] border-[var(--primary)]/40 text-[var(--primary)]',
    chipClasses: 'bg-[var(--primary-subtle)] text-[var(--primary)] border border-[var(--primary)]/40 ',
  },
  ausente: {
    label: 'Ausente',
    symbol: '✕',
    dentClasses: 'bg-[var(--bg-base)] dark:bg-[var(--bg-base)] border-[var(--border-medium)]  text-[var(--text-muted)] opacity-60',
    chipClasses: 'bg-[var(--bg-base)] dark:bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-medium)]',
  },
  extrair: {
    label: 'Extrair',
    symbol: '↑',
    dentClasses: 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 text-orange-600 dark:text-orange-400',
    chipClasses: 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  },
  canal: {
    label: 'Canal',
    symbol: 'C',
    dentClasses: 'bg-[var(--primary-subtle)] dark:bg-[var(--primary-subtle)] border-[var(--primary)]/30 text-[var(--primary)] dark:text-[var(--primary)]',
    chipClasses: 'bg-[var(--primary-subtle)] dark:bg-[var(--primary-subtle)] text-[var(--primary)] dark:text-[var(--primary)] border border-[var(--primary)]/30 dark:border-[var(--primary)]/30',
  },
  implante: {
    label: 'Implante',
    symbol: 'I',
    dentClasses: 'bg-teal-50 dark:bg-teal-950/40 border-teal-400 text-teal-600 dark:text-teal-400',
    chipClasses: 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
  },
  fraturado: {
    label: 'Fraturado',
    symbol: '⚡',
    dentClasses: 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-600 dark:text-amber-400',
    chipClasses: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  },
  coroa: {
    label: 'Coroa',
    symbol: '♦',
    dentClasses: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-600 dark:text-emerald-400',
    chipClasses: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  },
}

const STATUS_ORDER: StatusDente[] = [
  'saudavel', 'carie', 'restaurado', 'ausente',
  'extrair', 'canal', 'implante', 'fraturado', 'coroa',
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Ícone de dente desenhado com SVG (lucide-react nao exporta Tooth nesta versao) */
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Contorno simplificado de um dente molar */}
      <path d="M12 2C9.5 2 7 3.5 6 6L5 14c-.5 3 1 6 3.5 6 1 0 2-.5 2.5-1.5.5 1 1.5 1.5 2.5 1.5 1 0 2-.5 2.5-1.5.5 1 1.5 1.5 2.5 1.5C20.5 20 22 17 21.5 14l-1-8C19.5 3.5 17 2 14.5 2c-.8 0-1.7.2-2.5.6C11.2 2.2 10.3 2 9.5 2" />
    </svg>
  )
}

interface DenteProps {
  numero: number
  status: StatusDente
  isSelected: boolean
  onClick: (n: number) => void
}

function DenteVisual({ numero, status, isSelected, onClick }: DenteProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <button
      id={`dente-${numero}`}
      type="button"
      onClick={() => onClick(numero)}
      title={`Dente ${numero} — ${cfg.label}`}
      className={[
        'relative w-10 h-10 flex flex-col items-center justify-center rounded-xl',
        'border-2 font-bold text-xs shadow-sm select-none',
        'transition-all duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none',
        cfg.dentClasses,
        isSelected
          ? 'ring-2 ring-[var(--primary)] ring-offset-2 dark:ring-offset-[var(--bg-base)] scale-110 shadow-md'
          : '',
      ].join(' ')}
    >
      {/* Número FDI */}
      <span className="leading-none">{numero}</span>

      {/* Símbolo de status (pequeno, sob o número) */}
      {cfg.symbol && status !== 'saudavel' && (
        <span className="text-xs leading-none opacity-80 mt-0.5">{cfg.symbol}</span>
      )}

      {/* X duplo para ausente */}
      {status === 'ausente' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[110%] h-px bg-current rotate-45 absolute" />
          <div className="w-[110%] h-px bg-current -rotate-45 absolute" />
        </div>
      )}
    </button>
  )
}

function DenteSkeleton() {
  return (
    <div className="w-10 h-10 rounded-xl bg-[var(--border)] dark:bg-[var(--border)] animate-pulse" />
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface OdontogramaInterativoProps {
  pacienteId: string
}

export default function OdontogramaInterativo({ pacienteId }: OdontogramaInterativoProps) {
  // ── Estado ─────────────────────────────────────────────────────────────────
  const [tipo, setTipo] = useState<TipoArcada>('permanente')
  const [statusMap, setStatusMap] = useState<Record<string, StatusDente>>({})
  const [observacao, setObservacao] = useState('')
  const [selectedDente, setSelectedDente] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [legendaAberta, setLegendaAberta] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  // ── Carregar dados ─────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    setLoading(true)
    setSelectedDente(null)

    const res = await carregarOdontograma(pacienteId, tipo)

    if (res.success && res.data) {
      setStatusMap(res.data.status_map as Record<string, StatusDente>)
      setObservacao(res.data.observacao ?? '')
      setSavedAt(res.data.atualizado_em)
    } else {
      // Sem registo ainda — começa limpo
      setStatusMap({})
      setObservacao('')
      setSavedAt(null)
    }
    setLoading(false)
  }, [pacienteId, tipo])

  useEffect(() => { carregar() }, [carregar])

  // Fecha painel ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Verifica se o clique foi num dente (não fechar o painel nesses casos)
        const target = e.target as HTMLElement
        if (!target.closest('[id^="dente-"]')) {
          setSelectedDente(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleDenteClick(numero: number) {
    setSelectedDente(prev => (prev === numero ? null : numero))
  }

  function handleChangeStatus(novoStatus: StatusDente) {
    if (!selectedDente) return
    setStatusMap(prev => ({ ...prev, [String(selectedDente)]: novoStatus }))
    // Mantém o dente selecionado para visualização, fecha só após 400ms
    setTimeout(() => setSelectedDente(null), 350)
  }

  function handleSalvar() {
    startTransition(async () => {
      const res = await salvarOdontograma({
        pacienteId,
        tipo,
        statusMap,
        observacao,
      })

      if (res.success) {
        setSavedAt(res.data.atualizado_em)
        toast.success('Odontograma salvo com sucesso!')
      } else {
        toast.error('Erro ao salvar: ' + res.error)
      }
    })
  }

  // ── Arcada activa ──────────────────────────────────────────────────────────

  const arcada = ARCADAS[tipo]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">

      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ToothIcon className="h-5 w-5 text-[var(--primary)]" />
            Odontograma Interativo
          </h3>
          {savedAt && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Última actualização: {new Date(savedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>

        {/* Toggle permanente / decíduo */}
        <div className="flex items-center bg-[var(--bg-base)] dark:bg-[var(--bg-base)] p-1 rounded-xl self-start sm:self-auto">
          {(['permanente', 'deciduo'] as TipoArcada[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={[
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                tipo === t
                  ? 'bg-white dark:bg-[var(--border)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] ',
              ].join(' ')}
            >
              {t === 'permanente' ? 'Permanentes' : 'Decíduos'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Arcadas ────────────────────────────────────────────────────────── */}
      <div className="bg-[var(--bg-base)] dark:bg-[var(--bg-base)] rounded-2xl border border-[var(--border)]  p-5 flex flex-col gap-6 items-center overflow-x-auto">

        {/* Label superior */}
        <div className="w-full flex justify-between text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] px-1">
          <span>Direita (D)</span>
          <span className="text-[var(--border-medium)]">Arcada Superior</span>
          <span>Esquerda (E)</span>
        </div>

        {/* Superior */}
        <div className="flex items-end gap-1.5">
          {loading
            ? arcada.superior.map(n => <DenteSkeleton key={n} />)
            : arcada.superior.map(n => (
                <DenteVisual
                  key={n}
                  numero={n}
                  status={statusMap[String(n)] ?? 'saudavel'}
                  isSelected={selectedDente === n}
                  onClick={handleDenteClick}
                />
              ))}
        </div>

        {/* Linha mediana */}
        <div className="relative w-full max-w-3xl">
          <div className="w-full h-px bg-[var(--border)] dark:bg-[var(--border)]" />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[var(--bg-base)] dark:bg-[var(--bg-base)] px-3 text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">
            Plano Oclusal
          </span>
        </div>

        {/* Inferior */}
        <div className="flex items-start gap-1.5">
          {loading
            ? arcada.inferior.map(n => <DenteSkeleton key={n} />)
            : arcada.inferior.map(n => (
                <DenteVisual
                  key={n}
                  numero={n}
                  status={statusMap[String(n)] ?? 'saudavel'}
                  isSelected={selectedDente === n}
                  onClick={handleDenteClick}
                />
              ))}
        </div>

        {/* Label inferior */}
        <div className="w-full flex justify-between text-xs font-bold tracking-widest uppercase text-[var(--text-muted)] px-1">
          <span>Direita (D)</span>
          <span className="text-[var(--border-medium)]">Arcada Inferior</span>
          <span>Esquerda (E)</span>
        </div>
      </div>

      {/* ── Painel de selecção de status ───────────────────────────────────── */}
      {selectedDente !== null && (
        <div
          ref={panelRef}
          className="p-4 bg-[var(--bg-surface)] border border-[var(--primary)]/40  rounded-2xl shadow-lg
                     animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-[var(--text-primary)] text-sm">
              Dente{' '}
              <span className="text-[var(--primary)] font-extrabold text-base">
                {selectedDente}
              </span>
              {' '}&mdash; selecione o estado:
            </p>
            <span className="text-xs text-[var(--text-muted)]">
              Clique num dente diferente para mudar a selecção
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map(s => {
              const cfg = STATUS_CONFIG[s]
              const isActive = (statusMap[String(selectedDente)] ?? 'saudavel') === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleChangeStatus(s)}
                  className={[
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all border',
                    'hover:scale-105 active:scale-95 focus-visible:outline-none',
                    cfg.chipClasses,
                    isActive ? 'ring-2 ring-offset-1 dark:ring-offset-[var(--bg-base)] ring-current shadow-md' : '',
                  ].join(' ')}
                >
                  {cfg.symbol && <span className="mr-1">{cfg.symbol}</span>}
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Observação clínica ─────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="odontograma-observacao"
          className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5"
        >
          Observação Clínica
        </label>
        <textarea
          id="odontograma-observacao"
          rows={3}
          value={observacao}
          onChange={e => setObservacao(e.target.value)}
          placeholder="Registe aqui observações clínicas relevantes do odontograma (ex: dente 16 com sensibilidade, aguarda tratamento)…"
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] 
                     bg-[var(--bg-surface)]
                     text-[var(--text-primary)] placeholder:text-[var(--text-muted)] dark:placeholder:text-[var(--text-secondary)]
                     text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20
                     transition-shadow"
        />
      </div>

      {/* ── Rodapé: legenda + botões ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

        {/* Legenda colapsável */}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setLegendaAberta(p => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)]  transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            Legenda de cores
            {legendaAberta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {legendaAberta && (
            <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
              {STATUS_ORDER.map(s => {
                const cfg = STATUS_CONFIG[s]
                return (
                  <span key={s} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.chipClasses}`}>
                    {cfg.symbol && <span>{cfg.symbol}</span>}
                    {cfg.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Botões de acção */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={carregar}
            disabled={loading || isPending}
            title="Recarregar dados do servidor"
            className="p-2 rounded-xl border border-[var(--border)] 
                       text-[var(--text-muted)] hover:bg-[var(--bg-base)] dark:hover:bg-[var(--bg-surface)]
                       transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            id="odontograma-salvar-btn"
            onClick={handleSalvar}
            disabled={isPending || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] active:bg-[var(--primary-fill-hover)]
                       text-[var(--on-primary)] font-bold text-sm shadow-sm
                       transition-all hover:scale-105 active:scale-95
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isPending ? 'A salvar…' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Confirmação visual inline (complementar ao toast) */}
      {savedAt && !isPending && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Registo sincronizado com o servidor em {new Date(savedAt).toLocaleTimeString('pt-BR')}
        </div>
      )}
    </div>
  )
}
