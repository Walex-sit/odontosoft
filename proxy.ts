/**
 * proxy.ts  (Next.js 16 — substitui middleware.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 * Proteção de rotas autenticadas via @supabase/ssr.
 *
 * REGRAS:
 *  ✅ Usa supabase.auth.getUser() — validação JWT real no servidor.
 *  ✅ Rotas protegidas (padrão): redireciona para /login se sem sessão.
 *  ✅ Rotas públicas (/login, /api/*): passam sem verificação.
 *  ✅ Renova cookies de sessão expirados via setAll (requisito do @supabase/ssr).
 *  ✅ TRIAL GUARD: se o trial de 7 dias expirou e não há assinatura ativa,
 *     redireciona para /trial-expirado — exceto para super_admin / is_lifetime.
 *  ✅ LIFETIME EXCEPTION: utilizadores com is_lifetime=true ou role='super_admin'
 *     NUNCA são afetados pelo trial guard, garantia vitalícia permanente.
 *
 * ATENÇÃO: O proxy é uma barreira otimista. A autorização definitiva (RBAC)
 * ocorre nas Server Actions via requireAuth()/requireRole().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rotas que NÃO exigem autenticação nem verificação de trial
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/acesso-negado',
  '/trial-expirado',
  '/planos',
  '/termos',
  '/privacidade',
  '/termos-de-uso',
  '/politica-de-privacidade',
  '/onboarding',
]

// Rotas de API e sistema que nunca devem ser bloqueadas
const SYSTEM_PATH_PREFIXES = ['/api/', '/_next/', '/favicon']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Deixar rotas públicas e de sistema passarem sem verificação
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    SYSTEM_PATH_PREFIXES.some((p) => pathname.startsWith(p))

  if (isPublic) {
    return NextResponse.next()
  }

  // ── BYPASS DE AUTENTICAÇÃO PARA TESTES E2E ─────────────────────────────────
  // O Playwright não consegue interceptar chamadas HTTP feitas pelo processo
  // Node.js do middleware/proxy (server-side).
  // REGRA DE SEGURANÇA ESTRITA:
  //  1. NUNCA é executado quando NODE_ENV === 'production' (bloqueio incondicional).
  //  2. Exige E2E_TEST_MODE === 'true' explicitamente configurado.
  //  3. Exige segredo forte de no mínimo 32 caracteres.
  //  4. Compara o segredo de forma segura contra manipulação de headers.
  const isProduction = process.env.NODE_ENV === 'production'
  const bypassHeader = request.headers.get('x-e2e-bypass-auth')

  if (isProduction) {
    if (bypassHeader) {
      console.warn('[SECURITY ALERT] Tentativa de bypass E2E rejeitada incondicionalmente em ambiente de produção.')
    }
  } else {
    const e2eSecret = process.env.E2E_AUTH_SECRET
    const e2eMode = process.env.E2E_TEST_MODE === 'true'

    if (e2eMode && e2eSecret && e2eSecret.length >= 32 && bypassHeader) {
      if (bypassHeader === e2eSecret) {
        return NextResponse.next()
      }
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // 2. Criar resposta base para poder escrever cookies de refresh
  const response = NextResponse.next({ request })

  // 3. Criar cliente Supabase para o contexto do proxy (usa cookies do request)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 4. Validar sessão via JWT — getUser() faz verificação criptográfica real
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Sem usuário autenticado → redirecionar para /login
  if (!user) {
    const loginUrl = new URL('/login', request.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }

  // ── TRIAL GUARD & LIFETIME EXCEPTION ───────────────────────────────────────
  // Toda rota autenticada não-pública é submetida à verificação de trial.
  // A lista de exclusão é apenas para rotas autenticadas que NÃO devem
  // ser bloqueadas pelo paywall (ex: /imprimir, futuras rotas de webhook).
  // Auditoria 6.3: substituída lista hardcoded de 9 rotas por lógica inversa
  // para cobrir todas as 23+ rotas do layout (dashboard).
  const TRIAL_EXEMPT_AUTHENTICATED_PATHS = [
    '/imprimir',                   // Impressão de documentos (já autenticado)
    '/aceitar-convite',            // Convite de equipe
    '/establishment/subscription', // Gestão de pagamento e regularização de assinatura
  ]
  const isTrialExempt = TRIAL_EXEMPT_AUTHENTICATED_PATHS.some(
    (p) => pathname.startsWith(p)
  )
  const isDashboardRoute = !isTrialExempt

  if (isDashboardRoute) {
    try {
      // Busca perfil + clínica de forma eficiente (single query)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, clinica_id, is_lifetime')
        .eq('id', user.id)
        .maybeSingle()

      // ── REGRA CRÍTICA: Exceção de Acesso Vitalício e Super Admin ─────────
      // A identidade do proprietário é determinada EXCLUSIVAMENTE pelo banco de dados:
      //   - role = 'super_admin'   → atribuído via migration ou service_role
      //   - is_lifetime = true     → atribuído via migration ou service_role
      //
      // NÃO existe mais fallback por e-mail hardcoded no código-fonte.
      // Se OWNER_EMAIL estiver configurado, ele serve apenas como verificação
      // adicional de dupla autenticação — mas NUNCA concede privilégios sozinho.
      //
      // Auditoria R-004 (Etapa 4): fallback 'testealex@gmail.com' removido.
      const configuredOwnerEmail = process.env.OWNER_EMAIL || process.env.SUPERADMIN_EMAIL || null

      if (!configuredOwnerEmail) {
        // Variável não configurada: acesso especial determinado apenas pelo banco.
        // Não registrar o email ausente em logs para evitar exposição de config.
        console.warn('[proxy] OWNER_EMAIL não configurado. Acesso vitalício determinado exclusivamente por is_lifetime/role no banco.')
      }

      // isOwnerExactMatch só é verdadeiro se OWNER_EMAIL estiver configurado E
      // o email do usuário corresponder E o banco confirmar is_lifetime ou super_admin.
      const isOwnerExactMatch = Boolean(
        configuredOwnerEmail &&
        user.email &&
        user.email.toLowerCase().trim() === configuredOwnerEmail.toLowerCase().trim() &&
        (profile?.role === 'super_admin' || profile?.is_lifetime === true)
      )

      const isSuperAdmin = profile?.role === 'super_admin'
      const isLifetime = profile?.is_lifetime === true || isOwnerExactMatch

      if (isLifetime || isSuperAdmin) {
        // Acesso vitalício irrestrito permanente — nunca é bloqueado por trial
        return response
      }

      // ── Verificação de Trial Expirado ──────────────────────────────────────
      if (profile?.clinica_id) {
        const { data: clinica } = await supabase
          .from('clinicas')
          .select('status_assinatura, trial_ends_at, ativo')
          .eq('id', profile.clinica_id)
          .maybeSingle()

        if (clinica) {
          const trialExpirado =
            clinica.status_assinatura === 'trial' &&
            clinica.trial_ends_at !== null &&
            new Date(clinica.trial_ends_at) < new Date()

          const inadimplente =
            clinica.status_assinatura === 'inadimplente' ||
            clinica.status_assinatura === 'cancelado' ||
            clinica.ativo === false

          if (trialExpirado || inadimplente) {
            // Não bloqueia /trial-expirado para evitar loop infinito
            if (!pathname.startsWith('/trial-expirado')) {
              const paywallUrl = new URL('/trial-expirado', request.nextUrl.origin)
              return NextResponse.redirect(paywallUrl)
            }
          }
        }
      }
    } catch (err) {
      // Em caso de erro na verificação de trial, NUNCA bloqueia o acesso.
      // Falha aberta (fail-open) para não causar lock-out por erro de rede.
      console.error('[proxy] Erro ao verificar trial:', err)
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // 6. Sessão válida e trial OK → prosseguir com cookies atualizados
  return response
}

// Matcher: executa o proxy em todas as rotas exceto arquivos estáticos
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
