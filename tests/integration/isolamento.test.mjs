import { execSync } from 'child_process'

function runPsql(sql) {
  try {
    const res = execSync('docker exec -i supabase_db_odontosaas psql -U postgres -d postgres -v ON_ERROR_STOP=1', {
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    })
    const output = (res.stdout ? res.stdout.toString() : '') + (res.stderr ? res.stderr.toString() : '') + res.toString()
    return { success: true, output }
  } catch (err) {
    const output = (err.stdout ? err.stdout.toString() : '') + '\n' + (err.stderr ? err.stderr.toString() : '') + '\n' + err.message
    return { success: false, output, error: output }
  }
}

console.log('======================================================================')
console.log('ODONTOSOFT: TESTE DE ISOLAMENTO MULTI-TENANT E MATRIZ RLS COMPLETA')
console.log('======================================================================\n')

let passed = 0
let failed = 0

function runTest(name, sqlCheck) {
  process.stdout.write(`[TESTE] ${name}... `)
  const res = runPsql(sqlCheck)
  if (res.success && res.output.includes('TEST_OK')) {
    console.log('✅ PASSOU')
    passed++
  } else {
    console.log('❌ FALHOU')
    console.error('Detalhe do erro / saída:')
    console.error(res.error || res.output)
    failed++
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP GERAL: 2 CLÍNICAS (ALPHA E BETA) E 3 USUÁRIOS EM CADA (ADMIN, DENTISTA, RECEPÇÃO)
// ─────────────────────────────────────────────────────────────────────────────
const setupSql = `
DO $$
DECLARE
  v_cid_a UUID := '11111111-1111-4111-a111-111111111111';
  v_cid_b UUID := '22222222-2222-4222-a222-222222222222';
  v_u_admin_a UUID := '11111111-aaaa-4111-a111-111111111111';
  v_u_dentista_a UUID := '11111111-dddd-4111-a111-111111111111';
  v_u_recepcao_a UUID := '11111111-cccc-4111-a111-111111111111';
  v_u_admin_b UUID := '22222222-aaaa-4222-a222-222222222222';
  v_u_dentista_b UUID := '22222222-dddd-4222-a222-222222222222';
  v_u_recepcao_b UUID := '22222222-cccc-4222-a222-222222222222';

  v_pid_a UUID := '11111111-0001-4111-a111-111111111111';
  v_proc_a UUID := '11111111-0002-4111-a111-111111111111';
  v_pront_a UUID := '11111111-0003-4111-a111-111111111111';
  v_rec_a UUID := '11111111-0004-4111-a111-111111111111';
  v_termo_a UUID := '11111111-0005-4111-a111-111111111111';
  v_cons_a UUID := '11111111-0006-4111-a111-111111111111';

  v_pid_b UUID := '22222222-0001-4222-a222-222222222222';
  v_proc_b UUID := '22222222-0002-4222-a222-222222222222';
  v_pront_b UUID := '22222222-0003-4222-a222-222222222222';
  v_rec_b UUID := '22222222-0004-4222-a222-222222222222';
  v_termo_b UUID := '22222222-0005-4222-a222-222222222222';
  v_cons_b UUID := '22222222-0006-4222-a222-222222222222';
BEGIN
  -- 1. Clínicas
  INSERT INTO public.clinicas (id, nome) VALUES (v_cid_a, 'Clinica Alpha Teste') ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;
  INSERT INTO public.clinicas (id, nome) VALUES (v_cid_b, 'Clinica Beta Teste') ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

  -- 2. Auth Users
  INSERT INTO auth.users (id, email) VALUES
    (v_u_admin_a, 'admin.alpha@teste.com'),
    (v_u_dentista_a, 'dentista.alpha@teste.com'),
    (v_u_recepcao_a, 'recepcao.alpha@teste.com'),
    (v_u_admin_b, 'admin.beta@teste.com'),
    (v_u_dentista_b, 'dentista.beta@teste.com'),
    (v_u_recepcao_b, 'recepcao.beta@teste.com')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Perfis
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  INSERT INTO public.user_profiles (id, clinica_id, role, nome, email) VALUES
    (v_u_admin_a, v_cid_a, 'admin_clinica', 'Admin Alpha', 'admin.alpha@teste.com'),
    (v_u_dentista_a, v_cid_a, 'dentista', 'Dentista Alpha', 'dentista.alpha@teste.com'),
    (v_u_recepcao_a, v_cid_a, 'recepcao', 'Recepcao Alpha', 'recepcao.alpha@teste.com'),
    (v_u_admin_b, v_cid_b, 'admin_clinica', 'Admin Beta', 'admin.beta@teste.com'),
    (v_u_dentista_b, v_cid_b, 'dentista', 'Dentista Beta', 'dentista.beta@teste.com'),
    (v_u_recepcao_b, v_cid_b, 'recepcao', 'Recepcao Beta', 'recepcao.beta@teste.com')
  ON CONFLICT (id) DO UPDATE SET clinica_id = EXCLUDED.clinica_id, role = EXCLUDED.role;

  -- 4. Dados em todas as tabelas para a Clínica Beta
  INSERT INTO public.pacientes (id, clinica_id, nome) VALUES (v_pid_b, v_cid_b, 'Paciente Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.procedimentos (id, clinica_id, nome) VALUES (v_proc_b, v_cid_b, 'Procedimento Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.clinica_settings (id, clinica_id, nome) VALUES ('22222222-0007-4222-a222-222222222222', v_cid_b, 'Config Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.alertas (id, clinica_id, mensagem) VALUES ('22222222-0008-4222-a222-222222222222', v_cid_b, 'Alerta Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.fornecedores (id, clinica_id, nome) VALUES ('22222222-0009-4222-a222-222222222222', v_cid_b, 'Fornecedor Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.estoque (id, clinica_id, nome) VALUES ('22222222-0010-4222-a222-222222222222', v_cid_b, 'Item Estoque Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.despesas (id, clinica_id, descricao, valor, data_vencimento) VALUES ('22222222-0011-4222-a222-222222222222', v_cid_b, 'Despesa Beta', 100, CURRENT_DATE) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.compras (id, clinica_id, descricao, valor_total) VALUES ('22222222-0012-4222-a222-222222222222', v_cid_b, 'Compra Beta', 200) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.cobrancas (id, clinica_id, valor, paciente_id) VALUES ('22222222-0013-4222-a222-222222222222', v_cid_b, 150, v_pid_b) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.notas_fiscais (id, clinica_id, numero_nota, valor) VALUES ('22222222-0014-4222-a222-222222222222', v_cid_b, 'NF-001', 500) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.agendamentos (id, clinica_id, paciente_id, data_consulta, hora_consulta, status) VALUES ('22222222-0015-4222-a222-222222222222', v_cid_b, v_pid_b, CURRENT_DATE, '10:00', 'agendado') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.prontuarios (id, clinica_id, paciente_id, descricao) VALUES (v_pront_b, v_cid_b, v_pid_b, 'Prontuario Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.evolucao (id, clinica_id, paciente_id, descricao) VALUES ('22222222-0016-4222-a222-222222222222', v_cid_b, v_pid_b, 'Evolucao Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.atestados (id, clinica_id, paciente_id, data_inicio) VALUES ('22222222-0017-4222-a222-222222222222', v_cid_b, v_pid_b, CURRENT_DATE) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.receitas (id, clinica_id, paciente_id) VALUES (v_rec_b, v_cid_b, v_pid_b) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.receita_itens (id, clinica_id, receita_id, medicamento) VALUES ('22222222-0018-4222-a222-222222222222', v_cid_b, v_rec_b, 'Medicamento Beta') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.termos_privacidade (id, clinica_id, tipo, versao, texto_hash) VALUES (v_termo_b, v_cid_b, 'LGPD', 'v1.0', 'hash_beta_123') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.paciente_consentimentos (id, clinica_id, paciente_id, termo_id) VALUES (v_cons_b, v_cid_b, v_pid_b, v_termo_b) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.consentimento_evidencias (id, clinica_id, paciente_consentimento_id, tipo) VALUES ('22222222-0019-4222-a222-222222222222', v_cid_b, v_cons_b, 'assinatura') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.consentimento_finalidades (id, clinica_id, paciente_consentimento_id, finalidade) VALUES ('22222222-0020-4222-a222-222222222222', v_cid_b, v_cons_b, 'tratamento') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.odontograma_registros (id, clinica_id, paciente_id, tipo, status_map) VALUES ('22222222-0021-4222-a222-222222222222', v_cid_b, v_pid_b, 'permanente', '{"18": "higido"}'::jsonb) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.procedimentos_realizados (id, clinica_id, paciente_id, procedimento_id) VALUES ('22222222-0022-4222-a222-222222222222', v_cid_b, v_pid_b, v_proc_b) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.comissoes (id, clinica_id, dentista_id, procedimento_id, porcentagem) VALUES ('22222222-0023-4222-a222-222222222222', v_cid_b, v_u_admin_b, v_proc_b, 10.0) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.system_logs (id, clinica_id, action, entity) VALUES ('22222222-0024-4222-a222-222222222222', v_cid_b, 'INSERT', 'pacientes') ON CONFLICT (id) DO NOTHING;

  -- 5. Dados correspondentes na Clínica Alpha para testes de leitura cruzada invertida
  INSERT INTO public.pacientes (id, clinica_id, nome) VALUES (v_pid_a, v_cid_a, 'Paciente Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.procedimentos (id, clinica_id, nome) VALUES (v_proc_a, v_cid_a, 'Procedimento Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.clinica_settings (id, clinica_id, nome) VALUES ('11111111-0007-4111-a111-111111111111', v_cid_a, 'Config Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.alertas (id, clinica_id, mensagem) VALUES ('11111111-0008-4111-a111-111111111111', v_cid_a, 'Alerta Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.fornecedores (id, clinica_id, nome) VALUES ('11111111-0009-4111-a111-111111111111', v_cid_a, 'Fornecedor Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.estoque (id, clinica_id, nome) VALUES ('11111111-0010-4111-a111-111111111111', v_cid_a, 'Item Estoque Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.despesas (id, clinica_id, descricao, valor, data_vencimento) VALUES ('11111111-0011-4111-a111-111111111111', v_cid_a, 'Despesa Alpha', 100, CURRENT_DATE) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.compras (id, clinica_id, descricao, valor_total) VALUES ('11111111-0012-4111-a111-111111111111', v_cid_a, 'Compra Alpha', 200) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.cobrancas (id, clinica_id, valor, paciente_id) VALUES ('11111111-0013-4111-a111-111111111111', v_cid_a, 150, v_pid_a) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.notas_fiscais (id, clinica_id, numero_nota, valor) VALUES ('11111111-0014-4111-a111-111111111111', v_cid_a, 'NF-ALPHA-001', 500) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.agendamentos (id, clinica_id, paciente_id, data_consulta, hora_consulta, status) VALUES ('11111111-0015-4111-a111-111111111111', v_cid_a, v_pid_a, CURRENT_DATE, '10:00', 'agendado') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.prontuarios (id, clinica_id, paciente_id, descricao) VALUES (v_pront_a, v_cid_a, v_pid_a, 'Prontuario Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.evolucao (id, clinica_id, paciente_id, descricao) VALUES ('11111111-0016-4111-a111-111111111111', v_cid_a, v_pid_a, 'Evolucao Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.atestados (id, clinica_id, paciente_id, data_inicio) VALUES ('11111111-0017-4111-a111-111111111111', v_cid_a, v_pid_a, CURRENT_DATE) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.receitas (id, clinica_id, paciente_id) VALUES (v_rec_a, v_cid_a, v_pid_a) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.receita_itens (id, clinica_id, receita_id, medicamento) VALUES ('11111111-0018-4111-a111-111111111111', v_cid_a, v_rec_a, 'Medicamento Alpha') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.termos_privacidade (id, clinica_id, tipo, versao, texto_hash) VALUES (v_termo_a, v_cid_a, 'LGPD', 'v1.0', 'hash_alpha_123') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.paciente_consentimentos (id, clinica_id, paciente_id, termo_id) VALUES (v_cons_a, v_cid_a, v_pid_a, v_termo_a) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.consentimento_evidencias (id, clinica_id, paciente_consentimento_id, tipo) VALUES ('11111111-0019-4111-a111-111111111111', v_cid_a, v_cons_a, 'assinatura') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.consentimento_finalidades (id, clinica_id, paciente_consentimento_id, finalidade) VALUES ('11111111-0020-4111-a111-111111111111', v_cid_a, v_cons_a, 'tratamento') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.odontograma_registros (id, clinica_id, paciente_id, tipo, status_map) VALUES ('11111111-0021-4111-a111-111111111111', v_cid_a, v_pid_a, 'permanente', '{"18": "higido"}'::jsonb) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.procedimentos_realizados (id, clinica_id, paciente_id, procedimento_id) VALUES ('11111111-0022-4111-a111-111111111111', v_cid_a, v_pid_a, v_proc_a) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.comissoes (id, clinica_id, dentista_id, procedimento_id, porcentagem) VALUES ('11111111-0023-4111-a111-111111111111', v_cid_a, v_u_admin_a, v_proc_a, 10.0) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.system_logs (id, clinica_id, action, entity) VALUES ('11111111-0024-4111-a111-111111111111', v_cid_a, 'INSERT', 'pacientes') ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('role', 'postgres', true);
END $$;
SELECT 'TEST_OK' as status;
`
runTest('Setup das 2 clínicas, 6 usuários e 26 tabelas com clinica_id', setupSql)

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO GERADORA DE TESTE DE ISOLAMENTO POR USUÁRIO E ALVO
// ─────────────────────────────────────────────────────────────────────────────
function makeIsolationTest(userName, userUid, targetClinicId, otherUserUid) {
  return `
DO $$
DECLARE
  v_cnt INTEGER;
  v_row_cnt INTEGER;
  v_err_caught BOOLEAN;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', '${userUid}'), true);

  -- 1. Leitura cruzada em clinicas: 0
  SELECT count(*) INTO v_cnt FROM public.clinicas WHERE id = '${targetClinicId}';
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: ${userName} conseguiu ler Clinica externa!'; END IF;

  -- 2. Leitura cruzada em user_profiles: 0
  SELECT count(*) INTO v_cnt FROM public.user_profiles WHERE clinica_id = '${targetClinicId}';
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: ${userName} conseguiu ler user_profiles da outra clinica!'; END IF;

  -- 3. Leitura cruzada em todas as 24 tabelas com clinica_id: 0
  SELECT count(*) INTO v_cnt FROM public.pacientes WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: pacientes'; END IF;
  SELECT count(*) INTO v_cnt FROM public.procedimentos WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: procedimentos'; END IF;
  SELECT count(*) INTO v_cnt FROM public.clinica_settings WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: clinica_settings'; END IF;
  SELECT count(*) INTO v_cnt FROM public.alertas WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: alertas'; END IF;
  SELECT count(*) INTO v_cnt FROM public.fornecedores WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: fornecedores'; END IF;
  SELECT count(*) INTO v_cnt FROM public.estoque WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: estoque'; END IF;
  SELECT count(*) INTO v_cnt FROM public.despesas WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: despesas'; END IF;
  SELECT count(*) INTO v_cnt FROM public.compras WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: compras'; END IF;
  SELECT count(*) INTO v_cnt FROM public.cobrancas WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: cobrancas'; END IF;
  SELECT count(*) INTO v_cnt FROM public.notas_fiscais WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: notas_fiscais'; END IF;
  SELECT count(*) INTO v_cnt FROM public.agendamentos WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: agendamentos'; END IF;
  SELECT count(*) INTO v_cnt FROM public.prontuarios WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: prontuarios'; END IF;
  SELECT count(*) INTO v_cnt FROM public.evolucao WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: evolucao'; END IF;
  SELECT count(*) INTO v_cnt FROM public.atestados WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: atestados'; END IF;
  SELECT count(*) INTO v_cnt FROM public.receitas WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: receitas'; END IF;
  SELECT count(*) INTO v_cnt FROM public.receita_itens WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: receita_itens'; END IF;
  SELECT count(*) INTO v_cnt FROM public.termos_privacidade WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: termos_privacidade'; END IF;
  SELECT count(*) INTO v_cnt FROM public.paciente_consentimentos WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: paciente_consentimentos'; END IF;
  SELECT count(*) INTO v_cnt FROM public.consentimento_evidencias WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: consentimento_evidencias'; END IF;
  SELECT count(*) INTO v_cnt FROM public.consentimento_finalidades WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: consentimento_finalidades'; END IF;
  SELECT count(*) INTO v_cnt FROM public.odontograma_registros WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: odontograma_registros'; END IF;
  SELECT count(*) INTO v_cnt FROM public.procedimentos_realizados WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: procedimentos_realizados'; END IF;
  SELECT count(*) INTO v_cnt FROM public.comissoes WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: comissoes'; END IF;
  SELECT count(*) INTO v_cnt FROM public.system_logs WHERE clinica_id = '${targetClinicId}'; IF v_cnt <> 0 THEN RAISE EXCEPTION 'RLS LEAK: system_logs'; END IF;

  -- 4. Escrita cruzada: UPDATE em registros da outra clínica afeta 0 linhas
  UPDATE public.pacientes SET nome = 'Hacked' WHERE clinica_id = '${targetClinicId}';
  GET DIAGNOSTICS v_row_cnt = ROW_COUNT;
  IF v_row_cnt > 0 THEN RAISE EXCEPTION 'RLS WRITE LEAK: UPDATE afetou % linhas!', v_row_cnt; END IF;

  UPDATE public.clinicas SET nome = 'Hacked Clinic' WHERE id = '${targetClinicId}';
  GET DIAGNOSTICS v_row_cnt = ROW_COUNT;
  IF v_row_cnt > 0 THEN RAISE EXCEPTION 'RLS WRITE LEAK: UPDATE em clinicas afetou % linhas!', v_row_cnt; END IF;

  UPDATE public.user_profiles SET nome = 'Hacked Profile' WHERE id = '${otherUserUid}';
  GET DIAGNOSTICS v_row_cnt = ROW_COUNT;
  IF v_row_cnt > 0 THEN RAISE EXCEPTION 'RLS WRITE LEAK: UPDATE em user_profiles de outra clinica afetou % linhas!', v_row_cnt; END IF;

  -- 5. Escrita cruzada: DELETE em registros da outra clínica afeta 0 linhas
  DELETE FROM public.pacientes WHERE clinica_id = '${targetClinicId}';
  GET DIAGNOSTICS v_row_cnt = ROW_COUNT;
  IF v_row_cnt > 0 THEN RAISE EXCEPTION 'RLS WRITE LEAK: DELETE afetou % linhas!', v_row_cnt; END IF;

  DELETE FROM public.clinicas WHERE id = '${targetClinicId}';
  GET DIAGNOSTICS v_row_cnt = ROW_COUNT;
  IF v_row_cnt > 0 THEN RAISE EXCEPTION 'RLS WRITE LEAK: DELETE em clinicas afetou % linhas!', v_row_cnt; END IF;

  DELETE FROM public.user_profiles WHERE id = '${otherUserUid}';
  GET DIAGNOSTICS v_row_cnt = ROW_COUNT;
  IF v_row_cnt > 0 THEN RAISE EXCEPTION 'RLS WRITE LEAK: DELETE em user_profiles de outra clinica afetou % linhas!', v_row_cnt; END IF;

  -- 6. Escrita cruzada: INSERT com clinica_id da outra clínica é rejeitado com violação de RLS
  v_err_caught := false;
  BEGIN
    INSERT INTO public.pacientes (id, clinica_id, nome) VALUES (gen_random_uuid(), '${targetClinicId}', 'Invasao RLS');
  EXCEPTION WHEN insufficient_privilege THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN RAISE EXCEPTION 'RLS WRITE LEAK: INSERT com clinica_id externo foi aceito!'; END IF;

  PERFORM set_config('role', 'postgres', true);
END $$;
SELECT 'TEST_OK' as status;
`
}

// Executar isolamento cruzado para os 6 usuários
const uAdminA = '11111111-aaaa-4111-a111-111111111111'
const uDentistaA = '11111111-dddd-4111-a111-111111111111'
const uRecepcaoA = '11111111-cccc-4111-a111-111111111111'
const cidA = '11111111-1111-4111-a111-111111111111'

const uAdminB = '22222222-aaaa-4222-a222-222222222222'
const uDentistaB = '22222222-dddd-4222-a222-222222222222'
const uRecepcaoB = '22222222-cccc-4222-a222-222222222222'
const cidB = '22222222-2222-4222-a222-222222222222'

runTest('Isolamento de Leitura e Escrita: Alpha admin_clinica -> Clínica Beta', makeIsolationTest('Alpha Admin', uAdminA, cidB, uAdminB))
runTest('Isolamento de Leitura e Escrita: Alpha dentista -> Clínica Beta', makeIsolationTest('Alpha Dentista', uDentistaA, cidB, uDentistaB))
runTest('Isolamento de Leitura e Escrita: Alpha recepcao -> Clínica Beta', makeIsolationTest('Alpha Recepcao', uRecepcaoA, cidB, uRecepcaoB))

runTest('Isolamento de Leitura e Escrita: Beta admin_clinica -> Clínica Alpha', makeIsolationTest('Beta Admin', uAdminB, cidA, uAdminA))
runTest('Isolamento de Leitura e Escrita: Beta dentista -> Clínica Alpha', makeIsolationTest('Beta Dentista', uDentistaB, cidA, uDentistaA))
runTest('Isolamento de Leitura e Escrita: Beta recepcao -> Clínica Alpha', makeIsolationTest('Beta Recepcao', uRecepcaoB, cidA, uRecepcaoA))

// ─────────────────────────────────────────────────────────────────────────────
// PROVA: INSERT E LEITURA NA PRÓPRIA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────
const testOwnClinicSql = `
DO $$
DECLARE
  v_cnt INTEGER;
  v_test_pid_a UUID := gen_random_uuid();
  v_test_pid_b UUID := gen_random_uuid();
BEGIN
  -- 1. Admin Alpha insere paciente na própria clínica
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-aaaa-4111-a111-111111111111", "role": "authenticated"}', true);

  INSERT INTO public.pacientes (id, clinica_id, nome)
  VALUES (v_test_pid_a, '11111111-1111-4111-a111-111111111111', 'Paciente Alpha Valido');

  SELECT count(*) INTO v_cnt FROM public.pacientes WHERE id = v_test_pid_a;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'Admin Alpha nao conseguiu ler paciente inserido na propria clinica'; END IF;

  -- 2. Dentista Alpha pode ler o paciente inserido na sua clínica
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-dddd-4111-a111-111111111111", "role": "authenticated"}', true);
  SELECT count(*) INTO v_cnt FROM public.pacientes WHERE id = v_test_pid_a;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'Dentista Alpha nao conseguiu ler paciente da propria clinica'; END IF;

  -- 3. Recepcao Alpha pode ler o paciente inserido na sua clínica
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-cccc-4111-a111-111111111111", "role": "authenticated"}', true);
  SELECT count(*) INTO v_cnt FROM public.pacientes WHERE id = v_test_pid_a;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'Recepcao Alpha nao conseguiu ler paciente da propria clinica'; END IF;

  -- 4. Admin Beta insere paciente na própria clínica
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-aaaa-4222-a222-222222222222", "role": "authenticated"}', true);
  INSERT INTO public.pacientes (id, clinica_id, nome)
  VALUES (v_test_pid_b, '22222222-2222-4222-a222-222222222222', 'Paciente Beta Valido');

  SELECT count(*) INTO v_cnt FROM public.pacientes WHERE id = v_test_pid_b;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'Admin Beta nao conseguiu ler paciente inserido na propria clinica'; END IF;

  PERFORM set_config('role', 'postgres', true);
END $$;
SELECT 'TEST_OK' as status;
`
runTest('Insert e Leitura legítima de registros na própria clínica (Admin, Dentista, Recepção)', testOwnClinicSql)

// ─────────────────────────────────────────────────────────────────────────────
// PROVA: NÃO APAGAR O PRÓPRIO PERFIL (BLOQUEIO ESTREITO NOS 6 USUÁRIOS)
// ─────────────────────────────────────────────────────────────────────────────
const testNoSelfDeleteSql = `
DO $$
DECLARE
  v_users UUID[] := ARRAY[
    '11111111-aaaa-4111-a111-111111111111'::UUID,
    '11111111-dddd-4111-a111-111111111111'::UUID,
    '11111111-cccc-4111-a111-111111111111'::UUID,
    '22222222-aaaa-4222-a222-222222222222'::UUID,
    '22222222-dddd-4222-a222-222222222222'::UUID,
    '22222222-cccc-4222-a222-222222222222'::UUID
  ];
  v_uid UUID;
  v_row_cnt INTEGER;
  v_cnt INTEGER;
BEGIN
  FOREACH v_uid IN ARRAY v_users
  LOOP
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_uid), true);

    -- Tentativa de auto-exclusão do perfil
    DELETE FROM public.user_profiles WHERE id = v_uid;
    GET DIAGNOSTICS v_row_cnt = ROW_COUNT;
    IF v_row_cnt > 0 THEN
      RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Usuario % conseguiu apagar o próprio perfil!', v_uid;
    END IF;

    -- Confere que o perfil continua intacto no banco
    PERFORM set_config('role', 'postgres', true);
    SELECT count(*) INTO v_cnt FROM public.user_profiles WHERE id = v_uid;
    IF v_cnt <> 1 THEN
      RAISE EXCEPTION 'Perfil % desapareceu do banco!', v_uid;
    END IF;
  END LOOP;
END $$;
SELECT 'TEST_OK' as status;
`
runTest('Imutabilidade: Proibição estrita de auto-deleção do próprio perfil (6/6 usuários)', testNoSelfDeleteSql)

// ─────────────────────────────────────────────────────────────────────────────
// PROVA: NÃO RECRIAR NEM ELEVAR PERFIL COMO SUPER_ADMIN
// ─────────────────────────────────────────────────────────────────────────────
const testNoSuperAdminCreationSql = `
DO $$
DECLARE
  v_users UUID[] := ARRAY[
    '11111111-aaaa-4111-a111-111111111111'::UUID,
    '11111111-dddd-4111-a111-111111111111'::UUID,
    '11111111-cccc-4111-a111-111111111111'::UUID,
    '22222222-aaaa-4222-a222-222222222222'::UUID,
    '22222222-dddd-4222-a222-222222222222'::UUID,
    '22222222-cccc-4222-a222-222222222222'::UUID
  ];
  v_uid UUID;
  v_err_caught BOOLEAN;
BEGIN
  FOREACH v_uid IN ARRAY v_users
  LOOP
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', format('{"sub": "%s", "role": "authenticated"}', v_uid), true);

    -- 1. Tentativa de INSERT com role = super_admin
    v_err_caught := false;
    BEGIN
      INSERT INTO public.user_profiles (id, clinica_id, role, nome)
      VALUES (gen_random_uuid(), NULL, 'super_admin', 'Fake SuperAdmin');
    EXCEPTION WHEN insufficient_privilege THEN
      v_err_caught := true;
    END;
    IF NOT v_err_caught THEN
      RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Usuario % conseguiu inserir perfil super_admin!', v_uid;
    END IF;

    -- 2. Tentativa de UPDATE do próprio perfil para role = super_admin
    v_err_caught := false;
    BEGIN
      UPDATE public.user_profiles SET role = 'super_admin' WHERE id = v_uid;
    EXCEPTION WHEN insufficient_privilege THEN
      v_err_caught := true;
    END;
    IF NOT v_err_caught THEN
      RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Usuario % conseguiu auto-promover para super_admin!', v_uid;
    END IF;
  END LOOP;

  PERFORM set_config('role', 'postgres', true);
END $$;
SELECT 'TEST_OK' as status;
`
runTest('Bloqueio estrito de criação e elevação para super_admin (6/6 usuários)', testNoSuperAdminCreationSql)

console.log(`\n======================================================================`)
console.log(`TOTAL DE TESTES DE ISOLAMENTO: ${passed} PASSARAM, ${failed} FALHARAM`)
console.log(`======================================================================`)

if (failed > 0) process.exit(1)
