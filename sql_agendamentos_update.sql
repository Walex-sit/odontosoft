-- Script de atualização da tabela agendamentos e recarga do Schema Cache do Supabase
-- Execute este comando no SQL Editor do Supabase Dashboard

-- 1. Garante que a coluna dentista_id existe
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS dentista_id uuid;

-- 2. Garante as colunas opcionais adicionais
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS hora_fim text;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS procedimento text;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS observacoes text;

-- 3. Adiciona a relação de chave estrangeira se ainda não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'agendamentos_dentista_id_fkey'
  ) THEN
    ALTER TABLE agendamentos 
      ADD CONSTRAINT agendamentos_dentista_id_fkey 
      FOREIGN KEY (dentista_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Notifica o PostgREST para recarregar a estrutura de tabelas e o cache de schemas imediatamente
NOTIFY pgrst, 'reload schema';
