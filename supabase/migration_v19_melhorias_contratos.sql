-- Migration v19: Melhorias em Contratos - Ano Safra, Tipo Contrato, Unidades

-- 1. Adicionar campo ano_safra em contratos_venda
ALTER TABLE contratos_venda 
ADD COLUMN IF NOT EXISTS ano_safra INTEGER;

COMMENT ON COLUMN contratos_venda.ano_safra IS 'Ano da safra (ex: 2024)';

-- 2. Adicionar campo ano_safra em contratos_compra_insumo  
ALTER TABLE contratos_compra_insumo 
ADD COLUMN IF NOT EXISTS ano_safra INTEGER;

COMMENT ON COLUMN contratos_compra_insumo.ano_safra IS 'Ano da safra (ex: 2024)';

-- 3. Adicionar campo tipo_contrato_id em contratos_venda
ALTER TABLE contratos_venda 
ADD COLUMN IF NOT EXISTS tipo_contrato_id UUID REFERENCES tipos_contrato(id);

COMMENT ON COLUMN contratos_venda.tipo_contrato_id IS 'Tipo do contrato (Fixo, Futuro, Barter, etc)';

-- 4. Adicionar campo tipo_contrato_id em contratos_compra_insumo
ALTER TABLE contratos_compra_insumo 
ADD COLUMN IF NOT EXISTS tipo_contrato_id UUID REFERENCES tipos_contrato(id);

COMMENT ON COLUMN contratos_compra_insumo.tipo_contrato_id IS 'Tipo do contrato (Fixo, Futuro, Barter, etc)';

-- 5. Renomear campos em contratos_venda para melhor nomenclatura
ALTER TABLE contratos_venda 
RENAME COLUMN volume_tons TO quantidade;

ALTER TABLE contratos_venda 
ADD COLUMN IF NOT EXISTS unidade_medida_id UUID REFERENCES unidades_medida(id);

ALTER TABLE contratos_venda 
RENAME COLUMN preco_valor TO valor_unitario;

ALTER TABLE contratos_venda 
ADD COLUMN IF NOT EXISTS valor_total DECIMAL(15,2);

COMMENT ON COLUMN contratos_venda.quantidade IS 'Quantidade do produto';
COMMENT ON COLUMN contratos_venda.unidade_medida_id IS 'Unidade de medida (kg, tn, lt, etc)';
COMMENT ON COLUMN contratos_venda.valor_unitario IS 'Valor unitário conforme unidade';
COMMENT ON COLUMN contratos_venda.valor_total IS 'Valor total calculado (quantidade * valor_unitario)';

-- 6. Criar tabela tipos_contrato
CREATE TABLE IF NOT EXISTS tipos_contrato (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  cor VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE tipos_contrato IS 'Tipos de contrato (Fixo, Futuro, Barter, Troca, etc)';

-- Inserir tipos padrão
INSERT INTO tipos_contrato (nome, descricao, cor) VALUES
('Fixo', 'Contrato com preço fixado', 'blue'),
('Futuro', 'Contrato com preço a fixar', 'yellow'),
('Barter', 'Troca de produto por produto/serviço', 'green'),
('Balcão', 'Venda spot/pronta entrega', 'purple')
ON CONFLICT DO NOTHING;

-- 7. Criar tabela unidades_medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(50) NOT NULL,
  simbolo VARCHAR(10) NOT NULL,
  grupo VARCHAR(50) NOT NULL, -- sólido, líquido, unitário
  fator_conversao DECIMAL(15,6) NOT NULL DEFAULT 1,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(simbolo)
);

COMMENT ON TABLE unidades_medida IS 'Unidades de medida para uso em todo o sistema';
COMMENT ON COLUMN unidades_medida.fator_conversao IS 'Fator de conversão para unidade base do grupo (ex: kg=1, tn=1000)';

-- Inserir unidades padrão
INSERT INTO unidades_medida (nome, simbolo, grupo, fator_conversao, descricao) VALUES
-- Sólidos
('Quilograma', 'kg', 'sólido', 1, 'Unidade base para peso'),
('Tonelada', 'tn', 'sólido', 1000, '1 tonelada = 1000 kg'),
('Saca', 'sc', 'sólido', 60, '1 saca = 60 kg'),
('Grama', 'g', 'sólido', 0.001, '1 grama = 0.001 kg'),

-- Líquidos
('Mililitro', 'ml', 'líquido', 1, 'Unidade base para volume'),
('Litro', 'lt', 'líquido', 1000, '1 litro = 1000 ml'),

-- Unitários
('Unidade', 'un', 'unitário', 1, 'Peça/unidade'),
('Dúzia', 'dz', 'unitário', 12, '1 dúzia = 12 unidades')
ON CONFLICT DO NOTHING;

-- 8. Adicionar ano em safras (se não existir)
ALTER TABLE safras 
ADD COLUMN IF NOT EXISTS ano INTEGER;

COMMENT ON COLUMN safras.ano IS 'Ano da safra (ex: 2024, 2025)';

-- Atualizar safras existentes extraindo ano do nome se possível
UPDATE safras 
SET ano = CASE 
  WHEN nome ~ '\d{4}' THEN SUBSTRING(nome FROM '\d{4}')::INTEGER
  ELSE EXTRACT(YEAR FROM created_at)::INTEGER
END
WHERE ano IS NULL;
