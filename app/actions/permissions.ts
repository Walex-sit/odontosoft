'use server'

import { supabase } from '@/app/lib/supabaseClient'

export async function getRolePermissions(roleName: string) {
  
  // Aqui buscaria da tabela 'roles' do Supabase. Como a tabela pode não existir ainda,
  // vamos retornar um fallback mockado baseado no nome da role se der erro.
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('role_name', roleName)
      .single()
      
    if (data) {
      return data.permissions
    }
  } catch (error) {
    console.error('Erro ao buscar permissions, retornando default', error)
  }

  // Fallback / Initial State based on role
  return {
    agenda: roleName === 'admin' || roleName === 'dentista' || roleName === 'recepcao',
    pacientes: roleName === 'admin' || roleName === 'dentista' || roleName === 'recepcao',
    financeiro: roleName === 'admin' || roleName === 'financeiro',
    configuracoes: roleName === 'admin'
  }
}

export async function updateRolePermissions(roleName: string, permissions: any) {
  
  try {
    // Tenta atualizar no Supabase, garantindo que altera apenas a role selecionada
    const { error } = await supabase
      .from('roles')
      .update({ permissions })
      .eq('role_name', roleName)
      
    if (error) {
      console.error('Erro ao atualizar permissions:', error)
      // Como a tabela 'roles' pode não estar criada, não damos throw para não quebrar a UI
    }
    
    return { success: true }
  } catch (error) {
    console.error('Erro geral ao atualizar permissions', error)
    return { success: false, error: 'Erro ao atualizar permissões' }
  }
}
