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
 *
 * ATENÇÃO: O proxy é uma barreira otimista. A autorização definitiva (RBAC)
 * ocorre nas Server Actions via requireAuth()/requireRole().
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rotas que NÃO exigem autenticação
const PUBLIC_PATHS = [
  '/login',
  '/acesso-negado',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Deixar rotas públicas passarem sem verificação
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')

  if (isPublic) {
    return NextResponse.next()
  }

  // ── BYPASS DE AUTENTICAÇÃO PARA TESTES E2E ─────────────────────────────────
  // O Playwright não consegue interceptar chamadas HTTP feitas pelo processo
  // Node.js do middleware (server-side). Por isso, quando E2E_TEST_MODE=true
  // e o header secreto coincide, o middleware libera a passagem sem verificar JWT.
  // ESTA BRANCH NUNCA É ATINGIDA EM PRODUÇÃO (E2E_TEST_MODE nunca é 'true' lá).
  const e2eSecret = process.env.E2E_AUTH_SECRET
  const e2eMode = process.env.E2E_TEST_MODE === 'true'
  const bypassHeader = request.headers.get('x-e2e-bypass-auth')

  if (e2eMode && e2eSecret && bypassHeader === e2eSecret) {
    return NextResponse.next()
  }
  // ──────────────────────────────────────────────────────────────────────────

  // 2. Criar resposta base para poder escrever cookies de refresh
  const response = NextResponse.next({
    request,
  })

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
          // Propaga cookies atualizados tanto no request quanto na response
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

  // 6. Sessão válida → prosseguir com cookies atualizados
  return response
}

// Matcher: executa o proxy em todas as rotas exceto arquivos estáticos
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
