import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Segurança] ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const CLINICA_ID = '78733a3f-708c-4f08-8af3-94d0929707e4';
const DEMO_EMAIL = 'demo@odontosoft.com.br';
async function main() {
  const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 200 });
  const demoUser = users.find(u => u.email === DEMO_EMAIL);
  if (!demoUser) { console.log('Nao encontrado'); return; }
  console.log('ID:', demoUser.id);
  const { data: existing } = await sb.from('user_profiles').select('*').eq('id', demoUser.id).maybeSingle();
  console.log('Existente:', existing ? JSON.stringify(existing) : 'NENHUM');
  if (!existing) {
    const { error } = await sb.from('user_profiles').insert({ id: demoUser.id, nome: 'Dr. Demo', email: DEMO_EMAIL, role: 'admin', clinica_id: CLINICA_ID, especialidade: 'Clinica Geral' });
    console.log(error ? 'Erro: ' + error.message : 'CRIADO!');
  } else if (existing.clinica_id !== CLINICA_ID) {
    const { error } = await sb.from('user_profiles').update({ clinica_id: CLINICA_ID, role: 'admin' }).eq('id', demoUser.id);
    console.log(error ? 'Err upd: ' + error.message : 'clinica_id CORRIGIDA!');
  } else { console.log('OK - clinica_id ja correcta'); }
  const { data: f } = await sb.from('user_profiles').select('*').eq('id', demoUser.id).maybeSingle();
  console.log('Final:', JSON.stringify(f));
}
main().catch(e => { console.error(e.message); process.exit(1); });
