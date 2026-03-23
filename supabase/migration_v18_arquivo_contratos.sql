-- Migration v18: Adicionar campo arquivo_url nas tabelas de contratos

-- Adicionar campo arquivo_url em contratos_venda
ALTER TABLE contratos_venda 
ADD COLUMN IF NOT EXISTS arquivo_url TEXT;

COMMENT ON COLUMN contratos_venda.arquivo_url IS 'URL do arquivo anexado (contrato PDF, imagem, etc)';

-- Adicionar campo arquivo_url em compras_insumo
ALTER TABLE compras_insumo 
ADD COLUMN IF NOT EXISTS arquivo_url TEXT;

COMMENT ON COLUMN compras_insumo.arquivo_url IS 'URL do arquivo anexado (contrato PDF, imagem, etc)';
