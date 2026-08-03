'use server';

import { createClient } from '@supabase/supabase-js';

// Cria o cliente admin para ignorar RLS nas configurações
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Variáveis de ambiente Supabase ausentes');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Procedimentos
// ---------------------------------------------------------------------------
export async function fetchProcedures(): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('procedimentos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Erro ao buscar procedimentos:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

// ---------------------------------------------------------------------------
// Comissões
// ---------------------------------------------------------------------------
export async function fetchCommissions(): Promise<{ success: boolean; data: any[]; error?: string }> {
  try {
    const supabase = getAdminClient();
    // Busca a comissão juntamente com o nome do procedimento e nome do dentista
    // Supondo que a tabela auth.users não pode ser "joinada" diretamente por RLS/estrutura,
    // nós fazemos join com user_profiles.
    // Lembrete: na criação da tabela sql_profissionais_comissoes.sql, dentista_id aponta para auth.users.
    // Mas user_profiles tem o mesmo ID, então a foreign key virtual funciona se configurado no postgrest, 
    // porém se não houver FK explícita, o PostgREST pode reclamar. 
    // Como criamos FK na migration original? Vamos assumir que criamos para auth.users mas podemos
    // listar cruzado ou trazer tudo e cruzar no backend.
    
    // Para simplificar e evitar erros de permissão de join com auth.users, buscamos tudo e cruzamos manual:
    const { data: comissoes, error: comissoesError } = await supabase
      .from('comissoes')
      .select('*');
    if (comissoesError) throw comissoesError;

    const { data: procedimentos, error: procError } = await supabase
      .from('procedimentos')
      .select('id, nome');
    if (procError) throw procError;

    const { data: dentistas, error: dentError } = await supabase
      .from('user_profiles')
      .select('id, nome')
      .eq('role', 'dentista');
    if (dentError) throw dentError;

    // Cross-reference manual
    const joinedData = (comissoes || []).map(c => {
      const proc = procedimentos?.find(p => p.id === c.procedimento_id);
      const dent = dentistas?.find(d => d.id === c.dentista_id);
      return {
        ...c,
        procedimento_nome: proc ? proc.nome : 'Desconhecido',
        dentista_nome: dent ? dent.nome : 'Desconhecido',
      };
    });

    return { success: true, data: joinedData };
  } catch (error: any) {
    console.error('Erro ao buscar comissões:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

export async function setCommission(data: {
  procedimento_id: string;
  dentista_id: string;
  porcentagem: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient();

    // Upsert baseado no par único (procedimento_id, dentista_id)
    // Se a tabela usar o ID como PK e nós quisermos upsert por outra chave, é preciso usar o parâmetro onConflict
    const { error } = await supabase
      .from('comissoes')
      .upsert(
        {
          procedimento_id: data.procedimento_id,
          dentista_id: data.dentista_id,
          porcentagem: data.porcentagem,
        },
        { onConflict: 'procedimento_id, dentista_id' }
      );

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao definir comissão:', error.message);
    return { success: false, error: error.message };
  }
}
