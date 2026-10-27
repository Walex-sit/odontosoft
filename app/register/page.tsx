'use client'

/**
 * app/register/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Página de Registo de Novas Clínicas — OdontoSoft SaaS
 *
 * Melhorias de Segurança e UX:
 *  1. Validação Robusta com Zod (regras de senha, campos obrigatórios, erros inline).
 *  2. Validação Prévia e Server-Side de Unicidade do Nome da Clínica.
 *  3. Tratamento Elegante e Contextual para E-mail Já Cadastrado (com link direto para /login).
 *  4. Prevenção de contas órfãs no Auth caso a clínica seja duplicada.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import {
  registrarNovaClinica,
  verificarDisponibilidadeNomeClinica,
} from '../actions/register'
import {
  registerSchema,
  type RegisterFormData,
  type RegisterFormErrors,
} from '../lib/validations/register'
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'

type Step = 'form' | 'loading' | 'success'

export default function RegisterPage() {
  const router = useRouter()

  const [formData, setFormData] = useState<RegisterFormData>({
    nomeClinica: '',
    email: '',
    senha: '',
    confirmarSenha: '',
  })

  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [errors, setErrors] = useState<RegisterFormErrors>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [emailJaEmUso, setEmailJaEmUso] = useState(false)
  const [step, setStep] = useState<Step>('form')

  // Indicadores de segurança da senha
  const senhaValidaTamanho = formData.senha.length >= 8
  const senhaTemLetra = /[A-Za-z]/.test(formData.senha)
  const senhaTemNumero = /[0-9]/.test(formData.senha)

  function handleChange(field: keyof RegisterFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpa o erro inline do campo quando o usuário digita
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }

    if (field === 'email' && emailJaEmUso) {
      setEmailJaEmUso(false)
    }

    if (erroGeral) {
      setErroGeral(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErroGeral(null)
    setEmailJaEmUso(false)
    setErrors({})

    // 1. Validação de Entrada Robusta com Zod
    const validation = registerSchema.safeParse(formData)

    if (!validation.success) {
      const fieldErrors: RegisterFormErrors = {}
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as keyof RegisterFormData
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    const { nomeClinica, email, senha } = validation.data

    setStep('loading')

    try {
      // 2. Validação de Unicidade do Nome da Clínica (antes de tocar no Supabase Auth)
      //    Evita criar utilizadores Auth órfãos caso o nome da clínica já exista.
      const checagemClinica = await verificarDisponibilidadeNomeClinica(nomeClinica)
      if (!checagemClinica.disponivel) {
        const msgErro =
          checagemClinica.error ||
          'Já existe uma clínica registada com este nome. Escolha outro nome ou contacte o suporte.'
        setErrors({ nomeClinica: msgErro })
        setErroGeral(msgErro)
        setStep('form')
        return
      }

      // 3. Criar utilizador no Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password: senha,
        options: {
          data: { nome_clinica: nomeClinica },
        },
      })

      // 4. Tratamento Elegante de Email Duplicado
      const isDuplicateEmail =
        signUpError?.message?.toLowerCase().includes('already registered') ||
        signUpError?.message?.toLowerCase().includes('already in use') ||
        (signUpError as unknown as { code?: string })?.code === 'user_already_exists' ||
        (signUpError as unknown as { status?: number })?.status === 422 ||
        (signUpData?.user &&
          Array.isArray(signUpData.user.identities) &&
          signUpData.user.identities.length === 0)

      if (isDuplicateEmail) {
        setEmailJaEmUso(true)
        setErrors((prev) => ({
          ...prev,
          email: 'Este email já está registado.',
        }))
        setStep('form')
        return
      }

      if (signUpError) {
        setErroGeral(signUpError.message)
        setStep('form')
        return
      }

      // 5. Provisionar nova clínica na Server Action (segunda linha de defesa e isolamento de tenant)
      const result = await registrarNovaClinica({ nomeClinica })

      if (!result.success) {
        // Se a Server Action retornar duplicidade de nome
        if (result.error?.includes('Já existe uma clínica registada com este nome')) {
          setErrors({ nomeClinica: result.error })
        }
        setErroGeral(result.error || 'Erro ao configurar a clínica. Tente novamente.')
        setStep('form')
        return
      }

      // 6. Sucesso — transição suave para o dashboard
      setStep('success')
      setTimeout(() => {
        router.push('/overview')
      }, 1800)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro inesperado. Tente novamente.'
      setErroGeral(msg)
      setStep('form')
    }
  }

  const isLoading = step === 'loading'

  return (
    <div className="min-h-screen w-full flex font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* ── Painel Esquerdo (visual de autoridade odontológica e SaaS) ─────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0b3366] via-[#1258b8] to-[#0d84bf] flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Efeitos de luz e profundidade */}
        <div className="absolute w-[620px] h-[620px] bg-white/5 rounded-full -top-28 -right-28 blur-3xl pointer-events-none" />
        <div className="absolute w-[440px] h-[440px] bg-cyan-400/10 rounded-full bottom-0 -left-20 blur-3xl pointer-events-none" />

        {/* Grid pontilhado suave */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 px-12 text-center max-w-lg">
          {/* Símbolo do SaaS */}
          <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-950/40">
            <svg
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2C8.5 2 5 5.5 5 9c0 3 2 5.5 4 7l1 5h4l1-5c2-1.5 4-4 4-7 0-3.5-3.5-7-7-7z" />
              <path d="M9 9h6M12 6v6" />
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight drop-shadow-xs">
            Comece agora.<br />Gratuitamente.
          </h1>
          <p className="text-blue-100/90 text-base leading-relaxed mb-10">
            Configure a sua clínica com isolamento rigoroso de dados. Gestão clínica, financeira e agenda prontas no primeiro acesso.
          </p>

          {/* Destaques de Segurança e Conformidade */}
          <div className="space-y-3.5 text-left bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-xs">
            {[
              { title: 'Isolamento Multi-Tenant Rigoroso', desc: 'Dados protegidos com Row-Level Security no Postgres' },
              { title: 'Conformidade CFO & LGPD', desc: 'Prontuários e termos com integridade jurídica' },
              { title: 'Disponibilidade Instantânea', desc: 'Sem necessidade de cartão de crédito para iniciar' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{item.title}</p>
                  <p className="text-blue-200/75 text-[11px]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel Direito (formulário interativo) ────────────────────────── */}
      <div className="w-full lg:w-1/2 bg-[#f8fafc] flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="w-full max-w-sm relative my-auto py-6">
          {step === 'success' ? (
            /* ── Tela de Sucesso ── */
            <div className="flex flex-col items-center text-center py-10 space-y-5 animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center shadow-lg shadow-emerald-100 animate-pulse">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                  Clínica registada com sucesso!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  A configurar o seu ambiente com segurança…
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                A carregar o seu Dashboard
              </div>
            </div>
          ) : (
            <>
              {/* Header do Formulário */}
              <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-200 mb-3.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C8.5 2 5 5.5 5 9c0 3 2 5.5 4 7l1 5h4l1-5c2-1.5 4-4 4-7 0-3.5-3.5-7-7-7z" />
                    <path d="M9 9h6M12 6v6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-[#0f3469] tracking-tight">
                  Criar conta no OdontoSoft
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Registe a sua clínica e comece a gerir os seus pacientes
                </p>
              </div>

              {/* ── ALERTA DE E-MAIL DUPLICADO (Tratamento Elegante e Proativo) ── */}
              {emailJaEmUso && (
                <div className="mb-5 p-4 rounded-xl bg-amber-50/95 border border-amber-200/90 shadow-xs text-amber-900 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-amber-900 text-[13px] leading-snug">
                        Este email já está em uso. Deseja iniciar sessão?
                      </p>
                      <p className="text-xs text-amber-700/90 mt-1 leading-relaxed">
                        Encontrámos uma conta associada a <strong className="font-medium text-amber-900">{formData.email}</strong>.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          href={`/login`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1258b8] hover:bg-[#0e46a0] text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                          Iniciar sessão
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEmailJaEmUso(false)}
                          className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium transition-colors"
                        >
                          Tentar outro e-mail
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Erro Geral (quando não for erro inline específico) */}
              {erroGeral && !emailJaEmUso && !errors.nomeClinica && (
                <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{erroGeral}</span>
                </div>
              )}

              {/* Formulário */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* 1. Nome da Clínica */}
                <div>
                  <label
                    htmlFor="register-nome-clinica"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Nome da Clínica <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Building2 className={`h-4 w-4 ${errors.nomeClinica ? 'text-rose-400' : 'text-slate-400'}`} />
                    </div>
                    <input
                      type="text"
                      id="register-nome-clinica"
                      data-testid="input-register-nome-clinica"
                      disabled={isLoading}
                      required
                      placeholder="Ex: Clínica Sorriso Perfeito"
                      value={formData.nomeClinica}
                      onChange={(e) => handleChange('nomeClinica', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-slate-800 text-sm placeholder:text-slate-400 transition-all shadow-2xs disabled:opacity-60 focus:outline-hidden ${
                        errors.nomeClinica
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
                          : 'border-slate-200 focus:border-[#1258b8] focus:ring-3 focus:ring-[#1258b8]/15'
                      }`}
                    />
                  </div>
                  {errors.nomeClinica && (
                    <p className="mt-1 text-xs text-rose-600 flex items-start gap-1 font-medium leading-tight">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{errors.nomeClinica}</span>
                    </p>
                  )}
                </div>

                {/* 2. E-mail do Administrador */}
                <div>
                  <label
                    htmlFor="register-email"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    E-mail do Administrador <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className={`h-4 w-4 ${errors.email ? 'text-rose-400' : 'text-slate-400'}`} />
                    </div>
                    <input
                      type="email"
                      id="register-email"
                      data-testid="input-register-email"
                      autoComplete="email"
                      disabled={isLoading}
                      required
                      placeholder="dr.exemplo@clinica.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-slate-800 text-sm placeholder:text-slate-400 transition-all shadow-2xs disabled:opacity-60 focus:outline-hidden ${
                        errors.email
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
                          : 'border-slate-200 focus:border-[#1258b8] focus:ring-3 focus:ring-[#1258b8]/15'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-rose-600 flex items-start gap-1 font-medium leading-tight">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* 3. Senha */}
                <div>
                  <label
                    htmlFor="register-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Senha de Acesso <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className={`h-4 w-4 ${errors.senha ? 'text-rose-400' : 'text-slate-400'}`} />
                    </div>
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      id="register-password"
                      data-testid="input-register-password"
                      autoComplete="new-password"
                      disabled={isLoading}
                      required
                      placeholder="Mínimo de 8 caracteres"
                      value={formData.senha}
                      onChange={(e) => handleChange('senha', e.target.value)}
                      className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-slate-800 text-sm placeholder:text-slate-400 transition-all shadow-2xs disabled:opacity-60 focus:outline-hidden ${
                        errors.senha
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
                          : 'border-slate-200 focus:border-[#1258b8] focus:ring-3 focus:ring-[#1258b8]/15'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Checklist visual discreto de força da senha */}
                  {formData.senha.length > 0 && (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center justify-between text-[11px] text-slate-500">
                      <span className={`flex items-center gap-1 ${senhaValidaTamanho ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${senhaValidaTamanho ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        8+ caracteres
                      </span>
                      <span className={`flex items-center gap-1 ${senhaTemLetra ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${senhaTemLetra ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        Pelo menos 1 letra
                      </span>
                      <span className={`flex items-center gap-1 ${senhaTemNumero ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${senhaTemNumero ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        Pelo menos 1 número
                      </span>
                    </div>
                  )}

                  {errors.senha && (
                    <p className="mt-1 text-xs text-rose-600 flex items-start gap-1 font-medium leading-tight">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{errors.senha}</span>
                    </p>
                  )}
                </div>

                {/* 4. Confirmar Senha */}
                <div>
                  <label
                    htmlFor="register-confirm-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Confirmar Senha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className={`h-4 w-4 ${errors.confirmarSenha ? 'text-rose-400' : 'text-slate-400'}`} />
                    </div>
                    <input
                      type={mostrarConfirmar ? 'text' : 'password'}
                      id="register-confirm-password"
                      data-testid="input-register-confirm-password"
                      autoComplete="new-password"
                      disabled={isLoading}
                      required
                      placeholder="Repita a sua senha"
                      value={formData.confirmarSenha}
                      onChange={(e) => handleChange('confirmarSenha', e.target.value)}
                      className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-slate-800 text-sm placeholder:text-slate-400 transition-all shadow-2xs disabled:opacity-60 focus:outline-hidden ${
                        errors.confirmarSenha
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
                          : 'border-slate-200 focus:border-[#1258b8] focus:ring-3 focus:ring-[#1258b8]/15'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      title={mostrarConfirmar ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {mostrarConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmarSenha && (
                    <p className="mt-1 text-xs text-rose-600 flex items-start gap-1 font-medium leading-tight">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{errors.confirmarSenha}</span>
                    </p>
                  )}
                </div>

                {/* Botão Criar Conta */}
                <button
                  type="submit"
                  id="register-submit"
                  data-testid="btn-register-submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[#1258b8] hover:bg-[#0e46a0] active:scale-[0.99] disabled:opacity-65 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-200 transition-all cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A validar e criar a sua clínica…
                    </>
                  ) : (
                    <>
                      Criar conta gratuita
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Link para Login */}
              <p className="mt-5 text-center text-xs sm:text-sm text-slate-500">
                Já tem uma conta registada?{' '}
                <Link
                  href="/login"
                  className="text-[#1258b8] font-semibold hover:underline transition-all"
                >
                  Entrar
                </Link>
              </p>

              {/* Rodapé de Segurança e LGPD */}
              <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Dados encriptados e isolados com conformidade CFO/LGPD.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
