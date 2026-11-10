import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { supabaseAdmin } from '@/app/lib/supabase/admin'
import { verificarCodigoValidacao } from '@/app/actions/validation-code'

describe('ITEM 12: OTP - Reserva Atômica de Tentativa Antes de Comparar Hash', () => {
  it('50 tentativas erradas simultâneas devem resultar em no máximo 5 comparações de hash', async () => {
    process.env.OTP_SECRET = process.env.OTP_SECRET || 'test-otp-secret-key-for-audit-concurrency-minimum-32-chars'

    const testEmail = `item12_concurrency_${Date.now()}@exemplo.com`
    const correctCode = '654321'
    const wrongCode = '000000'

    // Hash HMAC do código correto
    const correctHash = crypto
      .createHmac('sha256', process.env.OTP_SECRET)
      .update(`${testEmail}:${correctCode}`)
      .digest('hex')

    // 1. Inserir código novo no PostgreSQL (attempts = 0, used = false, expires_at = +15m)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('user_verification_codes')
      .insert({
        email: testEmail,
        code: correctHash,
        expires_at: expiresAt,
        used: false,
        attempts: 0,
      })
      .select('id')
      .single()

    expect(insertError).toBeNull()
    expect(inserted).toBeDefined()
    const codeId = inserted!.id

    // 2. Interceptar crypto.timingSafeEqual para monitorar exatamente quantas comparações de hash ocorrem
    let hashComparisonsCount = 0
    const origTimingSafeEqual = crypto.timingSafeEqual
    crypto.timingSafeEqual = function (a: NodeJS.ArrayBufferView, b: NodeJS.ArrayBufferView) {
      hashComparisonsCount++
      return origTimingSafeEqual.call(crypto, a, b)
    }

    try {
      // 3. Disparar 50 requisições simultâneas com código incorreto
      const requests = Array.from({ length: 50 }, (_, i) =>
        verificarCodigoValidacao(testEmail, wrongCode).then(res => ({ reqId: i + 1, res }))
      )

      const results = await Promise.all(requests)

      let countBlocked = 0
      let countWrongCode = 0

      for (const r of results) {
        if (r.res.error?.includes('Número máximo de tentativas excedido')) {
          countBlocked++
        } else if (r.res.error?.includes('Código de confirmação incorreto')) {
          countWrongCode++
        }
      }

      // 4. Inspecionar o estado persistido no PostgreSQL
      const { data: finalRecord } = await supabaseAdmin
        .from('user_verification_codes')
        .select('attempts, used')
        .eq('id', codeId)
        .single()

      console.log('\n--- SAÍDA BRUTA ITEM 12 (50 REQUISIÇÕES CONCORRENTES) ---')
      console.log(`Total de requisições disparadas simultaneamente: 50`)
      console.log(`Comparações de hash (safeCompare / timingSafeEqual) executadas: ${hashComparisonsCount}`)
      console.log(`Requisições rejeitadas diretamente pelo banco (sem comparar hash): ${50 - hashComparisonsCount}`)
      console.log(`Respostas com 'Código de confirmação incorreto': ${countWrongCode}`)
      console.log(`Respostas com 'Número máximo de tentativas excedido': ${countBlocked}`)
      console.log(`Estado final do registro no PostgreSQL: attempts=${finalRecord?.attempts}, used=${finalRecord?.used}`)

      // Apenas quem reservou uma das 5 tentativas atômicas pode ter comparado o hash!
      expect(hashComparisonsCount).toBeLessThanOrEqual(5)
      expect(finalRecord?.attempts).toBe(5)
    } finally {
      // Restaurar crypto.timingSafeEqual e limpar registro
      crypto.timingSafeEqual = origTimingSafeEqual
      await supabaseAdmin.from('user_verification_codes').delete().eq('id', codeId)
    }
  }, 30000)
})

