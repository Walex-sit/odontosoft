import { execSync } from 'child_process'

console.log('======================================================================')
console.log('ODONTOSOFT: EXECUÇÃO DA SUÍTE INTEGRADA DE TESTES NO POSTGRESQL')
console.log('======================================================================\n')

try {
  console.log('>>> 1. Executando Suíte de RLS, RPC e Storage...')
  execSync('node tests/integration/security_suite.mjs', { stdio: 'inherit' })

  console.log('\n>>> 2. Executando Teste de Concorrência e Atomicidade OTP...')
  execSync('node tests/integration/otp_concurrency.mjs', { stdio: 'inherit' })

  console.log('\n>>> 3. Executando Teste de Isolamento Multi-Tenant Completo...')
  execSync('node tests/integration/isolamento.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 4. Executando Testes CPF HMAC e Máscara (Tarefa 2)...')
  execSync('node tests/integration/cpf_hmac.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 5. Executando Testes Papéis e Policies (Tarefa 4)...')
  execSync('node tests/integration/papeis_policies.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 6. Executando Testes de Cobrança, Trial e Billing (Tarefa 3)...')
  execSync('node tests/integration/cobranca_trial.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 7. Executando Testes de Auditoria sem Dados Pessoais (Tarefa 5)...')
  execSync('node tests/integration/auditoria_sem_dados_pessoais.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 8. Executando Bateria de Testes dos Bloqueadores Corrigidos (Sprint Pré-Staging)...')
  execSync('node tests/integration/bloqueadores_sprint.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 9. Executando Testes Reais PostgreSQL: Stripe Claim Token & Ordenação Temporal...')
  execSync('node tests/integration/stripe_real_db.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 10. Executando Testes de Regressão Obrigatórios: LGPD Prontuários & Reserva Stripe...')
  execSync('node tests/integration/regressoes_seguranca_privacidade.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 11. Executando Testes Obrigatórios: Painel Global & Contexto Administrativo Super Admin...')
  execSync('node tests/integration/super_admin_context.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 12. Executando Testes de Proteção Contra Substituição de Assinaturas (Etapa 1)...')
  execSync('node tests/integration/stripe_substituicao_protecao.test.mjs', { stdio: 'inherit' })

  console.log('\n>>> 13. Executando Testes de Auditoria Stripe & Alinhamento de Contratos (000008)...')
  execSync('node tests/integration/stripe_auditoria_correcoes.test.mjs', { stdio: 'inherit' })

  console.log('\n======================================================================')
  console.log('✅ TODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO NO BANCO LOCAL!')
  console.log('======================================================================')
} catch (err) {
  console.error('\n❌ FALHA NA EXECUÇÃO DOS TESTES DE INTEGRAÇÃO.')
  process.exit(1)
}

