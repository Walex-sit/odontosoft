// app/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'
import 'server-only' // Isso é o seu "escudo anti-erro": se alguém tentar usar no cliente, o código quebra avisando o erro

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})