-- =====================================================================
-- iAgru v13 - CONTAGRU (contratos_venda + contratos_compra_insumo)
-- Módulo de Gestão de Contratos de Venda e Compra de Insumos
-- Execute no Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1) Tabela CONTRATOS DE VENDA (commodities)
CREATE TABLE IF NOT EXISTS contratos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato VARCHAR(50),
  comprador_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
  volume_tons REAL NOT NULL,
  preco_valor REAL NOT NULL,
  preco_unidade TEXT NOT NULL DEFAULT 'R$/ton',
  modalidade TEXT DEFAULT 'FOB',
  data_contrato DATE,
  data_entrega_inicio DATE,
  data_entrega_fim DATE,
  status TEXT NOT NULL DEFAULT 'negociacao',
  local_entrega_id UUID REFERENCES cadastros(id) ON DELETE SET NULL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_contratos_venda_updated_at BEFORE UPDATE ON contratos_venda FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE contratos_venda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all contratos_venda" ON contratos_venda;
CREATE POLICY "Allow all contratos_venda" ON contratos_venda FOR ALL USING (true) WITH CHECK (true);

-- 2) Tabela COMPRA DE INSUMOS AGRÍCOLAS
CREATE TABLE IF NOT EXISTS contratos_compra_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato VARCHAR(50),
  fornecedor_id UUID NOT NULL REFERENCES cadastros(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  safra_id UUID REFERENCES safras(id) ON DELETE SET NULL,
  quantidade REAL NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'ton',
  preco_valor REAL NOT NULL,
  preco_unidade TEXT NOT NULL DEFAULT 'R$/ton',
  data_contrato DATE,
  data_entrega_prevista DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_contratos_compra_insumo_updated_at BEFORE UPDATE ON contratos_compra_insumo FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE contratos_compra_insumo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all contratos_compra_insumo" ON contratos_compra_insumo;
CREATE POLICY "Allow all contratos_compra_insumo" ON contratos_compra_insumo FOR ALL USING (true) WITH CHECK (true);

-- 3) Índices
CREATE INDEX IF NOT EXISTS idx_cv_comprador ON contratos_venda(comprador_id);
CREATE INDEX IF NOT EXISTS idx_cv_produto ON contratos_venda(produto_id);
CREATE INDEX IF NOT EXISTS idx_cv_safra ON contratos_venda(safra_id);
CREATE INDEX IF NOT EXISTS idx_cv_status ON contratos_venda(status);
CREATE INDEX IF NOT EXISTS idx_cci_fornecedor ON contratos_compra_insumo(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_cci_produto ON contratos_compra_insumo(produto_id);
CREATE INDEX IF NOT EXISTS idx_cci_safra ON contratos_compra_insumo(safra_id);
