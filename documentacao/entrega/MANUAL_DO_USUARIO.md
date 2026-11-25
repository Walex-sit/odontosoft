# ODONTOSOFT — MANUAL DO USUÁRIO
**Plataforma de Gestão Odontológica Multiclínica**

---

> **Documentação de Entrega Acadêmica**  
> **Sistema:** OdontoSoft SaaS  
> **Versão do Projeto:** 1.0.0-rc  
> **Data de Elaboração:** 23 de Novembro de 2026  
> **Público-Alvo:** Instrutores, Avaliadores, Gestores Clínicos, Cirurgiões-Dentistas, Recepcionistas e Administradores  

---

## Sumário

1. [Apresentação e Requisitos de Acesso](#1-apresentação-e-requisitos-de-acesso)
2. [Login e Autenticação](#2-login-e-autenticação)
3. [Navegação e Dashboard Gerencial (Overview)](#3-navegação-e-dashboard-gerencial-overview)
4. [Módulo Super Admin e Seleção de Contexto](#4-módulo-super-admin-e-seleção-de-contexto)
5. [Gestão de Pacientes](#5-gestão-de-pacientes)
6. [Consentimentos e Privacidade (LGPD)](#6-consentimentos-e-privacidade-lgpd)
7. [Agenda de Consultas](#7-agenda-de-consultas)
8. [Prontuário Odontológico e Integridade de Registros](#8-prontuário-odontológico-e-integridade-de-registros)
9. [Módulo Financeiro e Fluxo de Caixa](#9-módulo-financeiro-e-fluxo-de-caixa)
10. [Controle de Estoque e Alertas de Nível Mínimo](#10-controle-de-estoque-e-alertas-de-nível-mínimo)
11. [Gestão de Equipe e Controle de Acesso (RBAC)](#11-gestão-de-equipe-e-controle-de-acesso-rbac)
12. [Controle de Comissões e Repasses](#12-controle-de-comissões-e-repasses)
13. [Réguas de Comunicação e Automações](#13-réguas-de-comunicação-e-automações)
14. [Configurações da Clínica e Assinatura](#14-configurações-da-clínica-e-assinatura)

---

## 1. Apresentação e Requisitos de Acesso

O **OdontoSoft** é uma aplicação web voltada à informatização e governança de clínicas odontológicas. O sistema foi desenvolvido para ser executado diretamente em navegadores web modernos (Google Chrome, Mozilla Firefox, Microsoft Edge ou Safari), sem necessidade de instalação de softwares proprietários no computador do usuário.

### Requisitos Mínimos:
* Conexão estável com a Internet.
* Resolução de tela sugerida a partir de 1280x720 pixels (computadores/notebooks) ou visualização adaptada em tablets e dispositivos móveis.
* Suporte a JavaScript habilitado no navegador.

---

## 2. Login e Autenticação

O acesso à plataforma é individual e intransferível.

```
[ Tela de Acesso /login ]
 ├── E-mail institucional do colaborador
 └── Senha cadastrada
```

### 2.1 Processo de Login
1. Acesse o endereço da plataforma (por exemplo, `http://localhost:3000/login`).
2. Digite seu **e-mail** cadastrado e a respectiva **senha**.
3. Clique no botão **"Entrar"** (com indicação visual "Entrando..." durante a autenticação).
4. O sistema valida as credenciais via Supabase Auth e carrega as permissões de acesso específicas do seu perfil.

### 2.2 Redefinição e Criação de Senha
* Usuários convidados por administradores recebem um link seguro que direciona para a tela de definição de senha (`/definir-senha`).
* Uma vez definida a senha, o acesso é liberado automaticamente conforme o perfil atribuído.

---

## 3. Navegação e Dashboard Gerencial (Overview)

Após autenticar-se, o usuário é direcionado ao painel principal (`/overview`).

### 3.1 Barra Superior (Topbar)
A Topbar está presente em todas as telas internas e contém:
* **Identificação da Clínica:** Exibe o nome da clínica ativa ou o contexto do Super Admin.
* **Busca Global (Atalho Ctrl+K / Cmd+K):** Permite localizar rapidamente pacientes e prontuários.
* **Central de Notificações:** Apresenta avisos operacionais, como itens em estoque mínimo e pendências de aceite LGPD.
* **Ferramentas Clínicas Rápidas:** Acesso instantâneo a calculadora clínica, emissor rápido de receitas e emissor de atestados médicos.
* **Alternador de Tema:** Suporte para Modo Claro e Modo Escuro.
* **Menu do Usuário:** Dados do perfil logado e botão de encerramento de sessão (**Sair**).

### 3.2 Indicadores e Gráficos do Dashboard
O Dashboard consolidado exibe:
* **Faturamento Mensal:** Total de recebimentos no mês corrente comparado ao mês anterior.
* **Pacientes Ativos:** Total de pacientes em acompanhamento clínico e novos cadastros.
* **Consultas do Dia:** Quantidade de atendimentos marcados e total de concluídos.
* **Gráficos Financeiros e de Produção:** Fluxo de caixa temporal (entradas vs. saídas), distribuição de atendimentos por dentista e procedimentos mais realizados.
* **Painel de Alertas Rápidos:** Listagem dinâmica de contas com vencimento próximo e insumos em nível crítico.

---

## 4. Módulo Super Admin e Seleção de Contexto

O OdontoSoft é uma plataforma multi-tenant em que usuários comuns (administradores locais, dentistas, recepcionistas e operadores financeiros) operam estritamente no escopo da sua respectiva clínica, sem visibilidade ou acesso a dados de outras organizações.

Usuários com o papel `super_admin` possuem privilégios de auditoria e monitoramento global de todas as clínicas cadastradas na plataforma através de um mecanismo administrativo controlado e validado no servidor.

### 4.1 Painel Administrativo Global (`/admin`)
* Lista todas as clínicas registradas, status de assinatura, quantidade de usuários e volume de pacientes.
* Visualização de métricas consolidadas da plataforma SaaS.

### 4.2 Seleção de Contexto de Clínica
1. No painel `/admin`, o Super Admin pode clicar em **"Acessar Clínica"** em qualquer registro listado.
2. O sistema grava um cookie de contexto seguro (`odontosoft_admin_context`) validado no servidor e passa a apresentar a interface no escopo daquela unidade.
3. Um banner destacado de aviso (**AdminContextBanner**) é fixado no topo da interface alertando sobre o contexto ativo:
   > *"Você está navegando na clínica [Nome da Clínica] com privilégios de Super Admin."*
4. Para retornar ao painel global, basta clicar no botão **"Voltar ao Painel Global"** no banner ou na opção equivalente no menu da Topbar.

---

## 5. Gestão de Pacientes

O módulo de Pacientes (`/pacientes`) concentra a base cadastral de pessoas atendidas.

```
Módulo de Pacientes
 ├── Listagem e Filtros por Nome / CPF / Convênio
 ├── Cadastro de Novo Paciente (Slide-Over lateral)
 ├── Ficha Detalhada do Paciente (/pacientes/[id])
 └── Edição Cadastral (/pacientes/[id]/edit)
```

### 5.1 Cadastrando um Paciente
1. Clique em **"Novo Paciente"** no canto superior direito.
2. Preencha os dados pessoais: Nome completo, CPF, Data de Nascimento, Gênero e Convênio.
3. Informe dados de contato: Telefone, WhatsApp e E-mail.
4. Preencha o endereço completo (com preenchimento automático por CEP).
5. Defina se o termo inicial de proteção de dados foi aceito.
6. Clique em **"Salvar Paciente"**. O sistema realiza a validação de formato e armazena os dados de forma protegida.

---

## 6. Consentimentos e Privacidade (LGPD)

O OdontoSoft adota medidas técnicas voltadas à proteção e privacidade de dados pessoais no fluxo clínico e administrativo.

> [!NOTE]
> **Ressalva de Conformidade:** As salvaguardas implementadas constituem medidas técnicas de segurança da informação e governança de dados (Privacy by Design). O projeto não declara conformidade jurídica integral com a LGPD, visto que o enquadramento legal pleno requer processos institucionais, relatórios formais de impacto à proteção de dados e governança corporativa externa.

### 6.1 Modal de Consentimento LGPD
* Disponível na listagem ou na ficha do paciente através do botão **"Gerenciar Consentimento"** ou pelo alerta de pendência.
* Apresenta as finalidades de tratamento:
  * Prontuário Odontológico e Histórico de Tratamentos.
  * Comunicações Clínicas e Lembretes de Consulta.
  * Cobrança e Gestão Financeira.
  * Pesquisa Clínica Interna e Aprimoramento.
* Permite registrar o consentimento formal (com data e versão do termo).
* **Emissão do Documento:** Gera o termo físico formal em PDF pronto para impressão e assinatura através do botão **"Imprimir Termo Físico (PDF)"**.

### 6.2 Revogação e Anonimização
* **Revogação:** É possível registrar a revogação de consentimentos não essenciais.
* **Anonimização (Art. 18):** Quando requisitado pelo titular e observados os prazos legais de guarda e conservação documental aplicáveis à área da saúde, administradores autorizados podem acionar a rotina de dissociação irreversível de dados cadastrais.

---

## 7. Agenda de Consultas

A Agenda (`/agenda`) organiza o fluxo de atendimento diário, semanal e mensal dos profissionais.

### 7.1 Agendando uma Consulta
1. Na tela da Agenda, clique no botão **"+ Novo"** (ou **"Novo Agendamento"** no estado vazio) ou diretamente no horário desejado na grade.
2. Selecione o **Paciente** cadastrado.
3. Selecione o **Dentista** responsável.
4. Informe o **Procedimento**, Data, Horário de Início e Término estimado.
5. **Prevenção de Conflitos:** O sistema impede automaticamente a confirmação se o dentista selecionado já possuir outro atendimento agendado no mesmo intervalo.
6. Clique em **"Confirmar Agendamento"**.

### 7.2 Atualização de Status
Cada agendamento pode transitar entre os seguintes estados operacionais:
* **Agendado:** Horário reservado na grade.
* **Confirmado:** Presença validada com o paciente.
* **Espera:** Paciente presente na sala de espera aguardando atendimento.
* **Atendido:** Procedimento realizado na clínica.
* **Cancelado:** Horário desmarcado e liberado na grade.

---

## 8. Prontuário Odontológico e Integridade de Registros

A tela de Prontuários (`/prontuarios`) adota uma implementação técnica voltada à integridade de dados clínicos, baseada em registros imutáveis (append-only) e rastreabilidade estrita de adendos sequenciais.

```
Estrutura do Prontuário
 └── Registro Clínico Inicial (Finalizado e Imutável)
      ├── Adendo Retificativo 1 (Sequencial, com justificativa obrigatória)
      └── Adendo de Esclarecimento 2 (Sequencial, com justificativa obrigatória)
```

### 8.1 Registro de Evolução Clínica
1. No painel lateral da tela de prontuários, selecione o **Paciente** e informe o **Tratamento**.
2. Descreva minuciosamente o ato odontológico no campo **"Descrição / Evolução"** (procedimentos executados, materiais empregados e orientações).
3. Clique em **"Salvar Registro"**.
4. **Implementação de Integridade:** Uma vez gravado, o registro nasce como finalizado. Na arquitetura técnica do sistema, **são bloqueadas alterações diretas (`UPDATE`) e exclusões (`DELETE`)** do texto original do prontuário.

### 8.2 Inserção de Adendos Retificativos
Caso seja necessário corrigir uma digitação ou prestar esclarecimentos complementares:
1. Localize o registro original na listagem de histórico.
2. Acione o registro de adendo vinculado ao atendimento original.
3. Selecione o tipo de adendo (*Adendo Retificativo* ou *Adendo de Esclarecimento*).
4. Informe obrigatoriamente a **Justificativa da Retificação** (mínimo de 10 caracteres) e o conteúdo explicativo.
5. O sistema vincula o adendo ao registro original de forma cronológica no servidor via procedimento armazenado (`criar_adendo_prontuario`), mantendo a trilha de auditoria completa e indelével, sem declarar conformidade normativa não comprovada.

---

## 9. Módulo Financeiro e Fluxo de Caixa

O módulo Financeiro (`/financeiro`) consolida a movimentação econômica da clínica.

### 9.1 Receitas (Entradas)
* Provenientes de procedimentos clínicos realizados, parcelamentos e consultas particulares.
* Cada lançamento registra paciente, procedimento, valor cobrado, forma de pagamento e status (*Pendente* ou *Pago*).

### 9.2 Despesas (Saídas)
* Controle de contas a pagar da clínica (aluguel, compras de insumos, laboratório de prótese, tecnologia, água, energia, etc.).
* Exibe alertas visuais para despesas com vencimento próximo ou atrasadas.

### 9.3 Fluxo de Caixa (`/fluxo-caixa`)
* Apresenta o saldo líquido consolidado no período (Receitas Liquidadas - Despesas Pagas).
* Gráficos temporais de evolução financeira.

---

## 10. Controle de Estoque e Alertas de Nível Mínimo

O módulo de Estoque (`/estoque`) monitora materiais clínicos e insumos descartáveis.

| Campo | Descrição |
| :--- | :--- |
| **Nome do Item** | Identificação clara do produto (ex: Resina Composta A2, Fio Dental). |
| **Quantidade Atual** | Volume físico disponível na clínica. |
| **Estoque Mínimo** | Margem de segurança definida para disparar reposição. |
| **Unidade** | Unidade de contagem (ex: un, frasco, caixa, kit). |
| **Fornecedor** | Descrição ou contato do fornecedor habitual. |

### 10.1 Alerta Automático de Estoque Mínimo
* O sistema avalia em tempo real a regra de criticidade:
  $$\text{Estoque Mínimo} > 0 \quad \text{e} \quad \text{Quantidade Atual} \le \text{Estoque Mínimo}$$
* Quando há itens nessa condição, um alerta dinâmico é adicionado à Central de Notificações na Topbar para perfis de administração, informando o número exato de itens críticos e seus respectivos nomes.
* Se todos os produtos estiverem com quantidade superior à margem mínima, nenhum alerta de estoque é emitido.

### 10.2 Movimentação e Cadastro de Estoque
* **Novo Item:** Clique no botão **"Novo Item"** no canto superior para cadastrar um insumo informando nome, categoria, quantidade inicial, margem de estoque mínimo, unidade de medida e fornecedor.
* **Entrada e Saída:** Na tabela de produtos cadastrados, utilize os botões **"Entrada"** (reposição de compras) ou **"Saída"** (consumo em atendimentos) para atualizar as quantidades em tempo real.

---

## 11. Gestão de Equipe e Controle de Acesso (RBAC)

A tela de Usuários (`/usuarios`) permite ao Administrador da clínica gerenciar seus colaboradores.

### 11.1 Isolamento de Escopo e Perfis
Cada colaborador cadastrado está associado exclusivamente à clínica à qual pertence. Usuários comuns não possuem visibilidade ou permissão para consultar ou alterar colaboradores, pacientes ou movimentações financeiras de outras unidades da rede. O Super Admin é o único perfil com prerrogativa global para auditar e alternar contextos administrativos através de validação estrita no servidor.

### 11.2 Papéis de Usuário Disponíveis
1. **Super Admin (`super_admin`):** Auditoria global do SaaS e supervisão de clínicas via contexto controlado.
2. **Administrador Geral (`admin` / `admin_clinica`):** Acesso total às configurações, financeiro, equipe, estoque e módulos clínicos da sua respectiva clínica.
3. **Cirurgião-Dentista (`dentista`):** Acesso focado em agenda, pacientes, prontuários, receituários, atestados e extrato de comissões próprias.
4. **Recepção (`recepcao`):** Acesso à agenda, cadastro de pacientes e registro de presença na sala de espera.
5. **Financeiro (`financeiro`):** Acesso restrito a contas a pagar/receber, emissão de cobranças e fluxo de caixa.

---

## 12. Controle de Comissões e Repasses

Localizado em `/comissoes`, este módulo gerencia a apuração de repasses aos dentistas.

### 12.1 Funcionamento do Painel
* **Seletor de Profissionais:** Carrega dinamicamente todos os colaboradores da clínica com perfil de *Dentista*.
* **Contador de Profissionais:** Reflete fielmente a quantidade de dentistas cadastrados na unidade.
* **Tabela de Procedimentos:** Cruza procedimentos realizados com pacientes e calcula o valor do repasse conforme o percentual pactuado.
* **Configuração de Percentuais:** Pelo botão **"Configurar Comissões"**, o gestor define a porcentagem de repasse de cada procedimento por dentista.
* **Quitação de Comissões:** O gestor pode marcar comissões como pagas através do botão **"Quitar Tudo"**, atualizando o histórico da clínica.

---

## 13. Réguas de Comunicação e Automações

Disponível em `/regua-cobranca`, a funcionalidade permite desenhar mensagens automatizadas por etapa de jornada do paciente.

```
Réguas Pré-Configuradas (Exemplos Padrão OdontoSoft)
 ├── Lembrete 24h antes (WhatsApp)
 ├── Lembrete 2h antes (SMS)
 ├── Cobrança 3 dias de atraso (WhatsApp)
 ├── Cobrança 10 dias de atraso (E-mail)
 └── Convite de Retorno Semestral (WhatsApp)
```

> [!NOTE]
> **Aviso de Demonstração / Simulação**  
> No ambiente atual da entrega acadêmica, o botão **"Disparar"** opera em **Modo de Demonstração**. Ele realiza a conferência das regras e emite feedback visual na interface (`toast.info`), **sem realizar o envio externo real de mensagens via provedor terceiro de mensageria**, uma vez que os serviços de API externa (ex: WhatsApp Business API / Gateway SMS) não estão contratados no protótipo acadêmico.

---

## 14. Configurações da Clínica e Assinatura

No menu de Configurações (`/configuracoes` e `/establishment/subscription`):
* **Dados da Clínica:** Razão Social, Nome Fantasia, CNPJ, Telefone de Contato e Logomarca.
* **Assinatura do SaaS:** Painel informativo sobre os planos (Essencial, Controle e Avançado).
* **Estado do Gateway de Pagamento:** Conforme diretriz do projeto, o processamento de pagamentos pelo Stripe está temporariamente desativado para a demonstração acadêmica. A interface exibe aviso claro de indisponibilidade e o fluxo de checkout permanece bloqueado de maneira controlada, garantindo que nenhum módulo essencial dependa de pagamentos ativos e que não existam cobranças fictícias.
