-- ==============================================================================
-- OdontoSoft: Seed Data de Demonstração e Portfólio (Multi-tenant & LGPD)
-- ==============================================================================

-- 1. Chave de criptografia de teste local para CPF (LGPD Art. 46)
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO private.secrets (key, value)
VALUES ('cpf_key', 'chave-secreta-local-odonto-2026')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Garantir Clínica de Demonstração
INSERT INTO public.clinicas (id, nome, plano, ativo, criado_em, atualizado_em)
VALUES (
    '78733a3f-708c-4f08-8af3-94d0929707e4',
    'Dentalmedic Clínica Odontológica',
    'enterprise',
    true,
    now() - interval '60 days',
    now()
)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 2.1 Dentista Responsável na Clínica
INSERT INTO auth.users (id, email)
VALUES ('b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'dr.lucas@dentalmedic.com.br')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, clinica_id, nome, email, role)
VALUES (
    'b9bb2f98-cf81-4a80-8404-fe318edbf5d1',
    '78733a3f-708c-4f08-8af3-94d0929707e4',
    'Dr. Lucas Dentalmedic',
    'dr.lucas@dentalmedic.com.br',
    'dentista'
)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 3. Catálogo de Procedimentos
INSERT INTO public.procedimentos (id, clinica_id, nome, valor_padrao)
VALUES
    ('1852ace1-8c91-4ae5-b6ae-e2ddf3603367', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Limpeza (Profilaxia)', 180.00),
    ('c1edbeeb-9b57-4a8e-9714-b4b5ae7e39cb', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Restauração em Resina Composta', 280.00),
    ('cfa9f441-6e3c-4073-9445-46288c271f2b', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Clareamento Dental a Laser', 950.00),
    ('d7d94b4f-758f-489e-b16b-3025e5bdba93', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Extração de Terceiro Molar (Siso)', 450.00),
    ('f1a2b3c4-d5e6-4789-a1b2-c3d4e5f60001', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Tratamento de Canal (Endodontia)', 850.00),
    ('f1a2b3c4-d5e6-4789-a1b2-c3d4e5f60002', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Instalação de Coroa Cerâmica', 1400.00)
ON CONFLICT (id) DO NOTHING;

-- 4. Pacientes Fictícios (com hash determinístico de CPF para busca e conformidade LGPD)
INSERT INTO public.pacientes (id, clinica_id, nome, cpf_hash, telefone, email, data_nascimento, genero, convenio, cidade, bairro, rua, numero, cep, whatsapp, lgpd_aceite, lgpd_aceite_em, created_at)
VALUES
    ('a0000000-0000-0000-0000-000000000001', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Mariana Souza Ramos', encode(extensions.digest('38492185014', 'sha256'), 'hex'), '(11) 98452-1920', 'mariana.ramos@exemplo.com.br', '1992-04-15', 'feminino', 'Amil Dental', 'São Paulo', 'Moema', 'Av. Ibirapuera', '1420', '04028-000', true, true, now(), now() - interval '20 days'),
    ('a0000000-0000-0000-0000-000000000002', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Carlos Eduardo Peixoto', encode(extensions.digest('21948273088', 'sha256'), 'hex'), '(11) 97120-4491', 'carlos.peixoto@exemplo.com.br', '1985-09-22', 'masculino', 'Unimed Odonto', 'São Paulo', 'Pinheiros', 'Rua Fradique Coutinho', '580', '05416-000', true, true, now(), now() - interval '18 days'),
    ('a0000000-0000-0000-0000-000000000003', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Beatriz Helena Castro', encode(extensions.digest('40219384075', 'sha256'), 'hex'), '(11) 99311-8842', 'beatriz.castro@exemplo.com.br', '1998-12-03', 'feminino', 'Particular', 'São Paulo', 'Vila Mariana', 'Rua Domingos de Morais', '890', '04010-100', true, true, now(), now() - interval '15 days'),
    ('a0000000-0000-0000-0000-000000000004', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Lucas Gabriel Nogueira', encode(extensions.digest('15849023162', 'sha256'), 'hex'), '(11) 98723-5501', 'lucas.nogueira@exemplo.com.br', '2001-07-19', 'masculino', 'Bradesco Dental', 'São Paulo', 'Jardins', 'Alameda Santos', '1200', '01418-100', true, true, now(), now() - interval '10 days'),
    ('a0000000-0000-0000-0000-000000000005', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Fernanda Lima Guimarães', encode(extensions.digest('52918249033', 'sha256'), 'hex'), '(11) 99182-3349', 'fernanda.lima@exemplo.com.br', '1979-03-30', 'feminino', 'SulAmérica Odonto', 'São Paulo', 'Perdizes', 'Rua Cardoso de Almeida', '340', '05013-000', true, true, now(), now() - interval '8 days'),
    ('a0000000-0000-0000-0000-000000000006', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Rafael Albuquerque Costa', encode(extensions.digest('61493827190', 'sha256'), 'hex'), '(11) 98234-1182', 'rafael.costa@exemplo.com.br', '1990-11-12', 'masculino', 'Particular', 'São Paulo', 'Itaim Bibi', 'Rua Joaquim Floriano', '412', '04534-002', true, true, now(), now() - interval '5 days'),
    ('a0000000-0000-0000-0000-000000000007', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Juliana Mendes Ribeiro', encode(extensions.digest('73184910244', 'sha256'), 'hex'), '(11) 97412-9090', 'juliana.ribeiro@exemplo.com.br', '1995-06-25', 'feminino', 'MetLife Dental', 'São Paulo', 'Santana', 'Av. Braz Leme', '1780', '02022-010', true, true, now(), now() - interval '3 days'),
    ('a0000000-0000-0000-0000-000000000008', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Thiago Barros Silveira', encode(extensions.digest('84219034255', 'sha256'), 'hex'), '(11) 99882-7711', 'thiago.silveira@exemplo.com.br', '1988-01-18', 'masculino', 'Porto Seguro Odonto', 'São Paulo', 'Tatuapé', 'Rua Serra de Bragança', '615', '03318-000', true, true, now(), now() - interval '1 days')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 5. Consultas e Agendamentos (Hoje, Futuros e Passados)
INSERT INTO public.agendamentos (id, clinica_id, paciente_id, dentista_id, data_consulta, hora_consulta, hora_fim, procedimento, status, observacoes)
VALUES
    ('b0000000-0000-0000-0000-000000000001', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000001', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE, '08:30:00', '09:15:00', 'Limpeza (Profilaxia)', 'concluido', 'Procedimento concluído pontualmente.'),
    ('b0000000-0000-0000-0000-000000000002', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000002', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE, '10:00:00', '11:00:00', 'Restauração em Resina Composta', 'confirmado', 'Presença confirmada pelo paciente via WhatsApp.'),
    ('b0000000-0000-0000-0000-000000000003', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000003', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE, '14:00:00', '15:30:00', 'Tratamento de Canal (Endodontia)', 'pendente', 'Lembrete enviado.'),
    ('b0000000-0000-0000-0000-000000000004', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000004', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE, '16:00:00', '16:45:00', 'Avaliação e Odontograma Digital', 'confirmado', 'Primeira consulta de diagnóstico.'),
    ('b0000000-0000-0000-0000-000000000005', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000005', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE + 1, '09:00:00', '10:00:00', 'Clareamento Dental a Laser', 'confirmado', 'Segunda sessão de clareamento.'),
    ('b0000000-0000-0000-0000-000000000006', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000006', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE + 2, '11:15:00', '12:00:00', 'Extração de Terceiro Molar (Siso)', 'agendado', 'Siso inferior esquerdo.'),
    ('b0000000-0000-0000-0000-000000000007', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000007', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE - 1, '14:00:00', '14:45:00', 'Check-up Preventivo', 'concluido', 'Realizada profilaxia preventiva.'),
    ('b0000000-0000-0000-0000-000000000008', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000008', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', CURRENT_DATE - 3, '16:00:00', '16:30:00', 'Consulta Emergencial', 'cancelado', 'Desmarcado pelo paciente.')
ON CONFLICT (id) DO NOTHING;

-- 6. Prontuários & Evoluções Clínicas (Res. CFO 198/2019 — Imutáveis)
INSERT INTO public.prontuarios (id, clinica_id, paciente_id, dentista_id, descricao, tratamento, status, finalizado, finalizado_em, tipo_registro, data_registro)
VALUES
    ('c0000000-0000-0000-0000-000000000001', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000001', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Exame clínico e odontograma digital. Arcadas íntegras, ausência de bolsas periodontais ativas. Profilaxia com ultrassom e flúor gel neutro.', 'Profilaxia Completa e Aplicação Tópica de Flúor', 'registrada', true, now() - interval '5 days', 'registro_clinico', now() - interval '5 days'),
    ('c0000000-0000-0000-0000-000000000002', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000002', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Lesão cariosa oclusal no dente 16. Isolamento absoluto, remoção de tecido cariado, condicionamento ácido e adesivo Single Bond Universal. Restauração resina Filtek Z350 XT cor A2. Ajuste oclusal verificado.', 'Restauração de Resina Composta Classe I no elemento 16', 'registrada', true, now() - interval '3 days', 'registro_clinico', now() - interval '3 days'),
    ('c0000000-0000-0000-0000-000000000003', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000003', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Pulpite irreversível sintomática no dente 21. Odontometria eletrônica 21mm, instrumentação rotatória reciprocante WaveOne Gold, irrigação com NaOCl 2.5%, obturação com cimento biocerâmico Sealer Plus.', 'Tratamento Endodôntico no dente 21', 'registrada', true, now() - interval '2 days', 'registro_clinico', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- 7. Receitas e Transações Financeiras (Entradas)
INSERT INTO public.receitas (id, clinica_id, paciente_id, profissional_id, descricao, valor, status, created_at)
VALUES
    ('d0000000-0000-0000-0000-000000000001', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000001', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Limpeza e Profilaxia Preventiva', 180.00, 'pago', now() - interval '1 day'),
    ('d0000000-0000-0000-0000-000000000002', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000002', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Restauração Resina Composta (Dente 16)', 280.00, 'pago', now() - interval '3 days'),
    ('d0000000-0000-0000-0000-000000000003', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000003', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Tratamento Endodôntico (Dente 21)', 850.00, 'pago', now() - interval '5 days'),
    ('d0000000-0000-0000-0000-000000000004', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000004', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Clareamento Dental a Laser', 950.00, 'pago', now() - interval '10 days'),
    ('d0000000-0000-0000-0000-000000000005', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000005', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Extração de Sisos (38 e 48)', 900.00, 'pago', now() - interval '15 days'),
    ('d0000000-0000-0000-0000-000000000006', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000006', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Coroa Cerâmica (1ª Parcela)', 1400.00, 'pendente', now() - interval '2 days'),
    ('d0000000-0000-0000-0000-000000000007', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000007', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Cirurgia Parendodôntica', 1200.00, 'pago', now() - interval '35 days'),
    ('d0000000-0000-0000-0000-000000000008', '78733a3f-708c-4f08-8af3-94d0929707e4', 'a0000000-0000-0000-0000-000000000008', 'b9bb2f98-cf81-4a80-8404-fe318edbf5d1', 'Implante Dentário', 2800.00, 'pago', now() - interval '65 days')
ON CONFLICT (id) DO NOTHING;

-- 8. Despesas Operacionais (Saídas)
INSERT INTO public.despesas (id, clinica_id, descricao, valor, categoria, data_vencimento, data_pagamento, created_at)
VALUES
    ('e0000000-0000-0000-0000-000000000001', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Dental Cremer — Resinas e Anestésicos', 680.00, 'Insumos Odontológicos', CURRENT_DATE - 4, CURRENT_DATE - 4, now() - interval '4 days'),
    ('e0000000-0000-0000-0000-000000000002', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Laboratório de Prótese Dental', 520.00, 'Laboratório', CURRENT_DATE - 8, CURRENT_DATE - 8, now() - interval '8 days'),
    ('e0000000-0000-0000-0000-000000000003', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Aluguel do Consultório e Condomínio', 2400.00, 'Custos Fixos', CURRENT_DATE - 10, CURRENT_DATE - 10, now() - interval '10 days'),
    ('e0000000-0000-0000-0000-000000000004', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Energia Elétrica Comercial', 380.00, 'Custos Fixos', CURRENT_DATE - 14, CURRENT_DATE - 14, now() - interval '14 days'),
    ('e0000000-0000-0000-0000-000000000005', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Manutenção Autoclave e Compressor', 310.00, 'Manutenção', CURRENT_DATE - 18, CURRENT_DATE - 18, now() - interval '18 days'),
    ('e0000000-0000-0000-0000-000000000006', '78733a3f-708c-4f08-8af3-94d0929707e4', 'Licença Software OdontoSoft SaaS', 197.00, 'Software & Tecnologia', CURRENT_DATE - 22, CURRENT_DATE - 22, now() - interval '22 days')
ON CONFLICT (id) DO NOTHING;
