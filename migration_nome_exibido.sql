-- ============================================================
-- Migration: Nome Exibido no Topo do Sistema
-- Descrição : Adiciona o campo `nome_exibido` à tabela
--             `clinica_settings` para desacoplar o nome visual
--             exibido na Topbar da Razão Social legal.
-- ============================================================

ALTER TABLE clinica_settings
  ADD COLUMN IF NOT EXISTS nome_exibido text;

COMMENT ON COLUMN clinica_settings.nome_exibido IS
  'Nome visual exibido no topo do sistema (Topbar). '
  'Independente da Razão Social. Se vazio, usa o campo nome da tabela clinicas.';
