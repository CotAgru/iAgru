-- =====================================================================
-- FretAgru v8 - CRIAR TABELA TIPOS_CAMINHAO
-- Normalizar tipos de caminhão em tabela própria
-- =====================================================================

CREATE TABLE tipos_caminhao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tipos_caminhao_updated_at BEFORE UPDATE ON tipos_caminhao FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tipos_caminhao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON tipos_caminhao FOR ALL USING (true) WITH CHECK (true);

-- Seed com tipos comuns
INSERT INTO tipos_caminhao (nome, ativo) VALUES
('Carreta', true),
('Truck', true),
('Toco', true),
('Bitruck', true),
('Rodotrem', true),
('Vanderleia', true),
('3/4', true);
