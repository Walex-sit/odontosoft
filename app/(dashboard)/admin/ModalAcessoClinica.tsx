'use client'

/**
 * app/(dashboard)/admin/ModalAcessoClinica.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal de Acesso Contextual Seguro para o Super Admin.
 * Permite selecionar uma clínica e entrar temporariamente no seu contexto
 * mantendo o perfil 'super_admin' e persistindo o cookie HttpOnly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Building2,
  Calendar,
  Users,
  FileText,
  DollarSign,
  Package,
  Settings,
  ArrowUpRight,
  X,
} from 'lucide-react'
import { useClinica } from '@/app/contexts/ClinicaContext'
import { selectClinicContextAction, type GlobalClinicaItem } from '@/app/actions/admin-global'

interface ModalAcessoClinicaProps {
  clinica: GlobalClinicaItem | null
  onClose: () => void
}

export function ModalAcessoClinica({ clinica, onClose }: ModalAcessoClinicaProps) {
  const router = useRouter()
  const { refreshClinica } = useClinica()
  const [conectando, setConectando] = useState(false)

  if (!clinica) return null

  async function handleAcessar(moduloDestino = '/agenda') {
    if (!clinica) return
    setConectando(true)
    try {
      const res = await selectClinicContextAction(clinica.id)
      if (res.success) {
        toast.success(`Contexto ativado: ${res.data?.nome || clinica.nome}`)
        await refreshClinica()
        onClose()
        router.push(moduloDestino)
      } else {
        toast.error(res.error || 'Não foi possível ativar o contexto da clínica.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conectar no contexto da clínica.')
    } finally {
      setConectando(false)
    }
  }

  const modulos = [
    { name: 'Agenda', path: '/agenda', icon: Calendar, desc: 'Consultas e horários' },
    { name: 'Pacientes', path: '/pacientes', icon: Users, desc: 'Fichas e prontuários' },
    { name: 'Prontuários', path: '/prontuarios', icon: FileText, desc: 'Histórico odontológico' },
    { name: 'Financeiro', path: '/financeiro', icon: DollarSign, desc: 'Receitas e despesas' },
    { name: 'Estoque', path: '/estoque', icon: Package, desc: 'Insumos e materiais' },
    { name: 'Configurações', path: '/configuracoes', icon: Settings, desc: 'Dados e logotipo' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in-50">
      <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-3xl p-6 border border-[var(--border)] shadow-md dark:shadow-none relative space-y-5">
        <button
          onClick={onClose}
          disabled={conectando}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-base)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[var(--bg-surface)] text-[var(--warning)] border border-[var(--warning)]/45 flex items-center justify-center shrink-0">
            <Building2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--warning)]">
              Acesso Contextual Seguro
            </span>
            <h3 className="text-lg font-black text-[var(--text-primary)] leading-tight">
              {clinica.nome}
            </h3>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Você entrará no ambiente operacional desta clínica mantendo sua função de <b>Super Admin</b>. 
          Todas as visualizações e operações serão vinculadas a este tenant temporariamente. 
          Você poderá retornar ao Painel Global a qualquer momento.
        </p>

        <div className="space-y-2 pt-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
            Selecione o módulo para iniciar:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {modulos.map((mod) => {
              const Icon = mod.icon
              return (
                <button
                  key={mod.name}
                  onClick={() => handleAcessar(mod.path)}
                  disabled={conectando}
                  className="flex items-start gap-2.5 p-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] hover:border-[var(--warning)]/45 transition-all text-left cursor-pointer group active:scale-95 disabled:opacity-50"
                >
                  <div className="p-1.5 rounded-lg bg-[var(--bg-base)] text-[var(--text-secondary)] group-hover:text-[var(--warning)] border border-[var(--border)] shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[var(--text-primary)] group-hover:text-[var(--warning)]">
                      {mod.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] font-normal truncate">
                      {mod.desc}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
          <button
            onClick={onClose}
            disabled={conectando}
            className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] "
          >
            Cancelar
          </button>

          <button
            onClick={() => handleAcessar('/agenda')}
            disabled={conectando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold  active:scale-95 transition-all cursor-pointer disabled:opacity-60"
          >
            <ArrowUpRight className="h-4 w-4" />
            <span>{conectando ? 'Conectando...' : 'Entrar na Clínica'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

