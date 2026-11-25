# Configuração de Produção — OdontoSoft

Documento de auditoria técnica de variáveis de ambiente, validação fail-closed, matriz de implantação na Vercel e procedimento seguro para criação da conta `owner` (`super_admin`) no Supabase remoto.

> **Escopo e fidelidade:** Todas as informações deste documento foram verificadas diretamente no código-fonte e nas migrations do repositório. Nenhum segredo real foi exposto e nenhuma operação foi executada no Supabase remoto.

---

## 1. Inventário Completo de Variáveis de Ambiente

Foram identificadas **28 variáveis de ambiente** referenciadas no projeto (23 em código de aplicação/infraestrutura e 5 exclusivas de testes/CI).

> **Observação sobre nomes:** O projeto utiliza `NEXT_PUBLIC_SUPABASE_ANON_KEY` (não existe `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no código). A variável `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` consta apenas em `.env.example`, sem nenhuma referência no código-fonte.

### 1.1 Tabela Resumo (Aplicação e Infraestrutura)

| Variável | Utilizada em | Obrigatória em produção? | O que acontece se faltar | Preview |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `app/lib/supabase/client.ts`, `server.ts`, `admin.ts`, `proxy.ts`, `scripts/*` | **Sim** | Lança exceção na carga do módulo (`client.ts`, `server.ts`, `admin.ts`); quebra `proxy.ts` | **Sim** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `app/lib/supabase/client.ts`, `server.ts`, `proxy.ts` | **Sim** | Lança exceção na carga do módulo (`client.ts`, `server.ts`); falha autenticação no `proxy.ts` | **Sim** |
| `SUPABASE_SERVICE_ROLE_KEY` | `app/lib/supabase/admin.ts`, `scripts/*` | **Sim** | Lança exceção ao carregar `admin.ts` (afeta OTP, registro, webhook e ações admin) | **Sim** (projeto separado) |
| `OTP_SECRET` | `app/actions/validation-code.ts` | **Sim** | Lança erro `[SECURITY FATAL]` ao gerar/validar OTP no cadastro de clínicas | **Sim** |
| `RESEND_API_KEY` | `app/lib/email/resend.ts` | **Sim** | Em `NODE_ENV === 'production'`, `sendOtpEmail` falha de forma segura e bloqueia registro | Opcional |
| `RESEND_FROM_EMAIL` | `app/lib/email/resend.ts` | **Sim (em produção)** | Em `NODE_ENV === 'production'`, não usa fallback `onboarding@resend.dev`; `EMAIL_FROM` fica vazio e `sendOtpEmail` falha fechado | Opcional |
| `NEXT_PUBLIC_APP_URL` | `app/lib/env.ts` (`getAppUrl()`), consumida em `app/actions/users.ts` e `app/api/checkout/route.ts` | **Sim** | Em `NODE_ENV === 'production'`, `getAppUrl()` lança erro explícito (sem fallback `localhost`). Em dev/testes, usa `http://localhost:3000` | **Sim** |
| `OWNER_EMAIL` | `proxy.ts`, `app/actions/billing.ts` | Não | Emite `console.warn` no `proxy.ts`; privilégios continuam determinados pelo banco | Não / Opcional |
| `SUPERADMIN_EMAIL` | `proxy.ts`, `app/actions/billing.ts` | Não (alias legado) | Ignorada se `OWNER_EMAIL` estiver definida; mesmo comportamento de `OWNER_EMAIL` | Não |
| `NEXT_PUBLIC_OWNER_EMAIL` | Removida dos componentes cliente analisados (`RequireAuth.tsx`, `configuracoes/page.tsx`) | Não (não configurar em Prod) | Sem impacto na UI; exibição condicional usa `role === 'super_admin'` e `is_lifetime === true` do banco | Não |
| `STRIPE_PAYMENTS_DISABLED` | `app/api/checkout/route.ts` | Não (usar `'true'` agora) | Se não for `'true'`, checkout depende de `STRIPE_SECRET_KEY` válida | Opcional (`'true'`) |
| `STRIPE_WEBHOOK_DISABLED` | `app/api/webhooks/payment/route.ts` | Não (usar `'true'` agora) | Se não for `'true'`, webhook processa eventos no banco após validar assinatura | Opcional (`'true'`) |
| `STRIPE_SECRET_KEY` | `app/lib/stripe.ts` (`getStripeClient()`), `app/api/checkout/route.ts` | Só se Stripe ativo | Inicialização preguiçosa (lazy) não instancia o SDK no import; se `getStripeClient()` for chamado sem chave válida, lança erro explícito (sem chave fictícia); `/api/checkout` retorna HTTP 503 | Opcional (teste) |
| `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/payment/route.ts` | Só se Stripe ativo | Endpoint `/api/webhooks/payment` rejeita requisições com HTTP 400 | Opcional (teste) |
| `STRIPE_PRICE_ID_ESSENCIAL` | `app/lib/stripe.ts` | Não (se Stripe inativo) | Usa fallback `'price_essencial_mensal'` (atualmente `/api/checkout` usa `price_data` inline) | Não |
| `STRIPE_PRICE_ID_PREMIUM` | `app/lib/stripe.ts` | Não (se Stripe inativo) | Usa fallback `'price_premium_mensal'` (atualmente `/api/checkout` usa `price_data` inline) | Não |
| `NODE_ENV` | `next.config.ts`, `proxy.ts`, `app/lib/env.ts`, `resend.ts`, `admin-global.ts`, `webhooks/payment/route.ts` | **Sim** (automática) | Definida automaticamente pelo Next.js/Vercel (`production` em Prod e Preview) | Automática |
| `NEXT_PUBLIC_APP_ENV` | `app/lib/env.ts` | Não | `IS_NON_PRODUCTION_ENV` avalia apenas `NODE_ENV` e `NEXT_PUBLIC_VERCEL_ENV` | Opcional (`staging`) |
| `NEXT_PUBLIC_VERCEL_ENV` | `app/lib/env.ts` | Não | `IS_NON_PRODUCTION_ENV` não detecta Preview via esta variável se não configurada | Opcional (`preview`) |
| `NEXT_PUBLIC_SHOW_CANCELLATION_POLICY` | `app/lib/env.ts` (`app/planos/page.tsx`) | Não | `SHOW_CANCELLATION_POLICY` fica `false` e oculta o bloco de cancelamento | Não |
| `NEXT_PUBLIC_COMPANY_LEGAL_NAME` | `app/lib/brand.ts` | Não (recomendada LGPD) | String vazia no rodapé/termos | Não |
| `NEXT_PUBLIC_COMPANY_CNPJ` | `app/lib/brand.ts` | Não (recomendada LGPD) | String vazia no rodapé/termos | Não |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `app/lib/brand.ts` | Não (recomendada LGPD) | String vazia no rodapé/contato | Não |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `app/lib/brand.ts` | Não | Faz fallback seguro para `NEXT_PUBLIC_CONTACT_EMAIL` | Não |
| `NEXT_PUBLIC_DPO_EMAIL` | `app/lib/brand.ts` | Não (recomendada LGPD) | String vazia na seção LGPD | Não |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL` | `app/lib/brand.ts` | Não | Link do Instagram omitido (aceita apenas `http://` ou `https://`) | Não |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN_URL` | `app/lib/brand.ts` | Não | Link do LinkedIn omitido (aceita apenas `http://` ou `https://`) | Não |
| `NEXT_PUBLIC_SOCIAL_YOUTUBE_URL` | `app/lib/brand.ts` | Não | Link do YouTube omitido (aceita apenas `http://` ou `https://`) | Não |

### 1.2 Variáveis Exclusivas de Testes / CI (Não cadastrar em Produção/Preview)

- `E2E_TEST_MODE` (`proxy.ts`): habilita bypass E2E apenas quando `NODE_ENV !== 'production'`. Em produção é ignorada incondicionalmente.
- `E2E_AUTH_SECRET` (`proxy.ts`): segredo de mínimo 32 caracteres para bypass E2E em ambiente não-produtivo.
- `PLAYWRIGHT_TEST_BASE_URL` (`playwright.config.ts`): URL base dos testes Playwright.
- `PLAYWRIGHT_NO_WEBSERVER` (`playwright.config.ts`): desativa subida automática do servidor no Playwright.
- `CI` (`playwright.config.ts`): ajusta `forbidOnly`, `retries` e `workers` em pipelines CI.

### 1.3 Classificação Detalhada (Fallback, Segurança e Impacto)

- **Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`):** Sem fallback. `SUPABASE_SERVICE_ROLE_KEY` é **secret** de servidor protegida por `import 'server-only'` em `app/lib/supabase/admin.ts`. A ausência de qualquer uma das três quebra inicialização/rotas que importam os clientes Supabase.
- **`OTP_SECRET`:** **Secret** de servidor (`app/actions/validation-code.ts`). Sem fallback. Falha fechada em runtime na primeira chamada de geração/validação de OTP.
- **`RESEND_API_KEY`:** **Secret** de servidor (`app/lib/email/resend.ts`, protegida por `import 'server-only'`). Em `NODE_ENV === 'production'`, não possui fallback: retorna `{ success: false }` e impede envio de OTP. Em desenvolvimento, simula envio com log seguro (sem expor código).
- **`RESEND_FROM_EMAIL`:** Configuração de servidor (`app/lib/email/resend.ts`). Em `NODE_ENV === 'production'`, o fallback `OdontoSoft <onboarding@resend.dev>` foi removido: se ausente, `EMAIL_FROM` fica vazio e `sendOtpEmail` falha fechado retornando erro de remetente não configurado. O fallback `onboarding@resend.dev` permanece restrito a ambientes não-produtivos.
- **`NEXT_PUBLIC_APP_URL`:** Pública, validada centralmente por `getAppUrl()` em `app/lib/env.ts` (consumida por `app/actions/users.ts` e `app/api/checkout/route.ts`). Em `NODE_ENV === 'production'`, exige URL válida com protocolo `http://` ou `https://` e lança erro explícito se ausente ou inválida (sem fallback para `localhost`). Em desenvolvimento/testes, mantém fallback para `http://localhost:3000`.
- **`STRIPE_SECRET_KEY`:** **Secret** de servidor (`app/lib/stripe.ts`, protegida por `import 'server-only'`). A chave fictícia anterior (`'sk_test_chave_falsa_apenas_para_o_build_passar'`) foi removida. O módulo adota inicialização preguiçosa (`getStripeClient()` + `Proxy`), evitando instanciar o SDK no `import` quando o Stripe está desabilitado. Quando chamado sem chave válida (`sk_live_*`, `sk_test_*` ou `rk_*`, ou contendo `placeholder`/`chave_falsa`), `getStripeClient()` lança erro explícito; em `/api/checkout/route.ts`, o endpoint retorna HTTP 503 enquanto `STRIPE_PAYMENTS_DISABLED=true` ou sem chave válida.
- **`STRIPE_WEBHOOK_SECRET`:** **Secret** de servidor. Sem fallback. `/api/webhooks/payment/route.ts` rejeita com HTTP 400 se ausente ou contendo `placeholder`.
- **`OWNER_EMAIL` / `SUPERADMIN_EMAIL`:** Configuração/secret de servidor. Sem fallback hardcoded (removido na Auditoria Etapa 4). Apenas verificação adicional; não concede privilégio isoladamente.
- **`NEXT_PUBLIC_OWNER_EMAIL`:** Removida dos componentes cliente analisados (`app/components/RequireAuth.tsx` e `app/(dashboard)/configuracoes/page.tsx`), que passaram a verificar apenas `profile?.role === 'super_admin'` e `profile?.is_lifetime === true`. Não deve ser configurada em produção.
- **`IS_NON_PRODUCTION_ENV`:** Exportada em `app/lib/env.ts` com aviso explícito de uso exclusivo para indicadores visuais não sensíveis (ex.: selo de demonstração na landing page). Não é utilizada para autorização, autenticação ou bypass de controles de segurança em `proxy.ts`, `auth-guards.ts`, Server Actions ou API Routes.

---

## 2. Matriz Vercel (Production, Preview e Development)

| Categoria | Production | Preview | Development |
|---|---|---|---|
| **Secrets exclusivos de Produção** | `SUPABASE_SERVICE_ROLE_KEY` (projeto prod), `OTP_SECRET` (único), `RESEND_API_KEY` (prod), `STRIPE_SECRET_KEY` (`sk_live_*` quando ativo), `STRIPE_WEBHOOK_SECRET` (prod, quando ativo), `OWNER_EMAIL` | **Não reutilizar** os valores de Production | **Não reutilizar** os valores de Production |
| **Secrets utilizáveis em Preview (isolados)** | — | `SUPABASE_SERVICE_ROLE_KEY` (projeto staging/preview), `OTP_SECRET` (próprio de preview), `RESEND_API_KEY` (opcional/sandbox), `STRIPE_SECRET_KEY` (`sk_test_*`), `STRIPE_WEBHOOK_SECRET` (teste) | Valores locais de dev / Supabase local |
| **Variáveis Públicas** | `NEXT_PUBLIC_SUPABASE_URL` (prod), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (prod), `NEXT_PUBLIC_APP_URL` (domínio oficial `https://...`), dados `NEXT_PUBLIC_COMPANY_*` / `CONTACT` / `DPO` / `SOCIAL_*` | `NEXT_PUBLIC_SUPABASE_URL` (staging), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (staging), `NEXT_PUBLIC_APP_URL` (URL de preview), `NEXT_PUBLIC_VERCEL_ENV=preview` | `.env.local` com URLs locais |
| **Desativadas enquanto Stripe pendente** | `STRIPE_PAYMENTS_DISABLED=true`, `STRIPE_WEBHOOK_DISABLED=true` (manter `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` vazias/não cadastradas) | `STRIPE_PAYMENTS_DISABLED=true`, `STRIPE_WEBHOOK_DISABLED=true` | Opcional / teste local |
| **Variáveis Opcionais** | `NEXT_PUBLIC_SHOW_CANCELLATION_POLICY`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_SOCIAL_*` | `NEXT_PUBLIC_APP_ENV=staging`, `NEXT_PUBLIC_SHOW_CANCELLATION_POLICY` | `E2E_TEST_MODE`, `E2E_AUTH_SECRET` |

**Regra de isolamento:** Nunca compartilhe `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `OTP_SECRET` ou chaves Stripe live entre **Production** e **Preview**. Se Preview apontar para o Supabase de produção, testes em PRs alterarão dados reais de clínicas.

---

## 3. Secrets e Variáveis Públicas

- **Proteção server-only comprovada:** `app/lib/supabase/admin.ts`, `app/lib/supabase/server.ts`, `app/lib/email/resend.ts` e `app/lib/stripe.ts` importam `'server-only'`, garantindo erro de build caso sejam importados em Client Components. O catálogo compartilhado de planos foi isolado em `app/lib/plans.ts` (`TRIAL_PLAN` e `PLANOS_SAAS_CATALOG`), evitando acoplamento de componentes de UI com o SDK do Stripe.
- **Variáveis expostas no bundle cliente:** Tudo com prefixo `NEXT_PUBLIC_*` é injetado estaticamente no JavaScript do navegador durante o `next build`.
- **Remoção de `NEXT_PUBLIC_OWNER_EMAIL` do cliente:** Os componentes cliente analisados (`app/components/RequireAuth.tsx` e `app/(dashboard)/configuracoes/page.tsx`) deixaram de referenciar `NEXT_PUBLIC_OWNER_EMAIL`, passando a depender exclusivamente de `role` e `is_lifetime` oriundos do banco. Ainda assim, **não configure** `NEXT_PUBLIC_OWNER_EMAIL` em produção para evitar exposição desnecessária no bundle caso algum build antigo ou externo a referencie.

---

## 4. Comportamento Quando Variáveis Estão Ausentes

- **Build (`next build`):** Não falha por ausência de `STRIPE_SECRET_KEY` (graças à inicialização preguiçosa em `app/lib/stripe.ts`, que não instancia o SDK no import), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OTP_SECRET` ou `OWNER_EMAIL`. Pode falhar durante pré-renderização/coleta de rotas se `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` estiverem ausentes em módulos importados estaticamente.
- **Middleware (`proxy.ts`):** Utiliza `process.env.NEXT_PUBLIC_SUPABASE_URL!` e `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` com non-null assertion; se ausentes em runtime, `createServerClient` falhará ao validar sessão.
- **Links de Convite e URLs de Retorno:** Em `NODE_ENV === 'production'`, a ausência ou formato inválido de `NEXT_PUBLIC_APP_URL` faz `getAppUrl()` lançar erro explícito (fail-closed), impedindo geração de links apontando para `localhost`.
- **Registro de Clínicas / OTP:** Sem `RESEND_API_KEY` ou sem `RESEND_FROM_EMAIL` em `NODE_ENV === 'production'`, ou sem `OTP_SECRET`, o fluxo falha de forma fechada (retorna erro ao usuário e não cria clínica).
- **Checkout / Webhook Stripe:** Sem `STRIPE_SECRET_KEY` válida, `/api/checkout` retorna HTTP 503 e qualquer chamada direta a `getStripeClient()` lança erro explícito. Sem `STRIPE_WEBHOOK_SECRET`, `/api/webhooks/payment` retorna HTTP 400.

---

## 5. Análise de Fail-Closed e Riscos Encontrados

O sistema **não possui validação centralizada única no boot da aplicação** (o arquivo `app/lib/env.ts` contém `IS_NON_PRODUCTION_ENV`, `SHOW_CANCELLATION_POLICY` e a função `getAppUrl()`). A validação ocorre **por módulo ou na primeira utilização em runtime**.

| Risco / Achado | Arquivo e Evidência | Estado Pós-Hardening | Impacto / Observação |
|---|---|---|---|
| **Ausência de validação centralizada no boot** | `app/lib/env.ts` | **Pendente** | Erros de configuração (`OTP_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`) são detectados por módulo na primeira utilização em runtime, não no boot único |
| **Fallback para `localhost` em produção** | `app/lib/env.ts` (`getAppUrl()`), `app/actions/users.ts`, `app/api/checkout/route.ts` | **Mitigado** | `getAppUrl()` exige `NEXT_PUBLIC_APP_URL` válida (`http://` ou `https://`) em `NODE_ENV === 'production'` e lança erro explícito se ausente; fallback `localhost` restrito a não-produção |
| **Fallback de remetente `onboarding@resend.dev` em produção** | `app/lib/email/resend.ts` (`EMAIL_FROM`, `sendOtpEmail`) | **Mitigado** | Em `NODE_ENV === 'production'`, `EMAIL_FROM` não usa mais `onboarding@resend.dev` e `sendOtpEmail` falha fechado sem `RESEND_FROM_EMAIL` |
| **Chave fictícia no Stripe SDK** | `app/lib/stripe.ts` (`getStripeClient()`, `import 'server-only'`) e `app/lib/plans.ts` | **Mitigado** | Chave fictícia removida; inicialização preguiçosa não instancia o SDK no import; `getStripeClient()` falha fechado sem chave válida; catálogo separado em `app/lib/plans.ts` |
| **Exposição de `NEXT_PUBLIC_OWNER_EMAIL` no cliente** | `app/components/RequireAuth.tsx`, `app/(dashboard)/configuracoes/page.tsx` | **Mitigado** | Referências a `NEXT_PUBLIC_OWNER_EMAIL` removidas dos componentes cliente analisados; UI usa `role === 'super_admin'` e `is_lifetime === true` do banco |
| **Uso de `IS_NON_PRODUCTION_ENV` em segurança** | `app/lib/env.ts` | **Revisado** | Restrita exclusivamente a indicadores visuais não sensíveis na UI; ausente de `proxy.ts`, `auth-guards.ts`, Server Actions e API Routes |
| **Detecção de Preview no cliente depende de var manual** | `app/lib/env.ts` (`process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'`) | **Pendente** | A Vercel injeta `VERCEL_ENV` no servidor, mas `NEXT_PUBLIC_VERCEL_ENV` precisa ser configurada manualmente no escopo Preview para o indicador visual no cliente |
| **Non-null assertion no `proxy.ts`** | `proxy.ts` (`NEXT_PUBLIC_SUPABASE_URL!`, `NEXT_PUBLIC_SUPABASE_ANON_KEY!`) | **Pendente** | Falha menos legível caso o ambiente esteja mal configurado |

**Pontos positivos comprovados de fail-closed:**
- `NEXT_PUBLIC_APP_URL` via `getAppUrl()` em `NODE_ENV === 'production'` lança erro explícito se ausente, inválida ou sem protocolo `http://`/`https://` (`app/lib/env.ts`).
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL` em `NODE_ENV === 'production'` falham fechado sem simular OTP e sem fallback `onboarding@resend.dev` (`app/lib/email/resend.ts`).
- `OTP_SECRET` lança erro fatal se ausente (`app/actions/validation-code.ts`).
- `STRIPE_SECRET_KEY` via `getStripeClient()` em `app/lib/stripe.ts` (protegido por `server-only` e inicialização preguiçosa) falha fechado se ausente ou inválida, sem chave fictícia.
- `STRIPE_WEBHOOK_SECRET` ausente ou com `placeholder` é rejeitada com HTTP 400 em qualquer ambiente (`app/api/webhooks/payment/route.ts`).
- `E2E_TEST_MODE` / `E2E_AUTH_SECRET` são bloqueadas incondicionalmente quando `NODE_ENV === 'production'` (`proxy.ts`).
- `IS_NON_PRODUCTION_ENV` não possui função de segurança, autenticação ou autorização, atuando apenas em indicadores visuais de interface.

---

## 6. Configuração Recomendada na Vercel

1. **Ambiente Production:**
   - Cadastrar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` do projeto Supabase de **Produção**.
   - Cadastrar `OTP_SECRET` (mínimo 32 caracteres aleatórios).
   - Cadastrar `RESEND_API_KEY` de produção e `RESEND_FROM_EMAIL` com domínio verificado no Resend.
   - Cadastrar `NEXT_PUBLIC_APP_URL` com a URL final HTTPS (ex.: `https://app.seudominio.com.br`, sem barra final).
   - Manter `STRIPE_PAYMENTS_DISABLED=true` e `STRIPE_WEBHOOK_DISABLED=true` enquanto a reconciliação Stripe estiver pendente.
   - Cadastrar `OWNER_EMAIL` (apenas servidor) e **não** cadastrar `NEXT_PUBLIC_OWNER_EMAIL`.
   - Cadastrar variáveis institucionais `NEXT_PUBLIC_COMPANY_*`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_DPO_EMAIL`.
2. **Ambiente Preview:**
   - Utilizar projeto Supabase separado (staging/preview) para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
   - Definir `NEXT_PUBLIC_VERCEL_ENV=preview` e `NEXT_PUBLIC_APP_URL` compatível com o ambiente de preview.
   - Manter `STRIPE_PAYMENTS_DISABLED=true` e `STRIPE_WEBHOOK_DISABLED=true` (ou usar exclusivamente chaves `sk_test_*` / `whsec_*` de teste).

---

## 7. Procedimento Seguro para Criação da Conta Owner (`super_admin`)

### 7.1 Arquitetura Comprovada no Banco de Dados

- **Tabela `public.user_profiles`** (`20260824000001_initial_schema.sql`, `20261102000001_trial_and_lifetime_access.sql`):
  - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - `nome TEXT NOT NULL`, `email TEXT`, `role user_role NOT NULL DEFAULT 'dentista'` (enum inclui `'super_admin'`), `clinica_id UUID` (anulável), `is_lifetime BOOLEAN NOT NULL DEFAULT false`.
- **Trigger de criação automática (`on_auth_user_created` -> `public.handle_new_user()` em `20261109000007`):**
  - Ao criar um usuário em `auth.users`, o trigger insere automaticamente em `public.user_profiles` com `role = 'admin_clinica'`, `clinica_id = NULL` e `is_lifetime = false`.
- **Proteção contra escalação de privilégio (`protect_user_profiles_privileges()` em `20261109000004`):**
  - Impede usuários autenticados comuns de alterar `role`, `is_lifetime` ou `clinica_id`. Permite alteração apenas por `service_role` ou `session_user IN ('postgres', 'supabase_admin')` quando não estiverem emulando `anon`/`authenticated`.
- **Imutabilidade pós-promoção (`private.fn_guard_super_admin_profile()` em `20261115000007`):**
  - Uma vez que `OLD.role = 'super_admin'`, qualquer `UPDATE` que tente rebaixar `role` ou alterar `clinica_id` é bloqueado com erro `insufficient_privilege`.
- **Isolamento RLS (`tenant_guard_*` em `20261109000001` e `20261104000001`):**
  - `super_admin` possui `clinica_id = NULL`, é isento de trial no `proxy.ts` e `auth-guards.ts`, e é bloqueado de ser provisionado como `admin_clinica` em `app/actions/register.ts` e na RPC `provisionar_novo_tenant`.

### 7.2 Passo a Passo Reproduzível

1. **Pré-requisitos:**
   - Todas as migrations aplicadas no Supabase remoto.
   - Acesso de operador autorizado ao **Supabase Dashboard** (Authentication e SQL Editor).
2. **Criar o usuário no Supabase Auth (sem expor senha em SQL/Git):**
   - No Supabase Dashboard, acesse **Authentication > Users > Add user > Create new user**.
   - Informe o e-mail do proprietário (o mesmo que será usado em `OWNER_EMAIL` na Vercel, se configurada).
   - Defina uma senha forte diretamente no formulário ou deixe sem confirmação manual e utilize **Send password recovery** / fluxo de definição de senha para o proprietário definir a própria senha de forma privada.
   - Marque **Auto Confirm User** apenas se o proprietário já tiver controle imediato da conta.
   - Copie o `User UID` (UUID) gerado em `auth.users`.
3. **Promover o perfil no SQL Editor do Supabase (sessão administrativa `postgres`):**
   - O trigger `on_auth_user_created` já terá criado a linha em `public.user_profiles` com `role = 'admin_clinica'`. Como `OLD.role` ainda não é `'super_admin'`, o `UPDATE` abaixo é aceito pelas triggers `protect_user_profiles_privileges` e `fn_guard_super_admin_profile`:

```sql
UPDATE public.user_profiles
SET
  role = 'super_admin',
  is_lifetime = true,
  clinica_id = NULL
WHERE id = '<UUID_DO_USUARIO_AUTH>';
```

4. **Verificação final (somente leitura):**

```sql
SELECT id, nome, email, role, is_lifetime, clinica_id, created_at
FROM public.user_profiles
WHERE id = '<UUID_DO_USUARIO_AUTH>';
```

   - Resultado esperado: `role = 'super_admin'`, `is_lifetime = true`, `clinica_id IS NULL`.

5. **Procedimento de recuperação (se o perfil não existir em `public.user_profiles`):**
   - Caso o trigger não tenha criado o perfil por qualquer anomalia, execute no SQL Editor (substituindo `<UUID_DO_USUARIO_AUTH>`, `<NOME_DO_OWNER>` e `<EMAIL_DO_OWNER>`):

```sql
INSERT INTO public.user_profiles (id, nome, email, role, is_lifetime, clinica_id)
VALUES (
  '<UUID_DO_USUARIO_AUTH>',
  '<NOME_DO_OWNER>',
  '<EMAIL_DO_OWNER>',
  'super_admin',
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  role = 'super_admin',
  is_lifetime = true,
  clinica_id = NULL;
```

6. **Política de senha:** Nunca registrar a senha em scripts SQL, variáveis de ambiente, logs, commits Git ou documentação. Utilize o painel do Supabase Auth ou o fluxo oficial de recuperação de senha por e-mail.

---

## 8. Checklist de Pré-Deploy

- [ ] Projeto Supabase de produção com todas as migrations aplicadas.
- [ ] Variáveis obrigatórias cadastradas na Vercel (Production) conforme Seção 2 e `.env.production.example`.
- [ ] `NEXT_PUBLIC_APP_URL` apontando para o domínio oficial HTTPS de produção.
- [ ] `RESEND_API_KEY` válida e `RESEND_FROM_EMAIL` com domínio verificado no Resend.
- [ ] `OTP_SECRET` gerada com entropia forte (>= 32 caracteres) e exclusiva de produção.
- [ ] `STRIPE_PAYMENTS_DISABLED=true` e `STRIPE_WEBHOOK_DISABLED=true` configuradas enquanto o Stripe não estiver reconciliado.
- [ ] `NEXT_PUBLIC_OWNER_EMAIL` removida/vazia em Production.
- [ ] Preview configurado com projeto Supabase separado (nunca apontando para produção).

---

## 9. Checklist Pós-Deploy

- [ ] Acessar `/login` e confirmar carregamento sem erros de ambiente no console/logs da Vercel.
- [ ] Executar o procedimento da Seção 7 para criar e verificar a conta `owner` (`super_admin`, `is_lifetime = true`, `clinica_id = NULL`).
- [ ] Autenticar com a conta `owner` e validar acesso ao painel `/admin` sem bloqueio de trial ou redirecionamento para `/onboarding`.
- [ ] Testar envio de OTP em `/register` com e-mail de teste e confirmar entrega real via Resend.
- [ ] Validar que `/api/checkout` retorna HTTP 503 controlado enquanto `STRIPE_PAYMENTS_DISABLED=true`.
- [ ] Confirmar nos logs da Vercel ausência de avisos críticos de `RESEND_API_KEY` ou exposição de segredos.

---

## 10. Itens Não Comprovados ou Pendentes

1. **Estado do banco Supabase remoto:** Não foi inspecionado por restrição de escopo; assume-se que as migrations locais (incluindo `20261115000007` e anteriores) estejam aplicadas antes da criação da conta `owner`.
2. **Migration `20261115000009_reconciliacao_stripe_remoto.sql`:** Referenciada em `app/api/checkout/route.ts` e `app/api/webhooks/payment/route.ts` como pendente de validação/aplicação remota; por isso os flags `STRIPE_PAYMENTS_DISABLED=true` e `STRIPE_WEBHOOK_DISABLED=true` devem permanecer ativos no deploy inicial.
3. **Integrações reais e testes E2E em produção:** O envio real de e-mails via Resend em produção, o fluxo completo de checkout/webhook no Stripe em produção e testes E2E em ambiente remoto não foram executados nem homologados nesta etapa.
4. **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`:** Listada em `.env.example`, mas sem uso comprovado no código-fonte atual (o checkout usa sessão hospedada do Stripe).
