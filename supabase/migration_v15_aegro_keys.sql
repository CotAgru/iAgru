-- ============================================================
-- iAgru — Migration v15: Campos de vínculo com Aegro
-- Adiciona chaves Aegro nas tabelas para rastreio de importação
-- ============================================================

-- 1. Campo aegro_crop_key na tabela safras
ALTER TABLE safras ADD COLUMN IF NOT EXISTS aegro_crop_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_safras_aegro_crop_key ON safras(aegro_crop_key) WHERE aegro_crop_key IS NOT NULL;

-- 2. Campo aegro_element_key na tabela produtos (futuro)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS aegro_element_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_aegro_element_key ON produtos(aegro_element_key) WHERE aegro_element_key IS NOT NULL;

-- 3. Campo aegro_company_key na tabela cadastros (futuro)
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS aegro_company_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cadastros_aegro_company_key ON cadastros(aegro_company_key) WHERE aegro_company_key IS NOT NULL;
