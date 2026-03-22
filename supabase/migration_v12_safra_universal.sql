-- =====================================================================
-- iAgru v12 - SAFRA UNIVERSAL (culturas, tipos_safra, safras)
-- Tabelas compartilhadas entre todos os módulos do ecossistema
-- Execute no Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1) Tabela CULTURAS (Soja, Milho, Sorgo, Feijão, etc.)
CREATE TABLE IF NOT EXISTS culturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE culturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all culturas" ON culturas;
CREATE POLICY "Allow all culturas" ON culturas FOR ALL USING (true) WITH CHECK (true);

INSERT INTO culturas (nome) VALUES
  ('Soja'), ('Milho'), ('Sorgo'), ('Feijão'), ('Algodão'), ('Trigo'), ('Café'), ('Cana-de-Açúcar')
ON CONFLICT (nome) DO NOTHING;

-- 2) Tabela TIPOS_SAFRA (Verão, Safrinha, Inverno)
CREATE TABLE IF NOT EXISTS tipos_safra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tipos_safra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all tipos_safra" ON tipos_safra;
CREATE POLICY "Allow all tipos_safra" ON tipos_safra FOR ALL USING (true) WITH CHECK (true);

INSERT INTO tipos_safra (nome) VALUES
  ('Verão'), ('Safrinha'), ('Inverno')
ON CONFLICT (nome) DO NOTHING;

-- 3) Tabela SAFRAS (combina: Ano Safra + Cultura + Tipo)
-- Exemplo: "Soja Verão 24/25", "Milho Safrinha 24/25"
CREATE TABLE IF NOT EXISTS safras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ano_safra_id UUID NOT NULL REFERENCES ano_safra(id) ON DELETE CASCADE,
  cultura_id UUID NOT NULL REFERENCES culturas(id) ON DELETE CASCADE,
  tipo_safra_id UUID REFERENCES tipos_safra(id) ON DELETE SET NULL,
  data_inicio DATE,
  data_fim DATE,
  area_ha REAL,
  producao_estimada_ton REAL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_safras_updated_at BEFORE UPDATE ON safras FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE safras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all safras" ON safras;
CREATE POLICY "Allow all safras" ON safras FOR ALL USING (true) WITH CHECK (true);

-- 4) Índices
CREATE INDEX IF NOT EXISTS idx_safras_ano ON safras(ano_safra_id);
CREATE INDEX IF NOT EXISTS idx_safras_cultura ON safras(cultura_id);
CREATE INDEX IF NOT EXISTS idx_safras_tipo ON safras(tipo_safra_id);
