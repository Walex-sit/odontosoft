'use server';

import { createClient } from '@supabase/supabase-js';

/**
 * Cria uma instância isolada do cliente Supabase Admin usando apenas a
 * SERVICE_ROLE_KEY. Não importa nada de '@/app/lib/supabaseClient' para evitar
 * contaminação com a ANON_KEY.
 */
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

/**
 * Server Action – salva um novo paciente.
 * Recebe os campos via FormData e insere na tabela `pacientes`.
 */
export async function createPatient(formData: FormData): Promise<{ success: boolean; error?: string }> {
  // Extrai cada campo, usando fallback vazio para evitar valores null.
  const nome = (formData.get('nome') as string) ?? '';
  const cpf = (formData.get('cpf') as string) ?? '';
  const telefone = (formData.get('telefone') as string) ?? '';
  const email = (formData.get('email') as string) ?? '';
  const data_nascimento = (formData.get('data_nascimento') as string) ?? '';
  const endereco = (formData.get('endereco') as string) ?? '';
  const convenio = (formData.get('convenio') as string) ?? '';

  // Validação mínima – pode ser expandida futuramente.
  if (!nome || !cpf) {
    return { success: false, error: 'Nome e CPF são obrigatórios' };
  }

  const supabase = getAdminClient();

  const { error } = await supabase.from('pacientes').insert([
    {
      nome,
      cpf,
      telefone,
      email,
      data_nascimento,
      endereco,
      convenio,
    },
  ]);

  if (error) {
    console.error('Erro ao inserir paciente:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Busca a lista de pacientes. Utiliza a chave de serviço para burlar RLS.
 */
export async function fetchPatients(): Promise<
  { success: boolean; data: Paciente[]; error?: string }
> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nome, cpf, telefone, email, data_nascimento, endereco, convenio')
    .order('nome', { ascending: true });

  if (error) {
    console.error('fetchPatients error:', error.message);
    return { success: false, data: [], error: error.message };
  }

  return { success: true, data: (data as Paciente[]) ?? [] };
}

/**
 * Tipo TypeScript para o registro de paciente.
 */
export interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  endereco: string;
  convenio: string;
}

/**
 * Server Action - Atualiza os dados de um paciente existente.
 */
export async function updatePatient(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  const nome = (formData.get('nome') as string) ?? '';
  const cpf = (formData.get('cpf') as string) ?? '';
  const telefone = (formData.get('telefone') as string) ?? '';
  const email = (formData.get('email') as string) ?? '';
  const data_nascimento = (formData.get('data_nascimento') as string) ?? '';
  const endereco = (formData.get('endereco') as string) ?? '';
  const convenio = (formData.get('convenio') as string) ?? '';

  if (!nome || !cpf) {
    return { success: false, error: 'Nome e CPF são obrigatórios' };
  }

  const supabase = getAdminClient();

  const { error } = await supabase
    .from('pacientes')
    .update({
      nome,
      cpf,
      telefone,
      email,
      data_nascimento,
      endereco,
      convenio,
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar paciente:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
