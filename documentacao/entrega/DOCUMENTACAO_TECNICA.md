# ODONTOSOFT — DOCUMENTAÇÃO TÉCNICA DE ENGENHARIA E ARQUITETURA
**Especificação Arquitetural, Modelo de Dados, Segurança e Diretrizes de Engenharia**

---

> **Documentação de Entrega Acadêmica**  
> **Sistema:** OdontoSoft SaaS  
> **Versão do Projeto:** 1.0.0-rc  
> **Data de Elaboração:** 23 de Novembro de 2026  
> **Stack Principal:** Next.js 16.2.4 (Turbopack), React 19.2.4, TypeScript 5.x, Supabase (PostgreSQL 15), Tailwind CSS 4.x  

---

## Sumário

1. [Visão Geral e Objetivos Arquiteturais](#1-visão-geral-e-objetivos-arquiteturais)
2. [Stack Tecnológica e Ferramentas](#2-stack-tecnológica-e-ferramentas)
3. [Banco de Dados, Tabelas, Views e RPCs](#3-banco-de-dados-tabelas-views-e-rpcs)
4. [Estrutura do Projeto e Organização de Rotas](#4-estrutura-do-projeto-e-organização-de-rotas)
5. [Arquitetura Multi-Tenant e Isolamento](#5-arquitetura-multi-tenant-e-isolamento)
6. [Controle de Acesso e RBAC](#6-controle-de-acesso-e-rbac)
7. [Segurança, Criptografia e Privacidade](#7-segurança-criptografia-e-privacidade)
8. [Prontuário e Integridade de Registros](#8-prontuário-e-integridade-de-registros)
9. [Gestão de Consentimentos e Privacidade](#9-gestão-de-consentimentos-e-privacidade)
10. [Integrações Externas e Estado Atual](#10-integrações-externas-e-estado-atual)
11. [Configuração e Execução Local](#11-configuração-e-execução-local)
12. [Garantia de Qualidade e Testes](#12-garantia-de-qualidade-e-testes)

---

## 1. Visão Geral e Objetivos Arquiteturais

O **OdontoSoft** é uma solução de software como serviço (SaaS B2B) multiclínica desenvolvida sob o paradigma de arquitetura desacoplada em nuvem. Seus objetivos primordiais são:
* **Isolamento Lógico Rigoroso:** Garantir que uma clínica odontológica jamais consiga visualizar ou manipular dados de outra clínica (prevenção contra vulnerabilidades do tipo IDOR e vazamento de dados cross-tenant).
* **Defesa em Profundidade:** Aplicação de regras de autorização em múltiplas camadas independentes: no gateway/proxy de borda, nas Server Actions no Node.js e no nível do banco de dados relacional via PostgreSQL Row Level Security (RLS).
* **Integridade Clínica e Proteção de Dados:** Implementação técnica de registros clínicos imutáveis sob o paradigma append-only e salvaguardas técnicas alinhadas aos princípios de segurança da informação e privacidade por design (Privacy by Design), tais como hashing determinístico de CPF por HMAC-SHA256, máscara visual e trilha de auditoria sem dados pessoais, sem declaração de conformidade jurídica integral não comprovada.

---

## 2. Stack Tecnológica e Ferramentas

```
┌──────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                    │
│   Next.js 16 (App Router) + React 19 + Tailwind CSS 4        │
│   next-themes (Claro/Escuro) + Lucide Icons + Recharts       │
└──────────────────────────────┬───────────────────────────────┘
                               │ Server Actions / Server Components
┌──────────────────────────────▼───────────────────────────────┐
│                    CAMADA DE APLICAÇÃO (BFF)                 │
│   TypeScript 5 (Strict) + Zod + @supabase/ssr + proxy.ts     │
│   auth-guards.ts (requireActiveClinic / resolveAuthorized)   │
└──────────────────────────────┬───────────────────────────────┘
                               │ PostgreSQL Wire / PostgREST (RLS)
┌──────────────────────────────▼───────────────────────────────┐
│                    CAMADA DE PERSISTÊNCIA                    │
│   Supabase PostgreSQL 15 + pgcrypto + citext                 │
│   Triggers Imutáveis + RLS Policies + RPCs Armazenadas       │
└──────────────────────────────────────────────────────────────┘
```

| Componente | Tecnologia Adotada | Versão / Configuração | Finalidade Técnica |
| :--- | :--- | :---: | :--- |
| **Framework Web** | Next.js | 16.2.4 (Turbopack) | App Router, Server Components para carregamento seguro e Server Actions para mutações protegidas. |
| **Biblioteca de UI** | React | 19.2.4 | Hooks modernos, transições assíncronas e renderização atômica de componentes. |
| **Linguagem** | TypeScript | 5.x (Strict Mode) | Tipagem estrita ponta a ponta (`Database` types) e prevenção de inconsistências em compilação. |
| **Estilização e Tema** | Tailwind CSS + next-themes | 4.x / 0.4.6 | Design responsivo com suporte dinâmico a tema claro/escuro via classe `dark` no elemento raiz. |
| **Banco de Dados** | Supabase (PostgreSQL) | 15.x | Banco relacional com suporte a RLS, Triggers, Functions e Views analíticas. |
| **Autenticação** | Supabase Auth (GoTrue) | SSR nativo | Emissão e validação de tokens JWT armazenados em cookies HTTP-Only seguros com renovação automática. |
| **Validação de Dados** | Zod | 4.6.7 | Sanitização e validação de schemas em formulários e Server Actions. |
| **Framework de Testes** | Vitest | 4.1.11 | Execução rápida de testes unitários, testes de contratos e de segurança. |

---

## 3. Banco de Dados, Tabelas, Views e RPCs

O banco de dados relacional utiliza o PostgreSQL 15 hospedado no Supabase.

### 3.1 Tabelas de Escopo da Clínica (Tenant Domain — `clinica_id` obrigatório):
* `public.pacientes`: Informações cadastrais de pessoas atendidas, contendo `cpf_hash`, `cpf_mascarado` e `cpf_encrypted`.
* `public.agendamentos`: Consultas marcadas, contendo data, horários, status operacional e vínculo com dentista e paciente.
* `public.prontuarios`: Registros clínicos odontológicos estruturados como histórico append-only imutável.
* `public.receitas` e `public.receita_itens`: Prescrições e receituários clínicos emitidos por profissionais habilitados.
* `public.atestados`: Atestados médicos/odontológicos emitidos para pacientes.
* `public.despesas`: Controle de contas a pagar da clínica.
* `public.estoque`: Controle de materiais, unidades de medida e margem de estoque mínimo de segurança.
* `public.procedimentos`: Catálogo de procedimentos disponíveis na unidade.
* `public.procedimentos_realizados`: Apontamento de procedimentos executados em atendimentos clínicos.
* `public.comissoes`: Configurações de percentuais de repasse e apuração financeira por dentista.
* `public.fornecedores`, `public.compras` e `public.notas_fiscais`: Módulos de compras e faturamento interno.
* `public.cobrancas`: Gestão interna de títulos de cobrança aos pacientes.
* `public.clinica_settings`: Parâmetros de personalização e regras operacionais da clínica.

### 3.2 Tabelas de Consentimento e Privacidade:
* `public.termos_privacidade`: Modelos versionados de termos de privacidade (`texto_hash`, `versao`, `tipo`, `ativo`), isolados por clínica via `clinica_id`.
* `public.paciente_consentimentos`: Registros de manifestação de vontade vinculados ao paciente e ao termo de referência.
* `public.consentimento_finalidades`: Discriminação granular de consentimento por finalidade (tratamento clínico, comunicações, financeiro, pesquisa).
* `public.consentimento_evidencias`: Registro probatório imutável de aceites (hash SHA-256 do documento, endereço IP e data/hora).

### 3.3 Tabelas de Plataforma, Sistema e Segurança (Escopo Global / Não Tenant-Exclusivo):
* `public.clinicas`: Entidade tenant que centraliza dados cadastrais, plano e status da assinatura. Não possui chave estrangeira `clinica_id` para si própria.
* `public.user_profiles`: Perfis de colaboradores vinculados ao Supabase Auth (`id = auth.uid()`). Usuários comuns possuem `clinica_id REFERENCES clinicas(id)`. Usuários com `role = 'super_admin'` possuem **`clinica_id = NULL` por projeto**.
* `public.super_admin_clinic_contexts`: Registro de contexto administrativo temporário selecionado pelo Super Admin (`user_id`, `clinica_id`, `updated_at`).
* `public.system_logs`: Trilha de auditoria centralizada do sistema (`clinica_id` anulável para operações de administração global).
* `private.secrets`: Schema reservado para armazenamento de chaves de cifra e hash (`cpf_key` e `cpf_hash_key`), inacessível diretamente via PostgREST/anon.

### 3.4 Views e Procedimentos Armazenados (RPCs):
* `public.vw_conformidade_consentimentos`: View analítica que consolida a situação de consentimento de cada paciente, confrontando termos ativos e evidências registradas.
* `public.get_my_clinica_id()`: Retorna o `clinica_id` do usuário logado a partir de `user_profiles` (`SECURITY DEFINER`).
* `public.get_super_admin_context()` / `public.set_super_admin_context(p_clinica_id UUID)`: Leitura e atribuição de contexto administrativo ativo para operadores com perfil `super_admin`.
* `public.bloquear_delete_prontuario()`: Função de trigger que impede a execução de `DELETE` na tabela `prontuarios`.
* `public.bloquear_update_prontuario_finalizado()`: Função de trigger que impede a execução de `UPDATE` direto no texto de prontuários com `finalizado = true`.
* `public.criar_adendo_prontuario(p_prontuario_origem_id UUID, p_motivo TEXT, p_descricao TEXT, p_tipo_adendo TEXT)`: Procedimento que valida e insere adendos vinculados ao registro clínico original.
* `public.registrar_revogacao_consentimento(p_consentimento_id UUID)`: Atualiza o status do consentimento e registra a trilha de revogação.
* `public.anonimizar_paciente(p_paciente_id UUID, p_motivo TEXT)`: Desassocia irreversivelmente dados cadastrais do paciente (zerando `nome`, `cpf_hash`, `cpf_mascarado`, `cpf_encrypted`, telefone, endereço), preservando exclusivamente o identificador clínico para histórico e conservação legal.
* `public.cpf_to_hash(p_cpf TEXT)`: Helper criptográfico que normaliza e calcula o HMAC-SHA256 do CPF com `cpf_hash_key`.
* `public.mascarar_cpf(p_cpf TEXT)`: Helper de sanitização visual para geração da máscara `***.NNN.NNN-**`.
* `public.cpf_decrypt(p_cpf_encrypted TEXT)`: Função restrita a administradores autorizados para decifrar `cpf_encrypted` com chave simétrica.

### 3.5 Extensões PostgreSQL Ativas:
* `pgcrypto`: Geração de UUIDs v4 (`gen_random_uuid()`), hashing (`extensions.hmac(...)`) e cifra simétrica AES-256 (`extensions.pgp_sym_encrypt(...)`).
* `citext`: Tratamento de strings insensíveis a maiúsculas/minúsculas para e-mails e identificadores de texto.

---

## 4. Estrutura do Projeto e Organização de Rotas

O código-fonte segue a convenção moderna do Next.js App Router:

```
odontosaas/
├── app/
│   ├── (dashboard)/               # Rotas autenticadas sob layout administrativo comum
│   │   ├── admin/                 # Painel global de Super Admin (/admin, /admin/clinicas)
│   │   ├── agenda/                # Grade de agendamento de consultas (/agenda)
│   │   ├── comissoes/             # Apuração e gestão de repasses (/comissoes)
│   │   ├── configuracoes/         # Configurações da clínica (/configuracoes)
│   │   ├── despesas/              # Gestão de saídas (/despesas)
│   │   ├── establishment/         # Assinatura e planos (/establishment/subscription)
│   │   ├── estoque/               # Gestão de estoque e suprimentos (/estoque)
│   │   ├── financeiro/            # Lançamentos e extrato financeiro (/financeiro)
│   │   ├── fluxo-caixa/           # Visão consolidada de caixa (/fluxo-caixa)
│   │   ├── overview/              # Dashboard gerencial de KPIs (/overview)
│   │   ├── pacientes/             # Cadastro e histórico de pacientes (/pacientes)
│   │   ├── prontuarios/           # Prontuário eletrônico do paciente (/prontuarios)
│   │   ├── regua-cobranca/        # Painel de réguas de comunicação (/regua-cobranca)
│   │   └── usuarios/              # Gestão de equipe e colaboradores (/usuarios)
│   ├── actions/                   # Server Actions com validação de sessão e RBAC
│   │   ├── admin-global.ts        # Gestão global de tenants e contexto de Super Admin
│   │   ├── agenda.ts              # Regras de agendamento e bloqueio de conflitos
│   │   ├── audit.ts               # Gravação de auditoria em system_logs
│   │   ├── billing.ts             # Assinatura e resolução de planos
│   │   ├── clinica.ts             # Dados cadastrais da unidade
│   │   ├── commissions.ts         # Cálculo de repasses por dentista
│   │   ├── dashboard.ts           # Agregações de métricas para o Overview
│   │   ├── financeiro.ts          # Contas a pagar/receber e fluxo de caixa
│   │   ├── pacientes.ts           # CRUD de pacientes, máscaras e consentimentos
│   │   ├── prontuarios.ts         # Registro clínico e criação de adendos
│   │   └── users.ts               # Gestão de perfis e permissões de colaboradores
│   ├── api/                       # API Routes (webhooks e endpoints REST)
│   │   ├── checkout/route.ts      # Endpoint de checkout (bloqueado para entrega acadêmica)
│   │   └── webhooks/payment/      # Webhook de faturamento Stripe
│   ├── components/                # Componentes React reutilizáveis e modais
│   ├── contexts/                  # React Contexts (ClinicaContext.tsx)
│   ├── lib/                       # Utilitários, clientes Supabase e tipos
│   │   ├── database.types.ts      # Tipos TypeScript reflexivos do schema Supabase
│   │   ├── auth-guards.ts         # Guardas requireActiveClinic e resolveAuthorizedClinicId
│   │   ├── email/resend.ts        # Cliente singleton Resend (server-only)
│   │   ├── env.ts                 # Helpers de ambiente e validação getAppUrl()
│   │   ├── plans.ts               # Catálogo compartilhado de planos (sem dependências server-only)
│   │   ├── rbac.ts                # Verificação de perfis no servidor (checkServerAuth)
│   │   ├── stripe.ts              # Cliente Stripe (server-only, inicialização preguiçosa)
│   │   └── supabase/              # Clientes de browser, server (RLS) e admin (service-role)
│   ├── login/page.tsx             # Tela de autenticação
│   ├── register/page.tsx          # Cadastro de novas clínicas
│   └── layout.tsx                 # Root layout com ThemeProvider e Toaster
├── proxy.ts                       # Middleware de borda (proteção de rotas e verificação de sessão)
├── tests/                         # Suítes de testes automatizados com Vitest
└── documentacao/                  # Documentação técnica e operacional do projeto
```

---

## 5. Arquitetura Multi-Tenant e Isolamento

O OdontoSoft adota o modelo **Single-Database, Shared-Schema com Isolamento Lógico por RLS**:

### 5.1 Mecanismo de Isolamento para Usuários Comuns:
1. **Chave de Tenant:** As tabelas de domínio clínico contêm a coluna obrigatória `clinica_id UUID REFERENCES public.clinicas(id)`.
2. **Função Contextual Segura (`get_my_clinica_id`):**
   ```sql
   CREATE OR REPLACE FUNCTION public.get_my_clinica_id()
   RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
     SELECT clinica_id FROM public.user_profiles WHERE id = auth.uid();
   $$;
   ```
3. **Políticas de Row Level Security (RLS):**
   Para tabelas operacionais da clínica, políticas `FOR ALL` ou `FOR SELECT/INSERT/UPDATE` garantem que qualquer query execute estritamente sobre a clínica do usuário logado:
   ```sql
   CREATE POLICY "Tenant Select" ON public.pacientes
     FOR SELECT USING (clinica_id = public.get_my_clinica_id());
   ```

### 5.2 Contexto Administrativo Controlado do Super Admin:
* O perfil `super_admin` possui `clinica_id = NULL` em `user_profiles` por projeto, indicando que não pertence organicamente a nenhuma clínica individual.
* **Sem acesso clínico automático e irrestrito:** O Super Admin não visualiza automaticamente os dados clínicos de todas as clínicas em lote. Seu acesso ao painel global (`/admin`) permite visualizar dados cadastrais das clínicas e métricas de faturamento do SaaS.
* **Alternância Explícita de Contexto:** Para prestar suporte ou auditar os registros de uma clínica específica, o Super Admin aciona a Server Action `setClinicContextAction` (em `app/actions/admin-global.ts`), que grava um cookie HTTP-Only seguro (`odontosoft_admin_context`) e registra o contexto ativo na tabela `super_admin_clinic_contexts`.
* **Sinalização Visual e Auditoria:** Ao operar sob contexto de clínica, a interface renderiza um banner destacado (**AdminContextBanner**) alertando que o operador navega com credenciais de auditoria. Todas as operações são registradas na tabela `system_logs`.

### 5.3 Defesa em Dupla Camada (BFF + Banco de Dados):
Mesmo com o RLS ativo, as Server Actions utilizam duas funções guardiãs rigorosas em `app/lib/auth-guards.ts`:
1. **`requireActiveClinic()`:** Verifica a validade da sessão, o perfil do usuário e o status da clínica (ativo/inativo/trial). Em caso de erro na consulta, aplica a política de bloqueio por padrão (**fail-closed**).
2. **`resolveAuthorizedClinicId()`:**
   * Para usuários normais: `clinica_id` é obtido exclusivamente de `profile.clinica_id` (qualquer parâmetro de tenant passado pelo cliente é ignorado, mitigando IDOR).
   * Para Super Admin: `clinica_id` é validado contra o contexto ativo verificado no servidor via `get_super_admin_context`. Caso o cliente envie um ID divergente do contexto validado no servidor, a operação é sumariamente rejeitada.

---

## 6. Controle de Acesso e RBAC

O sistema define seis papéis no tipo `UserRole`:

```ts
export type UserRole = 
  | 'super_admin'    // Gestão global da plataforma SaaS
  | 'admin'          // Administrador geral da clínica
  | 'admin_clinica'  // Proprietário / gestor da unidade clínica
  | 'dentista'       // Cirurgião-dentista
  | 'recepcao'       // Atendimento, agendamento e recepção
  | 'financeiro'     // Operador financeiro e fluxo de caixa
```

### 6.1 Matriz de Acesso e Permissões por Papel:

| Módulo / Funcionalidade | super_admin | admin / admin_clinica | dentista | recepcao | financeiro |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Painel Global (`/admin`)** | SIM | NÃO | NÃO | NÃO | NÃO |
| **Dashboard Gerencial (`/overview`)** | SIM (Contexto) | SIM | SIM (Focado) | SIM (Focado) | SIM (Financeiro) |
| **Agenda de Consultas (`/agenda`)** | SIM (Contexto) | SIM | SIM | SIM | NÃO |
| **Cadastro de Pacientes (`/pacientes`)** | SIM (Contexto) | SIM | SIM | SIM | NÃO |
| **Prontuário Odontológico (`/prontuarios`)** | SIM (Contexto) | SIM | SIM | NÃO | NÃO |
| **Receituários e Atestados Rápidos** | SIM (Contexto) | SIM | SIM | NÃO | NÃO |
| **Módulo Financeiro (`/financeiro`)** | SIM (Contexto) | SIM | NÃO | NÃO | SIM |
| **Controle de Comissões (`/comissoes`)** | SIM (Contexto) | SIM | SOMENTE PRÓPRIAS | NÃO | SIM |
| **Gestão de Estoque (`/estoque`)** | SIM (Contexto) | SIM (Pleno) | CONSULTA | CONSULTA | NÃO |
| **Gestão de Equipe (`/usuarios`)** | SIM (Contexto) | SIM | NÃO | NÃO | NÃO |
| **Configurações da Unidade** | SIM (Contexto) | SIM | NÃO | NÃO | NÃO |

> [!NOTE]
> **Distinção de Privilégios do Super Admin:** O valor `SIM (Contexto)` indica que o Super Admin tem acesso a estes módulos da clínica exclusivamente quando estiver operando sob contexto administrativo ativado e validado no servidor, com trilha de auditoria registrada.

---

## 7. Segurança, Criptografia e Privacidade

### 7.1 Tratamento e Proteção de CPF:
O sistema proíbe o armazenamento de CPF em texto puro no banco de dados, aplicando uma arquitetura tripartite coordenada por trigger:

```
[ Entrada: cpf_raw ]
        │
        ▼ (Trigger trg_encrypt_cpf / public.trg_processar_cpf)
 ┌──────┴──────────────────────────┬─────────────────────────────┐
 │                                 │                             │
 ▼                                 ▼                             ▼
cpf_hash (HMAC-SHA256)     cpf_mascarado (UI)        cpf_encrypted (AES-256)
Usado para buscas exatas   ***.***.850-**            Cifra simétrica reversível
com cpf_hash_key           Minimização visual        com chave simétrica cpf_key
```

1. **`cpf_hash` (HMAC-SHA256):**  
   Calculado em formato hexadecimal através de `encode(extensions.hmac(v_norm, v_key, 'sha256'), 'hex')`, utilizando a chave `cpf_hash_key` armazenada no schema seguro `private.secrets`.  
   *Finalidade:* Buscas determinísticas de igualdade (`WHERE cpf_hash = public.cpf_to_hash($1)`) e prevenção de cadastros duplicados sem possibilidade de reversão do hash para o CPF original. Não é SHA-256 simples.
2. **`cpf_mascarado` (Máscara Visual):**  
   Gerado pela função `public.mascarar_cpf(p_cpf TEXT)` (ex: `***.***.850-**`).  
   *Finalidade:* Apresentação na interface gráfica conforme o princípio da necessidade e minimização de dados.
3. **`cpf_encrypted` (Criptografia Simétrica AES-256):**  
   Cifrado através de `extensions.pgp_sym_encrypt(v_norm, v_sym_key)` com a chave simétrica `cpf_key` em `private.secrets`.  
   *Finalidade:* Manter a recuperabilidade estrita por autoridade clínica ou dever legal mediante execução restrita de `public.cpf_decrypt()`. Não é criptografia assimétrica.
4. **Higienização Automática:**  
   O trigger zera o campo de entrada (`NEW.cpf_raw := NULL`) antes da gravação no disco, assegurando que o dado bruto jamais persista na tabela `pacientes`.

### 7.2 Trilha de Auditoria Sanitizada (`system_logs`):
* A tabela `system_logs` registra eventos operacionais críticos (criação, edição, login, anonimização).
* Os detalhes da ação (`details JSONB`) omitem intencionalmente nomes, CPFs, e-mails e anotações clínicas, limitando-se a armazenar identificadores relacionais (`paciente_id`, `clinica_id`, `user_id`) para evitar contaminação do log de auditoria com dados pessoais.

### 7.3 Ressalva Regulatório-Jurídica da LGPD:
O OdontoSoft adota salvaguardas técnicas robustas inspiradas nos princípios de Privacy by Design. Contudo, em consonância com as boas práticas de engenharia de software e direito digital, **o sistema não declara conformidade jurídica plena com a LGPD**, visto que o enquadramento integral envolve processos organizacionais, nomeação formal de DPO, elaboração de Relatórios de Impacto à Proteção de Dados (RIPD) e acordos contratuais de tratamento de dados que extrapolam o escopo de software.

### 7.4 Hardening de Configuração de Produção e Separação Server-Only:
Na etapa de hardening de produção, foram aplicadas medidas de contenção e falha fechada (*fail-closed*) nos módulos de configuração e integrações:
* **Validação de `NEXT_PUBLIC_APP_URL` (`getAppUrl()` em `app/lib/env.ts`):** Consumida em `app/actions/users.ts` e `app/api/checkout/route.ts`. Em `NODE_ENV === 'production'`, exige URL explícita com protocolo `http://` ou `https://`, normaliza barra final e lança erro se ausente ou inválida. O fallback `http://localhost:3000` foi removido dos contextos de produção, permanecendo restrito a desenvolvimento/testes.
* **Remoção do fallback `onboarding@resend.dev` em produção (`app/lib/email/resend.ts`):** Em `NODE_ENV === 'production'`, `EMAIL_FROM` não utiliza mais `onboarding@resend.dev` e `sendOtpEmail` falha de forma fechada caso `RESEND_FROM_EMAIL` não esteja configurada.
* **Remoção de `NEXT_PUBLIC_OWNER_EMAIL` dos componentes cliente analisados:** `app/components/RequireAuth.tsx` e `app/(dashboard)/configuracoes/page.tsx` deixaram de referenciar `NEXT_PUBLIC_OWNER_EMAIL`, passando a avaliar exclusivamente `role === 'super_admin'` e `is_lifetime === true` oriundos do perfil no banco.
* **Separação do catálogo de planos (`app/lib/plans.ts`):** `TRIAL_PLAN` e `PLANOS_SAAS_CATALOG` foram extraídos para módulo próprio sem dependências de servidor, permitindo importação segura em componentes cliente sem acoplar o SDK do Stripe.
* **Proteção e inicialização preguiçosa do Stripe (`app/lib/stripe.ts`):** O módulo recebeu `import 'server-only'`, teve a chave fictícia removida e passou a utilizar inicialização preguiçosa (`getStripeClient()` + `Proxy`). Quando o Stripe está desabilitado, o SDK não é instanciado no `import`; caso `getStripeClient()` seja acionado sem `STRIPE_SECRET_KEY` válida (ou com valor `placeholder`/`chave_falsa`), lança erro explícito.
* **Revisão de `IS_NON_PRODUCTION_ENV` (`app/lib/env.ts`):** Uso restrito exclusivamente a indicadores visuais não sensíveis na interface (como selo de demonstração), sem atribuição de função de segurança, autorização ou bypass em `proxy.ts`, `auth-guards.ts`, Server Actions ou API Routes.
* **Testes de regressão de hardening:** Cobertos pela suíte `tests/env_production_hardening.test.ts`, validando `getAppUrl()`, bloqueio de `RESEND_FROM_EMAIL` em produção, ausência de `NEXT_PUBLIC_OWNER_EMAIL` no cliente, inicialização preguiçosa do Stripe sem chave fictícia e ausência de `IS_NON_PRODUCTION_ENV` em arquivos de segurança.

---

## 8. Prontuário e Integridade de Registros

A proteção dos dados clínicos é implementada tecnicamente através de garantias arquiteturais de integridade de dados e registro histórico sequencial (append-only):

### 8.1 Implementação Técnica no PostgreSQL:
1. **Bloqueio de Exclusão (`DELETE`):**  
   O trigger `trg_bloquear_delete_prontuario` associado à função `public.bloquear_delete_prontuario()` impede a exclusão de prontuários clínicos:
   ```sql
   CREATE TRIGGER trg_bloquear_delete_prontuario
     BEFORE DELETE ON public.prontuarios
     EXECUTE FUNCTION public.bloquear_delete_prontuario();
   ```
   Adicionalmente, a política de RLS restritiva `delete_proibido_total` bloqueia operações de `DELETE` para todos os usuários autenticados.
2. **Bloqueio de Edição Direta (`UPDATE`):**  
   O trigger `trg_bloquear_update_prontuario_finalizado` associado à função `public.bloquear_update_prontuario_finalizado()` bloqueia qualquer tentativa de `UPDATE` sobre registros já gravados com `finalizado = true`.
3. **Fluxo Append-Only e Registro de Adendos:**  
   * Novas evoluções clínicas são gravadas como registros iniciais (`tipo_registro = 'registro_clinico'`).
   * Correções e esclarecimentos clínicos só são admitidos mediante a criação de adendos via RPC transacional:
     ```sql
     public.criar_adendo_prontuario(
       p_prontuario_origem_id UUID,
       p_motivo TEXT,
       p_descricao TEXT,
       p_tipo_adendo TEXT
     )
     ```
   * A coluna `prontuario_origem_id` estabelece o vínculo relacional com o atendimento original.
   * A constraint `prontuarios_motivo_obrigatorio` (CHECK) e a validação interna da RPC exigem justificativa obrigatória com no mínimo 10 caracteres (`LENGTH(TRIM(p_motivo)) >= 10`).
   * Tipos de adendos suportados: `adendo_retificativo` ou `adendo_esclarecimento`.

---

## 9. Gestão de Consentimentos e Privacidade

O sistema estrutura a gestão do consentimento do titular em tabelas relacionais dedicadas:
* **Tabela `termos_privacidade`:** Armazena os termos cadastrados por clínica, com controle de versão, tipo e hash SHA-256 do texto legal (`texto_hash`).
* **Tabela `paciente_consentimentos`:** Registra a manifestação de vontade vinculada ao paciente, com data/hora e referência ao termo ativo.
* **Tabela `consentimento_finalidades`:** Discrimina a autorização por finalidade de tratamento.
* **Tabela `consentimento_evidencias`:** Armazena evidências probatórias do aceite (IP, data/hora e hash do documento gerado).
* **View `vw_conformidade_consentimentos`:** Consolida os pacientes que possuem consentimento ativo válido ou pendente.
* **RPC `registrar_revogacao_consentimento(p_consentimento_id UUID)`:** Processa formalmente a revogação de consentimentos não obrigatórios.
* **Procedimento de Anonimização (Art. 18):**  
  A RPC `public.anonimizar_paciente(p_paciente_id UUID, p_motivo TEXT)` remove irreversivelmente todos os dados de identificação pessoal do paciente (nome, CPF, contatos e endereço), preservando exclusivamente o identificador clínico para cumprimento dos prazos legais de guarda e conservação documental aplicáveis à saúde.

---

## 10. Integrações Externas e Estado Atual

| Provedor / Serviço | Finalidade Planejada | Estado Atual no Projeto | Detalhamento Técnico |
| :--- | :--- | :---: | :--- |
| **Supabase Auth / PostgreSQL** | Autenticação, sessão JWT e persistência relacional com RLS. | **Totalmente Integrado e Operante** | Validado em ambiente de desenvolvimento e produção. |
| **Resend SDK** | Disparo de e-mails transacionais com código OTP no cadastro. | **Implementado no Servidor (Integração Real Não Executada)** | Implementado como singleton em `app/lib/email/resend.ts` com `import 'server-only'`. Em produção, opera em modo estrito (*fail-closed* caso `RESEND_API_KEY` ou `RESEND_FROM_EMAIL` não estejam configuradas, sem fallback para `onboarding@resend.dev`). Em desenvolvimento, opera em modo simulado/defensivo emitindo log de aviso seguro sem expor o código OTP. O envio real em produção não foi executado/homologado nesta entrega. |
| **Stripe Gateway** | Processamento de pagamentos e assinaturas SaaS. | **Temporariamente Desativado** | O fluxo de checkout de planos está bloqueado de maneira controlada na interface com aviso explícito de indisponibilidade para a entrega acadêmica. `app/lib/stripe.ts` utiliza `import 'server-only'`, inicialização preguiçosa (`getStripeClient()`) sem chave fictícia, e catálogo separado em `app/lib/plans.ts`. A infraestrutura de backend (`payment/route.ts`) possui testes automatizados de payload e idempotência, mas a integração real com o Stripe não está ativa nem homologada. |
| **WhatsApp Business API** | Disparo de lembretes e mensagens ativas nas réguas de comunicação. | **Simulação / Demonstração** | O botão "Disparar" aciona feedback visual em tela (`toast.info`) alertando sobre o modo de demonstração acadêmica, sem efetuar requisições de rede a gateways externos de mensageria. |
| **SMS Gateway** | Envio de mensagens curtas de texto. | **Simulação** | Interface didática de automação sem chamadas de rede externas para provedores como Twilio ou Z-API. |

---

## 11. Configuração e Execução Local

### 11.1 Pré-requisitos:
* **Node.js:** Versão 20.x ou superior.
* **npm:** Versão 10.x ou superior.

### 11.2 Variáveis de Ambiente (`.env.local`):
O arquivo de configuração local deve conter as seguintes chaves estruturais (valores sensíveis nunca devem ser versionados em repositório público):

```env
# Conexão do Cliente Browser e Servidor
NEXT_PUBLIC_SUPABASE_URL=https://exemplo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Chave Administrativa de Servidor (Restrita ao Node.js / Server Actions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Configuração de E-mail Transacional (fallback onboarding@resend.dev restrito a desenvolvimento)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=OdontoSoft <onboarding@resend.dev>

# Configuração de Webhook de Pagamentos (Desativado para Entrega Acadêmica)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 11.3 Comandos de Operação (definidos no `package.json`):
```bash
# 1. Instalação das dependências do projeto
npm install

# 2. Execução do servidor de desenvolvimento Next.js
npm run dev

# 3. Verificação estática de tipos TypeScript
npx tsc --noEmit

# 4. Execução da suíte de testes automatizados com Vitest
npm test          # comando alternativo: npx vitest run

# 5. Geração de build otimizado para produção
npm run build
```

---

## 12. Garantia de Qualidade e Testes

O projeto conta com suíte de testes automatizados executada via **Vitest**:

* **Verificação Pontual de Funcionalidades (`tests/verificacao_pontual_3_funcionalidades.test.ts`):** Valida a regra estrita de alerta de estoque ($\text{minimo} > 0$ e $\text{quantidade} \le \text{minimo}$), o feedback visual do modo de demonstração da régua de comunicação e a contagem real de dentistas cadastrados no painel de comissões (8/8 testes aprovados).
* **Isolamento de Contexto do Super Admin (`tests/super_admin_context.test.ts`):** Valida a alternância de contexto administrativo, validação do cookie `odontosoft_admin_context` e restrição de acesso (11/11 testes aprovados).
* **Segurança e Prevenção de IDOR (`tests/security_p0.test.ts`, `tests/security_etapa4.test.ts` e `tests/security_etapa6.test.ts`):** Validam a contenção de parâmetros manipulados por clientes, imunidade a cross-tenant injection e sanitização de logs operacionais (44 testes aprovados).
* **Consentimento LGPD e Privacidade (`tests/lgpd_consent.test.ts` e `tests/lgpd_consent_registration.test.ts`):** Validam o ciclo formal de consentimento, termos de privacidade e desassociação de cadastro (18 testes aprovados).
* **Contratos e Idempotência Stripe (`tests/stripe_webhook_payloads.test.ts` e `tests/stripe_webhook_idempotencia.test.ts`):** Validam o tratamento idempotente de webhooks, tolerância a eventos duplicados ou atrasados e ordenação transacional (38 testes aprovados no total: 23 no arquivo de payloads e 15 no de concorrência transacional).
* **Hardening de Configuração de Produção (`tests/env_production_hardening.test.ts`):** Valida `getAppUrl()` em produção e desenvolvimento, remoção do fallback `onboarding@resend.dev` em produção, remoção de `NEXT_PUBLIC_OWNER_EMAIL` dos componentes cliente analisados, inicialização preguiçosa do Stripe sem chave fictícia e não utilização de `IS_NON_PRODUCTION_ENV` em controles de segurança.
* **Contrato de Estoque e Domínio (`tests/estoque.test.ts`, `tests/rbac.test.ts` e `tests/multitenancy.test.ts`):** Validam integridade de colunas, restrição de papéis por perfil e isolamento de consultas.

> [!NOTE]
> **Evidências Técnicas Reportadas (Execuções Distintas):**  
> * **Execução anterior da suíte completa (com Supabase local):** 20 arquivos de teste aprovados, 202 testes aprovados.  
> * **Execução de regressão pós-hardening:** 5 arquivos, 76 testes aprovados, 0 falhas. *(Nota: trata-se de execuções diferentes com sobreposição de casos; os totais de 202 e 76 testes não devem ser somados cumulativamente.)*  
> * **Verificações estáticas e build pós-hardening:**  
>   * **TypeScript (`npx tsc --noEmit`):** aprovado, 0 erros.  
>   * **ESLint:** 0 erros, 543 warnings pré-existentes reportados.  
>   * **Build (`npm run build`):** aprovado, 45/45 páginas estáticas geradas.  
> * **Escopo não homologado:** Integração real de e-mail (Resend em produção), integração real com Stripe e testes E2E não são declarados como aprovados.
