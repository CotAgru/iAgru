-- FretAgru - Migration para Supabase (PostgreSQL)
-- Execute este SQL no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  tipo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  ano INTEGER,
  capacidade_kg REAL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'ton',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS precos_contratados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id UUID NOT NULL REFERENCES locais(id) ON DELETE CASCADE,
  destino_id UUID NOT NULL REFERENCES locais(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
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

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fornecedores_updated_at BEFORE UPDATE ON fornecedores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_veiculos_updated_at BEFORE UPDATE ON veiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_locais_updated_at BEFORE UPDATE ON locais FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_produtos_updated_at BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_precos_updated_at BEFORE UPDATE ON precos_contratados FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security) - permitir acesso publico para o app
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE precos_contratados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON fornecedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON veiculos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON locais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON precos_contratados FOR ALL USING (true) WITH CHECK (true);
