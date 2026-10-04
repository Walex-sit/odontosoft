# OdontoSoft — SaaS de Gestão Odontológica Multiclínica

O **OdontoSoft** é uma plataforma SaaS moderna desenvolvida em **Next.js 16 (App Router + Turbopack)** e **Supabase (PostgreSQL, Auth, RLS)**, voltada para gestão integral de consultórios e clínicas odontológicas.

---

## 🏛️ Arquitetura Consolidada (T001)

### 1. Clientes Supabase Padronizados

O acesso ao banco de dados e à autenticação é estritamente segregado em três clientes tipados:

| Cliente | Caminho | Chave Utilizada | Contexto de Uso |
|---|---|---|---|
| **Browser Client** | `app/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client Components (`'use client'`). Protegido pelo RLS via JWT. |
| **Server Client** | `app/lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Server Actions e Server Components. Gerencia cookies de sessão via `@supabase/ssr`. |
| **Admin Client** | `app/lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | **Uso restrito:** Apenas operações administrativas (`auth.admin.createUser`, `deleteUser`) e logs de auditoria. Protegido por `import 'server-only'`. |

> ⚠️ **Regra de Ouro de Segurança:** A `SUPABASE_SERVICE_ROLE_KEY` nunca é utilizada em operações normais de domínio (consultas de pacientes, agendamentos, prontuários, financeiro).

---

### 2. Multi-Tenancy & Segurança (Row Level Security - RLS)

O isolamento entre clínicas é garantido em nível de banco de dados:

- **Identificação do Tenant:** Cada usuário está vinculado a uma clínica através da tabela `public.user_profiles.clinica_id`.
- **Injeção de Tenant Protegida:** A coluna `clinica_id` é preenchida automaticamente via trigger PostgreSQL (`set_clinica_id()`), impedindo que clientes maliciosos forjem o identificador da clínica.
- **Políticas RLS:** Todas as tabelas sensíveis (`pacientes`, `agendamentos`, `prontuarios`, `receitas`, `despesas`, etc.) possuem políticas ativas que limitam leitura, criação, atualização e exclusão apenas aos registros pertencentes ao `clinica_id` do usuário logado.

---

### 3. Controle de Acesso Baseado em Papéis (RBAC)

O sistema implementa 4 perfis de usuário definidos via enum `user_role`:

| Papel | Agenda | Prontuários | Financeiro | Configurações & Equipe |
|---|:---:|:---:|:---:|:---:|
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `dentista` | ✅ | ✅ | ❌ | ❌ |
| `recepcao` | ✅ | ✅ | ❌ | ❌ |
| `financeiro` | ❌ | ❌ | ✅ | ❌ |

- Verificação em tempo de execução no servidor via `requireRole()` e `requireAuth()`.
- Autenticação e perfil obtidos diretamente do banco via RLS — sem superadmins hardcoded.

---

### 4. Estrutura de Server Actions

As Server Actions foram consolidadas para garantir fonte única da verdade e tipagem forte:

- `app/actions/pacientes.ts`: CRUD completo de pacientes com auditoria automática em `system_logs`.
- `app/actions/patients.ts`: Proxy seguro redirecionando para `pacientes.ts`.
- `app/actions/agenda.ts`: Gerenciamento de consultas e agenda odontológica.
- `app/actions/dashboard.ts`: Agregação de métricas clínicas e financeiras com RLS.
- `app/actions/clinica.ts`: Configurações da clínica e upload de logotipo.
- `app/actions/users.ts`: Gestão de membros da equipe via `auth.admin` com isolamento por clínica.
- `app/actions/permissions.ts`: Gestão granular de permissões por perfil.
- `app/actions/audit.ts`: Histórico de auditoria do sistema.

---

### 5. Migrations Estruturadas

As migrações SQL estão versionadas e ordenadas em `supabase/migrations/`:

1. `20260824000001_initial_schema.sql` — Enums, tabelas fundamentais e estruturas de dados.
2. `20260824000002_receitas_atestados_settings.sql` — Módulos de prescrição, atestados e storage.
3. `20260824000003_multitenant_rls_security.sql` — Triggers `set_clinica_id()`, RLS e isolamento multi-tenant.
4. `20260824000004_audit_and_indexes.sql` — Tabela `system_logs`, alertas, evolução e índices de performance.

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20+
- Instância Supabase (local via Supabase CLI ou na nuvem)

### Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### Desenvolvimento

```bash
npm run dev
```

### Testes Automatizados

```bash
# Executar a suíte de testes (Vitest)
npm test
```

### Lint & Verificação de Tipos

```bash
# Executar linter
npm run lint

# Compilação e build de produção
npm run build
```

---

## 🔒 Qualidade & Conformidade

- **Gate de Qualidade:** `npm run lint && npm run build && npm test`
- **Zero erros TypeScript** e compilação limpa via Turbopack.
- **Auditoria centralizada:** Todas as mutações críticas geram trilha de auditoria em `system_logs`.
