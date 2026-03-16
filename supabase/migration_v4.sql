-- FretAgru v4 - Migration: Vinculo Motorista<->Transportadora, Ordens multi-transportadora, Romaneio vinculado a Ordem
-- Execute APOS migration_v3.sql

-- 1. Adicionar transportador_id em cadastros (motorista pertence a transportadora)
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS transportador_id UUID REFERENCES cadastros(id) ON DELETE SET NULL;

-- 2. Adicionar nome_ordem e reformular ordens_carregamento
ALTER TABLE ordens_carregamento ADD COLUMN IF NOT EXISTS nome_ordem VARCHAR(200);
ALTER TABLE ordens_carregamento ADD COLUMN IF NOT EXISTS numero_ordem_fmt VARCHAR(30);

-- Remover colunas antigas de transportador/motorista/veiculo unico (vamos usar tabela junction)
ALTER TABLE ordens_carregamento DROP COLUMN IF EXISTS transportador_id;
ALTER TABLE ordens_carregamento DROP COLUMN IF EXISTS motorista_id;
ALTER TABLE ordens_carregamento DROP COLUMN IF EXISTS veiculo_id;

-- 3. Tabela junction: transportadoras/motoristas/veiculos por ordem
CREATE TABLE IF NOT EXISTS ordem_transportadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID NOT NULL REFERENCES ordens_carregamento(id) ON DELETE CASCADE,
  transportador_id UUID REFERENCES cadastros(id) ON DELETE CASCADE,
  motorista_id UUID REFERENCES cadastros(id) ON DELETE CASCADE,
  veiculo_id UUID REFERENCES veiculos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS para ordem_transportadores
ALTER TABLE ordem_transportadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON ordem_transportadores FOR ALL USING (true) WITH CHECK (true);

-- 5. Garantir que romaneios.ordem_id existe (ja existe na v3, so garantia)
-- ALTER TABLE romaneios ADD COLUMN IF NOT EXISTS ordem_id UUID REFERENCES ordens_carregamento(id) ON DELETE SET NULL;

-- 6. Funcao para gerar numero_ordem_fmt automatico: #AAAAMM-NNN
CREATE OR REPLACE FUNCTION gerar_numero_ordem()
RETURNS TRIGGER AS $$
DECLARE
  ano_mes VARCHAR(6);
  seq INT;
BEGIN
  ano_mes := to_char(NEW.data_ordem, 'YYYYMM');
  SELECT COUNT(*) + 1 INTO seq
    FROM ordens_carregamento
    WHERE to_char(data_ordem, 'YYYYMM') = ano_mes
      AND id != NEW.id;
  NEW.numero_ordem_fmt := '#' || ano_mes || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_numero_ordem ON ordens_carregamento;
CREATE TRIGGER trg_gerar_numero_ordem
  BEFORE INSERT ON ordens_carregamento
  FOR EACH ROW EXECUTE FUNCTION gerar_numero_ordem();
