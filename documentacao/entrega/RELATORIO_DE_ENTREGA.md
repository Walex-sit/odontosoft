# ODONTOSOFT — RELATÓRIO OFICIAL DE ENTREGA
**Avaliação de Conformidade de Software, Escopo Entregue e Resultados Técnicos**

---

> **Documentação de Entrega Acadêmica**  
> **Projeto:** OdontoSoft — SaaS de Gestão Odontológica Multiclínica  
> **Data de Emissão:** 23 de Novembro de 2026  
> **Ambiente de Homologação:** Next.js 16.2.4 (Turbopack) / Node.js 20.x / Supabase (PostgreSQL 15)  
> **Objetivo:** Submissão formal para avaliação e validação acadêmica pelo corpo docente / instrutor  

---

## Sumário

1. [Resumo Executivo e Objetivo do Projeto](#1-resumo-executivo-e-objetivo-do-projeto)
2. [Problema de Negócio e Solução Proposta](#2-problema-de-negócio-e-solução-proposta)
3. [Matriz de Conformidade do Escopo Entregue](#3-matriz-de-conformidade-do-escopo-entregue)
4. [Tecnologias Utilizadas e Fundamentação](#4-tecnologias-utilizadas-e-fundamentação)
5. [Segurança da Informação e Isolamento Multi-Tenant](#5-segurança-da-informação-e-isolamento-multi-tenant)
6. [Resultados de Testes e Evidências Comprovadas](#6-resultados-de-testes-e-evidências-comprovadas)
7. [Limitações Conhecidas do Protótipo Acadêmico](#7-limitações-conhecidas-do-protótipo-acadêmico)
8. [Estado das Integrações Externas](#8-estado-das-integrações-externas)
9. [Roadmap de Evolução e Melhorias Futuras](#9-roadmap-de-evolução-e-melhorias-futuras)
10. [Conclusão Final](#10-conclusão-final)

---

## 1. Resumo Executivo e Objetivo do Projeto

O **OdontoSoft** foi concebido e construído como uma aplicação SaaS (Software as a Service) B2B para gestão integral de consultórios e clínicas odontológicas. O foco do projeto acadêmico reside em três pilares fundamentais da engenharia de software contemporânea:
1. **Arquitetura Multi-Tenant com Isolamento Estrito:** Operação de usuários comuns estritamente restrita ao escopo da própria clínica via Row Level Security (RLS) no PostgreSQL e verificação de sessão, enquanto o perfil Super Admin possui contexto administrativo controlado e validado no servidor.
2. **Integridade de Registros Clínicos:** Implementação técnica de registros de prontuário append-only (imutabilidade lógica de atendimentos finalizados) e rastreabilidade estrita de alterações e esclarecimentos exclusivamente via adendos sequenciais vinculados, sem declaração de conformidade normativa não comprovada.
3. **Salvaguardas Técnicas de Privacidade:** Implementação de controles técnicos alinhados às diretrizes da LGPD (Lei 13.709/2018), com criptografia e mascaramento de CPF, busca determinística por HMAC-SHA256, minimização de logs de auditoria e gestão versionada de consentimentos (com ressalva expressa de não declaração de conformidade jurídica plena).

---

## 2. Problema de Negócio e Solução Proposta

### 2.1 O Problema
Consultórios odontológicos frequentemente operam com sistemas legados fragmentados, planilhas desprotegidas ou fichas em papel. Esse cenário acarreta:
* Riscos elevados de perda ou adulteração de históricos de tratamento.
* Vulnerabilidade no armazenamento de dados sensíveis de saúde de pacientes.
* Dificuldade de apuração de repasses e comissões para dentistas parceiros.
* Ausência de trilha de auditoria para fins de responsabilidade civil e ético-profissional.

### 2.2 A Solução OdontoSoft
Uma plataforma web unificada, segura e responsiva, onde gestores, cirurgiões-dentistas, recepcionistas e operadores financeiros dispõem de ferramentas coordenadas sob rígido controle de permissões por perfil (RBAC) e proteção de dados em repouso e em trânsito.

---

## 3. Matriz de Conformidade do Escopo Entregue

Para conferir transparência à entrega acadêmica, as funcionalidades do sistema são categorizadas de acordo com as seguintes definições técnicas:

* **Funcionalidade implementada:** O código-fonte, rotas e componentes existem, estão integrados e operam no sistema.
* **Funcionalidade coberta por testes automatizados:** O comportamento possui asserções específicas validadas na suíte automatizada de testes (Vitest).
* **Funcionalidade verificada manualmente:** O fluxo da interface, telas e comportamentos visuais foram inspecionados diretamente na aplicação.
* **Funcionalidade simulada:** A interface opera com finalidade didática e demonstrativa, sem acionamento de efeitos externos reais em serviços de terceiros.
* **Integração desativada:** A conexão com serviço externo encontra-se intencionalmente suspensa de maneira controlada para fins da demonstração acadêmica.
* **Funcionalidade não verificada:** Recurso ou dispositivo físico externo que não integra o escopo de homologação do protótipo.

| Módulo / Funcionalidade | Classificação Técnica | Evidência no Código-Fonte | Observações Relevantes |
| :--- | :---: | :--- | :--- |
| **Login e Sessão JWT** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/login/page.tsx`, `LoginView.tsx`, `proxy.ts`, `@supabase/ssr` | Autenticação via Supabase Auth com cookies HTTP-Only e renovação de sessão. |
| **Dashboard Gerencial (KPIs)** | **Funcionalidade implementada**<br>*(Verificada manualmente)* | `app/(dashboard)/overview/page.tsx`, `app/actions/dashboard.ts` | Indicadores de faturamento, pacientes, consultas e gráficos Recharts (fluxo de caixa, procedimentos e dentistas). |
| **Super Admin e Contexto** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/(dashboard)/admin/page.tsx`, `app/actions/admin-global.ts`, `tests/super_admin_context.test.ts` | Usuários comuns restritos à própria clínica; Super Admin opera em contexto controlado e validado no servidor com cookie auditado. |
| **Cadastro de Pacientes** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/(dashboard)/pacientes/page.tsx`, `app/actions/pacientes.ts` | Validação de formulário via Zod, busca determinística e máscara de dados cadastrais. |
| **Proteção de CPF e Dados** | **Funcionalidade implementada**<br>*(Coberta por testes automatizados)* | Colunas `cpf_hash`, `cpf_mascarado`, `cpf_encrypted`, `tests/security_p0.test.ts` | CPF mascarado na interface (`***.***.123-**`), hash HMAC-SHA256 para buscas e logs operacionais sanitizados. |
| **Consentimentos LGPD** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/components/ModalConsentimentoLGPD.tsx`, `pacientes.ts`, `tests/lgpd_consent.test.ts` | Registro versionado, emissão de PDF via jsPDF ("Imprimir Termo Físico") e rotina de anonimização (Art. 18). |
| **Agenda de Atendimentos** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/(dashboard)/agenda/page.tsx`, `app/actions/agenda.ts` | Bloqueio atômico de conflitos de horário por dentista; gestão de status (Agendado, Confirmado, Espera, Atendido, Cancelado). |
| **Prontuário e Integridade Clínica** | **Funcionalidade implementada**<br>*(Verificada manualmente)* | `app/(dashboard)/prontuarios/page.tsx`, `app/actions/prontuarios.ts` | Registros finalizados são append-only (sem UPDATE/DELETE direto); retificações registradas via adendos com justificativa obrigatória. |
| **Financeiro e Fluxo de Caixa** | **Funcionalidade implementada**<br>*(Verificada manualmente)* | `app/(dashboard)/financeiro/page.tsx`, `fluxo-caixa/page.tsx` | Contas a pagar e receber, categorização e saldo consolidado. |
| **Estoque e Alertas de Nível Mínimo** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/(dashboard)/estoque/page.tsx`, `app/components/Topbar.tsx`, `tests/verificacao_pontual_3_funcionalidades.test.ts` | Alerta restrito a itens reais com $\text{minimo} > 0$ e $\text{quantidade} \le \text{minimo}$; botões "Novo Item", "Entrada" e "Saída". |
| **Equipe e Gestão RBAC** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/(dashboard)/usuarios/page.tsx`, `app/lib/rbac.ts`, `tests/security_etapa4.test.ts` | 6 perfis distintos com isolamento de clínica e checagem de privilégios no servidor. |
| **Controle de Comissões** | **Funcionalidade implementada**<br>*(Coberta por testes e verificada manualmente)* | `app/(dashboard)/comissoes/page.tsx`, `tests/verificacao_pontual_3_funcionalidades.test.ts` | Identificação real de dentistas (`user_profiles`), cálculo dinâmico sobre procedimentos e quitação. |
| **Réguas de Comunicação** | **Funcionalidade simulada**<br>*(Verificada manualmente)* | `app/(dashboard)/regua-cobranca/page.tsx`, `tests/verificacao_pontual_3_funcionalidades.test.ts` | Interface didática de automações; botão "Disparar" emite feedback visual (`toast.info`) de modo demonstração, sem envio externo real. |
| **Gateway de Pagamento Stripe** | **Integração desativada** | `app/(dashboard)/establishment/subscription/page.tsx`, `app/lib/stripe.ts`, `app/lib/plans.ts` | Temporariamente desativado para a demonstração acadêmica. Módulo `stripe.ts` protegido com `server-only`, inicialização preguiçosa e sem chave fictícia; catálogo isolado em `plans.ts`. Integração real não executada nem aprovada. |
| **E-mail Transacional OTP** | **Funcionalidade implementada**<br>*(Integração real não executada)* | `app/lib/email/resend.ts`, `app/lib/env.ts` (`getAppUrl()`) | Suporte ao Resend em modo *fail-closed* em produção (exige `RESEND_API_KEY` e `RESEND_FROM_EMAIL`, sem fallback `onboarding@resend.dev`); fallback seguro restrito a desenvolvimento. Envio real em produção não executado/aprovado. |
| **Assinatura Digital ICP-Brasil / Hardware Físico** | **Funcionalidade não verificada**<br>*(Fora do escopo do protótipo)* | `app/actions/prontuarios.ts` | O sistema não possui integração com autoridades certificadoras ICP-Brasil (A1/A3) nem testes em periféricos físicos (impressoras fiscais/térmicas). |

---

## 4. Tecnologias Utilizadas e Fundamentação

* **Next.js 16 (App Router + Turbopack):** Escolhido pela arquitetura moderna de renderização híbrida, reduzindo a carga do cliente e permitindo execução segura de lógicas de negócio em Server Actions no Node.js.
* **React 19:** Utilização de hooks modernos, transições de estado fluidas e renderização atômica de componentes.
* **TypeScript 5 (Strict Mode):** Garantia de integridade ponta a ponta, com tipagem reflexiva do banco de dados (`Database` types) e prevenção de erros em tempo de compilação.
* **Tailwind CSS:** Padronização visual, consistência de espaçamentos e suporte nativo a modo escuro com alto contraste e acessibilidade.
* **Supabase (PostgreSQL 15):** Banco de dados relacional de padrão industrial com suporte a transações ACID, extensões criptográficas (`pgcrypto`) e isolamento por RLS.

---

## 5. Segurança, Privacidade e Isolamento de Dados

O projeto implementa uma abordagem de proteção em camadas:

```
[ Camada 1: Gateway / proxy.ts ]
      └── Validação de JWT, sessão ativa e bloqueio de rotas não autorizadas.
[ Camada 2: Servidor / Server Actions ]
      └── requireActiveClinic() e requireRole() impedem IDOR e escalada de privilégios.
[ Camada 3: Banco de Dados / RLS ]
      └── get_my_clinica_id() vincula toda query à clínica do usuário logado.
[ Camada 4: Privacidade e Auditoria ]
      └── CPF protegido (Hash + Máscara) e system_logs sem contaminação de dados pessoais.
```

### 5.1 Isolamento Multi-Tenant
O modelo multi-tenant do OdontoSoft assegura que usuários comuns (administradores locais, cirurgiões-dentistas, recepcionistas e operadores financeiros) utilizem estritamente o escopo de dados da sua própria clínica. O isolamento é aplicado na camada de dados via políticas de Row Level Security (`get_my_clinica_id()`) e na camada de aplicação via funções de autorização de sessão no servidor (`requireActiveClinic()`).

O perfil Super Admin possui contexto administrativo controlado e validado no servidor, operando por meio de cookie seguro assinado (`odontosoft_admin_context`) e registrado em log de auditoria, garantindo que a alternância entre clínicas ocorra de forma supervisionada, sem contaminação entre tenants e sem conceder permissões cruzadas a usuários convencionais.

### 5.2 Integridade e Imutabilidade Técnica de Prontuários
A proteção dos registros clínicos é implementada tecnicamente sob o paradigma append-only:
* Registros de evolução clínica nascem como finalizados na base de dados.
* Instruções diretas de alteração (`UPDATE`) ou exclusão (`DELETE`) do conteúdo textual clínico são bloqueadas por regras de integridade.
* Qualquer retificação ou esclarecimento é realizado unicamente através de novos registros vinculados (adendos sequenciais com justificativa obrigatória de no mínimo 10 caracteres e autor identificado via RPC `criar_adendo_prontuario`), garantindo integridade e rastreabilidade técnica dos dados sem declarar conformidade normativa formal não comprovada.

> [!IMPORTANT]
> **Esclarecimento Regulatório sobre LGPD**  
> O sistema implementa salvaguardas técnicas robustas voltadas à proteção de dados (Privacy by Design), tais como hash determinístico HMAC-SHA256 para busca de CPF, armazenamento mascarado na UI e dissociação de cadastro (Art. 18). No entanto, em conformidade com as boas práticas acadêmicas e de engenharia jurídica, **não se declara conformidade jurídica integral com a LGPD**, uma vez que a conformidade plena envolve processos jurídicos externos, nomeação de encarregado (DPO), relatórios formais de impacto (RIPD) e contratos de governança entre Controladoras e Operadoras que extrapolam o escopo de software.

### 5.3 Hardening de Configuração de Produção
Na etapa final de hardening, o código foi ajustado para evitar fallbacks inseguros e exposição acidental em ambiente de produção:
* **Validação de URL pública (`getAppUrl()` em `app/lib/env.ts`):** Exige `NEXT_PUBLIC_APP_URL` válida (`http://` ou `https://`) em produção, removendo o fallback `http://localhost:3000` dos contextos produtivos.
* **Remetente de e-mail (`app/lib/email/resend.ts`):** Removido o fallback `onboarding@resend.dev` em produção, exigindo `RESEND_FROM_EMAIL` configurada (*fail-closed*).
* **Remoção de `NEXT_PUBLIC_OWNER_EMAIL` no cliente:** Os componentes cliente analisados (`app/components/RequireAuth.tsx` e `app/(dashboard)/configuracoes/page.tsx`) deixaram de depender dessa variável pública.
* **Isolamento do catálogo de planos e Stripe (`app/lib/plans.ts` e `app/lib/stripe.ts`):** Catálogo de planos separado em `app/lib/plans.ts`; `app/lib/stripe.ts` protegido com `import 'server-only'`, inicialização preguiçosa (*lazy*) e remoção da chave Stripe fictícia.
* **Revisão de `IS_NON_PRODUCTION_ENV`:** Uso restrito a indicadores visuais não sensíveis na interface, sem função de segurança, autorização ou bypass.
* **Cobertura de regressão:** Adicionada a suíte `tests/env_production_hardening.test.ts`.

---

## 6. Resultados de Testes e Evidências Comprovadas

A qualidade técnica e estabilidade do código foram submetidas a verificações automatizadas, estáticas e de compilação.

> [!NOTE]
> **Natureza e Escopo dos Resultados Técnicos**  
> Os resultados apresentados abaixo refletem **execuções distintas** da suíte automatizada e verificações pós-hardening no ambiente do projeto, servindo como evidência interna de conformidade de código, sem declaração de auditoria externa independente. **Integração real de e-mail (Resend em produção), integração real com Stripe e testes E2E não foram executados nem declarados como aprovados.**

### 6.1 Verificações Estáticas e Build Pós-Hardening
* **TypeScript (`npx tsc --noEmit`):** **Aprovado**, **0 erros** detectados.
* **ESLint:** **0 erros**, com **543 warnings pré-existentes** reportados.
* **Next.js Production Build (`npm run build`):** **Aprovado**, com **45/45 páginas estáticas geradas**.

### 6.2 Execuções de Testes Automatizados (Vitest)
Para transparência, preservam-se os resultados de cada execução separadamente (sem somar os totais, pois há sobreposição de arquivos entre as execuções):

* **Execução anterior da suíte completa (com Supabase local):**
  * **20 arquivos de teste aprovados.**
  * **202 testes aprovados.**
* **Execução de regressão pós-hardening:**
  * **5 arquivos.**
  * **76 testes aprovados**, **0 falhas.**
* **Destaques de cobertura nas suítes do projeto:**
  * `tests/env_production_hardening.test.ts`: Validação de `getAppUrl()`, remoção de fallbacks inseguros (`localhost` e `onboarding@resend.dev`) em produção, ausência de `NEXT_PUBLIC_OWNER_EMAIL` no cliente, inicialização preguiçosa do Stripe sem chave fictícia e restrição de `IS_NON_PRODUCTION_ENV`.
  * `tests/verificacao_pontual_3_funcionalidades.test.ts`: Alerta de estoque dinâmico ($\le$), feedback honesto da régua e contagem real de comissões por dentista.
  * `tests/super_admin_context.test.ts`: Isolamento e alternância de contexto administrativo.
  * `tests/security_etapa4.test.ts`, `tests/security_etapa6.test.ts` e `tests/security_p0.test.ts`: Bloqueio de injeção cross-tenant e imunidade a IDOR.
  * `tests/lgpd_consent.test.ts` e `tests/lgpd_consent_registration.test.ts`: Registro, versão e revogação de consentimentos.
  * `tests/stripe_webhook_payloads.test.ts` e `tests/stripe_webhook_idempotencia.test.ts`: Idempotência de webhooks e ordenação transacional.
  * `tests/estoque.test.ts`: Contrato de colunas e integridade da tabela estoque.

---

## 7. Limitações Conhecidas do Protótipo Acadêmico

1. **Gateway de Pagamento Stripe:** Encontra-se temporariamente desativado para a demonstração acadêmica. O fluxo de checkout e alteração de planos permanece bloqueado de maneira controlada com aviso explícito de indisponibilidade na interface. A integração real com Stripe em produção não foi executada nem aprovada.
2. **E-mail Transacional e Testes E2E:** O envio real de e-mails via Resend em produção e testes E2E em ambiente remoto não foram executados nem homologados nesta entrega, dependendo de configuração de variáveis e domínio verificado em produção.
3. **Réguas de Comunicação Externas:** As mensagens de WhatsApp e SMS não realizam conexões com serviços de mensageria em produção (como Twilio, Meta WhatsApp Cloud API ou Z-API), funcionando como protótipo visual interativo cujo botão "Disparar" emite aviso claro de modo demonstração.
4. **Assinatura Digital de Prontuários com Certificado ICP-Brasil:** O prontuário possui imutabilidade lógica e trilha de adendos, porém não conta nesta versão com assinatura digital por certificado A1/A3 via infraestrutura de chaves públicas brasileira (ICP-Brasil).

---

## 8. Estado das Integrações Externas

* **Supabase Auth / PostgreSQL:** Integrado, ativo e validado em ambiente local; ambiente remoto depende de conferência de migrations e variáveis de produção.
* **Resend (E-mail):** Implementado no servidor em `app/lib/email/resend.ts` (`server-only`) para código OTP de registro; exige `RESEND_API_KEY` e `RESEND_FROM_EMAIL` em produção (sem fallback `onboarding@resend.dev`) e opera com simulação em log defensivo apenas em desenvolvimento. Integração real em produção não executada.
* **Stripe SDK:** Módulo `app/lib/stripe.ts` protegido com `server-only`, inicialização preguiçosa e sem chave fictícia; catálogo separado em `app/lib/plans.ts`. Interface de checkout bloqueada de maneira controlada; integração real não executada.
* **WhatsApp / SMS:** Sem integração externa ativa; interface opera em modo de demonstração.

---

## 9. Roadmap de Evolução e Melhorias Futuras

Para uma eventual comercialização em escala e operação real de mercado:
1. **Integração com WhatsApp Business Cloud API Oficial:** Automatizar lembretes e confirmações com envio real e leitura de respostas via webhook bidirecional.
2. **Emissão de Cobranças via Pix Dinâmico:** Integração com arranjos de pagamento nacionais para liquidação instantânea de tratamentos e parcelamentos.
3. **Módulo de Assinatura Digital ICP-Brasil:** Integração com provedores de certificação digital em nuvem para assinatura digitalizada de atestados e receitas com validade jurídica estrita.
4. **App Mobile do Paciente:** Portal dedicado para visualização de agendamentos, orientações pós-operatórias e consentimentos LGPD.

---

## 10. Conclusão Final

O projeto **OdontoSoft** atinge com êxito os objetivos propostos para a demonstração acadêmica. As funcionalidades prioritárias (Autenticação, Dashboard, Pacientes, LGPD, Agenda, Prontuários e Integridade Clínica, Financeiro, Estoque, Equipe e Comissões) estão integradas, testadas nas suítes automatizadas reportadas e prontas para avaliação em ambiente controlado.

Com a etapa de hardening de produção, o código passou a adotar validações mais estritas para variáveis críticas e isolamento de módulos *server-only*; entretanto, a operação em produção depende ainda de configuração pendente de ambiente, aplicação/verificação das migrations remotas e homologação das integrações externas (e-mail real, Stripe e E2E) não executadas nesta entrega.
