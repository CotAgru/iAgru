-- Migration v24: Adicionar campo contrato_venda_id na tabela romaneios
-- Execute no Supabase Dashboard > SQL Editor

-- Adicionar coluna contrato_venda_id referenciando contratos_venda
ALTER TABLE romaneios
ADD COLUMN IF NOT EXISTS contrato_venda_id UUID REFERENCES contratos_venda(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_romaneios_contrato_venda ON romaneios(contrato_venda_id);

-- RLS: permitir operações
DROP POLICY IF EXISTS "romaneios_contrato_venda_select" ON romaneios;
