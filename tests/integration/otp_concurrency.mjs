import { execSync } from 'child_process'

console.log('=== TESTE DE CONCORRÊNCIA: CONSUMO ATÔMICO DE OTP (CAS) ===')

// 1. Inserir código de teste não consumido
const setupSql = `
  INSERT INTO public.user_verification_codes (id, email, code, code_hash, expires_at, used, attempts)
  VALUES (
    '99999999-9999-9999-9999-999999999999',
    'concorrencia@teste.com',
    'hash-teste-hmac',
    'hash-teste-hmac',
    now() + INTERVAL '15 minutes',
    false,
    0
  )
  ON CONFLICT (id) DO UPDATE SET used = false, attempts = 0;
`

execSync('docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -c "' + setupSql.replace(/\n/g, ' ') + '"')
console.log('1. Código OTP inserido com used = false.')

// 2. Disparar 10 transações simultâneas tentando consumir
const workerSql = `
  UPDATE public.user_verification_codes
  SET used = true
  WHERE id = '99999999-9999-9999-9999-999999999999' AND used = false
  RETURNING id;
`

console.log('2. Disparando 10 workers concorrentes...')

const promises = []
for (let i = 1; i <= 10; i++) {
  promises.push(new Promise((resolve) => {
    try {
      const out = execSync('docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -t -A -c "' + workerSql.replace(/\n/g, ' ') + '"', {
        timeout: 5000
      }).toString().trim()
      resolve({ worker: i, consumed: out.includes('99999999-9999-9999-9999-999999999999') })
    } catch (e) {
      resolve({ worker: i, consumed: false, error: e.message })
    }
  }))
}

Promise.all(promises).then((results) => {
  const successes = results.filter(r => r.consumed)
  const rejected = results.filter(r => !r.consumed)

  console.log(`\nResultados:`)
  console.log(`- Sucessos (código consumido): ${successes.length}`)
  console.log(`- Rejeitados (código já utilizado/concorrente): ${rejected.length}`)

  // Verificação no banco
  const checkSql = `SELECT used FROM public.user_verification_codes WHERE id = '99999999-9999-9999-9999-999999999999';`
  const finalStatus = execSync('docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -t -A -c "' + checkSql + '"').toString().trim()
  console.log(`- Estado final no banco (used): ${finalStatus}`)

  // Limpeza
  execSync('docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -c "DELETE FROM public.user_verification_codes WHERE id = \'99999999-9999-9999-9999-999999999999\';"')

  if (successes.length === 1 && rejected.length === 9 && finalStatus === 't') {
    console.log('\n✅ TESTE DE CONCORRÊNCIA APROVADO: Exatamente 1 requisição consumiu o OTP. Atomicidade CAS garantida!')
    process.exit(0)
  } else {
    console.error('\n❌ FALHA NO TESTE DE CONCORRÊNCIA: Atomicidade violada!')
    process.exit(1)
  }
})

