'use client'

/**
 * app/onboarding/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tela de Onboarding e Boas-Vindas Pós-Pagamento (B2B SaaS).
 *
 * Captura dados iniciais da clínica (Nome fantasia, CNPJ/NIF, CRO, endereço)
 * e conclui a configuração do Tenant do dentista.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CheckCircle2,
  Building2,
  ShieldCheck,
  Phone,
  MapPin,
  UserCheck,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { completarOnboarding } from '@/app/actions/clinica'
import { supabase } from '@/app/lib/supabaseClient'

function OnboardingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [nomeClinica, setNomeClinica] = useState('')
  const [cnpjOuCpf, setCnpjOuCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [croResponsavel, setCroResponsavel] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const isMock = searchParams?.get('mock') === 'true'
  const plano = searchParams?.get('plano') || 'premium'

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
      }
    }
    checkAuth()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!nomeClinica.trim()) {
      setErro('Por favor, informe o nome fantasia da sua clínica.')
      return
    }

    setSalvando(true)

    try {
      const res = await completarOnboarding({
        nomeClinica,
        cnpjOuCpf,
        telefone,
        endereco,
        nomeResponsavel,
        croResponsavel,
      })

      if (!res.success) {
        setErro(res.error || 'Erro ao salvar informações da clínica.')
        setSalvando(false)
        return
      }

      setSucesso(true)
      setTimeout(() => {
        router.push('/overview')
      }, 1500)
    } catch (err: any) {
      setErro(err?.message || 'Erro inesperado.')
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-md dark:shadow-none relative overflow-hidden">
        {/* Header de Boas-Vindas */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--success-bg)] border border-[var(--success)]/30 text-[var(--success)] mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-subtle)] border border-[var(--primary)]/30 text-[var(--primary)] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Assinatura Ativada {isMock && '(Modo Desenvolvimento)'}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Bem-vindo ao OdontoSoft!
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-md mx-auto leading-relaxed">
            Seu pagamento foi confirmado com sucesso. Vamos configurar os dados iniciais
            da sua clínica para personalizar prontuários, receituários e impressos.
          </p>
        </div>

        {erro && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {erro}
          </div>
        )}

        {sucesso ? (
          <div className="p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500 text-white animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Clínica configurada com sucesso!</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Redirecionando para o seu painel de controle...
            </p>
            <div className="flex justify-center pt-2">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {/* Nome Fantasia */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[var(--primary)]" />
                Nome Fantasia da Clínica *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Odonto Arte & Saúde"
                value={nomeClinica}
                onChange={(e) => setNomeClinica(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all placeholder-[var(--text-secondary)]"
              />
            </div>

            {/* Grid: CNPJ/CPF + Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
                  CNPJ ou CPF do Responsável
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={cnpjOuCpf}
                  onChange={(e) => setCnpjOuCpf(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all placeholder-[var(--text-secondary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[var(--primary)]" />
                  Telefone / WhatsApp Comercial
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all placeholder-[var(--text-secondary)]"
                />
              </div>
            </div>

            {/* Grid: Responsável Técnico + CRO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                  Responsável Técnico
                </label>
                <input
                  type="text"
                  placeholder="Dr(a). Nome Sobrenome"
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all placeholder-[var(--text-secondary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
                  CRO / UF
                </label>
                <input
                  type="text"
                  placeholder="Ex: CRO-SP 123456"
                  value={croResponsavel}
                  onChange={(e) => setCroResponsavel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all placeholder-[var(--text-secondary)]"
                />
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[var(--primary)]" />
                Endereço Completo
              </label>
              <input
                type="text"
                placeholder="Av. Paulista, 1000, Sala 52 - Bela Vista, São Paulo/SP"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all placeholder-[var(--text-secondary)]"
              />
            </div>

            {/* Botão de Conclusão */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={salvando}
                className="w-full py-4 px-6 rounded-xl bg-[var(--primary-fill)] hover:bg-[var(--primary-fill-hover)] active:scale-98 disabled:opacity-50 text-[var(--on-primary)] font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xl "
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando Configurações...
                  </>
                ) : (
                  <>
                    Concluir e Acessar Meu Consultório
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4">
          <div className="w-10 h-10 border-2 border-[var(--primary)]/40 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-[var(--text-muted)] font-medium">Carregando dados da sua clínica...</p>
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  )
}

