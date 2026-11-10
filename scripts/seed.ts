/**
 * scripts/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Script executável para popular a base de dados do OdontoSoft com dados
 * fictícios coerentes e realistas para ambiente de demonstração e portfólio.
 *
 * Execução: npx tsx scripts/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('[Segurança] ERRO: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no ambiente.')
  console.error('[Segurança] Configure as variáveis de ambiente antes de executar o script.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Função utilitária para hash SHA-256 do CPF (padrão LGPD do OdontoSoft)
function computeCpfHash(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  return crypto.createHash('sha256').update(digits).digest('hex')
}

// Datas relativas dinâmicas baseadas na data atual de execução
const now = new Date()

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d)
  res.setDate(res.getDate() + days)
  return res
}

function subDays(d: Date, days: number): Date {
  return addDays(d, -days)
}

function subMonths(d: Date, months: number): Date {
  const res = new Date(d)
  res.setMonth(res.getMonth() - months)
  return res
}

async function runSeed() {
  console.log('🚀 Iniciando povoamento de dados de demonstração no OdontoSoft...')

  // 1. Obter clínica de demonstração existente
  const { data: clinicas, error: clinicasErr } = await supabase
    .from('clinicas')
    .select('id, nome')
    .order('criado_em', { ascending: true })

  if (clinicasErr || !clinicas || clinicas.length === 0) {
    console.error('❌ Nenhuma clínica encontrada:', clinicasErr?.message)
    process.exit(1)
  }

  // Prioriza Dentalmedic ou a primeira disponível
  const targetClinica =
    clinicas.find((c) => c.id === '78733a3f-708c-4f08-8af3-94d0929707e4') || clinicas[0]
  const clinicaId = targetClinica.id
  console.log(`🏥 Usando Clínica: "${targetClinica.nome}" (ID: ${clinicaId})`)

  // 2. Obter dentista/usuário para associar os atendimentos
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, nome, role')
    .eq('clinica_id', clinicaId)

  const dentistaProfile =
    profiles?.find((p) => p.role === 'dentista') ||
    profiles?.find((p) => p.role === 'admin') ||
    profiles?.[0]

  const dentistaId = dentistaProfile?.id || null
  console.log(`👨‍⚕️ Associando ao profissional: "${dentistaProfile?.nome || 'Dr. OdontoSoft'}" (ID: ${dentistaId})`)

  // 3. Catálogo de Procedimentos (garantir que existem)
  const baseProcedimentos = [
    { nome: 'Limpeza (Profilaxia)', valor_base: 180, clinica_id: clinicaId },
    { nome: 'Restauração em Resina Composta', valor_base: 280, clinica_id: clinicaId },
    { nome: 'Tratamento de Canal (Endodontia)', valor_base: 850, clinica_id: clinicaId },
    { nome: 'Clareamento Dental a Laser', valor_base: 950, clinica_id: clinicaId },
    { nome: 'Extração de Terceiro Molar (Siso)', valor_base: 450, clinica_id: clinicaId },
    { nome: 'Instalação de Coroa Cerâmica', valor_base: 1400, clinica_id: clinicaId },
  ]

  for (const proc of baseProcedimentos) {
    const { data: existing } = await supabase
      .from('procedimentos')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('nome', proc.nome)
      .maybeSingle()

    if (!existing) {
      await supabase.from('procedimentos').insert([proc])
    }
  }

  const { data: procedimentosDb } = await supabase
    .from('procedimentos')
    .select('id, nome, valor_base')
    .eq('clinica_id', clinicaId)

  console.log(`🦷 Procedimentos catalogados: ${procedimentosDb?.length || 0}`)

  // 4. Pacientes Fictícios Realistas
  const pacientesSeed = [
    {
      nome: 'Mariana Souza Ramos',
      cpf: '384.921.850-14',
      telefone: '(11) 98452-1920',
      email: 'mariana.ramos@exemplo.com.br',
      data_nascimento: '1992-04-15',
      genero: 'feminino',
      convenio: 'Amil Dental',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Moema',
      rua: 'Av. Ibirapuera',
      numero: '1420',
      cep: '04028-000',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Paciente com sensibilidade em dentes molares. Prefere atendimentos no período da manhã.',
    },
    {
      nome: 'Carlos Eduardo Peixoto',
      cpf: '219.482.730-88',
      telefone: '(11) 97120-4491',
      email: 'carlos.peixoto@exemplo.com.br',
      data_nascimento: '1985-09-22',
      genero: 'masculino',
      convenio: 'Unimed Odonto',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Pinheiros',
      rua: 'Rua Fradique Coutinho',
      numero: '580',
      cep: '05416-000',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Hipertenso controlado. Alergia relatada a dipirona sódica.',
    },
    {
      nome: 'Beatriz Helena Castro',
      cpf: '402.193.840-75',
      telefone: '(11) 99311-8842',
      email: 'beatriz.castro@exemplo.com.br',
      data_nascimento: '1998-12-03',
      genero: 'feminino',
      convenio: 'Particular',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Vila Mariana',
      rua: 'Rua Domingos de Morais',
      numero: '890',
      cep: '04010-100',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Em fase de clareamento estético. Próxima etapa: moldeira noturna.',
    },
    {
      nome: 'Lucas Gabriel Nogueira',
      cpf: '158.490.231-62',
      telefone: '(11) 98723-5501',
      email: 'lucas.nogueira@exemplo.com.br',
      data_nascimento: '2001-07-19',
      genero: 'masculino',
      convenio: 'Bradesco Dental',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Jardins',
      rua: 'Alameda Santos',
      numero: '1200',
      cep: '01418-100',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Tratamento ortodôntico em andamento. Manutenção mensal.',
    },
    {
      nome: 'Fernanda Lima Guimarães',
      cpf: '529.182.490-33',
      telefone: '(11) 99182-3349',
      email: 'fernanda.lima@exemplo.com.br',
      data_nascimento: '1979-03-30',
      genero: 'feminino',
      convenio: 'SulAmérica Odonto',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Perdizes',
      rua: 'Rua Cardoso de Almeida',
      numero: '340',
      cep: '05013-000',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Restauração nos dentes 16 e 26. Higienização exemplar.',
    },
    {
      nome: 'Rafael Albuquerque Costa',
      cpf: '614.938.271-90',
      telefone: '(11) 98234-1182',
      email: 'rafael.costa@exemplo.com.br',
      data_nascimento: '1990-11-12',
      genero: 'masculino',
      convenio: 'Particular',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Itaim Bibi',
      rua: 'Rua Joaquim Floriano',
      numero: '412',
      cep: '04534-002',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Indicação de extração profilática dos terceiros molares 38 e 48.',
    },
    {
      nome: 'Juliana Mendes Ribeiro',
      cpf: '731.849.102-44',
      telefone: '(11) 97412-9090',
      email: 'juliana.ribeiro@exemplo.com.br',
      data_nascimento: '1995-06-25',
      genero: 'feminino',
      convenio: 'MetLife Dental',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Santana',
      rua: 'Av. Braz Leme',
      numero: '1780',
      cep: '02022-010',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Sensibilidade gengival pós-parto. Orientação de escovação com cerdas ultra macias.',
    },
    {
      nome: 'Thiago Barros Silveira',
      cpf: '842.190.342-55',
      telefone: '(11) 99882-7711',
      email: 'thiago.silveira@exemplo.com.br',
      data_nascimento: '1988-01-18',
      genero: 'masculino',
      convenio: 'Porto Seguro Odonto',
      cidade: 'São Paulo',
      estado: 'SP',
      bairro: 'Tatuapé',
      rua: 'Rua Serra de Bragança',
      numero: '615',
      cep: '03318-000',
      whatsapp: true,
      lgpd_aceite: true,
      lgpd_aceite_em: now.toISOString(),
      observacoes: 'Bruxismo noturno moderado. Placa miorrelaxante de silicone/acrílico confeccionada.',
    },
  ]

  const insertedPacientes: { id: string; nome: string }[] = []

  for (const pac of pacientesSeed) {
    const cpfHash = computeCpfHash(pac.cpf)

    const { data: existing } = await supabase
      .from('pacientes')
      .select('id, nome')
      .eq('clinica_id', clinicaId)
      .eq('cpf_hash', cpfHash)
      .maybeSingle()

    if (existing) {
      insertedPacientes.push(existing)
    } else {
      const { data: created, error: pErr } = await supabase
        .from('pacientes')
        .insert([
          {
            clinica_id: clinicaId,
            nome: pac.nome,
            cpf_hash: cpfHash,
            telefone: pac.telefone,
            email: pac.email,
            data_nascimento: pac.data_nascimento,
            genero: pac.genero,
            convenio: pac.convenio,
            cidade: pac.cidade,
            estado: pac.estado,
            bairro: pac.bairro,
            rua: pac.rua,
            numero: pac.numero,
            cep: pac.cep,
            whatsapp: pac.whatsapp,
            lgpd_aceite: pac.lgpd_aceite,
            lgpd_aceite_em: pac.lgpd_aceite_em,
            observacoes: pac.observacoes,
            created_at: subDays(now, Math.floor(Math.random() * 20) + 1).toISOString(),
          },
        ])
        .select('id, nome')
        .single()

      if (pErr) {
        console.error(`Erro ao inserir paciente ${pac.nome}:`, pErr.message)
      } else if (created) {
        insertedPacientes.push(created)
      }
    }
  }

  console.log(`👤 Pacientes disponíveis para o seed: ${insertedPacientes.length}`)

  // 5. Agendamentos (Hoje, Futuros e Passados)
  const todayStr = formatDate(now)
  const yesterdayStr = formatDate(subDays(now, 1))
  const threeDaysAgoStr = formatDate(subDays(now, 3))
  const tomorrowStr = formatDate(addDays(now, 1))
  const inThreeDaysStr = formatDate(addDays(now, 3))
  const inFiveDaysStr = formatDate(addDays(now, 5))

  const agendamentosSeed = [
    // Consultas de HOJE (alimenta metricas de consultasHoje no dashboard)
    {
      pacienteIdx: 0,
      data_consulta: todayStr,
      hora_consulta: '08:30:00',
      hora_fim: '09:15:00',
      procedimento: 'Limpeza (Profilaxia)',
      status: 'concluido',
      observacoes: 'Procedimento realizado pontualmente sem queixas.',
    },
    {
      pacienteIdx: 1,
      data_consulta: todayStr,
      hora_consulta: '10:00:00',
      hora_fim: '11:00:00',
      procedimento: 'Restauração em Resina Composta',
      status: 'confirmado',
      observacoes: 'Paciente confirmou presença via WhatsApp.',
    },
    {
      pacienteIdx: 2,
      data_consulta: todayStr,
      hora_consulta: '14:00:00',
      hora_fim: '15:30:00',
      procedimento: 'Tratamento de Canal (Endodontia)',
      status: 'pendente',
      observacoes: 'Aguardando retorno do lembrete de confirmação.',
    },
    {
      pacienteIdx: 3,
      data_consulta: todayStr,
      hora_consulta: '16:00:00',
      hora_fim: '16:45:00',
      procedimento: 'Avaliação Inicial & Odontograma',
      status: 'confirmado',
      observacoes: 'Primeira consulta do paciente.',
    },

    // Consultas dos PRÓXIMOS DIAS
    {
      pacienteIdx: 4,
      data_consulta: tomorrowStr,
      hora_consulta: '09:00:00',
      hora_fim: '10:00:00',
      procedimento: 'Clareamento Dental a Laser',
      status: 'confirmado',
      observacoes: 'Segunda sessão de clareamento.',
    },
    {
      pacienteIdx: 5,
      data_consulta: tomorrowStr,
      hora_consulta: '11:15:00',
      hora_fim: '12:00:00',
      procedimento: 'Extração de Terceiro Molar (Siso)',
      status: 'confirmado',
      observacoes: 'Prescrição pré-operatória orientada.',
    },
    {
      pacienteIdx: 6,
      data_consulta: inThreeDaysStr,
      hora_consulta: '14:30:00',
      hora_fim: '15:15:00',
      procedimento: 'Revisão Pós-Cirúrgica',
      status: 'agendado',
      observacoes: 'Remoção de sutura e checagem de cicatrização.',
    },
    {
      pacienteIdx: 7,
      data_consulta: inFiveDaysStr,
      hora_consulta: '15:45:00',
      hora_fim: '16:30:00',
      procedimento: 'Instalação de Placa Miorrelaxante',
      status: 'agendado',
      observacoes: 'Ajuste oclusal da placa de bruxismo.',
    },

    // Consultas PASSADAS
    {
      pacienteIdx: 0,
      data_consulta: yesterdayStr,
      hora_consulta: '14:00:00',
      hora_fim: '14:45:00',
      procedimento: 'Check-up Preventivo',
      status: 'concluido',
      observacoes: 'Realizada profilaxia e exame clínico visual.',
    },
    {
      pacienteIdx: 1,
      data_consulta: threeDaysAgoStr,
      hora_consulta: '16:00:00',
      hora_fim: '17:00:00',
      procedimento: 'Restauração Dente 16',
      status: 'concluido',
      observacoes: 'Restauração classe II com matriz seccional.',
    },
    {
      pacienteIdx: 2,
      data_consulta: threeDaysAgoStr,
      hora_consulta: '11:00:00',
      hora_fim: '11:30:00',
      procedimento: 'Consulta de Emergência',
      status: 'cancelado',
      observacoes: 'Paciente desmarcou por motivo de viagem profissional.',
    },
  ]

  for (const ag of agendamentosSeed) {
    const paciente = insertedPacientes[ag.pacienteIdx]
    if (!paciente) continue

    const { data: existingAg } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', paciente.id)
      .eq('data_consulta', ag.data_consulta)
      .eq('hora_consulta', ag.hora_consulta)
      .maybeSingle()

    if (!existingAg) {
      await supabase.from('agendamentos').insert([
        {
          clinica_id: clinicaId,
          paciente_id: paciente.id,
          dentista_id: dentistaId,
          data_consulta: ag.data_consulta,
          hora_consulta: ag.hora_consulta,
          hora_fim: ag.hora_fim,
          procedimento: ag.procedimento,
          status: ag.status,
          observacoes: ag.observacoes,
        },
      ])
    }
  }

  console.log(`📅 Agendamentos populados para hoje (${todayStr}), próximos dias e passados.`)

  // 6. Prontuários Clínicos & Odontograma (Conforme CFO 198/2019: finalizados e imutáveis)
  const prontuariosSeed = [
    {
      pacienteIdx: 0,
      descricao:
        'Paciente compareceu para avaliação de rotina e profilaxia. Ao exame clínico e odontograma digital, observada integridade da arcada dentária, com ausência de sangramento gengival ativo. Realizada profilaxia completa com ultrassom e aplicação tópica de flúor gel neutro.',
      tratamento: 'Profilaxia e Aplicação Tópica de Flúor (Arcadas Superior e Inferior)',
      observacoes: 'Retorno preventivo recomendado em 6 meses.',
    },
    {
      pacienteIdx: 1,
      descricao:
        'Exame clínico acusou lesão cariosa oclusal no dente 16 (primeiro molar superior direito). Anestesia infiltrativa com articaína 4% 1:100.000. Isolamento absoluto, remoção de tecido cariado com ponta diamantada e broca esférica de baixa rotação. Condicionamento ácido por 15s em esmalte, aplicação de sistema adesivo Single Bond Universal e fotopolimerização. Restauração em resina composta cor A2 Filtek Z350 XT. Ajuste oclusal com carbono fino.',
      tratamento: 'Restauração de Resina Composta Classe I no elemento 16',
      observacoes: 'Sem sensibilidade pós-operatória imediata.',
    },
    {
      pacienteIdx: 2,
      descricao:
        'Paciente com histórico de dor provocada por frio no dente 21 (incisivo central superior esquerdo). Teste de sensibilidade pulpar térmico positivo exacerbado e declínio lento. Diagnóstico de pulpite irreversível sintomática. Abertura coronária realizada, odontometria eletrônica (comprimento de trabalho: 21mm), preparo biomecânico com lima WaveOne Gold Primary e irrigação abundante com NaOCl 2.5%. Obturação termoplastificada com cone de guta-percha e cimento biocerâmico Sealer Plus.',
      tratamento: 'Tratamento Endodôntico Unirradicular no dente 21',
      observacoes: 'RX periapical final com excelente selamento apical.',
    },
    {
      pacienteIdx: 3,
      descricao:
        'Consulta de avaliação ortodôntica e documentação fotográfica intraoral. Realizado odontograma digital completo identificando apinhamento ântero-inferior moderado e mordida cruzada unilateral no dente 24. Moldagem para modelos de estudo e solicitação de telerradiografia e panorâmica.',
      tratamento: 'Planejamento Ortodôntico e Odontograma Inicial',
      observacoes: 'Apresentação do plano de tratamento agendada para próxima semana.',
    },
    {
      pacienteIdx: 4,
      descricao:
        'Sessão 1 de clareamento dental de consultório. Aplicação de barreira gengival fotopolimerizável Top Dam. Aplicação de peróxido de hidrogênio a 35% por 3 ciclos de 15 minutos em dentes anteriores (14 ao 24 e 34 ao 44). Cor inicial: A3. Cor pós-procedimento imediato: A1 (escala Vita Classical).',
      tratamento: 'Clareamento Dental em Consultório (Peróxido de Hidrogênio 35%)',
      observacoes: 'Prescrito gel dessensibilizante com nitrato de potássio se necessário.',
    },
  ]

  for (const pr of prontuariosSeed) {
    const paciente = insertedPacientes[pr.pacienteIdx]
    if (!paciente) continue

    const { data: existingPr } = await supabase
      .from('prontuarios')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('paciente_id', paciente.id)
      .limit(1)
      .maybeSingle()

    if (!existingPr) {
      await supabase.from('prontuarios').insert([
        {
          clinica_id: clinicaId,
          paciente_id: paciente.id,
          dentista_id: dentistaId,
          descricao: pr.descricao,
          observacoes: pr.observacoes,
          tratamento: pr.tratamento,
          finalizado: true,
          finalizado_em: subDays(now, 2).toISOString(),
          status: 'registrada',
          tipo_registro: 'registro_clinico',
          created_at: subDays(now, 2).toISOString(),
        },
      ])
    }
  }

  console.log(`📋 Prontuários e evoluções clínicas registradas com sucesso.`)

  // 7. Financeiro: Receitas (alimenta o Dashboard mensal e histórico)
  const receitasSeed = [
    // Mês Atual (Outubro 2026)
    {
      pacienteIdx: 0,
      descricao: 'Limpeza e Profilaxia Preventiva',
      valor: 180.0,
      status: 'pago',
      created_at: subDays(now, 1).toISOString(),
    },
    {
      pacienteIdx: 1,
      descricao: 'Restauração Resina Composta (Dente 16)',
      valor: 280.0,
      status: 'pago',
      created_at: subDays(now, 3).toISOString(),
    },
    {
      pacienteIdx: 2,
      descricao: 'Tratamento Endodôntico (Dente 21)',
      valor: 850.0,
      status: 'pago',
      created_at: subDays(now, 5).toISOString(),
    },
    {
      pacienteIdx: 3,
      descricao: 'Clareamento Dental a Laser Completo',
      valor: 950.0,
      status: 'pago',
      created_at: subDays(now, 8).toISOString(),
    },
    {
      pacienteIdx: 4,
      descricao: 'Extração de Sisos Inclusos (38 e 48)',
      valor: 900.0,
      status: 'pago',
      created_at: subDays(now, 12).toISOString(),
    },
    {
      pacienteIdx: 5,
      descricao: 'Placa Miorrelaxante de Bruxismo',
      valor: 650.0,
      status: 'pago',
      created_at: subDays(now, 15).toISOString(),
    },
    {
      pacienteIdx: 6,
      descricao: 'Coroa Cerâmica sobre Implante (1ª Parcela)',
      valor: 1400.0,
      status: 'pendente',
      created_at: subDays(now, 2).toISOString(),
    },

    // Mês Anterior (Setembro 2026 - para cálculo de crescimento do faturamento no dashboard)
    {
      pacienteIdx: 0,
      descricao: 'Profilaxia e Raspagem Periodontal',
      valor: 350.0,
      status: 'pago',
      created_at: subMonths(now, 1).toISOString(),
    },
    {
      pacienteIdx: 1,
      descricao: 'Restaurações Estéticas Múltiplas',
      valor: 750.0,
      status: 'pago',
      created_at: subMonths(now, 1).toISOString(),
    },
    {
      pacienteIdx: 2,
      descricao: 'Prótese Parcial Removível',
      valor: 1800.0,
      status: 'pago',
      created_at: subMonths(now, 1).toISOString(),
    },
    {
      pacienteIdx: 3,
      descricao: 'Manutenção Ortodôntica',
      valor: 220.0,
      status: 'pago',
      created_at: subMonths(now, 1).toISOString(),
    },

    // 2 a 5 meses atrás (para o gráfico histórico de fluxo de caixa)
    {
      pacienteIdx: 4,
      descricao: 'Implante Dentário Titânio',
      valor: 2800.0,
      status: 'pago',
      created_at: subMonths(now, 2).toISOString(),
    },
    {
      pacienteIdx: 5,
      descricao: 'Cirurgia Parendodôntica',
      valor: 1100.0,
      status: 'pago',
      created_at: subMonths(now, 3).toISOString(),
    },
    {
      pacienteIdx: 6,
      descricao: 'Tratamento Periodontal Avançado',
      valor: 1650.0,
      status: 'pago',
      created_at: subMonths(now, 4).toISOString(),
    },
    {
      pacienteIdx: 7,
      descricao: 'Laminados Cerâmicos (Faceta)',
      valor: 3200.0,
      status: 'pago',
      created_at: subMonths(now, 5).toISOString(),
    },
  ]

  for (const rec of receitasSeed) {
    const paciente = insertedPacientes[rec.pacienteIdx]
    const pacId = paciente ? paciente.id : null

    const { data: existingRec } = await supabase
      .from('receitas')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('descricao', rec.descricao)
      .maybeSingle()

    if (!existingRec) {
      await supabase.from('receitas').insert([
        {
          clinica_id: clinicaId,
          paciente_id: pacId,
          profissional_id: dentistaId,
          descricao: rec.descricao,
          valor: rec.valor,
          status: rec.status,
          tipo_receituario: 'comum',
          data_recebimento: rec.status === 'pago' ? formatDate(new Date(rec.created_at)) : null,
          created_at: rec.created_at,
        },
      ])
    }
  }

  console.log(`💰 Receitas e recebíveis populados com sucesso.`)

  // 8. Financeiro: Despesas (custos operacionais da clínica)
  const despesasSeed = [
    {
      descricao: 'Dental Cremer — Resinas, Anestésicos e Agulhas Descartáveis',
      valor: 680.0,
      categoria: 'Insumos Odontológicos',
      data_pagamento: formatDate(subDays(now, 4)),
      created_at: subDays(now, 4).toISOString(),
    },
    {
      descricao: 'Laboratório de Prótese Dental (Coroas e Modelos)',
      valor: 520.0,
      categoria: 'Laboratório',
      data_pagamento: formatDate(subDays(now, 8)),
      created_at: subDays(now, 8).toISOString(),
    },
    {
      descricao: 'Aluguel do Consultório e Condomínio Comercial',
      valor: 2400.0,
      categoria: 'Custos Fixos',
      data_pagamento: formatDate(subDays(now, 10)),
      created_at: subDays(now, 10).toISOString(),
    },
    {
      descricao: 'Energia Elétrica Comercial (Enel / CEMIG)',
      valor: 380.0,
      categoria: 'Custos Fixos',
      data_pagamento: formatDate(subDays(now, 14)),
      created_at: subDays(now, 14).toISOString(),
    },
    {
      descricao: 'Manutenção Preventiva de Autoclave e Compressor',
      valor: 310.0,
      categoria: 'Manutenção',
      data_pagamento: formatDate(subDays(now, 18)),
      created_at: subDays(now, 18).toISOString(),
    },
    {
      descricao: 'Licença Software OdontoSoft SaaS',
      valor: 197.0,
      categoria: 'Software & Tecnologia',
      data_pagamento: formatDate(subDays(now, 22)),
      created_at: subDays(now, 22).toISOString(),
    },
  ]

  for (const desp of despesasSeed) {
    const { data: existingDesp } = await supabase
      .from('despesas')
      .select('id')
      .eq('clinica_id', clinicaId)
      .eq('descricao', desp.descricao)
      .maybeSingle()

    if (!existingDesp) {
      await supabase.from('despesas').insert([
        {
          clinica_id: clinicaId,
          descricao: desp.descricao,
          valor: desp.valor,
          categoria: desp.categoria,
          data_pagamento: desp.data_pagamento,
          created_at: desp.created_at,
        },
      ])
    }
  }

  console.log(`📉 Despesas operacionais populadas com sucesso.`)
  console.log('✨ Seed finalizado com sucesso! Todos os módulos estão populados.')
}

runSeed().catch((err) => {
  console.error('❌ Falha ao executar o seed:', err)
  process.exit(1)
})
