-- ============================================================
-- iAgru — Migration v16: Campos tipo_cadastro e origem_cadastro
-- Rastreia se o registro foi criado manualmente ou via API
-- ============================================================

-- ==========================================
-- PARTE 1: LIMPEZA — Remover dados importados do Aegro
-- ==========================================

-- 1a. Deletar safras importadas do Aegro
DELETE FROM safras WHERE aegro_crop_key IS NOT NULL;

-- 1b. Deletar culturas que NÃO são do seed original (v12)
DELETE FROM culturas WHERE nome NOT IN (
  'Soja', 'Milho', 'Sorgo', 'Feijão', 'Algodão', 'Trigo', 'Café', 'Cana-de-Açúcar'
);

-- 1c. Deletar tipos_safra que NÃO são do seed original (v12)
DELETE FROM tipos_safra WHERE nome NOT IN ('Verão', 'Safrinha', 'Inverno');

-- 1d. Deletar anos_safra que foram criados automaticamente pela importação
-- (mantém apenas os que já existiam — ajuste conforme necessário)
-- Se quiser manter todos os anos, comente esta linha
-- DELETE FROM ano_safra WHERE nome NOT IN ('24/25', '25/26');

-- ==========================================
-- PARTE 2: Campos tipo_cadastro e origem_cadastro
-- tipo_cadastro: 'manual' (padrão) ou 'api'
-- origem_cadastro: NULL (manual), 'aegro', etc.
-- ==========================================

-- SAFRAS
ALTER TABLE safras ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE safras ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- CULTURAS
ALTER TABLE culturas ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE culturas ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- TIPOS_SAFRA
ALTER TABLE tipos_safra ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE tipos_safra ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- ANO_SAFRA
ALTER TABLE ano_safra ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE ano_safra ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- PRODUTOS
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- CADASTROS
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- CONTRATOS_VENDA
ALTER TABLE contratos_venda ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE contratos_venda ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- CONTRATOS_COMPRA_INSUMO
ALTER TABLE contratos_compra_insumo ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE contratos_compra_insumo ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- INTEGRACOES
ALTER TABLE integracoes ADD COLUMN IF NOT EXISTS tipo_cadastro TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE integracoes ADD COLUMN IF NOT EXISTS origem_cadastro TEXT;

-- ==========================================
-- PARTE 3: Marcar registros seed como 'manual'
-- (os DEFAULT já cuidam disso, mas garantimos)
-- ==========================================
UPDATE culturas SET tipo_cadastro = 'manual', origem_cadastro = NULL WHERE tipo_cadastro IS NULL OR tipo_cadastro = '';
UPDATE tipos_safra SET tipo_cadastro = 'manual', origem_cadastro = NULL WHERE tipo_cadastro IS NULL OR tipo_cadastro = '';
