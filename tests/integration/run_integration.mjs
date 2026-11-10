import { execSync } from 'child_process'

console.log('======================================================================')
console.log('ODONTOSOFT: EXECUÇÃO DA SUÍTE INTEGRADA DE TESTES NO POSTGRESQL')
console.log('======================================================================\n')

try {
  console.log('>>> 1. Executando Suíte de RLS, RPC e Storage...')
  execSync('node tests/integration/security_suite.mjs', { stdio: 'inherit' })

  console.log('\n>>> 2. Executando Teste de Concorrência e Atomicidade OTP...')
  execSync('node tests/integration/otp_concurrency.mjs', { stdio: 'inherit' })

  console.log('\n======================================================================')
  console.log('✅ TODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO NO BANCO LOCAL!')
  console.log('======================================================================')
} catch (err) {
  console.error('\n❌ FALHA NA EXECUÇÃO DOS TESTES DE INTEGRAÇÃO.')
  process.exit(1)
}

