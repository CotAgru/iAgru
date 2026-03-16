-- FretAgru v2 - Migration para Supabase (PostgreSQL)
-- IMPORTANTE: Execute primeiro o drop_old.sql se ja tiver a versao anterior

-- ============================================================
-- 1. Dropar tabelas antigas (CASCADE remove triggers e FKs)
-- ============================================================
DROP TABLE IF EXISTS precos_contratados CASCADE;
DROP TABLE IF EXISTS veiculos CASCADE;
DROP TABLE IF EXISTS locais CASCADE;
DROP TABLE IF EXISTS fornecedores CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS cadastros CASCADE;

-- ============================================================
-- 2. Tabela unificada CADASTROS (antigos fornecedores + locais)
-- ============================================================
CREATE TABLE cadastros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf_cnpj VARCHAR(18),
  nome VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  telefone1 VARCHAR(20),
  telefone2 VARCHAR(20),
  uf VARCHAR(2) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  tipos TEXT[] NOT NULL DEFAULT '{}',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Tabela VEICULOS (com tipos ANTT)
-- ============================================================
CREATE TABLE veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadastro_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  placa VARCHAR(10) NOT NULL,
  tipo_caminhao VARCHAR(50) NOT NULL,
  eixos INTEGER NOT NULL DEFAULT 0,
  peso_pauta_kg REAL NOT NULL DEFAULT 0,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  ano INTEGER,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Tabela PRODUTOS (sem alteracao)
-- ============================================================
CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'ton',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. Tabela PRECOS_CONTRATADOS (FKs apontam para cadastros)
-- ============================================================
CREATE TABLE precos_contratados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  destino_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  valor REAL NOT NULL,
  unidade_preco TEXT NOT NULL DEFAULT 'R$/ton',
  distancia_km REAL,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cadastros_updated_at BEFORE UPDATE ON cadastros FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_veiculos_updated_at BEFORE UPDATE ON veiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_precos_updated_at BEFORE UPDATE ON precos_contratados FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. RLS - permitir acesso publico (anon)
-- ============================================================
ALTER TABLE cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_contratados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON cadastros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON veiculos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON precos_contratados FOR ALL USING (true) WITH CHECK (true);
