-- =============================================
-- MIGRATION V6: Admin tables + Romaneios refactor
-- =============================================

-- 1) Tabela ano_safra
CREATE TABLE IF NOT EXISTS ano_safra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,           -- Ex: "24/25", "25/26"
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ano_safra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all ano_safra" ON ano_safra;
CREATE POLICY "Allow all ano_safra" ON ano_safra FOR ALL USING (true) WITH CHECK (true);

-- Inserir anos safra padrão
INSERT INTO ano_safra (nome) VALUES
  ('21/22'), ('22/23'), ('23/24'), ('24/25'), ('25/26'), ('26/27')
ON CONFLICT (nome) DO NOTHING;

-- 2) Tabela tipos_nf
CREATE TABLE IF NOT EXISTS tipos_nf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,           -- Ex: "Remessa para Depósito", "Venda"
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tipos_nf ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all tipos_nf" ON tipos_nf;
CREATE POLICY "Allow all tipos_nf" ON tipos_nf FOR ALL USING (true) WITH CHECK (true);

-- Inserir tipos NF padrão
INSERT INTO tipos_nf (nome) VALUES
  ('Remessa para Depósito'), ('Venda'), ('Transferência'), ('Devolução'), ('Outros')
ON CONFLICT (nome) DO NOTHING;

-- 3) Tabela tipos_ticket (ex: Tipo Documento)
CREATE TABLE IF NOT EXISTS tipos_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,           -- Ex: "Ticket de Pesagem", "Romaneio de Entrada"
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tipos_ticket ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all tipos_ticket" ON tipos_ticket;
CREATE POLICY "Allow all tipos_ticket" ON tipos_ticket FOR ALL USING (true) WITH CHECK (true);

-- Inserir tipos ticket padrão
INSERT INTO tipos_ticket (nome) VALUES
  ('Ticket de Pesagem'), ('Ficha de Circulação'), ('Romaneio de Entrada')
ON CONFLICT (nome) DO NOTHING;

-- 4) Adicionar ano_safra_id na tabela operacoes
ALTER TABLE operacoes
  ADD COLUMN IF NOT EXISTS ano_safra_id UUID REFERENCES ano_safra(id) ON DELETE SET NULL;

-- 5) Novos campos na tabela romaneios
-- tipo_nf_id, campos de desconto volume, produtor_id, origem_id, destinatario_id
ALTER TABLE romaneios
  ADD COLUMN IF NOT EXISTS tipo_nf_id UUID REFERENCES tipos_nf(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_ticket_id UUID REFERENCES tipos_ticket(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destinatario_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS produtor_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motorista_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transportadora_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS veiculo_id UUID REFERENCES veiculos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ano_safra_id UUID REFERENCES ano_safra(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS umidade_desc NUMERIC,
  ADD COLUMN IF NOT EXISTS impureza_desc NUMERIC,
  ADD COLUMN IF NOT EXISTS avariados_desc NUMERIC,
  ADD COLUMN IF NOT EXISTS ardidos_desc NUMERIC,
  ADD COLUMN IF NOT EXISTS esverdeados_desc NUMERIC,
  ADD COLUMN IF NOT EXISTS partidos_desc NUMERIC,
  ADD COLUMN IF NOT EXISTS quebrados_desc NUMERIC;

-- 6) Renomear data_emissao → data_saida_origem + novos campos de data
ALTER TABLE romaneios
  ADD COLUMN IF NOT EXISTS data_saida_origem TEXT,
  ADD COLUMN IF NOT EXISTS data_entrada_destino TEXT,
  ADD COLUMN IF NOT EXISTS data_saida_destino TEXT;

-- Migrar dados existentes de data_emissao para data_saida_origem
UPDATE romaneios SET data_saida_origem = data_emissao WHERE data_saida_origem IS NULL AND data_emissao IS NOT NULL;

-- 7) Índices
CREATE INDEX IF NOT EXISTS idx_romaneios_tipo_nf ON romaneios(tipo_nf_id);
CREATE INDEX IF NOT EXISTS idx_romaneios_origem ON romaneios(origem_id);
CREATE INDEX IF NOT EXISTS idx_romaneios_destinatario ON romaneios(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_romaneios_produtor ON romaneios(produtor_id);
CREATE INDEX IF NOT EXISTS idx_romaneios_motorista ON romaneios(motorista_id);
CREATE INDEX IF NOT EXISTS idx_romaneios_veiculo ON romaneios(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_ano_safra ON operacoes(ano_safra_id);
