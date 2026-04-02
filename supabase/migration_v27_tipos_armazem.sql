-- Migration v27: Criar tabela de tipos_armazem
-- Data: 2026-04-02

-- Criar tabela tipos_armazem
CREATE TABLE IF NOT EXISTS tipos_armazem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tipos_armazem_ativo ON tipos_armazem(ativo);
CREATE INDEX IF NOT EXISTS idx_tipos_armazem_nome ON tipos_armazem(nome);

-- Inserir tipos padrão
INSERT INTO tipos_armazem (nome, descricao) VALUES
  ('Armazém', 'Estrutura convencional de armazenamento'),
  ('Silo', 'Torre vertical para armazenamento de grãos'),
  ('Tulha', 'Estrutura horizontal para armazenamento temporário')
ON CONFLICT (nome) DO NOTHING;

-- Comentários
COMMENT ON TABLE tipos_armazem IS 'Tabela de tipos de armazém configuráveis';
COMMENT ON COLUMN tipos_armazem.nome IS 'Nome do tipo de armazém';
COMMENT ON COLUMN tipos_armazem.descricao IS 'Descrição do tipo de armazém';
COMMENT ON COLUMN tipos_armazem.ativo IS 'Indica se o tipo está ativo no sistema';
