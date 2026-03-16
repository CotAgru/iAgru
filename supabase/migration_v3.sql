-- FretAgru v3 - Migration: Ordens de Carregamento e Romaneios
-- Execute APOS o migration.sql principal

-- 1. Tabela ORDENS_CARREGAMENTO
CREATE TABLE IF NOT EXISTS ordens_carregamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ordem SERIAL,
  data_ordem TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  origem_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  destino_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  transportador_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  motorista_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES veiculos(id) ON DELETE SET NULL,
  preco_id UUID REFERENCES precos_contratados(id) ON DELETE SET NULL,
  quantidade_prevista REAL,
  unidade VARCHAR(10) DEFAULT 'ton',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela ROMANEIOS
CREATE TABLE IF NOT EXISTS romaneios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID REFERENCES ordens_carregamento(id) ON DELETE SET NULL,
  numero_ticket VARCHAR(50),
  tipo_documento VARCHAR(50) DEFAULT 'ticket_pesagem',
  data_emissao DATE,
  local_pesagem VARCHAR(200),
  fornecedor_destinatario VARCHAR(200),
  produtor VARCHAR(200),
  cnpj_cpf VARCHAR(18),
  placa VARCHAR(10),
  motorista VARCHAR(200),
  transportadora VARCHAR(200),
  produto VARCHAR(100),
  safra VARCHAR(20),
  nfe_numero VARCHAR(50),
  nfe_serie VARCHAR(10),
  peso_bruto REAL,
  tara REAL,
  peso_liquido REAL,
  umidade_perc REAL,
  impureza_perc REAL,
  avariados_perc REAL,
  ardidos_perc REAL,
  esverdeados_perc REAL,
  partidos_perc REAL,
  quebrados_perc REAL,
  desconto_kg REAL,
  peso_corrigido REAL,
  data_hora_entrada TIMESTAMPTZ,
  data_hora_saida TIMESTAMPTZ,
  imagem_url TEXT,
  transgenia VARCHAR(50),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Triggers updated_at
CREATE TRIGGER trg_ordens_updated_at BEFORE UPDATE ON ordens_carregamento FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_romaneios_updated_at BEFORE UPDATE ON romaneios FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. RLS
ALTER TABLE ordens_carregamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE romaneios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON ordens_carregamento FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON romaneios FOR ALL USING (true) WITH CHECK (true);
