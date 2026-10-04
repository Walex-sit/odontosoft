import { supabase } from '@/app/lib/supabaseClient';
import type { Patient } from '@/components/EditPatientForm';

export async function getPatientById(id: string) {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Error fetching patient:', error.message, error.details);
    return null;
  }
  return data as unknown as Patient;
}
